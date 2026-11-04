import {InspectorSection} from './InspectorSection';
import {OutlineControls} from './OutlineControls';
import {ShadowControls} from './ShadowControls';
import {InspectorItemHeader,InspectorActions} from './InspectorItemHeader';
import React from 'react';
import {FontPicker} from './ui/FontPicker';
import {Bold,Italic,Type,ChevronRight,AlignLeft,AlignCenter,AlignRight,Image as ImageIcon} from 'lucide-react';
import {Button,IconButton} from './ui/primitives';
import {textLineHeight,type CoverText} from './visuals';
import {commonStyleValue,StyleChoice,StyleColor,StyleNumber,StyleRange,StyleToggle} from './StyleControls';

type StyleProps={styles:CoverText[];scopeKey:string;change:(patch:Partial<CoverText>,record?:boolean)=>void;checkpoint:()=>void;children?:React.ReactNode};
export function TextStyleControls({styles,scopeKey,change,checkpoint,children}:StyleProps){
  const normalized=styles.map(text=>({...text,lineHeight:textLineHeight(text),letterSpacing:text.letterSpacing??-.02}));
  const get=<K extends keyof CoverText>(key:K)=>commonStyleValue(normalized,key);
  const bold=commonStyleValue(styles.map(text=>({bold:text.fontWeight>=700})),'bold');
  const fill=get('fill'),background=commonStyleValue(styles.map(text=>({background:text.fill!=='none'})),'background');
  const range=(field:'fontSize'|'strokeWidth'|'padding'|'radius'|'width'|'x'|'y',label:string,min:number,max:number,step=1)=><StyleRange label={label} value={get(field)} min={min} max={max} step={step} unit={['width','x','y'].includes(field)?'%':' px'} checkpoint={checkpoint} change={value=>change({[field]:value},false)}/>;
  const color=(field:'color'|'fillColor'|'strokeColor',label:string)=><StyleColor label={label} value={get(field)} checkpoint={checkpoint} change={value=>change({[field]:value},false)}/>;
  return <div className="cover-inspector">
    <InspectorSection title="Text">{children}{fill===undefined&&<p className="field-hint">Text style: Mixed</p>}<div className="cover-style-presets" role="group" aria-label="Text styles">{([['box','Title card','#ffffff'],['lines','Highlight','#ffe501'],['none','Text only','#ffffff']] as const).map(([value,label,fillColor])=><button key={value} aria-pressed={fill===value} onClick={()=>change({fill:value,fillColor,color:value==='none'?'#ffffff':'#111111',fontWeight:800})}><span style={{background:value==='none'?'transparent':fillColor,color:value==='none'?'var(--foreground)':'#111111'}}>Aa</span><small>{label}</small></button>)}</div></InspectorSection>
    <InspectorSection title="Font"><FontPicker hideLabel key={scopeKey} value={get('fontFamily')} change={fontFamily=>change({fontFamily})}/>
      <div className="cover-format-toolbar" role="group" aria-label="Text formatting"><IconButton label="Bold text" aria-pressed={bold??'mixed'} onClick={()=>change({fontWeight:bold?400:800})}><Bold size={16}/></IconButton><IconButton label="Italic text" aria-pressed={get('italic')??'mixed'} onClick={()=>change({italic:!get('italic')})}><Italic size={16}/></IconButton><span/>{([['left',AlignLeft],['center',AlignCenter],['right',AlignRight]] as const).map(([align,Icon])=><IconButton key={align} label={`Align text ${align}`} aria-pressed={get('align')===undefined?'mixed':get('align')===align} onClick={()=>change({align})}><Icon size={16}/></IconButton>)}{(bold===undefined||get('italic')===undefined||get('align')===undefined)&&<small className="style-mixed-label">Mixed</small>}</div>
      {range('fontSize','Size',16,200)}<div className="text-spacing-controls"><StyleNumber key={scopeKey+'-line'} label="Line height" value={get('lineHeight')} min={80} max={300} scale={100} unit="%" checkpoint={checkpoint} change={lineHeight=>change({lineHeight},false)}/><StyleNumber key={scopeKey+'-letter'} label="Letter spacing" value={get('letterSpacing')} min={-10} max={30} scale={100} unit="%" checkpoint={checkpoint} change={letterSpacing=>change({letterSpacing},false)}/></div>
    </InspectorSection>
    <InspectorSection title="Color">{color('color','Text color')}</InspectorSection>
    <InspectorSection title="Background"><StyleToggle label="Text background" value={background} change={enabled=>change({fill:enabled?'box':'none'})}/>{styles.some(text=>text.fill!=='none')&&<>{color('fillColor','Fill color')}{range('padding','Padding',0,60)}{range('radius','Roundness',0,100)}</>}</InspectorSection>
    <OutlineControls key={scopeKey+'-outline'} values={styles} change={change} checkpoint={checkpoint}/>
    <ShadowControls key={scopeKey} values={styles} change={(shadow,record)=>change({shadow},record)} checkpoint={checkpoint}/>
    <details className="inspector-section advanced"><summary><span>Position & size</span><ChevronRight size={15}/></summary><div className="advanced-content">{range('width','Text box width',10,96)}{range('x','Horizontal position',0,100)}{range('y','Vertical position',0,100)}<Button variant="outline" size="sm" onClick={()=>change({x:50})}>Center horizontally</Button><p className="field-hint">Drag the text on the preview to move it.</p></div></details>
  </div>;
}
export function TextAppearance({text,change,remove,duplicate,checkpoint,context='cover'}:{text?:CoverText;change:(patch:Partial<CoverText>,record?:boolean)=>void;remove:()=>void;duplicate:()=>void;checkpoint:()=>void;context?:'cover'|'video'}){
  if(!text)return <div className="inspector-empty"><ImageIcon size={28}/><h3>Your first impression.</h3><p>Pick a frame on the left. Add a title to style it here, then drag it into place on the cover.</p></div>;
  const actionsHeader=context==='cover'?<InspectorItemHeader icon={<Type size={20}/>} title="Cover text" detail={text.text||'Empty text'} actions={<InspectorActions label="cover text" visible={!text.hidden} toggle={()=>change({hidden:!text.hidden})} duplicate={duplicate} remove={remove}/>}/>:null;
  return <>{actionsHeader}<TextStyleControls styles={[text]} scopeKey={text.id} change={change} checkpoint={checkpoint}><label className="field"><textarea className="input cover-title-input" aria-label={context==='cover'?'Cover title':'Video text'} maxLength={500} value={text.text} onChange={event=>change({text:event.target.value})}/></label></TextStyleControls></>;
}
