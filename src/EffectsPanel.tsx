import {EffectTile} from './EffectTile';
import {textAnimationOptions,textMotionOptions,textStyleOptions,textAppearanceOptions,textEffectDefaults,isTextAnimation} from './textEffects';
import {textTransitionTargets} from './textTransitions';
import {MotionTimingControls} from './MotionTimingControls';
import React,{useEffect,useId,useState} from 'react';
import {ChevronDown,RotateCcw,X} from 'lucide-react';
import {Button,IconButton} from './ui/primitives';
import {commonStyleValue,StyleRange,StyleNumber,StyleColor} from './StyleControls';
import {defaultEffects,motionOptions,selectedEffectItems,patchSelectionEffects,mapSelectionMotion,transitionPrevious,type Effects,type MotionKind} from './effects';
import {FPS,type Asset,type Project} from './model';
import './effects.css';
import {dynamicMotionOptions,styleOptions,continuousDefaults,supportsMotionTiming,resizeMotionTiming,withMotionTiming,type ContinuousEffects} from './continuousEffects';

type EffectTab='enter'|'exit'|'transition';
type EffectCategory='animation'|'motion'|'styles'|'appearance';
const categories=[['animation','Animation'],['motion','Motion'],['styles','Styles'],['appearance','Appearance']] as const;
const tabs=[['enter','In'],['exit','Out'],['transition','Between']] as const;
const transitionOptions=[['none','None'],['fade','Crossfade'],['slide-left','Slide'],['wipe','Wipe']] as const;

function EffectTabs<T extends string>({options,value,change,applied,id,label,className}:{options:readonly (readonly [T,string])[];value:T;change:(value:T)=>void;applied:Record<T,boolean>;id:string;label:string;className:string}){
  return <div className={className} role="tablist" aria-label={label}>{options.map(([key,name],index)=><Button key={key} id={`${id}-${key}`} role="tab" variant="ghost" size="sm" aria-selected={value===key} aria-label={applied[key]?`${name}, effect applied`:name} aria-controls={`${id}-panel`} tabIndex={value===key?0:-1} onClick={()=>change(key)} onKeyDown={event=>{const next=event.key==='ArrowRight'?(index+1)%options.length:event.key==='ArrowLeft'?(index+options.length-1)%options.length:event.key==='Home'?0:event.key==='End'?options.length-1:null;if(next!==null){event.preventDefault();change(options[next][0]);document.getElementById(`${id}-${options[next][0]}`)?.focus();}}}>{name}{applied[key]&&<span className="status-dot" aria-hidden="true"/>}</Button>)}</div>;
}


