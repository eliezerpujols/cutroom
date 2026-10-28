import type {Clip,Project} from './model';
import {placeTimelineClip} from './videoTracks';

// One shared delta preserves spacing and audio sync, including at frame zero.
export function snapSelectionDelta(clips:Clip[],delta:number,points:number[],threshold:number){
  if(!clips.length)return 0;
  const minimum=-Math.min(...clips.map(c=>c.start));
  const bounded=Math.max(minimum,Math.round(delta));
  let result=bounded,distance=threshold;
  for(const clip of clips)for(const edge of [clip.start,clip.start+clip.duration])for(const point of points){
    const snapped=point-edge;
    const difference=Math.abs(snapped-bounded);
    if(snapped>=minimum&&difference<distance){result=snapped;distance=difference;}
  }
  return result;
}

export function moveSelection(project:Project,ids:readonly string[],delta:number,newTrackIds?:Map<string,string>):Project{
  const selected=new Set(ids),moving=project.clips.filter(c=>selected.has(c.id));
  if(!moving.length)return project;
  const shift=Math.max(-Math.min(...moving.map(c=>c.start)),Math.round(delta));
  if(!shift)return project;
  // Remove the whole group first: its old positions must not block its new ones.
  let next:Project={...project,clips:project.clips.filter(c=>!selected.has(c.id))};
  for(const clip of moving)next=placeTimelineClip(next,{...clip,start:clip.start+shift},{newTrackId:newTrackIds?.get(clip.id)});
  const placed=new Map(next.clips.map(c=>[c.id,c]));
  return {...next,clips:project.clips.map(c=>placed.get(c.id)!)};
}
