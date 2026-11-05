import test from 'node:test';import assert from 'node:assert/strict';
import {clipSchema,transformSchema} from '../server/schema';
import {patchTransform,mediaTransformStyle,cropStyle,cropGeometry,trackedPosition,faceCameraStyle} from '../src/transforms';
import {addCutoutLayer} from '../src/localVision';
import type {Project,Clip,Asset} from '../src/model';
const clip:Clip={id:'c',name:'Video',assetId:'a',trackId:'v',kind:'video',start:30,duration:60,sourceIn:10,rate:2,volume:1,muted:false,fadeIn:0,fadeOut:0};
const project:Project={version:1,name:'QA',width:1080,height:1920,fps:30,tracks:[{id:'v',name:'Video',kind:'video',muted:false}],clips:[clip]};
test('visual transforms persist independently and reject empty crops and invalid values',()=>{const next=patchTransform(project,['c'],{rotation:45,flipX:true,crop:{left:10,top:0,right:20,bottom:5}});assert.equal(clipSchema.parse(next.clips[0]).transform?.rotation,45);assert.deepEqual(project.clips[0],clip);assert.equal(next.clips[0].sourceIn,10);assert.match(mediaTransformStyle(next.clips[0].transform).transform!,/rotate\(45deg\) scale\(-1,1\)/);for(const patch of [{rotation:NaN},{rotation:181},{crop:{left:50,right:50,top:0,bottom:0}}])assert.equal(transformSchema.safeParse(patch).success,false);});
test('crop coordinates expand the source within its clipped viewport',()=>{const result=cropStyle({left:10,right:10,top:0,bottom:0});assert.equal(result.width,'125%');assert.equal(result.left,'-12.5%');});
test('portrait crops preserve landscape source aspect and remove visible source pixels',()=>{const result=cropGeometry({width:1920,height:1080},{width:1080,height:1920},{left:25,right:0,top:0,bottom:0});assert.equal(result.source.width,1080);assert.equal(result.source.height,607.5);assert.equal(result.viewport.width,810);assert.equal(result.source.left,-270);assert.equal(result.viewport.left,135);});
test('tracking follows source time across trim and speed, and camera framing never exposes blank edges',()=>{const tracked={...clip,transform:{faceTrack:[{frame:10,x:20,y:30},{frame:50,x:60,y:70}]}};assert.deepEqual(trackedPosition(tracked,10),{x:40,y:50});const s=faceCameraStyle({width:1920,height:1080},{width:1080,height:1920},{x:0,y:100});assert.equal(s.left,0);assert.ok(Number(s.top)<=0);assert.ok(Number(s.height)+Number(s.top)>=1920);});
test('cutout adds a silent source-aligned layer above its original without replacing it',()=>{const asset:Asset={id:'alpha',name:'Cutout',url:'/alpha',kind:'video',frames:60,duration:2,width:1080,height:1920,hasAudio:false,thumbnails:[],peaks:[],sequence:{count:60}};const {project:next,id}=addCutoutLayer(project,clip,asset);assert.deepEqual(next.clips.find(c=>c.id==='c'),clip);const cutout=next.clips.find(c=>c.id===id)!;assert.equal(cutout.start,30);assert.equal(cutout.duration,60);assert.equal(cutout.sourceIn,0);assert.equal(cutout.rate,1);assert.equal(cutout.muted,true);assert.ok(next.tracks.findIndex(t=>t.id===cutout.trackId)<next.tracks.findIndex(t=>t.id==='v'));});
test('derived cutouts rebase camera tracking so trimmed and sped-up layers remain aligned',()=>{const original={...clip,transform:{faceTrack:[{frame:10,x:20,y:30},{frame:130,x:80,y:70}]}};const asset:Asset={id:'alpha',name:'Cutout',url:'/alpha',kind:'video',frames:60,duration:2,width:1080,height:1920,hasAudio:false,thumbnails:[],peaks:[]};const {project:next,id}=addCutoutLayer({...project,clips:[original]},original,asset);const derived=next.clips.find(c=>c.id===id)!;for(const frame of [0,9,30,57])assert.deepEqual(trackedPosition(derived,frame),trackedPosition(original,frame));});

test('batch transforms and crop preserve each source and unedited crop edges',async()=>{
 const {patchSelectedCrop}=await import('../src/transforms');
 const other={...clip,id:'other',start:100,transform:{rotation:20,crop:{left:3,top:4,right:25,bottom:8}}};
 const untouched={...clip,id:'untouched',start:200};
 const original={...project,clips:[clip,other,untouched]};
 const transformed=patchTransform(original,['c','other'],{rotation:45,flipX:true});
 const cropped=patchSelectedCrop(transformed,['c','other'],{left:10});
 assert.deepEqual(cropped.clips[0].transform?.crop,{left:10,top:0,right:0,bottom:0});
 assert.deepEqual(cropped.clips[1].transform?.crop,{left:10,top:4,right:25,bottom:8});
 assert.equal(cropped.clips[1].transform?.rotation,45);
 assert.equal(cropped.clips[1].sourceIn,clip.sourceIn);
 assert.equal(cropped.clips[1].start,100);
 assert.deepEqual(cropped.clips[2],untouched);
 assert.deepEqual(original.clips[1],other);
});

test('batch overlays reuse a free lane at the track limit without moving clip times',async()=>{
 const {makeSelectedOverlays}=await import('../src/overlays');
 const second={...clip,id:'second',start:100};
 const untouched={...clip,id:'untouched',start:250};
 const tracks:Project['tracks']=[...Array.from({length:11},(_,i)=>({id:'free-'+i,name:'Free '+i,kind:'video' as const,muted:false})),...project.tracks];
 const otherClips=tracks.slice(0,11).map(t=>({...clip,id:'occupied-'+t.id,trackId:t.id,start:500}));
 const original={...project,tracks,clips:[clip,second,untouched,...otherClips]};
 const asset:Asset={id:'a',name:'Source',url:'/source',kind:'video',frames:600,duration:20,width:1080,height:1920,hasAudio:true,thumbnails:[],peaks:[]};
 const next=makeSelectedOverlays(original,['c','second'],[asset]);
 assert.equal(next.tracks.length,12);
 for(const id of ['c','second']){
  const result=next.clips.find(c=>c.id===id)!;
  assert.deepEqual(result.overlay,{x:50,y:50,width:45});
  assert.equal(result.trackId,'free-0');
  const before=original.clips.find(c=>c.id===id)!;
  assert.equal(result.start,before.start);
  assert.equal(result.sourceIn,before.sourceIn);
  assert.equal(result.duration,before.duration);
 }
 assert.deepEqual(next.clips.find(c=>c.id==='untouched'),untouched);
 assert.equal(original.clips[0].overlay,undefined);
});
