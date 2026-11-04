import React from 'react';
import {motionStyle,type Effects} from '../effects';
export function textTransitionFrames(effects:Effects|undefined,duration:number){return effects?.transition&&effects.transition!=='none'?Math.max(1,Math.min(effects.transitionFrames,duration)):0;}
export function TextTransition({effects,frame,duration,previous,children}:{effects?:Effects;frame:number;duration:number;previous?:React.ReactNode;children:React.ReactNode}){
  const span=textTransitionFrames(effects,duration);
  if(!previous||span<2||frame<0||frame>=span)return <>{children}</>;
  const p=frame/(span-1);
  return <><div style={{position:'absolute',inset:0,opacity:1-p,pointerEvents:'none'}}>{previous}</div><div style={{position:'absolute',inset:0,...motionStyle(effects!.transition,p)}}>{children}</div></>;
}
