import {openAsBlob,createReadStream,createWriteStream} from 'node:fs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {z} from 'zod';
import {integrationSettings,providerKey} from './integrations';

export type Provider='elevenlabs'|'sync';
const bases={elevenlabs:'https://api.elevenlabs.io/v1',sync:'https://api.sync.so/v2'};
export async function providerRequest(provider:Provider,method:string,route:string,body?:FormData|Record<string,unknown>,idempotencyKey?:string):Promise<unknown>{
  const headers:Record<string,string>={[provider==='elevenlabs'?'xi-api-key':'x-api-key']:providerKey(provider)};
  if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';
  if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
  const response=await fetch(bases[provider]+route,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(180000)});
  const data:unknown=await response.json().catch(()=>null);
  if(!response.ok){
    const parsed=z.object({errorCode:z.string().optional(),detail:z.object({status:z.string().optional()}).optional()}).safeParse(data);
    const code=parsed.success?(parsed.data.errorCode||parsed.data.detail?.status||''):'';
    const label=/^[A-Za-z0-9_-]{1,100}$/.test(code)?` (${code})`:'';
    throw new Error(`${provider==='elevenlabs'?'ElevenLabs':'Sync'} HTTP ${response.status}${label}. Check provider access and the saved job before resubmitting.`);
  }
  return data;
}
export async function filePart(file:string,type:string){return openAsBlob(file,{type});}
export async function fileDigest(file:string){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export async function downloadOutput(url:string,destination:string){
  const parsed=new URL(url);if(parsed.protocol!=='https:')throw new Error('The provider returned an unsupported download URL.');
  // Signed download URLs must never receive a provider authentication header.
  const response=await fetch(parsed,{signal:AbortSignal.timeout(180000)});
  if(!response.ok||!response.body)throw new Error(`Provider download failed (HTTP ${response.status}). Resume the existing job to refresh its URL.`);
  const maximum=2*1024**3;let size=0;
  if(Number(response.headers.get('content-length'))>maximum)throw new Error('The generated file exceeds the 2 GB local media limit.');
  const part=destination+'.part';
  try{
    await pipeline(Readable.fromWeb(response.body as import('node:stream/web').ReadableStream<Uint8Array>),new Transform({transform(chunk:Buffer,_encoding,callback){size+=chunk.length;callback(size>maximum?new Error('The generated file exceeds 2 GB.'):null,chunk);}}),createWriteStream(part,{mode:0o600}));
    if(!size)throw new Error('The provider returned an empty file.');
    await fs.rename(part,destination);
  }catch(error){await fs.unlink(part).catch(()=>{});throw error;}
}

export const elevenProject=z.object({project_id:z.string(),status:z.string(),reference:z.string().nullable().optional(),language_ids:z.array(z.string()).default([])});
export const elevenLanguage=z.object({language_id:z.string(),status:z.string(),target_language:z.string().optional(),outputs:z.object({lossless_audio:z.string().nullable().optional(),subtitles:z.string().nullable().optional()}).nullable().optional()});
export const transcript=z.object({language:z.string().nullable().optional(),revision:z.number(),segments:z.array(z.object({id:z.string(),external_id:z.string().nullable().optional(),text:z.string(),speaker_id:z.string(),start_s:z.number(),end_s:z.number()}))});
const subscription=z.object({tier:z.string(),character_count:z.number().finite().nonnegative(),character_limit:z.number().finite().nonnegative()});
const billing=z.object({plan:z.string().nullable(),hasPaymentFailure:z.boolean().optional(),paymentFailureCountExceededLimit:z.boolean().optional(),credits:z.object({available:z.number().finite()}).nullable().optional()});
const syncEstimate=z.object({estimatedGenerationCost:z.number().finite().nonnegative(),estimatedCredits:z.number().finite().nonnegative().nullable().optional(),durationCheck:z.object({allowed:z.boolean(),limit:z.number().optional()}).optional()});
export const syncGeneration=z.object({id:z.string(),status:z.string(),outputUrl:z.string().nullable().optional(),errorCode:z.string().nullable().optional()});
export type DubbingQuote={estimated_elevenlabs_credits:number;reserved_elevenlabs_credits:number;max_elevenlabs_credits:number;estimated_sync_usd:number;estimated_sync_credits:number|null;max_sync_usd:number;elevenlabs_plan:string;sync_plan:string|null;elevenlabs_credits_available:number;elevenlabs_account_used:number;sync_duration_allowed:boolean;blockers:string[];quoted_at:string;credit_estimate_basis:string};
export async function quoteDubbing(duration:number,lipSync:boolean,watermarkFree:boolean,adapted:boolean,budgets?:{eleven:number;sync:number},elevenAlreadySubmitted=false):Promise<DubbingQuote>{
  const config=integrationSettings();
  const [account,sync]=await Promise.all([
    providerRequest('elevenlabs','GET','/user/subscription').then(data=>subscription.parse(data)),
    lipSync?Promise.all([providerRequest('sync','GET','/billing').then(data=>billing.parse(data)),providerRequest('sync','POST','/generations/estimate',{model:'sync-3',duration,fps:30}).then(data=>syncEstimate.parse(data))]):Promise.resolve(null),
  ]);
  const rate=config.elevenlabs_credits_per_minute;if(rate<=0)throw new Error('Configure a positive ElevenLabs credit rate before generation.');
  const reserved=Math.ceil(Math.ceil(duration)*rate/60)+500;
  const maxEleven=Math.min(config.max_elevenlabs_credits,budgets?.eleven??Infinity),maxSync=Math.min(config.max_sync_usd,budgets?.sync??Infinity);
  const available=Math.max(0,account.character_limit-account.character_count),cost=sync?.[1].estimatedGenerationCost??0;
  const blockers:string[]=[];
  if(!elevenAlreadySubmitted&&reserved>maxEleven)blockers.push(`ElevenLabs reserve ${reserved} exceeds the authorized ${maxEleven} credits. Obtain approval before increasing the local budget.`);
  if(!elevenAlreadySubmitted&&reserved>available)blockers.push('Insufficient included ElevenLabs credits; purchasing credits or using overage is not authorized.');
  if(watermarkFree&&account.tier.toLowerCase()==='free')blockers.push('Watermark-free dubbing requires a paid ElevenLabs plan.');
  if(adapted&&!account.tier.toLowerCase().includes('enterprise'))blockers.push('Exact adapted/B2 text requires ElevenLabs Enterprise. Automatic dubbing cannot enforce a B2 script; do not silently substitute it.');
  if(sync){
    const [plan,estimate]=sync;
    if(cost>maxSync)blockers.push(`Sync quote $${cost.toFixed(2)} exceeds the authorized $${maxSync.toFixed(2)} limit. Sync charges are separate from ElevenLabs credits.`);
    if(estimate.durationCheck?.allowed!==true)blockers.push('Sync has not confirmed that the full requested duration is allowed. Do not silently shorten or split the video.');
    if(plan.hasPaymentFailure||plan.paymentFailureCountExceededLimit)blockers.push('Sync reports a payment issue.');
    if(watermarkFree&&!['creator','growth','scale','enterprise'].includes(plan.plan||''))blockers.push('A verified Creator, Growth, Scale or Enterprise Sync plan is required for watermark-free output.');
    if(plan.credits&&typeof estimate.estimatedCredits==='number'&&estimate.estimatedCredits>plan.credits.available)blockers.push('Insufficient Sync credits. No top-up or plan change is authorized.');
  }
  return {estimated_elevenlabs_credits:Math.ceil(duration*rate/60),reserved_elevenlabs_credits:reserved,max_elevenlabs_credits:maxEleven,estimated_sync_usd:cost,estimated_sync_credits:sync?.[1].estimatedCredits??null,max_sync_usd:maxSync,elevenlabs_plan:account.tier,sync_plan:sync?.[0].plan??null,elevenlabs_credits_available:available,elevenlabs_account_used:account.character_count,sync_duration_allowed:sync?.[1].durationCheck?.allowed??!lipSync,blockers,quoted_at:new Date().toISOString(),credit_estimate_basis:`Conservative local estimate at ${rate} credits/minute plus 500-credit reserve; not a provider-guaranteed credit quote.`};
}
