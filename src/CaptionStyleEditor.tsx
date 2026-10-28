import React from 'react';
import {Button,Input,Slider} from './ui/primitives';
import type {CaptionStyle} from './captions';

type Props={style:CaptionStyle;change:(patch:Partial<CaptionStyle>,record?:boolean)=>void;checkpoint:()=>void};
const keys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown']);
function ColorControl({label,value,change}:{label:string;value:string;change:(value:string)=>void}){
  return <label className="caption-color"><span>{label}</span><span className="caption-color-value"><Input type="color" aria-label={label} value={value} onChange={event=>change(event.target.value)}/><span>{value.toUpperCase()}</span></span></label>;
}
export function CaptionStyleEditor({style,change,checkpoint}:Props){
  const range=(label:string,field:'fontSize'|'strokeWidth'|'y',min:number,max:number,step:number,unit:string)=><div className="clip-adjustment"><div className="adjustment-heading"><span>{label}</span><output>{style[field]}{unit}</output></div><Slider label={label} min={min} max={max} step={step} value={[style[field]]} valueText={`${style[field]}${unit}`} onPointerDown={checkpoint} onKeyDown={event=>{if(keys.has(event.key))checkpoint();}} onValueChange={([value])=>change({[field]:value},false)}/></div>;
  return <div className="caption-style-controls">
    <div className="caption-control-section"><div className="caption-section-label">Text</div><label className="field"><span>Font</span><select className="input" aria-label="Caption font" value={style.fontFamily} onChange={event=>change({fontFamily:event.target.value as CaptionStyle['fontFamily']})}>{['Inter Variable','DM Sans Variable','Manrope Variable'].map(font=><option key={font} value={font}>{font.replace(' Variable','')}</option>)}</select></label>
      <label className="field"><span>Weight</span><select className="input" aria-label="Caption font weight" value={style.fontWeight} onChange={event=>change({fontWeight:Number(event.target.value)})}>{[[400,'Regular'],[500,'Medium'],[600,'Semibold'],[700,'Bold'],[800,'Extra bold'],[900,'Black']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      {range('Size','fontSize',16,160,1,' px')}<ColorControl label="Text color" value={style.color} change={color=>change({color})}/>
    </div>
    <div className="caption-control-section"><label className="caption-toggle"><span>Outline</span><input type="checkbox" role="switch" checked={style.stroke} onChange={event=>change({stroke:event.target.checked})}/></label>{style.stroke&&<><ColorControl label="Outline color" value={style.strokeColor} change={strokeColor=>change({strokeColor})}/>{range('Thickness','strokeWidth',0,12,.5,' px')}</>}</div>
    <div className="caption-control-section"><div className="caption-section-label">Display</div><div className="caption-segments" role="group" aria-label="Caption display mode">{([['word','Word'],['phrase','Phrase'],['sentence','Sentence']] as const).map(([display,label])=><Button key={display} variant="ghost" size="sm" aria-pressed={style.display===display} onClick={()=>change({display})}>{label}</Button>)}</div>
      <label className="field"><span>Transition</span><select className="input" aria-label="Caption transition" value={style.motion} onChange={event=>change({motion:event.target.value as CaptionStyle['motion']})}><option value="none">None</option><option value="fade">Fade</option><option value="pop">Pop</option></select></label>
      <label className="caption-toggle"><span>Highlight spoken word</span><input type="checkbox" role="switch" checked={style.highlight} onChange={event=>change({highlight:event.target.checked})}/></label>{style.highlight&&<ColorControl label="Highlight color" value={style.highlightColor} change={highlightColor=>change({highlightColor})}/>}
    </div>
    <div className="caption-control-section">{range('Vertical position','y',10,90,1,'%')}</div>
  </div>;
}
