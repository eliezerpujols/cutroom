import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {defaultEffects,maskStyle} from '../src/effects';
import {EffectLayer} from '../src/remotion/Effects';

test('circle masks stay circular on portrait, landscape and square viewports',()=>{
  for(const bounds of [{width:1080,height:1920},{width:1920,height:1080},{width:720,height:720}]){
    assert.equal(maskStyle({...defaultEffects,mask:'circle'},bounds).clipPath,'circle(closest-side at 50% 50%)');
  }
});

test('rounded masks use the same radius on both axes and scale with the viewport',()=>{
  const effects={...defaultEffects,mask:'rounded' as const};
  assert.equal(maskStyle(effects,{width:1080,height:1920}).clipPath,'inset(0 round 86.4px)');
  assert.equal(maskStyle(effects,{width:1920,height:1080}).clipPath,'inset(0 round 86.4px)');
  assert.equal(maskStyle(effects,{width:270,height:480}).clipPath,'inset(0 round 21.6px)');
  assert.equal(maskStyle(effects).clipPath,'inset(0 round 8%)'); // Square library tiles.
  assert.deepEqual(maskStyle(defaultEffects,{width:1080,height:1920}),{});
  assert.deepEqual(maskStyle(),{});
});

test('the shared preview/export effect layer passes its viewport to the mask',()=>{
  const html=renderToStaticMarkup(createElement(EffectLayer,{
    effects:{...defaultEffects,mask:'rounded'},maskBounds:{width:320,height:180},frame:10,duration:30,fill:true,
    children:createElement('div',null,'Media'),
  }));
  assert.match(html,/clip-path:inset\(0 round 14\.4px\)/);
});
