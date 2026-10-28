import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEnvFile} from 'node:process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const environmentFile=path.join(root,'.env');
if(existsSync(environmentFile))loadEnvFile(environmentFile);

function limit(name:string,fallback:number){
  const value=process.env[name]?.trim();
  const parsed=value?Number(value):fallback;
  if(!Number.isFinite(parsed)||parsed<0)throw new Error(`${name} must be a finite nonnegative number in the local .env.`);
  return parsed;
}
export function integrationSettings(){
  return {
    elevenlabs_configured:!!process.env.ELEVENLABS_API_KEY?.trim(),
    sync_configured:!!process.env.SYNC_API_KEY?.trim(),
    max_elevenlabs_credits:limit('CUTROOM_MAX_ELEVENLABS_CREDITS',10000),
    max_sync_usd:limit('CUTROOM_MAX_SYNC_USD',3),
    elevenlabs_credits_per_minute:limit('CUTROOM_ELEVENLABS_CREDITS_PER_MINUTE',13500),
    model:'dubbing_v2',lip_sync_model:'sync-3',
    secrets_location:'Local ignored .env or inherited environment; keys are never returned by tools.',
    translation_modes:{automatic:'ElevenLabs translation preserving the original voice; no CEFR guarantee.',adapted:'Agent-written segment translations; ElevenLabs Enterprise is required.'},
  };
}
export function providerKey(provider:'elevenlabs'|'sync'){
  const variable=provider==='elevenlabs'?'ELEVENLABS_API_KEY':'SYNC_API_KEY';
  const key=process.env[variable]?.trim();
  if(!key)throw new Error(`${variable} is not configured in Cutroom's local .env.`);
  return key;
}
export function safeIntegrationError(error:unknown){
  let message=error instanceof Error?error.message:String(error);
  for(const name of ['ELEVENLABS_API_KEY','SYNC_API_KEY']){const secret=process.env[name]?.trim();if(secret)message=message.replaceAll(secret,'[redacted]');}
  return message.replace(/https?:\/\/\S+/g,'[provider URL]').slice(0,800);
}
