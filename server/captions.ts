import path from 'node:path';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {FPS,type Project} from '../src/model';
import {captionSourceSignature,captionsFromWords,defaultCaptionStyle,type CaptionLayer} from '../src/captions';
import {atomicJson,type ProjectStore} from './projects';
import {captionLayerSchema,validateProject,type StoredAsset} from './schema';
import {filePart,providerRequest} from './dubbingProviders';
import {integrationSettings,safeIntegrationError} from './integrations';
import type {mediaEngine} from './media';

type CaptionJob={id:string;projectId:string;status:'mixing'|'transcribing'|'completed'|'failed';createdAt:string;sourceSignature:string;estimatedCredits:number;reservedCredits:number;submitted:boolean;layer?:CaptionLayer;error?:string};
const transcriptSchema=z.object({language_code:z.string().default('auto'),words:z.array(z.object({text:z.string(),start:z.number().finite().nonnegative(),end:z.number().finite().nonnegative(),type:z.string()}))});
const accountSchema=z.object({character_count:z.number().finite().nonnegative(),character_limit:z.number().finite().nonnegative()});
const activeClips=(project:Project,assets:StoredAsset[])=>project.clips.filter(clip=>!clip.muted&&clip.volume>0&&!project.tracks.find(track=>track.id===clip.trackId)?.muted&&assets.find(asset=>asset.id===clip.assetId)?.hasAudio);
export function captionEstimate(project:Project,assets:StoredAsset[]){
  const clips=activeClips(project,assets),frames=Math.max(0,...clips.map(clip=>clip.start+clip.duration));
  const config=integrationSettings(),rate=config.scribe_credits_per_minute;
  if(rate<=0)throw new Error('Configure a positive speech-to-text credit estimate.');
  const estimatedCredits=Math.ceil(Math.max(.1,frames/FPS)/60*rate),reservedCredits=Math.ceil(estimatedCredits*1.5)+100;
  return {frames,seconds:frames/FPS,estimatedCredits,reservedCredits,maxCredits:Math.min(10000,config.max_elevenlabs_credits),configured:config.elevenlabs_configured,hasAudio:clips.length>0,model:'scribe_v2',estimateOnly:true};
}

