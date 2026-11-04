import test from 'node:test';
import assert from 'node:assert/strict';
import {dynamicMotionStyle,getMotionTiming,motionPhase,resizeMotionTiming,withMotionTiming,type ContinuousEffects} from '../src/continuousEffects';
import {addStudioElement} from '../src/studio/registry';
import {mapSelectionMotion,patchSelectionEffects} from '../src/effects';
import {validateProject,effectsSchema} from '../server/schema';
import type {Project} from '../src/model';
const empty:Project={version:1,name:'Timing QA',width:1080,height:1920,fps:30,clips:[],tracks:[]};
const pulse:ContinuousEffects={motion:'pulse',motionIntensity:100,motionFrames:90,motionTiming:{rise:15,hold:60,return:15}};
test('rise reaches the peak, holds for the requested interval, and returns to neutral',()=>{
 assert.equal(motionPhase(pulse,0,120),0);
 for(const frame of [15,30,60,74])assert.equal(motionPhase(pulse,frame,120),.5);
 assert.equal(dynamicMotionStyle(pulse,15,120).transform,'scale(1.24)');
 assert.equal(dynamicMotionStyle(pulse,74,120).transform,'scale(1.24)');
 assert.ok(motionPhase(pulse,80,120)>.5);
 for(const frame of [89,90,119])assert.equal(motionPhase(pulse,frame,120),1);
});
test('loop restarts the entire rise-hold-return cycle and short clips finish without a jump',()=>{
 assert.equal(motionPhase({...pulse,motionLoop:true},90,120),0);
 assert.equal(motionPhase({...pulse,motionLoop:true},105,120),.5);
 assert.equal(motionPhase(pulse,0,10),0);assert.equal(motionPhase(pulse,9,10),1);
 assert.equal(motionPhase(pulse,0,1),0);
 for(const duration of [1,2,3,10,120])for(let frame=0;frame<duration;frame++)assert.ok(!JSON.stringify(dynamicMotionStyle(pulse,frame,duration)).match(/NaN|Infinity/));
});
test('old motion timing is unchanged and duration resizing preserves the phase proportions',()=>{
 for(const frame of [0,5,14,29,35])assert.equal(motionPhase({motion:'pulse',motionFrames:30},frame,120),Math.min(frame/29,1));
 const adjusted=resizeMotionTiming(pulse,180);assert.deepEqual(adjusted.motionTiming,{rise:30,hold:120,return:30});
 const minimum=resizeMotionTiming(pulse,2);assert.deepEqual(minimum.motionTiming,{rise:1,hold:0,return:1});
 const limited=withMotionTiming(pulse,{hold:900});assert.equal(limited.motionFrames,900);assert.ok(getMotionTiming(limited).rise>=1);
});
test('phase changes survive saving and preserve other selected items’ independent timings',()=>{
 let project=addStudioElement(addStudioElement(empty,'orbit-card',0,'one'),'orbit-card',0,'two');
 project=patchSelectionEffects(project,['one'],pulse);
 project=patchSelectionEffects(project,['two'],{motion:'tunnel',motionFrames:60,motionTiming:{rise:10,hold:30,return:20}});
 const next=mapSelectionMotion(project,['one','two'],e=>({...e,...withMotionTiming(e,{hold:45})}));
 const saved=validateProject(JSON.parse(JSON.stringify(next)),[]);
 assert.deepEqual(saved.clips[0].effects?.motionTiming,{rise:15,hold:45,return:15});
 assert.deepEqual(saved.clips[1].effects?.motionTiming,{rise:10,hold:45,return:20});
 assert.equal(saved.clips[0].effects?.motionFrames,75);assert.equal(saved.clips[1].effects?.motionFrames,75);
 const partial=mapSelectionMotion(project,['one'],e=>({...e,...withMotionTiming(e,{return:60})}));assert.deepEqual(partial.clips[1],project.clips[1]);
 for(const timing of [{rise:0,hold:3,return:3},{rise:3,hold:-1,return:3},{rise:3.5,hold:0,return:3},{rise:900,hold:900,return:900}])assert.equal(effectsSchema.partial().safeParse({motionTiming:timing}).success,false);
});
