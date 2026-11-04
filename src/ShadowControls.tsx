import {InspectorSection} from './InspectorSection';
import React,{useState} from 'react';
import * as Popover from '@radix-ui/react-popover';
import {Eye,EyeOff,SlidersHorizontal,X} from 'lucide-react';
import {Button,IconButton} from './ui/primitives';
import {commonStyleValue,StyleColor,StyleNumber} from './StyleControls';
import {resolveShadow,type TextShadow,type ShadowKind,type ShadowSettings} from './shadows';
import './shadows.css';
const kinds=[['drop','Drop shadow'],['inner','Inner shadow']] as const;
export function ShadowControls({values,change,checkpoint}:{values:({shadow?:Partial<TextShadow>})[];change:(patch:Partial<TextShadow>,record?:boolean)=>void;checkpoint:()=>void}){
  const [open,setOpen]=useState<ShadowKind|null>(null);
  return <InspectorSection title="Shadows" className="shadow-controls"><div className="shadow-list">{kinds.map(([kind,label])=>{
    const layers=values.map(value=>resolveShadow(value.shadow,kind)),get=<K extends keyof ShadowSettings>(key:K)=>commonStyleValue(layers,key),enabled=get('enabled');
    const patch=(next:Partial<ShadowSettings>,record=true)=>change({[kind]:next},record);
    return <Popover.Root key={kind} open={open===kind} onOpenChange={next=>setOpen(next?kind:null)}><Popover.Anchor asChild><div className={`shadow-row${enabled===false?' is-disabled':''}`}><Popover.Trigger asChild><Button variant="ghost" className="shadow-row-settings" aria-label={`${label} settings`}><span className={`shadow-swatch${get('color')===undefined?' mixed':''}`} style={{backgroundColor:get('color')}} aria-hidden="true"/><span>{label}</span><SlidersHorizontal size={13}/></Button></Popover.Trigger><IconButton label={`${enabled===true?'Hide':'Show'} ${label.toLowerCase()}`} aria-pressed={enabled??'mixed'} className="shadow-visibility" onClick={()=>patch({enabled:enabled!==true})}>{enabled===false?<EyeOff size={14}/>:<Eye size={14}/>}</IconButton></div></Popover.Anchor><Popover.Portal><Popover.Content className="shadow-popover" side="right" align="start" sideOffset={12} collisionPadding={12} aria-label={`${label} settings`} onEscapeKeyDown={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}>
      <div className="shadow-popover-heading"><span>{label}</span><Popover.Close asChild><Button variant="ghost" size="icon" aria-label={`Close ${label.toLowerCase()} settings`}><X size={14}/></Button></Popover.Close></div>
      <div className="shadow-popover-body"><StyleColor label="Color" value={get('color')} checkpoint={checkpoint} change={color=>patch({color},false)}/><div className="shadow-fields">{([['opacity','Opacity',0,100,'%'],['blur','Blur',0,40,'px'],['x','X',-40,40,'px'],['y','Y',-40,40,'px']] as const).map(([key,name,min,max,unit])=><StyleNumber key={key} label={name} value={get(key)} min={min} max={max} unit={unit} checkpoint={checkpoint} change={value=>patch({[key]:value},false)}/>)}</div></div>
    </Popover.Content></Popover.Portal></Popover.Root>;
  })}</div></InspectorSection>;
}
