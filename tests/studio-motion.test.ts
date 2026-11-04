import {STUDIO_DRAG_TYPE,isLibraryDrag,movingLibraryItem} from '../src/libraryDrag';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addStudioElement,orbitPose,studioAssets} from '../src/studio/registry';
import {dynamicMotionOptions,dynamicMotionStyle,motionPhase,visualStyle,styleOptions} from '../src/continuousEffects';
import {defaultEffects,patchSelectionEffects} from '../src/effects';
import {validateProject,studioSchema} from '../server/schema';
import {splitClip,trimClip,type Project} from '../src/model';
const empty:Project={version:1,name:'Studio QA',width:1080,height:1920,fps:30,clips:[],tracks:[]};
test('Studio elements persist without external media and preserve animation phase after trims and splits',()=>{
 const p=addStudioElement(empty,'orbit-card',60,'card');const saved=validateProject(JSON.parse(JSON.stringify(p)),[]),clip=saved.clips[0];
 assert.equal(clip.studio?.props.title,'Alex Morgan');assert.equal(clip.overlay?.width,75);assert.equal(clip.start,60);
 const [left,right]=splitClip(clip,90,'right');assert.equal(left.duration,30);assert.equal(right.sourceIn,30);assert.deepEqual(orbitPose(right.sourceIn,2.4),orbitPose(30,2.4));
 const trimmed=trimClip(clip,15,'left',studioAssets[0]);assert.equal(trimmed.sourceIn,15);assert.equal(trimmed.start,75);
 assert.equal(orbitPose(0,2.4).rotateY,0);assert.equal(orbitPose(72,2.4).rotateY,360);
 assert.equal(studioSchema.safeParse({template:'orbit-card',props:{turnSeconds:-1}}).success,false);
 assert.equal(studioSchema.safeParse({template:'orbit-card',props:{background:'url(unsafe)'}}).success,false);
 assert.equal(studioSchema.safeParse({template:'unknown',props:{}}).success,false);
 assert.throws(()=>validateProject({...saved,clips:[{...clip,assetId:'not-a-template'}]},[]));
});
test('Studio overlays get separate overlapping lanes and edits do not alter other instances',()=>{
 const p=addStudioElement(addStudioElement(empty,'orbit-card',0,'one'),'orbit-card',0,'two');
 assert.notEqual(p.clips[0].trackId,p.clips[1].trackId);
 p.clips[0].studio!.props.title='First';assert.equal(p.clips[1].studio!.props.title,'Alex Morgan');
});
test('Motion and Styles preserve independent effects and survive document validation',()=>{
 const p=addStudioElement(empty,'orbit-card',0,'card');
 const next=patchSelectionEffects(p,['card'],{...defaultEffects,motion:'echo',style:'fisheye',motionLoop:true,motionIntensity:70,styleIntensity:35});
 const saved=validateProject(next,[]);assert.equal(saved.clips[0].effects?.motion,'echo');assert.equal(saved.clips[0].effects?.style,'fisheye');
 const reset=patchSelectionEffects(saved,['card'],{motion:'none'});assert.equal(reset.clips[0].effects?.style,'fisheye');assert.equal(reset.clips[0].start,0);
});
test('all motion and style frames are deterministic and finite even on one-frame clips',()=>{
 for(const [motion] of dynamicMotionOptions)for(const duration of [1,2,120])for(const frame of [0,1,29,60,119]){
  const e={motion,motionFrames:30,motionIntensity:100};const result=dynamicMotionStyle(e,frame,duration);
  assert.ok(!JSON.stringify(result).match(/NaN|Infinity/));assert.deepEqual(result,dynamicMotionStyle(e,frame,duration));
 }
 assert.equal(motionPhase({motionFrames:30},60,120),1);assert.equal(motionPhase({motionFrames:30,motionLoop:true},60,120),0);
 for(const [style] of styleOptions)assert.ok(!JSON.stringify(visualStyle({style,styleIntensity:100},300)).match(/NaN|Infinity/));
});

test('Studio library drags copy into a compatible requested track and fall back from audio',()=>{
 assert.equal(isLibraryDrag([STUDIO_DRAG_TYPE]),true);assert.equal(movingLibraryItem([STUDIO_DRAG_TYPE]),false);
 const p:Project={...empty,tracks:[{id:'v1',name:'Video',kind:'video',muted:false},{id:'v2',name:'Video 2',kind:'video',muted:false},{id:'a1',name:'Audio',kind:'audio',muted:false}]};
 const dropped=addStudioElement(p,'orbit-card',90,'drop','v2');assert.equal(dropped.clips[0].trackId,'v2');assert.equal(dropped.clips[0].start,90);
 assert.equal(addStudioElement(p,'orbit-card',90,'drop','a1').clips[0].trackId,'v1');
});
