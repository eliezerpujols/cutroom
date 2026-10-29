import React from 'react';
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
  if(clip.kind==='audio')return <Html5Audio {...props}/>;
  const Video=getRemotionEnvironment().isRendering?OffthreadVideo:Html5Video;
  return <VisualLayer adjustments={clip.adjustments}>{asset.kind==='image'?<Img src={asset.url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<Video {...props} style={{width:'100%',height:'100%',objectFit:'contain'}}/>}</VisualLayer>;
}
export function EditComposition({project,assets,coverMode=false}:EditorProps){
  return <AbsoluteFill style={{backgroundColor:'#111111'}}><VisualLayer adjustments={project.adjustments}>{clipsInRenderOrder(project).map(clip=>{
    const asset=assets.find(a=>a.id===clip.assetId);if(!asset||asset.missing)return null;
    // Prepare the next video's first frame before a hard cut. Audio sequences
    // use layout="none", which cannot be premounted; buffering still keeps sync.
    return <Sequence key={clip.id} from={clip.start} durationInFrames={clip.duration} layout={clip.kind==='audio'?'none':'absolute-fill'} premountFor={clip.kind==='video'?FPS:undefined}>
      <MediaClip clip={clip} asset={asset} muted={coverMode||!!project.tracks.find(t=>t.id===clip.trackId)?.muted}/>
    </Sequence>;
  })}</VisualLayer>{!!project.captions?.length&&(!coverMode||project.cover?.showCaptions)&&<CaptionOverlay layers={project.captions}/>}<VideoTextOverlay project={project}/>{coverMode&&project.cover&&<CoverOverlay cover={project.cover}/>}</AbsoluteFill>;
}
