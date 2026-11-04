import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ensureFont,fontKey,googleFontCssUrl,parseFontCss} from '../server/fonts';
import {isKnownFont,projectFontFamilies} from '../src/fonts';
import {defaultCaptionStyle} from '../src/captions';
import {defaultCoverText} from '../src/visuals';
import {coverTextSchema} from '../server/schema';
import type {Project} from '../src/model';

test('Google families validate alongside bundled fonts, while CSS injection and arbitrary sources are rejected',()=>{
  for(const font of ['Inter Variable','Peacock','Playfair Display','Noto Sans JP'])assert.ok(isKnownFont(font));
  assert.equal(isKnownFont("Inter';src:url(https://example.com)"),false);
  assert.throws(()=>coverTextSchema.parse({...defaultCoverText,id:'test',fontFamily:'Unknown font'}));
  assert.throws(()=>parseFontCss('@font-face {src:url(https://example.com/font.ttf);}'));
  assert.throws(()=>googleFontCssUrl('Unknown font'));
});
test('font collection includes cover text, timed text, captions and individual cue overrides',()=>{
  const project={texts:[{fontFamily:'Lora'}],cover:{texts:[{fontFamily:'Lora'},{fontFamily:'Peacock'}]},captions:[{style:{...defaultCaptionStyle,fontFamily:'Inter Variable'},cues:[{style:{fontFamily:'Bebas Neue'}}]}]} as unknown as Project;
  assert.deepEqual(projectFontFamilies(project),['Bebas Neue','Inter Variable','Lora','Peacock']);
});
test('selected fonts travel with a project and reopen offline after the shared cache is removed',async()=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'cutroom-fonts-')),cache=path.join(folder,'cache'),project=path.join(folder,'project'),original=globalThis.fetch;
  let calls=0;globalThis.fetch=async(input)=>{calls++;return new Response(String(input).includes('googleapis')?"@font-face {font-family:'Lora';font-style:normal;font-weight:400;src:url(https://fonts.gstatic.com/s/lora/test.ttf) format('truetype');}":new Uint8Array([0,1,0,0]));};
  try{const manifest=await ensureFont(cache,'Lora',project);assert.equal(calls,2);assert.equal(manifest.faces.length,1);
    await fs.rm(cache,{recursive:true});globalThis.fetch=async()=>{throw new Error('Offline');};
    assert.deepEqual(await ensureFont(cache,'Lora',project),manifest);
    const moved=path.join(folder,'moved');await fs.rename(project,moved);assert.deepEqual(await ensureFont(cache,'Lora',moved),manifest);
    assert.ok((await fs.readFile(path.join(moved,'fonts',fontKey('Lora'),manifest.faces[0].file))).length);
    await assert.rejects(()=>ensureFont(cache,'Roboto',moved),/Offline/);
  }finally{globalThis.fetch=original;await fs.rm(folder,{recursive:true,force:true});}
});
