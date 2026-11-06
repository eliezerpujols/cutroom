import {giphyHttps} from '../src/giphy';
import {textAnimationOptions,textMotionOptions,textStyleOptions,textAppearanceOptions} from '../src/textEffects';
import {z} from 'zod';
import {dynamicMotionOptions,styleOptions} from '../src/continuousEffects';
import {studioTemplates,studioAssets} from '../src/studio/registry';
import {isKnownFont} from '../src/fonts';
import type {Project} from '../src/model';
const finite=z.number().finite();
const safeId=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
const motion=z.enum(['none','fade','slide-left','slide-right','slide-up','slide-down','zoom-in','zoom-out','blur','wipe',...textAnimationOptions.map(option=>option[0])]);
export const effectsSchema=z.object({textMotion:z.enum(textMotionOptions.map(o=>o[0])).optional(),textStyle:z.enum(textStyleOptions.map(o=>o[0])).optional(),textAppearance:z.enum(textAppearanceOptions.map(o=>o[0])).optional(),textAccent:color.optional(),textUnit:z.enum(['letter','word']).optional(),textStagger:finite.min(0).max(90).optional(),motion:z.enum(dynamicMotionOptions.map(x=>x[0])).optional(),motionIntensity:finite.min(0).max(100).optional(),motionFrames:finite.int().min(2).max(900).optional(),motionTiming:z.object({rise:finite.int().min(1).max(900),hold:finite.int().min(0).max(900),return:finite.int().min(1).max(900)}).refine(t=>t.rise+t.hold+t.return<=900,'Keep the full motion cycle within 30 seconds.').optional(),motionLoop:z.boolean().optional(),style:z.enum(styleOptions.map(x=>x[0])).optional(),styleIntensity:finite.min(0).max(100).optional(),enter:motion,exit:motion,enterFrames:finite.int().min(1).max(90),exitFrames:finite.int().min(1).max(90),blur:finite.min(0).max(40),mask:z.enum(['none','circle','rounded']),transition:z.enum(['none','fade','slide-left','wipe']),transitionFrames:finite.int().min(1).max(90)});
const shadowSettingsSchema=z.object({enabled:z.boolean(),color,opacity:finite.min(0).max(100),blur:finite.min(0).max(40),x:finite.min(-40).max(40),y:finite.min(-40).max(40)});
export const shadowSchema=z.object({mode:z.enum(['none','drop','inner']),color,opacity:finite.min(0).max(100),blur:finite.min(0).max(40),x:finite.min(-40).max(40),y:finite.min(-40).max(40),drop:shadowSettingsSchema.partial().optional(),inner:shadowSettingsSchema.partial().optional()});
export const adjustmentsSchema=z.object({preset:z.enum(['none','clean','warm','cool','cinema','mono']),intensity:finite.min(0).max(100),exposure:finite.min(-2).max(2),brightness:finite.min(-100).max(100),contrast:finite.min(-100).max(100),saturation:finite.min(-100).max(100),warmth:finite.min(-100).max(100),tint:finite.min(-100).max(100)});
export const coverTextSchema=z.object({effects:effectsSchema.optional(),shadow:shadowSchema.partial().optional(),id:safeId,hidden:z.boolean().optional(),text:z.string().max(500),fontFamily:z.string().refine(isKnownFont,'Choose a font from the font library.'),fontSize:finite.min(16).max(200),lineHeight:finite.min(.8).max(3).optional(),letterSpacing:finite.min(-.1).max(.3).optional(),fontWeight:finite.int().min(400).max(900),italic:z.boolean(),color,stroke:z.boolean(),strokeColor:color,strokeWidth:finite.min(0).max(12),fill:z.enum(['none','box','lines']),fillColor:color,padding:finite.min(0).max(60),radius:finite.min(0).max(100),x:finite.min(0).max(100),y:finite.min(0).max(100),width:finite.min(10).max(96),align:z.enum(['left','center','right'])});
export const videoTextSchema=coverTextSchema.extend({effects:effectsSchema.optional(),start:finite.int().min(0).max(108000),duration:finite.int().min(1).max(108000),muted:z.boolean()});
export const textPatchSchema=videoTextSchema.omit({id:true}).partial();
export const clipOverlaySchema=z.object({x:finite.min(0).max(100),y:finite.min(0).max(100),width:finite.min(2)});
export const studioSchema=z.object({template:z.string(),props:z.record(z.string(),z.union([z.string().max(160),finite]))}).superRefine((value,ctx)=>{
  const template=studioTemplates.find(t=>t.id===value.template);
  if(!template){ctx.addIssue({code:'custom',message:'Unknown Studio element.'});return;}
  for(const [key,v] of Object.entries(value.props)){
    const field=template.fields.find(f=>f.key===key);
    if(!field||field.type==='number'&&(typeof v!=='number'||v<(field.min??0)||v>(field.max??100))||field.type==='color'&&(typeof v!=='string'||!/^#[0-9a-fA-F]{6}$/.test(v))||field.type==='text'&&typeof v!=='string')ctx.addIssue({code:'custom',message:`Invalid Studio property: ${key}`});
  }
});
export const transformSchema=z.object({rotation:finite.min(-180).max(180).optional(),flipX:z.boolean().optional(),flipY:z.boolean().optional(),crop:z.object({left:finite.min(0).max(90),top:finite.min(0).max(90),right:finite.min(0).max(90),bottom:finite.min(0).max(90)}).refine(c=>c.left+c.right<95&&c.top+c.bottom<95,'Keep at least 5% of the source visible.').optional(),faceTrack:z.array(z.object({frame:finite.int().min(0).max(540000),x:finite.min(0).max(100),y:finite.min(0).max(100)})).max(36001).optional()});
export const clipSchema=z.object({transform:transformSchema.optional(),studio:studioSchema.optional(),effects:effectsSchema.optional(),id:safeId,hidden:z.boolean().optional(),assetId:safeId,name:z.string().max(200),trackId:safeId,kind:z.enum(['video','audio']),start:finite.int().min(0).max(108000),duration:finite.int().min(1).max(108000),sourceIn:finite.min(0).max(108000),rate:finite.min(.25).max(4),volume:finite.min(0).max(2),muted:z.boolean(),fadeIn:finite.min(0),fadeOut:finite.min(0),overlay:clipOverlaySchema.optional(),adjustments:adjustmentsSchema.optional()});
export const captionStyleSchema=z.object({shadow:shadowSchema.partial().optional(),lineHeight:finite.min(.8).max(3).optional(),letterSpacing:finite.min(-.1).max(.3).optional(),fontFamily:z.string().refine(isKnownFont,'Choose a font from the font library.'),fontSize:finite.min(16).max(160),fontWeight:finite.int().min(400).max(900),color,stroke:z.boolean(),strokeColor:color,strokeWidth:finite.min(0).max(12),display:z.enum(['word','phrase','sentence']),motion:z.enum(['none','fade','pop']),highlight:z.boolean(),highlightColor:color,highlightMotion:z.enum(['none','fade','pop']).optional(),x:finite.min(0).max(100).optional(),width:finite.min(10).max(96).optional(),align:z.enum(['left','center','right']).optional(),y:finite.min(0).max(100)});
export const captionLayerSchema=z.object({id:safeId,name:z.string().min(1).max(100),muted:z.boolean(),language:z.string().max(30),style:captionStyleSchema,sourceJobId:z.string().uuid().optional(),sourceSignature:z.string().max(200000).optional(),cues:z.array(z.object({effects:effectsSchema.optional(),id:safeId,hidden:z.boolean().optional(),start:finite.int().min(0).max(108000),duration:finite.int().min(1).max(108000),style:captionStyleSchema.partial().optional(),words:z.array(z.object({text:z.string().min(1).max(200),start:finite.int().min(0).max(108000),end:finite.int().min(1).max(108000)})).max(100)})).max(1000)});
export const coverSceneSchema=z.object({
  tracks:z.array(z.object({id:safeId,name:z.string().max(100),kind:z.enum(['video','audio']),muted:z.boolean()})).max(12),
  clips:z.array(clipSchema).max(300),
  texts:z.array(videoTextSchema).max(100).optional(),
  captions:z.array(captionLayerSchema).max(4).optional(),
  layerOrder:z.array(z.string().regex(/^(track|caption|text):[A-Za-z0-9_-]{1,100}$/)).max(116).optional(),
  adjustments:adjustmentsSchema.optional(),
});
export const coverSchema=z.object({frame:finite.int().min(0).max(108000),showCaptions:z.boolean(),texts:z.array(coverTextSchema).max(12),scene:coverSceneSchema.optional()});
export const projectSchema=z.object({layerOrder:z.array(z.string().regex(/^(track|caption|text):[A-Za-z0-9_-]{1,100}$/)).max(116).optional(),version:z.literal(1),name:z.string().min(1).max(100),width:z.number().int().min(16).max(3840),height:z.number().int().min(16).max(3840),fps:z.literal(30),tracks:z.array(z.object({id:safeId,name:z.string().max(100),kind:z.enum(['video','audio']),muted:z.boolean()})).max(12),clips:z.array(clipSchema).max(300),captions:z.array(captionLayerSchema).max(4).optional(),cover:coverSchema.optional(),adjustments:adjustmentsSchema.optional(),texts:z.array(videoTextSchema).max(100).optional()});
export const giphySourceSchema=z.object({provider:z.literal('giphy'),id:z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),kind:z.enum(['gifs','clips','stickers']),pageUrl:z.string().max(2000).refine(v=>giphyHttps(v),'Use a GIPHY source link.'),title:z.string().max(200).optional(),creator:z.string().max(200).optional(),creatorUrl:z.string().max(2000).refine(v=>giphyHttps(v)).optional()});
export const storedAssetSchema=z.object({giphy:giphySourceSchema.optional(),sequence:z.object({count:finite.int().min(1).max(108000)}).optional(),id:safeId,name:z.string().max(300),kind:z.enum(['video','audio','image']),duration:finite.min(0),frames:finite.int().min(1),width:finite.int().min(0),height:finite.int().min(0),hasAudio:z.boolean(),file:z.string().max(1500),thumbnails:z.array(z.string().max(1500)),peaks:z.array(finite.min(0).max(1)).max(2048),extension:z.string().optional()});
export type StoredAsset=z.infer<typeof storedAssetSchema>;
export const documentSchema=z.object({format:z.literal('cutroom-project'),version:z.literal(1),id:z.string().uuid(),createdAt:z.string(),updatedAt:z.string(),revision:z.number().int().min(0),project:projectSchema,assets:z.array(storedAssetSchema).max(500)});
export type ProjectDocument=z.infer<typeof documentSchema>;
export class ProjectConflict extends Error{status=409;constructor(){super('This project changed in another tab or tool. Your draft is kept locally. Reopen the project to load the saved version.');}}
export function validateProject(input:unknown,assets:StoredAsset[]):Project{
  const p=projectSchema.parse(input);
  if(p.cover?.scene)validateProject({...p,...p.cover.scene,cover:undefined},assets);
  if(p.layerOrder&&new Set(p.layerOrder).size!==p.layerOrder.length)throw new Error('Layer order keys must be unique.');
  if(p.width%2||p.height%2)throw new Error('Export dimensions must be even.');
  if(new Set(p.clips.map(c=>c.id)).size!==p.clips.length||new Set(p.tracks.map(t=>t.id)).size!==p.tracks.length)throw new Error('Clip and track IDs must be unique.');
  for(const c of p.clips){const a=assets.find(a=>a.id===c.assetId)??(c.studio?studioAssets.find(a=>a.id===c.assetId):undefined),t=p.tracks.find(t=>t.id===c.trackId);
    if(!a||!t||c.kind!==t.kind)throw new Error('A clip references media outside this project or a different track type.');
    if(c.studio&&(c.kind!=='video'||c.assetId!==`studio-${c.studio.template}`))throw new Error('Studio element media does not match its template.');
    if(c.kind!=='video'&&c.transform)throw new Error('Only visual clips support transformations.');
    if(c.kind!=='video'&&c.overlay)throw new Error('Only video and image clips can have an overlay layout.');
    if(c.kind==='video'&&a.kind==='audio')throw new Error('A video clip needs a video or image file.');
    if(c.kind==='audio'&&!a.hasAudio)throw new Error('This file does not contain audio.');
    if(a.kind!=='image'&&c.sourceIn+c.duration*c.rate>a.frames+1.01)throw new Error('A clip extends beyond its source media.');
  }
  if(p.cover&&new Set(p.cover.texts.map(text=>text.id)).size!==p.cover.texts.length)throw new Error('Cover text IDs must be unique.');
  if(new Set((p.texts||[]).map(text=>text.id)).size!==(p.texts||[]).length)throw new Error('Video text IDs must be unique.');
  const layers=p.captions||[],cues=layers.flatMap(layer=>layer.cues);
  if(new Set(layers.map(layer=>layer.id)).size!==layers.length||new Set(cues.map(cue=>cue.id)).size!==cues.length)throw new Error('Caption layer and cue IDs must be unique.');
  for(const cue of cues){if(cue.words.some(word=>word.end<=word.start||word.start>=cue.duration||word.end>cue.duration))throw new Error('Caption word timing must stay inside its cue.');if(cue.words.some((word,index)=>index>0&&word.start<cue.words[index-1].start))throw new Error('Caption words must stay in time order.');}
  return p;
}
