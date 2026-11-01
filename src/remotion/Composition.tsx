import React from 'react';
import {Audio as PreviewAudio} from '@remotion/media';
import {AbsoluteFill,Sequence,Html5Video,Html5Audio,OffthreadVideo,Img,getRemotionEnvironment,useCurrentFrame} from 'remotion';
import {FPS,gainAt,clipsInRenderOrder,type Asset,type Clip,type Project} from '../model';
import {CaptionOverlay} from './Captions';
import {VideoTextOverlay} from './VideoText';
import {CoverOverlay,VisualLayer} from './Visuals';
export type EditorProps={project:Project;assets:Asset[];coverMode?:boolean};
function MediaClip({clip,asset,muted}:{clip:Clip;asset:Asset;muted:boolean}){
  const frame=useCurrentFrame();
  const volume=muted?0:gainAt(clip,frame);
  const props={src:asset.url,trimBefore:Math.round(clip.sourceIn),playbackRate:clip.rate,volume,muted:muted||clip.muted,useWebAudioApi:true,pauseWhenBuffering:true};
  if(clip.kind==='audio'){
    // Preview voices and effects share Remotion's scheduled Web Audio clock.
    // Keep the established server-rendering path for exported audio.
    if(getRemotionEnvironment().isRendering)return <Html5Audio {...props}/>;
    return <PreviewAudio src={props.src} trimBefore={props.trimBefore} playbackRate={props.playbackRate} preservePitch volume={volume} muted={props.muted} fallbackHtml5AudioProps={{useWebAudioApi:true,pauseWhenBuffering:false}}/>;
  }
  const Video=getRemotionEnvironment().isRendering?OffthreadVideo:Html5Video;
  return <VisualLayer adjustments={clip.adjustments}>{asset.kind==='image'?<Img src={asset.url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<Video {...props} style={{width:'100%',height:'100%',objectFit:'contain'}}/>}</VisualLayer>;
}
export function EditComposition({project,assets,coverMode=false}:EditorProps){
  return <AbsoluteFill style={{backgroundColor:'#111111'}}><VisualLayer adjustments={project.adjustments}>{clipsInRenderOrder(project).map(clip=>{
    const asset=assets.find(a=>a.id===clip.assetId);if(!asset||asset.missing)return null;
    // Decode upcoming voices/effects before their cue instead of mounting cold
    // and stopping the video for every new audio clip. Pointer events pass through
    // audio wrappers; Sequence premounting requires an absolute-fill layout.
    return <Sequence key={clip.id} from={clip.start} durationInFrames={clip.duration} layout="absolute-fill" style={clip.kind==='audio'?{pointerEvents:'none'}:undefined} premountFor={clip.kind==='audio'?FPS*2:FPS}>
      <MediaClip clip={clip} asset={asset} muted={coverMode||!!project.tracks.find(t=>t.id===clip.trackId)?.muted}/>
    </Sequence>;
  })}</VisualLayer>{!!project.captions?.length&&(!coverMode||project.cover?.showCaptions)&&<CaptionOverlay layers={project.captions}/>}<VideoTextOverlay project={project}/>{coverMode&&project.cover&&<CoverOverlay cover={project.cover}/>}</AbsoluteFill>;
}
