import fs from 'node:fs/promises';
import path from 'node:path';
import {renderStill,selectComposition} from '@remotion/renderer';
import type {VideoConfig} from 'remotion';
import {z} from 'zod';
import {coverFrame,defaultCover} from '../src/visuals';
import type {Asset,Project} from '../src/model';

export type CoverCompanion={filename:string;url:string;frame:number};
export function companionProject(project:Project):Project{
  const first=project.clips.filter(clip=>clip.kind==='video').sort((a,b)=>a.start-b.start)[0];
  const result=project.cover?project:{...project,cover:{...defaultCover,frame:first?.start||0,texts:[]}};
  const frame=coverFrame(result);
  if(first&&!project.clips.some(clip=>clip.kind==='video'&&clip.start<=frame&&frame<clip.start+clip.duration))throw new Error('The cover frame is in a timeline gap. Choose a frame with video or an image before exporting.');
  return result;
}
export async function renderCompanion({project,assets,composition,serveUrl,exportsDir,filename,projectId}:{project:Project;assets:Asset[];composition:VideoConfig;serveUrl:string;exportsDir:string;filename:string;projectId:string}):Promise<CoverCompanion>{
  const cover=companionProject(project),frame=coverFrame(cover),coverFilename=path.basename(filename,path.extname(filename))+'-cover.png',output=path.join(exportsDir,coverFilename);
  const inputProps={project:cover,assets,coverMode:true};
  try{
    // renderStill consumes composition.props as the resolved component props.
    // The MP4 composition was resolved without coverMode; inputProps alone does
    // not replace that snapshot. Resolve again so cover text/caption visibility
    // and calculated metadata match the same cover-only render as Export PNG.
    const coverComposition=await selectComposition({serveUrl,id:composition.id,inputProps});
    await renderStill({composition:coverComposition,serveUrl,inputProps,frame,output,imageFormat:'png'});
  }
  catch(error){await fs.unlink(output).catch(()=>{});throw error;}
  return {filename:coverFilename,url:`/api/projects/${projectId}/exports/${encodeURIComponent(coverFilename)}`,frame};
}
// Completed-export lookup intentionally reads a small whitelist. Restore the
// matching companion from that render's manifest, never from another edit.
export async function restoreCompanion<T extends {id:string;filename:string;projectId:string}>(exportsDir:string,job:T|null):Promise<(T&{cover?:CoverCompanion;coverError?:string})|null>{
  if(!job||path.extname(job.filename).toLowerCase()!=='.mp4')return job;
  try{
    const id=z.string().uuid().parse(job.id),record=path.join(exportsDir,id+'.export.json');if((await fs.stat(record)).size>65536)return job;
    const saved=z.object({cover:z.object({filename:z.string().min(1).max(255),frame:z.number().int().min(0)}).optional(),coverError:z.string().max(2000).optional()}).parse(JSON.parse(await fs.readFile(record,'utf8')));
    if(!saved.cover)return {...job,...(saved.coverError?{coverError:saved.coverError}:{})};
    const filename=saved.cover.filename;if(path.basename(filename)!==filename||!filename.endsWith('-cover.png'))throw new Error('Invalid cover file.');
    const folder=await fs.realpath(exportsDir),file=await fs.realpath(path.join(folder,filename));if(path.dirname(file)!==folder||!(await fs.stat(file)).isFile())throw new Error('Cover missing.');
    return {...job,cover:{filename,frame:saved.cover.frame,url:`/api/projects/${job.projectId}/exports/${encodeURIComponent(filename)}`}};
  }catch{return {...job,coverError:'The cover image is unavailable. Export a new cover from the Cover panel.'};}
}
export async function savedCompanion(exportsDir:string,projectId:string,jobId:string){
  const id=z.string().uuid().parse(jobId),record=path.join(exportsDir,id+'.export.json');
  if((await fs.stat(record)).size>65536)throw new Error('Invalid export record.');
  const job=z.object({id:z.literal(id),projectId:z.literal(projectId),filename:z.string().min(1).max(255),status:z.literal('completed')}).parse(JSON.parse(await fs.readFile(record,'utf8')));
  const restored=await restoreCompanion(exportsDir,job);
  return {cover:restored?.cover,coverError:restored?.coverError};
}
