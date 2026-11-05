import type {Asset,Clip,Project} from './model';
import {placeTimelineClip} from './videoTracks';
import {moveLayer,timelineLayers} from './layers';
import {removeRedundantVideoTracks} from './trackVisibility';
export type ClipOverlay={x:number;y:number;width:number};
export function overlayHeight(project:Pick<Project,'width'|'height'>,asset:Pick<Asset,'width'|'height'>,width:number){return width*(project.width/project.height)/(asset.width>0&&asset.height>0?asset.width/asset.height:project.width/project.height);}
function fittedOverlayWidth(project:Project,asset?:Pick<Asset,'width'|'height'>){
  return asset&&asset.width>0&&asset.height>0?Math.max(2,Math.min(45,45*project.height/project.width*asset.width/asset.height)):45;
}
export function makeOverlay(project:Project,id:string,patch:Partial<ClipOverlay>={},asset?:Pick<Asset,'width'|'height'>):Project{
  project=removeRedundantVideoTracks(project);
  const clip=project.clips.find(item=>item.id===id);if(!clip||clip.kind!=='video')throw new Error('Select a video or image clip.');
  const fitted=fittedOverlayWidth(project,asset);
  const overlay={x:50,y:50,width:fitted,...clip.overlay,...patch};
  const alone=!project.clips.some(item=>item.id!==id&&item.trackId===clip.trackId);
  // Reuse an exclusive lane: keep its ID, position, name and mute state, and
  // don't allocate a new track merely to leave the old one empty.
  if(clip.overlay||alone){
    const next={...project,clips:project.clips.map(item=>item.id===id?{...item,overlay}:item)};
    return {...next,layerOrder:timelineLayers(next).map(layer=>layer.key)};
  }
  const placed=placeTimelineClip(project,{...clip,overlay},{forceNewTrack:true});
  const raised=placed.clips.find(item=>item.id===id)!;
  return moveLayer({...placed,layerOrder:timelineLayers(placed).map(layer=>layer.key)},`track:${raised.trackId}`,`track:${clip.trackId}`,'before');
}
export function patchOverlay(project:Project,id:string,patch:Partial<ClipOverlay>):Project{
  return {...project,clips:project.clips.map(clip=>clip.id===id&&clip.overlay?{...clip,overlay:{...clip.overlay,...patch}}:clip)};
}
export function removeOverlay(project:Project,id:string):Project{
  return {...project,clips:project.clips.map(clip=>{if(clip.id!==id)return clip;const {overlay,...rest}=clip;void overlay;return rest as Clip;})};
}

// Reuse compatible free overlay lanes when converting a selection together.
export function makeSelectedOverlays(project:Project,ids:readonly string[],assets:Asset[]):Project{
  return ids.reduce((p,id)=>{
    const clip=p.clips.find(c=>c.id===id);
    if(!clip||clip.kind!=='video')return p;
    const asset=assets.find(a=>a.id===clip.assetId);
    const index=p.tracks.findIndex(t=>t.id===clip.trackId);
    const track=p.tracks[index];
    const free=p.tracks.slice(0,index).find(t=>t.kind==='video'&&t.muted===track.muted&&
      !p.clips.some(c=>c.trackId===t.id&&c.start<clip.start+clip.duration&&clip.start<c.start+c.duration));
    if(!clip.overlay&&free){
      const placed={...p,clips:p.clips.map(c=>c.id===id?{...c,trackId:free.id,overlay:{x:50,y:50,width:45}}:c)};
      const width=fittedOverlayWidth(p,asset);
      return makeOverlay(placed,id,{width},asset);
    }
    return makeOverlay(p,id,{},asset);
  },project);
}
