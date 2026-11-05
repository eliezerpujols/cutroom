import React,{useState} from 'react';
import {Crop,FlipHorizontal2,FlipVertical2,RotateCcw} from 'lucide-react';
import {InspectorSection} from './InspectorSection';
import {StyleSettingsRow} from './StyleSettingsRow';
import {commonStyleValue,StyleNumber} from './StyleControls';
import {IconButton} from './ui/primitives';
import {noCrop,type Crop as CropValue,type VisualTransform} from './transforms';
export function TransformControls({value={},values,change,changeCrop,checkpoint,onCrop}:{value?:VisualTransform;values?:VisualTransform[];changeCrop?:(patch:Partial<CropValue>,record?:boolean)=>void;change:(patch:Partial<VisualTransform>,record?:boolean)=>void;checkpoint:()=>void;onCrop?:()=>void}){
 const [cropOpen,setCropOpen]=useState(false);
 const transforms=(values??[value]).map(t=>({rotation:t.rotation??0,flipX:t.flipX??false,flipY:t.flipY??false,crop:t.crop??noCrop}));
 const rotation=commonStyleValue(transforms,'rotation'),flipX=commonStyleValue(transforms,'flipX'),flipY=commonStyleValue(transforms,'flipY');
 const crop=value.crop??noCrop;
 return <InspectorSection title="Transform" actions={<IconButton label="Reset transform" onClick={()=>change({rotation:0,flipX:false,flipY:false,crop:noCrop})}><RotateCcw size={14}/></IconButton>}>
  <div className="transform-row"><StyleNumber label="Rotation" value={rotation} min={-180} max={180} step={1} unit="°" checkpoint={checkpoint} change={rotation=>change({rotation},false)}/><div className="position-align"><IconButton label="Mirror horizontally" aria-pressed={flipX??'mixed'} onClick={()=>change({flipX:flipX!==true})}><FlipHorizontal2 size={16}/></IconButton><IconButton label="Mirror vertically" aria-pressed={flipY??'mixed'} onClick={()=>change({flipY:flipY!==true})}><FlipVertical2 size={16}/></IconButton></div></div>
  <StyleSettingsRow headerActions={<IconButton label="Reset crop" onClick={()=>change({crop:noCrop})}><RotateCcw size={14}/></IconButton>} label="Crop" open={cropOpen} onOpenChange={setCropOpen} onActivate={onCrop??(()=>setCropOpen(true))} icon={<Crop size={15}/>} color={transforms.some(t=>Object.values(t.crop).some(Boolean))?'var(--accent)':undefined}><div className="shadow-fields">{(['left','top','right','bottom'] as const).map(side=><StyleNumber key={side} label={side[0].toUpperCase()+side.slice(1)} value={commonStyleValue(transforms.map(t=>t.crop),side)} min={0} max={Math.min(90,...transforms.map(t=>94-t.crop[side==='left'?'right':side==='right'?'left':side==='top'?'bottom':'top']))} unit="%" checkpoint={checkpoint} change={v=>changeCrop?changeCrop({[side]:v},false):change({crop:{...crop,[side]:v}},false)}/>)}</div></StyleSettingsRow>
 </InspectorSection>;
}
