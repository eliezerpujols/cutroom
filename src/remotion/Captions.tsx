import React from 'react';
import {AbsoluteFill,useCurrentFrame,useVideoConfig} from 'remotion';
import '@fontsource-variable/inter';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import type {CaptionLayer} from '../captions';

export function CaptionOverlay({layers}:{layers:CaptionLayer[]}){
  const frame=useCurrentFrame(),{width,height}=useVideoConfig(),scale=Math.min(width,height)/1080;
  return <AbsoluteFill style={{pointerEvents:'none'}}>{layers.filter(layer=>!layer.muted).map(layer=>{
    let cue:CaptionLayer['cues'][number]|undefined;for(const candidate of layer.cues)if(frame>=candidate.start&&frame<candidate.start+candidate.duration)cue=candidate;if(!cue?.words.length)return null;
    const local=frame-cue.start,style=layer.style;
    let active=0;for(let index=0;index<cue.words.length;index++)if(cue.words[index].start<=local)active=index;
    const start=style.display==='word'?active:style.display==='phrase'?Math.floor(active/6)*6:0;
    const words=style.display==='word'?cue.words.slice(start,start+1):style.display==='phrase'?cue.words.slice(start,start+6):cue.words;
    const elapsed=Math.max(0,local-(style.display==='sentence'?0:words[0].start)),span=style.display==='sentence'?cue.duration:words.at(-1)!.end-words[0].start,progress=span<=1?1:Math.min(1,elapsed/Math.max(1,Math.min(4,span-1)));
    const opacity=style.motion==='fade'?progress:1,pop=style.motion==='pop'?.9+.1*(1-(1-progress)**3):1;
    return <div key={layer.id} style={{position:'absolute',top:`${style.y}%`,left:'6%',right:'6%',transform:`translateY(-50%) scale(${pop})`,opacity,textAlign:'center',fontFamily:`"${style.fontFamily}", sans-serif`,fontSize:style.fontSize*scale,fontWeight:style.fontWeight,lineHeight:1.2,color:style.color,WebkitTextStroke:style.stroke?`${style.strokeWidth*scale}px ${style.strokeColor}`:undefined,paintOrder:'stroke fill',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{words.map((word,index)=><React.Fragment key={start+index}>{index>0?' ':''}<span style={{color:style.highlight&&start+index===active?style.highlightColor:style.color}}>{word.text}</span></React.Fragment>)}</div>;
  })}</AbsoluteFill>;
}
