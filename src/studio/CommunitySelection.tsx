import React from 'react';
import {studioDefaults,type StudioInstance} from './registry';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-Math.pow(1-clamp(n),3);
const survivors=[[150,465],[902,490],[910,930],[135,870],[380,325],[710,325]];
const others=[[48,325],[285,270],[520,320],[755,250],[986,340],[40,595],[300,480],[545,520],[750,500],[1000,670],[65,1085],[350,1005],[750,1040],[995,1110],[300,765],[750,760],[90,1350],[960,1310]];
export function communityPose(frame:number,index:number,keep:number,crossAt:number,removeAt:number){
 const enter=ease((frame-index*1.15)/10),rejected=index>=keep,cross=clamp((frame-crossAt-(index-keep)*.8)/7),leave=rejected?ease((frame-removeAt-(index-keep)*.8)/11):0;
 return {opacity:enter*(1-leave),scale:(.48+.52*enter)*(1-.48*leave),y:70*(1-enter)+40*leave,cross:rejected?cross:0,selected:rejected?0:ease((frame-crossAt)/13)};
}
export function CommunitySelection({instance,frame}:{instance:StudioInstance;frame:number}){
 const p={...studioDefaults('community-selection'),...instance.props},keep=Math.round(Number(p.keep)),total=Math.max(keep,Math.round(Number(p.total))),accent=String(p.accent),ink=String(p.ink),crossColor=String(p.crossColor);
 const linked=ease((frame-Number(p.removeAt)-18)/18);
 return <svg viewBox="0 0 1080 1920" width="100%" height="100%" aria-label="Seguidores que se reducen a una comunidad cercana" style={{position:'absolute',inset:0,overflow:'hidden'}}>
  <g fill="none" stroke={accent} strokeWidth="4" opacity={linked*.8} strokeDasharray="1500" strokeDashoffset={1500*(1-linked)}>{keep>=4&&<><path d="M150 465 Q540 230 902 490"/><path d="M902 490 Q1060 670 910 930"/><path d="M910 930 Q540 1100 135 870"/></>}</g>
  {Array.from({length:total},(_,i)=>{const [x,y]=i<keep?survivors[i]:others[(i-keep)%others.length],v=communityPose(frame,i,keep,Number(p.crossAt),Number(p.removeAt)),r=i<keep?69:49;
   return <g key={i} opacity={v.opacity} transform={`translate(${x} ${y+v.y}) scale(${v.scale})`}>
    <circle r={r} fill={i<keep&&v.selected>.3?accent:ink} fillOpacity={i<keep?1:.92} stroke={accent} strokeOpacity={i<keep?1:.65} strokeWidth={i<keep?3:2}/>
    <g fill="none" stroke={i<keep&&v.selected>.3?ink:accent} strokeWidth="5" strokeLinecap="round"><circle cy="-13" r="13"/><path d="M-24 30v-9c0-17 48-17 48 0v9"/></g>
    {i>=keep&&<g fill="none" stroke={crossColor} strokeWidth="10" strokeLinecap="round" opacity={v.cross} strokeDasharray="105" strokeDashoffset={105*(1-v.cross)}><path d="M-34-34L34 34"/><path d="M34-34L-34 34"/></g>}
   </g>;
  })}
 </svg>;
}
