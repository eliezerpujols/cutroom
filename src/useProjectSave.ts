import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './useEditor';
import type {Project} from './model';
export type Workspace={projectId:string;project:Project;assets:import('./model').Asset[];revision:number;folder:string;projectFile:string;exportsDir:string;missingAssets:{id:string;name:string}[];updatedAt:string};
const key=(id:string)=>'cutroom-draft-'+id;
export function restoredProject(w:Workspace):Project{
  try{const d=JSON.parse(localStorage.getItem(key(w.projectId))||'null');if(d?.baseRevision===w.revision&&d?.project?.version===1)return d.project;}catch{}return w.project;
}
export function useProjectSave(w:Workspace,project:Project){
  const [state,setState]=useState<'saved'|'saving'|'retrying'|'conflict'>('saved'),[error,setError]=useState(''),[retryVersion,setRetryVersion]=useState(0);
  const revision=useRef(w.revision),saved=useRef(JSON.stringify(w.project)),latest=useRef(project),inflight=useRef<Promise<void>|null>(null),blocked=useRef(false),mounted=useRef(true);
  latest.current=project;
  const backup=useCallback(()=>{try{localStorage.setItem(key(w.projectId),JSON.stringify({baseRevision:revision.current,project:latest.current,updatedAt:new Date().toISOString()}));}catch{}},[w.projectId]);
  const flush=useCallback(async()=>{
    if(inflight.current)return inflight.current;
    if(blocked.current)throw new Error('The saved project changed. Reopen it to load the saved version. Your draft is kept in this browser.');
    const run=async()=>{
      while(JSON.stringify(latest.current)!==saved.current){
        const snapshot=latest.current,serialized=JSON.stringify(snapshot);backup();if(mounted.current)setState('saving');
        try{const result=await api<{revision:number}>('/api/project',{method:'PUT',body:JSON.stringify({projectId:w.projectId,project:snapshot,expectedRevision:revision.current})});
          revision.current=result.revision;saved.current=serialized;
          if(JSON.stringify(latest.current)===serialized){try{localStorage.removeItem(key(w.projectId));}catch{}}else backup();
        }catch(e){const err=e as Error&{status?:number};blocked.current=err.status===409;if(mounted.current){setState(blocked.current?'conflict':'retrying');setError(err.message);setRetryVersion(v=>v+1);}throw e;}
      }
      if(mounted.current){setState('saved');setError('');}
    };
    inflight.current=run().finally(()=>{inflight.current=null;});return inflight.current;
  },[backup,w.projectId]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{if(JSON.stringify(project)===saved.current)return;backup();setState(blocked.current?'conflict':'saving');const timer=setTimeout(()=>void flush().catch(()=>{}),600);return()=>clearTimeout(timer);},[project,backup,flush]);
  useEffect(()=>{if(state!=='retrying')return;const timer=setTimeout(()=>void flush().catch(()=>{}),3000);return()=>clearTimeout(timer);},[state,error,retryVersion,flush]);
  useEffect(()=>{const retry=()=>{if(!blocked.current)void flush().catch(()=>{});};const unload=(e:BeforeUnloadEvent)=>{if(JSON.stringify(latest.current)!==saved.current){backup();e.preventDefault();}};window.addEventListener('online',retry);window.addEventListener('focus',retry);window.addEventListener('beforeunload',unload);return()=>{window.removeEventListener('online',retry);window.removeEventListener('focus',retry);window.removeEventListener('beforeunload',unload);};},[backup,flush]);
  return {state,error,flush};
}
