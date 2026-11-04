import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import {Eye,EyeOff,SlidersHorizontal,X} from 'lucide-react';
import {Button,IconButton} from './ui/primitives';
import './shadows.css';

/** Compact property row shared by outlines and both shadow layers. */
export function StyleSettingsRow({label,color,enabled,toggle,children,open,onOpenChange}:{label:string;color:string|undefined;enabled:boolean|undefined;toggle:()=>void;children:React.ReactNode;open?:boolean;onOpenChange?:(open:boolean)=>void}){
  return <Popover.Root open={open} onOpenChange={onOpenChange}><Popover.Anchor asChild><div className={`shadow-row${enabled===false?' is-disabled':''}`}><Popover.Trigger asChild><Button variant="ghost" className="shadow-row-settings" aria-label={`${label} settings`}><span className={`shadow-swatch${color===undefined?' mixed':''}`} style={{backgroundColor:color}} aria-hidden="true"/><span>{label}</span><SlidersHorizontal size={13}/></Button></Popover.Trigger><IconButton label={`${enabled===true?'Hide':'Show'} ${label.toLowerCase()}`} aria-pressed={enabled??'mixed'} className="shadow-visibility" onClick={toggle}>{enabled===false?<EyeOff size={14}/>:<Eye size={14}/>}</IconButton></div></Popover.Anchor><Popover.Portal><Popover.Content className="shadow-popover" side="right" align="start" sideOffset={12} collisionPadding={12} aria-label={`${label} settings`} onEscapeKeyDown={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}>
    <div className="shadow-popover-heading"><span>{label}</span><Popover.Close asChild><Button variant="ghost" size="icon" aria-label={`Close ${label.toLowerCase()} settings`}><X size={14}/></Button></Popover.Close></div>
    <div className="shadow-popover-body">{children}</div>
  </Popover.Content></Popover.Portal></Popover.Root>;
}
