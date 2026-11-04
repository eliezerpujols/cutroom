import {clamp,setClipRate,type Asset,type Clip,type Project} from './model';
import {defaultAdjustments,type VisualAdjustments} from './visuals';

export function patchSelectedAdjustments(project:Project,ids:readonly string[],patch:Partial<VisualAdjustments>):Project{
  const selected=new Set(ids);
  return {...project,clips:project.clips.map(clip=>selected.has(clip.id)&&clip.kind==='video'?{...clip,adjustments:{...defaultAdjustments,...clip.adjustments,...patch}}:clip)};
}
export function playbackClips(project:Project,ids:readonly string[],assets:Asset[]){
  const selected=new Set(ids);
  return project.clips.filter(clip=>selected.has(clip.id)&&assets.some(asset=>asset.id===clip.assetId&&asset.kind!=='image'&&!asset.missing));
}
export function setSelectedRate(project:Project,ids:readonly string[],assets:Asset[],rate:number,origins:Clip[]=project.clips):Project{
  const selected=new Set(playbackClips(project,ids,assets).map(clip=>clip.id));
  return {...project,clips:project.clips.map(clip=>selected.has(clip.id)?setClipRate(origins.find(origin=>origin.id===clip.id)??clip,clamp(rate,.25,4),assets.find(asset=>asset.id===clip.assetId)!):clip)};
}
export function selectionSlipBounds(clips:Clip[],assets:Asset[]){
  if(!clips.length)return {min:0,max:0};
  return {min:Math.ceil(Math.max(...clips.map(clip=>-clip.sourceIn))),max:Math.floor(Math.min(...clips.map(clip=>assets.find(asset=>asset.id===clip.assetId)!.frames-clip.sourceIn-clip.duration*clip.rate)))};
}
export function slipSelectionSources(project:Project,ids:readonly string[],assets:Asset[],delta:number):Project{
  const clips=playbackClips(project,ids,assets),bounds=selectionSlipBounds(clips,assets),amount=clamp(Math.round(delta),bounds.min,Math.max(bounds.min,bounds.max)),selected=new Set(clips.map(clip=>clip.id));
  return {...project,clips:project.clips.map(clip=>selected.has(clip.id)?{...clip,sourceIn:clip.sourceIn+amount}:clip)};
}
