import React from 'react';
import {Plus,Type,X} from 'lucide-react';
import {Button,IconButton} from './ui/primitives';
import {time} from './model';
import {textPresetStyle,type VideoText,type TextPreset} from './videoText';
import {startLibraryDrag,TEXT_PRESET_DRAG_TYPE,TEXT_DRAG_TYPE} from './libraryDrag';
import {usePanelSelection,modifierKeySelection,type RowModifiers} from './usePanelSelection';

type Props={texts:VideoText[];selectedTextIds:string[];selectedIds:string[];selectItems:(ids:string[])=>void;applyTextPreset:(preset:TextPreset)=>void;addText:(preset?:TextPreset)=>void;seek:(frame:number)=>void;hide:()=>void};
export function TextPanel({texts,selectedTextIds,selectedIds,selectItems,applyTextPreset,addText,seek,hide}:Props){
  const selectedTexts=texts.filter(text=>selectedTextIds.includes(text.id));
  const pick=usePanelSelection(selectedIds,selectItems);
  const chooseText=(id:string,event:RowModifiers)=>{pick('texts',texts.map(text=>text.id),id,event);const text=texts.find(text=>text.id===id);if(text)seek(text.start);};
  return <div className="caption-panel text-panel"><div className="panel-heading"><h2>Text</h2><IconButton label="Hide text panel" onClick={hide}><X size={15}/></IconButton></div>
    <div className="manual-text-tools"><Button className="full-width" disabled={texts.length>=100} draggable={texts.length<100} onDragStart={event=>startLibraryDrag(event,TEXT_PRESET_DRAG_TYPE,'heading')} onClick={()=>addText()}><Plus size={16}/>Add text</Button>{selectedTexts.length>0&&<p className="field-hint">Apply a preset to {selectedTexts.length} selected text{selectedTexts.length===1?'':'s'}.</p>}<div className="video-text-presets" role="group" aria-label="Text presets">{([['heading','Heading'],['subtitle','Subtitle'],['body','Body']] as const).map(([preset,label])=>{const style=textPresetStyle(preset),active=selectedTexts.length>0&&selectedTexts.every(text=>text.fontSize===style.fontSize&&text.fontWeight===style.fontWeight&&text.strokeWidth===style.strokeWidth);return <button key={preset} draggable={texts.length<100} onDragStart={event=>startLibraryDrag(event,TEXT_PRESET_DRAG_TYPE,preset)} title={`Drag to add ${label.toLowerCase()}`} aria-label={selectedTexts.length?`Apply ${label} preset`:`Add ${label.toLowerCase()}`} aria-pressed={selectedTexts.length?active:undefined} disabled={!selectedTexts.length&&texts.length>=100} onClick={()=>selectedTexts.length?applyTextPreset(preset):addText(preset)}><span className={'text-preset-'+preset}>Aa</span><small>{label}</small></button>;})}</div></div>
    {!!texts.length&&<div className="video-text-list"><h3>Your text <span>{texts.length}</span>{selectedTexts.length>0&&<small className="panel-selection-count">{selectedTexts.length} selected</small>}</h3>{texts.map(text=><button key={text.id} draggable onDragStart={event=>startLibraryDrag(event,TEXT_DRAG_TYPE,text.id)} className="video-text-list-item" aria-pressed={selectedTextIds.includes(text.id)} onClick={event=>chooseText(text.id,event)} onKeyDown={event=>modifierKeySelection(event,modifiers=>chooseText(text.id,modifiers))}><Type size={14}/><span>{text.text||'Empty text'}</span><small>{time(text.start,true)}</small></button>)}</div>}
  </div>;
}
