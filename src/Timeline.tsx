import {GIPHY_DRAG_TYPE} from './giphy';
import type {GiphySelection} from './GiphyPanel';
import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Film,Volume2,VolumeX,AudioLines,Plus,Minus,MousePointer2,Scissors,BetweenHorizontalStart,Keyboard,Blend,LockKeyhole} from 'lucide-react';
import {Button,IconButton,Slider,Tip} from './ui/primitives';
import {FadeEnvelope} from './ClipAdjustments';
import {CaptionTimeline} from './CaptionTimeline';
import {VideoTextTimeline} from './VideoTextTimeline';
import {useLayerReorder} from './useLayerReorder';
import {SOUND_DRAG_TYPE} from './sounds';
import {STUDIO_DRAG_TYPE,ASSET_DRAG_TYPE,ASSET_KIND_PREFIX,TEXT_PRESET_DRAG_TYPE,TEXT_DRAG_TYPE,CAPTION_DRAG_TYPE,isLibraryDrag,movingLibraryItem,isTextPreset} from './libraryDrag';
import {makeVideoText} from './videoText';
import './libraryDrag.css';
import {timelineTransitions} from './effects';
import './timelineTransitions.css';
import type {CaptionSelection} from './captions';
import {placeTimelineClip} from './videoTracks';
import {moveSelection,snapSelectionDelta,timelineItems} from './timelineSelection';
import {FPS,clamp,endFrame,time,uid,trimClip,slipClip,splitTarget,snapFrame,fadeGainAt,type Asset,type Clip,type Project,type Tool} from './model';

