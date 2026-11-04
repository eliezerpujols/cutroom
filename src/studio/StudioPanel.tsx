import React,{useEffect,useState} from 'react';
import {X,GripVertical} from 'lucide-react';
import {Button,IconButton,Input} from '../ui/primitives';
import {StyleColor,StyleNumber} from '../StyleControls';
import {studioTemplates,studioDefaults,type StudioInstance} from './registry';
import {StudioElement} from './StudioElement';
import './studio.css';
import {STUDIO_DRAG_TYPE,startLibraryDrag} from '../libraryDrag';
export function StudioPanel({add,hide}:{add:(id:string)=>void;hide:()=>void}){
  const [active,setActive]=useState(false),[frame,setFrame]=useState(0);
  useEffect(()=>{if(!active||matchMedia('(prefers-reduced-motion: reduce)').matches){setFrame(0);return;}let request:number,start:number|undefined;const tick=(now:number)=>{start??=now;setFrame(Math.floor((now-start)*.03)%120);request=requestAnimationFrame(tick);};request=requestAnimationFrame(tick);return()=>cancelAnimationFrame(request);},[active]);
  return <section className="adjustments-panel studio-panel" aria-label="Studio"><div className="panel-heading"><h2>Studio</h2><IconButton label="Hide Studio" onClick={hide}><X size={16}/></IconButton></div><div className="studio-grid">{studioTemplates.map(t=><div className="studio-item" key={t.id} draggable onDragStart={event=>{setActive(false);startLibraryDrag(event,STUDIO_DRAG_TYPE,t.id);}}><Button className="studio-tile" variant="ghost" aria-label={`Add ${t.name}`} onClick={()=>add(t.id)} onPointerEnter={()=>setActive(true)} onPointerLeave={()=>setActive(false)} onFocus={()=>setActive(true)} onBlur={()=>setActive(false)}><span className="studio-preview" aria-hidden="true"><span><StudioElement instance={{template:t.id,props:studioDefaults(t.id)}} frame={frame}/></span></span><span>{t.name}</span></Button><span className="studio-drag-grip" title="Drag to timeline" aria-hidden="true"><GripVertical size={12}/></span></div>)}</div></section>;
}
export function StudioProperties({instance,change,checkpoint}:{instance:StudioInstance;change:(value:StudioInstance,record?:boolean)=>void;checkpoint:()=>void}){
  const t=studioTemplates.find(t=>t.id===instance.template);if(!t)return null;const values={...studioDefaults(t.id),...instance.props};
  const patch=(key:string,value:string|number,record=true)=>change({...instance,props:{...values,[key]:value}},record);
  return <div className="inspector-section studio-properties"><div className="section-title"><h3>{t.name}</h3></div>{t.fields.map(f=>f.type==='text'?<label className="field" key={f.key}><span>{f.label}</span><Input key={instance.template+f.key} aria-label={f.label} value={String(values[f.key])} maxLength={160} onFocus={checkpoint} onChange={e=>patch(f.key,e.target.value,false)}/></label>:f.type==='color'?<StyleColor key={f.key} label={f.label} value={String(values[f.key])} checkpoint={checkpoint} change={v=>patch(f.key,v,false)}/>:<StyleNumber key={f.key} label={f.label} value={Number(values[f.key])} min={f.min??0} max={f.max??100} step={f.step} unit={f.unit??''} checkpoint={checkpoint} change={v=>patch(f.key,v,false)}/>)}</div>;
}
