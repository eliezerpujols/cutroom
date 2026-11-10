import test from 'node:test';
import assert from 'node:assert/strict';
import {activePreviewClip,bufferNativeVideo} from '../src/nativeVideoBuffer';

function fixture(readyState=1){
  const video=Object.assign(new EventTarget(),{readyState,seeking:false,error:null as MediaError|null});
  let pending=0,created=0,released=0;
  const delay=()=>{pending++;created++;return {unblock:()=>{pending--;released++;}};};
  const emit=(event:string)=>video.dispatchEvent(new Event(event));
  return {video,delay,emit,counts:()=>({pending,created,released})};
}

test('an edit that removes a buffering clip releases its wait without a frame callback',()=>{
  const f=fixture(),dispose=bufferNativeVideo(f.video,f.delay);
  f.emit('waiting');f.emit('waiting');assert.equal(f.counts().pending,1);
  dispose();dispose();assert.deepEqual(f.counts(),{pending:0,created:1,released:1});
  f.video.readyState=4;f.emit('canplay');f.emit('seeking');assert.equal(f.counts().pending,0);
  // The replacement can render/play without reloading the Player or project.
  const next=bufferNativeVideo(f.video,f.delay);assert.equal(f.counts().pending,0);next();
});

test('paused seek after editing resumes on seeked with a decoded frame, even without canplay or rVFC',()=>{
  const f=fixture(4),dispose=bufferNativeVideo(f.video,f.delay);
  f.video.seeking=true;f.emit('seeking');assert.equal(f.counts().pending,1);
  f.video.readyState=2;f.emit('loadeddata');assert.equal(f.counts().pending,1);
  f.video.seeking=false;f.emit('seeked');assert.equal(f.counts().pending,0);
  f.video.seeking=true;f.emit('seeking');f.video.seeking=false;f.emit('seeked');
  assert.deepEqual(f.counts(),{pending:0,created:2,released:2});dispose();
});

test('a late waiting event after a visual edit cannot block media that is already ready',()=>{
  const f=fixture(4),dispose=bufferNativeVideo(f.video,f.delay);
  f.emit('waiting');f.emit('waiting');assert.deepEqual(f.counts(),{pending:0,created:0,released:0});
  dispose();
});

test('actual playback starvation waits for future data, then a later edit can still complete on seeked',()=>{
  const f=fixture(4),dispose=bufferNativeVideo(f.video,f.delay);
  f.video.readyState=2;f.emit('waiting');f.emit('waiting');assert.equal(f.counts().pending,1);
  f.emit('loadeddata');assert.equal(f.counts().pending,1);
  f.video.readyState=3;f.emit('canplay');assert.equal(f.counts().pending,0);
  f.video.readyState=2;f.emit('waiting');f.video.seeking=true;f.emit('seeking');
  f.video.seeking=false;f.emit('seeked');assert.equal(f.counts().pending,0);dispose();
});

test('cold load, source replacement, media error and Strict Mode cleanup never leak waits',()=>{
  const f=fixture();let dispose=bufferNativeVideo(f.video,f.delay);
  dispose();dispose=bufferNativeVideo(f.video,f.delay);assert.equal(f.counts().pending,1);
  f.video.readyState=2;f.emit('loadeddata');assert.equal(f.counts().pending,0);
  f.video.readyState=0;f.emit('emptied');assert.equal(f.counts().pending,1);
  dispose();dispose=bufferNativeVideo(f.video,f.delay);assert.equal(f.counts().pending,1);
  f.video.error={code:3,message:'decode failure'} as MediaError;f.emit('error');assert.equal(f.counts().pending,0);
  dispose();assert.equal(f.counts().created,f.counts().released);
});

test('only the active timeline range buffers; premount, postmount and cover stays do not',()=>{
  assert.equal(activePreviewClip(269,270,30,false),false);
  assert.equal(activePreviewClip(270,270,30,false),true);
  assert.equal(activePreviewClip(299,270,30,false),true);
  assert.equal(activePreviewClip(300,270,30,false),false);
  assert.equal(activePreviewClip(280,270,30,true),false);
});
