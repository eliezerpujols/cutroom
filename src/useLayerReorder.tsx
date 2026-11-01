import React,{useEffect,useRef,useState} from 'react';
import {GripVertical} from 'lucide-react';
import {IconButton} from './ui/primitives';
import {moveLayer,timelineLayers,type TimelineLayer} from './layers';
import type {Project} from './model';
import './layers.css';
export type LayerRowAttributes={'data-timeline-layer':string;'data-layer-dragging'?:boolean;'data-layer-drop'?:'before'|'after'};
type Drop={key:string;edge:'before'|'after'};
export function useLayerReorder(project:Project,edit:(fn:(p:Project)=>Project,record?:boolean)=>void,viewport:React.RefObject<HTMLDivElement|null>,sharedGesture:React.RefObject<(()=>void)|null>,beforeReorder?:()=>void){
  const [drag,setDrag]=useState<{key:string;drop:Drop|null}|null>(null),cleanupRef=useRef<(()=>void)|null>(null);
  const current=useRef(project);current.current=project;
  useEffect(()=>()=>cleanupRef.current?.(),[]);
  function start(event:React.PointerEvent<HTMLButtonElement>,layer:TimelineLayer){
    if(event.button!==0||!event.isPrimary)return;
    event.preventDefault();event.stopPropagation();beforeReorder?.();sharedGesture.current?.();
    const handle=event.currentTarget,startY=event.clientY;let point={x:event.clientX,y:event.clientY},moved=false,drop:Drop|null=null,animation=0;
    handle.focus({preventScroll:true});handle.setPointerCapture(event.pointerId);
    const locate=()=>{
      const row=document.elementFromPoint(point.x,point.y)?.closest<HTMLElement>('[data-timeline-layer]');
      const key=row?.dataset.timelineLayer;
      const next=row&&key&&key!==layer.key?{key,edge:point.y<row.getBoundingClientRect().top+row.offsetHeight/2?'before' as const:'after' as const}:null;
      if(next?.key!==drop?.key||next?.edge!==drop?.edge){drop=next;setDrag({key:layer.key,drop});}
    };
    const scroll=()=>{
      const scroller=viewport.current;
      if(moved&&scroller){const rect=scroller.getBoundingClientRect();if(point.y<rect.top+32)scroller.scrollTop-=Math.min(14,(rect.top+32-point.y)/3);else if(point.y>rect.bottom-32)scroller.scrollTop+=Math.min(14,(point.y-rect.bottom+32)/3);locate();}
      animation=requestAnimationFrame(scroll);
    };
    const move=(next:PointerEvent)=>{if(next.pointerId!==event.pointerId)return;point={x:next.clientX,y:next.clientY};if(!moved&&Math.abs(point.y-startY)<4)return;if(!moved){moved=true;setDrag({key:layer.key,drop:null});animation=requestAnimationFrame(scroll);}locate();};
    const cleanup=()=>{cancelAnimationFrame(animation);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',cleanup);try{if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);}catch{}cleanupRef.current=null;if(sharedGesture.current===cleanup)sharedGesture.current=null;setDrag(null);};
    const up=(next:PointerEvent)=>{if(next.pointerId!==event.pointerId)return;move(next);const target=drop;cleanup();if(moved&&target)edit(project=>moveLayer(project,layer.key,target.key,target.edge));};
    const cancel=(next:PointerEvent)=>{if(next.pointerId===event.pointerId)cleanup();};
    const escape=(next:KeyboardEvent)=>{if(next.key==='Escape'){next.preventDefault();next.stopPropagation();cleanup();}};
    cleanupRef.current=cleanup;sharedGesture.current=cleanup;window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape,true);window.addEventListener('blur',cleanup);
  }
  function handle(layer:TimelineLayer){return <IconButton label={`Reorder ${layer.name} · Drag or use ↑ / ↓`} className="layer-reorder-handle" aria-grabbed={drag?.key===layer.key} onPointerDown={event=>start(event,layer)} onKeyDown={event=>{
    if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();beforeReorder?.();const layers=timelineLayers(current.current),index=layers.findIndex(item=>item.key===layer.key),up=event.key==='ArrowUp'||event.key==='Home',target=layers[event.key==='Home'?0:event.key==='End'?layers.length-1:index+(up?-1:1)];if(target)edit(project=>moveLayer(project,layer.key,target.key,up?'before':'after'));
  }}><GripVertical size={11}/></IconButton>;}
  function attributes(key:string):LayerRowAttributes{return {'data-timeline-layer':key,'data-layer-dragging':drag?.key===key||undefined,'data-layer-drop':drag?.drop?.key===key?drag.drop.edge:undefined};}
  return {layers:timelineLayers(project),handle,attributes};
}
