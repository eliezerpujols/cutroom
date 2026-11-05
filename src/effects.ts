import {mergeTextShadows,type TextShadow} from './shadows';
import {textAnimationOptions,type TextEffects} from './textEffects';
import {continuousDefaults,type ContinuousEffects} from './continuousEffects';
import type {CSSProperties} from 'react';
import {clamp,type Clip,type Project} from './model';
export const motionOptions=[['none','None'],['fade','Fade'],['slide-left','Slide left'],['slide-right','Slide right'],['slide-up','Slide up'],['slide-down','Slide down'],['zoom-in','Zoom in'],['zoom-out','Zoom out'],['blur','Blur'],['wipe','Wipe']] as const;
export type MotionKind=typeof motionOptions[number][0]|typeof textAnimationOptions[number][0];
export type Effects=ContinuousEffects&TextEffects&{enter:MotionKind;exit:MotionKind;enterFrames:number;exitFrames:number;blur:number;mask:'none'|'circle'|'rounded';transition:'none'|'fade'|'slide-left'|'wipe';transitionFrames:number};
export const defaultEffects:Effects={...continuousDefaults,enter:'none',exit:'none',enterFrames:12,exitFrames:12,blur:0,mask:'none',transition:'none',transitionFrames:12};
export {defaultShadow,type TextShadow} from './shadows';
export function motionStyle(kind:MotionKind,visibility:number,exit=false):CSSProperties{
  const p=clamp(visibility,0,1),distance=(1-p)**3,sign=exit?-1:1;
  switch(kind){
    case 'fade':return {opacity:p};
    case 'slide-left':return {transform:`translateX(${distance*100*sign}%)`};
    case 'slide-right':return {transform:`translateX(${-distance*100*sign}%)`};
    case 'slide-up':return {transform:`translateY(${distance*100*sign}%)`};
    case 'slide-down':return {transform:`translateY(${-distance*100*sign}%)`};
    case 'zoom-in':return {transform:`scale(${1-distance*.35})`,opacity:p};
    case 'zoom-out':return {transform:`scale(${1+distance*.35})`,opacity:p};
    case 'blur':return {filter:`blur(${distance*24}px)`,opacity:p};
    case 'wipe':return {clipPath:`inset(0 ${(1-p)*100}% 0 0)`};
    default:return {};
  }
}
// Scale both edges together on short items so their animations never overlap.
export function effectEdges(effects:Effects,duration:number){
  const enter=effects.enter==='none'?0:effects.enterFrames,exit=effects.exit==='none'?0:effects.exitFrames,scale=Math.min(1,Math.max(0,duration-1)/Math.max(1,enter+exit));
  return {enter:enter*scale,exit:exit*scale};
}
export function effectStyle(input:Effects|undefined,frame:number,duration:number):CSSProperties{
  if(!input)return {};
  const effects={...defaultEffects,...input},{enter,exit}=effectEdges(effects,duration);
  const incoming=enter>0&&frame<enter?motionStyle(effects.enter,frame/enter):{};
  const outgoing=exit>0&&frame>duration-1-exit?motionStyle(effects.exit,(duration-1-frame)/exit,true):{};
  return {...incoming,...outgoing,filter:[effects.blur?`blur(${effects.blur}px)`:'',incoming.filter,outgoing.filter].filter(Boolean).join(' ')||undefined};
}
export function maskStyle(input?:Effects):CSSProperties{return input?.mask==='circle'?{clipPath:'ellipse(50% 50% at 50% 50%)'}:input?.mask==='rounded'?{clipPath:'inset(0 round 8%)'}:{};}
export function patchSelectionEffects(project:Project,ids:readonly string[],patch:Partial<Effects>):Project{
  const selected=new Set(ids),update=<T extends {effects?:Effects}>(item:T):T=>({...item,effects:{...defaultEffects,...item.effects,...patch}});
  return {...project,...(project.cover?{cover:{...project.cover,texts:project.cover.texts.map(text=>selected.has(text.id)?update(text):text)}}:{}),clips:project.clips.map(clip=>selected.has(clip.id)&&clip.kind==='video'?update(clip):clip),texts:project.texts?.map(text=>selected.has(text.id)?update(text):text),captions:project.captions?.map(layer=>({...layer,cues:layer.cues.map(cue=>selected.has(cue.id)?update(cue):cue)}))};
}
export function selectedEffectItems(project:Project,ids:readonly string[]){const selected=new Set(ids);return [...project.clips.filter(clip=>clip.kind==='video'),...(project.texts??[]),...(project.cover?.texts??[]),...(project.captions??[]).flatMap(layer=>layer.cues)].filter(item=>selected.has(item.id));}
export function transitionPrevious(project:Project,clip:Clip):Clip|undefined{
  if(clip.kind!=='video'||clip.overlay||clip.hidden||!clip.effects||clip.effects.transition==='none')return;
  return project.clips.find(previous=>previous.id!==clip.id&&previous.kind==='video'&&!previous.overlay&&!previous.hidden&&previous.trackId===clip.trackId&&previous.start+previous.duration===clip.start);
}

export function mergeShadow<T extends {shadow?:Partial<TextShadow>}>(value:T,patch:Partial<T>):T{
  return {...value,...patch,...(patch.shadow?{shadow:mergeTextShadows(value.shadow,patch.shadow)}:{})};
}

export function transitionDuration(clip:Clip){return Math.min(clip.effects?.transitionFrames??defaultEffects.transitionFrames,clip.duration);}
export function timelineTransitions(project:Project){
  return project.clips.flatMap(clip=>{const previous=transitionPrevious(project,clip);return previous?[{clip,previous,duration:transitionDuration(clip)}]:[];});
}

// Map individual settings rather than replacing the other selected items' phases.
export function mapSelectionMotion(project:Project,ids:readonly string[],update:(effects:Effects)=>Effects):Project{
  const selected=new Set(ids),map=<T extends {id:string;effects?:Effects}>(item:T):T=>selected.has(item.id)?{...item,effects:update({...defaultEffects,...item.effects})}:item;
  return {...project,clips:project.clips.map(clip=>clip.kind==='video'?map(clip):clip),texts:project.texts?.map(map),captions:project.captions?.map(layer=>({...layer,cues:layer.cues.map(map)}))};
}
