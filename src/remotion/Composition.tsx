import React from 'react';
import {AbsoluteFill,Sequence,Html5Video,Html5Audio,OffthreadVideo,getRemotionEnvironment,useCurrentFrame} from 'remotion';
import {gainAt,clipsInRenderOrder,type Asset,type Clip,type Project} from '../model';
export type EditorProps={project:Project;assets:Asset[]};
function MediaClip({clip,asset,muted}:{clip:Clip;asset:Asset;muted:boolean}){
  const frame=useCurrentFrame();
  const volume=muted?0:gainAt(clip,frame);
  const props={src:asset.url,trimBefore:Math.round(clip.sourceIn),playbackRate:clip.rate,volume,muted:muted||clip.muted,useWebAudioApi:true};
  if(clip.kind==='audio')return <Html5Audio {...props}/>;
  const Video=getRemotionEnvironment().isRendering?OffthreadVideo:Html5Video;
  return <Video {...props} style={{width:'100%',height:'100%',objectFit:'contain'}}/>;
}
export function EditComposition({project,assets}:EditorProps){
  return <AbsoluteFill style={{backgroundColor:'#111111'}}>{clipsInRenderOrder(project).map(clip=>{
    const asset=assets.find(a=>a.id===clip.assetId);if(!asset||asset.missing)return null;
    return <Sequence key={clip.id} from={clip.start} durationInFrames={clip.duration} layout={clip.kind==='audio'?'none':'absolute-fill'}>
      <MediaClip clip={clip} asset={asset} muted={!!project.tracks.find(t=>t.id===clip.trackId)?.muted}/>
    </Sequence>;
  })}</AbsoluteFill>;
}
