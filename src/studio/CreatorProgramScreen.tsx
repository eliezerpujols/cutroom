import React from 'react';
import {Img,getRemotionEnvironment,staticFile} from 'remotion';
import {studioDefaults,type StudioInstance} from './registry';
export const creatorProgramScreens=['inicio','editor','oferta'] as const;
export function creatorProgramScreenFile(value:string){const screen=creatorProgramScreens.includes(value as typeof creatorProgramScreens[number])?value:'inicio';return `/studio/creator-program/${screen}-es.jpg`;}
export function CreatorProgramScreen({instance,frame,libraryPreview=false}:{instance:StudioInstance;frame:number;libraryPreview?:boolean}){
 const p={...studioDefaults('creator-program-screen'),...instance.props},file=creatorProgramScreenFile(String(p.screen)),src=!libraryPreview&&getRemotionEnvironment().isRendering?staticFile(file.slice(1)):file,Image=libraryPreview?'img':Img;
 const n=Number(p.revealFrames),t=n?Math.max(0,Math.min(1,frame/n)):1,e=1-Math.pow(1-t,3),tap=Number(p.tapAt),q=tap<0?0:Math.max(0,Math.min(1,(frame-tap)/18)),ring=tap>=0&&frame>=tap&&q<1;
 return <div style={{position:'absolute',inset:0,perspective:1400,containerType:'inline-size'}}><div style={{position:'absolute',inset:'2.5% 3%',opacity:e,transform:`translateY(${(1-e)*14}%) rotateY(${Number(p.tilt)*(1-e)}deg) scale(${.92+.08*e})`,border:'3px solid #111c2c',borderRadius:'3cqw',overflow:'hidden',background:'#fff',boxShadow:'-12px 20px 35px #0b213d35'}}>
  <Image src={src} alt="Pantalla real de Creator Program en español" style={{width:'100%',height:'100%',objectFit:'fill',display:'block'}}/>
  {ring&&<div style={{position:'absolute',width:'12%',aspectRatio:1,left:'44%',top:'86%',border:`4px solid ${p.accent}`,borderRadius:'50%',opacity:1-q,transform:`scale(${.5+q})`}}/>}
 </div></div>;
}
