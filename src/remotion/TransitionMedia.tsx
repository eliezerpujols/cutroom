import React from 'react';
import {AbsoluteFill,Freeze,Sequence,useCurrentFrame} from 'remotion';
import {MediaClip} from './MediaClip';
import {defaultEffects,motionStyle,transitionPrevious,transitionDuration} from '../effects';
import type {Asset,Clip,Project} from '../model';

// Post-cut transitions keep the edit and audio timing intact. Play available
// outgoing source handles and hold only when the source has no more frames.
export function TransitionMedia({project,clip,asset,assets,muted}:{project:Project;clip:Clip;asset:Asset;assets:Asset[];muted:boolean}){
  const frame=useCurrentFrame(),previous=transitionPrevious(project,clip),previousAsset=assets.find(asset=>asset.id===previous?.assetId);
  const duration=transitionDuration(clip),active=previous&&previousAsset&&!previousAsset.missing&&duration>1&&frame>=0&&frame<duration;
  if(!active)return <MediaClip clip={clip} asset={asset} muted={muted}/>;
  const lastFrame=previousAsset.kind==='image'?previous.duration+duration:Math.max(0,Math.floor((previousAsset.frames-1-previous.sourceIn)/previous.rate));
  const outgoing={...previous,effects:{...defaultEffects,...previous.effects,enter:'none' as const,exit:'none' as const,transition:'none' as const}};
  return <AbsoluteFill><Sequence from={-previous.duration} durationInFrames={previous.duration+duration}><Freeze frame={lastFrame} active={previous.duration+frame>=lastFrame}><MediaClip clip={outgoing} asset={previousAsset} muted/></Freeze></Sequence><AbsoluteFill style={motionStyle(clip.effects!.transition,frame/(duration-1))}><MediaClip clip={clip} asset={asset} muted={muted}/></AbsoluteFill></AbsoluteFill>;
}
