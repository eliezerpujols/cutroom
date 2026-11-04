import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyEffectPatch,saveEffects,effectPatchSchema} from '../server/mcp-features';
import {addStudioElement} from '../src/studio/registry';
import {defaultVideoText} from '../src/videoText';
import {defaultCaptionStyle} from '../src/captions';
import {defaultEffects} from '../src/effects';
import type {Project} from '../src/model';
const empty:Project={version:1,name:'MCP effects',width:1080,height:1920,fps:30,clips:[],tracks:[]};
function fixture(){const p=addStudioElement(empty,'orbit-card',0,'same');return {...p,texts:[{...defaultVideoText,id:'same',text:'Title',effects:{...defaultEffects,style:'disco' as const}}],captions:[{id:'captions',name:'Captions',language:'en',muted:false,style:defaultCaptionStyle,cues:[{id:'cue',start:0,duration:90,words:[{text:'Hello',start:0,end:90}]}]}]};}
test('effects patch media, text and caption cues with explicit IDs and preserve other settings',()=>{
 const p=fixture(),saved=structuredClone(p);
 const next=applyEffectPatch(p,[{kind:'clip',id:'same'},{kind:'caption',id:'cue'}],{enter:'fade',blur:4});
 assert.equal(next.clips[0].effects?.blur,4);assert.equal(next.captions?.[0].cues[0].effects?.enter,'fade');
 assert.deepEqual(next.texts,p.texts);assert.deepEqual(next.clips[0].studio,p.clips[0].studio);assert.deepEqual(p,saved);
 const title=applyEffectPatch(next,[{kind:'text',id:'same'}],{enter:'text-wave'});assert.equal(title.texts?.[0].effects?.style,'disco');assert.equal(title.texts?.[0].effects?.enter,'text-wave');
 assert.equal(applyEffectPatch(title,[{kind:'text',id:'same'}],{enter:'fade'},true).texts?.[0].effects?.style,'none');
});
test('invalid, audio and text-only media targets reject the full patch',()=>{
 const p=fixture(),saved=structuredClone(p);for(const targets of [[{kind:'clip' as const,id:'missing'}],[{kind:'clip' as const,id:'same'},{kind:'caption' as const,id:'missing'}]])assert.throws(()=>applyEffectPatch(p,targets,{blur:2}));
 assert.throws(()=>applyEffectPatch(p,[{kind:'clip',id:'same'}],{enter:'text-wave'}));
 assert.throws(()=>applyEffectPatch({...p,clips:[{...p.clips[0],kind:'audio'}]},[{kind:'clip',id:'same'}],{blur:4}));
 assert.equal(effectPatchSchema.safeParse({unknown:4}).success,false);assert.deepEqual(p,saved);
});
test('partial motion phases preserve individual timing and enforce total bounds',()=>{
 let p:Project=fixture();p=applyEffectPatch(p,[{kind:'clip',id:'same'}],{motion:'pulse',motionTiming:{rise:10,hold:3,return:20}});
 p=applyEffectPatch(p,[{kind:'text',id:'same'}],{motion:'pulse',motionTiming:{rise:5,hold:0,return:5}});
 const next=applyEffectPatch(p,[{kind:'clip',id:'same'},{kind:'text',id:'same'}],{motionTiming:{hold:30}});
 assert.deepEqual(next.clips[0].effects?.motionTiming,{rise:10,hold:30,return:20});assert.equal(next.clips[0].effects?.motionFrames,60);
 assert.deepEqual(next.texts?.[0].effects?.motionTiming,{rise:5,hold:30,return:5});assert.equal(next.texts?.[0].effects?.motionFrames,40);
 assert.throws(()=>applyEffectPatch(p,[{kind:'clip',id:'same'}],{motionTiming:{hold:900}}));
 const resized=applyEffectPatch(next,[{kind:'clip',id:'same'}],{motionFrames:30});assert.deepEqual(resized.clips[0].effects?.motionTiming,{rise:5,hold:15,return:10});
});
test('save refuses stale revisions and retains atomic protection against a concurrent save',async()=>{
 let writes=0;const current={revision:3,project:fixture()};
 const send=async(route:string,body?:any)=>{if(route.startsWith('/api/workspace'))return current;writes++;assert.equal(body.expectedRevision,3);throw new Error('Concurrent revision conflict');};
 await assert.rejects(saveEffects('project',2,[{kind:'clip',id:'same'}],{blur:1},false,send),/changed/);assert.equal(writes,0);
 await assert.rejects(saveEffects('project',3,[{kind:'clip',id:'same'}],{blur:1},false,send),/Concurrent/);assert.equal(writes,1);assert.equal(current.project.clips[0].effects,undefined);
});