export function captionEngine(store:ProjectStore,media:ReturnType<typeof mediaEngine>){
  const running=new Set<string>();
  const jobFile=(projectId:string,id:string)=>path.join(store.entry(projectId).folder,'captions',z.string().uuid().parse(id)+'.job.json');
  async function estimate(projectId:string,input?:unknown){const document=await store.read(projectId),project=input===undefined?document.project:validateProject(input,document.assets);return captionEstimate(project,document.assets);}
  async function get(projectId:string,id:string){const job=JSON.parse(await fs.readFile(jobFile(projectId,id),'utf8')) as CaptionJob;return {...job,running:running.has(id),...(!running.has(id)&&['mixing','transcribing'].includes(job.status)?{status:'failed',error:job.submitted?'Transcription was interrupted after submission and may have been charged. Review this saved job before starting another.':'Audio preparation was interrupted. No transcription was submitted.'}:{})};}
  async function list(projectId:string){let files:string[];try{files=await fs.readdir(path.join(store.entry(projectId).folder,'captions'));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}return (await Promise.all(files.filter(file=>file.endsWith('.job.json')).map(async file=>{try{const {layer,sourceSignature,...job}=await get(projectId,file.replace('.job.json',''));return job;}catch{return null;}}))).filter(job=>job!==null);}
  async function start(projectId:string,input:unknown,language?:string,requestId?:string){
    const id=requestId?z.string().uuid().parse(requestId):randomUUID();
    if(requestId){try{return await get(projectId,id);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
    if(running.size)throw new Error('A transcription is already running. Wait for it to finish.');
    const document=await store.read(projectId),project=validateProject(input??document.project,document.assets),quote=captionEstimate(project,document.assets);
    if((project.captions?.length||0)>=4)throw new Error('This project already has four caption layers. Remove an unused layer first.');
    if(!quote.hasAudio)throw new Error('There is no audible audio on the timeline. Unmute a clip or track first.');
    if(!quote.configured)throw new Error('ELEVENLABS_API_KEY is not configured in the local environment.');
    if(quote.reservedCredits>quote.maxCredits)throw new Error(`Transcription reserves ${quote.reservedCredits} credits, above the ${quote.maxCredits}-credit limit. Ask before increasing the authorized budget.`);
    if(running.size)throw new Error('A transcription is already running. Wait for it to finish.');
    running.add(id);
    try{
      const job:CaptionJob={id,projectId,status:'mixing',createdAt:new Date().toISOString(),sourceSignature:captionSourceSignature(project),estimatedCredits:quote.estimatedCredits,reservedCredits:quote.reservedCredits,submitted:false};
      await atomicJson(jobFile(projectId,id),job);
      void processJob(job,project,document.assets,language).finally(()=>running.delete(id));
      return {...job,running:true};
    }catch(error){running.delete(id);throw new Error(safeIntegrationError(error));}
  }
  async function processJob(job:CaptionJob,project:Project,assets:StoredAsset[],language?:string){
    const folder=path.dirname(jobFile(job.projectId,job.id)),audio=path.join(folder,job.id+'.flac');
    const persist=()=>atomicJson(jobFile(job.projectId,job.id),job);
    try{
      const account=accountSchema.parse(await providerRequest('elevenlabs','GET','/user/subscription'));
      if(job.reservedCredits>account.character_limit-account.character_count)throw new Error('Insufficient included ElevenLabs credits. No purchase or overage was authorized.');
      const clips=activeClips(project,assets),args:string[]=['-y','-v','error'],filters:string[]=[],labels:string[]=[];
      const unique=[...new Set(clips.map(clip=>clip.assetId))],inputs=new Map(unique.map((id,index)=>[id,index]));
      for(const id of unique){const asset=assets.find(asset=>asset.id===id)!;args.push('-i',await store.assetPath(job.projectId,asset.file));}
      for(const id of unique){const copies=clips.flatMap((clip,index)=>clip.assetId===id?[`[caption_source_${index}]`]:[]);filters.push(`[${inputs.get(id)}:a]asplit=${copies.length}${copies.join('')}`);}
      for(let index=0;index<clips.length;index++){
        const clip=clips[index],duration=clip.duration/FPS,tempo:string[]=[];let rate=clip.rate;
        while(rate<.5){tempo.push('atempo=0.5');rate/=.5;}while(rate>2){tempo.push('atempo=2');rate/=2;}tempo.push(`atempo=${rate}`);
        const fadeIn=clip.fadeIn?`min(max(t/${clip.fadeIn/FPS},0),1)`:'1';
        const fadeOut=clip.fadeOut?`min(max((${Math.max(0,clip.duration-1)/FPS}-t)/${clip.fadeOut/FPS},0),1)`:'1';
        const gain=`if(isnan(t),0,${clip.volume}*min(${fadeIn},${fadeOut}))`;
        const label=`caption_audio_${index}`;labels.push(`[${label}]`);
        filters.push(`[caption_source_${index}]atrim=start=${clip.sourceIn/FPS}:end=${(clip.sourceIn+clip.duration*clip.rate)/FPS},asetpts=PTS-STARTPTS,${tempo.join(',')},aresample=16000,aformat=channel_layouts=mono,apad=pad_dur=${duration},atrim=duration=${duration},asetpts=PTS-STARTPTS,volume='${gain}':eval=frame,adelay=${Math.round(clip.start/FPS*16000)}S:all=1[${label}]`);
      }
      filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad,atrim=duration=${captionEstimate(project,assets).seconds}[caption_mix]`);
      const script=path.join(folder,job.id+'.filter');await fs.writeFile(script,filters.join(';\n'),{mode:0o600});
      await media.run([...args,'-filter_complex_script',script,'-map','[caption_mix]','-ac','1','-ar','16000','-c:a','flac',audio]);
      const form=new FormData();form.append('file',await filePart(audio,'audio/flac'),'timeline.flac');form.append('model_id','scribe_v2');form.append('timestamps_granularity','word');form.append('tag_audio_events','false');form.append('diarize','false');if(language&&language!=='auto')form.append('language_code',language);
      job.status='transcribing';job.submitted=true;await persist();
      // Never automatically retry a paid submission after a timeout or restart.
      const raw=await providerRequest('elevenlabs','POST','/speech-to-text',form);
      await atomicJson(path.join(folder,job.id+'.transcript.json'),raw);
      const transcript=transcriptSchema.parse(raw),maximum=captionEstimate(project,assets).frames;
      const words=transcript.words.filter(word=>word.type==='word'&&word.text.trim()&&word.end>word.start).map(word=>{const start=Math.max(0,Math.round(word.start*FPS));return {text:word.text.trim(),start,end:Math.min(maximum,Math.max(start+1,Math.round(word.end*FPS)))};}).filter(word=>word.start<maximum&&word.end>word.start).sort((a,b)=>a.start-b.start);
      if(!words.length)throw new Error('ElevenLabs returned no speech. The transcription response is saved in the project captions folder.');
      job.layer=captionLayerSchema.parse({id:randomUUID(),name:project.captions?.length?`Captions ${project.captions.length+1}`:'Captions',language:transcript.language_code,muted:false,style:defaultCaptionStyle,sourceJobId:job.id,sourceSignature:job.sourceSignature,cues:captionsFromWords(words)});
      job.status='completed';await persist();
    }catch(error){job.status='failed';job.error=safeIntegrationError(error);await persist().catch(()=>{});}
    finally{await fs.unlink(audio).catch(()=>{});await fs.unlink(path.join(folder,job.id+'.filter')).catch(()=>{});}
  }
  return {estimate,start,get,list,isBusy:()=>running.size>0};
}
