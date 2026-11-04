import type React from 'react';
import {useRef} from 'react';

type Modifiers={shiftKey:boolean;metaKey:boolean;ctrlKey:boolean};
const sameSelection=(a:readonly string[],b:readonly string[])=>a.length===b.length&&a.every(id=>b.includes(id));

// Range order follows the visible list, independently of timeline track order.
export function usePanelSelection(selectedIds:readonly string[],select:(ids:string[])=>void){
  const state=useRef({selection:[...selectedIds],anchors:new Map<string,string>()});
  return (list:string,orderedIds:readonly string[],id:string,event:Modifiers)=>{
    if(!orderedIds.includes(id))return;
    const current=state.current;
    // A selection made elsewhere starts a new range. Style panels do not change it.
    if(!sameSelection(current.selection,selectedIds))current.anchors.clear();
    const additive=event.metaKey||event.ctrlKey;
    let next:string[];
    if(event.shiftKey){
      const saved=current.anchors.get(list);
      const anchor=saved&&orderedIds.includes(saved)?saved:[...selectedIds].reverse().find(candidate=>orderedIds.includes(candidate))??id;
      const start=orderedIds.indexOf(anchor),end=orderedIds.indexOf(id),range=orderedIds.slice(Math.min(start,end),Math.max(start,end)+1);
      next=additive?[...new Set([...selectedIds,...range])]:[...range];
      current.anchors.set(list,anchor);
    }else{
      next=additive?(selectedIds.includes(id)?selectedIds.filter(selected=>selected!==id):[...selectedIds,id]):[id];
      current.anchors.set(list,id);
    }
    current.selection=next;select(next);
  };
}

export type RowModifiers=Pick<React.MouseEvent,'shiftKey'|'metaKey'|'ctrlKey'>;
export function modifierKeySelection(event:React.KeyboardEvent,pick:(modifiers:RowModifiers)=>void){
  if((event.key==='Enter'||event.key===' ')&&(event.shiftKey||event.metaKey||event.ctrlKey)){event.preventDefault();event.stopPropagation();pick(event);}
}
