import {z} from 'zod';
import type {Project} from '../src/model';
const finite=z.number().finite();
const safeId=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const adjustmentsSchema=z.object({preset:z.enum(['none','clean','warm','cool','cinema','mono']),intensity:finite.min(0).max(100),exposure:finite.min(-2).max(2),brightness:finite.min(-100).max(100),contrast:finite.min(-100).max(100),saturation:finite.min(-100).max(100),warmth:finite.min(-100).max(100),tint:finite.min(-100).max(100)});
export const coverTextSchema=z.object({id:safeId,text:z.string().max(500),fontFamily:z.enum(['Inter Variable','DM Sans Variable','Manrope Variable']),fontSize:finite.min(16).max(200),fontWeight:finite.int().min(400).max(900),italic:z.boolean(),color,stroke:z.boolean(),strokeColor:color,strokeWidth:finite.min(0).max(12),fill:z.enum(['none','box','lines']),fillColor:color,padding:finite.min(0).max(60),radius:finite.min(0).max(100),x:finite.min(0).max(100),y:finite.min(0).max(100),width:finite.min(10).max(96),align:z.enum(['left','center','right'])});
export const videoTextSchema=coverTextSchema.extend({start:finite.int().min(0).max(108000),duration:finite.int().min(1).max(108000),muted:z.boolean()});
export const textPatchSchema=videoTextSchema.omit({id:true}).partial();
export const coverSchema=z.object({frame:finite.int().min(0).max(108000),showCaptions:z.boolean(),texts:z.array(coverTextSchema).max(12)});
export const clipSchema=z.object({id:safeId,assetId:safeId,name:z.string().max(200),trackId:safeId,kind:z.enum(['video','audio']),start:finite.int().min(0).max(108000),duration:finite.int().min(1).max(108000),sourceIn:finite.min(0).max(108000),rate:finite.min(.25).max(4),volume:finite.min(0).max(2),muted:z.boolean(),fadeIn:finite.min(0),fadeOut:finite.min(0),adjustments:adjustmentsSchema.optional()});
export const captionStyleSchema=z.object({fontFamily:z.enum(['Inter Variable','DM Sans Variable','Manrope Variable']),fontSize:finite.min(16).max(160),fontWeight:finite.int().min(400).max(900),color,stroke:z.boolean(),strokeColor:color,strokeWidth:finite.min(0).max(12),display:z.enum(['word','phrase','sentence']),motion:z.enum(['none','fade','pop']),highlight:z.boolean(),highlightColor:color,y:finite.min(10).max(90)});
export const captionLayerSchema=z.object({id:safeId,name:z.string().min(1).max(100),muted:z.boolean(),language:z.string().max(30),style:captionStyleSchema,sourceJobId:z.string().uuid().optional(),sourceSignature:z.string().max(200000).optional(),cues:z.array(z.object({id:safeId,start:finite.int().min(0).max(108000),duration:finite.int().min(1).max(108000),words:z.array(z.object({text:z.string().min(1).max(200),start:finite.int().min(0).max(108000),end:finite.int().min(1).max(108000)})).max(100)})).max(1000)});
export const projectSchema=z.object({version:z.literal(1),name:z.string().min(1).max(100),width:z.number().int().min(16).max(3840),height:z.number().int().min(16).max(3840),fps:z.literal(30),tracks:z.array(z.object({id:safeId,name:z.string().max(100),kind:z.enum(['video','audio']),muted:z.boolean()})).max(12),clips:z.array(clipSchema).max(300),captions:z.array(captionLayerSchema).max(4).optional(),cover:coverSchema.optional(),adjustments:adjustmentsSchema.optional(),texts:z.array(videoTextSchema).max(100).optional()});
export const storedAssetSchema=z.object({id:safeId,name:z.string().max(300),kind:z.enum(['video','audio','image']),duration:finite.min(0),frames:finite.int().min(1),width:finite.int().min(0),height:finite.int().min(0),hasAudio:z.boolean(),file:z.string().max(1500),thumbnails:z.array(z.string().max(1500)),peaks:z.array(finite.min(0).max(1)).max(2048),extension:z.string().optional()});
export type StoredAsset=z.infer<typeof storedAssetSchema>;
export const documentSchema=z.object({format:z.literal('cutroom-project'),version:z.literal(1),id:z.string().uuid(),createdAt:z.string(),updatedAt:z.string(),revision:z.number().int().min(0),project:projectSchema,assets:z.array(storedAssetSchema).max(500)});
export type ProjectDocument=z.infer<typeof documentSchema>;
export class ProjectConflict extends Error{status=409;constructor(){super('This project changed in another tab or tool. Your draft is kept locally. Reopen the project to load the saved version.');}}
export function validateProject(input:unknown,assets:StoredAsset[]):Project{
  const p=projectSchema.parse(input);
  if(p.width%2||p.height%2)throw new Error('Export dimensions must be even.');
  if(new Set(p.clips.map(c=>c.id)).size!==p.clips.length||new Set(p.tracks.map(t=>t.id)).size!==p.tracks.length)throw new Error('Clip and track IDs must be unique.');
  for(const c of p.clips){const a=assets.find(a=>a.id===c.assetId),t=p.tracks.find(t=>t.id===c.trackId);
    if(!a||!t||c.kind!==t.kind)throw new Error('A clip references media outside this project or a different track type.');
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
