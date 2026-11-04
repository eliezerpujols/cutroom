import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import type {Express} from 'express';
import {z} from 'zod';
import {googleFonts,isBundledFont,isKnownFont,projectFontFamilies,type FontManifest} from '../src/fonts';
import type {Project} from '../src/model';
import type {ProjectStore} from './projects';
export const fontKey=(family:string)=>createHash('sha256').update(family).digest('hex').slice(0,24);
const familySchema=z.string().refine(isKnownFont,'Choose a font from the font library.');
const manifestSchema=z.object({family:familySchema,faces:z.array(z.object({file:z.string().regex(/^[a-f0-9]{24}\.(ttf|woff2?)$/),weight:z.string().regex(/^\d+( \d+)?$/),style:z.enum(['normal','italic','oblique']),unicodeRange:z.string().regex(/^[Uu+0-9a-fA-F?,\s-]+$/).optional()})).min(1).max(300)});
export function googleFontCssUrl(family:string){
  const font=googleFonts.find(item=>item.family===family);if(!font)throw new Error('Unknown Google font.');
  const variants=font.variants.map(v=>[v.endsWith('i')?1:0,parseInt(v,10)]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  return 'https://fonts.googleapis.com/css2?'+new URLSearchParams({family:family+':ital,wght@'+variants.map(v=>v.join(',')).join(';'),display:'block'});
}
export function parseFontCss(css:string){
  return [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(([,body])=>{
    const source=body.match(/url\(([^)]+)\)/)?.[1]?.replace(/['"]/g,'');if(!source)throw new Error('Missing font file.');
    const url=new URL(source);if(url.protocol!=='https:'||url.hostname!=='fonts.gstatic.com'||url.username||url.password)throw new Error('Invalid Google font file.');
    const extension=path.extname(url.pathname);if(!['.ttf','.woff','.woff2'].includes(extension))throw new Error('Unsupported font format.');
    return {url:source,file:fontKey(source)+extension,style:body.match(/font-style:\s*([^;]+)/)?.[1]?.trim()??'normal',weight:body.match(/font-weight:\s*([^;]+)/)?.[1]?.trim()??'400',...(body.match(/unicode-range:\s*([^;]+)/)?{unicodeRange:body.match(/unicode-range:\s*([^;]+)/)![1].trim()}:{})};
  });
}
async function readManifest(folder:string,family:string){try{const manifest=manifestSchema.parse(JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8')));if(manifest.family!==family)return null;await Promise.all(manifest.faces.map(face=>fs.access(path.join(folder,face.file))));return manifest;}catch{return null;}}
async function fetchFile(url:string,maxBytes:number){const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{'User-Agent':'Cutroom/1.0'}});if(!response.ok)throw new Error('Google Fonts is unavailable. Try again when connected.');const chunks:Uint8Array[]=[];let size=0;const reader=response.body!.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes)throw new Error('Font download exceeds the size limit.');chunks.push(value);}}finally{await reader.cancel();}return Buffer.concat(chunks);}
const pending=new Map<string,Promise<FontManifest>>();
export async function ensureFont(cacheRoot:string,family:string,projectFolder?:string):Promise<FontManifest>{
  familySchema.parse(family);if(isBundledFont(family))return {family,faces:[]};
  const key=fontKey(family),cache=path.join(cacheRoot,key),destination=projectFolder?path.join(projectFolder,'fonts',key):undefined;
  if(destination){const local=await readManifest(destination,family);if(local)return local;}
  let task=pending.get(cache);
  if(!task){task=(async()=>{const existing=await readManifest(cache,family);if(existing)return existing;
    const css=(await fetchFile(googleFontCssUrl(family),2_000_000)).toString('utf8'),faces=parseFontCss(css);
    const manifest=manifestSchema.parse({family,faces:faces.map(({url,...face})=>face)});
    const temporary=cache+'.'+randomUUID();await fs.mkdir(temporary,{recursive:true});
    try{let total=0;for(const face of [...new Map(faces.map(face=>[face.file,face])).values()]){const bytes=await fetchFile(face.url,30_000_000);total+=bytes.length;if(total>150_000_000)throw new Error('Font family exceeds the size limit.');await fs.writeFile(path.join(temporary,face.file),bytes);}
      await fs.writeFile(path.join(temporary,'manifest.json'),JSON.stringify(manifest));await fs.mkdir(cacheRoot,{recursive:true});await fs.rename(temporary,cache).catch(async error=>{if(await readManifest(cache,family))return;throw error;});return manifest;
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
  })();pending.set(cache,task);void task.finally(()=>pending.delete(cache)).catch(()=>{});}
  const manifest=await task;
  if(destination){await fs.mkdir(destination,{recursive:true});for(const file of new Set([...manifest.faces.map(face=>face.file),'manifest.json']))await fs.copyFile(path.join(cache,file),path.join(destination,file));}
  return manifest;
}
export async function ensureProjectFonts(cacheRoot:string,folder:string,project:Project){for(const family of projectFontFamilies(project))await ensureFont(cacheRoot,family,folder);}
export function registerFontRoutes(app:Express,store:ProjectStore,data:string){
  const root=path.join(data,'fonts');
  app.get('/api/fonts',async(_req,res)=>{const files:string[]=await fs.readdir(root).catch(()=>[] as string[]);res.json({installed:googleFonts.filter(font=>files.includes(fontKey(font.family))).map(font=>font.family)});});
  app.get('/api/projects/:id/fonts/:family',async(req,res)=>{const id=z.string().uuid().parse(req.params.id),family=familySchema.parse(req.params.family),folder=path.dirname(await store.assetPath(id,'project.cutroom'));res.json(await ensureFont(root,family,folder));});
  app.get('/api/projects/:id/font-files/:family/:file',async(req,res)=>{const id=z.string().uuid().parse(req.params.id),family=familySchema.parse(req.params.family),file=z.string().regex(/^[a-f0-9]{24}\.(ttf|woff2?)$/).parse(req.params.file);const target=await store.assetPath(id,`fonts/${fontKey(family)}/${file}`);res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.sendFile(target);});
}
