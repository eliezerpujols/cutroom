import {coverFrameItems,setCoverItemVisibility} from './coverScene';
import React from 'react';
import {X,Download,Plus,ChevronLeft,ChevronRight,LoaderCircle,Eye,EyeOff,Box,Type,ClosedCaption,Image as ImageIcon} from 'lucide-react';
import {Button,IconButton,Slider,DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,Dialog,DialogContent} from './ui/primitives';
import {TimeValue} from './ClipAdjustments';
import {TextAppearance} from './TextAppearance';
import {TextDragOverlay} from './TextDragOverlay';
import {coverFrame,defaultCover,frameThumbnail,type Cover,type CoverText} from './visuals';
import {endFrame,time,type Asset,type Project} from './model';
import type {CoverExportState} from './useCoverExport';

type Change=(patch:Partial<Cover>,record?:boolean)=>void;
const keys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown']);
export function CoverPanel({project,assets,change,chooseFrame,checkpoint,selected,select,close,selectedIds,selectItem,editScene,browse}:{selectedIds:string[];selectItem:(id:string)=>void;editScene:(change:(p:Project)=>Project,record?:boolean)=>void;browse:(tab:'media'|'text'|'studio'|'giphy'|'effects'|'transcript')=>void;project:Project;assets:Asset[];change:Change;chooseFrame:(frame:number,record?:boolean)=>void;checkpoint:()=>void;selected:string|null;select:(id:string|null)=>void;close:()=>void}){
  const cover=project.cover||defaultCover,at=coverFrame(project),last=endFrame(project)-1;
  const items=coverFrameItems(project,at);
  const frames=Array.from({length:10},(_,index)=>Math.round(index/9*last));
  return <section className="cover-panel" aria-label="Cover editor"><div className="panel-heading"><h2>Cover</h2><IconButton label="Close cover panel" onClick={close}><X size={16}/></IconButton></div>
    <div className="cover-picker"><div className="adjustment-heading"><h3>Cover frame</h3><TimeValue label="Cover frame in seconds" frames={at} max={last} change={chooseFrame}/></div><div className="cover-filmstrip" role="group" aria-label="Choose a cover frame">{frames.map((sample,index)=>{const thumb=frameThumbnail(project,assets,sample);return <button key={index} aria-label={`Use frame at ${time(sample,true)}`} aria-pressed={index===Math.round(at/Math.max(1,last)*9)} onClick={()=>chooseFrame(sample)}>{thumb?<img src={thumb} alt=""/>:<span/>}</button>;})}</div><Slider label="Cover frame" min={0} max={Math.max(1,last)} step={1} value={[at]} disabled={last===0} onPointerDown={checkpoint} onKeyDown={event=>{if(keys.has(event.key))checkpoint();}} onValueChange={([value])=>chooseFrame(value,false)}/><div className="cover-frame-actions"><IconButton label="Previous cover frame" disabled={at<=0} onClick={()=>chooseFrame(at-1)}><ChevronLeft size={15}/></IconButton><span className="cover-frame-number">Frame {at+1}</span><IconButton label="Next cover frame" disabled={at>=last} onClick={()=>chooseFrame(at+1)}><ChevronRight size={15}/></IconButton></div></div>

    <label className="caption-toggle cover-captions"><span>Show captions on cover</span><input type="checkbox" role="switch" checked={cover.showCaptions} onChange={event=>change({showCaptions:event.target.checked})}/></label>
    <div className="cover-frame-elements">
      <div className="adjustment-heading"><h3>In this cover</h3><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><Plus size={14}/>Add</Button></DropdownMenuTrigger><DropdownMenuContent>{([['text','Text'],['studio','Studio'],['giphy','GIF / Sticker'],['media','Media']] as const).map(([tab,label])=><DropdownMenuItem key={tab} onSelect={()=>browse(tab)}>{label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>
      {items.map(item=>{
        const visible=item.visible&&(item.kind!=='Caption'||cover.showCaptions);
        const Icon=item.kind==='Studio'?Box:item.kind==='Text'?Type:item.kind==='Caption'?ClosedCaption:ImageIcon;
        return <div key={item.id} className="cover-element-row">
          <Button variant="ghost" className="cover-element-select" aria-pressed={item.target.kind==='cover'?selected===item.id:selectedIds.includes(item.id)} onClick={()=>item.target.kind==='cover'?select(item.id):selectItem(item.id)}><Icon size={15}/><span><span>{item.name}</span><small>{item.kind}</small></span></Button>
          <IconButton label={`${visible?'Hide':'Show'} on cover: ${item.name}`} aria-pressed={visible} onClick={()=>editScene(p=>setCoverItemVisibility(p,item.target,!visible))}>{visible?<Eye size={14}/>:<EyeOff size={14}/>}</IconButton>
        </div>;
      })}
    </div>

  </section>;
}


export function CoverExportDialog({open,onOpenChange,state,folder,reveal,revealBusy,error}:{open:boolean;onOpenChange:(open:boolean)=>void;state:CoverExportState;folder:string;reveal:()=>void;revealBusy:boolean;error:string}){
  const {job,busy,exportCover}=state,failed=state.error||job?.error;
  const completed=job?.status==='completed';
  const progress=Math.round((job?.progress||0)*100);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="export-dialog" title={busy?'Exporting cover…':completed?'Export complete':failed?'Export failed':'Export cover'} description="Cover export and saved file location." descriptionClassName="sr-only">
    {busy?<div className="export-progress"><div className="progress-track" role="progressbar" aria-label="Cover export progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{width:`${Math.max(2,progress)}%`}}/></div><p>{progress}%</p></div>:completed?<>
      <div className="export-completed"><p className="export-saved-note">Saved in your project folder.</p><dl className="export-file-details"><div><dt>File</dt><dd className="export-filename">{job.filename}</dd></div><div><dt>Location</dt><dd className="export-path">{folder}</dd></div></dl></div>
      <div className="export-footer">{job.url&&<a className="button button-outline button-default" href={job.url} download={job.filename}><Download size={16}/>Download PNG</a>}<Button onClick={reveal} disabled={revealBusy}>{revealBusy&&<LoaderCircle className="spin" size={16}/>}Show in Finder</Button></div>
    </>:<><p className="inline-error" role="alert">{failed}</p><Button className="export-submit" onClick={()=>void exportCover()}>Try again</Button></>}
    {error&&<p className="inline-error" role="alert">{error}</p>}
  </DialogContent></Dialog>;
}

export const CoverInspector=TextAppearance;

export function CoverDragOverlay({project,...props}:{project:Project;selected:string|null;select:(id:string)=>void;change:(id:string,patch:Partial<CoverText>,record?:boolean)=>void;checkpoint:()=>void;editingChanged?:(id:string|null)=>void;reportError?:(message:string)=>void}){
  return <TextDragOverlay width={project.width} height={project.height} texts={(project.cover?.texts||[]).filter(text=>!text.hidden)} label="cover text" {...props}/>;
}
