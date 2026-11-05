import React,{useEffect,useId,useRef,useState} from 'react';
import {GiphyFetch} from '@giphy/js-fetch-api';
import {ExternalLink,GripVertical,LoaderCircle,Search,Settings2,X} from 'lucide-react';
import {Button,IconButton,Input} from './ui/primitives';
import {api} from './useEditor';
import {giphyDownload,giphyHttps,giphyKinds,GIPHY_DRAG_TYPE,type GiphyItem,type GiphyKind} from './giphy';
import {ASSET_KIND_PREFIX,startLibraryDrag} from './libraryDrag';
import './giphy.css';

type Config={configured:boolean;apiKey:string|null;projectMediaApproved:boolean};
export type GiphySelection={item:GiphyItem;kind:GiphyKind};
export function GiphyPanel({hide,add,busy}:{hide:()=>void;add:(selection:GiphySelection)=>Promise<void>;busy:boolean}){
 const id=useId(),[kind,setKind]=useState<GiphyKind>('gifs'),[query,setQuery]=useState(''),[config,setConfig]=useState<Config|null>(null),[items,setItems]=useState<GiphyItem[]>([]),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[settings,setSettings]=useState(false),[adding,setAdding]=useState<string|null>(null);
 const request=useRef(0),sdk=useRef<GiphyFetch|null>(null),mounted=useRef(true),reduced=useRef(matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const controller=new AbortController();mounted.current=true;void api<Config>('/api/giphy/config',{signal:controller.signal}).then(c=>{if(mounted.current&&!controller.signal.aborted){setError('');sdk.current=c.apiKey?new GiphyFetch(c.apiKey):null;setConfig(c);}}).catch(()=>{if(mounted.current&&!controller.signal.aborted)setError('GIPHY could not connect.');});return()=>{controller.abort();mounted.current=false;request.current++;};},[retry]);
 useEffect(()=>{
  if(!config?.apiKey)return;const token=++request.current;setItems([]);setOffset(0);setMore(false);setError('');setLoading(true);
  const timer=setTimeout(()=>void load(0,token),query?400:0);return()=>{clearTimeout(timer);request.current++;};
 },[config,kind,query]);
 async function load(at:number,token=request.current){
  setLoading(true);setError('');
  try{
   let result:{data:GiphyItem[];pagination:{count:number;offset:number;total_count:number}};
   if(kind==='clips'){
    const params=new URLSearchParams({api_key:config!.apiKey!,limit:'20',offset:String(at),rating:'pg-13',lang:navigator.language.split('-')[0]});if(query)params.set('q',query);
    const response=await fetch(`https://api.giphy.com/v1/clips/${query?'search':'trending'}?${params}`,{cache:'no-store'});if(!response.ok)throw {status:response.status};result=await response.json();
   }else{const options={type:kind,offset:at,limit:20,rating:'pg-13' as const};result=await (query?sdk.current!.search(query,{...options,lang:navigator.language.split('-')[0]}):sdk.current!.trending(options));}
   if(!mounted.current||token!==request.current)return;
   setItems(previous=>at?[...previous,...result.data]:result.data);const next=result.pagination.offset+result.pagination.count;setOffset(next);setMore(result.pagination.count>0&&next<Math.min(result.pagination.total_count,query?4999:499));
  }catch(e){if(!mounted.current||token!==request.current)return;const status=(e as {status?:number}).status;setError(status===429?'GIPHY’s hourly limit has been reached. Try again later.':kind==='clips'&&(status===401||status===403)?'Clips access is awaiting GIPHY approval.':status===401||status===403?'Check the GIPHY key in local settings.':'GIPHY could not load. Try again.');}
  finally{if(mounted.current&&token===request.current)setLoading(false);}
 }
 async function insert(item:GiphyItem){if(busy||adding||!config?.projectMediaApproved)return;setAdding(String(item.id));setError('');try{await add({item,kind});}catch(e){if(mounted.current)setError((e as Error).message);}finally{if(mounted.current)setAdding(null);}}
 const canAdd=config?.projectMediaApproved&&!busy&&!adding;
 return <section className="sounds-panel giphy-panel" aria-label="GIPHY library">
  <div className="panel-heading"><h2>GIPHY</h2><div className="sounds-heading-actions"><IconButton label="GIPHY connection" onClick={()=>setSettings(v=>!v)}><Settings2 size={14}/></IconButton><IconButton label="Hide GIPHY panel" onClick={hide}><X size={15}/></IconButton></div></div>
  <label className="sound-search"><Search size={14}/><Input aria-label="Search GIPHY" placeholder="Search GIPHY" maxLength={50} value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <div className="giphy-tabs" role="tablist" aria-label="GIPHY content type">{giphyKinds.map(([key,label],index)=><Button key={key} id={`${id}-${key}`} variant="ghost" size="sm" role="tab" aria-selected={kind===key} aria-controls={`${id}-results`} tabIndex={kind===key?0:-1} onClick={()=>setKind(key)} onKeyDown={e=>{const next=e.key==='ArrowRight'?(index+1)%3:e.key==='ArrowLeft'?(index+2)%3:e.key==='Home'?0:e.key==='End'?2:null;if(next!==null){e.preventDefault();const key=giphyKinds[next][0];setKind(key);document.getElementById(`${id}-${key}`)?.focus();}}}>{label}</Button>)}</div>
  {settings&&<div className="giphy-connection"><span>{config?.configured?'Connected':'API key not configured'}</span><a href="https://developers.giphy.com/dashboard/" target="_blank" rel="noopener noreferrer">Developer dashboard <ExternalLink size={11}/></a>{config?.configured&&!config.projectMediaApproved&&<span>Adding to videos is awaiting GIPHY approval.</span>}</div>}
  {error&&<div className="sound-error" role="alert"><span>{error}</span>{!loading&&<Button variant="ghost" size="sm" onClick={()=>setRetry(v=>v+1)}>Retry</Button>}</div>}
  <div className="giphy-results" id={`${id}-results`} role="tabpanel" aria-labelledby={`${id}-${kind}`} aria-busy={loading}>
   {!config?<div className="sound-empty" role="status"><LoaderCircle className="spin" size={20}/>Connecting…</div>:!config.configured?<div className="sound-empty"><span>Connect a GIPHY key to browse.</span><a href="https://developers.giphy.com/dashboard/" target="_blank" rel="noopener noreferrer">Open GIPHY Developers</a></div>:<>
    <div className="giphy-grid">{items.map((item,index)=>{
     const images=item.images||item.video?.previews,preview=reduced.current?images?.fixed_width_still?.url||images?.original_still?.url:images?.fixed_width?.webp||images?.fixed_width?.url||images?.original?.url;
     const source=giphyHttps(item.url)?item.url:'https://giphy.com/',creator=item.user?.display_name||item.user?.username||item.username||item.source_tld;let downloadable=true;try{giphyDownload(item,kind);}catch{downloadable=false;}
     return <div className="giphy-item" key={`${item.id}-${index}`} draggable={!!canAdd&&downloadable} onDragStart={e=>{if(!canAdd||!downloadable){e.preventDefault();return;}startLibraryDrag(e,GIPHY_DRAG_TYPE,JSON.stringify({item,kind}));e.dataTransfer.setData(ASSET_KIND_PREFIX+'video','');}}>
      <Button variant="ghost" className={`giphy-tile${kind==='stickers'?' giphy-sticker':''}`} aria-label={`Add ${item.title||kind.slice(0,-1)} as overlay`} disabled={!canAdd||!downloadable} onClick={()=>void insert(item)}>{preview&&giphyHttps(preview,true)?<img src={preview} loading="lazy" alt={item.title||''}/>:<span>{item.title||'Preview unavailable'}</span>}{adding===String(item.id)&&<LoaderCircle size={20} className="giphy-adding spin"/>}</Button>
      {canAdd&&downloadable&&<span className="giphy-grip" aria-label="Drag to timeline"><GripVertical size={12}/></span>}
      <a className="giphy-source" href={source} target="_blank" rel="noopener noreferrer" title={item.title||'View on GIPHY'}>{creator||'GIPHY'}<ExternalLink size={9}/></a>
     </div>;
    })}</div>
    {loading&&<div className="giphy-loading" role="status"><LoaderCircle size={16} className="spin"/>Loading…</div>}
    {!loading&&!items.length&&!error&&<div className="sound-empty">No results. Try another search.</div>}
    {more&&!loading&&!error&&<Button variant="ghost" size="sm" className="full-width" onClick={()=>void load(offset)}>Load more</Button>}
   </>}
  </div>
  <div className="giphy-footer">{config?.configured&&!config.projectMediaApproved&&<span>Browse only · video use pending approval</span>}<a href="https://giphy.com/" target="_blank" rel="noopener noreferrer" aria-label="Powered by GIPHY"><img className="giphy-brand-dark" src="/giphy/powered-by-giphy.png" alt="Powered by GIPHY"/><img className="giphy-brand-light" src="/giphy/powered-by-giphy-light.png" alt="Powered by GIPHY"/></a></div>
 </section>;
}
