import React from 'react';
import {AlignHorizontalJustifyCenter,AlignVerticalJustifyCenter} from 'lucide-react';
import {InspectorSection} from './InspectorSection';
import {StyleNumber} from './StyleControls';
import {IconButton} from './ui/primitives';
import './position-size.css';

type Position={x:number;y:number;width:number};
export function PositionSizeControls({x,y,width,minWidth=10,maxWidth=96,change,checkpoint,actions}:{x:number|undefined;y:number|undefined;width:number|undefined;minWidth?:number;maxWidth?:number|null;change:(patch:Partial<Position>,record?:boolean)=>void;checkpoint:()=>void;actions?:React.ReactNode}){
  return <InspectorSection title="Layout" actions={actions}><div className="position-size-grid">
    <StyleNumber label="X position" value={x} min={0} max={100} step={.5} unit="%" checkpoint={checkpoint} change={x=>change({x},false)}/>
    <StyleNumber label="Y position" value={y} min={0} max={100} step={.5} unit="%" checkpoint={checkpoint} change={y=>change({y},false)}/>
    <StyleNumber label="Width" value={width} min={minWidth} max={maxWidth??undefined} step={.5} unit="%" checkpoint={checkpoint} change={width=>change({width},false)}/>
    <div className="position-align" role="group" aria-label="Center on canvas"><IconButton label="Center horizontally" onClick={()=>change({x:50})}><AlignHorizontalJustifyCenter size={16}/></IconButton><IconButton label="Center vertically" onClick={()=>change({y:50})}><AlignVerticalJustifyCenter size={16}/></IconButton></div>
  </div></InspectorSection>;
}
