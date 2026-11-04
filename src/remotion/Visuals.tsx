import {ShadowText} from './Effects';
import React,{useId} from 'react';
import {AbsoluteFill} from 'remotion';
import '@fontsource-variable/inter/wght-italic.css';
import '@fontsource-variable/dm-sans/wght-italic.css';
import {adjustmentFilter,colorMatrix,textLineHeight,type Cover,type CoverText,type VisualAdjustments} from '../visuals';

export function VisualLayer({adjustments,children}:{adjustments?:VisualAdjustments;children:React.ReactNode}){
  const id='color-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
  return <AbsoluteFill><svg width="0" height="0" aria-hidden="true" style={{position:'absolute'}}><defs><filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%"><feColorMatrix type="matrix" values={colorMatrix(adjustments)}/></filter></defs></svg><AbsoluteFill style={{filter:`${adjustmentFilter(adjustments)} url(#${id})`}}>{children}</AbsoluteFill></AbsoluteFill>;
}

export function coverTextPosition(text:CoverText):React.CSSProperties{return {position:'absolute',left:`${text.x}%`,top:`${text.y}%`,width:`${text.width}%`,transform:'translate(-50%, -50%)',textAlign:text.align};}
export function CoverTextContent({text,children}:{text:CoverText;children?:React.ReactNode}){
  const stroke=text.stroke?text.strokeWidth:0;
  const typography:React.CSSProperties={fontFamily:`'${text.fontFamily}', sans-serif`,fontSize:text.fontSize,fontWeight:text.fontWeight,fontStyle:text.italic?'italic':'normal',fontSynthesis:'style',lineHeight:textLineHeight(text),letterSpacing:`${text.letterSpacing??-.02}em`,color:text.color,WebkitTextStroke:`${stroke}px ${text.strokeColor}`,paintOrder:'stroke fill',overflowWrap:'anywhere',whiteSpace:'pre-wrap'};
  const content=<ShadowText shadow={text.shadow}>{children??text.text}</ShadowText>;
  return <div style={{...typography,padding:text.fill==='box'?text.padding:0,background:text.fill==='box'?text.fillColor:undefined,borderRadius:text.fill==='box'?text.radius:0}}>{text.fill==='lines'?<span style={{background:text.fillColor,padding:`${text.padding*.2}px ${text.padding}px`,borderRadius:text.radius,boxDecorationBreak:'clone',WebkitBoxDecorationBreak:'clone'}}>{content}</span>:content}</div>;
}
export function CoverOverlay({cover}:{cover:Cover}){return <AbsoluteFill style={{pointerEvents:'none',overflow:'hidden'}}>{cover.texts.filter(text=>!text.hidden).map(text=><div key={text.id} style={coverTextPosition(text)}><CoverTextContent text={text}/></div>)}</AbsoluteFill>;}
