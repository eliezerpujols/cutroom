import express from 'express';
import multer from 'multer';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {bundle} from '@remotion/bundler';
import {ensureBrowser,selectComposition,renderMedia} from '@remotion/renderer';
import {z} from 'zod';
import {ProjectStore,atomicJson} from './projects';
import {projectSchema,validateProject} from './schema';
import {mediaEngine} from './media';
import {defaultProjectsDirectory} from './paths';
import {chooseProjectFile} from './projectPicker';
import {dubbingEngine} from './dubbing';
import {integrationSettings} from './integrations';
import {finalizeExportMetadata} from './exportMetadata';
import {splitClip,trimClip,slipClip,setClipRate,type Asset,type Project} from '../src/model';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),data=path.join(root,'data'),port=4317;
await fs.mkdir(path.join(data,'uploads'),{recursive:true});
const store=new ProjectStore(data,defaultProjectsDirectory());
let legacy:{project:Project;assets:(Asset&{file:string})[]}|undefined;
if(existsSync(path.join(data,'project.json'))&&existsSync(path.join(data,'library.json')))legacy={project:JSON.parse(await fs.readFile(path.join(data,'project.json'),'utf8')),assets:JSON.parse(await fs.readFile(path.join(data,'library.json'),'utf8'))};
await store.initialize(legacy);
await store.migrateManagedRoot(path.join(root,'projects'));
const media=mediaEngine(root,store);
const app=express();app.disable('x-powered-by');
app.use((req,res,next)=>{const host=req.headers.host?.split(':')[0];if(!host||!['127.0.0.1','localhost'].includes(host))return res.status(403).json({error:'Local connections only.'});const origin=req.headers.origin;if(origin&&!/^http:\/\/(127\.0\.0\.1|localhost):(5173|4317)$/.test(origin))return res.status(403).json({error:'Unrecognized origin.'});res.setHeader('X-Content-Type-Options','nosniff');next();});
app.use(express.json({limit:'5mb'}));
app.get('/api/health',(_req,res)=>res.json({app:'cutroom',version:2,capabilities:['dubbing','native-project-picker','multi-selection'],url:`http://127.0.0.1:${port}`}));
const projectId=(req:express.Request)=>String(req.query.projectId||req.body?.projectId||store.legacyId());

const clients=new Map<string,express.Response>();let focusedClient='';
function publish(event:Record<string,unknown>){const target=clients.get(focusedClient)||[...clients.values()].at(-1);if(!target)return false;target.write(`data: ${JSON.stringify(event)}\n\n`);return true;}
const dubbing=dubbingEngine(store,media,async(projectId,revision)=>{await store.activate(projectId);return publish({type:'open-project',projectId,revision});});
app.get('/api/integrations',(_req,res)=>res.json(integrationSettings()));
app.post('/api/dubbing/prepare',async(req,res)=>{const result=await dubbing.prepare(req.body);res.status(result.status==='prepared'?201:200).json(result);});
app.get('/api/dubbing/jobs',async(req,res)=>res.json(await dubbing.list(req.query.projectId?z.string().uuid().parse(req.query.projectId):undefined)));
app.get('/api/projects/:id/dubbing/:jobId',async(req,res)=>res.json(await dubbing.get(String(req.params.id),String(req.params.jobId))));
app.post('/api/projects/:id/dubbing/:jobId/start',async(req,res)=>res.status(202).json(await dubbing.start(String(req.params.id),String(req.params.jobId),req.body)));
app.get('/api/events',(req,res)=>{const id=String(req.query.clientId||randomUUID());res.setHeader('Content-Type','text/event-stream');res.setHeader('Cache-Control','no-cache');res.setHeader('Connection','keep-alive');res.flushHeaders();clients.set(id,res);focusedClient=id;res.write(': connected\n\n');const heartbeat=setInterval(()=>res.write(': heartbeat\n\n'),20000);req.on('close',()=>{clearInterval(heartbeat);clients.delete(id);});});
app.post('/api/focus',(req,res)=>{if(clients.has(req.body.clientId))focusedClient=req.body.clientId;res.json({ok:true});});
app.get('/api/projects',async(_req,res)=>res.json({projects:await store.list(),activeProjectId:store.activeId(),projectsRoot:store.managedRoot}));
app.post('/api/projects',async(req,res)=>{const {name,templateId,projectsDirectory}=z.object({name:z.string().min(1).max(100),templateId:z.string().uuid().optional(),projectsDirectory:z.string().trim().min(1).max(1500).optional()}).parse(req.body);const d=await store.create(name,templateId,undefined,projectsDirectory);res.status(201).json(await store.workspace(d.id));});
app.post('/api/projects/pick',async(_req,res)=>res.json({path:await chooseProjectFile(store.managedRoot)}));
app.post('/api/projects/open',async(req,res)=>{const body=z.object({project:z.string().min(1),broadcast:z.boolean().optional()}).parse(req.body);const id=await store.resolve(body.project);await store.activate(id);const workspace=await store.workspace(id);if(body.broadcast)publish({type:'open-project',projectId:id,revision:workspace.revision});res.json(workspace);});
app.get('/api/workspace',async(req,res)=>res.json(await store.workspace(req.query.projectId?String(req.query.projectId):store.activeId())));
app.put('/api/project',async(req,res)=>{const modern=req.body.projectId!==undefined;const id=modern?String(req.body.projectId):store.legacyId();const project=modern?req.body.project:req.body;const revision=modern?z.number().int().min(0).parse(req.body.expectedRevision):undefined;const saved=await store.save(id,project,revision);res.json({saved:true,revision:saved.revision,projectId:id});});

