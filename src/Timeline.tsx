import React,{useEffect,useRef,useState} from 'react';
import {Film,Volume2,VolumeX,AudioLines,Plus,Minus,Scan,MousePointer2,Scissors,BetweenHorizontalStart,Magnet,Keyboard} from 'lucide-react';
import {Button,IconButton,Slider,Tip} from './ui/primitives';
import {FPS,clamp,endFrame,time,trimClip,slipClip,snapFrame,type Asset,type Clip,type Project,type Tool} from './model';

type Props={project:Project;assets:Asset[];selected:string|null;select:(id:string|null)=>void;frame:number;seek:(f:number)=>void;tool:Tool;setTool:(t:Tool)=>void;edit:(fn:(p:Project)=>Project,record?:boolean)=>void;checkpoint:()=>void;split:(id:string,at:number)=>void;add:(id:string,at:number,trackId?:string)=>void;showShortcuts:()=>void;};
export function Waveform({asset,clip}:{asset:Asset;clip:Clip}){
  const count=240;
  return <svg className="waveform" viewBox={`0 0 ${count*3} 48`} preserveAspectRatio="none" aria-hidden="true">{Array.from({length:count},(_,i)=>{
    const start=Math.floor((clip.sourceIn+i/count*clip.duration*clip.rate)/asset.frames*asset.peaks.length);
    const end=Math.max(start+1,Math.floor((clip.sourceIn+(i+1)/count*clip.duration*clip.rate)/asset.frames*asset.peaks.length));
    const peak=asset.peaks.slice(Math.max(0,start),Math.min(asset.peaks.length,end)).reduce((a,b)=>Math.max(a,b),0);
    const h=Math.max(2,Math.pow(peak,.62)*42);return <rect key={i} x={i*3} y={24-h/2} width="1.8" height={h} rx=".8"/>;
  })}</svg>;
}
export function Timeline(props:Props){
  const {project,assets,selected,select,frame,seek,tool,setTool,edit,checkpoint,split,add}=props;
  const viewport=useRef<HTMLDivElement>(null),board=useRef<HTMLDivElement>(null);
  const [zoom,setZoom]=useState(1),[available,setAvailable]=useState(800),[snapping,setSnapping]=useState(true);
  const length=endFrame(project);const extent=Math.max(length,FPS*8);
  const base=Math.max(.45,(available-48)/extent);const ppf=base*zoom;const width=Math.max(available,extent*ppf+24);
  useEffect(()=>{if(!viewport.current)return;const obs=new ResizeObserver(([e])=>setAvailable(Math.max(200,e.contentRect.width-132)));obs.observe(viewport.current);return()=>obs.disconnect();},[]);
  const rulerStep=ppf*FPS<25?120:ppf*FPS<70?60:30;
  const selectedClip=project.clips.find(c=>c.id===selected);
  const selectedAsset=assets.find(a=>a.id===selectedClip?.assetId);
  const noSlipRoom=!!selectedClip&&!!selectedAsset&&selectedAsset.frames-selectedClip.duration*selectedClip.rate<1;
  function pointerFrame(clientX:number){const rect=board.current!.getBoundingClientRect();return clamp(Math.round((clientX-rect.left-132)/ppf),0,length-1);}
  function scrub(e:React.PointerEvent){if(e.button!==0)return;e.preventDefault();seek(pointerFrame(e.clientX));e.currentTarget.setPointerCapture(e.pointerId);
    const move=(ev:PointerEvent)=>seek(pointerFrame(ev.clientX));const finish=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish,{once:true});}
  function drag(e:React.PointerEvent,c:Clip,edge?:'left'|'right'){
    if(e.button!==0)return;e.stopPropagation();e.preventDefault();select(c.id);
    if(tool==='split'&&!edge){split(c.id,pointerFrame(e.clientX));return;}
    const a=assets.find(a=>a.id===c.assetId)!;const x=e.clientX;let started=false;
    const points=[0,frame,...project.clips.filter(v=>v.id!==c.id).flatMap(v=>[v.start,v.start+v.duration])];
    const move=(ev:PointerEvent)=>{
      if(!started&&Math.abs(ev.clientX-x)<2)return;
      if(!started){checkpoint();started=true;}
      let delta=Math.round((ev.clientX-x)/ppf);let next:Clip;
      if(edge){if(snapping&&!ev.shiftKey){const target=(edge==='left'?c.start:c.start+c.duration)+delta;delta+=snapFrame(target,points,7/ppf)-target;}next=trimClip(c,delta,edge,a);}
      else if(tool==='slip')next=slipClip(c,delta,a);
      else {let start=Math.max(0,c.start+delta);if(snapping&&!ev.shiftKey){const l=snapFrame(start,points,7/ppf),r=snapFrame(start+c.duration,points,7/ppf)-c.duration;start=Math.abs(l-start)<=Math.abs(r-start)?l:r;}next={...c,start:Math.max(0,start)};}
      edit(p=>({...p,clips:p.clips.map(v=>v.id===c.id?next:v)}),false);
    };
    const finish=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish,{once:true});window.addEventListener('pointercancel',finish,{once:true});
  }
  return <section className="timeline" aria-label="Editing timeline"><div className="timeline-toolbar"><div className="tool-group" role="toolbar" aria-label="Timeline tools">
    {([{id:'select',icon:MousePointer2,label:'Select · V'},{id:'split',icon:Scissors,label:'Split · S'},{id:'slip',icon:BetweenHorizontalStart,label:'Slip · Y'}] as const).map(({id,icon:Icon,label})=><IconButton key={id} label={label} aria-pressed={tool===id} className={tool===id?'active':''} onClick={()=>setTool(id)}><Icon size={17}/></IconButton>)}
    <span className="toolbar-divider"/><IconButton label="Snap to clip edges" aria-pressed={snapping} className={snapping?'snap-active':''} onClick={()=>setSnapping(v=>!v)}><Magnet size={16}/></IconButton>
  </div><span className="timeline-guidance">{tool==='slip'?(noSlipRoom?'Trim a clip first to make room for a slip edit.':'Slide the content inside a clip. Its position stays put.'):tool==='split'?'Click a clip where you want to cut.':'Drag edges to trim. Drag a clip to move it.'}</span>
  <div className="zoom-tools"><IconButton label="Zoom out" onClick={()=>setZoom(v=>Math.max(.5,v-.25))}><Minus size={15}/></IconButton><Slider label="Timeline zoom" min={.5} max={5} step={.1} value={[zoom]} onValueChange={([v])=>setZoom(v)}/><IconButton label="Zoom in" onClick={()=>setZoom(v=>Math.min(5,v+.25))}><Plus size={15}/></IconButton><IconButton label="Fit timeline" onClick={()=>setZoom(1)}><Scan size={16}/></IconButton></div></div>
  <div className="timeline-scroll" ref={viewport}><div className="timeline-board" ref={board} style={{width:width+132}}>
    <div className="ruler-row"><div className="ruler-label">TIMELINE <span>30 fps</span></div><div className="ruler" style={{width}} onPointerDown={scrub} aria-label="Scrub timeline" role="slider" tabIndex={0} aria-valuemin={0} aria-valuemax={Math.max(0,length-1)} aria-valuenow={frame} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();seek(clamp(frame+1,0,length-1));}if(e.key==='ArrowLeft'){e.preventDefault();seek(Math.max(0,frame-1));}}}>
      {Array.from({length:Math.ceil(width/ppf/rulerStep)},(_,i)=>i*rulerStep).map(t=><div className="ruler-tick" key={t} style={{left:t*ppf}}><span>{time(t)}</span></div>)}
    </div></div>
    {project.tracks.map(track=><div className="track-row" key={track.id} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';}} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('application/cutroom-asset');if(id)add(id,pointerFrame(e.clientX),track.id);}}>
      <div className="track-label"><span className={`track-kind ${track.kind}`}>{track.kind==='video'?<Film size={16}/>:<AudioLines size={16}/>}</span><span>{track.name}</span><IconButton label={`${track.muted?'Unmute':'Mute'} ${track.name.toLowerCase()} track`} aria-pressed={track.muted} onClick={()=>edit(p=>({...p,tracks:p.tracks.map(t=>t.id===track.id?{...t,muted:!t.muted}:t)}))}>{track.muted?<VolumeX size={14}/>:<Volume2 size={14}/>}</IconButton></div>
      <div className="track-lane" style={{width}} onPointerDown={e=>{if(e.target===e.currentTarget){select(null);scrub(e);}}}>
      {!project.clips.some(c=>c.trackId===track.id)&&<div className="empty-track">Drop {track.kind==='video'?'a video':'audio'} here</div>}
      {project.clips.filter(c=>c.trackId===track.id).map(c=>{const a=assets.find(a=>a.id===c.assetId);if(!a)return null;const selectedClip=c.id===selected;
        return <div key={c.id} role="button" tabIndex={0} aria-label={`${c.name}, ${time(c.duration,true)}, ${c.kind} clip`} aria-pressed={selectedClip} className={`timeline-clip ${c.kind} ${selectedClip?'selected':''} ${tool==='slip'?'slip-cursor':''} ${c.muted||track.muted?'clip-muted':''}`} style={{left:c.start*ppf,width:Math.max(6,c.duration*ppf)}} onPointerDown={e=>drag(e,c)} onKeyDown={e=>{if(e.key==='Enter')select(c.id);if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const delta=e.key==='ArrowRight'?1:-1;edit(p=>({...p,clips:p.clips.map(v=>v.id===c.id?{...v,start:Math.max(0,v.start+delta*(e.shiftKey?30:1))}:v)}));}}}>
          {c.kind==='video'?<div className="clip-filmstrip">{Array.from({length:Math.min(60,Math.ceil(c.duration*ppf/48))},(_,i)=>{const f=c.sourceIn+i*48/ppf*c.rate;const thumbnail=a.thumbnails[Math.min(a.thumbnails.length-1,Math.floor(f/a.frames*a.thumbnails.length))];return <div key={i} style={{backgroundImage:thumbnail?`url("${thumbnail}")`:undefined}}/>;})}</div>:<Waveform asset={a} clip={c}/>}
          <div className="clip-title">{c.kind==='video'?<Film size={11}/>:<AudioLines size={12}/>}<span>{c.name}</span>{c.muted&&<VolumeX size={12}/>}</div>
          <div className="clip-edge left" aria-label="Trim start" role="separator" onPointerDown={e=>drag(e,c,'left')}/><div className="clip-edge right" aria-label="Trim end" role="separator" onPointerDown={e=>drag(e,c,'right')}/>
        </div>;
      })}</div>
    </div>)}
    <div className="playhead" style={{left:132+frame*ppf,height:'calc(100% - 4px)'}}><span>{time(frame,true)}</span><i/></div>
  </div></div><div className="timeline-footer"><div className="timeline-status"><span className="local-status"><span className="status-dot"/>All edits stay on this computer</span><IconButton label="Keyboard shortcuts" onClick={props.showShortcuts}><Keyboard size={14}/></IconButton></div><span>{project.clips.length} clips <span className="muted">·</span> {time(length,true)} total</span></div></section>;
}
