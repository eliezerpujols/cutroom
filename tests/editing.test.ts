import {test} from 'node:test';
import assert from 'node:assert/strict';
import {splitClip,splitTarget,trimClip,slipClip,setClipRate,gainAt,type Clip,type Asset,type Project} from '../src/model';
const asset:Asset={id:'source',name:'source',kind:'video',frames:600,duration:20,width:1080,height:1920,hasAudio:true,url:'',peaks:[],thumbnails:[]};
const clip:Clip={id:'clip',assetId:asset.id,kind:'video',name:'clip',trackId:'video',start:30,duration:120,sourceIn:60,rate:2,volume:.8,muted:false,fadeIn:0,fadeOut:0};
test('a split preserves source continuity for a trimmed, accelerated clip',()=>{
  const [left,right]=splitClip(clip,75,'right');assert.equal(left.start+left.duration,right.start);
  assert.equal(left.sourceIn+left.duration*left.rate,right.sourceIn);
  assert.equal(left.duration+right.duration,clip.duration);
  assert.equal(right.sourceIn+right.duration*right.rate,clip.sourceIn+clip.duration*clip.rate);
});
const project=(clips:Clip[]):Project=>({version:1,name:'Edit',width:1080,height:1920,fps:30,tracks:[],clips});
test('splitting targets the selected clip and does not silently change to another track',()=>{
  const audio:Clip={...clip,id:'audio',kind:'audio',trackId:'audio'};
  const p=project([clip,audio]);
  assert.equal(splitTarget(p,'audio',75)?.id,'audio');
  assert.equal(splitTarget(project([clip,{...audio,start:0,duration:300}]),clip.id,200),null);
  const result=p.clips.flatMap(c=>c.id===audio.id?splitClip(c,75,'right'):[c]);
  assert.deepEqual(result[0],clip);assert.equal(result.length,3);
});
test('without a selection split chooses the visible top video, then audio in video gaps',()=>{
  const background={...clip,id:'background',start:0,duration:300};
  const overlay={...clip,id:'overlay',start:50,duration:100};
  const audio:Clip={...clip,id:'audio',kind:'audio',start:0,duration:500};
  const p=project([background,overlay,audio]);
  assert.equal(splitTarget(p,null,75)?.id,'overlay');
  assert.equal(splitTarget(p,'removed-by-undo',75)?.id,'overlay');
  assert.equal(splitTarget(p,null,200)?.id,'background');
  assert.equal(splitTarget(p,null,350)?.id,'audio');
});
test('split is unavailable at clip boundaries, empty timelines and uncovered gaps',()=>{
  const p=project([clip]);
  for(const at of [0,clip.start,clip.start+clip.duration,500])assert.equal(splitTarget(p,null,at),null);
  assert.equal(splitTarget(project([]),null,75),null);
  const background={...clip,id:'background',start:0,duration:300};
  const overlay={...clip,id:'overlay',start:50,duration:100};
  assert.equal(splitTarget(project([background,overlay]),null,50),null);
});
test('left trim keeps the remaining content at the same absolute timeline time',()=>{
  const c=trimClip(clip,20,'left',asset);const absolute=100;
  assert.equal(c.sourceIn+(absolute-c.start)*c.rate,clip.sourceIn+(absolute-clip.start)*clip.rate);
  assert.equal(c.start+c.duration,clip.start+clip.duration);
  const extended=trimClip(clip,-999,'left',asset);assert.equal(extended.start,0);assert.ok(extended.sourceIn>=0);
});
test('trimming cannot create an empty clip or run past the source',()=>{
  assert.equal(trimClip(clip,999,'left',asset).duration,1);
  const c=trimClip(clip,999,'right',asset);assert.equal(c.sourceIn+c.duration*c.rate,asset.frames);
});
test('slip shifts only the source window and respects both source boundaries',()=>{
  for(const delta of [-999,25,999]){const c=slipClip(clip,delta,asset);assert.equal(c.start,clip.start);assert.equal(c.duration,clip.duration);assert.ok(c.sourceIn>=0);assert.ok(c.sourceIn+c.duration*c.rate<=asset.frames);}
  assert.equal(slipClip(clip,25,asset).sourceIn,110);
});
test('speed changes preserve the selected source range',()=>{
  for(const rate of [.5,1,4]){const c=setClipRate(clip,rate,asset);assert.equal(c.start,clip.start);assert.equal(c.sourceIn,clip.sourceIn);assert.equal(c.duration*c.rate,clip.duration*clip.rate);}
});
test('audio fades reach silence at both ends, and mute takes priority',()=>{
  const c={...clip,duration:120,fadeIn:15,fadeOut:20};assert.equal(gainAt(c,0),0);assert.equal(gainAt(c,60),.8);assert.equal(gainAt(c,119),0);assert.equal(gainAt({...c,muted:true},60),0);
});
