import React from 'react';
import {ChevronRight} from 'lucide-react';
import {commonStyleValue,StyleNumber} from './StyleControls';
import {getMotionTiming,type ContinuousEffects,type MotionTiming} from './continuousEffects';
import {FPS} from './model';
export function MotionTimingControls({values,scope,checkpoint,change}:{values:ContinuousEffects[];scope:string;checkpoint:()=>void;change:(patch:Partial<MotionTiming>)=>void}){
  const timings=values.map(getMotionTiming),rise=commonStyleValue(timings,'rise'),hold=commonStyleValue(timings,'hold'),back=commonStyleValue(timings,'return');
  const mixed=rise===undefined||hold===undefined||back===undefined,total=(rise??0)+(hold??0)+(back??0),up=4+192*(rise??0)/total,down=4+192*((rise??0)+(hold??0))/total;
  const curve=`M 4 34 C ${4+(up-4)/2} 34 ${4+(up-4)/2} 8 ${up} 8 L ${down} 8 C ${down+(196-down)/2} 8 ${down+(196-down)/2} 34 196 34`;
  return <details className="advanced effect-motion-timing"><summary><span>Timing</span><ChevronRight size={14}/></summary><div className="advanced-content effect-phase-fields">
    {mixed?<div className="motion-timing-mixed">Mixed timing</div>:<svg className="motion-timing-curve" viewBox="0 0 200 42" role="img" aria-label={`Rise ${(rise/FPS).toFixed(2)} seconds, hold ${(hold/FPS).toFixed(2)} seconds, return ${(back/FPS).toFixed(2)} seconds`}><path d={`${curve} L 196 38 L 4 38 Z`} className="motion-timing-fill"/><path d="M4 38H196" className="motion-timing-baseline"/><path d={curve} className="motion-timing-line"/>{hold>0&&<><path d={`M${up} 12V38 M${down} 12V38`} className="motion-timing-guides"/></>}</svg>}
    {([['rise','Rise'],['hold','Hold'],['return','Return']] as const).map(([field,label])=><StyleNumber key={scope+field} label={label} value={commonStyleValue(timings,field)} min={field==='hold'?0:1/FPS} max={Math.min(...timings.map(t=>900-(t.rise+t.hold+t.return-t[field])))/FPS} step={1/FPS} scale={1/FPS} unit="s" checkpoint={checkpoint} change={value=>change({[field]:Math.round(value)})}/>)}
  </div></details>;
}
