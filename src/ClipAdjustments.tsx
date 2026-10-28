import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {Button,Input,Slider} from './ui/primitives';
import {FPS,clamp,endFrame,fadeGainAt,maxDuration,setClipRate,time,uid,type Asset,type Clip,type Project} from './model';
import {placeTimelineClip} from './videoTracks';

type Change=(values:Partial<Clip>,record?:boolean)=>void;
type Controls={clip:Clip;change:Change;checkpoint:()=>void};
const adjustmentKeys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown']);
const secondsLabel=(frames:number)=>`${(frames/FPS).toFixed(2)} seconds`;

export function TimeValue({label,frames,min=0,max,change}:{label:string;frames:number;min?:number;max:number;change:(frames:number)=>void}){
  const [text,setText]=useState((frames/FPS).toFixed(2)),editing=useRef(false),canceled=useRef(false);
  useEffect(()=>{if(!editing.current)setText((frames/FPS).toFixed(2));},[frames]);
  return <span className="control-value"><Input className="control-value-input" type="number" inputMode="decimal" step={1/FPS} min={min/FPS} max={max/FPS} aria-label={label} value={text}
    onFocus={()=>{editing.current=true;canceled.current=false;}} onChange={event=>setText(event.target.value)}
    onBlur={()=>{editing.current=false;if(canceled.current){canceled.current=false;setText((frames/FPS).toFixed(2));return;}const value=Number(text);if(Number.isFinite(value)){const next=clamp(Math.round(value*FPS),min,max);if(next!==frames)change(next);setText((next/FPS).toFixed(2));}else setText((frames/FPS).toFixed(2));}}
    onKeyDown={event=>{event.stopPropagation();if(event.key==='Enter')event.currentTarget.blur();if(event.key==='Escape'){canceled.current=true;event.currentTarget.blur();}}}/><span aria-hidden="true">s</span></span>;
}

type TimingProps={project:Project;clip:Clip;asset:Asset;edit:(change:(project:Project)=>Project,record?:boolean)=>void;checkpoint:()=>void};
type TimingField='start'|'duration';
export function TimingControls({project,clip,asset,edit,checkpoint}:TimingProps){
  const startMaximum=Math.min(108000,Math.max(FPS*8,endFrame(project)));
  const durationMaximum=Math.max(clip.duration,maxDuration(clip,asset));
  const gesture=useRef<{project:Project;clip:Clip;trackId:string;maximum:number}|null>(null);
  const [activeMaximum,setActiveMaximum]=useState<{field:TimingField;value:number}|null>(null);
  function begin(field:TimingField){
    const maximum=field==='start'?startMaximum:durationMaximum;
    gesture.current={project,clip,trackId:uid(),maximum};setActiveMaximum({field,value:maximum});checkpoint();
  }
  function finish(){gesture.current=null;setActiveMaximum(null);}
  function apply(field:TimingField,value:number,record=true){
    const origin=record?null:gesture.current;
    const next=clamp(Math.round(value),field==='start'?0:1,origin?.maximum??(field==='start'?108000:durationMaximum));
    if(origin){
      // Rebuild from the gesture's original tracks so passing across other clips
      // does not leave a growing set of temporary lanes behind.
      edit(()=>placeTimelineClip(origin.project,{...origin.clip,[field]:next},{newTrackId:origin.trackId}),false);
    }else if(next!==clip[field])edit(p=>({...p,clips:p.clips.map(c=>c.id===clip.id?{...c,[field]:next}:c)}));
  }
  return <div className="timing-controls">{(['start','duration'] as const).map(field=>{
    const label=field==='start'?'Start at':'Duration',minimum=field==='start'?0:1;
    const maximum=activeMaximum?.field===field?activeMaximum.value:field==='start'?startMaximum:durationMaximum;
    return <div className="clip-adjustment" key={field}>
      <div className="adjustment-heading"><span>{label}</span><TimeValue label={`${label} in seconds`} frames={clip[field]} min={minimum} max={field==='start'?108000:durationMaximum} change={value=>apply(field,value)}/></div>
      <Slider label={field==='start'?'Clip start on timeline':'Clip duration'} valueText={secondsLabel(clip[field])} min={minimum} max={maximum} step={1} value={[clip[field]]} disabled={maximum<=minimum} onPointerDown={()=>begin(field)} onKeyDown={event=>{if(adjustmentKeys.has(event.key))begin(field);}} onValueChange={([value])=>apply(field,value,false)} onValueCommit={finish} onPointerCancel={finish} onBlur={finish}/>
    </div>;
  })}<div className="timing-end"><span>Ends at</span><output>{((clip.start+clip.duration)/FPS).toFixed(2)} s</output></div></div>;
}

