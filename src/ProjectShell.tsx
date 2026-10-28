import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {FolderOpen,Plus,Copy,LoaderCircle,FileVideo,MoreHorizontal,ArrowLeft,Check,ArrowUpRight} from 'lucide-react';
import {Button,Dialog,DialogContent,Input,TooltipProvider,DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from './ui/primitives';
import {api} from './useEditor';
import {time} from './model';
import type {Workspace} from './useProjectSave';

type Summary={id:string;name:string;folder:string;updatedAt:string;available:boolean;missingCount:number;previewUrl?:string|null;durationFrames?:number};
type Panel='browse'|'new'|'copy'|'folder';
export type ProjectControls={openProjects:()=>void;registerSave:(fn:()=>Promise<void>)=>()=>void;reloadSaved:()=>void};
const readablePath=(value:string)=>value.replace(/^(\/Users\/[^/]+|\/home\/[^/]+)(?=\/)/,'~');

export function ProjectShell({children}:{children:(workspace:Workspace,controls:ProjectControls)=>ReactNode}){
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [error,setError]=useState(''),[open,setOpen]=useState(false),[panel,setPanel]=useState<Panel>('browse');
  const [projects,setProjects]=useState<Summary[]>([]),[projectsRoot,setProjectsRoot]=useState('');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[name,setName]=useState(''),[path,setPath]=useState('');
  const save=useRef<()=>Promise<void>>(async()=>{}),switching=useRef(false);
  const registerSave=useCallback((fn:()=>Promise<void>)=>{save.current=fn;return()=>{if(save.current===fn)save.current=async()=>{};};},[]);
  const accept=useCallback((w:Workspace)=>{setWorkspace(w);setError('');const url=new URL(location.href);url.searchParams.set('project',w.projectId);history.replaceState(null,'',url);},[]);

  useEffect(()=>{
    const id=new URLSearchParams(location.search).get('project');
    api<Workspace>('/api/workspace'+(id?'?projectId='+encodeURIComponent(id):'')).then(accept).catch(e=>{setError(e.message);setOpen(true);});
  },[accept]);

  const load=useCallback(async(reference:string,skipSave=false)=>{
    if(switching.current)return;
    switching.current=true;setBusy(true);setError('');
    try{
      if(!skipSave)await save.current();
      const w=await api<Workspace>('/api/projects/open',{method:'POST',body:JSON.stringify({project:reference})});
      accept(w);setOpen(false);
    }catch(e){setError((e as Error).message);setOpen(true);}
    finally{switching.current=false;setBusy(false);}
  },[accept]);

  useEffect(()=>{
    const clientId=crypto.randomUUID(),events=new EventSource('/api/events?clientId='+clientId);
    const focus=()=>void api('/api/focus',{method:'POST',body:JSON.stringify({clientId})}).catch(()=>{});
    events.onmessage=e=>{try{const event=JSON.parse(e.data);if(event.type==='open-project')void load(event.projectId);}catch{}};
    events.onopen=focus;window.addEventListener('focus',focus);
    return()=>{events.close();window.removeEventListener('focus',focus);};
  },[load]);

  useEffect(()=>{
    if(!open)return;
    let active=true;setLoading(true);
    api<{projects:Summary[];projectsRoot:string}>('/api/projects').then(r=>{
      if(!active)return;
      setProjects(r.projects.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));setProjectsRoot(r.projectsRoot);
    }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[open]);

  async function create(){
    if(!name.trim()||busy)return;
    setBusy(true);setError('');
    try{
      await save.current();
      const w=await api<Workspace>('/api/projects',{method:'POST',body:JSON.stringify({name:name.trim(),...(panel==='copy'&&workspace?{templateId:workspace.projectId}:{})})});
      await api('/api/projects/open',{method:'POST',body:JSON.stringify({project:w.projectId})});
      accept(w);setName('');setOpen(false);
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }

  function showPanel(next:Panel){
    setError('');setPanel(next);
    if(next==='new')setName('');
    if(next==='copy'&&workspace)setName((workspace.project.name+' copy').slice(0,100));
  }
  const controls:ProjectControls={
    openProjects:()=>{setError('');setPanel('browse');setOpen(true);},
    registerSave,
    reloadSaved:()=>{if(workspace)void load(workspace.projectId,true);},
  };
  const browse=panel==='browse',folder=panel==='folder';
  const title=browse?'Your projects':folder?'Open a project':panel==='copy'?'Save a copy':'New project';
  const library=readablePath(projectsRoot);

  return <TooltipProvider delayDuration={450}>
    {workspace?<div key={workspace.projectId+':'+workspace.revision+':'+workspace.updatedAt}>{children(workspace,controls)}</div>:<div className="loading-screen"><div className="brand-symbol"/><h1>Cutroom</h1><LoaderCircle className="spin" size={22}/><p>{error||'Opening your local workspace…'}</p><Button variant="outline" onClick={()=>setOpen(true)}>Open a project</Button></div>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={'projects-dialog'+(!browse?' project-form-dialog':'')} title={title}
        description={browse?'Open a saved project, create a project, or save a copy.':folder?'Open a project folder or its project.cutroom file.':'Choose a name for your project.'}
        descriptionClassName="sr-only"
        leading={!browse?<Button variant="ghost" size="icon" aria-label="Back to projects" disabled={busy} onClick={()=>showPanel('browse')}><ArrowLeft size={18}/></Button>:undefined}
        headerActions={browse?<Button className="new-project-action" disabled={busy} onClick={()=>showPanel('new')}><Plus size={16}/>New project</Button>:undefined}>
        {error&&<p className="project-error" role="alert">{error}</p>}
        {browse?<>
          <div className="project-library">
            <div className="project-list-heading"><span>Recent projects</span>{loading&&<LoaderCircle size={14} className="spin" aria-label="Loading projects"/>}</div>
            <div className="project-list">
              {projects.map(p=>{
                const current=p.id===workspace?.projectId;
                const preview=p.previewUrl||(current?workspace?.assets.find(a=>a.kind==='video')?.thumbnails[0]:null);
                const date=p.updatedAt?new Date(p.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'';
                return <div key={p.id} className={'project-item'+(current?' current':'')}>
                  <button className="project-open" disabled={busy||!p.available} onClick={()=>void load(p.id)}>
                    <ProjectCover src={preview} name={p.name}/>
                    <span className="project-item-details"><strong>{p.name}</strong><span className="project-item-meta">{!p.available?'Folder missing':p.missingCount?`${p.missingCount} missing media`:p.durationFrames?time(p.durationFrames):'Empty project'}{date&&<><span aria-hidden="true">·</span>Edited {date}</>}</span></span>
                    {current&&<span className="current-project"><Check size={12}/>Current project</span>}
                  </button>
                  {current&&<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${p.name}`} disabled={busy}><MoreHorizontal size={18}/></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={()=>showPanel('copy')}><Copy size={15}/>Save a copy</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
                </div>;
              })}
              {!loading&&!projects.length&&<div className="projects-empty"><FileVideo size={25}/><p>No saved projects yet</p><Button variant="outline" onClick={()=>showPanel('new')}>Create your first project</Button></div>}
            </div>
          </div>
          <div className="project-dialog-footer"><Button variant="ghost" className="open-project-action" disabled={busy} onClick={()=>showPanel('folder')}><FolderOpen size={16}/>Open from a folder<ArrowUpRight size={13}/></Button><span className="project-library-location" title={projectsRoot}>{library}</span></div>
        </>:<form className="project-form" onSubmit={e=>{e.preventDefault();if(!busy){if(folder){if(path.trim())void load(path.trim());}else void create();}}}>
          {folder?<><p className="project-form-intro">Enter the path to a project folder or its <code>project.cutroom</code> file.</p><label className="field"><span>Project location</span><Input autoFocus aria-label="Project folder path" placeholder="~/Documents/Cut Room/My project" value={path} onChange={e=>setPath(e.target.value)} disabled={busy}/></label></>:<><label className="field"><span>Project name</span><Input autoFocus aria-label="New project name" placeholder="Untitled project" value={name} maxLength={100} onChange={e=>setName(e.target.value)} disabled={busy}/></label>{panel==='copy'&&workspace&&<p className="project-form-intro">A separate copy of <strong>{workspace.project.name}</strong>, including its media and edits.</p>}<div className="project-save-location"><FolderOpen size={15}/><div><span>Save location</span><strong title={projectsRoot}>{library||'Loading…'}</strong></div></div></>}
          <div className="project-form-footer"><Button variant="outline" disabled={busy} onClick={()=>showPanel('browse')}>Cancel</Button><Button type="submit" disabled={busy||loading||!(folder?path.trim():name.trim())}>{busy&&<LoaderCircle size={15} className="spin"/>}{busy?(folder?'Opening…':'Creating…'):folder?'Open project':panel==='copy'?'Create copy':'Create project'}</Button></div>
        </form>}
        {busy&&browse&&<p className="project-working" role="status"><LoaderCircle size={15} className="spin"/>Opening project…</p>}
      </DialogContent>
    </Dialog>
  </TooltipProvider>;
}

function ProjectCover({src,name}:{src?:string|null;name:string}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  return <span className="project-cover">{src&&!failed?<img src={src} alt={`${name} preview`} onError={()=>setFailed(true)}/>:<FileVideo size={24} strokeWidth={1.4}/>}</span>;
}