type Props={addGiphy:(selection:GiphySelection,at:number,trackId?:string)=>void;addStudio:(id:string,at:number,trackId?:string)=>void;openTransition:(clipId:string)=>void;beforeReorder?:()=>void;addSound:(id:string,at:number,trackId?:string)=>void;textSelected:string|null;selectText:(id:string|null)=>void;coverEditing:boolean;sourceProject:Project;project:Project;assets:Asset[];captionSelection:CaptionSelection;selectCaption:(selection:CaptionSelection)=>void;selectedIds:string[];select:(ids:string[])=>void;frame:number;seek:(f:number)=>void;tool:Tool;setTool:(t:Tool)=>void;edit:(fn:(p:Project)=>Project,record?:boolean)=>void;checkpoint:()=>void;split:()=>void;add:(id:string,at:number,trackId?:string)=>void;height:number|null;resize:(height:number|null)=>void;showShortcuts:()=>void;};
type SelectionBox={left:number;top:number;width:number;height:number};
const MIN_HEIGHT=180,MIN_ZOOM=.5,MAX_ZOOM=5;
export const Waveform=React.memo(function Waveform({asset,clip}:{asset:Asset;clip:Clip}){
  const count=240;
  return <svg className="waveform" viewBox={`0 0 ${count*3} 48`} preserveAspectRatio="none" aria-hidden="true">{Array.from({length:count},(_,i)=>{
    const start=Math.floor((clip.sourceIn+i/count*clip.duration*clip.rate)/asset.frames*asset.peaks.length);
    const end=Math.max(start+1,Math.floor((clip.sourceIn+(i+1)/count*clip.duration*clip.rate)/asset.frames*asset.peaks.length));
    const peak=asset.peaks.slice(Math.max(0,start),Math.min(asset.peaks.length,end)).reduce((a,b)=>Math.max(a,b),0);
    const h=Math.max(1,Math.max(2,Math.pow(peak,.62)*42)*fadeGainAt(clip,i/(count-1)*Math.max(0,clip.duration-1)));return <rect key={i} x={i*3} y={24-h/2} width="1.8" height={h} rx=".8"/>;
  })}</svg>;
});
export function Timeline(props:Props){
  const {assets,selectedIds,select,frame,seek,tool,setTool,edit,checkpoint,split,add}=props;
  const project=props.coverEditing?props.sourceProject:props.project;
  const selected=selectedIds.length===1?selectedIds[0]:null;
  const selectedSet=new Set(selectedIds);
  const transitions=timelineTransitions(project);
  const timeline=useRef<HTMLElement>(null),viewport=useRef<HTMLDivElement>(null),board=useRef<HTMLDivElement>(null);
  const gestureCleanup=useRef<(()=>void)|null>(null);
  const registerCaptionGesture=useCallback((cleanup:(()=>void)|null)=>{gestureCleanup.current=cleanup;},[]);
  const reorder=useLayerReorder(project,edit,viewport,gestureCleanup,props.beforeReorder);
  const resizeCancel=useRef<(()=>void)|null>(null);
  const [resizing,setResizing]=useState(false),[timelineSize,setTimelineSize]=useState({height:294,max:1000});
  const [libraryDrop,setLibraryDrop]=useState<{frame:number;track?:string}|null>(null);
  useEffect(()=>{const clear=()=>setLibraryDrop(null);window.addEventListener('dragend',clear);window.addEventListener('drop',clear);window.addEventListener('blur',clear);return()=>{window.removeEventListener('dragend',clear);window.removeEventListener('drop',clear);window.removeEventListener('blur',clear);};},[]);
  const [selectionBox,setSelectionBox]=useState<SelectionBox|null>(null),[dragScale,setDragScale]=useState<number|null>(null);
  const [zoom,setZoom]=useState(1),[available,setAvailable]=useState(800);
  const snapping=true;
  const length=Math.max(endFrame(project),props.coverEditing?frame+1:0);const extent=Math.max(length,FPS*8);
  const base=Math.max(.45,(available-48)/extent);const ppf=dragScale??base*zoom;const width=Math.max(available,extent*ppf+24);
  const zoomValue=useRef(zoom),renderedScale=useRef(ppf),zoomAnchor=useRef<{frame:number;offset:number}|null>(null);
  zoomValue.current=zoom;renderedScale.current=ppf;
  const changeZoom=useCallback((value:number,clientX?:number)=>{
    const next=clamp(value,MIN_ZOOM,MAX_ZOOM),scroller=viewport.current;
    if(next===zoomValue.current)return;
    if(scroller){
      const rect=scroller.getBoundingClientRect(),visible=Math.max(0,scroller.clientWidth-132);
      const offset=clientX===undefined?visible/2:clamp(clientX-rect.left-132,0,visible);
      zoomAnchor.current={frame:(scroller.scrollLeft+offset)/renderedScale.current,offset};
    }
    zoomValue.current=next;setZoom(next);
  },[]);
  useLayoutEffect(()=>{
    const anchor=zoomAnchor.current;if(!anchor||!viewport.current)return;
    viewport.current.scrollLeft=Math.max(0,anchor.frame*ppf-anchor.offset);zoomAnchor.current=null;
  },[ppf,width,zoom]);
  useEffect(()=>{
    const element=timeline.current;if(!element)return;
    const wheel=(event:WheelEvent)=>{
      if(!event.metaKey&&!event.ctrlKey)return;
      event.preventDefault();event.stopPropagation();
      if(gestureCleanup.current)return;
      const unit=event.deltaMode===1?16:event.deltaMode===2?(viewport.current?.clientHeight||600):1;
      const delta=clamp((event.deltaY||event.deltaX)*unit,-500,500);
      changeZoom(zoomValue.current*Math.exp(-delta*.0025),event.clientX);
    };
    // A native non-passive listener prevents browser zoom for this gesture.
    element.addEventListener('wheel',wheel,{passive:false});
    return()=>element.removeEventListener('wheel',wheel);
  },[changeZoom]);
  useEffect(()=>()=>gestureCleanup.current?.(),[props.coverEditing]);
  useEffect(()=>{if(!viewport.current)return;const obs=new ResizeObserver(([e])=>setAvailable(Math.max(200,e.contentRect.width-132)));obs.observe(viewport.current);return()=>obs.disconnect();},[]);
  function heightLimits(){
    const shell=timeline.current!.closest<HTMLElement>('.app-shell')!;
    const header=shell.querySelector<HTMLElement>('.app-header')?.offsetHeight||56;
    const tabs=shell.querySelector<HTMLElement>('.mobile-tabs')?.offsetHeight||0;
    return {min:MIN_HEIGHT,max:Math.max(MIN_HEIGHT,Math.floor(shell.clientHeight-header-tabs-(matchMedia('(max-width:800px)').matches?250:240)))};
  }
  useEffect(()=>{
    const element=timeline.current,shell=element?.closest<HTMLElement>('.app-shell');if(!element||!shell)return;
    const update=()=>{const height=Math.round(element.getBoundingClientRect().height),max=heightLimits().max;setTimelineSize(previous=>previous.height===height&&previous.max===max?previous:{height,max});};
    const observer=new ResizeObserver(update);observer.observe(element);observer.observe(shell);update();return()=>observer.disconnect();
  },[]);
  const rulerStep=ppf*FPS<25?120:ppf*FPS<70?60:30;
  const selectedClip=project.clips.find(c=>c.id===selected);
  const selectedAsset=assets.find(a=>a.id===selectedClip?.assetId);
  const canSlip=!props.coverEditing&&!!selectedClip&&!!selectedAsset&&selectedAsset.kind!=='image'&&selectedAsset.frames-selectedClip.duration*selectedClip.rate>=1;
  const selectedText=project.texts?.find(text=>text.id===props.textSelected);
  const canSplit=!props.coverEditing&&!props.captionSelection&&(selectedText?frame>selectedText.start&&frame<selectedText.start+selectedText.duration:selectedIds.length<2&&!!splitTarget(project,selected,frame));
  const splitHint=selectedIds.length>1?'Select one clip to split at the playhead.':canSplit?'Split at the playhead · S or ⌘B':selectedClip?'Move the playhead inside the selected clip to split.':'Move the playhead inside a clip to split.';
  const slipHint=!selectedClip?'Select a clip to change its source content.':!canSlip?'Trim this clip first to make room for a slip edit.':'Slip source content · Y. Drag inside the clip; its position stays fixed.';
  function pointerFrame(clientX:number){const rect=board.current!.getBoundingClientRect();return clamp(Math.round((clientX-rect.left-132)/ppf),0,length-1);}
  function libraryDropFrame(clientX:number,shift=false){
    const rect=board.current!.getBoundingClientRect(),raw=Math.max(0,Math.round((clientX-rect.left-132)/ppf));
    const items=[...project.clips,...(project.texts||[]),...(project.captions||[]).flatMap(layer=>layer.cues)];
    const points=[0,frame,...items.flatMap(item=>[item.start,item.start+item.duration])];
    return clamp(snapping&&!shift?snapFrame(raw,points,7/ppf):raw,0,108000);
  }
  function compatibleDropTrack(event:React.DragEvent,track?:string){
    const target=project.tracks.find(item=>item.id===track),types=event.dataTransfer.types;
    if(types.includes(TEXT_PRESET_DRAG_TYPE)||movingLibraryItem(types))return undefined;
    if(types.includes(SOUND_DRAG_TYPE)||types.includes(ASSET_KIND_PREFIX+'audio'))return target?.kind==='audio'?target.id:undefined;
    if(types.includes(GIPHY_DRAG_TYPE)||types.includes(STUDIO_DRAG_TYPE)||types.includes(ASSET_KIND_PREFIX+'video')||types.includes(ASSET_KIND_PREFIX+'image'))return target?.kind==='video'?target.id:undefined;
    return target?.id;
  }
  function libraryDragOver(event:React.DragEvent,track?:string){
    if(props.coverEditing)return;
    if(!isLibraryDrag(event.dataTransfer.types))return;
    event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect=movingLibraryItem(event.dataTransfer.types)?'move':'copy';
    const next={frame:libraryDropFrame(event.clientX,event.shiftKey),track:compatibleDropTrack(event,track)};
    setLibraryDrop(previous=>previous?.frame===next.frame&&previous.track===next.track?previous:next);
  }
  function dropMedia(event:React.DragEvent,track?:string){
    if(props.coverEditing)return;
    if(event.dataTransfer.files.length||!isLibraryDrag(event.dataTransfer.types))return;
    event.preventDefault();event.stopPropagation();setLibraryDrop(null);
    const at=libraryDropFrame(event.clientX,event.shiftKey),target=compatibleDropTrack(event,track),soundId=event.dataTransfer.getData(SOUND_DRAG_TYPE);
    const giphy=event.dataTransfer.getData(GIPHY_DRAG_TYPE);if(giphy){try{const selection=JSON.parse(giphy) as GiphySelection;if(!selection.item?.id||!['gifs','clips','stickers'].includes(selection.kind))return;props.addGiphy(selection,at,target);}catch{}return;}
    const studioId=event.dataTransfer.getData(STUDIO_DRAG_TYPE);if(studioId){props.addStudio(studioId,at,target);return;}
    if(soundId){props.addSound(soundId,at,target);return;}
    const assetId=event.dataTransfer.getData(ASSET_DRAG_TYPE);if(assetId){add(assetId,at,target);return;}
    const preset=event.dataTransfer.getData(TEXT_PRESET_DRAG_TYPE);
    if(preset){if(!isTextPreset(preset)||(project.texts?.length||0)>=100)return;const text=makeVideoText(uid(),at,preset);edit(p=>({...p,texts:[text,...(p.texts||[])]}));props.selectText(text.id);return;}
    const textId=event.dataTransfer.getData(TEXT_DRAG_TYPE),text=project.texts?.find(item=>item.id===textId);
    if(text){if(text.start!==at)edit(p=>({...p,texts:p.texts?.map(item=>item.id===textId?{...item,start:at}:item)}));props.selectText(textId);return;}
    const caption=event.dataTransfer.getData(CAPTION_DRAG_TYPE);
    if(caption){
      let source:{layerId?:unknown;cueId?:unknown};try{source=JSON.parse(caption);if(!source||typeof source!=='object')return;}catch{return;}
      const layer=project.captions?.find(item=>item.id===source.layerId),cue=layer?.cues.find(item=>item.id===source.cueId);if(!layer||!cue)return;
      if(cue.start!==at)edit(p=>({...p,captions:p.captions?.map(item=>item.id===layer.id?{...item,cues:item.cues.map(current=>current.id===cue.id?{...current,start:at}:current).sort((a,b)=>a.start-b.start)}:item)}));props.selectCaption({layerId:layer.id,cueId:cue.id});
    }
  }
  function scrub(e:React.PointerEvent<HTMLDivElement>){
    if(e.button!==0||!e.isPrimary||props.coverEditing&&e.clientX<board.current!.getBoundingClientRect().left+132)return;
    e.preventDefault();e.stopPropagation();e.currentTarget.focus({preventScroll:true});gestureCleanup.current?.();
    if(props.coverEditing)checkpoint();seek(pointerFrame(e.clientX));e.currentTarget.setPointerCapture(e.pointerId);
    const move=(ev:PointerEvent)=>{if(ev.pointerId===e.pointerId)seek(pointerFrame(ev.clientX));};
    const finish=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);window.removeEventListener('blur',finish);gestureCleanup.current=null;};
    gestureCleanup.current=finish;window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish,{once:true});window.addEventListener('pointercancel',finish,{once:true});window.addEventListener('blur',finish,{once:true});
  }
  function frameKey(e:React.KeyboardEvent){
    const next=e.key==='ArrowRight'?frame+(e.shiftKey?FPS:1):e.key==='ArrowLeft'?frame-(e.shiftKey?FPS:1):e.key==='Home'?0:e.key==='End'?length-1:null;
    if(next===null||e.metaKey||e.ctrlKey||e.altKey)return;
    e.preventDefault();e.stopPropagation();if(props.coverEditing)checkpoint();seek(clamp(next,0,length-1));
  }

  function startResize(e:React.PointerEvent<HTMLDivElement>){
    if(e.button!==0||!e.isPrimary)return;
    e.preventDefault();e.stopPropagation();gestureCleanup.current?.();setSelectionBox(null);setDragScale(null);
    const handle=e.currentTarget,originY=e.clientY,originHeight=timeline.current!.getBoundingClientRect().height,previous=props.height;
    const cursor=document.body.style.cursor,userSelect=document.body.style.userSelect;
    let moved=false;
    handle.focus({preventScroll:true});handle.setPointerCapture(e.pointerId);setResizing(true);
    document.body.style.cursor='row-resize';document.body.style.userSelect='none';
    const move=(event:PointerEvent)=>{
      if(event.pointerId!==e.pointerId)return;
      if(!moved&&Math.abs(event.clientY-originY)<1)return;
      moved=true;const bounds=heightLimits();props.resize(Math.round(clamp(originHeight+originY-event.clientY,bounds.min,bounds.max)));
    };
    const cleanup=()=>{
      window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',blur);
      try{if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);}catch{/* The browser may already have released a canceled pointer. */}
      document.body.style.cursor=cursor;document.body.style.userSelect=userSelect;
      gestureCleanup.current=null;resizeCancel.current=null;
    };
    const finish=(event:PointerEvent)=>{if(event.pointerId!==e.pointerId)return;if(moved)move(event);cleanup();setResizing(false);};
    const revert=()=>{if(moved)props.resize(previous);cleanup();setResizing(false);};
    const cancel=(event:PointerEvent)=>{if(event.pointerId===e.pointerId)revert();};
    const blur=()=>{cleanup();setResizing(false);};
    gestureCleanup.current=cleanup;resizeCancel.current=revert;
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',blur);
  }
  function resizeKey(e:React.KeyboardEvent){
    if(e.key==='Escape'&&resizeCancel.current){e.preventDefault();e.stopPropagation();resizeCancel.current();return;}
    const bounds=heightLimits(),step=e.shiftKey?72:24,current=timeline.current!.getBoundingClientRect().height;
    const value=e.key==='ArrowUp'?current+step:e.key==='ArrowDown'?current-step:e.key==='Home'?bounds.min:e.key==='End'?bounds.max:null;
    if(value===null)return;e.preventDefault();e.stopPropagation();props.resize(Math.round(clamp(value,bounds.min,bounds.max)));
  }

  function selectArea(e:React.PointerEvent){
    if(props.coverEditing)return;
    if(e.button!==0||!e.isPrimary||(e.target as HTMLElement).closest('.timeline-clip,.track-label,.ruler-row'))return;
    e.preventDefault();e.stopPropagation();gestureCleanup.current?.();
    board.current!.focus({preventScroll:true});setTool('select');setDragScale(null);setResizing(false);
    const element=board.current!,scroller=viewport.current!;
    const initialRect=element.getBoundingClientRect(),x=e.clientX,y=e.clientY;
    const origin={x:x-initialRect.left,y:y-initialRect.top};
    const additive=e.shiftKey||e.metaKey||e.ctrlKey,previous=[...selectedIds];
    element.setPointerCapture(e.pointerId);
    const boxes=Array.from(element.querySelectorAll<HTMLElement>('[data-timeline-id]')).map(clip=>{
      const rect=clip.getBoundingClientRect();
      return {id:clip.dataset.timelineId!,left:rect.left-initialRect.left,right:rect.right-initialRect.left,top:rect.top-initialRect.top,bottom:rect.bottom-initialRect.top};
    });
    let started=false,lastX=x,lastY=y,animation=0;
    const update=()=>{
      const rect=element.getBoundingClientRect();
      const point={x:clamp(lastX-rect.left,132,element.scrollWidth),y:clamp(lastY-rect.top,0,element.scrollHeight)};
      const left=Math.min(origin.x,point.x),top=Math.min(origin.y,point.y),right=Math.max(origin.x,point.x),bottom=Math.max(origin.y,point.y);
      setSelectionBox({left,top,width:right-left,height:bottom-top});
      const hit=boxes.filter(clip=>clip.left<right&&clip.right>left&&clip.top<bottom&&clip.bottom>top).map(clip=>clip.id);
      select([...new Set([...(additive?previous:[]),...hit])]);
    };
    const scroll=()=>{
      const rect=scroller.getBoundingClientRect();
      const speed=(value:number,min:number,max:number)=>value<min+28?-Math.min(18,(min+28-value)/2):value>max-28?Math.min(18,(value-max+28)/2):0;
      const left=scroller.scrollLeft,top=scroller.scrollTop;
      scroller.scrollLeft+=speed(lastX,rect.left+132,rect.right);
      scroller.scrollTop+=speed(lastY,rect.top+(element.querySelector<HTMLElement>('.ruler-row')?.offsetHeight||0),rect.bottom);
      if(left!==scroller.scrollLeft||top!==scroller.scrollTop)update();
      animation=requestAnimationFrame(scroll);
    };
    const move=(event:PointerEvent)=>{
      if(event.pointerId!==e.pointerId)return;
      lastX=event.clientX;lastY=event.clientY;
      if(!started&&Math.hypot(lastX-x,lastY-y)<4)return;
      if(!started){started=true;animation=requestAnimationFrame(scroll);}
      update();
    };
    const cleanup=()=>{
      cancelAnimationFrame(animation);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);
      window.removeEventListener('blur',blur);window.removeEventListener('keydown',escape,true);
      try{if(element.hasPointerCapture(e.pointerId))element.releasePointerCapture(e.pointerId);}catch{}
      gestureCleanup.current=null;
    };
    const finish=(event:PointerEvent)=>{
      if(event.pointerId!==e.pointerId)return;
      if(started){lastX=event.clientX;lastY=event.clientY;update();}
      else if(!additive){select([]);seek(pointerFrame(event.clientX));}
      cleanup();setSelectionBox(null);
    };
    const cancel=(event:PointerEvent)=>{if(event.pointerId!==e.pointerId)return;cleanup();select(previous);setSelectionBox(null);};
    const blur=()=>{cleanup();setSelectionBox(null);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cleanup();select(previous);setSelectionBox(null);}};
    gestureCleanup.current=cleanup;
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',blur);window.addEventListener('keydown',escape,true);
  }

  function toggleItem(id:string,additive=false){select(additive?(selectedSet.has(id)?selectedIds.filter(value=>value!==id):[...selectedIds,id]):[id]);}
  function nudgeItem(id:string,delta:number){
    const group=selectedSet.has(id)?selectedIds:[id];
    if(!selectedSet.has(id))select(group);
    edit(p=>moveSelection(p,group,delta));
  }
  function dragItem(event:React.PointerEvent,id:string){
    if(event.button!==0||!event.isPrimary)return;
    event.preventDefault();event.stopPropagation();gestureCleanup.current?.();setSelectionBox(null);setResizing(false);
    const element=event.currentTarget as HTMLElement,scroller=viewport.current!,additive=event.shiftKey||event.metaKey||event.ctrlKey;
    const group=selectedSet.has(id)?selectedIds:additive?[...selectedIds,id]:[id],moving=timelineItems(project).filter(item=>group.includes(item.id));
    if(!moving.length)return;
    if(!selectedSet.has(id)&&!additive)select(group);
    setTool('select');element.focus({preventScroll:true});element.setPointerCapture(event.pointerId);
    const origin=event.clientX,scrollLeft=scroller.scrollLeft,newTrackIds=new Map(project.clips.filter(item=>group.includes(item.id)).map(item=>[item.id,uid()]));
    const points=[0,frame,...timelineItems(project).filter(item=>!group.includes(item.id)).flatMap(item=>[item.start,item.start+item.duration])];
    let started=false,lastDelta=0,dragged=false;
    const move=(next:PointerEvent)=>{
      if(next.pointerId!==event.pointerId)return;
      const raw=(next.clientX-origin+scroller.scrollLeft-scrollLeft)/ppf;
      if(!dragged&&Math.abs(raw*ppf)<3)return;dragged=true;
      const delta=snapSelectionDelta(moving,raw,snapping&&!next.shiftKey?points:[],7/ppf);
      if(delta===lastDelta)return;lastDelta=delta;
      if(!started){checkpoint();started=true;select(group);setDragScale(ppf);}
      edit(()=>moveSelection(project,group,delta,newTrackIds),false);
    };
    const cleanup=()=>{
      window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',cleanup);
      try{if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);}catch{}
      gestureCleanup.current=null;setDragScale(null);
    };
    const finish=(next:PointerEvent)=>{if(next.pointerId!==event.pointerId)return;move(next);if(!dragged)toggleItem(id,additive);cleanup();};
    const revert=()=>{if(started)edit(()=>project,false);cleanup();};
    const cancel=(next:PointerEvent)=>{if(next.pointerId===event.pointerId)revert();};
    const escape=(next:KeyboardEvent)=>{if(next.key==='Escape'){next.preventDefault();next.stopPropagation();revert();}};
    gestureCleanup.current=cleanup;window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape,true);window.addEventListener('blur',cleanup);
  }

  function drag(e:React.PointerEvent,c:Clip,edge?:'left'|'right'){
    if(!edge&&tool==='select'&&((selectedSet.has(c.id)&&selectedIds.length>1)||e.shiftKey||e.metaKey||e.ctrlKey)){dragItem(e,c.id);return;}
    if(e.button!==0)return;e.stopPropagation();e.preventDefault();gestureCleanup.current?.();setSelectionBox(null);setResizing(false);board.current?.focus({preventScroll:true});
    const additive=!edge&&(e.shiftKey||e.metaKey||e.ctrlKey);
    const group=!edge&&tool==='select'?(selectedSet.has(c.id)?selectedIds:additive?[...selectedIds,c.id]:[c.id]):[c.id];
    if(edge||(!additive&&!selectedSet.has(c.id)))select([c.id]);
    const moving=timelineItems(project).filter(item=>group.includes(item.id));
    const dragTrackIds=new Map(moving.map(clip=>[clip.id,uid()]));
    const a=assets.find(a=>a.id===c.assetId)!;if(tool==='slip'&&!edge&&a.frames-c.duration*c.rate<1)return;const x=e.clientX,y=e.clientY,dragTrackId=uid(),scrollLeft=viewport.current!.scrollLeft;let started=false,dragged=false;
    const rows=Array.from(board.current!.querySelectorAll<HTMLElement>('.track-row')).map(row=>({id:row.dataset.trackId!,kind:row.dataset.trackKind!,rect:row.getBoundingClientRect()})).filter(row=>row.kind===c.kind);
    const points=[0,frame,...project.clips.filter(v=>!group.includes(v.id)).flatMap(v=>[v.start,v.start+v.duration])];
    let lastDelta=0;
    const apply=(change:(p:Project)=>Project)=>{if(!started){if(additive)select(group);checkpoint();started=true;setDragScale(ppf);}edit(change,false);};
    const move=(ev:PointerEvent)=>{
      if(ev.pointerId!==e.pointerId)return;
      if(!started&&Math.abs(ev.clientX-x)<2&&Math.abs(ev.clientY-y)<4)return;
      dragged=true;
      let delta=Math.round((ev.clientX-x+viewport.current!.scrollLeft-scrollLeft)/ppf);let next:Clip;let forceNewTrack=false;
      if(group.length>1){
        delta=snapping&&!ev.shiftKey?snapSelectionDelta(moving,delta,points,7/ppf):Math.max(-Math.min(...moving.map(clip=>clip.start)),delta);
        if(delta===lastDelta)return;lastDelta=delta;
        apply(()=>moveSelection(project,group,delta,dragTrackIds));return;
      }
      if(edge){if(snapping&&!ev.shiftKey){const target=(edge==='left'?c.start:c.start+c.duration)+delta;delta+=snapFrame(target,points,7/ppf)-target;}next=trimClip(c,delta,edge,a);}
      else if(tool==='slip')next=slipClip(c,delta,a);
      else {let start=Math.max(0,c.start+delta);if(snapping&&!ev.shiftKey){const l=snapFrame(start,points,7/ppf),r=snapFrame(start+c.duration,points,7/ppf)-c.duration;start=Math.abs(l-start)<=Math.abs(r-start)?l:r;}const target=rows.find(row=>ev.clientY>=row.rect.top&&ev.clientY<row.rect.bottom);forceNewTrack=!!rows[0]&&ev.clientY<rows[0].rect.top-6;next={...c,start:Math.max(0,start),trackId:forceNewTrack?rows[0].id:target?.id||c.trackId};}
      apply(p=>placeTimelineClip(p,next,{newTrackId:dragTrackId,cleanupTrackId:dragTrackId,forceNewTrack}));
    };
    const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);window.removeEventListener('blur',blur);gestureCleanup.current=null;};
    const finish=(event:PointerEvent)=>{if(event.pointerId!==e.pointerId)return;if(event.type==='pointerup'){if(dragged){move(event);if(additive&&!started)select(group);}else if(!edge)select(additive?(selectedSet.has(c.id)?selectedIds.filter(id=>id!==c.id):[...selectedIds,c.id]):[c.id]);}cleanup();setDragScale(null);};
    const blur=()=>{cleanup();setDragScale(null);};
    gestureCleanup.current=cleanup;
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);window.addEventListener('blur',blur);
  }

  function dragFade(e:React.PointerEvent,c:Clip,field:'fadeIn'|'fadeOut'){
    if(e.button!==0||!e.isPrimary)return;
    e.preventDefault();e.stopPropagation();gestureCleanup.current?.();setSelectionBox(null);setDragScale(null);
    const handle=e.currentTarget as HTMLElement,x=e.clientX,scrollLeft=viewport.current!.scrollLeft;
    let started=false,last=c[field];
    handle.focus({preventScroll:true});handle.setPointerCapture(e.pointerId);
    const move=(event:PointerEvent)=>{
      if(event.pointerId!==e.pointerId)return;
      const delta=Math.round((event.clientX-x+viewport.current!.scrollLeft-scrollLeft)/ppf);
      if(!started&&!delta)return;
      const value=clamp(c[field]+(field==='fadeIn'?delta:-delta),0,c.duration);
      if(value===last)return;
      if(!started){checkpoint();started=true;}last=value;
      edit(p=>({...p,clips:p.clips.map(clip=>clip.id===c.id?{...clip,[field]:value}:clip)}),false);
    };
    const cleanup=()=>{
      window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cleanup);window.removeEventListener('keydown',escape,true);
      try{if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);}catch{}
      gestureCleanup.current=null;
    };
    const finish=(event:PointerEvent)=>{if(event.pointerId!==e.pointerId)return;move(event);cleanup();};
    const revert=()=>{if(started)edit(p=>({...p,clips:p.clips.map(clip=>clip.id===c.id?{...clip,[field]:c[field]}:clip)}),false);cleanup();};
    const cancel=(event:PointerEvent)=>{if(event.pointerId===e.pointerId)revert();};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();revert();}};
    gestureCleanup.current=cleanup;
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cleanup);window.addEventListener('keydown',escape,true);
  }
  function fadeKey(e:React.KeyboardEvent,c:Clip,field:'fadeIn'|'fadeOut'){
    e.stopPropagation();const direction=field==='fadeIn'?1:-1,step=e.shiftKey?FPS:1;
    const value=e.key==='ArrowRight'?c[field]+direction*step:e.key==='ArrowLeft'?c[field]-direction*step:e.key==='Home'?0:e.key==='End'?c.duration:null;
    if(value===null)return;e.preventDefault();const next=clamp(value,0,c.duration);
    if(next!==c[field])edit(p=>({...p,clips:p.clips.map(clip=>clip.id===c.id?{...clip,[field]:next}:clip)}));
  }

  function clipKey(e:React.KeyboardEvent,c:Clip){
    if(e.key==='Enter'||e.key===' '){
      e.preventDefault();e.stopPropagation();
      select(e.shiftKey||e.metaKey||e.ctrlKey?(selectedSet.has(c.id)?selectedIds.filter(id=>id!==c.id):[...selectedIds,c.id]):[c.id]);
    }
    if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&!e.metaKey&&!e.ctrlKey&&!e.altKey){
      e.preventDefault();e.stopPropagation();
      nudgeItem(c.id,(e.key==='ArrowRight'?1:-1)*(e.shiftKey?FPS:1));
    }
  }
  return <section className={`timeline ${props.coverEditing?'cover-timeline':''}`} ref={timeline} aria-label={props.coverEditing?'Cover frame timeline':'Editing timeline'}>
    <div className="timeline-resizer" role="separator" aria-label="Timeline height" aria-orientation="horizontal" aria-controls="timeline-tracks" aria-valuemin={MIN_HEIGHT} aria-valuemax={timelineSize.max} aria-valuenow={timelineSize.height} aria-valuetext={`${timelineSize.height} pixels`} tabIndex={0} data-resizing={resizing||undefined} title="Drag to resize the timeline. Double-click to reset." onPointerDown={startResize} onKeyDown={resizeKey} onDoubleClick={()=>props.resize(null)}><span/></div>
    <div className="timeline-toolbar">{props.coverEditing?<div className="cover-timeline-scope"><span className="cover-source-lock"><LockKeyhole size={12}/>Video timing locked</span></div>:<div className="tool-group" role="toolbar" aria-label="Timeline tools">
    <Tip label="Move clips · V. Drag empty space to select several clips, then drag a selected clip to move them together. Drag clip edges to trim."><Button variant="ghost" size="sm" className={'timeline-tool '+(tool==='select'?'active':'')} aria-label="Move clips · V" aria-pressed={tool==='select'} onClick={()=>setTool('select')}><MousePointer2 size={16}/><span>Move</span></Button></Tip>
    <Tip label={splitHint}><span className="tool-tip-anchor"><Button variant="outline" size="sm" className="timeline-tool split-action" aria-label="Split at playhead · S" disabled={!canSplit} onClick={split}><Scissors size={16}/><span>Split</span></Button></span></Tip>
    <Tip label={slipHint}><span className="tool-tip-anchor"><Button variant="ghost" size="sm" className={'timeline-tool '+(tool==='slip'?'active':'')} aria-label="Slip source content · Y" aria-pressed={tool==='slip'} disabled={!canSlip} onClick={()=>setTool('slip')}><BetweenHorizontalStart size={16}/><span>Slip</span></Button></span></Tip>

  </div>}
  <div className="zoom-tools"><IconButton label="Zoom out" onClick={()=>changeZoom(zoomValue.current-.25)}><Minus size={15}/></IconButton><Slider label="Timeline zoom" min={MIN_ZOOM} max={MAX_ZOOM} step={.1} value={[zoom]} onValueChange={([value])=>changeZoom(value)}/><IconButton label="Zoom in" onClick={()=>changeZoom(zoomValue.current+.25)}><Plus size={15}/></IconButton></div></div>
  <div className="timeline-scroll" id="timeline-tracks" ref={viewport} onDragEnter={event=>libraryDragOver(event)} onDragOver={event=>libraryDragOver(event)} onDrop={event=>dropMedia(event)} onDragLeave={event=>{if(event.relatedTarget instanceof Node&&event.currentTarget.contains(event.relatedTarget))return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>=rect.right||event.clientY<rect.top||event.clientY>=rect.bottom)setLibraryDrop(null);}}><div className="timeline-board" ref={board} role="group" aria-label={props.coverEditing?'Source video reference':'Timeline clips'} tabIndex={props.coverEditing?-1:0} style={{width:width+132}} onPointerDown={selectArea} onKeyDown={e=>{
    if(props.coverEditing)return;
    if(e.key==='Escape'){gestureCleanup.current?.();setSelectionBox(null);setDragScale(null);}
    if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&selectedIds.length&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!(e.target as HTMLElement).closest('.ruler,.timeline-clip,.track-label')){e.preventDefault();e.stopPropagation();edit(p=>moveSelection(p,selectedIds,(e.key==='ArrowRight'?1:-1)*(e.shiftKey?FPS:1)));}
  }}>
    <div className="ruler-row"><div className="ruler-label"><span>30 fps</span></div><div className="ruler" style={{width}} onPointerDown={scrub} aria-label={props.coverEditing?'Choose cover frame on timeline':'Scrub timeline'} role="slider" tabIndex={0} aria-valuemin={0} aria-valuemax={Math.max(0,length-1)} aria-valuenow={frame} onKeyDown={frameKey}>
      <div className="ruler-playhead" aria-hidden="true" style={{left:frame*ppf}}><span>{props.coverEditing?'Cover ':''}{time(frame,true)}</span><i/></div>
      {Array.from({length:Math.ceil(width/ppf/rulerStep)},(_,i)=>i*rulerStep).map(t=><div className="ruler-tick" key={t} style={{left:t*ppf}}><span>{time(t)}</span></div>)}
    </div></div>
    <div className={props.coverEditing?'cover-source-tracks':undefined} onPointerDown={props.coverEditing?scrub:undefined} onKeyDown={props.coverEditing?frameKey:undefined} role={props.coverEditing?'slider':undefined} tabIndex={props.coverEditing?0:undefined} aria-label={props.coverEditing?'Choose cover frame from source tracks':undefined} aria-valuemin={props.coverEditing?0:undefined} aria-valuemax={props.coverEditing?Math.max(0,length-1):undefined} aria-valuenow={props.coverEditing?frame:undefined} aria-valuetext={props.coverEditing?time(frame,true):undefined}>
    <div inert={props.coverEditing||undefined}>
    {reorder.layers.map(layer=>{
      if(layer.kind==='text')return <React.Fragment key={layer.key}><VideoTextTimeline texts={[layer.text]} snapTexts={project.texts||[]} dragHandle={reorder.handle(layer)} rowAttributes={reorder.attributes(layer.key)} rowNumber={layer.number} selectedIds={selectedIds} dragItem={dragItem} nudge={nudgeItem} toggle={toggleItem} select={props.selectText} ppf={ppf} width={width} snapping={snapping} points={[0,frame,...project.clips.flatMap(c=>[c.start,c.start+c.duration])]} edit={edit} checkpoint={checkpoint} freeze={setDragScale} registerGesture={registerCaptionGesture}/></React.Fragment>;
      if(layer.kind==='caption')return <React.Fragment key={layer.key}><CaptionTimeline layers={[layer.layer]} dragHandle={reorder.handle(layer)} rowAttributes={reorder.attributes(layer.key)} selectedIds={selectedIds} dragItem={dragItem} nudge={nudgeItem} toggle={toggleItem} select={props.selectCaption} ppf={ppf} width={width} edit={edit} checkpoint={checkpoint} freeze={setDragScale} registerGesture={registerCaptionGesture}/></React.Fragment>;
      const track=layer.track;return <div {...reorder.attributes(layer.key)} className={`track-row ${libraryDrop?.track===track.id?'library-drop-target':''}`} key={track.id} data-track-id={track.id} data-track-kind={track.kind} role="group" aria-label={`${track.name} track`} onDragEnter={event=>libraryDragOver(event,track.id)} onDragOver={event=>libraryDragOver(event,track.id)} onDrop={e=>dropMedia(e,track.id)}>
      <div className="track-label">{reorder.handle(layer)}<span className={`track-kind ${track.kind}`}>{track.kind==='video'?<Film size={16}/>:<AudioLines size={16}/>}</span><span>{track.name}</span><IconButton label={`${track.muted?'Unmute':'Mute'} ${track.name.toLowerCase()} track`} aria-pressed={track.muted} onClick={()=>edit(p=>({...p,tracks:p.tracks.map(t=>t.id===track.id?{...t,muted:!t.muted}:t)}))}>{track.muted?<VolumeX size={14}/>:<Volume2 size={14}/>}</IconButton></div>
      <div className="track-lane" style={{width}}>
      {!project.clips.some(c=>c.trackId===track.id)&&<div className="empty-track">Drop {track.kind==='video'?'a video':'audio'} here</div>}
      {project.clips.filter(c=>c.trackId===track.id).map(c=>{const a=assets.find(a=>a.id===c.assetId);if(!a)return null;const selectedClip=selectedSet.has(c.id);
        return <div key={c.id} data-clip-id={c.id} data-timeline-id={c.id} role="button" tabIndex={0} aria-label={`${c.name}, ${time(c.duration,true)}, ${c.kind} clip`} aria-pressed={selectedClip} className={`timeline-clip ${c.kind} ${selectedClip?'selected':''} ${tool==='slip'?'slip-cursor':''} ${c.hidden||c.muted||track.muted?'clip-muted':''}`} style={{left:c.start*ppf,width:Math.max(6,c.duration*ppf)}} onPointerDown={e=>drag(e,c)} onKeyDown={e=>clipKey(e,c)}>
          {c.kind==='video'?<div className="clip-filmstrip">{Array.from({length:Math.min(60,Math.ceil(c.duration*ppf/48))},(_,i)=>{const f=c.sourceIn+i*48/ppf*c.rate;const thumbnail=a.thumbnails[a.kind==='image'?0:Math.min(a.thumbnails.length-1,Math.floor(f/a.frames*a.thumbnails.length))];return <div key={i} style={{backgroundImage:thumbnail?`url("${thumbnail}")`:undefined}}/>;})}</div>:<><Waveform asset={a} clip={c}/><FadeEnvelope clip={c}/></>}
          <div className="clip-title">{c.kind==='video'?<Film size={11}/>:<AudioLines size={12}/>}<span>{c.name}</span>{c.muted&&<VolumeX size={12}/>}</div>
          <div className="clip-edge left" aria-label="Trim start" role="separator" onPointerDown={e=>drag(e,c,'left')}/><div className="clip-edge right" aria-label="Trim end" role="separator" onPointerDown={e=>drag(e,c,'right')}/>
          {c.kind==='audio'&&selectedClip&&(['fadeIn','fadeOut'] as const).map(field=>{const label=field==='fadeIn'?'Fade in':'Fade out',ratio=clamp(c[field]/Math.max(1,c.duration-1),0,1),position=field==='fadeIn'?ratio:1-ratio;return <div key={field} className="audio-fade-handle" role="slider" tabIndex={0} aria-label={`${label} duration`} aria-valuemin={0} aria-valuemax={Math.max(c.duration,c[field])/FPS} aria-valuenow={c[field]/FPS} aria-valuetext={`${(c[field]/FPS).toFixed(2)} seconds`} title={`${label}: ${(c[field]/FPS).toFixed(2)}s · Drag to adjust`} style={{left:`clamp(10px, ${position*100}%, calc(100% - 10px))`}} onPointerDown={e=>dragFade(e,c,field)} onKeyDown={e=>fadeKey(e,c,field)}><span/></div>;})}
        </div>;
      })}
      {transitions.filter(({clip})=>clip.trackId===track.id).map(({clip,previous,duration})=>{
        const name=clip.effects!.transition==='fade'?'Crossfade':clip.effects!.transition==='wipe'?'Wipe':'Slide',seconds=Number((duration/FPS).toFixed(2)),label=`${name} transition · ${seconds}s · ${previous.name} to ${clip.name}`;
        return <div key={`transition-${clip.id}`} className={`timeline-transition ${selectedSet.has(clip.id)?'is-selected':''}`} data-transition-for={clip.id} style={{left:clip.start*ppf,width:duration*ppf}}>
          <span className="transition-duration-range" aria-hidden="true"/>
          <Tip label={`${label} · Edit in Between`}><IconButton className="transition-marker" label={label} onPointerDown={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();props.openTransition(clip.id);}}><Blend size={13}/></IconButton></Tip>
          <span className="transition-duration-label" aria-hidden="true">{seconds}s</span>
        </div>;
      })}</div>
    </div>;})}
    </div></div>
    {libraryDrop&&<div className="library-drop-line" style={{left:132+libraryDrop.frame*ppf}}><span>{time(libraryDrop.frame,true)}</span></div>}
    <div className="playhead" aria-hidden="true" style={{left:132+frame*ppf,height:'calc(100% - 4px)'}}/>
    {selectionBox&&<div className="timeline-selection-box" aria-hidden="true" style={selectionBox}/>}
  </div></div><div className="timeline-footer"><div className="timeline-status"><IconButton label="Keyboard shortcuts" onClick={props.showShortcuts}><Keyboard size={14}/></IconButton></div><span role="status" aria-live="polite">{props.coverEditing?'Source reference · ':selectedIds.length>1?`${selectedIds.length} selected · `:''}{timelineItems(project).length} items <span className="muted">·</span> {time(length,true)} total</span></div></section>;
}
