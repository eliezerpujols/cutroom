import {useCallback,useRef,useState} from 'react';
import type {Project} from './model';
export function useEditor(initial:Project){
  const [project,setProject]=useState(initial),[historyVersion,setHistoryVersion]=useState(0);
  const current=useRef(initial),past=useRef<Project[]>([]),future=useRef<Project[]>([]);
  const checkpoint=useCallback(()=>{past.current=[...past.current.slice(-99),current.current];future.current=[];setHistoryVersion(v=>v+1);},[]);
  const edit=useCallback((change:Project|((p:Project)=>Project),record=true)=>{
    const next=typeof change==='function'?change(current.current):change;
    if(next===current.current)return;
    if(record)checkpoint();current.current=next;setProject(next);
  },[checkpoint]);
  const undo=useCallback(()=>{const prev=past.current.pop();if(!prev)return;future.current.push(current.current);current.current=prev;setProject(prev);setHistoryVersion(v=>v+1);},[]);
  const redo=useCallback(()=>{const next=future.current.pop();if(!next)return;past.current.push(current.current);current.current=next;setProject(next);setHistoryVersion(v=>v+1);},[]);
  void historyVersion;
  return {project,edit,checkpoint,undo,redo,canUndo:past.current.length>0,canRedo:future.current.length>0,current};
}
export async function api<T>(url:string,options:RequestInit={}):Promise<T>{
  const response=await fetch(url,{...options,headers:{...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...options.headers}});
  if(!response.ok){const data=await response.json().catch(()=>({error:response.statusText}));throw Object.assign(new Error(data.error||'Something went wrong.'),{status:response.status});}return response.json();
}
