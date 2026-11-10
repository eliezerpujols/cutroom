import type express from 'express';
import {z} from 'zod';
import type {ProjectChange} from '../src/projectUpdates';

// Keep origin information for the current saved revision so a polling editor
// cannot mistake an autosave whose response is still in flight for another edit.
export function registerProjectUpdateRoutes(app:express.Express,readRevision:(id:string)=>Promise<number>){
  const latest=new Map<string,ProjectChange>();
  const revision=async(projectId:string):Promise<ProjectChange>=>{
    const saved=await readRevision(projectId),event=latest.get(projectId);
    return {type:'project-changed',projectId,revision:saved,...(event?.revision===saved&&event.originInstanceId?{originInstanceId:event.originInstanceId}:{})};
  };
  app.get('/api/projects/:id/revision',async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.json(await revision(z.string().uuid().parse(req.params.id)));
  });
  // Cached older editors still use EventSource. Return one finite snapshot
  // instead of leaving them holding the origin's connection pool indefinitely.
  app.get('/api/events',async(req,res)=>{
    z.string().uuid().optional().parse(req.query.clientId);
    const projectId=z.string().uuid().optional().parse(req.query.projectId);
    const instanceId=z.string().uuid().optional().parse(req.query.instanceId);
    const change=projectId?await revision(projectId):undefined;
    res.type('text/event-stream');res.setHeader('Cache-Control','no-store');
    res.end('retry: 5000\n\n'+(change&&(!change.originInstanceId||change.originInstanceId!==instanceId)?`data: ${JSON.stringify(change)}\n\n`:': revision checked\n\n'));
  });
  return(event:Record<string,unknown>)=>{
    if(typeof event.projectId!=='string'||!Number.isInteger(event.revision))return false;
    const change:ProjectChange={type:'project-changed',projectId:event.projectId,revision:event.revision as number,...(typeof event.originInstanceId==='string'?{originInstanceId:event.originInstanceId}:{})};
    if(change.revision>=(latest.get(change.projectId)?.revision??-1))latest.set(change.projectId,change);
    return false;
  };
}
