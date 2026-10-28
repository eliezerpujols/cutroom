import path from 'node:path';
import fs from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import type {ProjectStore} from './projects';
import type {StoredAsset} from './schema';
export const allowedMedia=/\.(mp4|mov|m4v|webm|mkv|avi|mpeg|mpg|mp3|wav|flac|m4a|aac|ogg|opus)$/i;
function resolveFfmpeg(root:string){
  if(process.env.FFMPEG_PATH)return process.env.FFMPEG_PATH;
  try{execFileSync('ffmpeg',['-version'],{stdio:'ignore'});return 'ffmpeg';}catch{}
  // Keep existing local installations working without requiring their sibling folder on new machines.
  const legacyPython=path.join(root,'../dubbing-workflow/.venv/bin/python');
  if(existsSync(legacyPython))return execFileSync(legacyPython,['-c','import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
  throw new Error('FFmpeg is required. Install ffmpeg on PATH or set FFMPEG_PATH in .env.');
}
export function mediaEngine(root:string,store:ProjectStore){
  const ffmpeg=resolveFfmpeg(root);
  function run(args:string[],acceptFailure=false):Promise<{buffer:Buffer;stderr:string}>{return new Promise((resolve,reject)=>{const child=spawn(ffmpeg,['-hide_banner',...args]);const chunks:Buffer[]=[];let stderr='';child.stdout.on('data',(b:Buffer)=>chunks.push(b));child.stderr.on('data',(b:Buffer)=>stderr+=b.toString());child.on('error',reject);child.on('close',code=>code===0||acceptFailure?resolve({buffer:Buffer.concat(chunks),stderr}):reject(new Error(stderr.slice(-1500))));});}
  async function probe(file:string){
    const {stderr}=await run(['-i',file],true),match=stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);if(!match)throw new Error('This file does not contain readable audio or video.');
    const duration=Number(match[1])*3600+Number(match[2])*60+Number(match[3]);
    const dimensions=stderr.split('\n').find(l=>l.includes('Video:')&&!l.includes('attached pic'))?.match(/\b(\d{2,5})x(\d{2,5})\b/);
    const hasAudio=stderr.includes('Audio:');if(!dimensions&&!hasAudio)throw new Error('Unsupported media format.');
    return {kind:dimensions?'video' as const:'audio' as const,duration,frames:Math.max(1,Math.round(duration*30)),width:Number(dimensions?.[1]||0),height:Number(dimensions?.[2]||0),hasAudio};
  }
  async function analyze(projectId:string,file:string,name:string,id:string=randomUUID()):Promise<StoredAsset>{
    const info=await probe(file),{duration,hasAudio}=info,folder=store.entry(projectId).folder;
    const asset:StoredAsset={id,name,...info,file:path.relative(folder,file),thumbnails:[],peaks:[]};
    if(info.kind==='video'){const dir=path.join(folder,'thumbs',id);await fs.mkdir(dir,{recursive:true});await run(['-y','-i',file,'-vf',`fps=${Math.min(16/duration,2)},scale=120:-2`,'-frames:v','16','-q:v','5',path.join(dir,'%02d.jpg')]);asset.thumbnails=(await fs.readdir(dir)).sort().map(n=>`thumbs/${id}/${n}`);}
    if(hasAudio){const analysisDuration=Math.min(duration,1800),{buffer}=await run(['-v','error','-i',file,'-t',String(analysisDuration),'-vn','-ac','1','-ar','8000','-f','f32le','pipe:1']);const count=Math.floor(buffer.length/4),bins=Math.min(2048,Math.ceil(duration*100));
      for(let i=0;i<bins;i++){let peak=0;const from=Math.floor(i*duration/analysisDuration*count/bins),to=Math.min(count,Math.floor((i+1)*duration/analysisDuration*count/bins));for(let j=from;j<to;j++)peak=Math.max(peak,Math.abs(buffer.readFloatLE(j*4)));asset.peaks.push(Math.min(1,peak));}}
    return asset;
  }
  async function importFile(projectId:string,source:string,name=path.basename(source),replaceId?:string){
    if(!allowedMedia.test(source))throw new Error('Choose a video or audio file.');const stat=await fs.stat(source);if(!stat.isFile()||stat.size>2*1024**3)throw new Error('Choose a media file smaller than 2 GB.');
    if(replaceId){const d=await store.read(projectId);if(!d.assets.some(a=>a.id===replaceId))throw new Error('Media entry not found in this project.');}
    const id=replaceId||randomUUID(),folder=store.entry(projectId).folder,destination=path.join(folder,'media',id+'-'+randomUUID().slice(0,8)+path.extname(source).toLowerCase());await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(source,destination);
    try{const asset=await analyze(projectId,destination,name,id);if(replaceId){const d=await store.read(projectId);if(!d.assets.some(a=>a.id===replaceId))throw new Error('Missing media entry not found.');const required=Math.max(0,...d.project.clips.filter(c=>c.assetId===replaceId).map(c=>c.sourceIn+c.duration*c.rate));if(asset.frames+1<required)throw new Error('This replacement is shorter than the footage used in the timeline.');}
      await store.addAsset(projectId,asset);return asset;
    }catch(error){await fs.unlink(destination).catch(()=>{});throw error;}
  }
  async function extract(projectId:string,assetId:string){const d=await store.read(projectId),a=d.assets.find(a=>a.id===assetId);if(!a?.hasAudio)throw new Error('This file does not contain audio.');const source=await store.assetPath(projectId,a.file),id=randomUUID(),output=path.join(store.entry(projectId).folder,'media',id+'.wav');await run(['-y','-v','error','-i',source,'-vn','-c:a','pcm_s16le',output]);const result=await analyze(projectId,output,a.name.replace(/\.[^.]+$/,'')+' · extracted audio',id);await store.addAsset(projectId,result);return result;}
  return {importFile,extract,probe,run};
}