const mime=(file:string)=>({'.mp4':'video/mp4','.mov':'video/quicktime','.webm':'video/webm','.wav':'audio/wav','.flac':'audio/flac','.mp3':'audio/mpeg','.m4a':'audio/mp4','.aac':'audio/aac','.ogg':'audio/ogg'}[path.extname(file).toLowerCase()]||'application/octet-stream');
async function serveMedia(id:string,assetId:string,res:express.Response){const d=await store.read(id),a=d.assets.find(a=>a.id===assetId);if(!a)return res.status(404).json({error:'Media not found in this project.'});const file=await store.assetPath(id,a.file);if(!existsSync(file))return res.status(404).json({error:'Media file is missing. Relink it from Your media.'});res.type(mime(file));res.sendFile(file);}
app.get('/api/projects/:id/media/:assetId',async(req,res)=>serveMedia(String(req.params.id),String(req.params.assetId),res));
app.get('/api/media/:id',async(req,res)=>serveMedia(store.legacyId(),String(req.params.id),res));
app.get('/api/projects/:id/thumbs/:assetId/:index',async(req,res)=>{const id=String(req.params.id),d=await store.read(id),a=d.assets.find(a=>a.id===req.params.assetId),index=Number(req.params.index),relative=a?.thumbnails[index];if(!Number.isInteger(index)||!relative)return res.status(404).end();res.sendFile(await store.assetPath(id,relative));});
app.use('/api/thumbs',express.static(path.join(data,'thumbs')));
const upload=multer({storage:multer.diskStorage({destination:path.join(data,'uploads'),filename:(_req,file,cb)=>cb(null,randomUUID()+path.extname(file.originalname).slice(0,10))}),limits:{fileSize:2*1024**3,files:10}});
app.post('/api/import',upload.array('files',10),async(req,res)=>{const id=projectId(req),ids:string[]=[];for(const file of req.files as Express.Multer.File[]){try{ids.push((await media.importFile(id,file.path,file.originalname)).id);}finally{await fs.unlink(file.path).catch(()=>{});}}const w=await store.workspace(id);res.json({assets:w.assets.filter(a=>ids.includes(a.id)),revision:w.revision});});
app.post('/api/projects/:id/import-paths',async(req,res)=>{const id=String(req.params.id),body=z.object({paths:z.array(z.string().min(1)).min(1).max(20),append:z.boolean().optional()}).parse(req.body);const added=[];for(const file of body.paths){if(!path.isAbsolute(file))throw new Error('Provide absolute media paths.');added.push(await media.importFile(id,file));}
  if(body.append){const doc=await store.read(id),p=structuredClone(doc.project);if(!p.clips.length&&added[0].kind==='video'){p.width=added[0].width;p.height=added[0].height;}
    for(const a of added){let track=p.tracks.find(t=>t.kind===a.kind);if(!track){track={id:randomUUID(),name:a.kind==='video'?'Video':'Audio',kind:a.kind,muted:false};p.tracks.push(track);}const start=Math.max(0,...p.clips.filter(c=>c.trackId===track.id).map(c=>c.start+c.duration));p.clips.push({id:randomUUID(),assetId:a.id,name:a.name,kind:a.kind,trackId:track.id,start,duration:a.frames,sourceIn:0,rate:1,volume:1,muted:false,fadeIn:0,fadeOut:0});}await store.save(id,p,doc.revision);}
  res.json(await store.workspace(id));
});
app.post('/api/projects/:id/relink/:assetId',upload.single('file'),async(req,res)=>{if(!req.file)throw new Error('Choose a replacement file.');const id=String(req.params.id);try{await media.importFile(id,req.file.path,req.file.originalname,String(req.params.assetId));res.json(await store.workspace(id));}finally{await fs.unlink(req.file.path).catch(()=>{});}});
app.post('/api/extract',async(req,res)=>{const id=projectId(req),{assetId}=z.object({assetId:z.string()}).parse(req.body);const a=await media.extract(id,assetId);const w=await store.workspace(id);res.json({asset:w.assets.find(v=>v.id===a.id)});});

