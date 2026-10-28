import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './useEditor';
import type {Project} from './model';
export type Workspace={projectId:string;project:Project;assets:import('./model').Asset[];revision:number;folder:string;projectFile:string;exportsDir:string;missingAssets:{id:string;name:string}[];updatedAt:string;editorInstanceId?:string;recoverLegacyDraft?:boolean};
const key=(w:Workspace)=>'cutroom-draft-'+w.projectId+(w.editorInstanceId?'-'+w.editorInstanceId:'');
export function restoredProject(w:Workspace):Project{
  try{
    let raw=localStorage.getItem(key(w));
    if(raw===null&&w.editorInstanceId&&w.recoverLegacyDraft){
      const legacyKey='cutroom-draft-'+w.projectId,legacy=localStorage.getItem(legacyKey),draft=JSON.parse(legacy||'null');
      if(draft?.baseRevision===w.revision&&draft?.project?.version===1){raw=legacy;try{localStorage.setItem(key(w),raw!);localStorage.removeItem(legacyKey);}catch{}}
    }
    const draft=JSON.parse(raw||'null');if(draft?.baseRevision===w.revision&&draft?.project?.version===1)return draft.project;
  }catch{}return w.project;
}
export function useProjectSave(w:Workspace,project:Project){
  const [state,setState]=useState<'saved'|'saving'|'retrying'|'conflict'>('saved'),[error,setError]=useState(''),[retryVersion,setRetryVersion]=useState(0);
  const revision=useRef(w.revision),saved=useRef(JSON.stringify(w.project)),latest=useRef(project),inflight=useRef<Promise<void>|null>(null),blocked=useRef(false),mounted=useRef(true);
  latest.current=project;
  const draftKey=key(w);
  const backup=useCallback(()=>{try{localStorage.setItem(draftKey,JSON.stringify({baseRevision:revision.current,project:latest.current,updatedAt:new Date().toISOString()}));}catch{}},[draftKey]);
  const flush=useCallback(async()=>{
    if(inflight.current)return inflight.current;
    if(blocked.current)throw new Error('The saved project changed. Reopen it to load the saved version. Your draft is kept in this browser.');
    const run=async()=>{
      while(JSON.stringify(latest.current)!==saved.current){
        const snapshot=latest.current,serialized=JSON.stringify(snapshot);backup();if(mounted.current)setState('saving');
        try{const result=await api<{revision:number}>('/api/project',{method:'PUT',body:JSON.stringify({projectId:w.projectId,project:snapshot,expectedRevision:revision.current,editorInstanceId:w.editorInstanceId})});
          revision.current=result.revision;saved.current=serialized;
          if(JSON.stringify(latest.current)===serialized){try{localStorage.removeItem(draftKey);}catch{}}else backup();
        }catch(e){const err=e as Error&{status?:number};blocked.current=err.status===409;if(mounted.current){setState(blocked.current?'conflict':'retrying');setError(err.message);setRetryVersion(v=>v+1);}throw e;}
      }
      if(mounted.current){setState('saved');setError('');}
    };
    inflight.current=run().finally(()=>{inflight.current=null;});return inflight.current;
  },[backup,draftKey,w.editorInstanceId,w.projectId]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{if(JSON.stringify(project)===saved.current)return;backup();setState(blocked.current?'conflict':'saving');const timer=setTimeout(()=>void flush().catch(()=>{}),600);return()=>clearTimeout(timer);},[project,backup,flush]);
  useEffect(()=>{if(state!=='retrying')return;const timer=setTimeout(()=>void flush().catch(()=>{}),3000);return()=>clearTimeout(timer);},[state,error,retryVersion,flush]);
  useEffect(()=>{const retry=()=>{if(!blocked.current)void flush().catch(()=>{});};const unload=(e:BeforeUnloadEvent)=>{if(JSON.stringify(latest.current)!==saved.current){backup();e.preventDefault();}};window.addEventListener('online',retry);window.addEventListener('focus',retry);window.addEventListener('beforeunload',unload);return()=>{window.removeEventListener('online',retry);window.removeEventListener('focus',retry);window.removeEventListener('beforeunload',unload);};},[backup,flush]);
  return {state,error,flush};
}
