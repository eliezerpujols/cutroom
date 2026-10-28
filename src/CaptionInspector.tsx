import React,{useEffect,useRef,useState} from 'react';
import {ClosedCaption,Eye,EyeOff,SlidersHorizontal,Trash2} from 'lucide-react';
import {Button,IconButton,Slider} from './ui/primitives';
import {TimeValue} from './ClipAdjustments';
import {FPS,clamp,time,type Project} from './model';
import {cueText,replaceCueText,resizeCaptionCue,type CaptionCue,type CaptionLayer} from './captions';

type Props={layer:CaptionLayer;cue?:CaptionCue;timelineEnd:number;edit:(change:(p:Project)=>Project,record?:boolean)=>void;checkpoint:()=>void;openStyle:()=>void;remove:()=>void};
function CaptionTiming({cue,timelineEnd,change,checkpoint}:{cue:CaptionCue;timelineEnd:number;change:(cue:CaptionCue,record?:boolean)=>void;checkpoint:()=>void}){
  const original=useRef<CaptionCue|null>(null),[active,setActive]=useState<{field:'start'|'duration';maximum:number}|null>(null);
  const finish=()=>{original.current=null;setActive(null);};
  return <div className="timing-controls">{(['start','duration'] as const).map(field=>{
    const label=field==='start'?'Start at':'Duration',minimum=field==='start'?0:1,maximum=active?.field===field?active.maximum:Math.min(108000,Math.max(FPS*8,field==='start'?timelineEnd:timelineEnd-cue.start,cue[field]));
    const apply=(value:number,record=true)=>{const source=record?cue:original.current||cue,next=clamp(Math.round(value),minimum,record?108000:maximum);change(field==='start'?{...source,start:next}:resizeCaptionCue(source,next),record);};
    const begin=()=>{original.current=cue;setActive({field,maximum});checkpoint();};
    return <div className="clip-adjustment" key={field}><div className="adjustment-heading"><span>{label}</span><TimeValue label={`Caption ${label.toLowerCase()} in seconds`} frames={cue[field]} min={minimum} max={108000} change={value=>apply(value)}/></div><Slider label={`Caption ${label.toLowerCase()}`} min={minimum} max={maximum} step={1} value={[cue[field]]} valueText={`${(cue[field]/FPS).toFixed(2)} seconds`} onPointerDown={begin} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))begin();}} onValueChange={([value])=>apply(value,false)} onValueCommit={finish} onPointerCancel={finish} onBlur={finish}/></div>;
  })}</div>;
}
export function CaptionInspector({layer,cue,timelineEnd,edit,checkpoint,openStyle,remove}:Props){
  const [text,setText]=useState(cue?cueText(cue):''),[error,setError]=useState(''),editing=useRef(false),cancelled=useRef(false);
  useEffect(()=>{if(!editing.current){setText(cue?cueText(cue):'');setError('');}},[cue]);
  const update=(next:CaptionCue,record=true)=>edit(p=>({...p,captions:p.captions?.map(item=>item.id===layer.id?{...item,cues:item.cues.map(current=>current.id===next.id?next:current).sort((a,b)=>a.start-b.start)}:item)}),record);
  return <>
    <div className="selected-clip-heading"><span className="selected-icon caption"><ClosedCaption size={21}/></span><div><h3>{layer.name}</h3><p>{cue?`${time(cue.start,true)} · ${time(cue.duration,true)}`:`${layer.cues.length} captions · ${layer.language}`}</p></div></div>
    <div className="inspector-section"><Button variant="outline" className="full-width" onClick={openStyle}><SlidersHorizontal size={15}/>Edit caption style</Button></div>
    {cue&&<><div className="inspector-section"><div className="section-title"><h3>Caption text</h3></div><textarea className="input caption-text-input" aria-label="Caption text" value={text} maxLength={2000} onFocus={()=>{editing.current=true;cancelled.current=false;}} onChange={event=>setText(event.target.value)} onBlur={()=>{editing.current=false;if(cancelled.current){setText(cueText(cue));return;}try{if(text.trim()!==cueText(cue))update(replaceCueText(cue,text));setError('');}catch(err){setError((err as Error).message);}}} onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'){cancelled.current=true;event.currentTarget.blur();}if((event.metaKey||event.ctrlKey)&&event.key==='Enter')event.currentTarget.blur();}}/>{error&&<p className="caption-error" role="alert">{error}</p>}</div>
    <div className="inspector-section"><div className="section-title"><h3>Timing</h3></div><CaptionTiming cue={cue} timelineEnd={timelineEnd} change={update} checkpoint={checkpoint}/></div></>}
    <div className="inspector-section caption-layer-actions"><Button variant="ghost" size="sm" onClick={()=>edit(p=>({...p,captions:p.captions?.map(item=>item.id===layer.id?{...item,muted:!item.muted}:item)}))}>{layer.muted?<EyeOff size={15}/>:<Eye size={15}/>} {layer.muted?'Show captions':'Hide captions'}</Button><IconButton label={cue?'Delete caption':'Delete caption layer'} onClick={remove}><Trash2 size={15}/></IconButton></div>
  </>;
}
