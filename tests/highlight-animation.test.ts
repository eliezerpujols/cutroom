import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AnimatedText} from '../src/remotion/AnimatedText';
import {highlightAnimationStyle} from '../src/highlightAnimation';
import {defaultCaptionStyle,effectiveCaptionStyle} from '../src/captions';
import {patchSelectionStyles,patchCaptionLayerStyle} from '../src/selectionStyles';
import {captionLayerSchema} from '../server/schema';
import {defaultEffects} from '../src/effects';
import type {Project} from '../src/model';

test('highlight animations use word-local time and settle for short and long words',()=>{
 assert.equal(highlightAnimationStyle(undefined,0,30),undefined);
 assert.equal(highlightAnimationStyle('none',0,30),undefined);
 assert.equal(highlightAnimationStyle('fade',0,30)?.opacity,0);
 assert.equal(highlightAnimationStyle('fade',3,30)?.opacity,.5);
 assert.equal(highlightAnimationStyle('fade',6,30)?.opacity,1);
 assert.equal(highlightAnimationStyle('fade',0,1)?.opacity,1);
 assert.equal(highlightAnimationStyle('pop',0,30)?.transform,'scale(0.9)');
 assert.equal(highlightAnimationStyle('pop',6,30)?.transform,'scale(1)');
});
test('word styles affect only the active word and compose with letter effects',()=>{
 for(const effects of [undefined,{...defaultEffects,textMotion:'wave' as const}]){
  const html=renderToStaticMarkup(React.createElement(AnimatedText,{text:'First second',frame:3,duration:30,effects,wordStyles:[undefined,highlightAnimationStyle('fade',3,30)]}));
  assert.equal((html.match(/opacity:0.5/g)||[]).length,1);
  assert.match(html,/First|>F<.*>i<.*>r<.*>s<.*>t</);
 }
});
test('highlight motion persists through cue overrides and layer-wide edits without changing legacy caption motion',()=>{
 const layer={id:'layer',name:'Captions',language:'en',muted:false,style:{...defaultCaptionStyle,motion:'pop' as const},cues:[{id:'a',start:0,duration:30,words:[{text:'First',start:0,end:30}]},{id:'b',start:30,duration:30,words:[{text:'Second',start:0,end:30}]}]};
 const project:Project={version:1,name:'QA',width:1080,height:1920,fps:30,tracks:[],clips:[],captions:[layer]};
 const edited=patchSelectionStyles(project,['a'],{highlightMotion:'fade'}).captions![0];
 const saved=captionLayerSchema.parse(JSON.parse(JSON.stringify(edited)));
 assert.equal(effectiveCaptionStyle(saved,saved.cues[0]).highlightMotion,'fade');
 assert.equal(effectiveCaptionStyle(saved,saved.cues[1]).highlightMotion,undefined);
 assert.equal(saved.style.motion,'pop');
 const all=patchCaptionLayerStyle(saved,{highlightMotion:'pop'});
 assert.equal(all.cues[0].style?.highlightMotion,undefined);
 assert.equal(effectiveCaptionStyle(all,all.cues[0]).highlightMotion,'pop');
 assert.equal(captionLayerSchema.safeParse({...layer,style:{...layer.style,highlightMotion:'invalid'}}).success,false);
});
