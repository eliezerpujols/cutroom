import assert from 'node:assert/strict';
import {connectCutroom} from './call-mcp.mjs';
const client=await connectCutroom();
const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));return JSON.parse(r.content[0].text);};
try{
 const {tools}=await client.listTools();
 for(const name of ['list_cover_elements','set_cover_element','set_cover','list_studio','set_studio_element','list_fonts','prepare_font','list_effects','set_effects','set_media_transform','start_local_vision','local_vision_status','cancel_local_vision','apply_local_vision','giphy_status','open_giphy','import_giphy','add_giphy_media'])assert.ok(tools.some(t=>t.name===name),name);
 const overlayWidth=tools.find(t=>t.name==='set_clip_overlay')?.inputSchema.properties.placement.properties.width;
 assert.equal(overlayWidth?.minimum,2);assert.equal(overlayWidth?.maximum,undefined);
 const studio=await call('list_studio');assert.ok(studio.templates.some(t=>t.id==='orbit-card'));
 const fonts=await call('list_fonts',{query:'Lora',category:'Serif',limit:10});assert.ok(fonts.fonts.some(f=>f.family==='Lora'));assert.ok(fonts.fonts.every(f=>f.category==='Serif'));
 const fx=await call('list_effects',{target_kind:'caption'});assert.ok(fx.animation.some(f=>f.id==='text-wave'));
 console.log(`Fresh global launcher from outside the repo: ${client.getServerVersion().version}, ${tools.length} tools; Cover, Studio, fonts, effects, camera and GIPHY tool discovery passed.`);
 if(process.argv.includes('--write-smoke')){
  // Copy only the explicitly named QA fixture, never the user's working project.
  const index=process.argv.indexOf('--fixture-project');const fixture=process.argv[index+1];
  assert.ok(index>=0&&/^[a-f0-9-]{36}$/.test(fixture??''),'Pass --fixture-project QA_PROJECT_ID');
  let w=await call('create_project',{name:'MCP global verification',copy_project_id:fixture});const id=w.projectId;
  const read=async()=>w=await call('get_project',{project_id:id});
  await read();const inserted=await call('set_studio_element',{project_id:id,expected_revision:w.revision,template:'orbit-card',start:120,props:{title:'Global Studio',turnSeconds:1.2}});const clipId=inserted.clipId;
  await read();await call('set_studio_element',{project_id:id,expected_revision:w.revision,clip_id:clipId,props:{subtitle:'Reusable everywhere'}});
  await read();assert.equal(w.project.clips.find(c=>c.id===clipId).studio.props.title,'Global Studio');
  await call('set_clip_overlay',{project_id:id,expected_revision:w.revision,clip_id:clipId,placement:{x:25,y:30,width:50}});
  await read();await call('add_text',{project_id:id,expected_revision:w.revision,text:'Global title',style:{shadow:{drop:{enabled:true,blur:4},inner:{enabled:true,opacity:25}}}});
  await read();const title=w.project.texts.find(t=>t.text==='Global title');const cue=w.project.captions?.[0]?.cues[0];assert.ok(cue,'QA fixture needs a caption');
  const targets=[{kind:'clip',id:clipId},{kind:'text',id:title.id},{kind:'caption',id:cue.id}];
  const before=w.revision;
  await call('set_effects',{project_id:id,expected_revision:before,targets,effects:{motion:'pulse',motionTiming:{rise:6,hold:12,return:9},blur:2}});
  await read();assert.equal(w.revision,before+1);assert.equal(w.project.clips.find(c=>c.id===clipId).effects.motionFrames,27);assert.equal(w.project.captions[0].cues[0].effects.blur,2);
  const stale=await client.callTool({name:'set_effects',arguments:{project_id:id,expected_revision:before,targets,effects:{blur:3}}});assert.equal(stale.isError,true);
  const after=w.revision;const invalid=await client.callTool({name:'set_effects',arguments:{project_id:id,expected_revision:after,targets:[...targets,{kind:'clip',id:'missing'}],effects:{blur:3}}});assert.equal(invalid.isError,true);
  await read();assert.equal(w.revision,after);assert.equal(w.project.texts.find(t=>t.id===title.id).shadow.inner.enabled,true);
  const prepared=await call('prepare_font',{project_id:id,family:'Inter Variable'});assert.equal(prepared.family,'Inter Variable');
  console.log(JSON.stringify({project_id:id,revision:w.revision,checks:['Studio insert/update','overlay placement','simultaneous shadows','mixed media/text/caption effects','stale revision rejection','atomic invalid target rejection','bundled font preparation'],folder:w.folder}));
 }
}finally{await client.close();}
