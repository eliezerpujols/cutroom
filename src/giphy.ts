import type {IGif} from '@giphy/js-types';
import {uid,type Asset,type Clip,type Project} from './model';
import {placeTimelineClip} from './videoTracks';
import {makeOverlay} from './overlays';

export type GiphyKind='gifs'|'clips'|'stickers';
export type GiphyPlacement='clip'|'overlay';
export type GiphySource={provider:'giphy';id:string;kind:GiphyKind;pageUrl:string;title?:string;creator?:string;creatorUrl?:string};
export type GiphyItem=IGif;
export const GIPHY_DRAG_TYPE='application/cutroom-giphy';
export const giphyKinds=[['gifs','GIFs'],['clips','Clips'],['stickers','Stickers']] as const;
export function giphyHttps(value:string,media=false){try{const u=new URL(value);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&(u.hostname==='giphy.com'||u.hostname.endsWith('.giphy.com'))&&(!media||u.hostname!=='api.giphy.com');}catch{return false;}}
export function giphySource(item:GiphyItem,kind:GiphyKind):GiphySource{
 return {provider:'giphy',id:String(item.id),kind,pageUrl:item.url,title:item.title?.slice(0,200),creator:item.user?.display_name||item.user?.username||item.username||item.source_tld||undefined,creatorUrl:item.user?.username?'https://giphy.com/'+encodeURIComponent(item.user.username):undefined};
}
export function giphyDownload(item:GiphyItem,kind:GiphyKind){
 const original=item.images?.original;
 const url=kind==='clips'?(item.video?.assets?.['720p']?.url||item.video?.assets?.source?.url):kind==='stickers'?original?.url:(original?.mp4||original?.url);
 if(!url||!giphyHttps(url,true))throw new Error('This item has no supported media rendition.');
 const extension=kind==='clips'||kind==='gifs'&&url===original?.mp4?'mp4':'gif';
 return {url,extension};
}
export function addGiphyClip(project:Project,asset:Asset,start:number,placement:GiphyPlacement,requestedTrack?:string){
 if(project.clips.length>=300)throw new Error('This project has reached its clip limit.');
 const target=project.tracks.find(t=>t.id===requestedTrack&&t.kind==='video')||project.tracks.find(t=>t.kind==='video');
 let next=project,trackId=target?.id;
 if(!trackId){trackId=uid();next={...project,tracks:[{id:trackId,name:'Video',kind:'video',muted:false},...project.tracks]};}
 const clip:Clip={id:uid(),assetId:asset.id,name:asset.name,kind:'video',trackId,start:Math.max(0,Math.round(start)),duration:asset.frames,sourceIn:0,rate:1,volume:1,muted:!asset.hasAudio,fadeIn:0,fadeOut:0};
 next=placeTimelineClip(next,clip,{forceNewTrack:placement==='overlay'});
 if(placement==='overlay')next=makeOverlay(next,clip.id,{},asset);
 return {project:next,id:clip.id};
}
