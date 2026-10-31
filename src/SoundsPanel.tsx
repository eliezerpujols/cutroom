import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AudioLines,FolderOpen,GripVertical,LoaderCircle,Pause,Play,Plus,Search,Upload,X} from 'lucide-react';
import {Button,IconButton,Input,DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from './ui/primitives';
import {api} from './useEditor';
import {SOUND_DRAG_TYPE,type LibrarySound,type SoundCatalog} from './sounds';
import './sounds.css';

const audioFiles=/\.(mp3|wav|ogg|opus|m4a|aac|flac)$/i;
export function SoundsPanel({hide,add,beforePreview}:{hide:()=>void;add:(id:string)=>Promise<void>;beforePreview:()=>void}){
  const [catalog,setCatalog]=useState<SoundCatalog|null>(null),[query,setQuery]=useState(''),[category,setCategory]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[loadError,setLoadError]=useState(''),[refresh,setRefresh]=useState(0);
  const [playing,setPlaying]=useState<string|null>(null),[adding,setAdding]=useState<string|null>(null),[importing,setImporting]=useState(false),[progress,setProgress]=useState('');
  const audio=useRef<HTMLAudioElement|null>(null),files=useRef<HTMLInputElement>(null),folder=useRef<HTMLInputElement>(null),mounted=useRef(true);
  const stop=()=>{if(audio.current){audio.current.pause();audio.current.removeAttribute('src');audio.current.load();audio.current=null;}setPlaying(null);};
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(audio.current){audio.current.pause();audio.current.removeAttribute('src');audio.current.load();audio.current=null;}};},[]);
  useEffect(()=>{const controller=new AbortController();setLoading(true);const timer=setTimeout(()=>{void api<SoundCatalog>('/api/sounds?'+new URLSearchParams({query,category}),{signal:controller.signal}).then(result=>{if(!controller.signal.aborted){setCatalog(result);setLoadError('');}}).catch(error=>{if(!controller.signal.aborted)setLoadError((error as Error).message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});},180);return()=>{clearTimeout(timer);controller.abort();};},[query,category,refresh]);
  const groups=useMemo(()=>{const groups=new Map<string,LibrarySound[]>();for(const sound of catalog?.sounds||[])groups.set(sound.category,[...(groups.get(sound.category)||[]),sound]);return [...groups];},[catalog]);
  async function preview(sound:LibrarySound){
    if(playing===sound.id){stop();return;}stop();beforePreview();setError('');const player=new Audio(sound.url);audio.current=player;player.volume=.7;setPlaying(sound.id);
    const failed=()=>{if(mounted.current&&audio.current===player){stop();setError('This sound could not be played.');}};
    player.onended=()=>{if(mounted.current&&audio.current===player)stop();};player.onerror=failed;
    try{await player.play();}catch{failed();}
  }
  async function insert(id:string){if(adding)return;stop();setAdding(id);setError('');try{await add(id);}catch(error){if(mounted.current)setError((error as Error).message);}finally{if(mounted.current)setAdding(null);}}
  async function importFiles(selected:File[]){
    if(importing)return;
    const accepted=selected.filter(file=>audioFiles.test(file.name));if(!accepted.length){setError('Choose audio files to add to Sounds.');return;}
    setImporting(true);setError('');const failures:string[]=[];let imported=0,duplicates=0;
    try{for(let offset=0;offset<accepted.length;offset+=20){const batch=accepted.slice(offset,offset+20),form=new FormData();batch.forEach(file=>form.append('files',file));if(category)form.append('category',category);if(mounted.current)setProgress(`Importing ${Math.min(offset+20,accepted.length)} of ${accepted.length}…`);
      const result=await api<{results:{duplicate:boolean}[];errors:{name:string;error:string}[]}>('/api/sounds/import',{method:'POST',body:form});imported+=result.results.filter(item=>!item.duplicate).length;duplicates+=result.results.filter(item=>item.duplicate).length;failures.push(...result.errors.map(item=>`${item.name}: ${item.error}`));
    }if(mounted.current){setProgress(`${imported} added${duplicates?` · ${duplicates} already in library`:''}`);if(failures.length)setError(`${failures.length} files could not be imported. ${failures[0]}`);}}
    catch(error){if(mounted.current)setError((error as Error).message);}finally{if(mounted.current){setImporting(false);setRefresh(value=>value+1);if(files.current)files.current.value='';if(folder.current)folder.current.value='';}}
  }
  return <section className="sounds-panel" aria-label="Sound effects library" onDragOver={event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();event.stopPropagation();}}} onDrop={event=>{if(event.dataTransfer.files.length){event.preventDefault();event.stopPropagation();if(!importing)void importFiles(Array.from(event.dataTransfer.files));}}}>
    <div className="panel-heading"><h2>Sounds</h2><div className="sounds-heading-actions"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Import sounds" disabled={importing}><Plus size={17}/></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={()=>files.current?.click()}><Upload size={15}/>Import files…</DropdownMenuItem><DropdownMenuItem onSelect={()=>folder.current?.click()}><FolderOpen size={15}/>Import folder…</DropdownMenuItem></DropdownMenuContent></DropdownMenu><IconButton label="Hide sounds panel" onClick={hide}><X size={15}/></IconButton></div></div>
    <input ref={files} type="file" accept="audio/*,.mp3,.wav,.ogg,.opus,.flac" multiple hidden onChange={event=>void importFiles(Array.from(event.target.files||[]))}/>
    <input ref={folder} type="file" multiple hidden {...{webkitdirectory:''} as React.InputHTMLAttributes<HTMLInputElement>} onChange={event=>void importFiles(Array.from(event.target.files||[]))}/>
    <label className="sound-search"><Search size={14}/><Input aria-label="Search sounds" placeholder="Search sounds" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    <select className="input sound-category" aria-label="Sound category" value={category} onChange={event=>{stop();setCategory(event.target.value);}}><option value="">All categories</option>{(catalog?.categories||[]).map(value=><option key={value} value={value}>{value}</option>)}</select>
    {(error||loadError)&&<div className="sound-error" role="alert"><span>{error||loadError}</span>{loadError&&<Button variant="ghost" size="sm" onClick={()=>setRefresh(value=>value+1)}>Retry</Button>}</div>}
    {importing&&<div className="sound-import-progress" role="status"><LoaderCircle size={14} className="spin"/>{progress}</div>}
    <div className="sound-results" aria-busy={loading}>
      {loading&&!catalog?<div className="sound-empty" role="status"><LoaderCircle size={20} className="spin"/><p>Loading sounds…</p></div>:groups.length?groups.map(([name,sounds])=><div className="sound-group" key={name}><h3>{name}<span>{sounds.length}</span></h3>{sounds.map(sound=><div className={`sound-row ${playing===sound.id?'playing':''}`} key={sound.id} draggable={!adding} onDragStart={event=>{stop();event.dataTransfer.setData(SOUND_DRAG_TYPE,sound.id);event.dataTransfer.effectAllowed='copy';}}>
        <IconButton label={`${playing===sound.id?'Stop':'Preview'} ${sound.name}`} aria-pressed={playing===sound.id} className="sound-play" onClick={()=>void preview(sound)}>{playing===sound.id?<Pause size={14} fill="currentColor"/>:<Play size={14} fill="currentColor"/>}</IconButton>
        <div className="sound-info"><span className="sound-name" title={sound.name}>{sound.name}</span><div className="sound-detail"><svg viewBox="0 0 128 18" preserveAspectRatio="none" aria-hidden="true">{sound.peaks.map((peak,index)=><rect key={index} x={index*128/Math.max(1,sound.peaks.length)} y={9-Math.max(1,peak*8)} width="1" height={Math.max(2,peak*16)} rx=".5"/>)}</svg><span>{sound.duration.toFixed(1)}s</span></div></div>
        <div className="sound-row-actions"><IconButton label={`Add ${sound.name} at playhead`} disabled={!!adding} onClick={()=>void insert(sound.id)}>{adding===sound.id?<LoaderCircle size={14} className="spin"/>:<Plus size={15}/>}</IconButton><GripVertical className="sound-drag-grip" size={12} aria-hidden="true"/></div>
      </div>)}</div>):!error?<div className="sound-empty"><AudioLines size={25} strokeWidth={1.4}/><h3>{catalog?.total?'No matching sounds':'Your sound library'}</h3><p>{catalog?.total?'Try another name or category.':'Import sound files or a folder to reuse them across projects.'}</p>{!catalog?.total&&<Button variant="outline" size="sm" onClick={()=>files.current?.click()} disabled={importing}><Upload size={14}/>Import sounds</Button>}</div>:null}
    </div>
    <div className="sound-library-footer" role="status">{catalog?`${catalog.total} sounds`:''}{!importing&&progress&&<span>{progress}</span>}</div>
  </section>;
}
