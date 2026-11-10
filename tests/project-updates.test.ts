import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {subscribeProjectUpdates,type ProjectChange} from '../src/projectUpdates';
import {registerProjectUpdateRoutes} from '../server/projectUpdates';

const projectId='11111111-1111-4111-8111-111111111111';
const own='22222222-2222-4222-8222-222222222222';
const other='33333333-3333-4333-8333-333333333333';
const change=(revision:number):ProjectChange=>({type:'project-changed',projectId,revision});
const flush=async()=>{await Promise.resolve();await Promise.resolve();};

function fixture(initial:DocumentVisibilityState='visible'){
  const events=new EventTarget();
  const visibility={visibilityState:initial,addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)};
  const timers=new Map<number,{callback:()=>void;delay:number}>();let next=0;
  const scheduler={set(callback:()=>void,delay:number){const id=++next;timers.set(id,{callback,delay});return id as unknown as ReturnType<typeof setTimeout>;},clear(id:ReturnType<typeof setTimeout>){timers.delete(id as unknown as number);}};
  const requests:{signal:AbortSignal;resolve:(value:ProjectChange)=>void;reject:(error:unknown)=>void}[]=[];
  const request=(signal:AbortSignal)=>new Promise<ProjectChange>((resolve,reject)=>{requests.push({signal,resolve,reject});});
  const received:ProjectChange[]=[];
  const stop=subscribeProjectUpdates(projectId,value=>received.push(value),{visibility,request,scheduler});
  const show=(state:DocumentVisibilityState)=>{visibility.visibilityState=state;events.dispatchEvent(new Event('visibilitychange'));};
  const tick=(delay:number)=>{const entry=[...timers].find(([,timer])=>timer.delay===delay);assert.ok(entry,`Expected a ${delay}ms timer`);timers.delete(entry[0]);entry[1].callback();};
  return {requests,received,timers,show,tick,stop};
}

test('checks are finite and serialized, and unchanged revisions do not repeat dismissed notices',async()=>{
  const f=fixture();assert.equal(f.requests.length,1);f.show('visible');assert.equal(f.requests.length,1);
  f.requests[0].resolve(change(10));await flush();assert.deepEqual(f.received,[change(10)]);
  f.tick(2000);f.requests[1].resolve(change(10));await flush();assert.equal(f.received.length,1);
  f.tick(2000);f.requests[2].resolve(change(11));await flush();assert.deepEqual(f.received,[change(10),change(11)]);
  f.stop();assert.equal(f.timers.size,0);
});

test('hidden/disposed instances abort pending work, and stale responses cannot replace a resumed check',async()=>{
  const f=fixture('hidden');assert.equal(f.requests.length,0);f.show('visible');
  f.show('hidden');assert.equal(f.requests[0].signal.aborted,true);f.show('visible');assert.equal(f.requests.length,2);
  f.requests[0].resolve(change(99));await flush();assert.equal(f.received.length,0);
  f.requests[1].resolve(change(12));await flush();assert.deepEqual(f.received,[change(12)]);
  f.tick(2000);f.stop();assert.equal(f.requests[2].signal.aborted,true);
  f.requests[2].resolve(change(100));await flush();assert.deepEqual(f.received,[change(12)]);assert.equal(f.timers.size,0);
});

test('timeouts and failed requests retry without holding a channel forever or delivering unrelated revisions',async()=>{
  const f=fixture();f.tick(5000);assert.equal(f.requests[0].signal.aborted,true);
  f.requests[0].reject(new Error('aborted'));await flush();f.tick(2000);
  f.requests[1].resolve({...change(50),projectId:other});await flush();assert.equal(f.received.length,0);
  f.tick(2000);f.requests[2].resolve(change(13));await flush();assert.deepEqual(f.received,[change(13)]);f.stop();
});

test('revision snapshots preserve autosave origin and legacy SSE responses end instead of occupying connections',async()=>{
  const app=express();let revision=4;
  const publish=registerProjectUpdateRoutes(app,async id=>{assert.equal(id,projectId);return revision;});
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const get=(url:string)=>fetch(base+url,{signal:AbortSignal.timeout(2000)});
  try{
    publish({...change(4),originInstanceId:own});
    const response=await get(`/api/projects/${projectId}/revision`);
    assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{...change(4),originInstanceId:own});
    const legacy=await get(`/api/events?projectId=${projectId}&instanceId=${other}`);
    assert.match(legacy.headers.get('content-type')??'',/text\/event-stream/);
    const body=await legacy.text();assert.match(body,/retry: 5000/);assert.ok(body.includes(JSON.stringify({...change(4),originInstanceId:own})));
    assert.doesNotMatch(await(await get(`/api/events?projectId=${projectId}&instanceId=${own}`)).text(),/data:/);
    // A file changed outside this server must not inherit the previous origin.
    revision=5;assert.deepEqual(await(await get(`/api/projects/${projectId}/revision`)).json(),change(5));
    assert.match(await(await get(`/api/events?projectId=${projectId}`)).text(),/data:/);
    // Many old tabs can finish all their snapshots; none reserve a media slot.
    const snapshots=await Promise.all(Array.from({length:12},async()=>{const r=await get(`/api/events?projectId=${projectId}`);return r.text();}));
    assert.ok(snapshots.every(value=>value.includes('"revision":5')));
    assert.deepEqual(await(await get(`/api/projects/${projectId}/revision`)).json(),change(5));
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
