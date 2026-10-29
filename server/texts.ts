import type {Express} from 'express';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {ProjectStore} from './projects';
import {textPatchSchema} from './schema';
import {defaultVideoText,splitVideoText,type VideoText} from '../src/videoText';

export function registerTextRoutes(app:Express,store:ProjectStore,changed:(id:string,revision:number,textId?:string)=>Record<string,unknown>){
  app.post('/api/projects/:id/text-edits',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),body=z.object({expectedRevision:z.number().int().min(0),operations:z.array(z.object({action:z.enum(['add','update','remove','split','duplicate']),id:z.string().optional(),frame:z.number().int().min(0).max(108000).optional(),values:textPatchSchema.optional()})).min(1).max(100)}).parse(req.body),document=await store.read(id),project=structuredClone(document.project);
    let focus:string|undefined;project.texts??=[];
    for(const operation of body.operations){
      if(operation.action==='add'){const text={...defaultVideoText,...operation.values,id:randomUUID()};project.texts.unshift(text);focus=text.id;continue;}
      const text:VideoText|undefined=project.texts.find(item=>item.id===operation.id);if(!text)throw new Error('Choose a text ID from this project.');
      if(operation.action==='remove'){project.texts=project.texts.filter(item=>item.id!==text.id);continue;}
      if(operation.action==='update'){if(!operation.values)throw new Error('Provide text or style values to update.');project.texts=project.texts.map(item=>item.id===text.id?{...item,...operation.values}:item);focus=text.id;continue;}
      if(operation.action==='split'){const frame=operation.frame;if(frame===undefined||frame<=text.start||frame>=text.start+text.duration)throw new Error('Choose a frame inside the text clip to split it.');const rightId=randomUUID();project.texts=project.texts.flatMap(item=>item.id===text.id?splitVideoText(text,frame,rightId):[item]);focus=rightId;continue;}
      const copy={...text,...operation.values,id:randomUUID(),start:operation.values?.start??Math.min(108000,text.start+text.duration)};project.texts.unshift(copy);focus=copy.id;
    }
    await store.save(id,project,body.expectedRevision);const workspace=await store.workspace(id);res.json({...workspace,...changed(id,workspace.revision,focus)});
  });
}
