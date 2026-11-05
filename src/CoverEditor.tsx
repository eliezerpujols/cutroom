import {coverFrameItems,coverSceneProject,setCoverItemVisibility} from './coverScene';
import React,{useEffect,useMemo,useState} from 'react';
import {Thumbnail} from '@remotion/player';
import {X,ArrowDownToLine,Plus,ChevronLeft,ChevronRight,LoaderCircle,Eye,EyeOff,Box,Type,ClosedCaption,Image as ImageIcon} from 'lucide-react';
import {Button,IconButton,Slider,DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from './ui/primitives';
import {TimeValue} from './ClipAdjustments';
import {TextAppearance} from './TextAppearance';
import {TextDragOverlay} from './TextDragOverlay';
import {EditComposition} from './remotion/Composition';
import {coverFrame,defaultCover,frameThumbnail,type Cover,type CoverText} from './visuals';
import {FPS,endFrame,time,type Asset,type Project} from './model';
import {api} from './useEditor';

type Change=(patch:Partial<Cover>,record?:boolean)=>void;
type CoverJob={id:string;status:string;progress:number;url?:string;filename?:string;error?:string};
const keys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown']);
export function CoverPanel({project,assets,change,chooseFrame,checkpoint,selected,select,close,projectId,instanceId,selectedIds,selectItem,editScene,browse}:{selectedIds:string[];selectItem:(id:string)=>void;editScene:(change:(p:Project)=>Project,record?:boolean)=>void;browse:(tab:'media'|'text'|'studio'|'giphy'|'effects'|'transcript')=>void;project:Project;assets:Asset[];change:Change;chooseFrame:(frame:number,record?:boolean)=>void;checkpoint:()=>void;selected:string|null;select:(id:string|null)=>void;close:()=>void;projectId:string;instanceId?:string}){
  const cover=project.cover||defaultCover,at=coverFrame(project),last=endFrame(project)-1;
  const jobKey='cutroom-cover-export-'+projectId+'-'+(instanceId||'legacy');
  const [job,setJob]=useState<CoverJob|null>(()=>{try{const saved=JSON.parse(localStorage.getItem(jobKey)||'null');return saved&&typeof saved.id==='string'&&/^[a-f0-9-]{36}$/.test(saved.id)?saved:null;}catch{return null;}}),[submitting,setSubmitting]=useState(false),[error,setError]=useState('');
  const busy=submitting||!!job&&!['completed','failed'].includes(job.status);
  const saveJob=(value:CoverJob|null)=>{try{if(value)localStorage.setItem(jobKey,JSON.stringify(value));else localStorage.removeItem(jobKey);}catch{}};
  useEffect(()=>{saveJob(job);},[job,jobKey]);
  useEffect(()=>{if(!job?.id||['completed','failed'].includes(job.status))return;let stopped=false;let timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{const next=await api<NonNullable<typeof job>>('/api/export/'+job.id);if(stopped)return;setJob(next);if(['completed','failed'].includes(next.status)){setSubmitting(false);return;}}catch(e){if(stopped)return;setJob(null);saveJob(null);setError('The cover export status is unavailable. Check the project exports folder before starting another.');setSubmitting(false);return;}timer=setTimeout(poll,1000);};timer=setTimeout(poll,500);return()=>{stopped=true;clearTimeout(timer);};},[job?.id,job?.status]);
  async function exportCover(){setSubmitting(true);setError('');setJob(null);saveJob(null);try{const next=await api<CoverJob>('/api/projects/'+projectId+'/cover/export',{method:'POST',body:JSON.stringify({project})});saveJob(next);setJob(next);}catch(e){setError((e as Error).message);}finally{setSubmitting(false);}}
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

    <div className="cover-export"><Button className="full-width" disabled={busy||!project.clips.some(c=>c.kind==='video')} onClick={()=>void exportCover()}>{busy?<LoaderCircle className="spin" size={16}/>:<ArrowDownToLine size={16}/>} {busy?'Exporting cover…':'Export cover · PNG'}</Button>{job?.status==='completed'&&job.url&&<a className="cover-download" href={job.url} download={job.filename}><ImageIcon size={14}/>Download cover</a>}{(error||job?.error)&&<p className="inline-error" role="alert">{error||job?.error}</p>}<p className="field-hint">A separate image at {project.width} × {project.height}.</p></div>
  </section>;
}

export const CoverInspector=TextAppearance;

export function CoverDragOverlay({project,...props}:{project:Project;selected:string|null;select:(id:string)=>void;change:(id:string,patch:Partial<CoverText>,record?:boolean)=>void;checkpoint:()=>void;editingChanged?:(id:string|null)=>void;reportError?:(message:string)=>void}){
  return <TextDragOverlay width={project.width} height={project.height} texts={(project.cover?.texts||[]).filter(text=>!text.hidden)} label="cover text" {...props}/>;
}

function CoverThumbnailFallback(){return <span className="cover-thumbnail-fallback"><ImageIcon size={18}/></span>;}
const CoverThumbnail=React.memo(function CoverThumbnail({project,assets}:{project:Project;assets:Asset[]}){
  const inputProps=useMemo(()=>({project,assets,coverMode:true}),[project,assets]);
  return <Thumbnail component={EditComposition} inputProps={inputProps} frameToDisplay={coverFrame(project)} durationInFrames={endFrame(coverSceneProject(project))} compositionWidth={project.width} compositionHeight={project.height} fps={FPS} className="cover-tile-composition" style={{width:'100%',height:'100%'}} renderLoading={CoverThumbnailFallback} errorFallback={CoverThumbnailFallback}/>;
});
export function CoverTile({project,assets,active,open}:{project:Project;assets:Asset[];active:boolean;open:()=>void}){
  return <button className="timeline-cover" aria-label="Edit cover" aria-pressed={active} onClick={open}><span className="timeline-cover-image" aria-hidden="true"><CoverThumbnail project={project} assets={assets}/></span><span>Cover</span></button>;
}