export function AudioFadeControls({clip,change,checkpoint}:Controls){
  const maximum=Math.max(clip.duration,clip.fadeIn,clip.fadeOut);
  return <div className="audio-fade-controls">{(['fadeIn','fadeOut'] as const).map(field=>{
    const label=field==='fadeIn'?'Fade in':'Fade out';
    return <div className="clip-adjustment" key={field}>
      <div className="adjustment-heading"><span>{label}</span><TimeValue label={`${label} duration in seconds`} frames={clip[field]} max={maximum} change={value=>change({[field]:value})}/></div>
      <Slider label={`${label} duration`} valueText={secondsLabel(clip[field])} min={0} max={maximum} step={1} value={[clip[field]]} onPointerDown={checkpoint} onKeyDown={event=>{if(adjustmentKeys.has(event.key))checkpoint();}} onValueChange={([value])=>change({[field]:Math.round(value)},false)}/>
    </div>;
  })}</div>;
}

export function FadeEnvelope({clip}:{clip:Clip}){
  if(!clip.fadeIn&&!clip.fadeOut)return null;
  const last=Math.max(1,clip.duration-1);
  const positions=new Set([0,last,clamp(clip.fadeIn,0,last),clamp(last-clip.fadeOut,0,last)]);
  if(clip.fadeIn&&clip.fadeOut)positions.add(clip.fadeIn*last/(clip.fadeIn+clip.fadeOut));
  const points=[...positions].sort((a,b)=>a-b).map(frame=>`${frame/last*1000},${5+(1-fadeGainAt(clip,frame))*85}`).join(' ');
  return <svg className="fade-envelope" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><polygon points={`0,5 ${points} 1000,5`}/><polyline points={points} vectorEffect="non-scaling-stroke"/></svg>;
}

const SourceStrip=React.memo(function SourceStrip({asset}:{asset:Asset}){
  if(asset.kind==='video'){
    const count=Math.min(8,asset.thumbnails.length);
    return <div className="source-filmstrip">{Array.from({length:count},(_,index)=><img key={index} src={asset.thumbnails[Math.round(index/Math.max(1,count-1)*(asset.thumbnails.length-1))]} alt="" draggable={false}/>)}</div>;
  }
  return <svg className="source-waveform" viewBox="0 0 240 32" preserveAspectRatio="none" aria-hidden="true">{Array.from({length:80},(_,index)=>{const from=Math.floor(index/80*asset.peaks.length),to=Math.max(from+1,Math.floor((index+1)/80*asset.peaks.length));const peak=asset.peaks.slice(from,to).reduce((a,b)=>Math.max(a,b),0),height=Math.max(2,Math.pow(peak,.62)*28);return <rect key={index} x={index*3} y={16-height/2} width={1.5} height={height} rx={.75}/>;})}</svg>;
});

