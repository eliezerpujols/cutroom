import {patchTransform} from '../src/transforms';
import {addCutoutLayer} from '../src/localVisionEdits';
import type {Express} from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {ProjectStore} from './projects';
import type {mediaEngine} from './media';
import {clipSchema,transformSchema,type StoredAsset} from './schema';

type Job={source:import('../src/model').Clip;id:string;projectId:string;kind:'cutout'|'track';status:'preparing'|'processing'|'completed'|'failed'|'cancelled';applied?:boolean;progress:number;error?:string;asset?:StoredAsset;keys?:{frame:number;x:number;y:number}[];controller:AbortController};
export function registerLocalVision(app:Express,store:ProjectStore,media:ReturnType<typeof mediaEngine>,root:string,changed:(id:string,revision:number)=>Record<string,unknown>){
 const jobs=new Map<string,Job>();let compiling:Promise<string>|undefined;
 const view=(j:Job)=>{const {controller,...result}=j;return result;};
 function run(command:string,args:string[],signal?:AbortSignal,progress?:(line:string)=>void){return new Promise<void>((resolve,reject)=>{const child=spawn(command,args,{signal}),errors:string[]=[];let pending='';child.stdout.on('data',data=>{pending+=data;let i;while((i=pending.indexOf('\n'))>=0){progress?.(pending.slice(0,i));pending=pending.slice(i+1);}});child.stderr.on('data',d=>errors.push(String(d)));child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(errors.join('').slice(-1500)||'Local vision processing failed.')));});}
 async function worker(){const source=path.join(root,'scripts/native/vision.swift'),binary=path.join(root,'data/bin/cutroom-vision');try{if((await fs.stat(binary)).mtimeMs>=(await fs.stat(source)).mtimeMs)return binary;}catch{}compiling??=(async()=>{await fs.mkdir(path.dirname(binary),{recursive:true});await run('xcrun',['swiftc',source,'-O','-o',binary]);return binary;})().finally(()=>{compiling=undefined;});return compiling;}
 app.get('/api/local-vision',(_req,res)=>res.json({available:process.platform==='darwin',engine:'Apple Vision',local:true,reason:process.platform==='darwin'?undefined:'Local person cutout and face tracking currently require macOS.'}));
 app.post('/api/projects/:id/local-vision',async(req,res)=>{
  if(process.platform!=='darwin')throw new Error('Local vision tools currently require macOS.');
  if([...jobs.values()].some(j=>j.status==='preparing'||j.status==='processing'))throw new Error('Wait for the current local vision job to finish.');
  const projectId=z.string().uuid().parse(req.params.id),body=z.object({kind:z.enum(['cutout','track']),clip:clipSchema}).parse(req.body),d=await store.read(projectId),clip=body.clip,asset=d.assets.find(a=>a.id===clip.assetId);
  if(!asset||clip.kind!=='video'||asset.kind==='audio'||clip.studio||asset.sequence)throw new Error('Select an original video or image.');
  if(asset.kind!=='image'&&clip.sourceIn+clip.duration*clip.rate>asset.frames+1.01)throw new Error('The selected source range is invalid.');
  const job:Job={source:clip,id:randomUUID(),projectId,kind:body.kind,status:'preparing',progress:0,controller:new AbortController()};jobs.set(job.id,job);res.status(202).json(view(job));
  void (async()=>{const folder=store.entry(projectId).folder,work=path.join(folder,'media',job.id),input=path.join(work,'input'),output=path.join(work,'output');try{
   await fs.mkdir(input,{recursive:true});await fs.mkdir(output,{recursive:true});const binary=await worker();job.controller.signal.throwIfAborted();
   const source=await store.assetPath(projectId,asset.file),fps=job.kind==='track'?10:30;
   await media.run(['-y',...(asset.kind==='image'?[]:['-ss',String(clip.sourceIn/30)]),'-i',source,'-an','-vf',`${asset.kind==='image'?'':`setpts=PTS/${clip.rate},fps=${fps},`}scale='min(1080,iw)':-2`,...(asset.kind==='image'?['-frames:v','1']:['-t',String(clip.duration/30),'-frames:v',String(Math.ceil(clip.duration*fps/30))]),path.join(input,'%06d.png')],false,job.controller.signal);
   job.status='processing';await run(binary,[job.kind,input,output,asset.kind],job.controller.signal,line=>{const m=line.match(/^PROGRESS (\d+) (\d+)/);if(m)job.progress=Number(m[1])/Number(m[2]);});job.controller.signal.throwIfAborted();
   if(job.kind==='track')job.keys=(JSON.parse(await fs.readFile(path.join(output,'tracking.json'),'utf8')) as {frame:number;x:number;y:number}[]).map(k=>({...k,frame:Math.round(clip.sourceIn+k.frame*clip.rate)}));
   else {const files=(await fs.readdir(output)).filter(f=>f.endsWith('.png')).sort();if(!files.length)throw new Error('No transparent frames were produced.');
    const first=path.join(output,files[0]),info=await media.probe(first);let file=first;
    if(asset.kind!=='image'){file=path.join(output,'preview.webm');await media.run(['-y','-framerate','30','-i',path.join(output,'%06d.png'),'-an','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-crf','28','-b:v','0',file],false,job.controller.signal);}
    const result:StoredAsset={id:job.id,name:asset.name.replace(/\.[^.]+$/,'')+' · cutout',kind:asset.kind,duration:asset.kind==='image'?5:files.length/30,frames:asset.kind==='image'?150:files.length,width:info.width,height:info.height,hasAudio:false,file:path.relative(folder,file),thumbnails:[path.relative(folder,first)],peaks:[],...(asset.kind==='image'?{}:{sequence:{count:files.length}})};
    await store.addAsset(projectId,result);job.asset=result;
   }
   job.status='completed';job.progress=1;await fs.rm(input,{recursive:true,force:true});if(job.kind==='track')await fs.rm(work,{recursive:true,force:true});
  }catch(error){job.status=job.controller.signal.aborted?'cancelled':'failed';job.error=job.status==='cancelled'?undefined:(error as Error).message;await fs.rm(work,{recursive:true,force:true}).catch(()=>{});}})();
 });
 app.get('/api/projects/:id/local-vision/:jobId',(req,res)=>{const job=jobs.get(String(req.params.jobId));if(!job||job.projectId!==req.params.id)return res.status(404).json({error:'Local vision job not found.'});res.json(view(job));});
 app.post('/api/projects/:id/local-vision/:jobId/cancel',(req,res)=>{const job=jobs.get(String(req.params.jobId));if(!job||job.projectId!==req.params.id)return res.status(404).json({error:'Local vision job not found.'});if(job.status==='preparing'||job.status==='processing')job.controller.abort();res.json(view(job));});
 app.post('/api/projects/:id/transforms',async(req,res)=>{const id=z.string().uuid().parse(req.params.id),body=z.object({expectedRevision:z.number().int().min(0),clipIds:z.array(z.string()).min(1).max(300),transform:transformSchema}).parse(req.body),d=await store.read(id);for(const clipId of body.clipIds)if(!d.project.clips.some(c=>c.id===clipId&&c.kind==='video'))throw new Error('Select valid visual clip IDs.');await store.save(id,patchTransform(d.project,body.clipIds,body.transform),body.expectedRevision);const w=await store.workspace(id);res.json({...w,...changed(id,w.revision)});});
 app.post('/api/projects/:id/local-vision/:jobId/apply',async(req,res)=>{const id=z.string().uuid().parse(req.params.id),body=z.object({expectedRevision:z.number().int().min(0)}).parse(req.body),job=jobs.get(String(req.params.jobId));if(!job||job.projectId!==id||job.status!=='completed')throw new Error('Wait for a completed job from this project.');if(job.applied)throw new Error('This job has already been applied.');const d=await store.read(id),live=d.project.clips.find(c=>c.id===job.source.id);if(!live||live.assetId!==job.source.assetId||live.sourceIn!==job.source.sourceIn||live.duration!==job.source.duration||live.rate!==job.source.rate)throw new Error('The source changed during processing. Run the tool again.');let next=d.project;if(job.kind==='track')next=patchTransform(next,[live.id],{faceTrack:job.keys});else{const w=await store.workspace(id),asset=w.assets.find(a=>a.id===job.asset?.id);if(!asset)throw new Error('Cutout media not found.');next=addCutoutLayer(next,live,asset).project;}await store.save(id,next,body.expectedRevision);job.applied=true;const w=await store.workspace(id);res.json({...w,...changed(id,w.revision)});});
 app.get('/api/projects/:id/media/:assetId/frames/:frame',async(req,res)=>{const d=await store.read(String(req.params.id)),asset=d.assets.find(a=>a.id===req.params.assetId),frame=Number(req.params.frame);if(!asset?.sequence||!Number.isInteger(frame)||frame<0||frame>=asset.sequence.count)return res.status(404).json({error:'Frame not found.'});res.sendFile(await store.assetPath(d.id,path.join(path.dirname(asset.file),String(frame+1).padStart(6,'0')+'.png')));});
 return {isBusy:()=>[...jobs.values()].some(j=>j.status==='preparing'||j.status==='processing')};
}
