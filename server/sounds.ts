import type {Express} from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {SoundLibrary,soundExtensions} from './soundLibrary';
import type {ProjectStore} from './projects';
import type {mediaEngine} from './media';
import {ProjectConflict} from './schema';
import {arrangeTimelineTracks} from '../src/videoTracks';

export async function registerSoundRoutes(app:Express,store:ProjectStore,media:ReturnType<typeof mediaEngine>,folder:string,changed:(id:string,revision:number)=>Record<string,unknown>){
  const library=new SoundLibrary(folder,media);await library.initialize();
  const upload=multer({storage:multer.diskStorage({destination:path.join(folder,'.incoming'),filename:(_req,file,done)=>done(null,randomUUID()+path.extname(file.originalname).toLowerCase())}),limits:{fileSize:25*1024**2,files:20},fileFilter:(_req,file,done)=>{if(soundExtensions.test(file.originalname))done(null,true);else done(new Error('Choose audio files for your sound library.'));}});
  app.get('/api/sounds',async(req,res)=>{const query=z.string().max(200).default('').parse(req.query.query),category=z.string().max(60).default('').parse(req.query.category);res.json(await library.list(query,category));});
  app.get('/api/sounds/:id/audio',async(req,res)=>{const {file}=await library.file(String(req.params.id));res.sendFile(file);});
  app.post('/api/sounds/import',(req,res,next)=>{upload.array('files',20)(req,res,async error=>{if(error){await Promise.all(((req.files||[]) as Express.Multer.File[]).map(file=>fs.unlink(file.path).catch(()=>{})));next(error);return;}next();});},async(req,res)=>{
    const files=(req.files||[]) as Express.Multer.File[],results=[],errors=[];
    try{const category=z.string().max(60).default('Other').parse(req.body.category);for(const file of files){try{results.push(await library.importFile(file.path,file.originalname,category));}catch(error){errors.push({name:file.originalname,error:(error as Error).message});}}res.json({results,errors});}
    finally{await Promise.all(files.map(file=>fs.unlink(file.path).catch(()=>{})));}
  });
  app.post('/api/sounds/import-paths',async(req,res)=>{const body=z.object({paths:z.array(z.string().min(1)).min(1).max(100),category:z.string().max(60).default('Other')}).parse(req.body),results=[],errors=[];for(const file of body.paths){try{if(!path.isAbsolute(file))throw new Error('Use absolute paths to local sound files.');results.push(await library.importFile(file,path.basename(file),body.category));}catch(error){errors.push({name:path.basename(file),error:(error as Error).message});}}res.json({results,errors});});
  const imported=new Map<string,string>();
  async function importSound(projectId:string,soundId:string){
    const key=projectId+':'+soundId,workspace=await store.workspace(projectId),known=workspace.assets.find(asset=>asset.id===imported.get(key)&&!asset.missing);if(known)return known;
    const {file,sound}=await library.file(soundId),asset=await media.importFile(projectId,file,sound.name);imported.set(key,asset.id);return (await store.workspace(projectId)).assets.find(item=>item.id===asset.id)!;
  }
  app.post('/api/projects/:id/sounds/:soundId/import',async(req,res)=>{res.json({asset:await importSound(z.string().uuid().parse(req.params.id),String(req.params.soundId))});});
  app.post('/api/projects/:id/sounds/:soundId/add',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),body=z.object({expectedRevision:z.number().int().min(0),start:z.number().int().min(0).max(108000),volume:z.number().min(0).max(2).default(1)}).parse(req.body),document=await store.read(id);
    if(document.revision!==body.expectedRevision)throw new ProjectConflict();if(document.project.clips.length>=300)throw new Error('This project has reached its clip limit.');
    const asset=await importSound(id,String(req.params.soundId)),project=structuredClone(document.project);let track=project.tracks.find(track=>track.kind==='audio');if(!track){track={id:randomUUID(),kind:'audio',name:'Audio',muted:false};project.tracks.push(track);}
    const clipId=randomUUID();project.clips.push({id:clipId,assetId:asset.id,name:asset.name,kind:'audio',trackId:track.id,start:body.start,duration:asset.frames,sourceIn:0,rate:1,volume:body.volume,muted:false,fadeIn:0,fadeOut:0});
    await store.save(id,arrangeTimelineTracks(project,[clipId]),body.expectedRevision);const workspace=await store.workspace(id);res.json({...workspace,clip_id:clipId,...changed(id,workspace.revision)});
  });
}
