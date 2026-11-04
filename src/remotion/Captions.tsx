import {highlightAnimationStyle} from '../highlightAnimation';
import {previousCaption} from '../textTransitions';
import {TextTransition} from './TextTransition';
import {defaultEffects} from '../effects';
import {AnimatedText} from './AnimatedText';
import {EffectLayer,ShadowText} from './Effects';
import React from 'react';
import {AbsoluteFill,useCurrentFrame,useVideoConfig} from 'remotion';
import '@fontsource-variable/inter';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import {activeCaptionCue,captionWindow,effectiveCaptionStyle,type CaptionLayer} from '../captions';

export function CaptionOverlay({layers,hiddenCueIds=[]}:{layers:CaptionLayer[];hiddenCueIds?:string[]}){
  const frame=useCurrentFrame(),{width,height}=useVideoConfig(),scale=Math.min(width,height)/1080;
  return <AbsoluteFill style={{pointerEvents:'none'}}>{layers.filter(layer=>!layer.muted).map(layer=>{
    const cue=activeCaptionCue(layer,frame);if(!cue?.words.length||hiddenCueIds.includes(cue.id))return null;
    const renderCue=(cue:import('../captions').CaptionCue,frame:number)=>{
    const style=effectiveCaptionStyle(layer,cue),{local,active,start,words}=captionWindow(cue,style,frame);
    const elapsed=Math.max(0,local-(style.display==='sentence'?0:words[0].start)),span=style.display==='sentence'?cue.duration:words.at(-1)!.end-words[0].start,progress=span<=1?1:Math.min(1,elapsed/Math.max(1,Math.min(4,span-1)));
    const opacity=style.motion==='fade'?progress:1,pop=style.motion==='pop'?.9+.1*(1-(1-progress)**3):1;
    return <div key={layer.id} style={{position:'absolute',top:`${style.y}%`,left:`${style.x??50}%`,width:`${style.width??88}%`,transform:`translate(-50%,-50%) scale(${pop})`,opacity,textAlign:style.align??'center',fontFamily:`"${style.fontFamily}", sans-serif`,fontSize:style.fontSize*scale,fontWeight:style.fontWeight,lineHeight:style.lineHeight??1.2,letterSpacing:`${style.letterSpacing??0}em`,color:style.color,WebkitTextStroke:style.stroke?`${style.strokeWidth*scale}px ${style.strokeColor}`:undefined,paintOrder:'stroke fill',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}><EffectLayer effects={cue.effects} frame={frame-cue.start} duration={cue.duration}><ShadowText shadow={style.shadow}><AnimatedText text={words.map(word=>word.text).join(' ')} effects={cue.effects} frame={elapsed} duration={style.display==='sentence'?cue.duration:(cue.words[start+words.length]?.start??cue.duration)-words[0].start} wordColors={words.map((_,index)=>style.highlight&&start+index===active?style.highlightColor:undefined)} wordStyles={words.map((word,index)=>style.highlight&&start+index===active?highlightAnimationStyle(style.highlightMotion,local-word.start,word.end-word.start):undefined)}/></ShadowText></EffectLayer></div>;};
    const previous=previousCaption(layer,cue),outgoing=previous?{...previous,effects:{...defaultEffects,...previous.effects,enter:'none' as const,exit:'none' as const,transition:'none' as const}}:undefined;
    return <TextTransition key={layer.id} effects={cue.effects} frame={frame-cue.start} duration={cue.duration} previous={outgoing&&!hiddenCueIds.includes(outgoing.id)?renderCue(outgoing,outgoing.start+outgoing.duration-1):undefined}>{renderCue(cue,frame)}</TextTransition>;
  })}</AbsoluteFill>;
}
