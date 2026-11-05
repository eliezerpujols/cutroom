import {useEffect,useRef,useState} from 'react';
import {api} from './useEditor';
import {type Asset,type Clip,type Project} from './model';
import {addCutoutLayer} from './localVisionEdits';
export {addCutoutLayer} from './localVisionEdits';

type Job={id:string;kind:'cutout'|'track';status:string;progress:number;error?:string;asset?:{id:string};keys?:{frame:number;x:number;y:number}[]};
export function useLocalVision({projectId,current,edit,addAsset,select,report}:{projectId:string;current:React.MutableRefObject<Project>;edit:(change:(p:Project)=>Project)=>void;addAsset:(asset:Asset)=>void;select:(id:string)=>void;report:(message:string)=>void}){
 const pending=useRef<Clip[]>([]),running=useRef(false),cancelRequested=useRef(false);
 const [batch,setBatch]=useState<{current:number;total:number}|null>(null);
 const [job,setJob]=useState<Job|null>(null),[available,setAvailable]=useState<boolean|null>(null),origin=useRef<Clip|null>(null),callbacks=useRef({edit,addAsset,select,report});callbacks.current={edit,addAsset,select,report};
 useEffect(()=>{void api<{available:boolean}>('/api/local-vision').then(v=>setAvailable(v.available)).catch(()=>setAvailable(false));},[]);
 useEffect(()=>{if(!job?.id)return;let stopped=false,timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{const result=await api<Job>(`/api/projects/${projectId}/local-vision/${job.id}`);if(stopped)return;setJob(result);
  if(result.status==='completed'){const source=origin.current,live=current.current.clips.find(c=>c.id===source?.id);if(!source||!live||live.assetId!==source.assetId||live.sourceIn!==source.sourceIn||live.rate!==source.rate||live.duration!==source.duration)throw new Error('The source changed during processing. Run the tool again for its new range.');
   if(result.kind==='track')callbacks.current.edit(p=>({...p,clips:p.clips.map(c=>c.id===live.id?{...c,transform:{...c.transform,faceTrack:result.keys}}:c)}));
   else{const workspace=await api<{assets:Asset[]}>(`/api/workspace?projectId=${projectId}`),asset=workspace.assets.find(a=>a.id===result.asset?.id);if(!asset)throw new Error('The cutout media could not be loaded.');callbacks.current.addAsset(asset);let id='';callbacks.current.edit(p=>{const next=addCutoutLayer(p,p.clips.find(c=>c.id===live.id)!,asset);id=next.id;return next.project;});if(id&&!pending.current.length)callbacks.current.select(id);}
   const next=pending.current.shift();
   if(next){setBatch(batch=>batch?{...batch,current:batch.current+1}:null);void submit(result.kind,next);}
   else{running.current=false;setBatch(null);setJob(null);}
   return;
  }
  if(result.status==='failed')throw new Error(result.error||'Local vision failed.');if(result.status==='cancelled'){pending.current=[];running.current=false;setBatch(null);setJob(null);return;}timer=setTimeout(poll,500);
 }catch(error){if(!stopped){pending.current=[];running.current=false;setBatch(null);callbacks.current.report((error as Error).message);setJob(null);}}};timer=setTimeout(poll,400);return()=>{stopped=true;clearTimeout(timer);};},[job?.id,projectId,current]);
 async function submit(kind:'cutout'|'track',clip:Clip){
  origin.current=structuredClone(clip);
  setJob({id:'',kind,status:'preparing',progress:0});
  try{
   const result=await api<Job>(`/api/projects/${projectId}/local-vision`,{method:'POST',body:JSON.stringify({kind,clip})});
   setJob(result);
   if(cancelRequested.current)await api(`/api/projects/${projectId}/local-vision/${result.id}/cancel`,{method:'POST',body:'{}'});
  }catch(error){pending.current=[];running.current=false;setBatch(null);setJob(null);callbacks.current.report((error as Error).message);}
 }
 const startMany=(kind:'cutout'|'track',clips:Clip[])=>{
  if(running.current||!clips.length)return;
  running.current=true;cancelRequested.current=false;
  const [first,...rest]=structuredClone(clips);
  pending.current=rest;
  setBatch(clips.length>1?{current:1,total:clips.length}:null);
  void submit(kind,first);
 };
 const start=(kind:'cutout'|'track',clip:Clip)=>startMany(kind,[clip]);
 const cancel=()=>{
  pending.current=[];cancelRequested.current=true;
  if(job?.id)void api(`/api/projects/${projectId}/local-vision/${job.id}/cancel`,{method:'POST',body:'{}'}).catch(e=>report(e.message));
 };
 return {job,batch,available,start,startMany,cancel};
}