const operationSchema=z.object({action:z.enum(['trim_start','trim_end','move','slip','split','speed','volume','mute','fade_in','fade_out','remove']),clipId:z.string(),value:z.number().finite().optional()});
app.post('/api/projects/:id/edits',async(req,res)=>{const id=String(req.params.id),body=z.object({expectedRevision:z.number().int().min(0),operations:z.array(operationSchema).min(1).max(100),open:z.boolean().optional()}).parse(req.body);const d=await store.read(id);let p=structuredClone(d.project);
  for(const op of body.operations){const c=p.clips.find(c=>c.id===op.clipId),a=d.assets.find(a=>a.id===c?.assetId);if(!c||!a)throw new Error('Choose a clip ID from this project.');if(op.action==='remove'){p.clips=p.clips.filter(v=>v.id!==c.id);continue;}const n=op.value;if(n===undefined)throw new Error('This operation needs a numeric value. Timing values use frames at 30 fps.');let next=c;
    if(op.action==='split'){p.clips=p.clips.flatMap(v=>v.id===c.id?splitClip(c,Math.round(n),randomUUID()):[v]);continue;}
    const asset={...a,url:'',thumbnails:[],missing:false};
    if(op.action==='trim_start')next=trimClip(c,n,'left',asset);if(op.action==='trim_end')next=trimClip(c,n,'right',asset);if(op.action==='slip')next=slipClip(c,n,asset);if(op.action==='move')next={...c,start:Math.max(0,Math.round(n))};
    if(op.action==='speed'){if(n<.25||n>4)throw new Error('Speed must be between .25 and 4.');next=setClipRate(c,n,asset);}if(op.action==='volume')next={...c,volume:n};if(op.action==='mute')next={...c,muted:!!n};if(op.action==='fade_in')next={...c,fadeIn:Math.max(0,Math.round(n))};if(op.action==='fade_out')next={...c,fadeOut:Math.max(0,Math.round(n))};p.clips=p.clips.map(v=>v.id===c.id?next:v);
  }await store.save(id,p,body.expectedRevision);const w=await store.workspace(id);if(body.open){await store.activate(id);publish({type:'open-project',projectId:id,revision:w.revision});}res.json(w);
});

