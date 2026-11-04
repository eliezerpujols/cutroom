#!/usr/bin/env node
// Fresh connections avoid a long-running chat's cached tool catalog.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
export async function connectCutroom(){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const client=new Client({name:'cutroom-local-client',version:'1.0.0'});
 const transport=new StdioClientTransport({command:'/bin/zsh',args:[path.join(root,'Cutroom MCP.command')],cwd:os.tmpdir(),stderr:'pipe'});
 await client.connect(transport);return client;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const client=await connectCutroom();
 try{
  const name=process.argv[2];
  if(!name)throw new Error('Usage: node scripts/call-mcp.mjs list | TOOL_NAME < input.json');
  const output=name==='list'?await client.listTools():await client.callTool({name,arguments:JSON.parse(fs.readFileSync(0,'utf8')||'{}')});
  console.log(JSON.stringify(output));if(output.isError)process.exitCode=1;
 }finally{await client.close();}
}
