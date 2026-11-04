import {resolveShadow} from '../shadows';
import React,{useId} from 'react';
import {ContinuousLayer} from './ContinuousLayer';
import {effectStyle,maskStyle,type Effects,type TextShadow} from '../effects';
export function EffectLayer({effects,frame,duration,children,fill=false}:{effects?:Effects;frame:number;duration:number;children:React.ReactNode;fill?:boolean}){
  const layout:React.CSSProperties=fill?{position:'absolute',inset:0}:{};
  return <div style={{...layout,...effectStyle(effects,frame,duration)}}><div style={{...layout,...maskStyle(effects)}}><ContinuousLayer effects={effects} frame={frame} duration={duration} fill={fill}>{children}</ContinuousLayer></div></div>;
}
export function ShadowText({shadow,children}:{shadow?:Partial<TextShadow>;children:React.ReactNode}){
  const id='shadow-'+useId().replace(/[^a-zA-Z0-9_-]/g,''),drop=resolveShadow(shadow,'drop'),inner=resolveShadow(shadow,'inner');
  if(!drop.enabled&&!inner.enabled)return <>{children}</>;
  if(!inner.enabled)return <span style={{textShadow:`${drop.x}px ${drop.y}px ${drop.blur}px ${drop.color}${Math.round(drop.opacity/100*255).toString(16).padStart(2,'0')}`}}>{children}</span>;
  return <><svg width="0" height="0" aria-hidden="true" style={{position:'absolute'}}><defs><filter id={id} x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
    <feOffset in="SourceAlpha" dx={inner.x} dy={inner.y} result="innerOffset"/><feGaussianBlur in="innerOffset" stdDeviation={inner.blur/2} result="innerBlur"/><feComposite in="SourceAlpha" in2="innerBlur" operator="out" result="innerMask"/><feFlood floodColor={inner.color} floodOpacity={inner.opacity/100} result="innerColor"/><feComposite in="innerColor" in2="innerMask" operator="in" result="innerShadow"/><feComposite in="innerShadow" in2="SourceGraphic" operator="over" result="innerText"/>
    {drop.enabled&&<><feGaussianBlur in="SourceAlpha" stdDeviation={drop.blur/2} result="dropBlur"/><feOffset in="dropBlur" dx={drop.x} dy={drop.y} result="dropOffset"/><feFlood floodColor={drop.color} floodOpacity={drop.opacity/100} result="dropColor"/><feComposite in="dropColor" in2="dropOffset" operator="in" result="dropShadow"/><feMerge><feMergeNode in="dropShadow"/><feMergeNode in="innerText"/></feMerge></>}
  </filter></defs></svg><span style={{filter:`url(#${id})`}}>{children}</span></>;
}
