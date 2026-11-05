import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StudioElement} from '../src/studio/StudioElement';
import {studioDefaults, studioTemplates} from '../src/studio/registry';
import {readFileSync} from 'node:fs';
import {cardArtUrl} from '../src/studio/creatorCards';

test('all Studio library previews render outside the Remotion player', () => {
  for (const template of studioTemplates) {
    const html = renderToStaticMarkup(createElement(StudioElement, {
      instance: {template: template.id, props: studioDefaults(template.id)},
      frame: template.duration - 1,
      libraryPreview: true,
    }));
    assert.ok(html.length > 0, template.id);
  }
});

test('English creator cards retain the same layouts and localize artwork and the editable price button',()=>{
 for(const template of ['lesson-player','social-post','price-editor']){
  assert.equal(cardArtUrl(template),`/studio/${template}.svg`);
  assert.equal(cardArtUrl(template,'en-US'),`/studio/${template}-en.svg`);
  const svg=readFileSync(new URL(`../public/studio/${template}-en.svg`,import.meta.url),'utf8');
  assert.doesNotMatch(svg,/Del boceto al color|Estudio de cítricos|Acuarela para principiantes/);
  const render=(props:Record<string,string|number>)=>renderToStaticMarkup(createElement(StudioElement,{instance:{template,props},frame:50,libraryPreview:true}));
  const english=render({language:'en',amount:'$40'});
  assert.ok(english.includes(`${template}-en.svg`));
  if(template==='price-editor'){
   assert.match(english,/Unlock for.*\$40/);
   assert.match(render({amount:'$25'}),/Desbloquear por.*\$25/);
  }
 }
});
