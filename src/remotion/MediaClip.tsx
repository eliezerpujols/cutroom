import {cropGeometry,cropStyle,mediaTransformStyle,trackedPosition,noCrop,faceCameraStyle} from '../transforms';
import React from 'react';
import {StudioElement} from '../studio/StudioElement';
import {Audio as PreviewAudio} from '@remotion/media';
import {AbsoluteFill,Html5Audio,Html5Video,OffthreadVideo,Img,getRemotionEnvironment,useCurrentFrame,useVideoConfig} from 'remotion';
import {gainAt,type Asset,type Clip} from '../model';
import {overlayHeight} from '../overlays';
import {EffectLayer} from './Effects';
import {VisualLayer} from './Visuals';
import {SequenceFrames} from './SequenceFrames';

export function MediaClip({clip,asset,muted}:{clip:Clip;asset:Asset;muted:boolean}){
  const frame=useCurrentFrame(),{width,height}=useVideoConfig();
  if(clip.studio&&clip.hidden)return null;
  const volume=muted?0:gainAt(clip,frame);
  const props={src:asset.url,trimBefore:Math.round(clip.sourceIn),playbackRate:clip.rate,volume,muted:muted||clip.muted,useWebAudioApi:true,pauseWhenBuffering:true};
  if(clip.kind==='audio'){
    // Preview effects use scheduled Web Audio, avoiding the native audio-tag
    // pool limit when several upcoming sounds are premounted together.
    if(getRemotionEnvironment().isRendering)return <Html5Audio {...props}/>;
    return <PreviewAudio src={props.src} trimBefore={props.trimBefore} playbackRate={props.playbackRate} preservePitch volume={volume} muted={props.muted} fallbackHtml5AudioProps={{useWebAudioApi:true,pauseWhenBuffering:false}}/>;
  }
  const view=clip.overlay?{width:width*clip.overlay.width/100,height:height*overlayHeight({width,height},asset,clip.overlay.width)/100}:{width,height},geometry=cropGeometry(asset,view,clip.transform?.crop??noCrop);
  const track=trackedPosition(clip,frame),crop=clip.transform?.crop??noCrop,cw=(100-crop.left-crop.right)/100,ch=(100-crop.top-crop.bottom)/100;
  const mediaStyle:React.CSSProperties={width:'100%',height:'100%',objectFit:'fill',visibility:clip.hidden?'hidden':undefined};
  // Local MP4s can fail WebCodecs even when the browser can play them natively.
  // Use native video in preview with Remotion's latency-aware sync tolerance;
  // a one-frame tolerance repeatedly seeks amplified audio on Safari.
  const video=getRemotionEnvironment().isRendering?<OffthreadVideo {...props} style={mediaStyle}/>:<Html5Video {...props} style={mediaStyle}/>;
  const visual=asset.sequence?<SequenceFrames url={asset.url} count={asset.sequence.count} sourceFrame={clip.sourceIn+frame*clip.rate} rate={clip.rate} style={mediaStyle}/>:clip.studio?<StudioElement instance={clip.studio} frame={clip.sourceIn+frame*clip.rate}/>:asset.kind==='image'?<Img src={asset.url} style={mediaStyle}/>:video;
  const pixels=clip.transform?.faceTrack?.length?<div style={{position:'absolute',inset:0,overflow:'hidden'}}><div style={{...faceCameraStyle({width:asset.width*cw,height:asset.height*ch},view,{x:(track.x-crop.left)/cw,y:(track.y-crop.top)/ch}),overflow:'hidden'}}><div style={cropStyle(crop)}>{visual}</div></div></div>:<div style={geometry.viewport}><div style={geometry.source}>{visual}</div></div>;
  const content=<EffectLayer effects={clip.effects} frame={frame} duration={clip.duration} maskBounds={view} fill><VisualLayer adjustments={clip.adjustments}><div style={{position:'absolute',inset:0,...mediaTransformStyle(clip.transform)}}>{pixels}</div></VisualLayer></EffectLayer>;
  if(!clip.overlay)return content;
  return <AbsoluteFill><div style={{position:'absolute',left:`${clip.overlay.x}%`,top:`${clip.overlay.y}%`,width:`${clip.overlay.width}%`,height:`${overlayHeight({width,height},asset,clip.overlay.width)}%`,transform:'translate(-50%,-50%)'}}>{content}</div></AbsoluteFill>;
}
