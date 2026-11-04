import React from 'react';
import {StudioElement} from '../studio/StudioElement';
import {Audio as PreviewAudio} from '@remotion/media';
import {AbsoluteFill,Html5Video,Html5Audio,OffthreadVideo,Img,getRemotionEnvironment,useCurrentFrame,useVideoConfig} from 'remotion';
import {gainAt,type Asset,type Clip} from '../model';
import {overlayHeight} from '../overlays';
import {EffectLayer} from './Effects';
import {VisualLayer} from './Visuals';
export function MediaClip({clip,asset,muted}:{clip:Clip;asset:Asset;muted:boolean}){
  const frame=useCurrentFrame(),{width,height}=useVideoConfig();
  if(clip.studio&&clip.hidden)return null;
  const volume=muted?0:gainAt(clip,frame);
  const props={src:asset.url,trimBefore:Math.round(clip.sourceIn),playbackRate:clip.rate,volume,muted:muted||clip.muted,useWebAudioApi:true,pauseWhenBuffering:true};
  if(clip.kind==='audio'){
    // Preview voices and effects share Remotion's scheduled Web Audio clock.
    // Keep the established server-rendering path for exported audio.
    if(getRemotionEnvironment().isRendering)return <Html5Audio {...props}/>;
    return <PreviewAudio src={props.src} trimBefore={props.trimBefore} playbackRate={props.playbackRate} preservePitch volume={volume} muted={props.muted} fallbackHtml5AudioProps={{useWebAudioApi:true,pauseWhenBuffering:false}}/>;
  }
  const Video=getRemotionEnvironment().isRendering?OffthreadVideo:Html5Video;
  const content=<EffectLayer effects={clip.effects} frame={frame} duration={clip.duration} fill><VisualLayer adjustments={clip.adjustments}>{clip.studio?<StudioElement instance={clip.studio} frame={clip.sourceIn+frame*clip.rate}/>:asset.kind==='image'?<Img src={asset.url} style={{width:'100%',height:'100%',objectFit:'contain',visibility:clip.hidden?'hidden':undefined}}/>:<Video {...props} style={{width:'100%',height:'100%',objectFit:'contain',visibility:clip.hidden?'hidden':undefined}}/>}</VisualLayer></EffectLayer>;
  if(!clip.overlay)return content;
  return <AbsoluteFill><div style={{position:'absolute',left:`${clip.overlay.x}%`,top:`${clip.overlay.y}%`,width:`${clip.overlay.width}%`,height:`${overlayHeight({width,height},asset,clip.overlay.width)}%`,transform:'translate(-50%,-50%)'}}>{content}</div></AbsoluteFill>;
}
