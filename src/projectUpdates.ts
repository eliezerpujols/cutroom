export type ProjectChange={type:'project-changed';projectId:string;revision:number;originInstanceId?:string};
type Visibility=Pick<Document,'visibilityState'|'addEventListener'|'removeEventListener'>;
type Scheduler={set:(callback:()=>void,delay:number)=>ReturnType<typeof setTimeout>;clear:(timer:ReturnType<typeof setTimeout>)=>void};
type Options={visibility?:Visibility;request?:(signal:AbortSignal)=>Promise<ProjectChange>;scheduler?:Scheduler};

// Update notices must not reserve HTTP/1 connections needed by video and audio.
// Some embedded browsers report every open editor as visible, so visibility
// alone cannot make a persistent EventSource safe.
export function subscribeProjectUpdates(projectId:string,receive:(change:ProjectChange)=>void,options:Options={}){
  const visibility=options.visibility??document;
  const scheduler=options.scheduler??{set:(callback:()=>void,delay:number)=>setTimeout(callback,delay),clear:(timer:ReturnType<typeof setTimeout>)=>clearTimeout(timer)};
  const request=options.request??(async signal=>{
    const response=await fetch(`/api/projects/${encodeURIComponent(projectId)}/revision`,{signal,cache:'no-store'});
    if(!response.ok)throw new Error('Could not check project revision.');
    return response.json() as Promise<ProjectChange>;
  });
  let disposed=false,generation=0,lastRevision=-1;
  let pending:AbortController|null=null,timer:ReturnType<typeof setTimeout>|undefined;
  const clearTimer=()=>{if(timer!==undefined)scheduler.clear(timer);timer=undefined;};
  const poll=async()=>{
    if(disposed||visibility.visibilityState!=='visible'||pending)return;
    const controller=new AbortController(),token=++generation;pending=controller;
    const timeout=scheduler.set(()=>controller.abort(),5000);
    try{
      const change=await request(controller.signal);
      if(!disposed&&token===generation&&!controller.signal.aborted&&change.projectId===projectId&&Number.isInteger(change.revision)&&change.revision>lastRevision){
        lastRevision=change.revision;receive(change);
      }
    }catch{/* A failed check must not stop playback or replace the local draft. */}
    finally{
      scheduler.clear(timeout);
      if(token===generation){
        pending=null;
        if(!disposed&&visibility.visibilityState==='visible')timer=scheduler.set(()=>{timer=undefined;void poll();},2000);
      }
    }
  };
  const sync=()=>{
    clearTimer();
    if(visibility.visibilityState!=='visible'){
      generation++;pending?.abort();pending=null;return;
    }
    void poll();
  };
  visibility.addEventListener('visibilitychange',sync);sync();
  return()=>{disposed=true;generation++;clearTimer();pending?.abort();pending=null;visibility.removeEventListener('visibilitychange',sync);};
}
