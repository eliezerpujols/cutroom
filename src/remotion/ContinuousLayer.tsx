import React,{useId} from 'react';
import {dynamicMotionStyle,visualStyle,motionPhase,fisheyeMap,type ContinuousEffects} from '../continuousEffects';
const displacement=fisheyeMap();
export function ContinuousLayer({effects={},frame,duration,children,fill=false}:{effects?:ContinuousEffects;frame:number;duration:number;children:React.ReactNode;fill?:boolean}){
  const id='fx'+useId().replace(/[^a-zA-Z0-9]/g,''),layout:React.CSSProperties=fill?{position:'absolute',inset:0}:{position:'relative'},a=(effects.motionIntensity??50)/100,envelope=Math.sin(motionPhase(effects,frame,duration)*Math.PI)**2,echo=effects.motion==='echo'&&envelope>0,fish=effects.style==='fisheye';
  return <div style={{...layout,...dynamicMotionStyle(effects,frame,duration)}}>
    {(echo||fish)&&<svg aria-hidden="true" width="0" height="0" style={{position:'absolute'}}><defs>
      {echo&&<filter id={id+'echo'} primitiveUnits="objectBoundingBox" x="-50%" y="-50%" width="200%" height="200%"><feOffset in="SourceGraphic" dx={.07*a*envelope} dy="0" result="a"/><feComponentTransfer in="a" result="ghost"><feFuncA type="linear" slope={.3*envelope}/></feComponentTransfer><feOffset in="ghost" dx={.07*a*envelope} result="ghost2"/><feMerge><feMergeNode in="ghost2"/><feMergeNode in="ghost"/><feMergeNode in="SourceGraphic"/></feMerge></filter>}
      {fish&&<filter id={id+'fish'} primitiveUnits="objectBoundingBox" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB"><feImage href={displacement} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="rawMap"/><feGaussianBlur in="rawMap" stdDeviation="0.025" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale={-.7*(effects.styleIntensity??50)/100} xChannelSelector="R" yChannelSelector="G"/></filter>}
    </defs></svg>}
    <div style={{...layout,filter:echo?`url(#${id}echo)`:undefined}}><div style={{...layout,...visualStyle(effects,frame)}}><div style={{...layout,filter:fish?`url(#${id}fish)`:undefined}}>{children}</div>
      {effects.style==='sparkles'&&<div aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>{Array.from({length:12},(_,i)=>{const glow=Math.max(0,Math.sin(frame/30*3+i*2.4))**8;return <span key={i} style={{position:'absolute',left:`${(i*37+11)%94}%`,top:`${(i*53+17)%90}%`,color:'#fff8d4',fontSize:18+(i%3)*8,opacity:glow*(effects.styleIntensity??50)/100,transform:`scale(${.4+glow})`,textShadow:'0 0 8px #fff'}}>✦</span>;})}</div>}
      {effects.motion==='tunnel'&&<div aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',background:`radial-gradient(ellipse,transparent 20%,rgba(0,0,0,${.85*a*envelope}) 85%)`}}/>}
    </div></div>
  </div>;
}
