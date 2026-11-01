import type {Project,Track} from './model';

// A real full-frame video provides the main lane. Extra empty video lanes then
// add no editing target; an overlay-only project may still keep a background lane.
export function visibleMediaTracks(project:Project):Track[]{
  if(!project.clips.some(clip=>clip.kind==='video'&&!clip.overlay))return project.tracks;
  const occupied=new Set(project.clips.map(clip=>clip.trackId));
  return project.tracks.filter(track=>track.kind!=='video'||occupied.has(track.id));
}
export function removeRedundantVideoTracks(project:Project):Project{
  const tracks=visibleMediaTracks(project);if(tracks.length===project.tracks.length)return project;
  const retained=new Set(tracks.map(track=>`track:${track.id}`));
  return {...project,tracks,...(project.layerOrder?{layerOrder:project.layerOrder.filter(key=>!key.startsWith('track:')||retained.has(key))}:{})};
}
