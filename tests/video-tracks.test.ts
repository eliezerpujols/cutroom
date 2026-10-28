import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clipsInRenderOrder,splitTarget,type Clip,type Project} from '../src/model';
import {arrangeTimelineTracks,clipsOverlap,placeTimelineClip} from '../src/videoTracks';

const clip=(id:string,start:number,duration=100,trackId='video'):Clip=>({id,assetId:'media',name:id,kind:'video',trackId,start,duration,sourceIn:0,rate:1,volume:1,muted:false,fadeIn:0,fadeOut:0});
const project=(clips:Clip[]):Project=>({version:1,name:'Project',fps:30,width:1080,height:1920,tracks:[{id:'video',name:'Video',kind:'video',muted:false},{id:'audio',name:'Audio',kind:'audio',muted:false}],clips});
function assertSeparate(p:Project){
  for(const a of p.clips)for(const b of p.clips)if(a.id!==b.id&&a.trackId===b.trackId)assert.equal(clipsOverlap(a,b),false);
}

test('an overlapping incoming video moves above the occupied track without changing either source window',()=>{
  const original=clip('original',0),incoming=clip('incoming',50),p=project([original]);
  const result=placeTimelineClip(p,incoming,{newTrackId:'upper'});
  assert.equal(result.tracks[0].id,'upper');assert.equal(result.tracks[0].name,'Video 2');
  assert.deepEqual(result.clips[0],original);assert.deepEqual(result.clips[1],{...incoming,trackId:'upper'});
  assertSeparate(result);assert.equal(p.tracks.length,2);assert.equal(p.clips.length,1);
});
test('touching edges and gaps remain on the same track, and free upper video lanes are reused',()=>{
  const p=project([clip('original',0)]);
  for(const start of [100,160]){const r=placeTimelineClip(p,clip('incoming',start));assert.equal(r.tracks.length,2);assert.equal(r.clips[1].trackId,'video');}
  const occupied=placeTimelineClip(p,clip('above',0,40),{newTrackId:'upper'});
  const result=placeTimelineClip(occupied,clip('incoming',50));
  assert.equal(result.tracks.length,3);assert.equal(result.clips[2].trackId,'upper');assertSeparate(result);
});
test('drag previews reuse one new track and remove it when the clip leaves the overlap',()=>{
  const moving=clip('moving',120,50),p=project([clip('original',0),moving]);
  let result=placeTimelineClip(p,{...moving,start:20},{newTrackId:'drag-track',cleanupTrackId:'drag-track'});
  for(const start of [25,30,40])result=placeTimelineClip(result,{...moving,start},{newTrackId:'drag-track',cleanupTrackId:'drag-track'});
  assert.equal(result.tracks.filter(t=>t.id==='drag-track').length,1);assert.equal(result.clips.length,2);assertSeparate(result);
  result=placeTimelineClip(result,{...moving,start:160},{newTrackId:'drag-track',cleanupTrackId:'drag-track'});
  assert.equal(result.tracks.length,2);assert.equal(result.clips[1].trackId,'video');assertSeparate(result);
});
test('moving vertically above the first lane can create a separate track even in a free time range',()=>{
  const moving=clip('moving',0,50),p=project([moving]);
  const result=placeTimelineClip(p,moving,{newTrackId:'upper',forceNewTrack:true});
  assert.equal(result.tracks[0].id,'upper');assert.equal(result.clips[0].trackId,'upper');assert.equal(result.clips[0].start,0);
});
test('existing overlaps are repaired, and edits prioritize moving the changed clip rather than its neighbor',()=>{
  const first=clip('first',0),second=clip('second',50),third=clip('third',75);
  const p=project([first,second,third]),result=arrangeTimelineTracks(p);
  assertSeparate(result);assert.deepEqual(result.clips.map(c=>c.id),p.clips.map(c=>c.id));
  for(const c of result.clips){const old=p.clips.find(o=>o.id===c.id)!;assert.deepEqual({...c,trackId:old.trackId},old);}
  assert.equal(arrangeTimelineTracks(result),result);
  const prioritized=arrangeTimelineTracks(project([first,second]),['first']);
  assert.equal(prioritized.clips[1].trackId,'video');assert.notEqual(prioritized.clips[0].trackId,'video');
});
test('preview/export and automatic split selection follow visible track order rather than clip array order',()=>{
  const upper=clip('upper',0,100,'upper'),lower=clip('lower',0),p=project([upper,lower]);
  p.tracks.unshift({id:'upper',name:'Video 2',kind:'video',muted:false});
  assert.deepEqual(clipsInRenderOrder(p).map(c=>c.id),['lower','upper']);
  assert.equal(splitTarget(p,null,50)?.id,'upper');
});
test('audio overlaps get separate tracks and a full track list never overwrites another clip',()=>{
  const audio:Clip={...clip('sound',0),kind:'audio',trackId:'audio'};
  const p=project([audio]),r=placeTimelineClip(p,{...audio,id:'sound-2'});assert.equal(r.tracks.length,3);assert.notEqual(r.clips[1].trackId,'audio');assert.equal(r.tracks.find(t=>t.id===r.clips[1].trackId)?.kind,'audio');assertSeparate(r);
  const full=project([clip('base',0)]);for(let i=2;i<12;i++){const id='track-'+i;full.tracks.unshift({id,name:'Video '+i,kind:'video',muted:false});full.clips.push(clip('clip-'+i,0,100,id));}
  assert.throws(()=>placeTimelineClip(full,clip('incoming',10)),/12 tracks/);assert.equal(full.clips.length,11);
});
