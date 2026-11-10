import React,{useEffect,useRef,type ComponentProps} from 'react';
import {Html5Video,useBufferState} from 'remotion';
import {bufferNativeVideo} from '../nativeVideoBuffer';

type Props=ComponentProps<typeof Html5Video>&{active:boolean};

export function PreviewVideo({active,...props}:Props){
  const video=useRef<HTMLVideoElement>(null);
  const {delayPlayback}=useBufferState();
  useEffect(()=>{
    if(!active||!video.current)return;
    return bufferNativeVideo(video.current,delayPlayback);
  },[active,props.src,delayPlayback]);
  // Remotion still owns frame/audio sync. Its first-frame buffering path in
  // 4.0.539 can orphan waits on edits; this component owns their lifetime instead.
  return <Html5Video {...props} ref={video} preload="auto" pauseWhenBuffering={false}/>;
}
