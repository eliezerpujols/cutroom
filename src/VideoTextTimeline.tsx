import React,{useEffect,useRef} from 'react';
import {Eye,EyeOff,Type} from 'lucide-react';
import {IconButton} from './ui/primitives';
import {FPS,clamp,snapFrame,type Project} from './model';
import type {VideoText} from './videoText';

type Props={texts:VideoText[];selected:string|null;select:(id:string|null)=>void;ppf:number;width:number;snapping:boolean;points:number[];edit:(change:(p:Project)=>Project,record?:boolean)=>void;checkpoint:()=>void;freeze:(value:number|null)=>void;registerGesture:(cleanup:(()=>void)|null)=>void};
export function VideoTextTimeline({texts,selected,select,ppf,width,snapping,points,edit,checkpoint,freeze,registerGesture}:Props){
  const gesture=useRef<(()=>void)|null>(null);useEffect(()=>()=>gesture.current?.(),[]);
  const update=(text:VideoText,record=true)=>edit(project=>({...project,texts:project.texts?.map(item=>item.id===text.id?text:item)}),record);
  function start(event:React.PointerEvent,text:VideoText,edge?:'left'|'right'){
    if(event.button!==0||!event.isPrimary)return;event.preventDefault();event.stopPropagation();gesture.current?.();select(text.id);
    const element=event.currentTarget as HTMLElement,scroller=element.closest<HTMLElement>('.timeline-scroll')!,scroll=scroller.scrollLeft,x=event.clientX;
    const snapPoints=[...points,...texts.filter(item=>item.id!==text.id).flatMap(item=>[item.start,item.start+item.duration])];
    let began=false,last=0;element.focus({preventScroll:true});element.setPointerCapture(event.pointerId);
    const move=(next:PointerEvent)=>{
      if(next.pointerId!==event.pointerId)return;let delta=Math.round((next.clientX-x+scroller.scrollLeft-scroll)/ppf);if(delta===last)return;last=delta;
      let changed:VideoText;
      if(edge==='left'){
        const raw=text.start+delta,at=snapping&&!next.shiftKey?snapFrame(raw,snapPoints,8/ppf):raw,shift=clamp(at-text.start,Math.max(-text.start,text.duration-108000),Math.min(text.duration-1,108000-text.start));changed={...text,start:text.start+shift,duration:text.duration-shift};
      }else if(edge==='right'){
        const raw=text.start+text.duration+delta,at=snapping&&!next.shiftKey?snapFrame(raw,snapPoints,8/ppf):raw;changed={...text,duration:clamp(at-text.start,1,108000)};
      }else{
        const raw=text.start+delta,at=snapping&&!next.shiftKey?snapFrame(raw,[...snapPoints,...snapPoints.map(point=>point-text.duration)],8/ppf):raw;changed={...text,start:clamp(at,0,108000)};
      }
      if(!began){checkpoint();began=true;freeze(ppf);}update(changed,false);
    };
    const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',cleanup);try{if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);}catch{}gesture.current=null;registerGesture(null);freeze(null);};
    const up=(next:PointerEvent)=>{if(next.pointerId!==event.pointerId)return;move(next);cleanup();};const revert=()=>{if(began)update(text,false);cleanup();};const cancel=(next:PointerEvent)=>{if(next.pointerId===event.pointerId)revert();};const escape=(next:KeyboardEvent)=>{if(next.key==='Escape'){next.preventDefault();next.stopPropagation();revert();}};
    gesture.current=cleanup;registerGesture(cleanup);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape,true);window.addEventListener('blur',cleanup);
  }
  return <>{texts.map((text,index)=><div className="track-row video-text-track-row" key={text.id} role="group" aria-label={`Text ${index+1} track`}><div className="track-label"><button className="caption-track-name" onClick={()=>select(text.id)}><Type size={16}/><span>Text {index+1}</span></button><IconButton label={text.muted?'Show text':'Hide text'} aria-pressed={!text.muted} onClick={()=>update({...text,muted:!text.muted})}>{text.muted?<EyeOff size={14}/>:<Eye size={14}/>}</IconButton></div><div className="track-lane" style={{width}}><div data-text-id={text.id} className={`timeline-clip video-text-clip ${selected===text.id?'selected':''} ${text.muted?'caption-hidden':''}`} role="button" tabIndex={0} aria-label={`Text: ${text.text||'Empty text'}`} aria-pressed={selected===text.id} style={{left:text.start*ppf,width:Math.max(6,text.duration*ppf)}} onPointerDown={event=>start(event,text)} onKeyDown={event=>{
      if(['Enter',' '].includes(event.key)){event.stopPropagation();event.preventDefault();select(text.id);}
      if(['ArrowLeft','ArrowRight'].includes(event.key)){event.stopPropagation();event.preventDefault();select(text.id);update({...text,start:clamp(text.start+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?FPS:1),0,108000)});}
      if(event.key==='Delete'||event.key==='Backspace'){event.stopPropagation();event.preventDefault();select(null);edit(project=>({...project,texts:project.texts?.filter(item=>item.id!==text.id)}));}
    }}><div className="caption-clip-text"><Type size={11}/><span>{text.text||'Empty text'}</span></div><div className="clip-edge left" role="separator" aria-label="Trim text start" onPointerDown={event=>start(event,text,'left')}/><div className="clip-edge right" role="separator" aria-label="Trim text end" onPointerDown={event=>start(event,text,'right')}/></div></div></div>)}</>;
}
