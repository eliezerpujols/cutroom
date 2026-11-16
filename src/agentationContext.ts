import {useEffect,useRef} from 'react';
import {FPS} from './model';

// Agentation copies only the clicked element's own attributes into an annotation.
// Items mark their root with these attributes; the pointer listener below copies them,
// plus the current playhead frame, onto the hovered descendant before Agentation reads it.
export const AGENTATION_ATTRIBUTES=['data-cutroom-kind','data-cutroom-id','data-cutroom-name','data-cutroom-range','data-cutroom-track','data-cutroom-frame','data-cutroom-time'] as const;
const ROOT='[data-cutroom-kind]',SHARED=AGENTATION_ATTRIBUTES.slice(0,5);

export function cutroomTarget(kind:string,id?:string,timing?:{start:number;duration:number},extra:{name?:string;track?:string}={}){
  const attributes:Record<string,string>={'data-cutroom-kind':kind};
  if(id)attributes['data-cutroom-id']=id;
  if(extra.name)attributes['data-cutroom-name']=extra.name.slice(0,120);
  if(timing)attributes['data-cutroom-range']=`${timing.start}-${timing.start+timing.duration} (${seconds(timing.start)}-${seconds(timing.start+timing.duration)})`;
  if(extra.track)attributes['data-cutroom-track']=extra.track;
  return attributes;
}
const seconds=(frame:number)=>`${(frame/FPS).toFixed(2)}s`;

function stamp(target:EventTarget|null,frame:number){
  if(!(target instanceof Element))return;
  const root=target.closest(ROOT);if(!root)return;
  for(let element:Element|null=target;element;element=element.parentElement){
    if(element!==root)for(const name of SHARED){const value=root.getAttribute(name);if(value===null)element.removeAttribute(name);else element.setAttribute(name,value);}
    element.setAttribute('data-cutroom-frame',String(frame));
    element.setAttribute('data-cutroom-time',seconds(frame));
    if(element===root)break;
  }
}

export function useAgentationFrame(frame:number){
  const current=useRef(frame);current.current=frame;
  useEffect(()=>{
    const update=(event:Event)=>stamp(event.target,current.current);
    const options={capture:true,passive:true};
    for(const type of ['pointerover','pointermove','pointerdown','click'])window.addEventListener(type,update,options);
    return()=>{for(const type of ['pointerover','pointermove','pointerdown','click'])window.removeEventListener(type,update,options);};
  },[]);
}
