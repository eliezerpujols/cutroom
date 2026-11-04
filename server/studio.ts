import type {Express} from 'express';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {ProjectStore} from './projects';
import {studioTemplates,addStudioElement} from '../src/studio/registry';
export function registerStudioRoutes(app:Express,store:ProjectStore,changed:(id:string,revision:number)=>Record<string,unknown>){
  app.get('/api/studio',(_req,res)=>res.json({templates:studioTemplates}));
  app.post('/api/projects/:id/studio',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),b=z.object({expectedRevision:z.number().int().min(0),clipId:z.string().optional(),template:z.string().optional(),start:z.number().int().min(0).max(108000).optional(),duration:z.number().int().min(1).max(108000).optional(),props:z.record(z.string(),z.union([z.string(),z.number().finite()])).optional()}).parse(req.body),doc=await store.read(id);
    const clipId=b.clipId??randomUUID();let p=doc.project;
    if(!b.clipId)p=addStudioElement(p,b.template??'orbit-card',b.start??0,clipId);
    const clip=p.clips.find(c=>c.id===clipId);if(!clip?.studio)throw new Error('Choose a Studio element from this project.');
    p={...p,clips:p.clips.map(c=>c.id===clipId?{...c,...(b.start===undefined?{}:{start:b.start}),...(b.duration===undefined?{}:{duration:b.duration}),studio:{...clip.studio!,props:{...clip.studio!.props,...b.props}}}:c)};
    await store.save(id,p,b.expectedRevision);const workspace=await store.workspace(id);res.json({...workspace,clipId,...changed(id,workspace.revision)});
  });
}
