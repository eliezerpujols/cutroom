import React,{useEffect,useRef,useState} from 'react';
import {CoverTextContent,coverTextPosition} from './remotion/Visuals';
import type {CoverText} from './visuals';
import {clamp} from './model';
export function TextDragOverlay({width,height,texts,selected,select,change,checkpoint,label='text'}:{width:number;height:number;texts:CoverText[];label?:string;selected:string|null;select:(id:string)=>void;change:(id:string,patch:Partial<CoverText>,record?:boolean)=>void;checkpoint:()=>void}){
  const surface=useRef<HTMLDivElement>(null),cleanup=useRef<(()=>void)|null>(null),[scale,setScale]=useState(1);
  useEffect(()=>{const element=surface.current;if(!element)return;const observer=new ResizeObserver(()=>setScale(element.clientWidth/width));observer.observe(element);return()=>observer.disconnect();},[width]);
  useEffect(()=>()=>cleanup.current?.(),[]);
  function drag(event:React.PointerEvent<HTMLDivElement>,text:CoverText){
    if(event.button!==0||!event.isPrimary)return;event.preventDefault();event.stopPropagation();cleanup.current?.();select(text.id);
    const element=event.currentTarget,rect=surface.current!.getBoundingClientRect(),box=element.getBoundingClientRect(),x=event.clientX,y=event.clientY;let started=false;
    const halfW=Math.min(50,box.width/rect.width*50),halfH=Math.min(50,box.height/rect.height*50);
    element.focus({preventScroll:true});element.setPointerCapture(event.pointerId);
    const move=(next:PointerEvent)=>{if(next.pointerId!==event.pointerId)return;const dx=next.clientX-x,dy=next.clientY-y;if(!started&&Math.hypot(dx,dy)<2)return;if(!started){checkpoint();started=true;}change(text.id,{x:Math.round(clamp(text.x+dx/rect.width*100,halfW,100-halfW)*10)/10,y:Math.round(clamp(text.y+dy/rect.height*100,halfH,100-halfH)*10)/10},false);};
    const finish=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',finish);try{if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);}catch{}cleanup.current=null;};
    const up=(next:PointerEvent)=>{if(next.pointerId!==event.pointerId)return;move(next);finish();};const cancel=(next:PointerEvent)=>{if(next.pointerId!==event.pointerId)return;if(started)change(text.id,{x:text.x,y:text.y},false);finish();};cleanup.current=finish;window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',finish);
  }
  return <div className="cover-drag-surface" ref={surface}><div style={{position:'absolute',width:width,height:height,transform:`scale(${scale})`,transformOrigin:'top left',pointerEvents:'none'}}>{texts.map(text=><div key={text.id} role="button" tabIndex={0} aria-label={`Move ${label}: ${text.text||'Empty title'}`} aria-pressed={selected===text.id} className="cover-drag-text" style={{...coverTextPosition(text),outline:selected===text.id?`${1.5/scale}px solid #ffffff`:undefined,outlineOffset:5/scale,minHeight:48,pointerEvents:'auto'}} onPointerDown={event=>drag(event,text)} onKeyDown={event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();select(text.id);return;}const step=event.shiftKey?5:1,dx=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,dy=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;if(dx||dy){event.preventDefault();event.stopPropagation();change(text.id,{x:clamp(text.x+dx,0,100),y:clamp(text.y+dy,0,100)});}}}><div style={{opacity:0}}><CoverTextContent text={text}/></div></div>)}</div></div>;
}
