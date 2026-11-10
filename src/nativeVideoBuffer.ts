type BufferHandle={unblock:()=>void};
type NativeVideo=Pick<HTMLVideoElement,'readyState'|'seeking'|'error'|'addEventListener'|'removeEventListener'>;

// Own exactly one wait per mounted video. WebKit can finish a paused seek
// without presenting another frame, so requestVideoFrameCallback is not a
// reliable completion signal after an edit. Decoder readiness works paused too.
export function bufferNativeVideo(video:NativeVideo,delayPlayback:()=>BufferHandle){
  let handle:BufferHandle|undefined,disposed=false,requiredReadyState=2;
  const release=()=>{const pending=handle;handle=undefined;pending?.unblock();};
  const check=()=>{
    if(disposed)return;
    if(video.error||(!video.seeking&&video.readyState>=requiredReadyState))release();
    else if(!handle)handle=delayPlayback();
  };
  const waiting=()=>{requiredReadyState=3;check();};
  const seeking=()=>{requiredReadyState=2;check();};
  const events=['seeked','loadeddata','canplay','emptied','error'] as const;
  video.addEventListener('seeking',seeking);
  video.addEventListener('waiting',waiting);
  for(const event of events)video.addEventListener(event,check);
  check();
  return()=>{
    disposed=true;
    video.removeEventListener('seeking',seeking);
    video.removeEventListener('waiting',waiting);
    for(const event of events)video.removeEventListener(event,check);
    release();
  };
}

export function activePreviewClip(frame:number,start:number,duration:number,coverMode:boolean){
  return !coverMode&&frame>=start&&frame<start+duration;
}