// The source window has a fixed span. A normal range slider would display only
// a start value, while a two-thumb range would suggest changing the duration.
function SourceWindow({clip,asset,change,checkpoint}:Controls&{asset:Asset}){
  const gesture=useRef<(()=>void)|null>(null),cancelGesture=useRef<(()=>void)|null>(null);
  useEffect(()=>()=>gesture.current?.(),[]);
  const span=Math.min(asset.frames,clip.duration*clip.rate),maximum=Math.max(0,asset.frames-span),disabled=maximum<.01;
  function pointerDown(event:React.PointerEvent<HTMLDivElement>){
    if(event.button!==0||!event.isPrimary||disabled)return;
    event.preventDefault();event.stopPropagation();gesture.current?.();
    const element=event.currentTarget,rect=element.getBoundingClientRect(),x=event.clientX;
    const inside=!!(event.target as HTMLElement).closest('.source-window-selection');
    const origin=inside?clip.sourceIn:clamp((x-rect.left)/rect.width*asset.frames-span/2,0,maximum);
    let started=false,last=clip.sourceIn;
    element.focus({preventScroll:true});element.setPointerCapture(event.pointerId);
    const apply=(value:number)=>{const next=clamp(Math.round(value),0,maximum);if(next===last)return;if(!started){checkpoint();started=true;}last=next;change({sourceIn:next},false);};
    if(!inside)apply(origin);
    const move=(next:PointerEvent)=>{if(next.pointerId===event.pointerId&&(started||!inside||next.clientX!==x))apply(origin+(next.clientX-x)/rect.width*asset.frames);};
    const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',blur);try{if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);}catch{}gesture.current=null;cancelGesture.current=null;};
    const finish=(next:PointerEvent)=>{if(next.pointerId!==event.pointerId)return;move(next);cleanup();};
    const revert=()=>{if(started)change({sourceIn:clip.sourceIn},false);cleanup();};
    const cancel=(next:PointerEvent)=>{if(next.pointerId===event.pointerId)revert();};
    const blur=()=>cleanup();gesture.current=cleanup;cancelGesture.current=revert;
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',blur);
  }
  return <div className="source-control">
    <div className="adjustment-heading"><span>Content start</span><TimeValue label="Content start in source, seconds" frames={clip.sourceIn} max={maximum} change={value=>change({sourceIn:value})}/></div>
    <div className={`source-window ${disabled?'source-window-disabled':''}`} role="slider" tabIndex={0} aria-label="Move content inside the clip" aria-disabled={disabled} aria-valuemin={0} aria-valuemax={maximum/FPS} aria-valuenow={clip.sourceIn/FPS} aria-valuetext={`${time(clip.sourceIn,true)} to ${time(clip.sourceIn+span,true)} in the source`} onPointerDown={pointerDown} onKeyDown={event=>{
      if(event.key==='Escape'&&cancelGesture.current){event.preventDefault();event.stopPropagation();cancelGesture.current();return;}
      if(disabled)return;const step=event.shiftKey?FPS:1;
      const value=event.key==='ArrowLeft'?clip.sourceIn-step:event.key==='ArrowRight'?clip.sourceIn+step:event.key==='Home'?0:event.key==='End'?maximum:null;
      if(value!==null){event.preventDefault();event.stopPropagation();const next=clamp(value,0,maximum);if(next!==clip.sourceIn)change({sourceIn:next});}
    }}>
      <SourceStrip asset={asset}/><div className="source-window-selection" style={{left:`${clip.sourceIn/asset.frames*100}%`,width:`${span/asset.frames*100}%`}}><i/><i/></div>
    </div>
    <div className="source-scale" aria-hidden="true"><span>0:00</span><span>{time(asset.frames,true)}</span></div>
    <p className="field-hint">{disabled?'Trim the clip first to choose a different section.':'Drag the window to choose the content. The clip stays in place.'}</p>
    <div className="source-nudges"><Button variant="outline" size="sm" disabled={disabled||clip.sourceIn<=0} aria-label="Content one source frame earlier" onClick={()=>change({sourceIn:Math.max(0,clip.sourceIn-1)})}><ArrowLeft size={13}/>Earlier</Button><Button variant="outline" size="sm" disabled={disabled||clip.sourceIn>=maximum} aria-label="Content one source frame later" onClick={()=>change({sourceIn:Math.min(maximum,clip.sourceIn+1)})}>Later<ArrowRight size={13}/></Button></div>
  </div>;
}

export function PlaybackControls({clip,asset,change,checkpoint}:Controls&{asset:Asset}){
  const speedOrigin=useRef<Clip|null>(null);
  return <div className="playback-controls">
    <div className="clip-adjustment"><div className="adjustment-heading"><span>Speed</span><output className="rate-value">{Number(clip.rate.toFixed(2))}×</output></div>
      <Slider label="Playback speed" valueText={`${clip.rate} times normal speed`} min={.25} max={4} step={.25} value={[clip.rate]} onPointerDown={()=>{speedOrigin.current=clip;checkpoint();}} onPointerCancel={()=>{speedOrigin.current=null;}} onBlur={()=>{speedOrigin.current=null;}} onKeyDown={event=>{if(adjustmentKeys.has(event.key)){speedOrigin.current=clip;checkpoint();}}} onValueChange={([rate])=>change(setClipRate(speedOrigin.current||clip,rate,asset),false)} onValueCommit={()=>{speedOrigin.current=null;}}/>
      <div className="speed-scale" aria-hidden="true"><span>Slower</span><span>Faster</span></div>
      <div className="speed-presets" role="group" aria-label="Common playback speeds">{[.5,1,1.5,2].map(rate=><Button key={rate} variant="ghost" size="sm" aria-pressed={clip.rate===rate} aria-label={rate===1?'Normal speed, 1 times':`${rate} times normal speed`} onClick={()=>change(setClipRate(clip,rate,asset))}>{rate}×</Button>)}</div>
      <p className="field-hint">Changing speed changes this clip’s duration.</p>
    </div>
    <SourceWindow clip={clip} asset={asset} change={change} checkpoint={checkpoint}/>
  </div>;
}
