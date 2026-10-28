import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const projectName=process.argv[2];if(!projectName)throw new Error('Usage: node --import tsx scripts/verify-mcp.ts <existing-project-name>. Creates a separate verification copy and one-second export.');
const client=new Client({name:'cutroom-verification',version:'1.0.0'});
const transport=new StdioClientTransport({command:'/bin/zsh',args:[path.join(root,'Cutroom MCP.command')],cwd:root});
await client.connect(transport);
async function call(name:string,args:Record<string,unknown>){const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r));return JSON.parse((r.content as {text:string}[])[0].text);}
try{
 const tools=await client.listTools();assert.equal(tools.tools.length,9);
 const list=await call('list_projects',{}),source=list.projects.find((p:any)=>p.name===projectName);assert.ok(source);
 const original=await call('get_project',{project_id:source.id});
 const copy=await call('create_project',{name:'Cutroom MCP verification',copy_project_id:source.id});
 await fs.writeFile(path.join(root,'data/verification-project.json'),JSON.stringify({id:copy.projectId,folder:copy.folder,originalId:source.id}));
 assert.equal(copy.project.clips.length,original.project.clips.length);assert.ok(copy.assets.every((a:any)=>!a.missing));
 const c=copy.project.clips[0],edited=await call('edit_project',{project_id:copy.projectId,expected_revision:copy.revision,operations:[{action:'trim_end',clipId:c.id,value:-30}]});
 assert.equal(edited.project.clips[0].duration,c.duration-30);
 const stale=await client.callTool({name:'edit_project',arguments:{project_id:copy.projectId,expected_revision:copy.revision,operations:[{action:'move',clipId:c.id,value:15}]}});assert.equal(stale.isError,true);
 const unchanged=await call('get_project',{project_id:source.id});assert.deepEqual(unchanged.project,original.project);
 const job=await call('export_project',{project_id:copy.projectId,format:'mp4',range:{start:0,end:30}});await fs.writeFile(path.join(root,'data/verification-export.json'),JSON.stringify(job));
 console.log(JSON.stringify({tools:tools.tools.map(t=>t.name),copyId:copy.projectId,revision:edited.revision,clips:edited.project.clips.length,staleEditRejected:true,originalUnchanged:true,exportJob:job.id}));
}finally{await client.close();}
