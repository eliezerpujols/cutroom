import React from 'react';
import {Layers2,Maximize2} from 'lucide-react';
import {Button,Input,Slider} from './ui/primitives';
import {clamp,type Clip} from './model';
import type {ClipOverlay} from './overlays';
export function OverlayControls({clip,make,reset,change,checkpoint}:{clip:Clip;make:()=>void;reset:()=>void;change:(patch:Partial<ClipOverlay>,record?:boolean)=>void;checkpoint:()=>void}){
  const value=clip.overlay;
  const beginKey=(event:React.KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))checkpoint();};
  return <div className="inspector-section overlay-controls"><div className="section-title"><h3>{value?'Overlay':'Layout'}</h3>{value&&<Button variant="ghost" size="sm" onClick={reset}><Maximize2 size={13}/>Full frame</Button>}</div>{!value?<Button variant="outline" className="full-width" onClick={make}><Layers2 size={15}/>Make overlay</Button>:<>
    <label className="overlay-control-heading"><span>Size</span><span><Input aria-label="Overlay width percent" type="number" min={2} max={200} step={1} value={Number(value.width.toFixed(2))} onChange={event=>{if(event.target.value)change({width:clamp(Number(event.target.value),2,200)});}}/><span>%</span></span></label>
    <Slider label="Overlay size" min={2} max={200} step={.5} value={[value.width]} onPointerDown={checkpoint} onKeyDown={beginKey} onValueChange={([width])=>change({width},false)}/>
    <details className="overlay-position"><summary>Position</summary><div className="field-grid">{(['x','y'] as const).map(axis=><label className="field" key={axis}><span>{axis==='x'?'Horizontal':'Vertical'} · %</span><Input aria-label={`Overlay ${axis==='x'?'horizontal':'vertical'} position percent`} type="number" min={0} max={100} step={.5} value={Number(value[axis].toFixed(2))} onChange={event=>{if(event.target.value)change({[axis]:clamp(Number(event.target.value),0,100)});}}/></label>)}</div><Button variant="ghost" size="sm" onClick={()=>change({x:50,y:50})}>Center</Button></details>
  </>}</div>;
}
