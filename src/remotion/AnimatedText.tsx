import React from 'react';
import {defaultEffects,effectEdges,type Effects} from '../effects';
import {motionPhase} from '../continuousEffects';
import {connectedScript,graphemes,isTextAnimation,textAnimationStyle,textMotionStyle,textPaint,textParts} from '../textEffects';
export function AnimatedText({text,effects,frame,duration,wordColors,wordStyles}:{text:string;effects?:Effects;frame:number;duration:number;wordColors?:Array<string|undefined>;wordStyles?:Array<React.CSSProperties|undefined>}){
  const e={...defaultEffects,...effects},enter=isTextAnimation(e.enter),exit=isTextAnimation(e.exit),custom=enter||exit||e.textMotion&&e.textMotion!=='none'||e.textStyle&&e.textStyle!=='none'||e.textAppearance&&e.textAppearance!=='none';
  const parts=textParts(text);
  if(!custom){let wordIndex=0;return <>{wordColors||wordStyles?parts.map((part,index)=>{
    if(/^\s+$/u.test(part))return <React.Fragment key={index}>{part}</React.Fragment>;
    const i=wordIndex++,style=wordStyles?.[i];return <span key={index} style={{color:wordColors?.[i],...(style?{display:'inline-block',maxWidth:'100%',...style}:{})}}>{part}</span>;
  }):text}</>;}

  const wholeWords=e.textUnit==='word'||e.enter==='text-words'||e.exit==='text-words'||connectedScript(text);
  const count=parts.filter(part=>!/^\s+$/u.test(part)).reduce((n,part)=>n+(wholeWords?1:graphemes(part).length),0),edges=effectEdges(e,duration);
  const inProgress=edges.enter?Math.min(1,Math.max(0,frame/edges.enter)):1,outProgress=edges.exit?Math.min(1,Math.max(0,(duration-1-frame)/edges.exit)):1;
  const phase=motionPhase({motionFrames:e.motionFrames,motionLoop:e.motionLoop},frame,duration);
  let index=0,wordIndex=0;
  return <span role="img" aria-label={text}>{parts.map((part,partIndex)=>{
    if(/^\s+$/u.test(part))return <React.Fragment key={partIndex}>{part}</React.Fragment>;
    const currentWord=wordIndex++,wordStyle=wordStyles?.[currentWord],color=wordColors?.[currentWord],units=wholeWords?[part]:graphemes(part);
    return <span key={partIndex} aria-hidden="true" style={{display:'inline-block',maxWidth:'100%',whiteSpace:'normal',...wordStyle}}>{units.map(unit=>{
      const i=index++,incoming=enter?textAnimationStyle(e.enter as Parameters<typeof textAnimationStyle>[0],inProgress,i,count,e.textStagger):{},outgoing=exit?textAnimationStyle(e.exit as Parameters<typeof textAnimationStyle>[0],outProgress,i,count,e.textStagger):{},motion=textMotionStyle(e.textMotion,phase,i,e.motionIntensity??50,!!e.motionLoop);
      const style:React.CSSProperties={display:'inline-block',transformOrigin:'50% 70%',...textPaint(e,i,frame,e.styleIntensity),...(color?{color,WebkitTextFillColor:color}:{}),opacity:Number(incoming.opacity??1)*Number(outgoing.opacity??1)*Number(motion.opacity??1),transform:[incoming.transform,outgoing.transform,motion.transform].filter(Boolean).join(' ')||undefined,filter:[incoming.filter,outgoing.filter].filter(Boolean).join(' ')||undefined};
      return <span key={i} style={style}>{unit}</span>;
    })}</span>;
  })}</span>;
}
