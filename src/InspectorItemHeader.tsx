import React from 'react';
import {Copy,Eye,EyeOff,Trash2,Volume2,VolumeX} from 'lucide-react';
import {IconButton} from './ui/primitives';
import './itemActions.css';
export function InspectorActions({label,visible,toggle,duplicate,remove,audio=false}:{label:string;visible:boolean|'mixed';toggle:()=>void;duplicate:()=>void;remove:()=>void;audio?:boolean}){
  const shown=visible===true,View=audio?(shown?Volume2:VolumeX):(shown?Eye:EyeOff);
  return <div className="selected-item-actions" role="group" aria-label={`${label} actions`}><IconButton label={`${audio?(shown?'Mute':'Unmute'):(shown?'Hide':'Show')} ${label}`} aria-pressed={visible} onClick={toggle}><View size={15}/></IconButton><IconButton label={`Duplicate ${label}`} onClick={duplicate}><Copy size={15}/></IconButton><IconButton label={`Delete ${label}`} className="delete-clip" onClick={remove}><Trash2 size={15}/></IconButton></div>;
}
export function InspectorItemHeader({icon,title,detail,actions,kind='caption'}:{icon:React.ReactNode;title:string;detail:React.ReactNode;actions:React.ReactNode;kind?:string}){
  return <div className="selected-clip-heading selected-content-heading"><span className={`selected-icon ${kind}`}>{icon}</span><div className="selected-clip-info"><h3 title={title}>{title}</h3><p>{detail}</p></div>{actions}</div>;
}
