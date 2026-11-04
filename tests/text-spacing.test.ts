import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ProjectStore} from '../server/projects';
import {coverTextSchema} from '../server/schema';
import {defaultCoverText,textLineHeight} from '../src/visuals';
import {defaultVideoText} from '../src/videoText';

test('legacy titles retain their text-only and highlight line heights without migration',()=>{
  const legacy=coverTextSchema.parse({...defaultCoverText,id:'legacy'});
  assert.equal(legacy.lineHeight,undefined);
  assert.equal(legacy.letterSpacing,undefined);
  assert.equal(textLineHeight({...legacy,fill:'none'}),1.2);
  assert.equal(textLineHeight({...legacy,fill:'lines'}),1.55);
  assert.equal(textLineHeight({...legacy,fill:'lines',lineHeight:1}),1);
});

test('cover and timed text spacing survive save and reopen without changing copy or timing',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cutroom-spacing-'));
  try{
    const data=path.join(dir,'data'),projects=path.join(dir,'projects');
    const store=new ProjectStore(data,projects);await store.initialize();
    const id=store.activeId(),document=await store.read(id);
    const cover={frame:0,showCaptions:false,texts:[{...defaultCoverText,id:'cover',text:'5 ideas\npara monetizar',lineHeight:1.05,letterSpacing:.03}]};
    const texts=[{...defaultVideoText,id:'title',text:'Texto en pantalla',start:30,duration:90,lineHeight:1.4,letterSpacing:-.05}];
    await store.save(id,{...document.project,cover,texts},document.revision);
    const reopened=new ProjectStore(data,projects);await reopened.initialize();
    const saved=await reopened.read(id);
    assert.deepEqual(saved.project.cover,cover);assert.deepEqual(saved.project.texts,texts);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('saved typography rejects non-finite and unsupported spacing',()=>{
  for(const invalid of [{lineHeight:0},{lineHeight:Infinity},{letterSpacing:NaN},{letterSpacing:1}]){
    assert.equal(coverTextSchema.safeParse({...defaultCoverText,id:'title',...invalid}).success,false);
  }
});
