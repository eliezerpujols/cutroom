import React from 'react';
import {InspectorSection} from './InspectorSection';
import {StyleSettingsRow} from './StyleSettingsRow';
import {commonStyleValue,StyleColor,StyleNumber} from './StyleControls';

type OutlineStyle={stroke:boolean;strokeColor:string;strokeWidth:number};
export function OutlineControls({values,change,checkpoint}:{values:OutlineStyle[];change:(patch:Partial<OutlineStyle>,record?:boolean)=>void;checkpoint:()=>void}){
  const enabled=commonStyleValue(values,'stroke'),color=commonStyleValue(values,'strokeColor');
  return <InspectorSection title="Outline"><StyleSettingsRow label="Outline" color={color} enabled={enabled} toggle={()=>change({stroke:enabled!==true})}>
    <StyleColor label="Outline color" value={color} checkpoint={checkpoint} change={strokeColor=>change({strokeColor},false)}/>
    <div className="shadow-fields"><StyleNumber label="Outline width" value={commonStyleValue(values,'strokeWidth')} min={0} max={12} step={.5} unit="px" checkpoint={checkpoint} change={strokeWidth=>change({strokeWidth},false)}/></div>
  </StyleSettingsRow></InspectorSection>;
}
