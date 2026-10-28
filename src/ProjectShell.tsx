import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {FolderOpen,Plus,Copy,LoaderCircle,ArrowRight,FileVideo} from 'lucide-react';
import {Button,Dialog,DialogContent,Input,TooltipProvider} from './ui/primitives';
import {api} from './useEditor';
import type {Workspace} from './useProjectSave';
type Summary={id:string;name:string;folder:string;updatedAt:string;available:boolean;missingCount:number};
export type ProjectControls={openProjects:()=>void;registerSave:(fn:()=>Promise<void>)=>()=>void;reloadSaved:()=>void};
export function ProjectShell({children}:{children:(workspace:Workspace,controls:ProjectControls)=>ReactNode}){
  const [workspace,setWorkspace]=useState<Workspace|null>(null),[error,setError]=useState(''),[open,setOpen]=useState(false),[projects,setProjects]=useState<Summary[]>([]),[busy,setBusy]=useState(false),[name,setName]=useState(''),[path,setPath]=useState('');
  const save=useRef<()=>Promise<void>>(async()=>{}),switching=useRef(false);
  const registerSave=useCallback((fn:()=>Promise<void>)=>{save.current=fn;return()=>{if(save.current===fn)save.current=async()=>{};};},[]);
  const accept=useCallback((w:Workspace)=>{setWorkspace(w);setError('');const url=new URL(location.href);url.searchParams.set('project',w.projectId);history.replaceState(null,'',url);},[]);
  useEffect(()=>{const id=new URLSearchParams(location.search).get('project');api<Workspace>('/api/workspace'+(id?'?projectId='+encodeURIComponent(id):'')).then(accept).catch(e=>{setError(e.message);setOpen(true);});},[accept]);
  const load=useCallback(async(reference:string,skipSave=false)=>{if(switching.current)return;switching.current=true;setBusy(true);setError('');try{if(!skipSave)await save.current();const w=await api<Workspace>('/api/projects/open',{method:'POST',body:JSON.stringify({project:reference})});accept(w);setOpen(false);}catch(e){setError((e as Error).message);setOpen(true);}finally{switching.current=false;setBusy(false);}},[accept]);
  useEffect(()=>{const clientId=crypto.randomUUID(),events=new EventSource('/api/events?clientId='+clientId);const focus=()=>void api('/api/focus',{method:'POST',body:JSON.stringify({clientId})}).catch(()=>{});events.onmessage=e=>{try{const event=JSON.parse(e.data);if(event.type==='open-project')void load(event.projectId);}catch{}};events.onopen=focus;window.addEventListener('focus',focus);return()=>{events.close();window.removeEventListener('focus',focus);};},[load]);
  useEffect(()=>{if(open)api<{projects:Summary[]}>('/api/projects').then(r=>setProjects(r.projects.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)))).catch(e=>setError(e.message));},[open]);
  async function create(copy=false){if(!name.trim())return;setBusy(true);setError('');try{await save.current();const w=await api<Workspace>('/api/projects',{method:'POST',body:JSON.stringify({name:name.trim(),...(copy&&workspace?{templateId:workspace.projectId}:{})})});await api('/api/projects/open',{method:'POST',body:JSON.stringify({project:w.projectId})});accept(w);setName('');setOpen(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const controls:ProjectControls={openProjects:()=>{setError('');setOpen(true);},registerSave,reloadSaved:()=>{if(workspace)void load(workspace.projectId,true);}};
  return <TooltipProvider delayDuration={450}>
    {workspace?<div key={workspace.projectId+':'+workspace.revision+':'+workspace.updatedAt}>{children(workspace,controls)}</div>:<div className="loading-screen"><div className="brand-symbol"/><h1>Cutroom</h1><LoaderCircle className="spin" size={22}/><p>{error||'Opening your local workspace…'}</p><Button variant="outline" onClick={()=>setOpen(true)}>Open a project</Button></div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent title="Your projects" description="A home for every edit. Each project keeps its media and exports together on this computer.">
      {error&&<p className="project-error" role="alert">{error}</p>}
      <div className="project-list">{projects.map(p=><button key={p.id} className={'project-row'+(p.id===workspace?.projectId?' current':'')} disabled={busy||!p.available} onClick={()=>void load(p.id)}><span className="project-row-icon"><FileVideo size={19}/></span><span><strong>{p.name}</strong><small>{!p.available?'Folder missing · open from its new location':p.missingCount?`${p.missingCount} missing media · locate after opening`:p.id===workspace?.projectId?'Current project':new Date(p.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</small></span><ArrowRight size={16}/></button>)}</div>
      <div className="project-create"><label className="field"><span>Start something new</span><Input placeholder="Project name" aria-label="New project name" value={name} maxLength={100} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void create();}}/></label><div className="project-create-actions"><Button disabled={busy||!name.trim()} onClick={()=>void create()}><Plus size={15}/>New project</Button>{workspace&&<Button variant="outline" disabled={busy||!name.trim()} onClick={()=>void create(true)}><Copy size={14}/>Save a copy</Button>}</div></div>
      <details className="project-folder"><summary><FolderOpen size={15}/>Open from a folder</summary><p>Paste the path to a project folder or its project.cutroom file.</p><div className="path-input"><Input aria-label="Project folder path" placeholder="/Users/…/project.cutroom" value={path} onChange={e=>setPath(e.target.value)}/><Button variant="outline" disabled={busy||!path.trim()} onClick={()=>void load(path.trim())}>Open</Button></div></details>
      {workspace&&<p className="project-location" title={workspace.folder}><FolderOpen size={13}/>{workspace.folder}</p>}
      {busy&&<p className="project-working"><LoaderCircle size={15} className="spin"/>Opening project…</p>}
    </DialogContent></Dialog>
  </TooltipProvider>;
}
