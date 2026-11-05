import type {Express} from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {ProjectStore} from './projects';
import type {mediaEngine} from './media';
import {addGiphyClip} from '../src/giphy';
import {giphySourceSchema,ProjectConflict} from './schema';


export function giphyStatus(){return {configured:!!process.env.GIPHY_API_KEY?.trim(),projectMediaApproved:process.env.GIPHY_PROJECT_MEDIA_APPROVED==='true',browserSearch:true,clipsRequireApproval:true};}
export function registerGiphyRoutes(app:Express,store:ProjectStore,media:ReturnType<typeof mediaEngine>,data:string,changed:(id:string,revision:number)=>Record<string,unknown>){
 const upload=multer({storage:multer.diskStorage({destination:path.join(data,'uploads'),filename:(_r,f,done)=>done(null,randomUUID()+path.extname(f.originalname).toLowerCase())}),limits:{fileSize:50*1024**2,files:1,fields:2},fileFilter:(_r,f,done)=>/\.(gif|mp4|webm)$/i.test(f.originalname)?done(null,true):done(new Error('Choose GIF or video media.'))});
 app.get('/api/giphy/status',(_req,res)=>{res.setHeader('Cache-Control','no-store');res.json(giphyStatus());});
 // This is a browser SDK key, intentionally delivered only to the local client.
 // Search and media requests go directly to GIPHY; the server never proxies them.
 app.get('/api/giphy/config',(_req,res)=>{res.setHeader('Cache-Control','no-store');res.json({...giphyStatus(),apiKey:process.env.GIPHY_API_KEY?.trim()||null});});
 async function importMedia(id:string,file:string,source:z.infer<typeof giphySourceSchema>){
  await store.read(id);const asset=await media.importFile(id,file,source.title||`${source.creator?source.creator+' · ':''}${source.kind==='stickers'?'Sticker':source.kind==='clips'?'Clip':'GIF'} · ${source.id}`);
  await store.addAsset(id,{...asset,giphy:source});return (await store.workspace(id)).assets.find(a=>a.id===asset.id);
 }
 app.post('/api/projects/:id/giphy/import-path',async(req,res)=>{
  if(!giphyStatus().projectMediaApproved)return res.status(403).json({error:'GIPHY approval is required to save its content in video projects.'});
  const id=z.string().uuid().parse(req.params.id),body=z.object({filePath:z.string().min(1),source:giphySourceSchema}).parse(req.body);
  if(!path.isAbsolute(body.filePath)||!/\.(gif|mp4|webm)$/i.test(body.filePath))throw new Error('Choose an absolute path to downloaded GIPHY media.');
  const stat=await fs.stat(body.filePath);if(!stat.isFile()||stat.size>50*1024**2)throw new Error('Choose GIPHY media smaller than 50 MB.');
  res.json({asset:await importMedia(id,body.filePath,body.source)});
 });
 app.post('/api/projects/:id/giphy/import',(req,res,next)=>{
  if(!giphyStatus().projectMediaApproved)return res.status(403).json({error:'GIPHY approval is required to save its content in video projects.'});
  upload.single('file')(req,res,next);
 },async(req,res)=>{
  const file=req.file;if(!file)throw new Error('Choose GIPHY media to import.');
  try{const id=z.string().uuid().parse(req.params.id),source=giphySourceSchema.parse(JSON.parse(req.body.source));
   res.json({asset:await importMedia(id,file.path,source)});
  }finally{await fs.unlink(file.path).catch(()=>{});}
 });
 app.post('/api/projects/:id/giphy/add',async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id),body=z.object({expectedRevision:z.number().int().min(0),assetId:z.string(),start:z.number().int().min(0).max(108000),placement:z.enum(['clip','overlay']).default('overlay'),trackId:z.string().optional()}).parse(req.body),d=await store.read(id);
  if(d.revision!==body.expectedRevision)throw new ProjectConflict();const w=await store.workspace(id),asset=w.assets.find(a=>a.id===body.assetId&&a.giphy);if(!asset)throw new Error('Choose imported GIPHY media from this project.');
  const added=addGiphyClip(d.project,asset,body.start,body.placement,body.trackId);await store.save(id,added.project,body.expectedRevision);const result=await store.workspace(id);res.json({...result,clip_id:added.id,...changed(id,result.revision)});
 });
}
