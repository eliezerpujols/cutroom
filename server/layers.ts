import {studioAssets} from '../src/studio/registry';
import type {Express} from 'express';
import {z} from 'zod';
import type {ProjectStore} from './projects';
import {clipOverlaySchema} from './schema';
import {makeOverlay,removeOverlay} from '../src/overlays';
import {setLayerOrder,timelineLayers} from '../src/layers';
export function registerLayerRoutes(app:Express,store:ProjectStore,changed:(id:string,revision:number)=>Record<string,unknown>){
  app.get('/api/projects/:id/layers',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),document=await store.read(id);
    res.json({projectId:id,revision:document.revision,layers:timelineLayers(document.project).map(({key,id,kind,name})=>({key,id,kind,name}))});
  });
  app.post('/api/projects/:id/layer-order',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),body=z.object({expectedRevision:z.number().int().min(0),order:z.array(z.string()).min(1).max(116)}).parse(req.body),document=await store.read(id);
    await store.save(id,setLayerOrder(document.project,body.order),body.expectedRevision);
    const workspace=await store.workspace(id);res.json({...workspace,...changed(id,workspace.revision)});
  });
  app.post('/api/projects/:id/overlays',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),body=z.object({expectedRevision:z.number().int().min(0),clipId:z.string(),enabled:z.boolean().default(true),overlay:clipOverlaySchema.partial().optional()}).parse(req.body),document=await store.read(id);
    const clip=document.project.clips.find(clip=>clip.id===body.clipId);if(!clip||clip.kind!=='video')throw new Error('Choose a video or image clip from this project.');
    const asset=document.assets.find(asset=>asset.id===clip.assetId)??studioAssets.find(asset=>asset.id===clip.assetId);if(!asset)throw new Error('This clip has no project media.');
    const project=body.enabled?makeOverlay(document.project,clip.id,body.overlay,asset):removeOverlay(document.project,clip.id);
    await store.save(id,project,body.expectedRevision);const workspace=await store.workspace(id);res.json({...workspace,...changed(id,workspace.revision)});
  });
}
