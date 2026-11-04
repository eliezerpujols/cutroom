import {useEffect,useRef,useState} from 'react';
import {api} from './useEditor';
import {type Asset,type Clip,type Project} from './model';
import {addCutoutLayer} from './localVisionEdits';
export {addCutoutLayer} from './localVisionEdits';

type Job={id:string;kind:'cutout'|'track';status:string;progress:number;error?:string;asset?:{id:string};keys?:{frame:number;x:number;y:number}[]};
export function useLocalVision({projectId,current,edit,addAsset,select,report}:{projectId:string;current:React.MutableRefObject<Project>;edit:(change:(p:Project)=>Project)=>void;addAsset:(asset:Asset)=>void;select:(id:string)=>void;report:(message:string)=>void}){
 const [job,setJob]=useState<Job|null>(null),[available,setAvailable]=useState<boolean|null>(null),origin=useRef<Clip|null>(null),callbacks=useRef({edit,addAsset,select,report});callbacks.current={edit,addAsset,select,report};
 useEffect(()=>{void api<{available:boolean}>('/api/local-vision').then(v=>setAvailable(v.available)).catch(()=>setAvailable(false));},[]);
 useEffect(()=>{if(!job?.id)return;let stopped=false,timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{const result=await api<Job>(`/api/projects/${projectId}/local-vision/${job.id}`);if(stopped)return;setJob(result);
  if(result.status==='completed'){const source=origin.current,live=current.current.clips.find(c=>c.id===source?.id);if(!source||!live||live.assetId!==source.assetId||live.sourceIn!==source.sourceIn||live.rate!==source.rate||live.duration!==source.duration)throw new Error('The source changed during processing. Run the tool again for its new range.');
   if(result.kind==='track')callbacks.current.edit(p=>({...p,clips:p.clips.map(c=>c.id===live.id?{...c,transform:{...c.transform,faceTrack:result.keys}}:c)}));
   else{const workspace=await api<{assets:Asset[]}>(`/api/workspace?projectId=${projectId}`),asset=workspace.assets.find(a=>a.id===result.asset?.id);if(!asset)throw new Error('The cutout media could not be loaded.');callbacks.current.addAsset(asset);let id='';callbacks.current.edit(p=>{const next=addCutoutLayer(p,p.clips.find(c=>c.id===live.id)!,asset);id=next.id;return next.project;});if(id)callbacks.current.select(id);}
   setJob(null);return;
  }
  if(result.status==='failed')throw new Error(result.error||'Local vision failed.');if(result.status==='cancelled'){setJob(null);return;}timer=setTimeout(poll,500);
 }catch(error){if(!stopped){callbacks.current.report((error as Error).message);setJob(null);}}};timer=setTimeout(poll,400);return()=>{stopped=true;clearTimeout(timer);};},[job?.id,projectId,current]);
 const start=async(kind:'cutout'|'track',clip:Clip)=>{if(job)return;origin.current=structuredClone(clip);setJob({id:'',kind,status:'preparing',progress:0});try{setJob(await api<Job>(`/api/projects/${projectId}/local-vision`,{method:'POST',body:JSON.stringify({kind,clip})}));}catch(error){setJob(null);report((error as Error).message);}};
 const cancel=()=>{if(job?.id)void api(`/api/projects/${projectId}/local-vision/${job.id}/cancel`,{method:'POST',body:'{}'}).catch(e=>report(e.message));};
 return {job,available,start,cancel};
}
