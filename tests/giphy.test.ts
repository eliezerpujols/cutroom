import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {IGif} from '@giphy/js-types';
import {addGiphyClip,giphyDownload,giphyHttps} from '../src/giphy';
import {giphySourceSchema,storedAssetSchema} from '../server/schema';
import {ProjectStore} from '../server/projects';
import {mediaEngine} from '../server/media';
import type {Project,Asset} from '../src/model';
import {timelineLayers} from '../src/layers';
import express from 'express';
import {registerGiphyRoutes} from '../server/giphy';
import {ProjectConflict} from '../server/schema';

const source={provider:'giphy' as const,id:'example',kind:'stickers' as const,pageUrl:'https://giphy.com/stickers/example',creator:'Example'};
const asset:Asset={id:'a',name:'Sticker',kind:'video',duration:1,frames:30,width:64,height:64,hasAudio:false,url:'/a',thumbnails:[],peaks:[],sequence:{count:30},giphy:source};
const project:Project={version:1,name:'QA',width:1080,height:1920,fps:30,tracks:[{id:'v',name:'Video',kind:'video',muted:false}],layerOrder:['track:v'],clips:[{id:'original',assetId:'source',name:'Original',kind:'video',trackId:'v',start:0,duration:300,sourceIn:0,rate:1,volume:1,muted:false,fadeIn:0,fadeOut:0}]};
test('GIPHY insertion preserves original timings and places overlays above the source with saved layer order',()=>{
 const {project:next,id}=addGiphyClip(project,asset,60);const clip=next.clips.find(c=>c.id===id)!;
 assert.deepEqual(next.clips.find(c=>c.id==='original'),project.clips[0]);assert.equal(clip.start,60);assert.equal(clip.duration,30);assert.ok(clip.overlay);assert.equal(clip.muted,true);
 const layers=timelineLayers(next);assert.ok(layers.findIndex(l=>l.id===clip.trackId)<layers.findIndex(l=>l.id==='v'));
 const full=addGiphyClip(project,{...asset,hasAudio:true},120,'clip').project.clips.at(-1)!;assert.equal(full.overlay,undefined);assert.equal(full.muted,false);
});
test('GIFs, clips and stickers honor explicit existing-track drops at the limit',()=>{
 const tracks=Array.from({length:12},(_,i)=>({id:`v${i}`,name:`Video ${i}`,kind:'video' as const,muted:false}));
 const full:Project={...project,tracks,layerOrder:tracks.map(t=>`track:${t.id}`),clips:tracks.map((t,i)=>({...project.clips[0],id:`original-${i}`,trackId:t.id}))};
 for(const kind of ['gifs','clips','stickers'] as const){
  const imported={...asset,giphy:{...source,kind},hasAudio:kind==='clips'};
  const {project:next,id}=addGiphyClip(full,imported,300,'overlay','v7');
  const added=next.clips.find(c=>c.id===id)!;
  assert.equal(next.tracks.length,12);assert.equal(added.trackId,'v7');assert.equal(added.start,300);
  assert.ok(added.overlay);assert.equal(added.muted,!imported.hasAudio);
  assert.deepEqual(next.clips.filter(c=>c.id!==id),full.clips);
  assert.deepEqual(next.layerOrder,full.layerOrder);
 }
 const snapped=addGiphyClip(full,asset,60,'overlay','v7');
 assert.equal(snapped.project.clips.find(c=>c.id===snapped.id)?.trackId,'v7');
 assert.equal(snapped.project.clips.find(c=>c.id===snapped.id)?.start,300);
 assert.throws(()=>addGiphyClip(full,asset,60),/12 tracks/);
});
test('implicit GIPHY insertion finds lower gaps while explicit drops keep their lane',()=>{
 const tracks=Array.from({length:12},(_,i)=>({id:`v${i}`,name:`Video ${i}`,kind:'video' as const,muted:false}));
 const full:Project={...project,tracks,layerOrder:tracks.map(t=>`track:${t.id}`),clips:tracks.map((t,i)=>({...project.clips[0],id:`original-${i}`,trackId:t.id,duration:i===9?30:300}))};
 for(const requested of ['v0',undefined]){
  const {project:next,id}=addGiphyClip(full,asset,60,'overlay',requested);
  assert.equal(next.tracks.length,12);assert.equal(next.clips.find(c=>c.id===id)?.trackId,requested?'v0':'v9');
  assert.equal(next.clips.find(c=>c.id===id)?.start,requested?300:60);
  assert.deepEqual(next.clips.filter(c=>c.id!==id),full.clips);
 }
 const audioOnly:Project={...full,clips:[],tracks:tracks.map(t=>({...t,kind:'audio'}))};
 assert.throws(()=>addGiphyClip(audioOnly,asset,0),/12 tracks/);
 const empty:Project={...project,clips:[]};
 const added=addGiphyClip(empty,asset,0,'overlay','v').project;
 assert.equal(added.tracks.length,1);assert.equal(added.clips[0].trackId,'v');
});
test('two distinct GIFs share the requested lane and retain independent media and timing',()=>{
 const empty:Project={...project,clips:[]};
 const first=addGiphyClip(empty,asset,60,'overlay','v');
 const other={...asset,id:'other-gif',name:'Different GIF',giphy:{...source,id:'other'}};
 const second=addGiphyClip(first.project,other,75,'overlay','v');
 assert.equal(second.project.tracks.length,1);
 assert.deepEqual(second.project.clips[0],first.project.clips[0]);
 assert.equal(second.project.clips[1].assetId,'other-gif');
 assert.equal(second.project.clips[1].trackId,'v');assert.equal(second.project.clips[1].start,90);
 const touching=addGiphyClip(first.project,other,90,'overlay','v');
 assert.equal(touching.project.clips[1].start,90);
});
test('GIPHY metadata and renditions preserve source attribution and reject unsafe URLs',()=>{
 assert.deepEqual(giphySourceSchema.parse(source),source);assert.equal(giphyHttps('https://media0.giphy.com/media/id/giphy.gif?cid=keep&rid=keep',true),true);
 for(const url of ['http://media.giphy.com/a.gif','https://media.giphy.com.evil.test/a.gif','https://u:p@media.giphy.com/a.gif','javascript:alert(1)'])assert.equal(giphyHttps(url,true),false);
 const item={images:{original:{url:'https://media.giphy.com/a.gif?rid=keep',mp4:'https://media.giphy.com/a.mp4?rid=keep'}},video:{assets:{'720p':{url:'https://media.giphy.com/a-source.mp4'}}}} as unknown as IGif;
 assert.equal(giphyDownload(item,'stickers').url,'https://media.giphy.com/a.gif?rid=keep');assert.equal(giphyDownload(item,'gifs').extension,'mp4');assert.equal(giphyDownload(item,'clips').url,'https://media.giphy.com/a-source.mp4');
 assert.equal(storedAssetSchema.parse({...asset,file:'media/a.webm'}).giphy?.creator,'Example');
});
test('local animated GIFs keep frame timing, alpha and attribution through project copy',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cutroom-gif-')),store=new ProjectStore(path.join(dir,'data'),path.join(dir,'projects'));await store.initialize();const media=mediaEngine(process.cwd(),store),gif=path.join(dir,'own-animation.gif');
 try{
  // Generated locally: this test never stores or downloads GIPHY content.
  await media.run(['-y','-f','lavfi','-i',"color=c=black:s=64x64:r=10:d=1,drawbox=x=12:y=12:w=30:h=30:color=red:t=fill,format=rgba,colorkey=black:0.05:0",'-filter_complex','[0:v]split[a][b];[a]palettegen=reserve_transparent=1[p];[b][p]paletteuse',gif]);
  const id=store.activeId(),a=await media.importFile(id,gif,'Own animation');assert.ok(a.sequence);assert.equal(a.frames,30);assert.equal(a.kind,'video');
  await store.addAsset(id,{...a,giphy:source});const copy=await store.create('Copy',id),copied=copy.assets.find(x=>x.id===a.id)!;assert.equal(copied.giphy?.creator,'Example');
  const frame=path.join(path.dirname(await store.assetPath(copy.id,copied.file)),'000001.png'),{buffer}=await media.run(['-v','error','-i',frame,'-f','rawvideo','-pix_fmt','rgba','pipe:1']);
  assert.equal(buffer[3],0);assert.ok(Array.from({length:buffer.length/4},(_,i)=>buffer[i*4+3]).some(a=>a===255));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('GIPHY local import works without an approval flag and uses revision-safe insertion',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cutroom-giphy-routes-')),data=path.join(dir,'data'),store=new ProjectStore(data,path.join(dir,'projects'));await store.initialize();await fs.mkdir(path.join(data,'uploads'));
 const media=mediaEngine(process.cwd(),store),file=path.join(dir,'own.mp4');await media.run(['-y','-f','lavfi','-i','color=c=red:s=64x64:r=30:d=0.2','-an','-pix_fmt','yuv420p',file]);
 const app=express();app.use(express.json());registerGiphyRoutes(app,store,media,data,()=>({}));app.use((error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error instanceof ProjectConflict?409:400).json({error:error.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address() as {port:number},base=`http://127.0.0.1:${address.port}`,id=store.activeId();const post=(url:string,body:unknown)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  const imported=await post(`/api/projects/${id}/giphy/import-path`,{filePath:file,source}),result=await imported.json();assert.equal(imported.status,200,JSON.stringify(result));assert.equal(result.asset.giphy.creator,'Example');
  const body={expectedRevision:0,assetId:result.asset.id,start:15},added=await post(`/api/projects/${id}/giphy/add`,body);assert.equal(added.status,200);assert.equal((await store.read(id)).project.clips[0].start,15);assert.ok((await store.read(id)).project.clips[0].overlay);
  const stale=await post(`/api/projects/${id}/giphy/add`,body);assert.equal(stale.status,409);assert.equal((await store.read(id)).project.clips.length,1);
  const secondFile=path.join(dir,'different.mp4');await media.run(['-y','-f','lavfi','-i','color=c=blue:s=64x64:r=30:d=0.2','-an','-pix_fmt','yuv420p',secondFile]);
  const importedSecond=await post(`/api/projects/${id}/giphy/import-path`,{filePath:secondFile,source:{...source,id:'different',title:'Different GIF'}}),secondAsset=(await importedSecond.json()).asset;
  const first=(await store.read(id)).project.clips[0];
  const second=await post(`/api/projects/${id}/giphy/add`,{expectedRevision:1,assetId:secondAsset.id,start:15,trackId:first.trackId});assert.equal(second.status,200);
  const saved=await store.read(id);assert.equal(saved.project.clips.length,2);assert.equal(saved.project.clips[1].trackId,first.trackId);assert.equal(saved.project.clips[1].start,first.start+first.duration);assert.deepEqual(saved.project.clips[0],first);
  assert.notEqual(saved.project.clips[0].assetId,saved.project.clips[1].assetId);
  assert.equal(saved.assets.find(a=>a.id===first.assetId)?.giphy?.id,'example');assert.equal(saved.assets.find(a=>a.id===secondAsset.id)?.giphy?.id,'different');
  const status=await(await fetch(base+'/api/giphy/status')).json();assert.equal('apiKey' in status,false);assert.equal(status.localImportEnabled,true);assert.equal('projectMediaApproved' in status,false);
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await fs.rm(dir,{recursive:true,force:true});}
});
