import React from 'react';
import {Layers2,Maximize2} from 'lucide-react';
import {Button} from './ui/primitives';
import {InspectorSection} from './InspectorSection';
import {PositionSizeControls} from './PositionSizeControls';
import {commonStyleValue} from './StyleControls';
import type {Clip} from './model';
import type {ClipOverlay} from './overlays';
export function OverlayControls({clip,clips=[clip],make,reset,change,checkpoint}:{clip:Clip;clips?:Clip[];make:()=>void;reset:()=>void;change:(patch:Partial<ClipOverlay>,record?:boolean)=>void;checkpoint:()=>void}){
  if(!clips.every(clip=>clip.overlay))return <InspectorSection title="Layout"><Button variant="outline" className="full-width" onClick={make}><Layers2 size={15}/>Make overlay</Button></InspectorSection>;
  return <PositionSizeControls key={clip.id} x={commonStyleValue(clips.map(c=>c.overlay!),'x')} y={commonStyleValue(clips.map(c=>c.overlay!),'y')} width={commonStyleValue(clips.map(c=>c.overlay!),'width')} minWidth={2} maxWidth={200} change={change} checkpoint={checkpoint} actions={<Button variant="ghost" size="sm" onClick={reset}><Maximize2 size={13}/>Full frame</Button>}/>;
}
