import React,{useEffect,useState} from 'react';
import {Button} from './ui/primitives';
import {AnimatedText} from './remotion/AnimatedText';
import {ContinuousLayer} from './remotion/ContinuousLayer';
import {defaultEffects,effectStyle,maskStyle,motionStyle,type Effects,type MotionKind} from './effects';
import {FPS} from './model';
import './effects.css';
type EffectTab='enter'|'exit'|'transition';

export function EffectTile({textPreview=false,preset,group,name,kind,mode='enter',thumbnail,previousThumbnail,mask,selected,disabled,choose,previewStyle}:{previewStyle?:(frame:number)=>React.CSSProperties;textPreview?:boolean;preset?:Partial<Effects>;group?:string;name:string;kind:MotionKind;mode?:EffectTab;thumbnail?:string;previousThumbnail?:string;mask?:Effects['mask'];selected:boolean;disabled?:boolean;choose:()=>void}){
  const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[frame,setFrame]=useState(mode==='exit'?35:10);
  useEffect(()=>{
    if(!(hovered||focused)||matchMedia('(prefers-reduced-motion: reduce)').matches){setFrame(mode==='exit'?35:10);return;}
    let request:number,start:number|undefined;
    const tick=(now:number)=>{start??=now;setFrame(Math.floor((now-start)/1000*FPS)%54);request=requestAnimationFrame(tick);};
    request=requestAnimationFrame(tick);return()=>cancelAnimationFrame(request);
  },[hovered,focused,mode]);
  const effects={...defaultEffects,enter:mode==='enter'?kind:'none',exit:mode==='exit'?kind:'none',enterFrames:24,exitFrames:24};
  const previewFrame=!(hovered||focused)&&preset?.style==='negative'?1:frame;
  const style=previewStyle?previewStyle(frame):mask?maskStyle({...defaultEffects,mask}):mode==='transition'?motionStyle(kind,Math.min(1,frame/24)):effectStyle(effects,Math.min(frame,47),48);
  const sample=(src?:string)=>textPreview?<span className={`effect-text-sample${preset?.textStyle&&preset.textStyle!=='none'||preset?.textAppearance&&preset.textAppearance!=='none'?' is-styled':''}`}><AnimatedText text={kind==='text-words'?'Hi there':'Hello'} effects={{...defaultEffects,...effects,...preset}} frame={Math.min(previewFrame,47)} duration={48}/></span>:src?<img src={src} alt="" loading="lazy" draggable={false}/>:<span className="effect-sample-fallback">Aa</span>;
  return <Button variant="ghost" className="effect-tile" aria-label={`${group??(mask?'Mask':mode==='enter'?'Entrance':mode==='exit'?'Exit':'Transition')}: ${name}`} aria-pressed={selected} disabled={disabled} onClick={choose} onPointerEnter={()=>setHovered(true)} onPointerLeave={()=>setHovered(false)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}><span className="effect-tile-image" aria-hidden="true">{mode==='transition'&&kind!=='none'&&<span className="effect-sample effect-sample-previous">{sample(previousThumbnail??thumbnail)}</span>}<span className="effect-sample" style={preset?undefined:style}>{preset?<ContinuousLayer effects={preset} frame={previewFrame} duration={54} fill>{sample(thumbnail)}</ContinuousLayer>:sample(thumbnail)}</span></span><span className="effect-tile-label">{name}</span></Button>;
}

