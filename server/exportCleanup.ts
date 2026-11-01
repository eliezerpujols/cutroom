import fs from 'node:fs/promises';
import path from 'node:path';
import {homedir} from 'node:os';
import type {Express} from 'express';
import {z} from 'zod';
import {documentSchema,type ProjectDocument} from './schema';

// This boundary is deliberately independent of CUTROOM_PROJECTS_DIR and tool input.
export const exportCleanupRoot=()=>path.join(homedir(),'Documents','Cut Room');
type CleanupProject={folder:string;document:ProjectDocument};
type Skipped={path:string;reason:string};
type Dependencies={protectedFiles:()=>Promise<string[]>;isProjectBusy:(id:string)=>Promise<boolean>};
const inside=(root:string,file:string)=>file.startsWith(root+path.sep);
const missing=(error:unknown)=>(error as NodeJS.ErrnoException).code==='ENOENT';
const reserved=new Set(['media','thumbs','history','exports','dubbing','captions','Sound Library']);

async function plainDirectory(folder:string,expected:string){
  const stat=await fs.lstat(folder);
  if(!stat.isDirectory()||stat.isSymbolicLink()||await fs.realpath(folder)!==expected)throw new Error('Linked or changed folder; left untouched.');
}
async function discover(root:string,skipped:Skipped[]):Promise<CleanupProject[]>{
  const projects:CleanupProject[]=[];
  async function walk(folder:string){
    await plainDirectory(folder,folder);
    const manifest=path.join(folder,'project.cutroom');
    try{
      const stat=await fs.lstat(manifest);
      if(!stat.isFile()||stat.isSymbolicLink()||stat.size>5*1024**2)throw new Error('Project manifest is linked, invalid or too large.');
      const document=documentSchema.parse(JSON.parse(await fs.readFile(manifest,'utf8')));
      projects.push({folder,document});return;
    }catch(error){
      if(!missing(error)){skipped.push({path:folder,reason:'Unrecognized or unreadable project; left untouched.'});return;}
    }
    for(const entry of await fs.readdir(folder,{withFileTypes:true})){
      if(entry.name.startsWith('.')||reserved.has(entry.name))continue;
      const child=path.join(folder,entry.name);
      if(entry.isSymbolicLink()){skipped.push({path:child,reason:'Symbolic link; left untouched.'});continue;}
      if(!entry.isDirectory())continue;
      try{await walk(child);}catch{skipped.push({path:child,reason:'Unreadable or changed folder; left untouched.'});}
    }
  }
  await walk(root);return projects;
}

// The root argument is for isolated filesystem fixtures. The MCP/HTTP route never
// accepts a path: it always supplies exportCleanupRoot(). No recursive deletion.
export async function cleanupProjectExports(rootInput:string,dryRun:boolean,dependencies:Dependencies){
  const skipped:Skipped[]=[],summaries:{project_id:string;name:string;folder:string;files:number;bytes:number;deleted_files:number;freed_bytes:number}[]=[];
  const result={root:rootInput,dry_run:dryRun,files:0,bytes:0,deleted_files:0,freed_bytes:0,projects:summaries,skipped};
  try{
    const stat=await fs.lstat(rootInput);
    if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Cut Room must be a regular folder, not a symbolic link.');
  }catch(error){if(missing(error))return result;throw error;}
  const root=await fs.realpath(rootInput),projects=await discover(root,skipped);
  // Collect all source references before considering any deletion, including
  // registered projects outside the cleanup boundary that may reuse an export.
  const protectedFiles=new Set<string>();
  const protect=async(file:string)=>{protectedFiles.add(path.resolve(file));try{protectedFiles.add(await fs.realpath(file));}catch(error){if(!missing(error))throw error;}};
  for(const file of await dependencies.protectedFiles())await protect(file);
  for(const {folder,document} of projects)for(const asset of document.assets)for(const relative of [asset.file,...asset.thumbnails]){
    const source=path.resolve(folder,relative);
    if(path.isAbsolute(relative)||!inside(folder,source))throw new Error('Unsafe source reference in a project; cleanup stopped before deletion.');
    await protect(source);
  }
  for(const project of projects){
    const {folder,document}=project,exports=path.join(folder,'exports');
    const summary={project_id:document.id,name:document.project.name,folder,files:0,bytes:0,deleted_files:0,freed_bytes:0};summaries.push(summary);
    if(!inside(root,folder)){skipped.push({path:folder,reason:'Outside a project folder in Cut Room.'});continue;}
    if(await dependencies.isProjectBusy(document.id)){skipped.push({path:exports,reason:'Project has an active job.'});continue;}
    let entries:import('node:fs').Dirent[];
    try{await plainDirectory(folder,folder);await plainDirectory(exports,exports);entries=await fs.readdir(exports,{withFileTypes:true});}
    catch(error){if(!missing(error))skipped.push({path:exports,reason:'Linked, unreadable or changed exports folder.'});continue;}
    for(const entry of entries){
      const file=path.join(exports,entry.name);
      try{
        await plainDirectory(rootInput,root);await plainDirectory(folder,folder);await plainDirectory(exports,exports);
        const stat=await fs.lstat(file);
        if(!stat.isFile()||stat.isSymbolicLink()){skipped.push({path:file,reason:'Subfolder, link or special file; left untouched.'});continue;}
        if(protectedFiles.has(file)||protectedFiles.has(await fs.realpath(file))||stat.nlink>1){skipped.push({path:file,reason:'Used as source media, thumbnail or shared file.'});continue;}
        if(await dependencies.isProjectBusy(document.id)){skipped.push({path:exports,reason:'Project became busy; remaining exports left untouched.'});break;}
        if(!dryRun){
          // Recheck identity after asynchronous guards; never remove a replacement.
          await plainDirectory(rootInput,root);await plainDirectory(folder,folder);await plainDirectory(exports,exports);
          const current=await fs.lstat(file);
          if(!current.isFile()||current.isSymbolicLink()||current.dev!==stat.dev||current.ino!==stat.ino||current.size!==stat.size||current.mtimeMs!==stat.mtimeMs||current.ctimeMs!==stat.ctimeMs||current.nlink!==1){skipped.push({path:file,reason:'File changed during cleanup.'});continue;}
          await fs.unlink(file);summary.deleted_files++;summary.freed_bytes+=stat.size;
        }
        summary.files++;summary.bytes+=stat.size;
      }catch(error){skipped.push({path:file,reason:missing(error)?'File no longer exists.':'File could not be safely processed.'});}
    }
    result.files+=summary.files;result.bytes+=summary.bytes;result.deleted_files+=summary.deleted_files;result.freed_bytes+=summary.freed_bytes;
  }
  return result;
}

export function registerExportCleanupRoute(app:Express,run:(dryRun:boolean)=>Promise<unknown>){
  app.post('/api/maintenance/exports/cleanup',async(req,res)=>{
    const {dryRun}=z.object({dryRun:z.boolean().default(true)}).strict().parse(req.body);
    res.json(await run(dryRun));
  });
}
