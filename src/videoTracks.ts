import {uid,type Clip,type Project,type Track} from './model';

export const MAX_TRACKS=12;
export const clipsOverlap=(a:Clip,b:Clip)=>a.start<b.start+b.duration&&b.start<a.start+a.duration;

type Placement={newTrackId?:string;cleanupTrackId?:string;forceNewTrack?:boolean};

// Track order is top to bottom. A clip gets its own visible lane when necessary.
export function placeTimelineClip(project:Project,clip:Clip,options:Placement={}):Project{
  const others=project.clips.filter(c=>c.id!==clip.id);
  let tracks=project.tracks;
  if(options.cleanupTrackId&&!others.some(c=>c.trackId===options.cleanupTrackId)){
    tracks=tracks.filter(t=>t.id!==options.cleanupTrackId);
  }
  let target=tracks.find(t=>t.id===clip.trackId&&t.kind===clip.kind)||tracks.find(t=>t.kind===clip.kind);
  const occupied=(id:string)=>others.some(c=>c.trackId===id&&clipsOverlap(c,clip));
  const createTrack=(above?:Track)=>{
    if(tracks.length>=MAX_TRACKS)throw new Error('This project already has 12 tracks. Move the clip to a free space or an existing video track.');
    const label=clip.kind==='video'?'Video':'Audio';
    let number=2;while(tracks.some(t=>t.name===`${label} ${number}`))number++;
    const track:Track={id:options.newTrackId||uid(),name:tracks.some(t=>t.kind===clip.kind)?`${label} ${number}`:label,kind:clip.kind,muted:false};
    const index=above?tracks.findIndex(t=>t.id===above.id):clip.kind==='video'?0:tracks.length;
    tracks=[...tracks.slice(0,index),track,...tracks.slice(index)];
    return track;
  };
  if(!target)target=createTrack();
  else if(clip.kind==='video'&&(options.forceNewTrack||occupied(target.id))){
    const index=tracks.findIndex(t=>t.id===target!.id);
    const freeAbove=options.forceNewTrack?undefined:tracks.slice(0,index).reverse().find(t=>t.kind==='video'&&!occupied(t.id));
    target=freeAbove||createTrack(target);
  }
  const placed=target.id===clip.trackId?clip:{...clip,trackId:target.id};
  const clips=project.clips.some(c=>c.id===clip.id)?project.clips.map(c=>c.id===clip.id?placed:c):[...project.clips,placed];
  return {...project,tracks,clips};
}

export function arrangeVideoTracks(project:Project,priorityIds:string[]=[]):Project{
  const video=project.clips.filter(c=>c.kind==='video');
  if(!video.some((a,i)=>video.slice(i+1).some(b=>a.trackId===b.trackId&&clipsOverlap(a,b))))return project;
  const priority=new Set(priorityIds);
  const order=[...project.clips.filter(c=>!priority.has(c.id)),...project.clips.filter(c=>priority.has(c.id))];
  let arranged:Project={...project,clips:[]};
  for(const clip of order)arranged=placeTimelineClip(arranged,clip);
  const placed=new Map(arranged.clips.map(c=>[c.id,c]));
  return {...arranged,clips:project.clips.map(c=>placed.get(c.id)!)};
}

export function changedVideoClipIds(before:Project,after:Project){
  return after.clips.filter(c=>{
    if(c.kind!=='video')return false;
    const old=before.clips.find(v=>v.id===c.id);
    return !old||old.start!==c.start||old.duration!==c.duration||old.trackId!==c.trackId;
  }).map(c=>c.id);
}
