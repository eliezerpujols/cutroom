import {trackedPosition} from './transforms';
import {uid,type Asset,type Clip,type Project} from './model';
import {placeTimelineClip} from './videoTracks';
import {moveLayer,timelineLayers} from './layers';
export function addCutoutLayer(project:Project,original:Clip,asset:Asset){
 if(project.clips.length>=300)throw new Error('This project has reached its clip limit.');
 const clip:Clip={...original,id:uid(),assetId:asset.id,name:asset.name,sourceIn:0,rate:1,volume:0,muted:true,duration:asset.kind==='image'?original.duration:Math.min(original.duration,asset.frames),studio:undefined,transform:original.transform?{...original.transform,faceTrack:original.transform.faceTrack?.length?Array.from({length:Math.ceil(original.duration/3)+1},(_,i)=>{const frame=Math.min(original.duration-1,i*3);return {frame,...trackedPosition(original,frame)};}):undefined}:undefined};
 let next=placeTimelineClip(project,clip,{forceNewTrack:true});const added=next.clips.find(c=>c.id===clip.id)!;
 next=moveLayer({...next,layerOrder:timelineLayers(next).map(l=>l.key)},`track:${added.trackId}`,`track:${original.trackId}`,'before');return {project:next,id:clip.id};
}
