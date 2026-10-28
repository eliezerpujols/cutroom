import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import './integrations';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const base='http://127.0.0.1:4317';
let starting:Promise<void>|undefined;
async function health(){try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1200)});if(!r.ok)throw new Error('Port 4317 is used by another service or an old Cutroom server. Restart Cutroom.');const data=await r.json();if(data.app!=='cutroom'||data.version!==2)throw new Error('The Cutroom server needs a restart.');return true;}catch(e){if(e instanceof TypeError||((e as Error).name==='TimeoutError'))return false;throw e;}}
export async function ensureServer(){
  if(await health())return;
  starting??=(async()=>{if(!fs.existsSync(path.join(root,'dist/index.html')))throw new Error('Build Cutroom first: npm run build.');fs.mkdirSync(path.join(root,'data'),{recursive:true});const log=fs.openSync(path.join(root,'data/server.log'),'a');const child=spawn(process.execPath,['--import',path.join(root,'node_modules/tsx/dist/loader.mjs'),path.join(root,'server/index.ts'),'--production'],{cwd:root,detached:true,stdio:['ignore',log,log]});fs.closeSync(log);child.unref();fs.writeFileSync(path.join(root,'data/runtime.json'),JSON.stringify({pid:child.pid,url:base},null,2));let launchError:Error|undefined;child.once('error',e=>launchError=e);for(let i=0;i<40;i++){if(launchError)throw launchError;if(await health())return;await new Promise(r=>setTimeout(r,250));}throw new Error('Cutroom did not start. See data/server.log.');})().finally(()=>{starting=undefined;});
  await starting;
}
export async function request(route:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<any>{await ensureServer();const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await r.json().catch(()=>({error:r.status===404?'This Cutroom server does not include the requested tool yet. Restart Cutroom to load the updated server.':r.statusText}));if(!r.ok)throw new Error(data.error||'Cutroom request failed.');return data;}
