import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {SoundLibrary} from '../server/soundLibrary';
import {mediaEngine} from '../server/media';
import {ProjectStore} from '../server/projects';
import {defaultProjectsDirectory} from '../server/paths';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),site='https://soundbuttonsworld.com';
const limitIndex=process.argv.indexOf('--limit'),limit=limitIndex===-1?50:Number(process.argv[limitIndex+1]);
if(!Number.isSafeInteger(limit)||limit<1)throw new Error('Use --limit with a positive whole number.');
const library=new SoundLibrary(path.join(defaultProjectsDirectory(),'Sound Library'),mediaEngine(root,new ProjectStore(path.join(root,'data'),defaultProjectsDirectory())));await library.initialize();
const headers={'User-Agent':'Cutroom/1.0 (local sound library importer)'};
let lastRequest=0;
async function download(url:string,maxBytes:number){
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,750-(Date.now()-lastRequest))));lastRequest=Date.now();
  const response=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(30000)});
  if([401,403,429].includes(response.status))throw Object.assign(new Error(`Source returned ${response.status}; import stopped without retrying access restrictions.`),{stop:true});
  if(!response.ok)throw new Error(`Download returned ${response.status}.`);
  if(Number(response.headers.get('content-length')||0)>maxBytes){await response.body?.cancel();throw new Error('Source file exceeds the import size limit.');}
  const reader=response.body!.getReader(),chunks:Uint8Array[]=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new Error('Source file exceeds the import size limit.');}chunks.push(value);}
  return Buffer.concat(chunks);
}
type Candidate={id:number;name:string;fileName:string;url:string;categoryName:string};
const candidates:Candidate[]=[],ids=new Set<number>();
const existing=(await library.sourceSounds('SoundButtonsWorld')).filter(sound=>sound.sourceUrl?.startsWith(site+'/sound-button/'));
const sounds=new Set(existing.map(sound=>sound.id)),knownUrls=new Set(existing.map(sound=>sound.sourceUrl));
const results:Record<string,unknown>[]=existing.map(sound=>({id:sound.id,name:sound.name,category:sound.category,sourceUrl:sound.sourceUrl})),errors:{name:string;error:string}[]=[];
let added=0,duplicates=existing.length,stopped=false;
function collect(value:unknown){
  if(Array.isArray(value)){value.forEach(collect);return;}if(!value||typeof value!=='object')return;
  const item=value as Record<string,unknown>;
  if(typeof item.id==='number'&&typeof item.name==='string'&&typeof item.fileName==='string'&&/^[a-zA-Z0-9_-]+\.mp3$/.test(item.fileName)&&typeof item.url==='string'&&/^[a-zA-Z0-9_-]+$/.test(item.url)&&!ids.has(item.id)){
    ids.add(item.id);candidates.push({id:item.id,name:item.name,fileName:item.fileName,url:item.url,categoryName:typeof item.categoryName==='string'?item.categoryName:'Other'});
  }
  for(const child of Object.values(item))if(typeof child==='object')collect(child);
}
// Read public catalogs lazily: fetch another page only while the requested
// target is unmet. No accounts, cookies, private APIs or sign-in.
async function* publicCandidates(){
  const categories=['sound effects soundboard','reactions soundboard','memes soundboard','games soundboard','movies soundboard','anime soundboard'];
  for(const page of [...categories.map(category=>'/categories/'+encodeURIComponent(category)),'/']){
    const html=(await download(site+page,4*1024**2)).toString('utf8');
    const raw=html.match(/<script id="serverApp-state"[^>]*>([\s\S]*?)<\/script>/)?.[1];if(!raw)throw new Error('The site changed its public catalog format.');
    const escapes:Record<string,string>={q:'"',a:'&',l:'<',g:'>',s:"'"},state=JSON.parse(raw.replace(/&([qalgs]);/g,(_,key:string)=>escapes[key]));
    for(const [key,value] of Object.entries(state))if(key.startsWith('/api/memes/'))collect(value);
    yield* candidates.splice(0);
  }
  const active=new Set(categories),lastPages=new Map<string,string>();
  for(let page=2;active.size;page++){
    for(const category of active){
      const url='/api/memes/getall?'+new URLSearchParams({page:String(page),pageSize:'40',category});
      const payload=JSON.parse((await download(site+url,4*1024**2)).toString('utf8'));
      if(!Array.isArray(payload.data))throw new Error('The site changed its public pagination format.');
      const fingerprint=JSON.stringify(payload.data.map((item:Record<string,unknown>)=>item.id));
      // A page may contain only known sounds and still have a following page.
      // Stop on actual exhaustion or repeated pages, not deduplication alone.
      if(!payload.data.length||lastPages.get(category)===fingerprint){active.delete(category);continue;}
      lastPages.set(category,fingerprint);collect(payload.data);
      yield* candidates.splice(0);
    }
  }
}
console.log(`${sounds.size}/${limit} sounds already available; existing downloads will be reused.`);
try{
  if(sounds.size<limit)for await(const candidate of publicCandidates()){
    if(knownUrls.has(site+'/sound-button/'+candidate.url))continue;const temporary=path.join(library.folder,'.incoming',randomUUID()+'.mp3');
    try{
      const bytes=await download(site+'/uploads/'+candidate.fileName,25*1024**2);await fs.writeFile(temporary,bytes,{flag:'wx'});
      const result=await library.importFile(temporary,candidate.name,candidate.categoryName,{source:'SoundButtonsWorld',sourceUrl:site+'/sound-button/'+candidate.url});
      knownUrls.add(site+'/sound-button/'+candidate.url);
      if(!sounds.has(result.sound.id)){sounds.add(result.sound.id);results.push({id:result.sound.id,name:result.sound.name,category:result.sound.category,sourceUrl:result.sound.sourceUrl});result.duplicate?duplicates++:added++;}
      if(sounds.size%10===0)console.log(`${sounds.size}/${limit} sounds available (${added} new, ${duplicates} already present).`);
    }catch(error){errors.push({name:candidate.name,error:(error as Error).message});if((error as Error&{stop?:boolean}).stop){stopped=true;break;}}
    finally{await fs.unlink(temporary).catch(()=>{});}
    if(sounds.size>=limit)break;
  }
}catch(error){stopped=true;errors.push({name:'Public catalog',error:(error as Error).message});}
const report={source:site,requested:limit,available:sounds.size,added,duplicates,stopped,results,errors,createdAt:new Date().toISOString()};
const reportFile=path.join(library.folder,'import-soundbuttonsworld-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');await fs.writeFile(reportFile,JSON.stringify(report,null,2));
console.log(JSON.stringify({requested:limit,available:sounds.size,added,duplicates,skipped:errors.length,folder:library.folder,report:reportFile}));
if(sounds.size<limit)process.exitCode=1;
