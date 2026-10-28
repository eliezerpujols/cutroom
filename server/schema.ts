import {z} from 'zod';
import type {Project} from '../src/model';
const finite=z.number().finite();
const safeId=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
export const clipSchema=z.object({id:safeId,assetId:safeId,name:z.string().max(200),trackId:safeId,kind:z.enum(['video','audio']),start:finite.int().min(0).max(108000),duration:finite.int().min(1).max(108000),sourceIn:finite.min(0).max(108000),rate:finite.min(.25).max(4),volume:finite.min(0).max(2),muted:z.boolean(),fadeIn:finite.min(0),fadeOut:finite.min(0)});
export const projectSchema=z.object({version:z.literal(1),name:z.string().min(1).max(100),width:z.number().int().min(16).max(3840),height:z.number().int().min(16).max(3840),fps:z.literal(30),tracks:z.array(z.object({id:safeId,name:z.string().max(100),kind:z.enum(['video','audio']),muted:z.boolean()})).max(12),clips:z.array(clipSchema).max(300)});
export const storedAssetSchema=z.object({id:safeId,name:z.string().max(300),kind:z.enum(['video','audio']),duration:finite.min(0),frames:finite.int().min(1),width:finite.int().min(0),height:finite.int().min(0),hasAudio:z.boolean(),file:z.string().max(1500),thumbnails:z.array(z.string().max(1500)),peaks:z.array(finite.min(0).max(1)).max(2048),extension:z.string().optional()});
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
    if(c.kind==='video'&&a.kind!=='video')throw new Error('A video clip needs a video file.');
    if(c.kind==='audio'&&!a.hasAudio)throw new Error('This file does not contain audio.');
    if(c.sourceIn+c.duration*c.rate>a.frames+1.01)throw new Error('A clip extends beyond its source media.');
  }return p;
}
