import React from 'react';
import {Crop,FlipHorizontal2,FlipVertical2,RotateCcw} from 'lucide-react';
import {InspectorSection} from './InspectorSection';
import {StyleSettingsRow} from './StyleSettingsRow';
import {StyleNumber} from './StyleControls';
import {IconButton} from './ui/primitives';
import {noCrop,type VisualTransform} from './transforms';
export function TransformControls({value={},change,checkpoint,onCrop}:{value?:VisualTransform;change:(patch:Partial<VisualTransform>,record?:boolean)=>void;checkpoint:()=>void;onCrop:()=>void}){
 const crop=value.crop??noCrop;
 return <InspectorSection title="Transform" actions={<IconButton label="Reset transform" onClick={()=>change({rotation:0,flipX:false,flipY:false,crop:noCrop})}><RotateCcw size={14}/></IconButton>}>
  <div className="transform-row"><StyleNumber label="Rotation" value={value.rotation??0} min={-180} max={180} step={1} unit="°" checkpoint={checkpoint} change={rotation=>change({rotation},false)}/><div className="position-align"><IconButton label="Mirror horizontally" aria-pressed={value.flipX??false} onClick={()=>change({flipX:!value.flipX})}><FlipHorizontal2 size={16}/></IconButton><IconButton label="Mirror vertically" aria-pressed={value.flipY??false} onClick={()=>change({flipY:!value.flipY})}><FlipVertical2 size={16}/></IconButton></div></div>
  <StyleSettingsRow headerActions={<IconButton label="Reset crop" onClick={()=>change({crop:noCrop})}><RotateCcw size={14}/></IconButton>} label="Crop" onActivate={onCrop} icon={<Crop size={15}/>} color={Object.values(crop).some(Boolean)?'var(--accent)':undefined}><div className="shadow-fields">{(['left','top','right','bottom'] as const).map(side=><StyleNumber key={side} label={side[0].toUpperCase()+side.slice(1)} value={crop[side]} min={0} max={Math.min(90,94-crop[side==='left'?'right':side==='right'?'left':side==='top'?'bottom':'top'])} unit="%" checkpoint={checkpoint} change={v=>change({crop:{...crop,[side]:v}},false)}/>)}</div></StyleSettingsRow>
 </InspectorSection>;
}
