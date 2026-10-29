import React,{useEffect,useState} from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import {Check,ChevronDown,Scan} from 'lucide-react';
import {Button,DropdownMenu,DropdownMenuContent,DropdownMenuTrigger,Tip} from './ui/primitives';

// Centered crop estimates, not platform UI safe zones. Keep this state out of
// Project/Remotion props: it must never enter MP4 or cover PNG rendering.
export const coverGuides=[
  {id:'tiktok-profile',label:'TikTok profile',ratio:3/4,ratioLabel:'3:4'},
  {id:'instagram-grid',label:'Instagram grid',ratio:3/4,ratioLabel:'3:4'},
  {id:'portrait-feed',label:'Portrait feed',ratio:4/5,ratioLabel:'4:5'},
  {id:'square',label:'Square preview',ratio:1,ratioLabel:'1:1'},
] as const;
type GuideId=typeof coverGuides[number]['id'];
type GuideState={enabled:boolean;preset:GuideId};
const defaults:GuideState={enabled:false,preset:'tiktok-profile'};
const isGuideId=(value:unknown):value is GuideId=>coverGuides.some(guide=>guide.id===value);
export function useCoverGuides(projectId:string,instanceId?:string){
  const key=`cutroom-cover-guides-${projectId}-${instanceId||'legacy'}`;
  const [state,setState]=useState<GuideState>(()=>{
    try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved.enabled==='boolean'&&isGuideId(saved.preset))return saved;}catch{}
    return defaults;
  });
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{/* Optional view preference. */}},[key,state]);
  return {state,setState};
}

export function CoverGuideControls({state,change}:{state:GuideState;change:React.Dispatch<React.SetStateAction<GuideState>>}){
  const preset=coverGuides.find(guide=>guide.id===state.preset)!;
  const toggleLabel=state.enabled?'Hide cover crop guide':`Show ${preset.label} crop guide`;
  return <div className="cover-guide-controls" role="group" aria-label="Cover preview guides">
    <Tip label={toggleLabel}><Button variant="ghost" size="sm" className="cover-guide-toggle" aria-label={toggleLabel} aria-pressed={state.enabled} onClick={()=>change(previous=>({...previous,enabled:!previous.enabled}))}><Scan size={14}/><span>{state.enabled?preset.label:'Cover guides'}</span></Button></Tip>
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="cover-guide-options" aria-label="Choose cover crop guide"><ChevronDown size={13}/></Button></DropdownMenuTrigger><DropdownMenuContent>
      <Dropdown.RadioGroup aria-label="Cover crop" value={state.enabled?state.preset:'off'} onValueChange={value=>{if(value==='off')change(previous=>({...previous,enabled:false}));else if(isGuideId(value))change({enabled:true,preset:value});}}>
        <Dropdown.RadioItem className="dropdown-item cover-guide-menu-item" value="off"><span className="cover-guide-menu-mark"><Dropdown.ItemIndicator><Check size={14}/></Dropdown.ItemIndicator></span><span>No guides</span></Dropdown.RadioItem>
        {coverGuides.map(guide=><Dropdown.RadioItem key={guide.id} className="dropdown-item cover-guide-menu-item" value={guide.id}><span className="cover-guide-menu-mark"><Dropdown.ItemIndicator><Check size={14}/></Dropdown.ItemIndicator></span><span>{guide.label}</span><small>{guide.ratioLabel}</small></Dropdown.RadioItem>)}
      </Dropdown.RadioGroup>
    </DropdownMenuContent></DropdownMenu>
    <span className="sr-only" role="status" aria-live="polite">{state.enabled?`${preset.label}, ${preset.ratioLabel} crop guide shown. This guide is not exported.`:'Cover guides hidden.'}</span>
  </div>;
}

export function CoverGuideOverlay({state,width,height}:{state:GuideState;width:number;height:number}){
  if(!state.enabled)return null;
  const preset=coverGuides.find(guide=>guide.id===state.preset)!;
  const aspect=width/height,cropWidth=Math.min(100,preset.ratio/aspect*100),cropHeight=Math.min(100,aspect/preset.ratio*100);
  return <div className="cover-guide-overlay" aria-hidden="true"><div className="cover-guide-window" style={{left:`${(100-cropWidth)/2}%`,top:`${(100-cropHeight)/2}%`,width:`${cropWidth}%`,height:`${cropHeight}%`}}><span className="cover-guide-caption">{preset.label} <span>· {preset.ratioLabel}</span></span></div></div>;
}
