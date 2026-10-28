import path from 'node:path';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {documentSchema,storedAssetSchema,validateProject,ProjectConflict,type ProjectDocument,type StoredAsset} from './schema';
import type {Project,Asset} from '../src/model';
import {absoluteDirectory} from './paths';
import {arrangeTimelineTracks,changedTimelineClipIds} from '../src/videoTracks';

type Entry={id:string;folder:string;name:string};
type Registry={version:1;activeProjectId:string;legacyProjectId:string;entries:Entry[]};
export type ProjectSummary=Entry&{updatedAt:string;revision:number;available:boolean;missingCount:number;previewUrl:string|null;durationFrames:number};
export async function atomicJson(file:string,value:unknown){await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify(value,null,2));await fs.rename(temp,file);}
const exists=async(file:string)=>fs.access(file).then(()=>true,()=>false);
export function within(folder:string,relative:string){const result=path.resolve(folder,relative);if(path.isAbsolute(relative)||!result.startsWith(path.resolve(folder)+path.sep))throw new Error('Project media paths must stay inside their folder.');return result;}

export class ProjectStore{
  private registry!:Registry;
  private locks=new Map<string,Promise<unknown>>();
  private get registryFile(){return path.join(this.data,'projects.json');}
  constructor(readonly data:string,readonly managedRoot:string){}
  private async lock<T>(key:string,work:()=>Promise<T>):Promise<T>{const before=this.locks.get(key)||Promise.resolve();const next=before.catch(()=>{}).then(work);this.locks.set(key,next);try{return await next;}finally{if(this.locks.get(key)===next)this.locks.delete(key);}}
  async initialize(legacy?:{project:Project;assets:(Omit<Asset,'missing'>&{file:string})[]}){
    await fs.mkdir(this.managedRoot,{recursive:true});await fs.mkdir(this.data,{recursive:true});
    if(await exists(this.registryFile)){this.registry=JSON.parse(await fs.readFile(this.registryFile,'utf8'));await this.discover();return;}
    this.registry={version:1,activeProjectId:'',legacyProjectId:'',entries:[]};
    await this.discover();if(this.registry.entries.length)return;
    const doc=await this.create(legacy?.project.name||'Untitled project',undefined,legacy);
    this.registry.legacyProjectId=doc.id;this.registry.activeProjectId=doc.id;await atomicJson(this.registryFile,this.registry);
  }
  private async discover(){
    // Recover projects from the default library even after reinstalling the app.
    let changed=false;
    for(const item of await fs.readdir(this.managedRoot,{withFileTypes:true})){
      if(!item.isDirectory()||item.name.startsWith('.'))continue;
      const folder=path.join(this.managedRoot,item.name),file=path.join(folder,'project.cutroom');
      if(!await exists(file))continue;
      try{
        if((await fs.stat(file)).size>5*1024**2)continue;
        const d=documentSchema.parse(JSON.parse(await fs.readFile(file,'utf8')));validateProject(d.project,d.assets);
        for(const a of d.assets){within(folder,a.file);for(const t of a.thumbnails)within(folder,t);}
        const known=this.registry.entries.find(e=>e.id===d.id);
        if(known){if(!await exists(known.folder)){known.folder=folder;changed=true;}continue;}
        this.registry.entries.push({id:d.id,folder,name:d.project.name});changed=true;
      }catch{/* Leave unrelated or invalid folders untouched. */}
    }
    if(!this.registry.activeProjectId&&this.registry.entries[0]){this.registry.activeProjectId=this.registry.entries[0].id;changed=true;}
    if(!this.registry.legacyProjectId&&this.registry.entries[0]){this.registry.legacyProjectId=this.registry.entries[0].id;changed=true;}
    if(changed)await atomicJson(this.registryFile,this.registry);
  }
  async migrateManagedRoot(previousRoot:string){
    if(path.resolve(previousRoot)===path.resolve(this.managedRoot))return;
    for(const e of [...this.registry.entries]){
      if(path.dirname(path.resolve(e.folder))!==path.resolve(previousRoot)||!await exists(e.folder))continue;
      await this.lock(e.id,async()=>{
        const oldFolder=e.folder,target=path.join(this.managedRoot,path.basename(oldFolder));
        if(await exists(target))throw new Error('Cannot move project: its destination folder already exists. Open the intended project folder explicitly.');
        let copied=false;
        try{await fs.rename(oldFolder,target);}catch(error){if((error as NodeJS.ErrnoException).code!=='EXDEV')throw error;await fs.cp(oldFolder,target,{recursive:true,errorOnExist:true,force:false});copied=true;}
        try{await this.lock('registry',async()=>{e.folder=target;try{await atomicJson(this.registryFile,this.registry);}catch(error){e.folder=oldFolder;throw error;}});}
        catch(error){if(!copied)await fs.rename(target,oldFolder);throw error;}
        // On different disks keep the source as a fallback; the registry uses the new copy.
      });
    }
  }
  activeId(){return this.registry.activeProjectId;}
  legacyId(){return this.registry.legacyProjectId;}
  entry(id:string){const e=this.registry.entries.find(e=>e.id===id);if(!e)throw new Error('Project not found.');return e;}
  async read(id:string):Promise<ProjectDocument>{const e=this.entry(id);try{const d=documentSchema.parse(JSON.parse(await fs.readFile(path.join(e.folder,'project.cutroom'),'utf8')));if(d.id!==id)throw new Error('Project identity does not match its folder.');validateProject(d.project,d.assets);return d;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')throw new Error('The project folder could not be found. Open its .cutroom file from the new location.');throw error;}}
  async assetPath(id:string,relative:string){const folder=this.entry(id).folder;const file=within(folder,relative);if(await exists(file)){const real=await fs.realpath(file),realFolder=await fs.realpath(folder);if(!real.startsWith(realFolder+path.sep))throw new Error('Project media cannot point outside the project folder.');}return file;}
  async list():Promise<ProjectSummary[]>{return Promise.all(this.registry.entries.map(async e=>{try{const d=await this.read(e.id);let missingCount=0;for(const a of d.assets)if(!await exists(await this.assetPath(e.id,a.file)))missingCount++;const clip=d.project.clips.find(c=>c.kind==='video'),cover=d.assets.find(a=>a.id===clip?.assetId);return {...e,name:d.project.name,updatedAt:d.updatedAt,revision:d.revision,available:true,missingCount,previewUrl:cover?.thumbnails.length?`/api/projects/${e.id}/thumbs/${cover.id}/0`:null,durationFrames:Math.max(0,...d.project.clips.map(c=>c.start+c.duration))};}catch{return {...e,updatedAt:'',revision:0,available:false,missingCount:0,previewUrl:null,durationFrames:0};}}));}
  async workspace(id=this.activeId()){
    const d=await this.read(id),folder=this.entry(id).folder;
    const assets=await Promise.all(d.assets.map(async a=>{const {file,...rest}=a;return {...rest,url:`/api/projects/${id}/media/${a.id}`,extension:path.extname(file).slice(1),thumbnails:a.thumbnails.map((_,i)=>`/api/projects/${id}/thumbs/${a.id}/${i}`),missing:!await exists(await this.assetPath(id,file))};}));
    return {projectId:id,project:d.project,assets,revision:d.revision,folder,projectFile:path.join(folder,'project.cutroom'),exportsDir:path.join(folder,'exports'),missingAssets:assets.filter(a=>a.missing).map(a=>({id:a.id,name:a.name})),updatedAt:d.updatedAt};
  }
  async create(name:string,templateId?:string,legacy?:{project:Project;assets:(Omit<Asset,'missing'>&{file:string})[]},parentFolder?:string){
    name=name.trim();if(!name||name.length>100)throw new Error('Give the project a name of 1–100 characters.');
    const id=randomUUID(),slug=name.normalize('NFKD').replace(/[^a-zA-Z0-9 -]/g,'').trim().replace(/\s+/g,'-').slice(0,60)||'Project';
    const folder=path.join(parentFolder?absoluteDirectory(parentFolder):this.managedRoot,slug+'-'+id.slice(0,8));
    await fs.mkdir(path.join(folder,'media'),{recursive:true});await fs.mkdir(path.join(folder,'thumbs'),{recursive:true});await fs.mkdir(path.join(folder,'exports'),{recursive:true});
    let project:Project={version:1,name,width:1080,height:1920,fps:30,tracks:[{id:'video-1',name:'Video',kind:'video',muted:false},{id:'audio-1',name:'Audio',kind:'audio',muted:false}],clips:[]};
    let assets:StoredAsset[]=[];
    if(templateId){const source=await this.read(templateId);project={...source.project,name};assets=structuredClone(source.assets);for(const a of assets){const src=await this.assetPath(templateId,a.file);if(await exists(src)){await fs.mkdir(path.dirname(within(folder,a.file)),{recursive:true});await fs.copyFile(src,within(folder,a.file));}for(const thumb of a.thumbnails){const srcThumb=await this.assetPath(templateId,thumb);if(await exists(srcThumb)){await fs.mkdir(path.dirname(within(folder,thumb)),{recursive:true});await fs.copyFile(srcThumb,within(folder,thumb));}}}}
    else if(legacy){project={...legacy.project,name};for(const old of legacy.assets){const file=`media/${old.id}${path.extname(old.file)}`;const thumbnails:string[]=[];if(await exists(old.file))await fs.copyFile(old.file,within(folder,file));
      for(const oldUrl of old.thumbnails){const src=path.join(this.data,'thumbs',old.id,path.basename(oldUrl));if(await exists(src)){const relative=`thumbs/${old.id}/${path.basename(oldUrl)}`;await fs.mkdir(path.dirname(within(folder,relative)),{recursive:true});await fs.copyFile(src,within(folder,relative));thumbnails.push(relative);}}
      const {url:_,file:_file,thumbnails:_thumbs,...meta}=old;assets.push({...meta,file,thumbnails});
    }}
    const now=new Date().toISOString();const doc:ProjectDocument={format:'cutroom-project',version:1,id,createdAt:now,updatedAt:now,revision:0,project,assets};
    await atomicJson(path.join(folder,'project.cutroom'),doc);
    await this.lock('registry',async()=>{this.registry.entries.push({id,folder,name});if(!this.registry.activeProjectId)this.registry.activeProjectId=id;await atomicJson(this.registryFile,this.registry);});
    return doc;
  }
  async activate(id:string){const d=await this.read(id);const arranged=arrangeTimelineTracks(d.project);if(arranged!==d.project)await this.save(id,arranged,d.revision);await this.lock('registry',async()=>{this.registry.activeProjectId=id;await atomicJson(this.registryFile,this.registry);});}
  async resolve(project:string):Promise<string>{
    const direct=this.registry.entries.find(e=>e.id===project);if(direct)return direct.id;
    if(path.isAbsolute(project)||project.startsWith('~/'))return this.registerFile(absoluteDirectory(project));
    const matches=(await this.list()).filter(e=>e.name.toLocaleLowerCase()===project.toLocaleLowerCase());
    if(matches.length===1)return matches[0].id;if(matches.length>1)throw new Error('Several projects have that name. Choose a project ID from the project list.');throw new Error('Project not found. Choose a saved project or provide its .cutroom file path.');
  }
  async registerFile(input:string){
    const full=path.resolve(input),stat=await fs.stat(full);const manifest=stat.isDirectory()?path.join(full,'project.cutroom'):full;
    if(path.extname(manifest)!=='.cutroom')throw new Error('Choose a .cutroom project file or its folder.');
    if((await fs.stat(manifest)).size>5*1024**2)throw new Error('Project file is too large.');
    const doc=documentSchema.parse(JSON.parse(await fs.readFile(manifest,'utf8'))),folder=path.dirname(manifest);
    validateProject(doc.project,doc.assets);
    // Keep a canonical filename so the entire folder can be moved without rewriting paths.
    if(path.basename(manifest)!=='project.cutroom')throw new Error('This project folder must contain project.cutroom.');
    for(const a of doc.assets){within(folder,a.file);for(const thumb of a.thumbnails)within(folder,thumb);}
    const previous=this.registry.entries.find(e=>e.id===doc.id);
    if(previous&&path.resolve(previous.folder)!==folder&&await exists(previous.folder))throw new Error('This project ID is already open from another folder. Use Save a copy to duplicate it.');
    await this.lock('registry',async()=>{this.registry.entries=this.registry.entries.filter(e=>e.id!==doc.id);this.registry.entries.push({id:doc.id,folder,name:doc.project.name});await atomicJson(this.registryFile,this.registry);});return doc.id;
  }
  async save(id:string,input:unknown,expectedRevision?:number){return this.lock(id,async()=>{const d=await this.read(id);if(expectedRevision!==undefined&&d.revision!==expectedRevision)throw new ProjectConflict();const parsed=validateProject(input,d.assets);const project=validateProject(arrangeTimelineTracks(parsed,changedTimelineClipIds(d.project,parsed)),d.assets);
    const folder=this.entry(id).folder;await atomicJson(path.join(folder,'history',String(d.revision).padStart(6,'0')+'.json'),d.project);
    const next={...d,project,revision:d.revision+1,updatedAt:new Date().toISOString()};await atomicJson(path.join(folder,'project.cutroom'),next);return next;
  });}
  async addAsset(id:string,asset:StoredAsset){storedAssetSchema.parse(asset);return this.lock(id,async()=>{const d=await this.read(id);validateProject(d.project,[...d.assets.filter(a=>a.id!==asset.id),asset]);const next={...d,assets:[...d.assets.filter(a=>a.id!==asset.id),asset],updatedAt:new Date().toISOString()};await atomicJson(path.join(this.entry(id).folder,'project.cutroom'),next);return asset;});}
}
