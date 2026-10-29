import React from 'react';
import {Copy,Eye,EyeOff,Type} from 'lucide-react';
import {IconButton,Slider} from './ui/primitives';
import {TextAppearance} from './TextAppearance';
import {TimeValue} from './ClipAdjustments';
import {FPS} from './model';
import type {VideoText} from './videoText';

export function VideoTextInspector({text,timelineEnd,change,checkpoint,remove,duplicate}:{text:VideoText;timelineEnd:number;change:(patch:Partial<VideoText>,record?:boolean)=>void;checkpoint:()=>void;remove:()=>void;duplicate:()=>void}){
  return <><div className="selected-clip-heading"><span className="selected-icon caption"><Type size={20}/></span><div><h3>Text</h3><p>{(text.duration/FPS).toFixed(2)} seconds</p></div><div className="video-text-actions"><IconButton label={text.muted?'Show text':'Hide text'} aria-pressed={!text.muted} onClick={()=>change({muted:!text.muted})}>{text.muted?<EyeOff size={15}/>:<Eye size={15}/>}</IconButton><IconButton label="Duplicate text" onClick={duplicate}><Copy size={15}/></IconButton></div></div>
    <div className="inspector-section"><div className="section-title"><h3>Timing</h3></div>{(['start','duration'] as const).map(field=>{const min=field==='start'?0:1,label=field==='start'?'Start at':'Duration',max=Math.min(108000,Math.max(FPS*8,timelineEnd,text[field]));return <div className="clip-adjustment" key={field}><div className="adjustment-heading"><span>{label}</span><TimeValue label={`Text ${label.toLowerCase()} in seconds`} frames={text[field]} min={min} max={108000} change={value=>change({[field]:value})}/></div><Slider label={`Text ${label.toLowerCase()}`} min={min} max={max} step={1} value={[text[field]]} valueText={`${(text[field]/FPS).toFixed(2)} seconds`} onPointerDown={checkpoint} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))checkpoint();}} onValueChange={([value])=>change({[field]:value},false)}/></div>;})}<div className="timing-end"><span>Ends at</span><output>{((text.start+text.duration)/FPS).toFixed(2)} s</output></div></div>
    <TextAppearance text={text} change={change} checkpoint={checkpoint} remove={remove} context="video"/>
  </>;
}
