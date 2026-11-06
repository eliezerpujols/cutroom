import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StyleNumber} from '../src/StyleControls';
import {makeOverlay,overlayHeight} from '../src/overlays';
import {clipOverlaySchema,type StoredAsset} from '../server/schema';
import {ProjectStore} from '../server/projects';
import {registerLayerRoutes} from '../server/layers';

test('media overlay width has no arbitrary upper bound but stays finite and positive',()=>{
 for(const width of [200.5,400,1200,10000]){
  assert.equal(clipOverlaySchema.parse({x:50,y:50,width}).width,width);
  assert.equal(overlayHeight({width:1080,height:1920},{width:1080,height:1920},width),width);
 }
 for(const width of [0,1.99,NaN,Infinity,-Infinity])assert.equal(clipOverlaySchema.safeParse({x:50,y:50,width}).success,false);
});

test('shared number fields can omit a maximum without removing other fields’ limits',()=>{
 const render=(max?:number)=>renderToStaticMarkup(createElement(StyleNumber,{
  label:'Width',value:400,min:2,max,unit:'%',step:.5,change:()=>{},checkpoint:()=>{},
 }));
 assert.doesNotMatch(render(),/\smax=/);assert.match(render(),/value="400"/);
 assert.match(render(96),/max="96"/);
});

test('overlay API saves and reopens widths over 200 for video and cover scenes',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cutroom-overlay-size-'));
 const store=new ProjectStore(path.join(dir,'data'),path.join(dir,'projects'));await store.initialize();
 const id=store.activeId(),folder=store.entry(id).folder;
 const asset:StoredAsset={id:'image',name:'Image',kind:'image',duration:5,frames:150,width:1,height:1,hasAudio:false,file:'media/image.png',thumbnails:[],peaks:[]};
 await fs.mkdir(path.join(folder,'media'),{recursive:true});
 await fs.writeFile(path.join(folder,asset.file),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64'));
 await store.addAsset(id,asset);
 const original=await store.read(id),track=original.project.tracks.find(t=>t.kind==='video')!;
 const clip={id:'clip',assetId:asset.id,name:'Image',kind:'video' as const,trackId:track.id,start:0,duration:60,sourceIn:0,rate:1,volume:0,muted:true,fadeIn:0,fadeOut:0};
 await store.save(id,{...original.project,clips:[clip]},0);
 const app=express();app.use(express.json());registerLayerRoutes(app,store,()=>({}));
 app.use((error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(400).json({error:error.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try{
  const response=await fetch(`${base}/api/projects/${id}/overlays`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:1,clipId:'clip',overlay:{width:1200}})});
  assert.equal(response.status,200,await response.text());
  const saved=await store.read(id);assert.equal(saved.project.clips[0].overlay?.width,1200);
  assert.deepEqual({...saved.project.clips[0],overlay:undefined},{...clip,overlay:undefined});
  const cover=makeOverlay(saved.project,'clip',{width:2400},asset);
  await store.save(id,{...saved.project,cover:{frame:0,showCaptions:false,texts:[],scene:{clips:cover.clips,tracks:cover.tracks}}},saved.revision);
  const reopened=await store.read(id);assert.equal(reopened.project.clips[0].overlay?.width,1200);assert.equal(reopened.project.cover?.scene?.clips[0].overlay?.width,2400);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await fs.rm(dir,{recursive:true,force:true});}
});
