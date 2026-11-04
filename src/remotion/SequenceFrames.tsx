import React from 'react';
import {Img,getRemotionEnvironment} from 'remotion';

// Keep a bounded window of decoded images mounted. Changing the visible frame
// then reuses an already loaded image instead of starting a PNG request every tick.
export function SequenceFrames({url,count,sourceFrame,rate,style}:{url:string;count:number;sourceFrame:number;rate:number;style:React.CSSProperties}){
  const current=Math.min(count-1,Math.max(0,Math.floor(sourceFrame)));
  const frames=getRemotionEnvironment().isRendering?[current]:[...new Set(Array.from({length:15},(_,i)=>Math.min(count-1,Math.max(0,Math.floor(sourceFrame+(i-2)*rate)))))];
  return <>{frames.map(frame=><Img key={frame} pauseWhenLoading={frame===current} src={`${url}/frames/${frame}`} style={{...style,position:'absolute',inset:0,visibility:frame===current?style.visibility:'hidden'}}/>)}</>;
}
