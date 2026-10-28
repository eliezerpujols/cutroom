import React,{useEffect,useRef} from 'react';
import {ClosedCaption,Eye,EyeOff} from 'lucide-react';
import {IconButton} from './ui/primitives';
import {FPS,clamp,type Project} from './model';
import {cueText,resizeCaptionCue,type CaptionCue,type CaptionLayer,type CaptionSelection} from './captions';

type Props={layers:CaptionLayer[];selection:CaptionSelection;select:(value:CaptionSelection)=>void;ppf:number;width:number;edit:(change:(p:Project)=>Project,record?:boolean)=>void;checkpoint:()=>void;freeze:(value:number|null)=>void;registerGesture:(cleanup:(()=>void)|null)=>void};
export const CaptionTimeline=React.memo(function CaptionTimeline({layers,selection,select,ppf,width,edit,checkpoint,freeze,registerGesture}:Props){
  const gesture=useRef<(()=>void)|null>(null);useEffect(()=>()=>gesture.current?.(),[]);
  function start(event:React.PointerEvent,layer:CaptionLayer,cue:CaptionCue,edge?:'left'|'right'){
    if(event.button!==0||!event.isPrimary)return;event.stopPropagation();event.preventDefault();gesture.current?.();select({layerId:layer.id,cueId:cue.id});
    const element=event.currentTarget as HTMLElement,x=event.clientX,scroller=element.closest<HTMLElement>('.timeline-scroll')!,scrollLeft=scroller.scrollLeft;
    let started=false,lastDelta=0;const original=layer.cues;
    element.focus({preventScroll:true});element.setPointerCapture(event.pointerId);
    const move=(next:PointerEvent)=>{
      if(next.pointerId!==event.pointerId)return;const delta=Math.round((next.clientX-x+scroller.scrollLeft-scrollLeft)/ppf);if(delta===lastDelta)return;lastDelta=delta;
      let changed:CaptionCue;
      if(edge==='left'){const shift=clamp(delta,-cue.start,cue.duration-1);changed={...resizeCaptionCue(cue,cue.duration-shift),start:cue.start+shift};}
      else if(edge==='right')changed=resizeCaptionCue(cue,cue.duration+delta);
      else changed={...cue,start:clamp(cue.start+delta,0,108000)};
      if(!started){checkpoint();started=true;freeze(ppf);}
      edit(p=>({...p,captions:p.captions?.map(item=>item.id===layer.id?{...item,cues:original.map(c=>c.id===cue.id?changed:c).sort((a,b)=>a.start-b.start)}:item)}),false);
    };
    const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',blur);try{if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);}catch{}gesture.current=null;registerGesture(null);freeze(null);};
    const finish=(next:PointerEvent)=>{if(next.pointerId!==event.pointerId)return;move(next);cleanup();freeze(null);};
    const revert=()=>{if(started)edit(p=>({...p,captions:p.captions?.map(item=>item.id===layer.id?{...item,cues:original}:item)}),false);cleanup();freeze(null);};
    const cancel=(next:PointerEvent)=>{if(next.pointerId===event.pointerId)revert();};
    const escape=(next:KeyboardEvent)=>{if(next.key==='Escape'){next.preventDefault();next.stopPropagation();revert();}};
    const blur=()=>{cleanup();freeze(null);};gesture.current=cleanup;registerGesture(cleanup);
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape,true);window.addEventListener('blur',blur);
  }
  return <>{layers.map(layer=><div className="track-row caption-track-row" key={layer.id} role="group" aria-label={`${layer.name} track`}>
    <div className="track-label"><button className="caption-track-name" onClick={()=>select({layerId:layer.id})}><ClosedCaption size={16}/><span>{layer.name}</span></button><IconButton label={`${layer.muted?'Show':'Hide'} ${layer.name}`} aria-pressed={!layer.muted} onClick={()=>edit(p=>({...p,captions:p.captions?.map(item=>item.id===layer.id?{...item,muted:!item.muted}:item)}))}>{layer.muted?<EyeOff size={14}/>:<Eye size={14}/>}</IconButton></div>
    <div className="track-lane" style={{width}}>{layer.cues.map(cue=><div key={cue.id} data-caption-id={cue.id} role="button" tabIndex={0} className={`timeline-clip caption-clip ${selection?.cueId===cue.id?'selected':''} ${layer.muted?'caption-hidden':''}`} aria-label={`Caption: ${cueText(cue)}`} aria-pressed={selection?.cueId===cue.id} style={{left:cue.start*ppf,width:Math.max(6,cue.duration*ppf)}} onPointerDown={event=>start(event,layer,cue)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.stopPropagation();event.preventDefault();select({layerId:layer.id,cueId:cue.id});}if(event.key==='Delete'||event.key==='Backspace'){event.stopPropagation();event.preventDefault();select({layerId:layer.id});edit(p=>({...p,captions:p.captions?.map(item=>item.id===layer.id?{...item,cues:item.cues.filter(current=>current.id!==cue.id)}:item)}));}if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.stopPropagation();event.preventDefault();select({layerId:layer.id,cueId:cue.id});const delta=(event.key==='ArrowRight'?1:-1)*(event.shiftKey?FPS:1);edit(p=>({...p,captions:p.captions?.map(item=>item.id===layer.id?{...item,cues:item.cues.map(c=>c.id===cue.id?{...c,start:clamp(c.start+delta,0,108000)}:c).sort((a,b)=>a.start-b.start)}:item)}));}}}>
      <div className="caption-clip-text">{cueText(cue)||'Empty caption'}</div><div className="clip-edge left" role="separator" aria-label="Resize caption start" onPointerDown={event=>start(event,layer,cue,'left')}/><div className="clip-edge right" role="separator" aria-label="Resize caption end" onPointerDown={event=>start(event,layer,cue,'right')}/>
    </div>)}</div>
  </div>)}</>;
});
