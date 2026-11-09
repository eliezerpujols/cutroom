import test from 'node:test';
import assert from 'node:assert/strict';
import {subscribeVisibleEvents} from '../src/visibleEvents';

function fixture(initial='hidden'){
  const listeners=new Set<()=>void>(),streams:{onmessage:((event:MessageEvent<string>)=>void)|null;onopen:((event:Event)=>void)|null;close:()=>void;closed:boolean}[]=[];
  const visibility={visibilityState:initial,addEventListener:(_type:string,fn:()=>void)=>{listeners.add(fn);},removeEventListener:(_type:string,fn:()=>void)=>{listeners.delete(fn);}};
  const connect=()=>{const stream={onmessage:null,onopen:null,closed:false,close(){this.closed=true;}};streams.push(stream);return stream;};
  const show=(state:string)=>{visibility.visibilityState=state;for(const listener of listeners)listener();};
  return {visibility,streams,connect,show,listeners};
}

test('background editors use no persistent connection and repeated visibility events do not duplicate streams',()=>{
  const f=fixture(),stop=subscribeVisibleEvents('/events',()=>{},()=>{},f.visibility,f.connect);
  assert.equal(f.streams.length,0);f.show('visible');f.show('visible');assert.equal(f.streams.length,1);
  f.show('hidden');assert.equal(f.streams[0].closed,true);stop();assert.equal(f.listeners.size,0);
});

test('returning to an editor reconciles missed updates and disposed streams cannot deliver stale messages',()=>{
  const f=fixture('visible'),received:string[]=[];let checks=0;
  const stop=subscribeVisibleEvents('/events',data=>received.push(data),()=>{checks++;},f.visibility,f.connect);
  const first=f.streams[0];first.onopen?.(new Event('open'));first.onmessage?.({data:'first'} as MessageEvent<string>);
  f.show('hidden');first.onmessage?.({data:'stale'} as MessageEvent<string>);first.onopen?.(new Event('open'));f.show('visible');
  const second=f.streams[1];second.onopen?.(new Event('open'));second.onmessage?.({data:'latest'} as MessageEvent<string>);
  assert.equal(checks,2);assert.deepEqual(received,['first','latest']);stop();assert.equal(second.closed,true);
  second.onmessage?.({data:'after-dispose'} as MessageEvent<string>);assert.deepEqual(received,['first','latest']);
});
