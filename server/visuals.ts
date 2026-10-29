import type {Express} from 'express';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {ProjectStore} from './projects';
import {adjustmentsSchema,coverTextSchema} from './schema';
import {defaultAdjustments,defaultCover,defaultCoverText} from '../src/visuals';
import {endFrame} from '../src/model';

export function registerVisualRoutes(app:Express,store:ProjectStore,changed:(id:string,revision:number,view:'cover'|'adjustments')=>Record<string,unknown>){
  app.post('/api/projects/:id/visual-adjustments',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),body=z.object({expectedRevision:z.number().int().min(0),clipIds:z.array(z.string()).min(1).max(300).optional(),adjustments:adjustmentsSchema.partial(),reset:z.boolean().default(false)}).parse(req.body),document=await store.read(id),project=structuredClone(document.project);
    if(body.clipIds){
      for(const clipId of body.clipIds){const clip=project.clips.find(c=>c.id===clipId);if(!clip||clip.kind!=='video')throw new Error('Choose video or image clip IDs from this project.');clip.adjustments={...defaultAdjustments,...(body.reset?{}:clip.adjustments),...body.adjustments};}
    }else project.adjustments={...defaultAdjustments,...(body.reset?{}:project.adjustments),...body.adjustments};
    await store.save(id,project,body.expectedRevision);const workspace=await store.workspace(id);res.json({...workspace,...changed(id,workspace.revision,'adjustments')});
  });
  app.post('/api/projects/:id/cover',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),body=z.object({expectedRevision:z.number().int().min(0),frame:z.number().int().min(0).max(108000).optional(),showCaptions:z.boolean().optional(),texts:z.array(coverTextSchema.partial().extend({text:z.string().max(500)})).max(12).optional()}).parse(req.body),document=await store.read(id),cover={...defaultCover,...document.project.cover};
    if(body.frame!==undefined){if(body.frame>=endFrame(document.project))throw new Error('Choose a cover frame inside this timeline.');cover.frame=body.frame;}
    if(body.showCaptions!==undefined)cover.showCaptions=body.showCaptions;
    if(body.texts)cover.texts=body.texts.map(text=>({...defaultCoverText,...text,id:text.id||randomUUID()}));
    await store.save(id,{...document.project,cover},body.expectedRevision);const workspace=await store.workspace(id);res.json({...workspace,...changed(id,workspace.revision,'cover')});
  });
}
