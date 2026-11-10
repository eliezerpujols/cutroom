import {coverSceneProject} from '../coverScene';
import {ProjectFonts} from './ProjectFonts';
import {isBundledFont,projectFontFamilies} from '../fonts';
import React from 'react';
import {withStudioAssets} from '../studio/registry';
import {TransitionMedia} from './TransitionMedia';
import {LayeredComposition} from './LayeredComposition';
import '../fonts.css';
import {AbsoluteFill,Sequence,useCurrentFrame} from 'remotion';
import {activePreviewClip} from '../nativeVideoBuffer';
import {FPS,clipsInRenderOrder,type Asset,type Project} from '../model';
import {CaptionOverlay} from './Captions';
import {VideoTextOverlay} from './VideoText';
import {CoverOverlay,VisualLayer} from './Visuals';
export type EditorProps={project:Project;assets:Asset[];fontProjectId?:string;coverMode?:boolean;hiddenTextIds?:string[];hiddenCaptionCueIds?:string[];cropClipId?:string};
function CompositionContent({project,assets,coverMode=false,hiddenTextIds=[],hiddenCaptionCueIds=[],cropClipId}:EditorProps){
  const frame=useCurrentFrame();
  if(coverMode)project=coverSceneProject(project);
  if(cropClipId)project={...project,clips:project.clips.map(c=>c.id===cropClipId?{...c,transform:{...c.transform,crop:undefined,faceTrack:undefined}}:c)};
  assets=withStudioAssets(assets);
  const visibleProject=hiddenTextIds.length?{...project,texts:project.texts?.filter(text=>!hiddenTextIds.includes(text.id))}:project;
  const visibleCover=project.cover&&hiddenTextIds.length?{...project.cover,texts:project.cover.texts.filter(text=>!hiddenTextIds.includes(text.id))}:project.cover;
  if(project.layerOrder)return <LayeredComposition project={visibleProject} assets={assets} coverMode={coverMode} cover={visibleCover} hiddenCaptionCueIds={hiddenCaptionCueIds}/>;
  return <AbsoluteFill style={{backgroundColor:'#111111'}}><VisualLayer adjustments={project.adjustments}>{clipsInRenderOrder(project).map(clip=>{
    const asset=assets.find(a=>a.id===clip.assetId);if(!asset||asset.missing)return null;
    // Decode upcoming voices/effects before their cue instead of mounting cold
    // and stopping the video for every new audio clip. Pointer events pass through
    // audio wrappers; Sequence premounting requires an absolute-fill layout.
    return <Sequence key={clip.id} from={clip.start} durationInFrames={clip.duration} layout="absolute-fill" style={clip.kind==='audio'?{pointerEvents:'none'}:undefined} premountFor={clip.kind==='audio'?FPS*2:FPS}>
      <TransitionMedia project={project} assets={assets} clip={clip} asset={asset} muted={coverMode||!!project.tracks.find(t=>t.id===clip.trackId)?.muted} previewActive={activePreviewClip(frame,clip.start,clip.duration,coverMode)}/>
    </Sequence>;
  })}</VisualLayer>{!!project.captions?.length&&(!coverMode||project.cover?.showCaptions)&&<CaptionOverlay layers={project.captions} hiddenCueIds={hiddenCaptionCueIds}/>}<VideoTextOverlay project={visibleProject}/>{coverMode&&visibleCover&&<CoverOverlay cover={visibleCover}/>}</AbsoluteFill>;
}

export function EditComposition(props:EditorProps){const families=projectFontFamilies(props.project).filter(font=>!isBundledFont(font));return <><ProjectFonts key={props.fontProjectId+families.join("|")} families={families} projectId={props.fontProjectId}/><CompositionContent {...props}/></>;}
