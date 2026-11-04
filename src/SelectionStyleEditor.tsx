import React from 'react';
import type {Project} from './model';
import {TextStyleControls} from './TextAppearance';
import {selectedStyles,type SelectionStylePatch} from './selectionStyles';

export function SelectionStyleEditor({project,ids,change,checkpoint}:{project:Project;ids:string[];change:(ids:string[],patch:SelectionStylePatch,record?:boolean)=>void;checkpoint:()=>void}){
  const {texts}=selectedStyles(project,ids);
  const textIds=texts.map(text=>text.id),scopeKey=[...textIds].sort().join('|');
  return <>
    {!!texts.length&&<TextStyleControls styles={texts} scopeKey={scopeKey} change={(patch,record=true)=>change(textIds,patch,record)} checkpoint={checkpoint}/>}
  </>;
}