export function EffectsPanel({project,assets,ids,edit,checkpoint,hide,transitionRequest=0,still=false}:{still?:boolean;transitionRequest?:number;project:Project;assets:Asset[];ids:string[];edit:(change:(project:Project)=>Project,record?:boolean)=>void;checkpoint:()=>void;hide:()=>void}){
  const [category,setCategory]=useState<EffectCategory>(still?'styles':'animation'),[tab,setTab]=useState<EffectTab>('enter'),panelId=useId(),categoryId=useId();
  useEffect(()=>{if(transitionRequest){setCategory('animation');setTab('transition');}},[transitionRequest]);
  const items=selectedEffectItems(project,ids),values=items.map(item=>({...defaultEffects,...textEffectDefaults,...item.effects})),scope=[...ids].sort().join('|');
  const textIds=new Set([...(project.texts??[]).map(text=>text.id),...(project.cover?.texts??[]).map(text=>text.id),...(project.captions??[]).flatMap(layer=>layer.cues.map(cue=>cue.id))]),allText=items.length>0&&items.every(item=>textIds.has(item.id));
  const clips=project.clips.filter(clip=>ids.includes(clip.id)&&clip.kind==='video');
  const transitions=clips.filter(clip=>transitionPrevious(project,{...clip,effects:{...defaultEffects,...clip.effects,transition:'fade'}}));
  const applicableTransitions=allText?textTransitionTargets(project,ids):transitions;
  const targetIds=tab==='transition'?applicableTransitions.map(clip=>clip.id):ids;
  const tabValues=tab==='transition'?applicableTransitions.map(clip=>({...defaultEffects,...clip.effects})):values;
  const current=commonStyleValue(tabValues,tab),durationField=tab==='enter'?'enterFrames':tab==='exit'?'exitFrames':'transitionFrames';
  const change=(patch:Partial<Effects>,record=true,targets=ids)=>edit(p=>patchSelectionEffects(p,targets,patch),record);
  const thumbnail=assets.find(asset=>asset.id===clips[0]?.assetId)?.thumbnails[0];
  const previous=transitions[0]&&transitionPrevious(project,{...transitions[0],effects:{...defaultEffects,...transitions[0].effects,transition:'fade'}});
  const previousThumbnail=assets.find(asset=>asset.id===previous?.assetId)?.thumbnails.at(-1);
  const disabled=!items.length||(tab==='transition'&&!applicableTransitions.length);
  const showDuration=tabValues.some(value=>value[tab]!=='none');
  const applied={enter:values.some(value=>value.enter!=='none'),exit:values.some(value=>value.exit!=='none'),transition:items.some(item=>(item.effects?.transition??'none')!=='none')};
  const categoryApplied={motion:values.some(v=>(v.motion??'none')!=='none'||v.textMotion!=='none'),styles:values.some(v=>(v.style??'none')!=='none'||v.textStyle!=='none'),animation:applied.enter||applied.exit||applied.transition,appearance:values.some(value=>value.blur>0||value.mask!=='none'||value.textAppearance!=='none')};
  const reset=()=>change(category==='motion'?{textMotion:'none',motion:'none',motionIntensity:50,motionFrames:30,motionLoop:false,motionTiming:undefined}:category==='styles'?{textStyle:'none',style:'none',styleIntensity:50}:category==='appearance'?{textAppearance:'none',blur:defaultEffects.blur,mask:defaultEffects.mask}:{enter:defaultEffects.enter,exit:defaultEffects.exit,transition:defaultEffects.transition,enterFrames:defaultEffects.enterFrames,exitFrames:defaultEffects.exitFrames,transitionFrames:defaultEffects.transitionFrames});
  const options=tab==='transition'?transitionOptions:motionOptions;
  const basicAnimations=options.filter(([kind])=>!allText||tab==='transition'||kind!=='none');
  return <section className="adjustments-panel effects-panel" aria-label="Effects">
    <div className="panel-heading"><h2>Effects</h2><div className="effect-heading-actions"><IconButton label={`Reset selected ${category}`} disabled={!items.length||!categoryApplied[category]} onClick={reset}><RotateCcw size={14}/></IconButton><IconButton label="Hide effects" onClick={hide}><X size={16}/></IconButton></div></div>
    <EffectTabs options={still?categories.filter(([key])=>key==='styles'||key==='appearance'):categories} value={category} change={setCategory} applied={categoryApplied} id={categoryId} label="Effect category" className="effect-category-tabs"/>
    <div id={`${categoryId}-panel`} role="tabpanel" aria-labelledby={`${categoryId}-${category}`}>
    {category==='animation'?<>
    <EffectTabs options={tabs} value={tab} change={setTab} applied={applied} id={panelId} label="Effect timing" className="effect-tabs"/>
    <div id={`${panelId}-panel`} role="tabpanel" aria-labelledby={`${panelId}-${tab}`}>
      {allText&&tab!=='transition'&&<><div className="effect-grid">{([['none','None'],...textAnimationOptions] as const).map(([kind,name])=><EffectTile textPreview key={tab+kind} kind={kind} name={name} mode={tab} selected={current===kind} choose={()=>change({[tab]:kind},true,targetIds)}/>)}</div></>}
      <BasicEffects collapsible={allText&&tab!=='transition'}><div className="effect-grid">{basicAnimations.map(([kind,name])=><EffectTile textPreview={allText} key={tab+kind} kind={kind} name={name} mode={tab} thumbnail={thumbnail} previousThumbnail={previousThumbnail} selected={current===kind} disabled={disabled} choose={()=>change({[tab]:kind},true,targetIds)}/>)}</div></BasicEffects>

      {disabled?<p className="field-hint effect-note">{!items.length?'Select a clip, text or caption.':allText?'Select consecutive titles or captions.':'Select a clip after another on the same track.'}</p>:showDuration?<div className="effect-duration"><StyleNumber key={scope+tab} label="Duration" value={commonStyleValue(tabValues,durationField)} min={1/FPS} max={3} step={1/FPS} scale={1/FPS} unit="s" checkpoint={checkpoint} change={value=>change({[durationField]:Math.round(value)},false,targetIds)}/></div>:null}
      {allText&&isTextAnimation(current)&&<div className="effect-text-controls effect-settings">{current!=='text-words'&&<TextUnitChoice value={commonStyleValue(values,'textUnit')} change={textUnit=>change({textUnit})}/>}<StyleRange editable label="Stagger" value={commonStyleValue(values,'textStagger')} min={0} max={90} unit="%" checkpoint={checkpoint} change={textStagger=>change({textStagger},false)}/></div>}
      {items.length>1&&<p className="effect-selection-count">{tab==='transition'?applicableTransitions.length:items.length} selected{current===undefined?' · Mixed':''}</p>}
    </div>
    </>:category==='motion'||category==='styles'?<>
      {allText&&<><div className="effect-grid">{(category==='motion'?textMotionOptions:textStyleOptions).map(([kind,name])=>{const field=category==='motion'?'textMotion':'textStyle',general=category==='motion'?'motion':'style';return <EffectTile textPreview key={field+kind} name={name} kind="none" group={category==='motion'?'Text motion':'Text style'} preset={{[field]:kind,motionLoop:true,motionFrames:48,textAccent:commonStyleValue(values,'textAccent')??textEffectDefaults.textAccent,styleIntensity:80}} selected={commonStyleValue(values,field)===kind&&(kind!=='none'||commonStyleValue(values,general)==='none')} choose={()=>change({[field]:kind,[general]:'none'})}/>;})}</div></>}
      <BasicEffects collapsible={allText}><div className="effect-grid">{(category==='motion'?dynamicMotionOptions:styleOptions).filter(([kind])=>!allText||kind!=='none').map(([kind,name])=>{const field=category==='motion'?'motion':'style';return <EffectTile textPreview={allText} key={category+kind} name={name} kind="none" group={category==='motion'?'Motion':'Style'} thumbnail={thumbnail} preset={{...continuousDefaults,[field]:kind,motionLoop:true,motionFrames:54,styleIntensity:80}} selected={commonStyleValue(values,field)===kind} disabled={!items.length} choose={()=>change({[field]:kind,[category==='motion'?'textMotion':'textStyle']:'none'})}/>;})}</div></BasicEffects>

      {!items.length?<p className="field-hint effect-note">Select a clip, text or caption.</p>:categoryApplied[category]&&<div className="effect-duration effect-settings">
        {(category==='motion'||!allText||values.some(v=>v.textStyle==='none'||v.textStyle==='neon'||v.textStyle==='chromatic'))&&<StyleRange editable label="Intensity" value={commonStyleValue(values,category==='motion'?'motionIntensity':'styleIntensity')} min={0} max={100} unit="%" checkpoint={checkpoint} change={v=>change({[category==='motion'?'motionIntensity':'styleIntensity']:v},false)}/>}
        {allText&&category==='styles'&&values.some(v=>['gradient','neon','duotone'].includes(v.textStyle))&&<StyleColor label="Accent" value={commonStyleValue(values,'textAccent')} checkpoint={checkpoint} change={textAccent=>change({textAccent},false)}/>}
        {category==='motion'&&<><StyleNumber key={scope+'motion'} label="Duration" value={commonStyleValue(values,'motionFrames')} min={2/FPS} max={30} step={1/FPS} scale={1/FPS} unit="s" checkpoint={checkpoint} change={v=>edit(p=>mapSelectionMotion(p,ids,e=>({...e,...resizeMotionTiming(e,v)})),false)}/><div className="effect-playback"><span id={`${panelId}-playback`}>Playback</span><div className="speed-presets" role="group" aria-labelledby={`${panelId}-playback`}>{([[false,'Once'],[true,'Loop']] as const).map(([loop,label])=><Button key={label} variant="ghost" size="sm" aria-pressed={commonStyleValue(values,'motionLoop')===loop} onClick={()=>change({motionLoop:loop})}>{label}</Button>)}</div></div>{allText&&values.some(v=>v.textMotion!=='none')&&<TextUnitChoice value={commonStyleValue(values,'textUnit')} change={textUnit=>change({textUnit})}/>} {values.every(value=>supportsMotionTiming(value.motion))&&<MotionTimingControls values={values} scope={scope} checkpoint={checkpoint} change={patch=>edit(p=>mapSelectionMotion(p,ids,e=>({...e,...withMotionTiming(e,patch)})),false)}/>}</>}
      </div>}
    </>:<div className="effect-appearance">
      {items.length?<>{allText&&<><div className="effect-grid">{textAppearanceOptions.map(([kind,name])=><EffectTile textPreview key={kind} name={name} kind="none" group="Text appearance" preset={{textAppearance:kind,textAccent:commonStyleValue(values,'textAccent')??textEffectDefaults.textAccent}} selected={commonStyleValue(values,'textAppearance')===kind} choose={()=>change({textAppearance:kind})}/>)}</div>{values.some(v=>['outline','extrude','glow','highlight'].includes(v.textAppearance))&&<div className="effect-text-controls"><StyleColor label="Accent" value={commonStyleValue(values,'textAccent')} checkpoint={checkpoint} change={textAccent=>change({textAccent},false)}/></div>}</>}<StyleRange label="Blur" value={commonStyleValue(values,'blur')} min={0} max={40} unit=" px" checkpoint={checkpoint} change={blur=>change({blur},false)}/>{!allText&&<div className="caption-control-section"><div className="caption-section-label">Mask</div><div className="effect-grid" role="group" aria-label="Shape mask">{([['none','None'],['rounded','Rounded'],['circle','Circle']] as const).map(([mask,name])=><EffectTile key={mask} kind="none" name={name} mask={mask} thumbnail={thumbnail} selected={commonStyleValue(values,'mask')===mask} choose={()=>change({mask})}/>)}</div></div>}</>:<p className="field-hint">Select a clip, text or caption.</p>}
    </div>}
    </div>
  </section>;
}

function TextUnitChoice({value,change}:{value:'letter'|'word'|undefined;change:(unit:'letter'|'word')=>void}){return <div className="effect-playback"><span>Animate</span><div className="speed-presets" role="group" aria-label="Animate text by">{([['letter','Letters'],['word','Words']] as const).map(([unit,label])=><Button key={unit} variant="ghost" size="sm" aria-pressed={value===unit} onClick={()=>change(unit)}>{label}</Button>)}</div></div>;}

function BasicEffects({collapsible,children}:{collapsible:boolean;children:React.ReactNode}){return collapsible?<details className="inspector-section advanced effect-basic"><summary><span>Basic</span><ChevronDown size={15} aria-hidden="true"/></summary>{children}</details>:<>{children}</>;}
