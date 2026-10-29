import React,{useEffect,useState} from 'react';
import {X,ArrowDownToLine,Plus,ChevronLeft,ChevronRight,LoaderCircle,Image as ImageIcon} from 'lucide-react';
import {Button,IconButton,Slider} from './ui/primitives';
import {TimeValue} from './ClipAdjustments';
import {TextAppearance} from './TextAppearance';
import {TextDragOverlay} from './TextDragOverlay';
import {coverFrame,defaultCover,defaultCoverText,frameThumbnail,type Cover,type CoverText} from './visuals';
import {clamp,endFrame,time,uid,type Asset,type Project} from './model';
import {api} from './useEditor';

type Change=(patch:Partial<Cover>,record?:boolean)=>void;
type CoverJob={id:string;status:string;progress:number;url?:string;filename?:string;error?:string};
const keys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown']);
export function CoverPanel({project,assets,change,chooseFrame,checkpoint,selected,select,close,projectId,instanceId}:{project:Project;assets:Asset[];change:Change;chooseFrame:(frame:number,record?:boolean)=>void;checkpoint:()=>void;selected:string|null;select:(id:string|null)=>void;close:()=>void;projectId:string;instanceId?:string}){
  const cover=project.cover||defaultCover,at=coverFrame(project),last=endFrame(project)-1;
  const jobKey='cutroom-cover-export-'+projectId+'-'+(instanceId||'legacy');
  const [job,setJob]=useState<CoverJob|null>(()=>{try{const saved=JSON.parse(localStorage.getItem(jobKey)||'null');return saved&&typeof saved.id==='string'&&/^[a-f0-9-]{36}$/.test(saved.id)?saved:null;}catch{return null;}}),[submitting,setSubmitting]=useState(false),[error,setError]=useState('');
  const busy=submitting||!!job&&!['completed','failed'].includes(job.status);
  const saveJob=(value:CoverJob|null)=>{try{if(value)localStorage.setItem(jobKey,JSON.stringify(value));else localStorage.removeItem(jobKey);}catch{}};
  useEffect(()=>{saveJob(job);},[job,jobKey]);
  useEffect(()=>{if(!job?.id||['completed','failed'].includes(job.status))return;let stopped=false;let timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{const next=await api<NonNullable<typeof job>>('/api/export/'+job.id);if(stopped)return;setJob(next);if(['completed','failed'].includes(next.status)){setSubmitting(false);return;}}catch(e){if(stopped)return;setJob(null);saveJob(null);setError('The cover export status is unavailable. Check the project exports folder before starting another.');setSubmitting(false);return;}timer=setTimeout(poll,1000);};timer=setTimeout(poll,500);return()=>{stopped=true;clearTimeout(timer);};},[job?.id,job?.status]);
  async function exportCover(){setSubmitting(true);setError('');setJob(null);saveJob(null);try{const next=await api<CoverJob>('/api/projects/'+projectId+'/cover/export',{method:'POST',body:JSON.stringify({project})});saveJob(next);setJob(next);}catch(e){setError((e as Error).message);}finally{setSubmitting(false);}}
  const frames=Array.from({length:10},(_,index)=>Math.round(index/9*last));
  return <section className="cover-panel" aria-label="Cover editor"><div className="panel-heading"><h2>Cover</h2><IconButton label="Close cover panel" onClick={close}><X size={16}/></IconButton></div><p className="visual-panel-intro">Choose a frame. Make it yours.</p>
    <div className="cover-picker"><div className="adjustment-heading"><h3>Cover frame</h3><TimeValue label="Cover frame in seconds" frames={at} max={last} change={chooseFrame}/></div><div className="cover-filmstrip" role="group" aria-label="Choose a cover frame">{frames.map((sample,index)=>{const thumb=frameThumbnail(project,assets,sample);return <button key={index} aria-label={`Use frame at ${time(sample,true)}`} aria-pressed={index===Math.round(at/Math.max(1,last)*9)} onClick={()=>chooseFrame(sample)}>{thumb?<img src={thumb} alt=""/>:<span/>}</button>;})}</div><Slider label="Cover frame" min={0} max={Math.max(1,last)} step={1} value={[at]} disabled={last===0} onPointerDown={checkpoint} onKeyDown={event=>{if(keys.has(event.key))checkpoint();}} onValueChange={([value])=>chooseFrame(value,false)}/><div className="cover-frame-actions"><IconButton label="Previous cover frame" disabled={at<=0} onClick={()=>chooseFrame(at-1)}><ChevronLeft size={15}/></IconButton><span className="cover-frame-number">Frame {at+1}</span><IconButton label="Next cover frame" disabled={at>=last} onClick={()=>chooseFrame(at+1)}><ChevronRight size={15}/></IconButton></div></div>
    <div className="cover-text-list"><div className="adjustment-heading"><h3>Text</h3><Button variant="ghost" size="sm" disabled={cover.texts.length>=12} onClick={()=>{const id=uid();change({texts:[...cover.texts,{...defaultCoverText,id,y:clamp(18+cover.texts.length*18,10,85)}]});select(id);}}><Plus size={14}/>Add</Button></div>{cover.texts.length?cover.texts.map(text=><button key={text.id} className="cover-text-item" aria-pressed={selected===text.id} onClick={()=>select(text.id)}><span className="cover-text-glyph">T</span><span>{text.text||'Empty text'}</span><ChevronRight size={14}/></button>):<button className="cover-add-text" onClick={()=>{const id=uid();change({texts:[{...defaultCoverText,id}]});select(id);}}><Plus size={17}/><span>Add a title</span></button>}</div>
    <label className="caption-toggle cover-captions"><span>Show captions on cover</span><input type="checkbox" role="switch" checked={cover.showCaptions} onChange={event=>change({showCaptions:event.target.checked})}/></label>
    <div className="cover-export"><Button className="full-width" disabled={busy||!project.clips.some(c=>c.kind==='video')} onClick={()=>void exportCover()}>{busy?<LoaderCircle className="spin" size={16}/>:<ArrowDownToLine size={16}/>} {busy?'Exporting cover…':'Export cover · PNG'}</Button>{job?.status==='completed'&&job.url&&<a className="cover-download" href={job.url} download={job.filename}><ImageIcon size={14}/>Download cover</a>}{(error||job?.error)&&<p className="inline-error" role="alert">{error||job?.error}</p>}<p className="field-hint">A separate image at {project.width} × {project.height}.</p></div>
  </section>;
}

export const CoverInspector=TextAppearance;

export function CoverDragOverlay({project,...props}:{project:Project;selected:string|null;select:(id:string)=>void;change:(id:string,patch:Partial<CoverText>,record?:boolean)=>void;checkpoint:()=>void}){
  return <TextDragOverlay width={project.width} height={project.height} texts={project.cover?.texts||[]} label="cover text" {...props}/>;
}

export function CoverTile({project,assets,active,open}:{project:Project;assets:Asset[];active:boolean;open:()=>void}){
  const thumb=frameThumbnail(project,assets,coverFrame(project));
  return <button className="timeline-cover" aria-label="Edit cover" aria-pressed={active} onClick={open}><span className="timeline-cover-image">{thumb?<img src={thumb} alt=""/>:<ImageIcon size={18}/>}<span className="timeline-cover-title">{project.cover?.texts[0]?.text}</span></span><span>Cover</span></button>;
}
