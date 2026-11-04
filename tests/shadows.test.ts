import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {resolveShadow,mergeTextShadows,defaultShadow} from '../src/shadows';
import {ShadowText} from '../src/remotion/Effects';
import {defaultCaptionStyle,effectiveCaptionStyle} from '../src/captions';
import {patchCaptionLayerStyle,patchSelectionStyles} from '../src/selectionStyles';
import {makeVideoText} from '../src/videoText';
import {projectSchema,shadowSchema} from '../server/schema';
import type {Project} from '../src/model';
test('legacy shadows keep exact parameters and the second shadow can be enabled independently',()=>{
 const legacy={...defaultShadow,mode:'drop' as const,color:'#123456',x:7,opacity:75};
 assert.equal(resolveShadow(legacy,'drop').enabled,true);assert.equal(resolveShadow(legacy,'drop').x,7);assert.equal(resolveShadow(legacy,'inner').enabled,false);
 const combined=mergeTextShadows(legacy,{inner:{enabled:true,color:'#abcdef'}});
 assert.deepEqual(resolveShadow(combined,'drop'),resolveShadow(legacy,'drop'));assert.equal(resolveShadow(combined,'inner').color,'#abcdef');
 const hidden=mergeTextShadows(combined,{drop:{enabled:false}});assert.equal(resolveShadow(hidden,'drop').enabled,false);assert.equal(resolveShadow(hidden,'inner').enabled,true);assert.equal(resolveShadow(hidden,'drop').color,'#123456');
});
const layer={id:'captions',name:'Captions',language:'en',muted:false,style:{...defaultCaptionStyle,shadow:{drop:{enabled:true,color:'#123456',blur:8},inner:{enabled:true,color:'#abcdef',blur:2}}},cues:[{id:'one',start:0,duration:60,words:[{text:'Hello',start:0,end:60}],style:{shadow:{drop:{x:8,blur:12},inner:{opacity:25}}}},{id:'two',start:60,duration:60,words:[{text:'World',start:0,end:60}],style:{shadow:{drop:{x:-4}}}}]};
const project:Project={version:1,name:'Shadow QA',width:1080,height:1920,fps:30,clips:[],tracks:[],captions:[layer],texts:[{...makeVideoText('title',0),shadow:{drop:{enabled:true,color:'#fefefe'},inner:{enabled:true,x:3}}}]};
test('caption inheritance and whole-layer edits keep unrelated parameters for both shadows',()=>{
 const style=effectiveCaptionStyle(layer,layer.cues[0]);assert.equal(resolveShadow(style.shadow,'drop').color,'#123456');assert.equal(resolveShadow(style.shadow,'drop').x,8);assert.equal(resolveShadow(style.shadow,'inner').opacity,25);
 const next=patchCaptionLayerStyle(layer,{shadow:{drop:{blur:20}}});
 const after=effectiveCaptionStyle(next,next.cues[0]);assert.equal(resolveShadow(after.shadow,'drop').blur,20);assert.equal(resolveShadow(after.shadow,'drop').x,8);assert.equal(resolveShadow(after.shadow,'inner').opacity,25);
 assert.equal(next.cues[0].style?.shadow?.drop?.blur,undefined);
});
test('batch partial edits preserve independent shadows and survive schema round trips',()=>{
 const next=patchSelectionStyles(project,['one','title'],{shadow:{inner:{y:12}}});
 const saved=projectSchema.parse(JSON.parse(JSON.stringify(next)));
 assert.equal(saved.texts?.[0].shadow?.inner?.x,3);assert.equal(saved.texts?.[0].shadow?.inner?.y,12);assert.equal(saved.texts?.[0].shadow?.drop?.color,'#fefefe');
 assert.equal(resolveShadow(effectiveCaptionStyle(saved.captions![0],saved.captions![0].cues[0]).shadow,'inner').opacity,25);assert.deepEqual(next.captions![0].cues[1],project.captions![0].cues[1]);
 for(const patch of [{drop:{opacity:101}},{inner:{blur:NaN}},{inner:{x:41}},{drop:{enabled:'yes'}}])assert.equal(shadowSchema.partial().safeParse(patch).success,false);
});
test('combined rendering composes independent drop and inner shadows from glyph alpha',()=>{
 const html=renderToStaticMarkup(React.createElement(ShadowText,{children:'Hello',shadow:{drop:{enabled:true,color:'#123456'},inner:{enabled:true,color:'#abcdef'}}},'Hello'));
 assert.match(html,/result="innerText"/);assert.match(html,/result="dropShadow"/);assert.match(html,/<feMergeNode in="dropShadow"/);assert.match(html,/<feMergeNode in="innerText"/);assert.match(html,/flood-color="#abcdef"/);
 const legacy=renderToStaticMarkup(React.createElement(ShadowText,{children:'Hello',shadow:{...defaultShadow,mode:'drop'}},'Hello'));assert.match(legacy,/text-shadow:0px 4px 8px #00000099/);
 const none=renderToStaticMarkup(React.createElement(ShadowText,{children:'Hello'}));assert.equal(none,'Hello');
});
