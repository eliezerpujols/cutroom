import type {Express} from 'express';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {ProjectStore} from './projects';
import {coverTextSchema,captionStyleSchema,effectsSchema,clipOverlaySchema,transformSchema,adjustmentsSchema} from './schema';
import {coverFrame,defaultCover,defaultAdjustments} from '../src/visuals';
import {coverFrameItems,coverSceneProject,saveCoverScene,setCoverItemVisibility} from '../src/coverScene';
import {addStudioElement,studioTemplates} from '../src/studio/registry';
import {makeVideoText} from '../src/videoText';
import {addGiphyClip} from '../src/giphy';
import {replaceCueText} from '../src/captions';
import {patchSelectionEffects} from '../src/effects';
import type {Asset,Project} from '../src/model';

export const coverElementFields={
  element_id:z.string().optional(),
  kind:z.enum(['media','studio','text']).optional(),
  asset_id:z.string().optional(),
  template:z.string().optional(),
  props:z.record(z.string(),z.union([z.string(),z.number().finite()])).optional(),
  text:z.string().max(500).optional(),
  visible:z.boolean().optional(),
  remove:z.boolean().optional(),
  source_frame:z.number().int().min(0).max(108000).optional(),
  overlay:clipOverlaySchema.partial().optional(),
  transform:transformSchema.partial().optional(),
  effects:effectsSchema.partial().optional(),
  adjustments:adjustmentsSchema.partial().optional(),
  style:coverTextSchema.omit({id:true,text:true,hidden:true}).partial().optional(),
  caption_style:captionStyleSchema.partial().optional(),
};
export const coverElementSchema=z.object(coverElementFields);
export type CoverElementInput=z.infer<typeof coverElementSchema>;

export function setCoverElement(project:Project,assets:Asset[],input:CoverElementInput){
  let scene=structuredClone(coverSceneProject(project));
  const at=coverFrame(project);
  let id=input.element_id;
  if(!id){
    id=randomUUID();
    if(input.kind==='studio'){
      if(!input.template)throw new Error('Choose a Studio template.');
      scene=addStudioElement(scene,input.template,at,id);
      const source=input.source_frame??(studioTemplates.find(t=>t.id===input.template)?.duration??30)-1;
      scene={...scene,clips:scene.clips.map(c=>c.id===id?{...c,duration:1,sourceIn:source}:c)};
    }else if(input.kind==='media'){
      const asset=assets.find(a=>a.id===input.asset_id&&!a.missing&&a.kind!=='audio');
      if(!asset)throw new Error('Choose an imported image, GIF, sticker or video asset.');
      const added=addGiphyClip(scene,asset,at,'overlay');
      scene=added.project;id=added.id;
      scene={...scene,clips:scene.clips.map(c=>c.id===id?{...c,duration:1,sourceIn:input.source_frame??0}:c)};
    }else if(input.kind==='text'){
      scene={...scene,texts:[{...makeVideoText(id,at),duration:1,text:input.text??'Your title here'},...(scene.texts??[])]};
    }else throw new Error('Choose media, studio or text when adding a cover element.');
  }
  const clip=scene.clips.find(c=>c.id===id);
  const text=scene.texts?.find(t=>t.id===id);
  const caption=scene.captions?.flatMap(l=>l.cues).find(c=>c.id===id);
  const title=scene.cover?.texts.find(t=>t.id===id);
  if(!clip&&!text&&!caption&&!title)throw new Error('Choose an element from this cover.');
  const replacement=input.asset_id?assets.find(a=>a.id===input.asset_id&&!a.missing&&a.kind!=='audio'):undefined;
  if(input.asset_id&&(!clip||!replacement||clip.studio))throw new Error('Choose an imported visual asset for a media element.');
  if(input.props&&!clip?.studio)throw new Error('Studio properties require a Studio element.');
  if((input.overlay||input.transform||input.adjustments||input.source_frame!==undefined)&&!clip)throw new Error('Visual media settings require a media or Studio element.');
  if(input.caption_style&&!caption)throw new Error('Caption style requires a caption element.');
  if(input.style&&!text&&!title)throw new Error('Text style requires a text element.');
  if(input.text!==undefined&&!text&&!caption&&!title)throw new Error('Text content requires a text or caption element.');
  const target=clip?{kind:'clip' as const,id}:text?{kind:'text' as const,id}:caption?{kind:'caption' as const,id}:{kind:'cover' as const,id};
  if(input.visible!==undefined){
    scene=setCoverItemVisibility(scene,target,input.visible);
  }
  if(clip)scene.clips=scene.clips.map(c=>c.id===id?{...c,
    ...(replacement?{assetId:replacement.id,name:replacement.name,sourceIn:0,start:at,duration:1,rate:1}:{}),
    ...(input.props?{studio:{...c.studio!,props:{...c.studio!.props,...input.props}}}:{}),
    ...(input.overlay?{overlay:{x:50,y:50,width:45,...c.overlay,...input.overlay}}:{}),
    ...(input.transform?{transform:{...c.transform,...input.transform}}:{}),
    ...(input.adjustments?{adjustments:{...defaultAdjustments,...c.adjustments,...input.adjustments}}:{}),
    ...(input.source_frame===undefined?{}:{sourceIn:input.source_frame,start:at,duration:1,rate:1}),
  }:c);
  if(text)scene.texts=scene.texts?.map(t=>t.id===id?{...t,...input.style,...(input.text===undefined?{}:{text:input.text})}:t);
  if(caption)scene.captions=scene.captions?.map(l=>({...l,cues:l.cues.map(c=>c.id===id?{
    ...c,...(input.text===undefined?{}:{words:replaceCueText(c,input.text).words}),
    ...(input.caption_style?{style:{...c.style,...input.caption_style}}:{}),
  }:c)}));
  if(title)scene.cover={...defaultCover,...scene.cover,texts:scene.cover!.texts.map(t=>t.id===id?{...t,...input.style,...(input.text===undefined?{}:{text:input.text})}:t)};
  if(input.effects)scene=patchSelectionEffects(scene,[id],input.effects);
  if(input.remove){
    scene.clips=scene.clips.filter(c=>c.id!==id);
    scene.texts=scene.texts?.filter(t=>t.id!==id);
    scene.captions=scene.captions?.map(l=>({...l,cues:l.cues.filter(c=>c.id!==id)}));
    if(scene.cover)scene.cover={...scene.cover,texts:scene.cover.texts.filter(t=>t.id!==id)};
  }
  return {project:saveCoverScene(project,scene),elementId:id};
}

export function registerCoverElementRoutes(app:Express,store:ProjectStore,changed:(id:string,revision:number)=>Record<string,unknown>){
  app.get('/api/projects/:id/cover/elements',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id),doc=await store.read(id);
    res.json({projectId:id,revision:doc.revision,frame:coverFrame(doc.project),customized:!!doc.project.cover?.scene,showCaptions:doc.project.cover?.showCaptions??false,elements:coverFrameItems(doc.project,coverFrame(doc.project))});
  });
  app.post('/api/projects/:id/cover/elements',async(req,res)=>{
    const id=z.string().uuid().parse(req.params.id);
    const body=coverElementSchema.extend({expectedRevision:z.number().int().min(0)}).parse(req.body);
    const doc=await store.read(id),workspace=await store.workspace(id);
    const result=setCoverElement(doc.project,workspace.assets,body);
    const saved=await store.save(id,result.project,body.expectedRevision);
    res.json({elementId:result.elementId,revision:saved.revision,...changed(id,saved.revision)});
  });
}
