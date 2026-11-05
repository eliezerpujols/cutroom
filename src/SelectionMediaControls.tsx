import {OverlayControls} from './OverlayControls';
import {TransformControls} from './TransformControls';
import {LocalVisionControls} from './LocalVisionControls';
import type {useLocalVision} from './localVision';
import {makeSelectedOverlays,patchOverlay,removeOverlay} from './overlays';
import {patchSelectedCrop,patchTransform} from './transforms';
import {ClipAudioControls} from './ClipAudioControls';
import React,{useRef} from 'react';
import {ArrowLeft,ArrowRight,ChevronRight} from 'lucide-react';
import {Button,Slider} from './ui/primitives';
import {AdjustmentControls} from './VisualAdjustments';
import {commonStyleValue} from './StyleControls';
import {defaultAdjustments} from './visuals';
import {patchSelectedAdjustments,playbackClips,setSelectedRate,selectionSlipBounds,slipSelectionSources} from './selectionMedia';
import {type Asset,type Clip,type Project} from './model';

export function SelectionMediaControls({project,ids,assets,edit,checkpoint,vision,report}:{vision:ReturnType<typeof useLocalVision>;report:(message:string)=>void;project:Project;ids:string[];assets:Asset[];edit:(change:(project:Project)=>Project,record?:boolean)=>void;checkpoint:()=>void}){
  const selected=project.clips.filter(clip=>ids.includes(clip.id)),visual=selected.filter(clip=>clip.kind==='video'),playback=playbackClips(project,ids,assets),audio=selected.filter(clip=>assets.some(asset=>asset.id===clip.assetId&&asset.hasAudio));
  const visualIds=visual.map(c=>c.id),camera=visual.filter(c=>!c.studio&&!assets.find(a=>a.id===c.assetId)?.sequence);
  const rate=commonStyleValue(playback,'rate'),origin=useRef<Clip[]|null>(null),bounds=selectionSlipBounds(playback,assets);
  const patchAudio=(patch:Partial<Clip>,record=true)=>edit(p=>({...p,clips:p.clips.map(clip=>audio.some(item=>item.id===clip.id)?{...clip,...patch}:clip)}),record);
  const begin=()=>{origin.current=project.clips;checkpoint();},finish=()=>{origin.current=null;};
  return <>
    {!!visual.length&&<>
      <OverlayControls clip={visual[0]} clips={visual} make={()=>{try{edit(p=>makeSelectedOverlays(p,visualIds,assets));}catch(error){report((error as Error).message);}}} reset={()=>edit(p=>visualIds.reduce((next,id)=>removeOverlay(next,id),p))} change={(patch,record=true)=>edit(p=>visualIds.reduce((next,id)=>patchOverlay(next,id,patch),p),record)} checkpoint={checkpoint}/>
      <TransformControls values={visual.map(c=>c.transform??{})} change={(patch,record=true)=>edit(p=>patchTransform(p,visualIds,patch),record)} changeCrop={(patch,record=true)=>edit(p=>patchSelectedCrop(p,visualIds,patch),record)} checkpoint={checkpoint}/>
      {!!camera.length&&<LocalVisionControls clip={camera[0]} clips={camera} vision={vision} removeTracking={()=>edit(p=>patchTransform(p,camera.map(c=>c.id),{faceTrack:[]}))}/>}
    </>}
    {!!audio.length&&<ClipAudioControls clips={audio} change={patchAudio} checkpoint={checkpoint}/>}
    {!!visual.length&&<details className="inspector-section advanced clip-visual-section"><summary><span>Adjustments</span><ChevronRight size={15}/></summary><div className="advanced-content"><AdjustmentControls values={visual.map(clip=>({...defaultAdjustments,...clip.adjustments}))} change={()=>{}} patch={(patch,record=true)=>edit(p=>patchSelectedAdjustments(p,ids,patch),record)} checkpoint={checkpoint} thumbnail={assets.find(asset=>asset.id===visual[0].assetId)?.thumbnails[0]}/></div></details>}
    {!!playback.length&&<details className="inspector-section advanced"><summary><span>Playback & content</span><ChevronRight size={15}/></summary><div className="advanced-content playback-controls"><div className="clip-adjustment"><div className="adjustment-heading"><span>Speed</span><output>{rate===undefined?'Mixed':`${rate}×`}</output></div><Slider label="Playback speed" valueText={rate===undefined?'Mixed':`${rate} times normal speed`} min={.25} max={4} step={.25} value={[rate??1]} onPointerDown={begin} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))begin();}} onValueChange={([value])=>edit(p=>setSelectedRate(p,ids,assets,value,origin.current??p.clips),false)} onValueCommit={finish} onPointerCancel={finish} onBlur={finish}/><div className="speed-presets" role="group" aria-label="Common playback speeds">{[.5,1,1.5,2].map(value=><Button key={value} variant="ghost" size="sm" aria-pressed={rate===value} onClick={()=>edit(p=>setSelectedRate(p,ids,assets,value))}>{value}×</Button>)}</div></div><div className="source-control"><div className="adjustment-heading"><span>Content start</span></div><div className="source-nudges"><Button variant="outline" size="sm" disabled={bounds.min>=0} onClick={()=>edit(p=>slipSelectionSources(p,ids,assets,-1))}><ArrowLeft size={13}/>Earlier</Button><Button variant="outline" size="sm" disabled={bounds.max<=0} onClick={()=>edit(p=>slipSelectionSources(p,ids,assets,1))}>Later<ArrowRight size={13}/></Button></div></div></div></details>}
  </>;
}
