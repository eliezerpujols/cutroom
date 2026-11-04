import type {CSSProperties} from 'react';
import type {CaptionStyle} from './captions';

/** Word-local animation. Each spoken word starts its own short entrance. */
export function highlightAnimationStyle(motion:CaptionStyle['highlightMotion'],elapsed:number,duration:number):CSSProperties|undefined{
  if(!motion||motion==='none')return undefined;
  const progress=duration<=1?1:Math.max(0,Math.min(1,elapsed/Math.min(6,duration-1)));
  if(motion==='fade')return {opacity:progress};
  return {transform:`scale(${.9+.1*(1-(1-progress)**3)})`,transformOrigin:'50% 70%'};
}
