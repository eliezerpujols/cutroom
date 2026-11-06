import React,{useEffect,useRef,useState} from 'react';
import {Input,Slider} from './ui/primitives';

export function commonStyleValue<T,K extends keyof T>(styles:readonly T[],key:K):T[K]|undefined{
  const normalize=(value:unknown)=>typeof value==='string'&&value.startsWith('#')?value.toLowerCase():value;
  const first=styles[0]?.[key];return styles.length&&styles.every(style=>Object.is(normalize(style[key]),normalize(first)))?first:undefined;
}
export function StyleChoice({label,value,options,change}:{label:string;value:string|undefined;options:readonly (readonly [string,string])[];change:(value:string)=>void}){
  return <label className="field"><span>{label}</span><select className="input" aria-label={label} value={value??''} onChange={event=>change(event.target.value)}>{value===undefined&&<option value="" disabled>Mixed</option>}{value!==undefined&&!options.some(([key])=>key===value)&&<option value={value}>{value}</option>}{options.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>;
}
export function StyleToggle({label,value,change}:{label:string;value:boolean|undefined;change:(value:boolean)=>void}){
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(input.current)input.current.indeterminate=value===undefined;},[value]);
  return <label className="caption-toggle"><span>{label}</span><span className="selection-style-toggle">{value===undefined&&<span>Mixed</span>}<input ref={input} type="checkbox" aria-label={label} aria-checked={value===undefined?'mixed':value} checked={value??false} onChange={event=>change(event.target.checked)}/></span></label>;
}
export function StyleColor({label,value,change,checkpoint}:{label:string;value:string|undefined;change:(value:string)=>void;checkpoint:()=>void}){
  return <label className="caption-color"><span>{label}</span><span className="caption-color-value"><span className={`selection-color-swatch ${value===undefined?'mixed':''}`} style={value?{backgroundColor:value}:undefined}><Input type="color" aria-label={value===undefined?`${label} (Mixed)`:label} value={value??'#000000'} onFocus={checkpoint} onChange={event=>change(event.target.value)}/></span><span>{value?.toUpperCase()??'Mixed'}</span></span></label>;
}
const rangeKeys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown']);
export function StyleRange({label,value,min,max,step=1,unit,change,checkpoint,editable=false,unbounded=false}:{label:string;value:number|undefined;min:number;max:number;step?:number;unit:string;editable?:boolean;unbounded?:boolean;change:(value:number)=>void;checkpoint:()=>void}){
  const mixed=value===undefined,[dragMax,setDragMax]=useState<number|null>(null);
  // Keep the scale stable during a drag; expand it for the next gesture.
  const rangeMax=unbounded?(dragMax??Math.max(max,Math.min(Number.MAX_VALUE,(value??min)*2))):max;
  return <div className={`clip-adjustment ${mixed?'style-range-mixed':''}`}><div className="adjustment-heading">{editable?<StyleNumber label={label} value={value} min={min} max={unbounded?undefined:max} step={step} unit={unit} checkpoint={checkpoint} change={change}/>:<><span>{label}</span><output>{mixed?'Mixed':`${Number(value.toFixed(2))}${unit}`}</output></>}</div><Slider label={label} min={min} max={rangeMax} step={step} value={[value??(min+rangeMax)/2]} valueText={mixed?'Mixed':`${value}${unit}`} onPointerDown={()=>{if(unbounded)setDragMax(rangeMax);checkpoint();}} onPointerCancel={()=>setDragMax(null)} onBlur={()=>setDragMax(null)} onValueCommit={()=>setDragMax(null)} onKeyDown={event=>{if(rangeKeys.has(event.key))checkpoint();}} onValueChange={([next])=>change(next)}/></div>;
}
export function StyleNumber({label,value,min,max,step=1,scale=1,unit,change,checkpoint}:{label:string;value:number|undefined;min:number;max?:number;step?:number;scale?:number;unit:string;change:(value:number)=>void;checkpoint:()=>void}){
  const [draft,setDraft]=useState<string|null>(null),changed=useRef(false);
  const format=(n:number)=>String(Number((n*scale).toFixed(3)));
  const apply=(n:number)=>{if(!changed.current){checkpoint();changed.current=true;}change(n/scale);};
  return <label className="field"><span>{label}</span><span className="text-spacing-input"><Input type="number" inputMode="decimal" aria-label={label} placeholder="Mixed" min={min} max={max} step={step} value={draft??(value===undefined?'':format(value))}
    onFocus={()=>{changed.current=false;setDraft(value===undefined?'':format(value));}}
    onChange={event=>{const raw=event.target.value,n=event.target.valueAsNumber;setDraft(raw);if(raw!==''&&Number.isFinite(n)&&n>=min&&(max===undefined||n<=max))apply(n);}}
    onBlur={()=>{if(draft!==null&&draft.trim()!==''&&Number.isFinite(Number(draft))){const n=Math.max(min,Math.min(max??Infinity,Number(draft)));if(changed.current||value===undefined||n!==Number(format(value)))apply(n);}setDraft(null);}}
    onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/><span aria-hidden="true">{unit}</span></span></label>;
}
