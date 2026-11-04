import {InspectorSection} from './InspectorSection';
import React,{useState} from 'react';
import {StyleSettingsRow} from './StyleSettingsRow';
import {commonStyleValue,StyleColor,StyleNumber} from './StyleControls';
import {resolveShadow,type TextShadow,type ShadowKind,type ShadowSettings} from './shadows';
import './shadows.css';
const kinds=[['drop','Drop shadow'],['inner','Inner shadow']] as const;
export function ShadowControls({values,change,checkpoint}:{values:({shadow?:Partial<TextShadow>})[];change:(patch:Partial<TextShadow>,record?:boolean)=>void;checkpoint:()=>void}){
  const [open,setOpen]=useState<ShadowKind|null>(null);
  return <InspectorSection title="Shadows" className="shadow-controls"><div className="shadow-list">{kinds.map(([kind,label])=>{
    const layers=values.map(value=>resolveShadow(value.shadow,kind)),get=<K extends keyof ShadowSettings>(key:K)=>commonStyleValue(layers,key),enabled=get('enabled');
    const patch=(next:Partial<ShadowSettings>,record=true)=>change({[kind]:next},record);
    return <StyleSettingsRow key={kind} label={label} color={get('color')} enabled={enabled} toggle={()=>patch({enabled:enabled!==true})} open={open===kind} onOpenChange={next=>setOpen(next?kind:null)}><StyleColor label="Color" value={get('color')} checkpoint={checkpoint} change={color=>patch({color},false)}/><div className="shadow-fields">{([['opacity','Opacity',0,100,'%'],['blur','Blur',0,40,'px'],['x','X',-40,40,'px'],['y','Y',-40,40,'px']] as const).map(([key,name,min,max,unit])=><StyleNumber key={key} label={name} value={get(key)} min={min} max={max} unit={unit} checkpoint={checkpoint} change={value=>patch({[key]:value},false)}/>)}</div></StyleSettingsRow>;
  })}</div></InspectorSection>;
}
