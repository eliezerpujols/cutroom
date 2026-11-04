import type {Clip,Project} from './model';
import {placeTimelineClip} from './videoTracks';

export type TimelineItem={id:string;start:number;duration:number;kind:'video'|'audio'|'text'|'caption'};
export function timelineItems(project:Project):TimelineItem[]{
  return [...project.clips.map(({id,start,duration,kind})=>({id,start,duration,kind})),...(project.texts||[]).map(({id,start,duration})=>({id,start,duration,kind:'text' as const})),...(project.captions||[]).flatMap(layer=>layer.cues.map(({id,start,duration})=>({id,start,duration,kind:'caption' as const})))];
}
export function removeTimelineSelection(project:Project,ids:readonly string[]):Project{
  const selected=new Set(ids);
  return {...project,clips:project.clips.filter(item=>!selected.has(item.id)),texts:project.texts?.filter(item=>!selected.has(item.id)),captions:project.captions?.map(layer=>layer.cues.some(item=>selected.has(item.id))?{...layer,cues:layer.cues.filter(item=>!selected.has(item.id))}:layer)};
}

// One shared delta preserves spacing and audio sync, including at frame zero.
export function snapSelectionDelta(clips:Pick<Clip,'start'|'duration'>[],delta:number,points:number[],threshold:number){
  if(!clips.length)return 0;
  const minimum=-Math.min(...clips.map(c=>c.start));
  const maximum=108000-Math.max(...clips.map(c=>c.start));
  const bounded=Math.min(maximum,Math.max(minimum,Math.round(delta)));
  let result=bounded,distance=threshold;
  for(const clip of clips)for(const edge of [clip.start,clip.start+clip.duration])for(const point of points){
    const snapped=point-edge;
    const difference=Math.abs(snapped-bounded);
    if(snapped>=minimum&&snapped<=maximum&&difference<distance){result=snapped;distance=difference;}
  }
  return result;
}

export function moveSelection(project:Project,ids:readonly string[],delta:number,newTrackIds?:Map<string,string>):Project{
  const selected=new Set(ids),items=timelineItems(project).filter(item=>selected.has(item.id)),moving=project.clips.filter(c=>selected.has(c.id));
  if(!items.length)return project;
  const shift=Math.min(108000-Math.max(...items.map(item=>item.start)),Math.max(-Math.min(...items.map(item=>item.start)),Math.round(delta)));
  if(!shift)return project;
  // Remove the whole group first: its old positions must not block its new ones.
  let next:Project={...project,clips:project.clips.filter(c=>!selected.has(c.id))};
  for(const clip of moving)next=placeTimelineClip(next,{...clip,start:clip.start+shift},{newTrackId:newTrackIds?.get(clip.id)});
  const placed=new Map(next.clips.map(c=>[c.id,c]));
  return {...next,clips:project.clips.map(c=>placed.get(c.id)!),texts:project.texts?.map(item=>selected.has(item.id)?{...item,start:item.start+shift}:item),captions:project.captions?.map(layer=>layer.cues.some(item=>selected.has(item.id))?{...layer,cues:layer.cues.map(item=>selected.has(item.id)?{...item,start:item.start+shift}:item).sort((a,b)=>a.start-b.start)}:layer)};
}
