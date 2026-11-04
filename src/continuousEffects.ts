import type {CSSProperties} from 'react';
import {clamp} from './model';
export const dynamicMotionOptions=[['none','None'],['pulse','Pulse'],['explode','Explode'],['shake','Shake'],['handheld','Handheld'],['flash','Flash'],['super-zoom','Super zoom'],['super-shake','Super shake'],['echo','Echo'],['tunnel','Tunnel']] as const;
export const styleOptions=[['none','None'],['disco','Color shift'],['flicker','Flicker'],['negative','Negative flash'],['soft-blur','Soft blur'],['detail','Details'],['sparkles','Sparkles'],['fisheye','Fisheye']] as const;
export type MotionTiming={rise:number;hold:number;return:number};
export type ContinuousEffects={motionTiming?:MotionTiming;motion?:typeof dynamicMotionOptions[number][0];motionIntensity?:number;motionFrames?:number;motionLoop?:boolean;style?:typeof styleOptions[number][0];styleIntensity?:number};
export const continuousDefaults={motion:'none',motionIntensity:50,motionFrames:30,motionLoop:false,style:'none',styleIntensity:50} as const;
export const supportsMotionTiming=(motion:ContinuousEffects['motion'])=>['pulse','explode','flash','super-zoom','echo','tunnel'].includes(motion??'none');
export function getMotionTiming(e:ContinuousEffects):MotionTiming{
  if(e.motionTiming)return e.motionTiming;
  const total=Math.max(2,Math.round(e.motionFrames??30)),rise=Math.max(1,Math.floor(total/2));
  return {rise,hold:0,return:total-rise};
}
export function withMotionTiming(e:ContinuousEffects,patch:Partial<MotionTiming>):ContinuousEffects{
  const timing={...getMotionTiming(e),...patch};
  timing.rise=clamp(Math.round(timing.rise),1,900);timing.hold=clamp(Math.round(timing.hold),0,900);timing.return=clamp(Math.round(timing.return),1,900);
  const frames=timing.rise+timing.hold+timing.return;
  return frames>900?resizeMotionTiming({...e,motionTiming:timing},900):{...e,motionTiming:timing,motionFrames:frames};
}
export function resizeMotionTiming(e:ContinuousEffects,frames:number):ContinuousEffects{
  const total=clamp(Math.round(frames),2,900);if(!e.motionTiming)return {...e,motionFrames:total};
  const timing=getMotionTiming(e),sum=timing.rise+timing.hold+timing.return;
  const hold=Math.min(total-2,Math.round(timing.hold/sum*total));
  const rise=clamp(Math.round(timing.rise/(timing.rise+timing.return)*(total-hold)),1,total-hold-1);
  return {...e,motionFrames:total,motionTiming:{rise,hold,return:total-hold-rise}};
}
export function motionPhase(e:ContinuousEffects,frame:number,duration:number){
  if(duration<=1)return 0;
  const timing=e.motionTiming&&supportsMotionTiming(e.motion)?e.motionTiming:undefined;
  const total=timing?timing.rise+timing.hold+timing.return:e.motionFrames??30;
  // Fit all phases together on short clips; always reach neutral at the last frame.
  const frames=Math.max(2,Math.min(total,duration)),local=e.motionLoop?Math.max(0,frame)%frames:Math.max(0,frame),p=clamp(local/(frames-1),0,1);
  if(!timing)return p; // Preserve the exact timing of existing projects.
  const elapsed=p*total;
  if(elapsed<timing.rise)return .5*elapsed/timing.rise;
  if(elapsed<=timing.rise+timing.hold)return .5;
  return .5+.5*clamp((elapsed-timing.rise-timing.hold)/timing.return,0,1);
}
export function dynamicMotionStyle(e:ContinuousEffects,frame:number,duration:number):CSSProperties{
  const p=motionPhase(e,frame,duration),envelope=Math.sin(Math.PI*p)**2,a=(e.motionIntensity??50)/100,w=Math.sin(p*Math.PI*10),j=Math.sin(p*Math.PI*17),pulse=Math.sin(p*Math.PI);
  switch(e.motion){
    case 'pulse':return {transform:`scale(${1+.24*a*pulse})`};
    case 'explode':return {transform:`scale(${1+.65*a*envelope}) rotate(${8*a*w*envelope}deg)`,filter:`blur(${5*a*envelope}px)`};
    case 'shake':return {transform:`translateX(${3*a*w*envelope}%) rotate(${2*a*j*envelope}deg)`};
    case 'handheld':return {transform:`translate(${1.4*a*w*envelope}%,${a*j*envelope}%) rotate(${1.5*a*j*envelope}deg) scale(${1+.04*a*envelope})`};
    case 'flash':return {filter:`brightness(${1+5*a*envelope})`};
    case 'super-zoom':return {transform:`scale(${1+1.7*a*envelope})`,filter:`blur(${2*a*envelope}px)`};
    case 'super-shake':return {transform:`translate(${6*a*w*envelope}%,${4*a*j*envelope}%) rotate(${6*a*w*envelope}deg) scale(${1+.12*a*envelope})`};
    case 'tunnel':return {transform:`scale(${1+.8*a*envelope})`};
    default:return {};
  }
}
export function visualStyle(e:ContinuousEffects,frame:number):CSSProperties{
 const a=(e.styleIntensity??50)/100,t=Math.max(0,frame)/30,w=(1-Math.cos(t*Math.PI*4))/2;
 switch(e.style){
  case 'disco':return {filter:`hue-rotate(${t*120*a}deg) saturate(${1+2*a})`};
  case 'flicker':return {filter:`brightness(${1-.65*a*w})`};
  case 'negative':return {filter:`invert(${a*Math.max(0,1-(t%2)*5)})`};
  case 'soft-blur':return {filter:`blur(${12*a}px)`};
  case 'detail':return {filter:`contrast(${1+.75*a}) saturate(${1+.25*a})`};
  default:return {};
 }
}
// Radial displacement: each pixel points away from the center, with zero shift
// at the frame edges. SVG filters apply it to the actual content, including text.
export function fisheyeMap(){const n=32,rects=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++){const nx=(x+.5)/n*2-1,ny=(y+.5)/n*2-1,r=Math.min(1,Math.hypot(nx,ny)),gain=(1-r*r);const red=Math.round(127.5+127.5*nx*gain),green=Math.round(127.5+127.5*ny*gain);rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${red},${green},128)"/>`);}return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}">${rects.join('')}</svg>`);}
