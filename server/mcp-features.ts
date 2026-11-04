import {randomUUID} from 'node:crypto';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {base,request} from './ensure-server';
import {effectsSchema,ProjectConflict} from './schema';
import {defaultEffects,motionOptions,type Effects} from '../src/effects';
import {dynamicMotionOptions,styleOptions,getMotionTiming,resizeMotionTiming} from '../src/continuousEffects';
import {textAnimationOptions,textMotionOptions,textStyleOptions,textAppearanceOptions,isTextAnimation} from '../src/textEffects';
import {fontCategories,fontCategory,fontLabel,fontPickerOptions,isBundledFont,isKnownFont} from '../src/fonts';
import type {Project} from '../src/model';

export const effectTargetSchema=z.object({kind:z.enum(['clip','text','caption']),id:z.string().min(1).max(100)}).strict();
export const effectPatchSchema=effectsSchema.partial().extend({motionTiming:z.object(effectsSchema.shape.motionTiming.unwrap().shape).partial().strict().optional()}).strict();
type Target=z.infer<typeof effectTargetSchema>;
type Patch=z.infer<typeof effectPatchSchema>;

// Explicit kinds avoid collisions between IDs in independent project collections.
export function applyEffectPatch(project:Project,targets:Target[],input:Patch,reset=false):Project{
  const patch=effectPatchSchema.parse(input);
  const keys=new Set(targets.map(t=>`${t.kind}:${t.id}`));
  if(!targets.length||keys.size!==targets.length)throw new Error('Choose unique effect targets.');
  const matched=new Set<string>();
  const update=<T extends {id:string;effects?:Effects;kind?:string}>(item:T,kind:Target['kind']):T=>{
    const key=`${kind}:${item.id}`;if(!keys.has(key))return item;
    if(kind==='clip'&&item.kind!=='video')throw new Error('Audio clips do not have visual effects.');
    if(kind==='clip'&&(isTextAnimation(patch.enter)||isTextAnimation(patch.exit)||['textMotion','textStyle','textAppearance','textAccent','textUnit','textStagger'].some(key=>key in patch)))throw new Error('Text effects require a text or caption target.');
    matched.add(key);
    let effects:Effects={...defaultEffects,...(reset?{}:item.effects)};
    if(patch.motionFrames!==undefined)effects={...effects,...resizeMotionTiming(effects,patch.motionFrames)};
    const {motionTiming,...rest}=patch;effects={...effects,...rest};
    if(motionTiming){const timing={...getMotionTiming(effects),...motionTiming};effects={...effects,motionTiming:timing,motionFrames:timing.rise+timing.hold+timing.return};}
    return {...item,effects:effectsSchema.parse(effects)};
  };
  const next={...project,clips:project.clips.map(c=>update(c,'clip')),texts:project.texts?.map(t=>update(t,'text')),captions:project.captions?.map(l=>({...l,cues:l.cues.map(c=>update(c,'caption'))}))};
  if(matched.size!==keys.size)throw new Error('An effect target was not found. Read get_project for current clip, text and caption cue IDs.');
  return next;
}
export type LocalRequest=(route:string,body?:unknown,method?:string)=>Promise<any>;
export async function saveEffects(projectId:string,revision:number,targets:Target[],patch:Patch,reset=false,send:LocalRequest=request){
  const current=await send('/api/workspace?projectId='+projectId);
  if(current.revision!==revision)throw new ProjectConflict();
  const project=applyEffectPatch(current.project,targets,patch,reset);
  // The PUT repeats the revision check atomically under ProjectStore's save lock.
  const saved=await send('/api/project',{projectId,expectedRevision:revision,project},'PUT');
  const instance=randomUUID();
  return {...saved,targets,editor_url:`${base}/?project=${projectId}&instance=${instance}&view=effects`,editor_instance_id:instance,open_in_new_tab:true,next_action:'open_editor_in_new_tab'};
}
const attempt=async(work:()=>Promise<unknown>)=>{try{return {content:[{type:'text' as const,text:JSON.stringify(await work())}]};}catch(e){return {isError:true,content:[{type:'text' as const,text:(e as Error).message}]};}};
const options=(values:readonly (readonly [string,string])[])=>values.map(([id,name])=>({id,name}));
export function registerFeatureTools(server:McpServer){
  server.registerTool('list_effects',{description:'Discover implemented In/Out animations, Between transitions, Motion, Styles and Appearance. Text/caption targets include letter and word effects. Returns IDs and defaults for set_effects. Local, no credits.',inputSchema:{target_kind:z.enum(['clip','text','caption']).default('clip')},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},({target_kind})=>attempt(async()=>({
    target_kind,fps:30,defaults:defaultEffects,animation:options(target_kind==='clip'?motionOptions:[...motionOptions,...textAnimationOptions]),between:options([['none','None'],['fade','Fade'],['slide-left','Slide left'],['wipe','Wipe']]),motion:options(dynamicMotionOptions),styles:options(styleOptions),appearance:{blur:{min:0,max:40,unit:'px'},mask:['none','rounded','circle']},
    ...(target_kind==='clip'?{}:{textMotion:options(textMotionOptions),textStyles:options(textStyleOptions),textAppearance:options(textAppearanceOptions)}),
    timing:{unit:'frames',animation:{min:1,max:90},cycle:{min:2,max:900},phases:['rise','hold','return'],phased_motion:['pulse','explode','flash','super-zoom','echo','tunnel']},between_requires:'An eligible preceding item. Video clips must touch on the same track and be full-frame; text/caption pairing follows the editor rules.'
  })));
  server.registerTool('set_effects',{description:'Apply a partial effect patch to video/image/Studio clips, manual text, or individual caption cues, including a mixed batch. Read get_project for IDs and revision, list_effects for presets. kind=caption uses cue ID, not layer ID. Preserves each item’s other settings and timings. motionTiming accepts partial Rise/Hold/Return frames and recomputes cycle duration per item. reset=true clears all effects on targets before the patch. Text-only effects cannot target media; audio and unknown IDs reject the entire batch. Between needs an eligible predecessor. Returns a new editor URL; no credits.',inputSchema:{project_id:z.string().uuid(),expected_revision:z.number().int().min(0),targets:z.array(effectTargetSchema).min(1).max(300),effects:effectPatchSchema,reset:z.boolean().default(false)},annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false}},({project_id,expected_revision,targets,effects,reset})=>attempt(()=>saveEffects(project_id,expected_revision,targets,effects,reset)));
  server.registerTool('list_fonts',{description:'Search bundled and Google Fonts by family and style category. Uses the same alphabetical groups and catalog as the editor; returns exact family values for text/caption/cover styles and local cache availability. No download or API key. Paginated with next_offset.',inputSchema:{query:z.string().max(200).default(''),category:z.enum(fontCategories.map(c=>c[0])).default('All'),offset:z.number().int().min(0).default(0),limit:z.number().int().min(1).max(100).default(30)},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},({query,category,offset,limit})=>attempt(async()=>{
    const {installed}=await request('/api/fonts');const entries=fontPickerOptions({query,category,installed});return {categories:fontCategories.map(([id,name])=>({id,name})),total:entries.length,next_offset:offset+limit<entries.length?offset+limit:null,fonts:entries.slice(offset,offset+limit).map(f=>({family:f.family,name:fontLabel(f.family),category:fontCategory(f.family),source:isBundledFont(f.family)?'bundled':'google',available_locally:f.local}))};
  }));
  server.registerTool('prepare_font',{description:'Download/cache a known Google font into this project’s portable fonts folder for offline preview/export, or confirm a bundled font. Use list_fonts for the exact family. Does not change text styling or timeline revision and uses no credits. First use contacts Google Fonts; existing cached files are reused.',inputSchema:{project_id:z.string().uuid(),family:z.string().refine(isKnownFont,'Choose a font returned by list_fonts.')},annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true}},({project_id,family})=>attempt(()=>request(`/api/projects/${project_id}/fonts/${encodeURIComponent(family)}`)));
}
