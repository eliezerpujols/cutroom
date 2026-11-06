import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StyleRange} from '../src/StyleControls';
import {defaultCover,defaultCoverText} from '../src/visuals';
import {defaultVideoText} from '../src/videoText';
import {defaultCaptionStyle} from '../src/captions';
import {coverTextSchema,captionStyleSchema} from '../server/schema';
import {ProjectStore} from '../server/projects';

test('font size has a numeric input without a maximum and an expanded slider range',()=>{
 const render=(unbounded:boolean,value:number|undefined)=>renderToStaticMarkup(createElement(StyleRange,{
  label:'Size',value,min:16,max:200,unit:' px',editable:true,unbounded,change:()=>{},checkpoint:()=>{},
 }));
 const html=render(true,1200),input=html.match(/<input[^>]*type="number"[^>]*>/)?.[0];
 assert.ok(input);assert.doesNotMatch(input,/\smax=/);assert.match(input,/value="1200"/);
 assert.match(html,/aria-valuemax="2400"/);
 assert.match(render(false,64),/\smax="200"/);
 const mixed=render(true,undefined);assert.match(mixed,/placeholder="Mixed"/);assert.match(mixed,/value=""/);
});

test('large text sizes persist independently for titles, cover text and caption overrides',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cutroom-font-size-'));
 try{
  const data=path.join(dir,'data'),projects=path.join(dir,'projects'),store=new ProjectStore(data,projects);await store.initialize();
  const id=store.activeId(),d=await store.read(id);
  const texts=[{...defaultVideoText,id:'title',text:'Title',fontSize:900}];
  const cover={...defaultCover,texts:[{...defaultCoverText,id:'cover',text:'Cover',fontSize:1200}]};
  const captions=[{id:'captions',name:'Captions',language:'es',muted:false,style:{...defaultCaptionStyle,fontSize:600},cues:[{id:'cue',start:0,duration:30,style:{fontSize:1800},words:[{text:'Hola',start:0,end:30}]}]}];
  await store.save(id,{...d.project,texts,cover,captions},d.revision);
  const reopened=new ProjectStore(data,projects);await reopened.initialize();const saved=await reopened.read(id);
  assert.deepEqual(saved.project.texts,texts);assert.deepEqual(saved.project.cover,cover);assert.deepEqual(saved.project.captions,captions);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('font size retains its minimum and rejects nonfinite values',()=>{
 for(const fontSize of [16,201,1000,10000]){
  assert.equal(coverTextSchema.parse({...defaultCoverText,id:'text',fontSize}).fontSize,fontSize);
  assert.equal(captionStyleSchema.parse({...defaultCaptionStyle,fontSize}).fontSize,fontSize);
 }
 for(const fontSize of [0,15.99,NaN,Infinity,-Infinity]){
  assert.equal(coverTextSchema.safeParse({...defaultCoverText,id:'text',fontSize}).success,false);
  assert.equal(captionStyleSchema.safeParse({...defaultCaptionStyle,fontSize}).success,false);
 }
});
