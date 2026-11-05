import type {CSSProperties} from 'react';
import type {Clip,Project} from './model';
export type Crop={left:number;top:number;right:number;bottom:number};
export type VisualTransform={rotation?:number;flipX?:boolean;flipY?:boolean;crop?:Crop;faceTrack?:{frame:number;x:number;y:number}[]};
export const noCrop:Crop={left:0,top:0,right:0,bottom:0};
export function patchTransform(project:Project,ids:readonly string[],patch:Partial<VisualTransform>):Project{
 return {...project,clips:project.clips.map(c=>ids.includes(c.id)&&c.kind==='video'?{...c,transform:{...c.transform,...patch}}:c)};
}
export function patchSelectedCrop(project:Project,ids:readonly string[],patch:Partial<Crop>):Project{
 return {...project,clips:project.clips.map(c=>ids.includes(c.id)&&c.kind==='video'?{
  ...c,transform:{...c.transform,crop:{...(c.transform?.crop??noCrop),...patch}},
 }:c)};
}
export function mediaTransformStyle(value:VisualTransform|undefined):CSSProperties{return {transform:`rotate(${value?.rotation??0}deg) scale(${value?.flipX?-1:1},${value?.flipY?-1:1})`,transformOrigin:'center'};}
export function trackedPosition(clip:Clip,frame:number){const keys=clip.transform?.faceTrack;frame=clip.sourceIn+frame*clip.rate;if(!keys?.length)return {x:50,y:50};let a=keys[0],b=a;for(const key of keys){if(key.frame<=frame)a=key;else{b=key;break;}b=a;}const p=b.frame===a.frame?0:(frame-a.frame)/(b.frame-a.frame);return {x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p};}
export function cropStyle(crop:Crop=noCrop):CSSProperties{const w=(100-crop.left-crop.right)/100,h=(100-crop.top-crop.bottom)/100;return {position:'absolute',width:`${100/w}%`,height:`${100/h}%`,left:`${-crop.left/w}%`,top:`${-crop.top/h}%`};}

export function faceCameraStyle(source:{width:number;height:number},view:{width:number;height:number},center:{x:number;y:number}):CSSProperties{
 const scale=Math.max(view.width/source.width,view.height/source.height)*1.2,w=source.width*scale,h=source.height*scale;
 const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
 return {position:'absolute',width:w,height:h,left:clamp(view.width/2-w*center.x/100,view.width-w,0),top:clamp(view.height/2-h*center.y/100,view.height-h,0),objectFit:'fill'};
}

export function cropGeometry(source:{width:number;height:number},view:{width:number;height:number},crop:Crop=noCrop){
 const fit=Math.min(view.width/source.width,view.height/source.height),w=source.width*fit,h=source.height*fit,cw=w*(100-crop.left-crop.right)/100,ch=h*(100-crop.top-crop.bottom)/100;
 return {viewport:{position:'absolute',overflow:'hidden',width:cw,height:ch,left:(view.width-cw)/2,top:(view.height-ch)/2} as CSSProperties,source:{position:'absolute',width:w,height:h,left:-w*crop.left/100,top:-h*crop.top/100} as CSSProperties};
}
