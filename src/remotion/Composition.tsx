import React from 'react';
import {MediaClip} from './MediaClip';
import {LayeredComposition} from './LayeredComposition';
import {AbsoluteFill,Sequence} from 'remotion';
import {FPS,clipsInRenderOrder,type Asset,type Project} from '../model';
import {CaptionOverlay} from './Captions';
import {VideoTextOverlay} from './VideoText';
import {CoverOverlay,VisualLayer} from './Visuals';
export type EditorProps={project:Project;assets:Asset[];coverMode?:boolean};
export function EditComposition({project,assets,coverMode=false}:EditorProps){
  if(project.layerOrder)return <LayeredComposition project={project} assets={assets} coverMode={coverMode} cover={project.cover}/>;
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
