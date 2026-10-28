import React,{useEffect,useRef,useState} from 'react';
import {Film,Volume2,VolumeX,AudioLines,Plus,Minus,Scan,MousePointer2,Scissors,BetweenHorizontalStart,Magnet,Keyboard} from 'lucide-react';
import {Button,IconButton,Slider,Tip} from './ui/primitives';
import {placeTimelineClip} from './videoTracks';
import {moveSelection,snapSelectionDelta} from './timelineSelection';
import {FPS,clamp,endFrame,time,uid,trimClip,slipClip,splitTarget,snapFrame,type Asset,type Clip,type Project,type Tool} from './model';

type Props={project:Project;assets:Asset[];selectedIds:string[];select:(ids:string[])=>void;frame:number;seek:(f:number)=>void;tool:Tool;setTool:(t:Tool)=>void;edit:(fn:(p:Project)=>Project,record?:boolean)=>void;checkpoint:()=>void;split:()=>void;add:(id:string,at:number,trackId?:string)=>void;showShortcuts:()=>void;};
type SelectionBox={left:number;top:number;width:number;height:number};
export const Waveform=React.memo(function Waveform({asset,clip}:{asset:Asset;clip:Clip}){
  const count=240;
  return <svg className="waveform" viewBox={`0 0 ${count*3} 48`} preserveAspectRatio="none" aria-hidden="true">{Array.from({length:count},(_,i)=>{
    const start=Math.floor((clip.sourceIn+i/count*clip.duration*clip.rate)/asset.frames*asset.peaks.length);
    const end=Math.max(start+1,Math.floor((clip.sourceIn+(i+1)/count*clip.duration*clip.rate)/asset.frames*asset.peaks.length));
    const peak=asset.peaks.slice(Math.max(0,start),Math.min(asset.peaks.length,end)).reduce((a,b)=>Math.max(a,b),0);
    const h=Math.max(2,Math.pow(peak,.62)*42);return <rect key={i} x={i*3} y={24-h/2} width="1.8" height={h} rx=".8"/>;
  })}</svg>;
});
export function Timeline(props:Props){
  const {project,assets,selectedIds,select,frame,seek,tool,setTool,edit,checkpoint,split,add}=props;
  const selected=selectedIds.length===1?selectedIds[0]:null;
  const selectedSet=new Set(selectedIds);
  const viewport=useRef<HTMLDivElement>(null),board=useRef<HTMLDivElement>(null);
  const gestureCleanup=useRef<(()=>void)|null>(null);
  const [selectionBox,setSelectionBox]=useState<SelectionBox|null>(null),[dragScale,setDragScale]=useState<number|null>(null);
  const [zoom,setZoom]=useState(1),[available,setAvailable]=useState(800),[snapping,setSnapping]=useState(true);
  const length=endFrame(project);const extent=Math.max(length,FPS*8);
  const base=Math.max(.45,(available-48)/extent);const ppf=dragScale??base*zoom;const width=Math.max(available,extent*ppf+24);
  useEffect(()=>()=>gestureCleanup.current?.(),[]);
  useEffect(()=>{if(!viewport.current)return;const obs=new ResizeObserver(([e])=>setAvailable(Math.max(200,e.contentRect.width-132)));obs.observe(viewport.current);return()=>obs.disconnect();},[]);
  const rulerStep=ppf*FPS<25?120:ppf*FPS<70?60:30;
  const selectedClip=project.clips.find(c=>c.id===selected);
  const selectedAsset=assets.find(a=>a.id===selectedClip?.assetId);
  const canSlip=!!selectedClip&&!!selectedAsset&&selectedAsset.frames-selectedClip.duration*selectedClip.rate>=1;
  const canSplit=selectedIds.length<2&&!!splitTarget(project,selected,frame);
  const splitHint=selectedIds.length>1?'Select one clip to split at the playhead.':canSplit?'Split at the playhead · S or ⌘B':selectedClip?'Move the playhead inside the selected clip to split.':'Move the playhead inside a clip to split.';
  const slipHint=!selectedClip?'Select a clip to change its source content.':!canSlip?'Trim this clip first to make room for a slip edit.':'Slip source content · Y. Drag inside the clip; its position stays fixed.';
  function pointerFrame(clientX:number){const rect=board.current!.getBoundingClientRect();return clamp(Math.round((clientX-rect.left-132)/ppf),0,length-1);}
  function scrub(e:React.PointerEvent){if(e.button!==0)return;e.preventDefault();seek(pointerFrame(e.clientX));e.currentTarget.setPointerCapture(e.pointerId);
    const move=(ev:PointerEvent)=>seek(pointerFrame(ev.clientX));const finish=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish,{once:true});}

  function selectArea(e:React.PointerEvent){
    if(e.button!==0||(e.target as HTMLElement).closest('.timeline-clip,.track-label,.ruler-row'))return;
    e.preventDefault();e.stopPropagation();gestureCleanup.current?.();
    board.current!.focus({preventScroll:true});setTool('select');setDragScale(null);
    const element=board.current!,scroller=viewport.current!;
    const initialRect=element.getBoundingClientRect(),x=e.clientX,y=e.clientY;
    const origin={x:x-initialRect.left,y:y-initialRect.top};
    const additive=e.shiftKey||e.metaKey||e.ctrlKey,previous=[...selectedIds];
    const boxes=Array.from(element.querySelectorAll<HTMLElement>('[data-clip-id]')).map(clip=>{
      const rect=clip.getBoundingClientRect();
      return {id:clip.dataset.clipId!,left:rect.left-initialRect.left,right:rect.right-initialRect.left,top:rect.top-initialRect.top,bottom:rect.bottom-initialRect.top};
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
      scroller.scrollTop+=speed(lastY,rect.top,rect.bottom);
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
      window.removeEventListener('blur',blur);
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
    gestureCleanup.current=cleanup;
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',blur);
  }

  function drag(e:React.PointerEvent,c:Clip,edge?:'left'|'right'){
    if(e.button!==0)return;e.stopPropagation();e.preventDefault();gestureCleanup.current?.();setSelectionBox(null);board.current?.focus({preventScroll:true});
    const additive=!edge&&(e.shiftKey||e.metaKey||e.ctrlKey);
    const group=!edge&&tool==='select'?(selectedSet.has(c.id)?selectedIds:additive?[...selectedIds,c.id]:[c.id]):[c.id];
    if(edge||(!additive&&!selectedSet.has(c.id)))select([c.id]);
    const moving=project.clips.filter(clip=>group.includes(clip.id));
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
      else {let start=Math.max(0,c.start+delta);if(snapping&&!ev.shiftKey){const l=snapFrame(start,points,7/ppf),r=snapFrame(start+c.duration,points,7/ppf)-c.duration;start=Math.abs(l-start)<=Math.abs(r-start)?l:r;}const target=rows.find(row=>ev.clientY>=row.rect.top&&ev.clientY<row.rect.bottom);forceNewTrack=c.kind==='video'&&!!rows[0]&&ev.clientY<rows[0].rect.top-6;next={...c,start:Math.max(0,start),trackId:forceNewTrack?rows[0].id:target?.id||c.trackId};}
      apply(p=>placeTimelineClip(p,next,{newTrackId:dragTrackId,cleanupTrackId:dragTrackId,forceNewTrack}));
    };
    const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);window.removeEventListener('blur',blur);gestureCleanup.current=null;};
    const finish=(event:PointerEvent)=>{if(event.pointerId!==e.pointerId)return;if(event.type==='pointerup'){if(dragged){move(event);if(additive&&!started)select(group);}else if(!edge)select(additive?(selectedSet.has(c.id)?selectedIds.filter(id=>id!==c.id):[...selectedIds,c.id]):[c.id]);}cleanup();setDragScale(null);};
    const blur=()=>{cleanup();setDragScale(null);};
    gestureCleanup.current=cleanup;
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);window.addEventListener('blur',blur);
  }

  function clipKey(e:React.KeyboardEvent,c:Clip){
    if(e.key==='Enter'||e.key===' '){
      e.preventDefault();e.stopPropagation();
      select(e.shiftKey||e.metaKey||e.ctrlKey?(selectedSet.has(c.id)?selectedIds.filter(id=>id!==c.id):[...selectedIds,c.id]):[c.id]);
    }
    if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&!e.metaKey&&!e.ctrlKey&&!e.altKey){
      e.preventDefault();e.stopPropagation();
      const group=selectedSet.has(c.id)?selectedIds:[c.id];
      if(!selectedSet.has(c.id))select(group);
      edit(p=>moveSelection(p,group,(e.key==='ArrowRight'?1:-1)*(e.shiftKey?FPS:1)));
    }
  }
  return <section className="timeline" aria-label="Editing timeline"><div className="timeline-toolbar"><div className="tool-group" role="toolbar" aria-label="Timeline tools">
    <Tip label="Move clips · V. Drag empty space to select several clips, then drag a selected clip to move them together. Drag clip edges to trim."><Button variant="ghost" size="sm" className={'timeline-tool '+(tool==='select'?'active':'')} aria-label="Move clips · V" aria-pressed={tool==='select'} onClick={()=>setTool('select')}><MousePointer2 size={16}/><span>Move</span></Button></Tip>
    <Tip label={splitHint}><span className="tool-tip-anchor"><Button variant="outline" size="sm" className="timeline-tool split-action" aria-label="Split at playhead · S" disabled={!canSplit} onClick={split}><Scissors size={16}/><span>Split</span></Button></span></Tip>
    <Tip label={slipHint}><span className="tool-tip-anchor"><Button variant="ghost" size="sm" className={'timeline-tool '+(tool==='slip'?'active':'')} aria-label="Slip source content · Y" aria-pressed={tool==='slip'} disabled={!canSlip} onClick={()=>setTool('slip')}><BetweenHorizontalStart size={16}/><span>Slip</span></Button></span></Tip>
    <span className="toolbar-divider"/><IconButton label="Snap to clip edges" aria-pressed={snapping} className={snapping?'snap-active':''} onClick={()=>setSnapping(v=>!v)}><Magnet size={16}/></IconButton>
  </div><span className="timeline-guidance">{selectedIds.length>1?`${selectedIds.length} selected · Drag any selected clip to move together.`:tool==='slip'?'Drag inside the clip to change its source content.':!project.clips.length?'Add media to start editing.':'Drag empty space to select. Drag clips to move.'}</span>
  <div className="zoom-tools"><IconButton label="Zoom out" onClick={()=>setZoom(v=>Math.max(.5,v-.25))}><Minus size={15}/></IconButton><Slider label="Timeline zoom" min={.5} max={5} step={.1} value={[zoom]} onValueChange={([v])=>setZoom(v)}/><IconButton label="Zoom in" onClick={()=>setZoom(v=>Math.min(5,v+.25))}><Plus size={15}/></IconButton><IconButton label="Fit timeline" onClick={()=>setZoom(1)}><Scan size={16}/></IconButton></div></div>
  <div className="timeline-scroll" ref={viewport}><div className="timeline-board" ref={board} role="group" aria-label="Timeline clips" tabIndex={0} style={{width:width+132}} onPointerDown={selectArea} onKeyDown={e=>{
    if(e.key==='Escape'){gestureCleanup.current?.();setSelectionBox(null);setDragScale(null);}
    if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&selectedIds.length&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!(e.target as HTMLElement).closest('.ruler,.timeline-clip,.track-label')){e.preventDefault();e.stopPropagation();edit(p=>moveSelection(p,selectedIds,(e.key==='ArrowRight'?1:-1)*(e.shiftKey?FPS:1)));}
  }}>
    <div className="ruler-row"><div className="ruler-label">TIMELINE <span>30 fps</span></div><div className="ruler" style={{width}} onPointerDown={scrub} aria-label="Scrub timeline" role="slider" tabIndex={0} aria-valuemin={0} aria-valuemax={Math.max(0,length-1)} aria-valuenow={frame} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();seek(clamp(frame+1,0,length-1));}if(e.key==='ArrowLeft'){e.preventDefault();seek(Math.max(0,frame-1));}}}>
      {Array.from({length:Math.ceil(width/ppf/rulerStep)},(_,i)=>i*rulerStep).map(t=><div className="ruler-tick" key={t} style={{left:t*ppf}}><span>{time(t)}</span></div>)}
    </div></div>
    {project.tracks.map(track=><div className="track-row" key={track.id} data-track-id={track.id} data-track-kind={track.kind} role="group" aria-label={`${track.name} track`} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';}} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('application/cutroom-asset');if(id)add(id,pointerFrame(e.clientX),track.id);}}>
      <div className="track-label"><span className={`track-kind ${track.kind}`}>{track.kind==='video'?<Film size={16}/>:<AudioLines size={16}/>}</span><span>{track.name}</span><IconButton label={`${track.muted?'Unmute':'Mute'} ${track.name.toLowerCase()} track`} aria-pressed={track.muted} onClick={()=>edit(p=>({...p,tracks:p.tracks.map(t=>t.id===track.id?{...t,muted:!t.muted}:t)}))}>{track.muted?<VolumeX size={14}/>:<Volume2 size={14}/>}</IconButton></div>
      <div className="track-lane" style={{width}}>
      {!project.clips.some(c=>c.trackId===track.id)&&<div className="empty-track">Drop {track.kind==='video'?'a video':'audio'} here</div>}
      {project.clips.filter(c=>c.trackId===track.id).map(c=>{const a=assets.find(a=>a.id===c.assetId);if(!a)return null;const selectedClip=selectedSet.has(c.id);
        return <div key={c.id} data-clip-id={c.id} role="button" tabIndex={0} aria-label={`${c.name}, ${time(c.duration,true)}, ${c.kind} clip`} aria-pressed={selectedClip} className={`timeline-clip ${c.kind} ${selectedClip?'selected':''} ${tool==='slip'?'slip-cursor':''} ${c.muted||track.muted?'clip-muted':''}`} style={{left:c.start*ppf,width:Math.max(6,c.duration*ppf)}} onPointerDown={e=>drag(e,c)} onKeyDown={e=>clipKey(e,c)}>
          {c.kind==='video'?<div className="clip-filmstrip">{Array.from({length:Math.min(60,Math.ceil(c.duration*ppf/48))},(_,i)=>{const f=c.sourceIn+i*48/ppf*c.rate;const thumbnail=a.thumbnails[Math.min(a.thumbnails.length-1,Math.floor(f/a.frames*a.thumbnails.length))];return <div key={i} style={{backgroundImage:thumbnail?`url("${thumbnail}")`:undefined}}/>;})}</div>:<Waveform asset={a} clip={c}/>}
          <div className="clip-title">{c.kind==='video'?<Film size={11}/>:<AudioLines size={12}/>}<span>{c.name}</span>{c.muted&&<VolumeX size={12}/>}</div>
          <div className="clip-edge left" aria-label="Trim start" role="separator" onPointerDown={e=>drag(e,c,'left')}/><div className="clip-edge right" aria-label="Trim end" role="separator" onPointerDown={e=>drag(e,c,'right')}/>
        </div>;
      })}</div>
    </div>)}
    <div className="playhead" style={{left:132+frame*ppf,height:'calc(100% - 4px)'}}><span>{time(frame,true)}</span><i/></div>
    {selectionBox&&<div className="timeline-selection-box" aria-hidden="true" style={selectionBox}/>}
  </div></div><div className="timeline-footer"><div className="timeline-status"><span className="local-status"><span className="status-dot"/>All edits stay on this computer</span><IconButton label="Keyboard shortcuts" onClick={props.showShortcuts}><Keyboard size={14}/></IconButton></div><span role="status" aria-live="polite">{selectedIds.length>1?`${selectedIds.length} selected · `:''}{project.clips.length} clips <span className="muted">·</span> {time(length,true)} total</span></div></section>;
}
