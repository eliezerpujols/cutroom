import React from 'react';
import type {Project} from './model';
import {activeCaptionCue,captionWindow,cueText,effectiveCaptionStyle,type CaptionSelection} from './captions';
import {TextDragOverlay} from './TextDragOverlay';
import type {CoverText} from './visuals';

type Props={project:Project;frame:number;selected:CaptionSelection;select:(selection:CaptionSelection)=>void;change:(id:string,position:{x?:number;y?:number},record?:boolean)=>void;commitText:(id:string,text:string)=>void;checkpoint:()=>void;editingChanged:(id:string|null)=>void;reportError:(message:string)=>void};
export function CaptionDragOverlay({project,frame,selected,select,...props}:Props){
  const scale=Math.min(project.width,project.height)/1080;
  const visible=(project.captions||[]).flatMap(layer=>{const cue=activeCaptionCue(layer,frame);return cue?.words.length?[{layer,cue}]:[];});
  const texts:CoverText[]=visible.map(({layer,cue})=>{
    const style=effectiveCaptionStyle(layer,cue),{words}=captionWindow(cue,style,frame);
    return {id:cue.id,text:words.map(word=>word.text).join(' '),fontFamily:style.fontFamily,fontSize:style.fontSize*scale,fontWeight:style.fontWeight,lineHeight:style.lineHeight??1.2,letterSpacing:style.letterSpacing??0,italic:false,color:style.color,stroke:style.stroke,strokeColor:style.strokeColor,strokeWidth:style.strokeWidth*scale,fill:'none',fillColor:'#ffffff',padding:0,radius:0,x:style.x??50,y:style.y,width:style.width??88,align:style.align??'center'};
  });
  return <TextDragOverlay {...props} width={project.width} height={project.height} texts={texts} selected={selected?.cueId??null} select={id=>{const item=visible.find(item=>item.cue.id===id);if(item)select({layerId:item.layer.id,cueId:id});}} editText={id=>{const cue=project.captions?.flatMap(layer=>layer.cues).find(cue=>cue.id===id);return cue?cueText(cue):'';}} maxLength={20000} label="caption"/>;
}
