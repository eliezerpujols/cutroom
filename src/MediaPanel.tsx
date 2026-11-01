import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Download,Film,FolderOpen,GripVertical,Image,LoaderCircle,Pause,Play,Plus,Search,X} from 'lucide-react';
import {IconButton,Input} from './ui/primitives';
import {time,type Asset} from './model';
import './sounds.css';
import './media.css';

const acceptedMedia='video/*,audio/*,image/png,image/jpeg,image/webp,.flac';
type Props={
  assets:Asset[];importing:boolean;fileInput:React.RefObject<HTMLInputElement|null>;
  importFiles:(files:File[])=>Promise<void>;add:(id:string)=>void;
  relink:(id:string,file:File)=>Promise<void>;hide:()=>void;beforePreview:()=>void;
};
export function MediaPanel({assets,importing,fileInput,importFiles,add,relink,hide,beforePreview}:Props){
  const [query,setQuery]=useState(''),[kind,setKind]=useState(''),[playing,setPlaying]=useState<string|null>(null),[error,setError]=useState('');
  const preview=useRef<{id:string;url:string;audio:HTMLAudioElement}|null>(null);
  const release=useCallback(()=>{const current=preview.current;preview.current=null;if(current){current.audio.onended=null;current.audio.onerror=null;current.audio.pause();current.audio.removeAttribute('src');current.audio.load();}},[]);
  const stop=useCallback(()=>{release();setPlaying(null);},[release]);
  useEffect(()=>release,[release]);
  useEffect(()=>{const current=preview.current;if(current&&!assets.some(asset=>asset.id===current.id&&!asset.missing&&asset.url===current.url))stop();},[assets,stop]);
  const filtered=useMemo(()=>assets.filter(asset=>(!kind||asset.kind===kind)&&asset.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),[assets,query,kind]);
  async function audition(asset:Asset){
    if(playing===asset.id){stop();return;}
    stop();beforePreview();setError('');const audio=new Audio(asset.url);preview.current={id:asset.id,url:asset.url,audio};audio.volume=.7;setPlaying(asset.id);
    const failed=()=>{if(preview.current?.audio===audio){stop();setError('This audio could not be played.');}};
    audio.onended=()=>{if(preview.current?.audio===audio)stop();};audio.onerror=failed;
    try{await audio.play();}catch{failed();}
  }
  function insert(id:string){stop();add(id);}
  return <section className="media-panel media-library-panel" aria-label="Media library">
    <div className="panel-heading"><h2>Media</h2><div className="sounds-heading-actions"><IconButton label="Import media" disabled={importing} onClick={()=>fileInput.current?.click()}>{importing?<LoaderCircle size={16} className="spin"/>:<Plus size={17}/>}</IconButton><IconButton label="Hide media panel" onClick={()=>{stop();hide();}}><X size={15}/></IconButton></div></div>
    <input ref={fileInput} type="file" multiple accept={acceptedMedia} hidden aria-label="Import media files" onChange={event=>void importFiles(Array.from(event.target.files||[]))}/>
    <label className="sound-search"><Search size={14}/><Input aria-label="Search media" placeholder="Search media" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    <select className="input sound-category" aria-label="Media type" value={kind} onChange={event=>{stop();setKind(event.target.value);}}><option value="">All media</option><option value="video">Videos</option><option value="audio">Audio</option><option value="image">Images</option></select>
    {error&&<div className="sound-error" role="alert">{error}</div>}
    {importing&&<div className="sound-import-progress" role="status"><LoaderCircle size={14} className="spin"/>Preparing media…</div>}
    <div className="media-library-results" aria-label="Media files">
      {filtered.map(asset=><div key={asset.id} className={`sound-row media-row ${playing===asset.id?'playing':''} ${asset.missing?'media-row-missing':''}`} draggable={!asset.missing} onDragStart={event=>{stop();event.dataTransfer.setData('application/cutroom-asset',asset.id);event.dataTransfer.effectAllowed='copy';}}>
        <div className="media-row-leading">{asset.missing?<FolderOpen size={20} aria-label="Media missing"/>:asset.kind==='audio'?<IconButton label={`${playing===asset.id?'Stop':'Preview'} ${asset.name}`} aria-pressed={playing===asset.id} className="sound-play" onClick={()=>void audition(asset)}>{playing===asset.id?<Pause size={14} fill="currentColor"/>:<Play size={14} fill="currentColor"/>}</IconButton>:<button className="media-row-thumbnail" aria-label={`Add ${asset.name} at playhead`} onClick={()=>insert(asset.id)}>{asset.thumbnails.length?<img src={asset.thumbnails[0]} alt="" loading="lazy" draggable={false}/>:asset.kind==='image'?<Image size={19}/>:<Film size={19}/>}</button>}</div>
        <div className="sound-info"><span className="sound-name" title={asset.name}>{asset.name}</span>{asset.missing?<label className="media-locate">Locate file<input type="file" accept={acceptedMedia} className="sr-only" aria-label={`Locate ${asset.name}`} onChange={event=>{const file=event.target.files?.[0];if(file)void relink(asset.id,file);event.target.value='';}}/></label>:<div className="sound-detail">{asset.kind==='audio'?<svg viewBox="0 0 128 18" preserveAspectRatio="none" aria-hidden="true">{asset.peaks.map((peak,index)=><rect key={index} x={index*128/Math.max(1,asset.peaks.length)} y={9-Math.max(1,peak*8)} width="1" height={Math.max(2,peak*16)} rx=".5"/>)}</svg>:<span>{asset.width} × {asset.height}</span>}{asset.kind!=='image'&&<span>{time(asset.frames)}</span>}</div>}</div>
        <div className="sound-row-actions"><IconButton label={`Add ${asset.name} at playhead`} disabled={asset.missing} onClick={()=>insert(asset.id)}><Plus size={15}/></IconButton>{asset.kind==='audio'&&!asset.missing?<a className="media-row-download" href={asset.url} download={`${asset.name}.${asset.extension||'flac'}`} aria-label={`Download ${asset.name}`} title={`Download ${asset.name}`}><Download size={12}/></a>:<GripVertical className="sound-drag-grip" size={12} aria-hidden="true"/>}</div>
      </div>)}
      {!filtered.length&&<div className="sound-empty"><FolderOpen size={25} strokeWidth={1.4}/><h3>{assets.length?'No matching media':'Your media'}</h3>{!assets.length&&<p>Drop files here or use + to import.</p>}</div>}
    </div>
    <div className="sound-library-footer" role="status">{assets.length} {assets.length===1?'file':'files'}{(query||kind)&&<span>{filtered.length} shown</span>}</div>
  </section>;
}
