import {EffectTile} from './EffectTile';
import {PositionSizeControls} from './PositionSizeControls';
import {InspectorSection} from './InspectorSection';
import {StyleSettingsRow} from './StyleSettingsRow';
import {OutlineControls} from './OutlineControls';
import {ShadowControls} from './ShadowControls';
import React from 'react';
import {FontPicker} from './ui/FontPicker';
import {Button} from './ui/primitives';
import {SlidersHorizontal} from 'lucide-react';
import type {CaptionStyle} from './captions';
import {commonStyleValue,StyleChoice,StyleColor,StyleNumber,StyleRange} from './StyleControls';

type Props={style?:CaptionStyle;styles?:CaptionStyle[];scopeKey?:string;change:(patch:Partial<CaptionStyle>,record?:boolean)=>void;checkpoint:()=>void};
export function CaptionStyleEditor({style,styles,scopeKey='captions',change,checkpoint}:Props){
  const values=(styles??(style?[style]:[])).map(value=>({...value,x:value.x??50,width:value.width??88,align:value.align??'center',lineHeight:value.lineHeight??1.2,letterSpacing:value.letterSpacing??0}));
  const get=<K extends keyof CaptionStyle>(key:K)=>commonStyleValue(values,key);
  const range=(label:string,field:'fontSize'|'strokeWidth'|'x'|'y'|'width',min:number,max:number,step:number,unit:string)=><StyleRange label={label} value={get(field)} min={min} max={max} step={step} unit={unit} checkpoint={checkpoint} change={value=>change({[field]:value},false)}/>;
  const color=(label:string,field:'color'|'strokeColor'|'highlightColor')=><StyleColor label={label} value={get(field)} checkpoint={checkpoint} change={value=>change({[field]:value},false)}/>;
  return <div className="caption-style-controls">
    <PositionSizeControls key={scopeKey+'-layout'} x={get('x')} y={get('y')} width={get('width')} change={change} checkpoint={checkpoint}/>
    <InspectorSection title="Font"><FontPicker hideLabel key={scopeKey} value={get('fontFamily')} change={fontFamily=>change({fontFamily})}/>
      <StyleChoice label="Weight" value={get('fontWeight')?.toString()} options={[["400","Regular"],["500","Medium"],["600","Semibold"],["700","Bold"],["800","Extra bold"],["900","Black"]]} change={fontWeight=>change({fontWeight:Number(fontWeight)})}/>
      {range('Size','fontSize',16,160,1,' px')}<div className="text-spacing-controls"><StyleNumber key={scopeKey+'-line'} label="Line height" value={get('lineHeight')} min={80} max={300} scale={100} unit="%" checkpoint={checkpoint} change={lineHeight=>change({lineHeight},false)}/><StyleNumber key={scopeKey+'-letter'} label="Letter spacing" value={get('letterSpacing')} min={-10} max={30} scale={100} unit="%" checkpoint={checkpoint} change={letterSpacing=>change({letterSpacing},false)}/></div>
    </InspectorSection>
    <InspectorSection title="Color"><StyleSettingsRow label="Text color" color={get('color')}>{color('Text color','color')}</StyleSettingsRow></InspectorSection>
    <OutlineControls key={scopeKey+'-outline'} values={values} change={change} checkpoint={checkpoint}/>
    <ShadowControls key={scopeKey} values={values} change={(shadow,record)=>change({shadow},record)} checkpoint={checkpoint}/>
    <InspectorSection title="Display">{get('display')===undefined&&<span className="style-mixed-label">Mixed</span>}<div className="caption-segments" role="group" aria-label="Caption display mode">{([['word','Word'],['phrase','Phrase'],['sentence','Sentence']] as const).map(([display,label])=><Button key={display} variant="ghost" size="sm" aria-pressed={get('display')===display} onClick={()=>change({display})}>{label}</Button>)}</div>
      <div className="field"><span>Transition</span><div className="effect-grid" role="group" aria-label="Caption transition">{([['none','None'],['fade','Fade'],['pop','Pop']] as const).map(([motion,name])=><EffectTile key={motion} textPreview group="Caption transition" name={name} kind="none" previewStyle={frame=>{const progress=Math.min(1,frame/12);return {opacity:motion==='fade'?progress:1,transform:motion==='pop'?`scale(${.9+.1*(1-(1-progress)**3)})`:undefined};}} selected={get('motion')===motion} choose={()=>change({motion})}/>)}</div></div>
      <StyleSettingsRow label="Highlight words" color={get('highlightColor')} enabled={get('highlight')} toggle={()=>change({highlight:get('highlight')!==true})}>{color('Highlight color','highlightColor')}</StyleSettingsRow>
    </InspectorSection>

  </div>;
}

export function CaptionStyleAction({open,count}:{open:()=>void;count?:number}){
  return <div className="inspector-section"><Button variant="outline" className="full-width" onClick={open}><SlidersHorizontal size={15}/>Edit caption style</Button>{count!==undefined&&<p className="field-hint">Changes apply to the {count} selected caption{count===1?'':'s'} in the Caption style panel.</p>}</div>;
}
