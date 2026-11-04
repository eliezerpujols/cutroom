import React from 'react';
import {withStudioAssets} from '../studio/registry';
import {AbsoluteFill,Sequence} from 'remotion';
import {FPS,type Asset,type Project} from '../model';
import {timelineLayers} from '../layers';
import type {Cover} from '../visuals';
import {TransitionMedia} from './TransitionMedia';
import {VisualLayer,CoverOverlay} from './Visuals';
import {CaptionOverlay} from './Captions';
import {VideoTextOverlay} from './VideoText';

export function LayeredComposition({project,assets,coverMode,cover,hiddenCaptionCueIds=[]}:{project:Project;assets:Asset[];coverMode:boolean;cover?:Cover;hiddenCaptionCueIds?:string[]}){
  assets=withStudioAssets(assets);
  return <AbsoluteFill style={{backgroundColor:'#111111'}}>{timelineLayers(project).slice().reverse().map(layer=>{
    if(layer.kind==='text')return <VideoTextOverlay key={layer.key} project={project} textId={layer.text.id}/>;
    if(layer.kind==='caption')return (!coverMode||cover?.showCaptions)?<CaptionOverlay key={layer.key} layers={[{...layer.layer,cues:layer.layer.cues.filter(cue=>!hiddenCaptionCueIds.includes(cue.id))}]}/>:null;
    const contents=project.clips.filter(clip=>clip.trackId===layer.id).map(clip=>{const asset=assets.find(asset=>asset.id===clip.assetId);if(!asset||asset.missing)return null;
      return <Sequence key={clip.id} from={clip.start} durationInFrames={clip.duration} premountFor={clip.kind==='audio'?FPS*2:FPS} style={clip.kind==='audio'?{pointerEvents:'none'}:undefined}><TransitionMedia project={project} assets={assets} clip={clip} asset={asset} muted={coverMode||layer.track.muted}/></Sequence>;
    });
    return layer.track.kind==='video'?<VisualLayer key={layer.key} adjustments={project.adjustments}>{contents}</VisualLayer>:<React.Fragment key={layer.key}>{contents}</React.Fragment>;
  })}{coverMode&&cover&&<CoverOverlay cover={cover}/>}</AbsoluteFill>;
}
