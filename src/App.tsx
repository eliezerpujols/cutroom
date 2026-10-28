import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Player,type PlayerRef} from '@remotion/player';
import {Play,Pause,SkipBack,SkipForward,Undo2,Redo2,Plus,Film,AudioLines,ArrowUpRight,ArrowDownToLine,Upload,Scissors,Copy,Trash2,Volume2,VolumeX,ChevronDown,ChevronRight,Check,LoaderCircle,Sun,Moon,Monitor,PanelLeftClose,PanelLeftOpen,SlidersHorizontal,FolderOpen,X,Download,Music2} from 'lucide-react';
import {Button,IconButton,TooltipProvider,Slider,Input,Dialog,DialogContent,DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from './ui/primitives';
import {EditComposition} from './remotion/Composition';
import {Timeline} from './Timeline';
import {AudioFadeControls,PlaybackControls} from './ClipAdjustments';
import {arrangeTimelineTracks,changedTimelineClipIds} from './videoTracks';
import {moveSelection} from './timelineSelection';
import {api,useEditor} from './useEditor';
import {FPS,uid,time,endFrame,clamp,splitClip,splitTarget,maxDuration,type Asset,type Clip,type Project,type Tool} from './model';

import {ProjectShell,type ProjectControls} from './ProjectShell';
import {restoredProject,useProjectSave,type Workspace} from './useProjectSave';
type ExportJob={id:string;status:string;progress:number;url?:string;error?:string;filename?:string};
type Theme='system'|'light'|'dark';
export default function App(){return <ProjectShell>{(workspace,controls)=><Editor initial={workspace} controls={controls}/>}</ProjectShell>;}
function Editor({initial,controls}:{initial:Workspace;controls:ProjectControls}){
  const [initialProject]=useState(()=>arrangeTimelineTracks(restoredProject(initial)));
  const {project,edit:editProject,checkpoint,undo,redo,canUndo,canRedo,current}=useEditor(initialProject);
  const saving=useProjectSave(initial,project);
  useEffect(()=>controls.registerSave(saving.flush),[controls.registerSave,saving.flush]);
  const [assets,setAssets]=useState(initial.assets),[selection,setSelection]=useState<string[]>(()=>initial.project.clips[0]?[initial.project.clips[0].id]:[]);
  const selectClips=useCallback((ids:string[])=>setSelection(previous=>previous.length===ids.length&&previous.every((id,index)=>id===ids[index])?previous:ids),[]);
  const setSelected=useCallback((id:string|null)=>selectClips(id?[id]:[]),[selectClips]);
  const selectedClips=project.clips.filter(c=>selection.includes(c.id));
  const selectedIds=selectedClips.map(c=>c.id),multiple=selectedClips.length>1;
  const selected=selectedClips.length===1?selectedClips[0].id:null;
  const [frame,setFrame]=useState(0),[playing,setPlaying]=useState(false),[tool,setTool]=useState<Tool>('select');
  const [timelineHeight,setTimelineHeight]=useState<number|null>(()=>{
    try{const saved=localStorage.getItem('cutroom-timeline-height');const value=saved===null?NaN:Number(saved);return Number.isFinite(value)&&value>=180?value:null;}catch{return null;}
  });
  useEffect(()=>{const timer=setTimeout(()=>{try{if(timelineHeight===null)localStorage.removeItem('cutroom-timeline-height');else localStorage.setItem('cutroom-timeline-height',String(timelineHeight));}catch{/* Layout preferences are optional when storage is unavailable. */}},250);return()=>clearTimeout(timer);},[timelineHeight]);
  const [theme,setTheme]=useState<Theme>(()=>(localStorage.getItem('cutroom-theme') as Theme)||'system');
  const [notice,setNotice]=useState(''),[importing,setImporting]=useState(false),[extracting,setExtracting]=useState(false);
  const [mediaOpen,setMediaOpen]=useState(true),[mobilePanel,setMobilePanel]=useState<'preview'|'media'|'properties'>('preview');
  const [exportOpen,setExportOpen]=useState(false),[format,setFormat]=useState<'mp4'|'wav'|'mp3'>('mp4'),[selectionOnly,setSelectionOnly]=useState(false);
  const [job,setJob]=useState<ExportJob|null>(null),[exportBusy,setExportBusy]=useState(false),[helpOpen,setHelpOpen]=useState(false);
  const player=useRef<PlayerRef>(null),fileInput=useRef<HTMLInputElement>(null),noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null),seekRequest=useRef<number|undefined>(undefined);
  const clip=project.clips.find(c=>c.id===selected),asset=assets.find(a=>a.id===clip?.assetId),duration=endFrame(project);
  const compositionProps=useMemo(()=>({project,assets}),[project,assets]);
  const toast=useCallback((message:string)=>{setNotice(message);if(noticeTimer.current)clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),6000);},[]);
  const edit=useCallback((change:Project|((p:Project)=>Project),record=true)=>{
    try{editProject(p=>{const next=typeof change==='function'?change(p):change;return arrangeTimelineTracks(next,changedTimelineClipIds(p,next));},record);}
    catch(e){toast((e as Error).message);}
  },[editProject,toast]);
  useEffect(()=>{const query=matchMedia('(prefers-color-scheme: dark)');const apply=()=>document.documentElement.dataset.theme=theme==='system'?(query.matches?'dark':'light'):theme;apply();query.addEventListener('change',apply);localStorage.setItem('cutroom-theme',theme);return()=>query.removeEventListener('change',apply);},[theme]);
  useEffect(()=>{const p=player.current;if(!p)return;const update=(e:{detail:{frame:number}})=>setFrame(e.detail.frame);
    const play=()=>setPlaying(true),pause=()=>setPlaying(false);p.addEventListener('frameupdate',update);p.addEventListener('play',play);p.addEventListener('pause',pause);p.addEventListener('ended',pause);
    return()=>{p.removeEventListener('frameupdate',update);p.removeEventListener('play',play);p.removeEventListener('pause',pause);p.removeEventListener('ended',pause);};},[]);
  useEffect(()=>{if(frame>=duration){player.current?.seekTo(Math.max(0,duration-1));setFrame(Math.max(0,duration-1));}},[duration,frame]);
  const seek=useCallback((f:number)=>{player.current?.pause();if(seekRequest.current!==undefined)cancelAnimationFrame(seekRequest.current);seekRequest.current=requestAnimationFrame(()=>{player.current?.seekTo(f);setFrame(f);seekRequest.current=undefined;});},[]);
  useEffect(()=>()=>{if(seekRequest.current!==undefined)cancelAnimationFrame(seekRequest.current);if(noticeTimer.current)clearTimeout(noticeTimer.current);},[]);
  const updateClip=(values:Partial<Clip>,record=true)=>{if(!clip)return;edit(p=>({...p,clips:p.clips.map(c=>c.id===clip.id?{...c,...values}:c)}),record);};
  const split=useCallback(()=>{
    if(selection.filter(id=>current.current.clips.some(c=>c.id===id)).length>1){toast('Select one clip to split at the playhead.');return;}
    player.current?.pause();const at=player.current?.getCurrentFrame()??frame;
    const target=splitTarget(current.current,selected,at);
    if(!target){toast('Move the playhead inside '+(current.current.clips.some(c=>c.id===selected)?'the selected clip':'a clip')+' to split it.');return;}
    const rightId=uid();edit(p=>({...p,clips:p.clips.flatMap(c=>c.id===target.id?splitClip(c,at,rightId):[c])}));
    setSelected(rightId);setTool('select');setFrame(at);toast('Clip split at '+time(at,true)+'.');
  },[current,edit,frame,selected,selection,setSelected,toast]);
  const changeTool=useCallback((next:Tool)=>{
    if(next==='slip'){
      const c=current.current.clips.find(c=>c.id===selected),a=assets.find(a=>a.id===c?.assetId);
      if(!c||!a){toast('Select a clip to adjust its source content.');return;}
      if(a.frames-c.duration*c.rate<1){toast('Trim the clip first, then use Slip to change which part of the source it shows.');return;}
    }
    setTool(next);
  },[assets,current,selected,toast]);
  useEffect(()=>{if(tool==='slip'&&(!clip||!asset||asset.frames-clip.duration*clip.rate<1))setTool('select');},[asset,clip,tool]);
  const remove=useCallback(()=>{if(!current.current.clips.some(c=>selection.includes(c.id)))return;edit(p=>({...p,clips:p.clips.filter(c=>!selection.includes(c.id))}));setSelected(null);},[current,edit,selection,setSelected]);
  const duplicate=()=>{if(!clip)return;const copy={...clip,id:uid(),start:clip.start+clip.duration};edit(p=>({...p,clips:[...p.clips,copy]}));setSelected(copy.id);toast('Clip duplicated.');};
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{
    if(exportOpen||helpOpen||document.querySelector('[role="dialog"]'))return;
    const target=e.target as HTMLElement;if(target.closest('input,textarea,select,summary,[contenteditable="true"],[role="slider"],[role="menu"],[role="menuitem"]'))return;
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='b'){e.preventDefault();if(!e.repeat)split();return;}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='a'&&target.closest('.timeline')){e.preventDefault();setSelection(current.current.clips.map(c=>c.id));setTool('select');return;}
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.code==='Space'&&!target.closest('button')){e.preventDefault();player.current?.toggle();}
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();seek(clamp(frame+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?30:1),0,duration-1));}
    if(e.key==='Home'){e.preventDefault();seek(0);}if(e.key==='End'){e.preventDefault();seek(duration-1);}
    if(e.key.toLowerCase()==='v')changeTool('select');if(e.key.toLowerCase()==='s'){e.preventDefault();if(!e.repeat)split();}if(e.key.toLowerCase()==='y'&&!e.repeat)changeTool('slip');
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}if(e.key==='Escape'){setSelected(null);setTool('select');}
  };window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[changeTool,current,duration,exportOpen,frame,helpOpen,redo,remove,seek,setSelected,split,undo]);
  async function importFiles(files:File[]){if(!files.length)return;setImporting(true);const form=new FormData();for(const file of files)form.append('files',file);
    try{const result=await api<{assets:Asset[]}>(`/api/import?projectId=${initial.projectId}`,{method:'POST',body:form});setAssets(prev=>[...prev,...result.assets.filter(a=>!prev.some(p=>p.id===a.id))]);toast(`${result.assets.length===1?'File':'Files'} added to your media.`);setMediaOpen(true);}catch(e){toast((e as Error).message);}finally{setImporting(false);if(fileInput.current)fileInput.current.value='';}}
  const add=useCallback((assetId:string,at:number,requestedTrack?:string)=>{const a=assets.find(a=>a.id===assetId);if(!a||a.missing)return;
    const p=current.current;let track=p.tracks.find(t=>t.id===requestedTrack&&t.kind===a.kind)||p.tracks.find(t=>t.kind===a.kind);
    const tracks=[...p.tracks];if(!track){track={id:uid(),kind:a.kind,name:a.kind==='audio'?'Audio':'Video',muted:false};tracks.push(track);}
    const c:Clip={id:uid(),assetId:a.id,name:a.name,kind:a.kind,trackId:track.id,start:Math.max(0,at),duration:a.frames,sourceIn:0,rate:1,volume:1,muted:false,fadeIn:0,fadeOut:0};
    edit({...p,tracks,clips:[...p.clips,c]});setSelected(c.id);setMobilePanel('preview');
  },[assets,current,edit]);
  async function relink(assetId:string,file:File){const form=new FormData();form.append('file',file);try{const result=await api<Workspace>(`/api/projects/${initial.projectId}/relink/${assetId}`,{method:'POST',body:form});setAssets(result.assets);toast('Media located. Your edits are still in place.');}catch(e){toast((e as Error).message);}}
  async function extract(detach=false){if(!clip||!asset)return;setExtracting(true);
    try{const {asset:a}=await api<{asset:Asset}>('/api/extract',{method:'POST',body:JSON.stringify({projectId:initial.projectId,assetId:asset.id})});setAssets(p=>p.some(v=>v.id===a.id)?p:[...p,a]);
      if(detach){const trackId=uid(),audioId=uid();edit(p=>({...p,tracks:[...p.tracks,{id:trackId,kind:'audio',name:'Audio '+(p.tracks.filter(t=>t.kind==='audio').length+1),muted:false}],clips:[...p.clips.map(c=>c.id===clip.id?{...c,muted:true}:c),{...clip,id:audioId,assetId:a.id,trackId,kind:'audio',muted:false,name:a.name}]}));setSelected(audioId);toast('Audio detached to its own track.');}
      else{const link=document.createElement('a');link.href=a.url;link.download=a.name+'.wav';link.click();toast('WAV extracted and added to your media.');}
    }catch(e){toast((e as Error).message);}finally{setExtracting(false);}}
  async function startExport(){setExportBusy(true);setJob(null);
    try{const result=await api<ExportJob>('/api/export',{method:'POST',body:JSON.stringify({projectId:initial.projectId,project,format,...(selectionOnly&&clip?{selection:{start:clip.start,end:clip.start+clip.duration}}:{})})});setJob(result);
    }catch(e){setJob({id:'',status:'failed',progress:0,error:(e as Error).message});setExportBusy(false);}}
  useEffect(()=>{if(!job?.id||['completed','failed'].includes(job.status))return;let cancelled=false;let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{try{const next=await api<ExportJob>(`/api/export/${job.id}`);if(cancelled)return;setJob(next);if(['completed','failed'].includes(next.status)){setExportBusy(false);if(next.status==='completed')toast('Your export is ready.');return;}}catch(e){if(cancelled)return;setJob(p=>p?{...p,status:'failed',error:(e as Error).message}:null);setExportBusy(false);return;}timer=setTimeout(poll,1000);};timer=setTimeout(poll,500);return()=>{cancelled=true;clearTimeout(timer);};
  },[job?.id,job?.status,toast]);
  const openExport=(audio=false)=>{if(!exportBusy){setFormat(audio?'wav':'mp4');setSelectionOnly(false);setJob(null);}setExportOpen(true);};
  const displayFormat=format==='mp4'?'MP4 video':format==='wav'?'WAV audio':'MP3 audio';
  return <div className="app-shell" style={{'--extra-tracks':Math.max(0,project.tracks.length-2),...(timelineHeight===null?{}:{'--timeline-height':`${timelineHeight}px`})} as React.CSSProperties} onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();void importFiles(Array.from(e.dataTransfer.files));}}}>
    <header className="app-header"><a className="brand" href="/" aria-label="Cutroom home"><span className="brand-symbol"/>Cutroom</a><span className="header-divider"/><IconButton label="Your projects" onClick={controls.openProjects}><FolderOpen size={18}/></IconButton><div className="project-identity"><Input aria-label="Project name" value={project.name} maxLength={100} onChange={e=>edit(p=>({...p,name:e.target.value||'Untitled'}))}/><span className={`save-status ${saving.state}`} title={saving.error}>{saving.state==='saved'?<><Check size={12}/>Saved locally</>:saving.state==='saving'?<><span className="save-pulse"/>Saving…</>:saving.state==='conflict'?<button onClick={controls.reloadSaved}>Saved version changed · Reopen</button>:<button onClick={()=>void saving.flush().catch(()=>{})}>Reconnecting · Retry save</button>}</span></div>
      <div className="header-actions"><div className="history-tools"><IconButton label="Undo · ⌘Z" disabled={!canUndo} onClick={undo}><Undo2 size={17}/></IconButton><IconButton label="Redo · ⇧⌘Z" disabled={!canRedo} onClick={redo}><Redo2 size={17}/></IconButton></div><span className="header-divider"/>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Appearance">{theme==='system'?<Monitor size={18}/>:theme==='dark'?<Moon size={18}/>:<Sun size={18}/>}</Button></DropdownMenuTrigger><DropdownMenuContent>{(['system','light','dark'] as const).map(t=><DropdownMenuItem key={t} onSelect={()=>setTheme(t)}>{t==='system'?<Monitor size={16}/>:t==='light'?<Sun size={16}/>:<Moon size={16}/>}<span>{t==='system'?'Use system theme':t==='dark'?'Charcoal':'Light'}</span>{theme===t&&<Check size={14}/>}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
        <Button className="export-button" onClick={()=>openExport()} disabled={!project.clips.length}><ArrowUpRight size={17}/><span>{exportBusy?'Exporting…':'Export'}</span></Button>
      </div>
    </header>
    <nav className="mobile-tabs" aria-label="Workspace panels">{([{id:'media',text:'Media',icon:FolderOpen},{id:'preview',text:'Preview',icon:Film},{id:'properties',text:'Clip',icon:SlidersHorizontal}] as const).map(({id,text,icon:Icon})=><Button key={id} variant="ghost" aria-pressed={mobilePanel===id} onClick={()=>setMobilePanel(id)}><Icon size={16}/>{text}</Button>)}<div className="mobile-history"><IconButton label="Undo edit" disabled={!canUndo} onClick={undo}><Undo2 size={15}/></IconButton><IconButton label="Redo edit" disabled={!canRedo} onClick={redo}><Redo2 size={15}/></IconButton></div></nav>
    <main className={`workspace ${mediaOpen?'':'media-hidden'} mobile-${mobilePanel}`}>
      <aside className="media-panel" aria-label="Media library"><div className="panel-heading"><h2>Your media</h2><IconButton label="Hide media panel" onClick={()=>setMediaOpen(false)}><PanelLeftClose size={16}/></IconButton></div><p className="panel-subtitle">A little room for your story.</p>
        <input ref={fileInput} type="file" multiple accept="video/*,audio/*,.flac" className="sr-only" aria-label="Import media files" onChange={e=>void importFiles(Array.from(e.target.files||[]))}/>
        <Button variant="outline" className="import-button" onClick={()=>fileInput.current?.click()} disabled={importing}>{importing?<LoaderCircle className="spin" size={16}/>:<Plus size={17}/>} {importing?'Preparing media…':'Import media'}</Button>
        <div className="media-list">{assets.map(a=><div key={a.id} className="media-card" draggable onDragStart={e=>{e.dataTransfer.setData('application/cutroom-asset',a.id);e.dataTransfer.effectAllowed='copy';}}>
          <button disabled={a.missing} className={`asset-preview ${a.kind}`} aria-label={`Add ${a.name} to timeline`} onClick={()=>add(a.id,endFrame(project))}>
            {a.missing?<div className="missing-art"><FolderOpen size={24}/><span>Media missing</span></div>:a.kind==='video'&&a.thumbnails.length?<img src={a.thumbnails[0]} alt="Reel preview"/>:<div className="audio-art"><AudioLines size={32} strokeWidth={1.3}/><span>AUDIO</span></div>}
            <span className="asset-duration">{time(a.frames)}</span><span className="asset-add"><Plus size={17}/></span>
          </button><div className="asset-details"><span className={`asset-kind-icon ${a.kind}`}>{a.kind==='video'?<Film size={14}/>:<Music2 size={14}/>}</span><div><h3 title={a.name}>{a.name}</h3><p>{a.kind==='video'?`${a.width} × ${a.height}`:'Stereo audio'} <span>· {a.kind==='video'?'Video':'Audio'}</span></p></div></div>
          {a.missing&&<label className="relink-button">Locate file<input type="file" accept="video/*,audio/*,.flac" className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(file)void relink(a.id,file);}}/></label>}
          {!a.missing&&a.kind==='audio'&&<a className="asset-download" href={a.url} download={`${a.name}.${a.extension||'flac'}`} aria-label={`Download ${a.name}`}><Download size={13}/></a>}
        </div>)}</div>
        <div className="library-footer"><Upload size={15}/><span>Drop files anywhere to import.<br/>Your originals stay untouched.</span></div>
      </aside>
      <section className="preview-panel" aria-label="Video preview">{assets.some(a=>a.missing)&&<div className="missing-banner">Some media is missing. Use Locate file in Your media to reconnect it.</div>}<div className="preview-heading">{!mediaOpen&&<IconButton label="Show media panel" onClick={()=>setMediaOpen(true)}><PanelLeftOpen size={17}/></IconButton>}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm">{project.width===project.height?'1:1':project.width<project.height?'9:16':'16:9'}<ChevronDown size={13}/></Button></DropdownMenuTrigger><DropdownMenuContent>{[{label:'Portrait · 9:16',width:1080,height:1920},{label:'Landscape · 16:9',width:1920,height:1080},{label:'Square · 1:1',width:1080,height:1080}].map(r=><DropdownMenuItem key={r.label} onSelect={()=>edit(p=>({...p,width:r.width,height:r.height}))}>{r.label}{project.width*r.height===project.height*r.width&&<Check size={14}/>}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>
        <div className="preview-stage"><div className="player-wrap" style={{aspectRatio:`${project.width}/${project.height}`,'--aspect':project.width/project.height} as React.CSSProperties}>
          <Player ref={player} component={EditComposition} inputProps={compositionProps} durationInFrames={duration} compositionWidth={project.width} compositionHeight={project.height} fps={FPS} controls={false} style={{width:'100%',height:'100%'}} clickToPlay doubleClickToFullscreen spaceKeyToPlayOrPause={false} showVolumeControls={false} moveToBeginningWhenEnded={false} acknowledgeRemotionLicense/>
        </div>{project.clips.length===0&&<div className="preview-empty"><Film size={30}/><h3>A fresh start</h3><p>Add a video from your media to begin.</p></div>}</div>
        <div className="transport"><div className="transport-time"><strong>{time(frame,true)}</strong><span>/ {time(duration,true)}</span></div><div className="transport-buttons"><IconButton label="Jump to start" onClick={()=>seek(0)}><SkipBack size={17}/></IconButton><IconButton label={playing?'Pause':'Play'} className="play-button" onClick={()=>player.current?.toggle()}>{playing?<Pause size={19} fill="currentColor"/>:<Play size={19} fill="currentColor"/>}</IconButton><IconButton label="Jump to end" onClick={()=>seek(duration-1)}><SkipForward size={17}/></IconButton></div><div className="preview-meta">{project.height}p <span>·</span> 30 fps</div></div>
      </section>
      <aside className="inspector" aria-label="Clip properties"><div className="panel-heading"><h2>{multiple?'Selection':clip?'Clip settings':'Make it yours'}</h2></div>
        {multiple?<SelectionInspector clips={selectedClips} move={start=>edit(p=>moveSelection(p,selectedIds,start-Math.min(...selectedClips.map(c=>c.start))))} remove={remove}/>:clip&&asset?<><div className="selected-clip-heading"><span className={`selected-icon ${clip.kind}`}>{clip.kind==='video'?<Film size={19}/>:<AudioLines size={20}/>}</span><div><h3>{clip.name}</h3><p>{clip.kind==='video'?'Video clip':'Audio clip'} <span>· {time(clip.duration,true)}</span></p></div></div>
          <div className="inspector-section"><div className="section-title"><h3>Timing</h3><span>seconds</span></div><div className="field-grid"><NumberField label="Position" value={clip.start/FPS} onChange={v=>updateClip({start:Math.max(0,Math.round(v*FPS))})}/><NumberField label="Duration" value={clip.duration/FPS} min={1/FPS} max={maxDuration(clip,asset)/FPS} onChange={v=>updateClip({duration:clamp(Math.round(v*FPS),1,maxDuration(clip,asset))})}/></div><div className="clip-actions"><Button variant="outline" size="sm" onClick={split} disabled={!splitTarget(project,selected,frame)}><Scissors size={14}/>Split at playhead</Button><IconButton label="Duplicate clip" onClick={duplicate}><Copy size={15}/></IconButton><IconButton label="Delete clip" className="delete-clip" onClick={remove}><Trash2 size={15}/></IconButton></div></div>
          <div className="inspector-section"><div className="section-title"><h3>{clip.kind==='video'?'Clip audio':'Volume'}</h3><IconButton label={clip.muted?'Unmute clip':'Mute clip'} aria-pressed={clip.muted} onClick={()=>updateClip({muted:!clip.muted})}>{clip.muted?<VolumeX size={16}/>:<Volume2 size={16}/>}</IconButton></div><div className="volume-control"><Slider label="Clip volume" min={0} max={2} step={.01} value={[clip.volume]} onPointerDown={checkpoint} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))checkpoint();}} onValueChange={([v])=>updateClip({volume:v,muted:false},false)}/><span>{clip.muted?'Muted':Math.round(clip.volume*100)+'%'}</span></div>
            {clip.kind==='video'&&clip.muted&&<p className="field-hint">Embedded sound is muted. Your separate audio track still plays.</p>}
            <AudioFadeControls key={clip.id} clip={clip} change={updateClip} checkpoint={checkpoint}/>
          </div>
          <details className="inspector-section advanced"><summary><span>Playback & content</span><ChevronRight size={15}/></summary><div className="advanced-content"><PlaybackControls key={clip.id} clip={clip} asset={asset} change={updateClip} checkpoint={checkpoint}/></div></details>
          {clip.kind==='video'&&asset.hasAudio&&<div className="inspector-section audio-extract"><Button variant="outline" onClick={()=>void extract()} disabled={extracting}>{extracting?<LoaderCircle className="spin" size={16}/>:<ArrowDownToLine size={16}/>}Extract audio as WAV</Button><button className="text-button" disabled={extracting} onClick={()=>void extract(true)}>Detach to a separate track<ArrowUpRight size={13}/></button></div>}
          {clip.kind==='audio'&&<div className="inspector-section"><Button variant="outline" className="full-width" onClick={()=>openExport(true)}><Download size={16}/>Export audio</Button></div>}
        </>:<div className="inspector-empty"><SlidersHorizontal size={28} strokeWidth={1.3}/><h3>Select your clips.</h3><p>Click a clip to adjust it, or drag across empty timeline space to select several clips together.</p><span className="keyboard-tip"><kbd>V</kbd> Select <kbd>S</kbd> Split <kbd>Y</kbd> Slip</span></div>}
      </aside>
    </main>
    <Timeline project={project} assets={assets} selectedIds={selectedIds} select={selectClips} frame={frame} seek={seek} tool={tool} setTool={changeTool} edit={edit} checkpoint={checkpoint} split={split} add={add} height={timelineHeight} resize={setTimelineHeight} showShortcuts={()=>setHelpOpen(true)}/>
    {notice&&<div className="toast" role="status"><Check size={16}/><span>{notice}</span><button aria-label="Dismiss message" onClick={()=>setNotice('')}><X size={15}/></button></div>}
    <Dialog open={exportOpen} onOpenChange={setExportOpen}><DialogContent title={job?.status==='completed'?'Ready for its next chapter.':'Export your edit'} description={job?.status==='completed'?'Your file is saved on this computer.':'Rendered locally. Your source files stay exactly as they are.'}>
      {!job||job.status==='failed'?<><div className="export-formats">{([{id:'mp4',label:'Video',sub:'MP4',icon:Film},{id:'wav',label:'Audio',sub:'WAV',icon:AudioLines},{id:'mp3',label:'Audio',sub:'MP3',icon:Music2}] as const).map(({id,label,sub,icon:Icon})=><button key={id} className={`format-option ${format===id?'chosen':''}`} aria-pressed={format===id} onClick={()=>setFormat(id)}><Icon size={22}/><span>{label}</span><small>{sub}</small>{format===id&&<Check className="format-check" size={13}/>}</button>)}</div><div className="export-summary"><span>Duration</span><strong>{time(selectionOnly&&clip?clip.duration:duration,true)}</strong>{format==='mp4'&&<><span>Resolution</span><strong>{project.width} × {project.height}</strong></>}<span>Location</span><strong>Local exports folder</strong></div>{clip&&<label className="checkbox-label"><input type="checkbox" checked={selectionOnly} onChange={e=>setSelectionOnly(e.target.checked)}/>Selected time range only <span>{time(clip.start)}–{time(clip.start+clip.duration)}</span></label>}{job?.error&&<p className="inline-error" role="alert">{job.error}</p>}<Button className="export-submit" onClick={()=>void startExport()}><ArrowUpRight size={17}/>Export {displayFormat}</Button></>:job.status==='completed'?<><div className="export-success"><Check size={30}/></div><div className="export-filename">{job.filename}</div><a className="button button-primary export-submit" href={job.url} download><Download size={17}/>Download {displayFormat}</a><p className="export-path">{initial.exportsDir}</p></>:<div className="export-progress"><LoaderCircle className="spin" size={30}/><h3>{job.status==='queued'?'Preparing your export…':'Putting it all together…'}</h3><div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(job.progress*100)}><div style={{width:`${Math.max(2,job.progress*100)}%`}}/></div><p>{Math.round(job.progress*100)}% · You can keep editing while this finishes.</p></div>}
    </DialogContent></Dialog>
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent title="A few handy shortcuts" description="Small shortcuts, a little more flow."><div className="shortcuts-list">{[['Play / pause','Space'],['Move playhead one frame','← / →'],['Nudge focused clips','← / → · Shift for 1 second'],['Move clips','V'],['Zoom timeline','⌘ / Ctrl + mouse wheel'],['Select several clips','Drag empty timeline space'],['Add / remove from selection','Shift / ⌘ / Ctrl + click'],['Select all timeline clips','⌘ / Ctrl + A in timeline'],['Clear selection','Escape'],['Split at playhead','S or ⌘ / Ctrl + B'],['Slip source content','Y'],['Undo','⌘ / Ctrl + Z'],['Redo','Shift + ⌘ / Ctrl + Z'],['Delete selected clips','Backspace'],['Temporarily disable snapping','Hold Shift while dragging']].map(([l,k])=><div key={l}><span>{l}</span><kbd>{k}</kbd></div>)}</div></DialogContent></Dialog>
  </div>;
}
function SelectionInspector({clips,move,remove}:{clips:Clip[];move:(start:number)=>void;remove:()=>void}){
  const start=Math.min(...clips.map(c=>c.start)),video=clips.filter(c=>c.kind==='video').length;
  return <>
    <div className="selected-clip-heading"><span className="selected-icon video"><Copy size={19}/></span><div><h3>{clips.length} clips selected</h3><p>{video} video <span>·</span> {clips.length-video} audio</p></div></div>
    <div className="inspector-section">
      <div className="section-title"><h3>Position together</h3><span>seconds</span></div>
      <NumberField label="Selection start" value={start/FPS} onChange={value=>move(Math.round(value*FPS))}/>
      <p className="field-hint">Drag any selected clip to move the selection. Spacing and audio sync stay together.</p>
    </div>
    <div className="inspector-section">
      <Button variant="outline" className="full-width" onClick={remove}><Trash2 size={15}/>Delete selected clips</Button>
      <p className="field-hint">Click a clip to edit it on its own. Shift-click to add or remove a clip.</p>
    </div>
  </>;
}
function NumberField({label,value,onChange,min=0,max=3600}:{label:string;value:number;onChange:(v:number)=>void;min?:number;max?:number}){
  const [text,setText]=useState(value.toFixed(2));const editing=useRef(false);
  useEffect(()=>{if(!editing.current)setText(value.toFixed(2));},[value]);
  return <label className="field"><span>{label}</span><Input aria-label={label} inputMode="decimal" type="number" min={min} max={max} step={1/FPS} value={text} onFocus={()=>editing.current=true} onChange={e=>setText(e.target.value)} onBlur={()=>{editing.current=false;const parsed=Number(text);if(Number.isFinite(parsed)){const next=clamp(parsed,min,max);onChange(next);setText(next.toFixed(2));}else setText(value.toFixed(2));}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){setText(value.toFixed(2));e.currentTarget.blur();}}}/></label>;
}
