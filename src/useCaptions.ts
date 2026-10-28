import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './useEditor';
import {captionSourceSignature,type CaptionLayer} from './captions';
import type {Project} from './model';

export type CaptionQuote={frames:number;seconds:number;estimatedCredits:number;reservedCredits:number;maxCredits:number;configured:boolean;hasAudio:boolean};
export type CaptionJob={id:string;status:'mixing'|'transcribing'|'completed'|'failed';running:boolean;sourceSignature:string;estimatedCredits:number;layer?:CaptionLayer;error?:string;submitted:boolean};
export function useCaptions(projectId:string,project:Project,enabled:boolean,edit:(change:(p:Project)=>Project)=>void,added:(id:string)=>void,editorInstanceId?:string,recoverLegacy=false){
  const [quote,setQuote]=useState<CaptionQuote|null>(null),[job,setJob]=useState<CaptionJob|null>(null),[error,setError]=useState(''),[starting,setStarting]=useState(false),[refresh,setRefresh]=useState(0);
  const [quoteState,setQuoteState]=useState<'idle'|'loading'|'reconnecting'|'ready'|'unavailable'>('idle');
  const [settled,setSettled]=useState(0),pointerActive=useRef(false);
  const latest=useRef(project),onAdded=useRef(added),applied=useRef(new Set<string>()),requestId=useRef<string|null>(null);latest.current=project;onAdded.current=added;
  const legacyKey='cutroom-caption-job-'+projectId,key=legacyKey+(editorInstanceId?'-'+editorInstanceId:''),signature=captionSourceSignature(project);
  useEffect(()=>{
    const down=()=>{pointerActive.current=true;},finish=()=>{pointerActive.current=false;setSettled(value=>value+1);},blur=()=>setSettled(value=>value+1);
    window.addEventListener('pointerdown',down,true);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);window.addEventListener('blur',finish);window.addEventListener('focusout',blur);
    return()=>{window.removeEventListener('pointerdown',down,true);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);window.removeEventListener('blur',finish);window.removeEventListener('focusout',blur);};
  },[]);
  useEffect(()=>{let cancelled=false;try{let id=localStorage.getItem(key);if(!id&&recoverLegacy&&editorInstanceId){id=localStorage.getItem(legacyKey);if(id){localStorage.setItem(key,id);localStorage.removeItem(legacyKey);}}if(id){requestId.current=id;void api<CaptionJob>(`/api/projects/${projectId}/captions/${id}`).then(result=>{if(!cancelled){requestId.current=null;setJob(result);}}).catch(()=>{if(!cancelled)setError('Could not reconnect to the saved transcription. Retrying will reuse the same request.');});}}catch{}return()=>{cancelled=true;};},[editorInstanceId,key,legacyKey,projectId,recoverLegacy]);
  useEffect(()=>{
    if(!enabled)return;let cancelled=false,attempts=0;setQuote(null);setQuoteState('loading');
    let timer:ReturnType<typeof setTimeout>;
    const load=async()=>{
      try{const result=await api<CaptionQuote>(`/api/projects/${projectId}/captions/estimate`,{method:'POST',body:JSON.stringify({project:latest.current})});if(cancelled)return;setQuote(result);setQuoteState('ready');}
      catch(err){if(cancelled)return;const failure=err as Error&{status?:number},temporary=failure instanceof TypeError||failure.status===404||failure.status===503||!!failure.status&&failure.status>=500;
        if(temporary&&++attempts<10){setQuoteState('reconnecting');timer=setTimeout(load,2500);}else setQuoteState('unavailable');
      }
    };
    const retry=()=>{clearTimeout(timer);attempts=0;setQuoteState('loading');void load();};
    timer=setTimeout(load,400);window.addEventListener('online',retry);window.addEventListener('focus',retry);
    return()=>{cancelled=true;clearTimeout(timer);window.removeEventListener('online',retry);window.removeEventListener('focus',retry);};
  },[enabled,projectId,signature,refresh,project.captions?.length]);
  useEffect(()=>{
    if(!job?.id||job.status==='completed'||job.status==='failed')return;
    let cancelled=false;let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{try{const result=await api<CaptionJob>(`/api/projects/${projectId}/captions/${job.id}`);if(cancelled)return;setJob(result);if(result.status!=='completed'&&result.status!=='failed')timer=setTimeout(poll,1200);}catch(err){if(!cancelled){setError((err as Error).message);timer=setTimeout(poll,3000);}}};
    timer=setTimeout(poll,500);return()=>{cancelled=true;clearTimeout(timer);};
  },[job?.id,job?.status,projectId]);
  const apply=useCallback(()=>{
    if(!job?.layer)return;
    if(latest.current.captions?.some(layer=>layer.sourceJobId===job.id)){applied.current.add(job.id);try{localStorage.removeItem(key);}catch{}return;}
    if((latest.current.captions?.length||0)>=4){setError('Remove an unused caption layer before adding another.');return;}
    const layer=job.layer;applied.current.add(job.id);
    edit(p=>p.captions?.some(item=>item.sourceJobId===job.id)?p:{...p,captions:[...(p.captions||[]),layer]});
    try{localStorage.removeItem(key);}catch{}onAdded.current(layer.id);
  },[edit,job,key]);
  useEffect(()=>{if(pointerActive.current||document.activeElement?.matches('input,textarea,select,[contenteditable="true"],[role="slider"]'))return;if(job?.status==='completed'&&!applied.current.has(job.id)&&job.sourceSignature===captionSourceSignature(latest.current))apply();},[apply,job,settled]);
  async function start(language:string){
    if(starting||(job?.running&&job.status!=='completed'&&job.status!=='failed'))return;setStarting(true);setError('');
    const id=requestId.current||crypto.randomUUID();requestId.current=id;try{localStorage.setItem(key,id);}catch{}
    try{const result=await api<CaptionJob>(`/api/projects/${projectId}/captions`,{method:'POST',body:JSON.stringify({project:latest.current,language,requestId:id})});requestId.current=null;setJob(result);}
    catch(err){setError((err as Error).message);}finally{setStarting(false);}
  }
  return {quote,quoteState,job,error,sourceSignature:signature,busy:starting||!!(job?.running&&job.status!=='completed'&&job.status!=='failed'),start,apply,retryQuote:()=>setRefresh(value=>value+1),needsApply:job?.status==='completed'&&!!job.layer&&!project.captions?.some(layer=>layer.sourceJobId===job.id)};
}
