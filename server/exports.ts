import path from 'node:path';
import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {z} from 'zod';

const run=promisify(execFile);
export type ExportFormat='mp4'|'wav'|'mp3';
const savedExport=z.object({id:z.string().uuid(),projectId:z.string().uuid(),status:z.literal('completed'),filename:z.string().min(1),progress:z.number(),selection:z.object({start:z.number(),end:z.number()}).optional()});

export async function exportFile(exportsDir:string,filename:string){
  if(path.basename(filename)!==filename||!/\.(mp4|wav|mp3)$/i.test(filename))throw new Error('Choose an exported MP4, WAV or MP3 file.');
  const folder=await fs.realpath(exportsDir),file=await fs.realpath(path.join(folder,filename)).catch(()=>{throw new Error('This export is no longer in its project folder. Create a new export.');});
  if(path.dirname(file)!==folder||!(await fs.stat(file)).isFile())throw new Error('The export must be a file inside this project’s exports folder.');
  return file;
}

// Recover completed renders after reopening the editor or restarting the server.
// Ignore raw dubbed media: only finished timeline exports have these manifests.
export async function latestExport(exportsDir:string,projectId:string,format:ExportFormat){
  const entries=await fs.readdir(exportsDir,{withFileTypes:true}).catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return [];throw error;});
  const results=[];
  for(const entry of entries){
    if(!entry.isFile()||!entry.name.endsWith('.export.json'))continue;
    try{
      const record=path.join(exportsDir,entry.name);if((await fs.stat(record)).size>65536)continue;
      const job=savedExport.parse(JSON.parse(await fs.readFile(record,'utf8')));
      if(job.projectId!==projectId||job.selection||path.extname(job.filename).toLowerCase()!=='.'+format)continue;
      const file=await exportFile(exportsDir,job.filename),stat=await fs.stat(file);
      results.push({...job,format,exportedAt:stat.mtime.toISOString(),url:`/api/projects/${projectId}/exports/${encodeURIComponent(job.filename)}`});
    }catch{/* A missing export or unrelated file is not an available completed render. */}
  }
  return results.sort((a,b)=>b.exportedAt.localeCompare(a.exportedAt))[0]??null;
}

export async function revealExport(exportsDir:string,filename:string){
  if(process.platform!=='darwin')throw new Error('Showing exports in Finder currently requires macOS.');
  const file=await exportFile(exportsDir,filename);
  await run('/usr/bin/open',['-R',file],{timeout:10000});
  return {revealed:true,path:file};
}