type Job={id:string;projectId:string;status:'queued'|'rendering'|'finalizing'|'completed'|'failed';progress:number;url?:string;error?:string;filename?:string;metadata_policy?:string;cleanup_reencoded_media?:boolean};
const jobs=new Map<string,Job>();let bundlePromise:Promise<string>|undefined,busy=false;
app.post('/api/export',async(req,res)=>{
  if(busy)return res.status(409).json({error:'An export is already running. Let it finish first.'});
  const body=z.object({projectId:z.string().optional(),project:projectSchema.optional(),format:z.enum(['mp4','wav','mp3']),selection:z.object({start:z.number().int().min(0),end:z.number().int().min(1)}).optional()}).parse(req.body),pid=body.projectId||store.legacyId();
  const document=await store.read(pid),workspace=await store.workspace(pid),project=validateProject(body.project||document.project,document.assets),duration=Math.max(1,...project.clips.map(c=>c.start+c.duration));
  if(!project.clips.length)throw new Error('Add a clip before exporting.');if(workspace.assets.some(a=>a.missing&&project.clips.some(c=>c.assetId===a.id)))throw new Error('Relink the missing media before exporting.');const range=body.selection;if(range&&(range.end<=range.start||range.end>duration))throw new Error('Choose a valid export range.');
  const id=randomUUID(),job:Job={id,projectId:pid,status:'queued',progress:0};jobs.set(id,job);busy=true;res.status(202).json(job);
  (async()=>{try{const inputs={project,assets:workspace.assets.map(a=>({...a,url:`http://127.0.0.1:${port}${a.url}`}))};await ensureBrowser();bundlePromise??=bundle({entryPoint:path.join(root,'src/remotion/index.tsx')}).catch(e=>{bundlePromise=undefined;throw e;});const serveUrl=await bundlePromise,composition=await selectComposition({serveUrl,id:'Cutroom',inputProps:inputs});job.status='rendering';
    const filename=project.name.replace(/[^a-zA-Z0-9 _-]/g,'').trim().replace(/\s+/g,'-')+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+body.format,output=path.join(workspace.exportsDir,filename);await fs.mkdir(workspace.exportsDir,{recursive:true});
    await renderMedia({composition,serveUrl,inputProps:inputs,codec:body.format==='mp4'?'h264':body.format,outputLocation:output,...(range?{frameRange:[range.start,range.end-1] as [number,number]}:{}),concurrency:2,onProgress:({progress})=>job.progress=progress*.97,...(body.format==='mp4'?{crf:18,pixelFormat:'yuv420p' as const}:{})});
    job.status='finalizing';job.progress=.98;Object.assign(job,await finalizeExportMetadata(output,media.run));
    job.status='completed';job.progress=1;job.filename=filename;job.url=`/api/projects/${pid}/exports/${encodeURIComponent(filename)}`;await atomicJson(path.join(workspace.exportsDir,id+'.export.json'),job);
  }catch(e){job.status='failed';job.error=(e as Error).message;}finally{busy=false;}})();
});
app.get('/api/export/:id',(req,res)=>{const j=jobs.get(String(req.params.id));j?res.json(j):res.status(404).json({error:'Export not found. It may have ended when the server restarted.'});});
app.get('/api/projects/:id/exports/:filename',(req,res)=>res.download(path.join(store.entry(String(req.params.id)).folder,'exports',path.basename(String(req.params.filename)))));
app.get('/api/exports/:filename',(_req,res)=>res.status(410).json({error:'Exports now live inside each project folder.'}));
if(process.argv.includes('--production')){app.use(express.static(path.join(root,'dist')));app.get('/{*path}',(_req,res)=>res.sendFile(path.join(root,'dist/index.html')));}
app.use((error:Error&{status?:number},_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(error.message);res.status(error.status||400).json({error:error instanceof z.ZodError?'The project contains invalid values.':error.message});});
app.listen(port,'127.0.0.1',()=>console.log(`Cutroom: http://127.0.0.1:${port}`));
