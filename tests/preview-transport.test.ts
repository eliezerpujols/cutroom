import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewTransport} from '../src/previewTransport';

function fixture(){
  const calls:unknown[][]=[],frames:number[]=[];
  const queued=new Map<number,()=>void>(),cancelled=new Map<number,()=>void>();let id=0;
  const player={pause:()=>{calls.push(['pause']);},seekTo:(frame:number)=>{calls.push(['seek',frame]);},toggle:(event:unknown)=>{calls.push(['toggle',event]);}};
  let current:typeof player|null=player;
  const transport=createPreviewTransport(()=>current,{
    request:callback=>{queued.set(++id,callback);return id;},
    cancel:key=>{const callback=queued.get(key);if(callback)cancelled.set(key,callback);queued.delete(key);},
  },frame=>frames.push(frame));
  const tick=()=>{for(const [key,callback] of [...queued]){queued.delete(key);callback();}};
  return {transport,calls,frames,queued,cancelled,tick,detach:()=>{current=null;}};
}

test('Play forwards the original interaction synchronously without scheduling playback',()=>{
  const f=fixture(),event={type:'click'} as Parameters<typeof f.transport.toggle>[0];
  f.transport.toggle(event);
  assert.equal(f.calls[0][0],'toggle');assert.equal(f.calls[0][1],event);
  assert.equal(f.queued.size,0);
});

test('edit/seek then immediate Play completes the latest seek before starting media in the same gesture',()=>{
  const f=fixture(),event={type:'click'} as Parameters<typeof f.transport.toggle>[0];
  f.transport.seek(270);f.transport.seek(410);f.transport.toggle(event);
  assert.deepEqual(f.calls,[['pause'],['pause'],['seek',410],['toggle',event]]);
  assert.deepEqual(f.frames,[410]);assert.equal(f.queued.size,0);
  f.tick();for(const callback of f.cancelled.values())callback();
  assert.equal(f.calls.length,4,'no late seek may pause or displace the playing media');
});

test('normal scrubbing still coalesces to one frame and does not start audio/video',()=>{
  const f=fixture();f.transport.seek(10);f.transport.seek(20);f.transport.seek(30);f.tick();
  assert.deepEqual(f.calls,[['pause'],['pause'],['pause'],['seek',30]]);
  assert.deepEqual(f.frames,[30]);assert.equal(f.queued.size,0);
});

test('native keyboard gestures reach the same transport without being replaced by an async callback',()=>{
  const f=fixture(),event={type:'keydown',code:'Space'} as KeyboardEvent;
  f.transport.seek(660);f.transport.toggle(event);
  assert.deepEqual(f.calls.slice(-2),[['seek',660],['toggle',event]]);
});

test('unmount cancels queued work; an in-flight old callback cannot affect the next seek',()=>{
  const f=fixture();f.transport.seek(100);f.transport.dispose();f.transport.seek(200);
  for(const callback of f.cancelled.values())callback();
  assert.deepEqual(f.frames,[]);f.tick();assert.deepEqual(f.frames,[200]);
  f.transport.dispose();f.detach();f.transport.toggle({type:'click'} as Parameters<typeof f.transport.toggle>[0]);
  assert.equal(f.calls.filter(call=>call[0]==='toggle').length,0);
});
