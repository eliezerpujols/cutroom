import {previousTitle} from '../textTransitions';
import {TextTransition} from './TextTransition';
import {defaultEffects} from '../effects';
import type {VideoText} from '../videoText';
import {AnimatedText} from './AnimatedText';
import React from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import type {Project} from '../model';
import {visibleVideoText} from '../videoText';
import {EffectLayer} from './Effects';
import {CoverTextContent,coverTextPosition} from './Visuals';

function Title({text,frame}:{text:VideoText;frame:number}){return <div style={coverTextPosition(text)}><EffectLayer effects={text.effects} frame={frame} duration={text.duration}><CoverTextContent text={text}><AnimatedText text={text.text} effects={text.effects} frame={frame} duration={text.duration}/></CoverTextContent></EffectLayer></div>;}
export function VideoTextOverlay({project,textId}:{project:Project;textId?:string}){
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{pointerEvents:'none',overflow:'hidden'}}>{visibleVideoText(project,frame).filter(text=>!textId||text.id===textId).reverse().map(text=>{
    const previous=previousTitle(project,text),outgoing=previous?{...previous,effects:{...defaultEffects,...previous.effects,enter:'none' as const,exit:'none' as const,transition:'none' as const}}:undefined;
    return <TextTransition key={text.id} effects={text.effects} frame={frame-text.start} duration={text.duration} previous={outgoing?<Title text={outgoing} frame={outgoing.duration-1}/>:undefined}><Title text={text} frame={frame-text.start}/></TextTransition>;
  })}</AbsoluteFill>;
}
