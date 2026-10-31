import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {atomicJson} from './projects';
import type {mediaEngine} from './media';
import type {LibrarySound} from '../src/sounds';

export const soundExtensions=/\.(mp3|wav|ogg|opus|m4a|aac|flac)$/i;
const recordSchema=z.object({id:z.string().regex(/^[a-f0-9]{64}$/),name:z.string().min(1).max(200),category:z.string().min(1).max(60),file:z.string().regex(/^[a-f0-9]{64}\.(mp3|wav|ogg|opus|m4a|aac|flac)$/),duration:z.number().positive().max(120),frames:z.number().int().min(1).max(3600),peaks:z.array(z.number().min(0).max(1)).max(96),source:z.string().max(100),sourceUrl:z.string().url().max(2000).optional()});
type SoundRecord=z.infer<typeof recordSchema>;
type Media=ReturnType<typeof mediaEngine>;
const indexSchema=z.object({version:z.literal(1),sounds:z.array(recordSchema).max(10000)});
export class SoundLibrary{
  private pending:Promise<unknown>=Promise.resolve();
  constructor(readonly folder:string,private media:Pick<Media,'probe'|'run'>){}
  private async locked<T>(work:()=>Promise<T>):Promise<T>{
    const next=this.pending.catch(()=>{}).then(async()=>{
      const lockFile=path.join(this.folder,'.library.lock');let lock:Awaited<ReturnType<typeof fs.open>>|undefined;
      for(let attempt=0;attempt<300&&!lock;attempt++){
        try{lock=await fs.open(lockFile,'wx');await lock.writeFile(String(process.pid));}
        catch(error){
          if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;
          try{const owner=Number(await fs.readFile(lockFile,'utf8'));if(Number.isInteger(owner)&&owner>0){try{process.kill(owner,0);}catch(error){if((error as NodeJS.ErrnoException).code==='ESRCH')await fs.unlink(lockFile);}}else if(Date.now()-(await fs.stat(lockFile)).mtimeMs>300000)await fs.unlink(lockFile);}catch{/* Another importer may have just released the lock. */}
          await new Promise(resolve=>setTimeout(resolve,100));
        }
      }
      if(!lock)throw new Error('Another sound import is still running. Try again shortly.');
      try{return await work();}finally{await lock.close();await fs.unlink(lockFile).catch(()=>{});}
    });this.pending=next;return next;
  }
  private async records(){try{const file=path.join(this.folder,'library.json');if((await fs.stat(file)).size>20*1024**2)throw new Error('The sound library index is too large.');return indexSchema.parse(JSON.parse(await fs.readFile(file,'utf8'))).sounds;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}}
  async initialize(){await fs.mkdir(this.folder,{recursive:true});await fs.mkdir(path.join(this.folder,'.incoming'),{recursive:true});}
  private publicSound({file:_file,...sound}:SoundRecord):LibrarySound{return {...sound,url:`/api/sounds/${sound.id}/audio`};}
  async list(query='',category=''){
    const records=await this.records(),needle=query.toLocaleLowerCase().trim();
    const sounds=records.filter(sound=>(!category||sound.category===category)&&(!needle||`${sound.name} ${sound.category}`.toLocaleLowerCase().includes(needle))).sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
    return {sounds:sounds.slice(0,200).map(sound=>this.publicSound(sound)),categories:[...new Set(records.map(sound=>sound.category))].sort(),total:records.length,matched:sounds.length,folder:this.folder};
  }
  async file(id:string){
    z.string().regex(/^[a-f0-9]{64}$/).parse(id);const record=(await this.records()).find(sound=>sound.id===id);if(!record)throw new Error('Sound not found in your library.');
    const folder=await fs.realpath(this.folder),file=await fs.realpath(path.join(folder,record.file));if(path.dirname(file)!==folder)throw new Error('Sound files must stay inside the library.');return {file,sound:this.publicSound(record)};
  }
  async importFile(source:string,name=path.basename(source),category='Other',provenance:{source?:string;sourceUrl?:string}={}){
    return this.locked(async()=>{
      if(!soundExtensions.test(source))throw new Error('Choose an MP3, WAV, OGG, OPUS, M4A, AAC or FLAC sound.');
      const stat=await fs.stat(source);if(!stat.isFile()||stat.size>25*1024**2||stat.size===0)throw new Error('Choose a sound smaller than 25 MB.');
      const bytes=await fs.readFile(source);if(bytes.length>25*1024**2)throw new Error('This sound exceeds 25 MB.');
      const id=createHash('sha256').update(bytes).digest('hex'),records=await this.records(),existing=records.find(sound=>sound.id===id);
      if(existing){await this.file(id);return {sound:this.publicSound(existing),duplicate:true};}
      if(records.length>=10000)throw new Error('Your library has reached 10,000 sounds.');
      const extension=path.extname(source).toLowerCase(),temporary=path.join(this.folder,'.incoming',randomUUID()+extension),destination=path.join(this.folder,id+extension);
      await fs.writeFile(temporary,bytes,{flag:'wx'});
      try{
        const info=await this.media.probe(temporary);if(info.kind!=='audio'||!info.hasAudio||info.duration<=0||info.duration>120)throw new Error('Sound effects must be audio files up to two minutes long.');
        const {buffer}=await this.media.run(['-v','error','-i',temporary,'-vn','-ac','1','-ar','4000','-f','f32le','pipe:1']);
        const samples=Math.floor(buffer.length/4),bins=Math.min(64,samples),peaks=Array.from({length:bins},(_,i)=>{let peak=0;for(let j=Math.floor(i*samples/bins);j<Math.floor((i+1)*samples/bins);j++)peak=Math.max(peak,Math.abs(buffer.readFloatLE(j*4)));return Math.min(1,peak);});
        const record=recordSchema.parse({id,name:name.replace(/\.[^.]+$/,'').trim().slice(0,200)||'Untitled sound',category:category.replace(/\s+Soundboard$/i,'').trim().slice(0,60)||'Other',file:id+extension,duration:info.duration,frames:info.frames,peaks,source:provenance.source||'Local import',...(provenance.sourceUrl?{sourceUrl:provenance.sourceUrl}:{})});
        await fs.rename(temporary,destination);
        try{await atomicJson(path.join(this.folder,'library.json'),{version:1,sounds:[...records,record]});}catch(error){await fs.unlink(destination).catch(()=>{});throw error;}
        return {sound:this.publicSound(record),duplicate:false};
      }finally{await fs.unlink(temporary).catch(()=>{});}
    });
  }
}
