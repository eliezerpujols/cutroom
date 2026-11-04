#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const codexHome=process.env.CODEX_HOME||path.join(os.homedir(),'.codex');
const check=process.argv.includes('--check');
const names=['cutroom','cutroom-studio'];
let failed=false;
for(const name of names){
 const source=path.join(root,'.agents','skills',name),destination=path.join(codexHome,'skills',name);
 await fs.access(path.join(source,'SKILL.md'));
 const linked=await fs.realpath(destination).catch(()=>null);
 if(linked===await fs.realpath(source)){console.log(`${name}: global skill linked to repository`);continue;}
 if(check){console.error(`${name}: global skill needs setup`);failed=true;continue;}
 await fs.mkdir(path.dirname(destination),{recursive:true});
 const exists=await fs.lstat(destination).catch(()=>null);
 let backup;
 if(exists){
  backup=path.join(codexHome,'skill-backups',`${name}-${Date.now()}`);
  await fs.mkdir(path.dirname(backup),{recursive:true});await fs.rename(destination,backup);
 }
 try{await fs.symlink(source,destination,'dir');}catch(error){if(backup)await fs.rename(backup,destination);throw error;}
 console.log(`${name}: global skill linked${backup?' (previous copy backed up)':''}`);
}
const args=['/bin/zsh',path.join(root,'Cutroom MCP.command')];
if(!check){const added=spawnSync('codex',['mcp','add','cutroom','--',...args],{encoding:'utf8'});if(added.status!==0)throw new Error(added.stderr||'Could not register the global Cutroom MCP.');}
const configured=spawnSync('codex',['mcp','get','cutroom','--json'],{encoding:'utf8'});
if(configured.status!==0){console.error('Cutroom MCP is not registered.');failed=true;}
else{
 const {enabled,transport,enabled_tools,disabled_tools}=JSON.parse(configured.stdout);
 const valid=enabled&&transport?.command===args[0]&&JSON.stringify(transport.args)===JSON.stringify(args.slice(1))&&!enabled_tools?.length&&!disabled_tools?.length;
 console.log(valid?'cutroom: global MCP points to this repository, all tools enabled':'cutroom: MCP configuration needs setup');failed||=!valid;
}
if(failed)process.exitCode=1;
