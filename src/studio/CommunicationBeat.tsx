import React from 'react';
import {Bell,VolumeX,MessageCircleQuestion,ShieldCheck,Play,Heart} from 'lucide-react';
import {studioDefaults,type StudioInstance} from './registry';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function communicationPose(frame:number){const enter=1-Math.pow(1-clamp(frame/10),3);return {opacity:enter,y:(1-enter)*50,scale:.8+.2*enter,draw:clamp((frame-5)/17)};}
export function CommunicationBeat({instance,frame}:{instance:StudioInstance;frame:number}){
 const p={...studioDefaults('communication-beat'),...instance.props},v=communicationPose(frame),kind=String(p.kind),accent=String(p.accent),ink=String(p.ink),Icon=kind==='aviso'?Bell:kind==='silencio'?VolumeX:kind==='confianza'?ShieldCheck:kind==='videos'?Play:MessageCircleQuestion;
 return <svg viewBox="0 0 800 560" width="100%" height="100%" style={{position:'absolute',inset:0,overflow:'visible'}} aria-label="Recurso visual de conversación"><g opacity={v.opacity} transform={`translate(400 ${280+v.y}) scale(${v.scale}) translate(-400 -280)`}>
  <circle cx="400" cy="280" r="172" fill={ink} fillOpacity=".9" stroke={accent} strokeWidth="3"/>
  {kind==='videos'&&<><rect x="245" y="133" width="310" height="250" rx="32" fill="none" stroke={accent} strokeOpacity=".3" strokeWidth="4" transform="rotate(-8 400 280)"/><rect x="230" y="148" width="340" height="264" rx="32" fill={ink} stroke={accent} strokeWidth="4"/></>}
  <Icon x="287" y="167" width="226" height="226" stroke={accent} strokeWidth={1.7} fill="none" style={{strokeDasharray:900,strokeDashoffset:900*(1-v.draw)}}/>
  {kind==='aviso'&&Array.from({length:3},(_,i)=>{const q=clamp((frame-15-i*8)/12);return <circle key={i} cx={580+i*42} cy={160-i*34} r={12+i*3} fill={accent} opacity={q}/>;})}
  {kind==='pregunta'&&<MessageCircleQuestion x="95" y="55" width="145" height="145" stroke={accent} strokeWidth="1.6" opacity={clamp((frame-13)/14)}/>}
  {kind==='confianza'&&<path d="M595 365l25 25 55-70" fill="none" stroke={accent} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="120" strokeDashoffset={120*(1-clamp((frame-18)/15))}/>}
  {kind==='silencio'&&Array.from({length:3},(_,i)=>{const q=(frame/40+i/3)%1;return <path key={i} d={`M${575+i*36} ${180-i*25}q100 100 0 ${200+i*50}`} fill="none" stroke={accent} strokeWidth="5" opacity={(1-q)*.32}/>;})}
  {kind==='videos'&&<Heart x="565" y="340" width="110" height="110" fill={accent} stroke={accent} opacity={clamp((frame-24)/15)} transform={`rotate(${-10+5*Math.sin(frame/15)} 620 395)`}/>}
 </g></svg>;
}
