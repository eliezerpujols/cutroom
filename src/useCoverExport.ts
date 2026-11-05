import {useEffect,useRef,useState} from 'react';
import {api} from './useEditor';
import type {Project} from './model';

type CoverJob={id:string;status:string;progress:number;url?:string;filename?:string;error?:string};
export function useCoverExport(projectId:string,instanceId:string|undefined,project:Project){
  const jobKey='cutroom-cover-export-'+projectId+'-'+(instanceId||'legacy');
  const [job,setJob]=useState<CoverJob|null>(()=>{try{const saved=JSON.parse(localStorage.getItem(jobKey)||'null');return saved&&typeof saved.id==='string'&&/^[a-f0-9-]{36}$/.test(saved.id)?saved:null;}catch{return null;}});
  const [submitting,setSubmitting]=useState(false),[error,setError]=useState('');
  const inFlight=useRef(false);
  const busy=submitting||!!job&&!['completed','failed'].includes(job.status);
  useEffect(()=>{try{if(job)localStorage.setItem(jobKey,JSON.stringify(job));else localStorage.removeItem(jobKey);}catch{/* Recovery storage is optional. */}},[job,jobKey]);
  useEffect(()=>{
    if(!job?.id||['completed','failed'].includes(job.status))return;
    let stopped=false;let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      try{const next=await api<CoverJob>('/api/export/'+job.id);if(stopped)return;setJob(next);if(['completed','failed'].includes(next.status))return;}
      catch{if(stopped)return;setJob(null);setError('The cover export status is unavailable. Check the project exports folder before starting another.');return;}
      timer=setTimeout(poll,1000);
    };
    timer=setTimeout(poll,500);return()=>{stopped=true;clearTimeout(timer);};
  },[job?.id,job?.status]);
  async function exportCover(){
    if(inFlight.current||busy)return;
    inFlight.current=true;setSubmitting(true);setError('');setJob(null);
    try{setJob(await api<CoverJob>('/api/projects/'+projectId+'/cover/export',{method:'POST',body:JSON.stringify({project})}));}
    catch(e){setError((e as Error).message);}
    finally{inFlight.current=false;setSubmitting(false);}
  }
  return {job,busy,error,exportCover};
}
export type CoverExportState=ReturnType<typeof useCoverExport>;
