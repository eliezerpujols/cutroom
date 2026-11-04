import {InspectorSection} from './InspectorSection';
import {OutlineControls} from './OutlineControls';
import {ShadowControls} from './ShadowControls';
import React from 'react';
import {FontPicker} from './ui/FontPicker';
import {Button} from './ui/primitives';
import {SlidersHorizontal} from 'lucide-react';
import type {CaptionStyle} from './captions';
import {commonStyleValue,StyleChoice,StyleColor,StyleNumber,StyleRange,StyleToggle} from './StyleControls';

type Props={style?:CaptionStyle;styles?:CaptionStyle[];scopeKey?:string;change:(patch:Partial<CaptionStyle>,record?:boolean)=>void;checkpoint:()=>void};
export function CaptionStyleEditor({style,styles,scopeKey='captions',change,checkpoint}:Props){
  const values=(styles??(style?[style]:[])).map(value=>({...value,x:value.x??50,width:value.width??88,align:value.align??'center',lineHeight:value.lineHeight??1.2,letterSpacing:value.letterSpacing??0}));
  const get=<K extends keyof CaptionStyle>(key:K)=>commonStyleValue(values,key);
  const range=(label:string,field:'fontSize'|'strokeWidth'|'x'|'y'|'width',min:number,max:number,step:number,unit:string)=><StyleRange label={label} value={get(field)} min={min} max={max} step={step} unit={unit} checkpoint={checkpoint} change={value=>change({[field]:value},false)}/>;
  const color=(label:string,field:'color'|'strokeColor'|'highlightColor')=><StyleColor label={label} value={get(field)} checkpoint={checkpoint} change={value=>change({[field]:value},false)}/>;
  return <div className="caption-style-controls">
    <InspectorSection title="Font"><FontPicker hideLabel key={scopeKey} value={get('fontFamily')} change={fontFamily=>change({fontFamily})}/>
      <StyleChoice label="Weight" value={get('fontWeight')?.toString()} options={[["400","Regular"],["500","Medium"],["600","Semibold"],["700","Bold"],["800","Extra bold"],["900","Black"]]} change={fontWeight=>change({fontWeight:Number(fontWeight)})}/>
      {range('Size','fontSize',16,160,1,' px')}<div className="text-spacing-controls"><StyleNumber key={scopeKey+'-line'} label="Line height" value={get('lineHeight')} min={80} max={300} scale={100} unit="%" checkpoint={checkpoint} change={lineHeight=>change({lineHeight},false)}/><StyleNumber key={scopeKey+'-letter'} label="Letter spacing" value={get('letterSpacing')} min={-10} max={30} scale={100} unit="%" checkpoint={checkpoint} change={letterSpacing=>change({letterSpacing},false)}/></div>
    </InspectorSection>
    <InspectorSection title="Color">{color('Text color','color')}</InspectorSection>
    <OutlineControls key={scopeKey+'-outline'} values={values} change={change} checkpoint={checkpoint}/>
    <ShadowControls key={scopeKey} values={values} change={(shadow,record)=>change({shadow},record)} checkpoint={checkpoint}/>
    <InspectorSection title="Display">{get('display')===undefined&&<span className="style-mixed-label">Mixed</span>}<div className="caption-segments" role="group" aria-label="Caption display mode">{([['word','Word'],['phrase','Phrase'],['sentence','Sentence']] as const).map(([display,label])=><Button key={display} variant="ghost" size="sm" aria-pressed={get('display')===display} onClick={()=>change({display})}>{label}</Button>)}</div>
      <StyleChoice label="Transition" value={get('motion')} options={[["none","None"],["fade","Fade"],["pop","Pop"]]} change={motion=>change({motion:motion as CaptionStyle['motion']})}/>
      <StyleToggle label="Highlight spoken word" value={get('highlight')} change={highlight=>change({highlight})}/>{values.some(value=>value.highlight)&&color('Highlight color','highlightColor')}
    </InspectorSection>
    <InspectorSection title="Position & size">{range('Horizontal position','x',0,100,1,'%')}{range('Vertical position','y',0,100,1,'%')}{range('Text box width','width',10,96,1,'%')}<Button variant="outline" size="sm" onClick={()=>change({x:50,y:50})}>Center on canvas</Button></InspectorSection>
  </div>;
}

export function CaptionStyleAction({open,count}:{open:()=>void;count?:number}){
  return <div className="inspector-section"><Button variant="outline" className="full-width" onClick={open}><SlidersHorizontal size={15}/>Edit caption style</Button>{count!==undefined&&<p className="field-hint">Changes apply to the {count} selected caption{count===1?'':'s'} in the Caption style panel.</p>}</div>;
}
