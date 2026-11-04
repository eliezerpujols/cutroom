import {test} from 'node:test';
import assert from 'node:assert/strict';
import {patchSelectedAdjustments,setSelectedRate,slipSelectionSources} from '../src/selectionMedia';
import {defaultAdjustments,defaultCoverText} from '../src/visuals';
import {defaultCaptionStyle,effectiveCaptionStyle} from '../src/captions';
import {patchSelectionStyles} from '../src/selectionStyles';
import {defaultEffects,defaultShadow,effectEdges,effectStyle,patchSelectionEffects,transitionPrevious,timelineTransitions,transitionDuration} from '../src/effects';
import {projectSchema,effectsSchema,shadowSchema} from '../server/schema';
import type {Asset,Clip,Project} from '../src/model';
const asset:Asset={id:'asset',name:'Video',kind:'video',frames:300,duration:10,width:1080,height:1920,hasAudio:true,url:'',thumbnails:[],peaks:[]};
const image:Asset={...asset,id:'image',kind:'image',hasAudio:false};
const clip:Clip={id:'one',assetId:'asset',name:'One',kind:'video',trackId:'video',start:0,duration:60,sourceIn:30,rate:1,volume:1,muted:false,fadeIn:0,fadeOut:0};
const other:Clip={...clip,id:'two',start:60,sourceIn:150,adjustments:{...defaultAdjustments,contrast:32}};
const p:Project={version:1,name:'Test',width:1080,height:1920,fps:30,clips:[clip,other,{...clip,id:'still',assetId:'image',start:120},{...clip,id:'audio',kind:'audio',trackId:'audio'}],tracks:[{id:'video',name:'Video',kind:'video',muted:false},{id:'audio',name:'Audio',kind:'audio',muted:false}],texts:[{...defaultCoverText,id:'title',start:0,duration:60,muted:false}],captions:[{id:'captions',name:'Captions',language:'en',muted:false,style:{...defaultCaptionStyle,shadow:{...defaultShadow,mode:'drop',color:'#ff0000'}},cues:[{id:'cue',start:0,duration:60,words:[{text:'Hello',start:0,end:60}],style:{shadow:{blur:20}}},{id:'cue2',start:60,duration:60,words:[{text:'World',start:0,end:60}]}]}]};
test('batch adjustments patch only selected visual fields, preserving independent looks and edit-wide color',()=>{
  const original={...p,adjustments:{...defaultAdjustments,exposure:.4}};
  const next=patchSelectedAdjustments(original,['one','two','audio'],{brightness:15});
  assert.equal(next.clips[0].adjustments?.brightness,15);assert.equal(next.clips[1].adjustments?.contrast,32);
  assert.equal(next.clips[2],original.clips[2]);assert.equal(next.clips[3],original.clips[3]);assert.equal(next.adjustments,original.adjustments);
});
test('batch speed preserves source windows and start positions, ignores images, and uses the gesture origin',()=>{
  const first=setSelectedRate(p,['one','two','still','audio'],[asset,image],.5);
  const last=setSelectedRate(first,['one','two','still','audio'],[asset,image],2,p.clips);
  for(const id of ['one','two','audio']){const before=p.clips.find(c=>c.id===id)!,after=last.clips.find(c=>c.id===id)!;assert.equal(after.start,before.start);assert.equal(after.duration*after.rate,before.duration*before.rate);assert.equal(after.sourceIn,before.sourceIn);}
  assert.equal(last.clips[2],p.clips[2]);assert.deepEqual(setSelectedRate(last,['one','two','audio'],[asset,image],1).clips,p.clips);
});
test('batch slip clamps one common source delta at the tightest boundary',()=>{
  const next=slipSelectionSources(p,['one','two'],[asset],1000);
  assert.equal(next.clips[0].sourceIn-clip.sourceIn,next.clips[1].sourceIn-other.sourceIn);
  assert.equal(next.clips[1].sourceIn+next.clips[1].duration,asset.frames);assert.equal(next.clips[0].start,clip.start);
  const earlier=slipSelectionSources(p,['one','two'],[asset],-1000);assert.equal(earlier.clips[0].sourceIn,0);assert.equal(earlier.clips[1].sourceIn,120);
});
test('effects survive schema round trips on videos, titles and cues without touching audio or timing',()=>{
  const next=patchSelectionEffects(p,['one','title','cue','audio'],{enter:'slide-up',exit:'blur',blur:4});
  const saved=projectSchema.parse(JSON.parse(JSON.stringify(next)));
  assert.equal(saved.clips[0].effects?.enter,'slide-up');assert.equal(saved.texts?.[0].effects?.exit,'blur');assert.equal(saved.captions?.[0].cues[0].effects?.blur,4);
  assert.equal(next.clips[3],p.clips[3]);assert.equal(saved.clips[0].start,clip.start);assert.equal(saved.clips[0].duration,clip.duration);
  assert.equal(projectSchema.parse(p).clips[0].effects,undefined);
});
test('short animations stay bounded, hit endpoints and leave legacy content untouched',()=>{
  const effects={...defaultEffects,enter:'fade' as const,exit:'fade' as const,enterFrames:90,exitFrames:90};
  for(const duration of [1,2,5,20]){const edge=effectEdges(effects,duration);assert.ok(edge.enter+edge.exit<=duration-1);for(let f=0;f<duration;f++){const style=effectStyle(effects,f,duration);assert.ok(style.opacity===undefined||(Number.isFinite(style.opacity)&&Number(style.opacity)>=0&&Number(style.opacity)<=1));}}
  assert.equal(effectStyle(effects,0,20).opacity,0);assert.equal(effectStyle(effects,19,20).opacity,0);assert.deepEqual(effectStyle(undefined,0,20),{});
  assert.equal(effectsSchema.safeParse({...effects,enterFrames:0}).success,false);assert.equal(shadowSchema.safeParse({...defaultShadow,blur:Infinity}).success,false);
});
test('transitions only bind to adjoining full-frame clips on the same track',()=>{
  const target={...other,effects:{...defaultEffects,transition:'fade' as const}};
  assert.equal(transitionPrevious(p,target)?.id,'one');assert.equal(transitionPrevious(p,{...target,start:61}),undefined);assert.equal(transitionPrevious(p,{...target,overlay:{x:50,y:50,width:40}}),undefined);assert.equal(transitionPrevious(p,{...target,trackId:'different'}),undefined);
});
test('shadow property edits retain inherited colors and individual cue settings',()=>{
  const next=patchSelectionStyles(p,['cue'],{shadow:{mode:'inner'}}),layer=next.captions![0];
  assert.equal(effectiveCaptionStyle(layer,layer.cues[0]).shadow?.color,'#ff0000');assert.equal(effectiveCaptionStyle(layer,layer.cues[0]).shadow?.blur,20);assert.equal(effectiveCaptionStyle(layer,layer.cues[1]).shadow?.mode,'drop');
  const all=patchSelectionStyles(p,['cue','cue2'],{shadow:{opacity:25}}).captions![0];
  assert.equal(effectiveCaptionStyle(all,all.cues[0]).shadow?.blur,20);assert.equal(effectiveCaptionStyle(all,all.cues[1]).shadow?.opacity,25);assert.equal(effectiveCaptionStyle(all,all.cues[1]).shadow?.color,'#ff0000');
});

test('timeline transition ranges match rendered duration and disappear when the join breaks',()=>{
  const target={...other,duration:9,effects:{...defaultEffects,transition:'wipe' as const,transitionFrames:45}};
  const project={...p,clips:[clip,target]};
  const [marker]=timelineTransitions(project);
  assert.equal(marker.previous.id,clip.id);assert.equal(marker.clip.start,clip.start+clip.duration);
  assert.equal(marker.duration,9);assert.equal(marker.duration,transitionDuration(target));
  assert.equal(timelineTransitions({...project,clips:[clip,{...target,start:61}]}).length,0);
  assert.equal(timelineTransitions({...project,clips:[clip,{...target,effects:defaultEffects}]}).length,0);
  assert.equal(timelineTransitions({...project,clips:[{...clip,hidden:true},target]}).length,0);
});
