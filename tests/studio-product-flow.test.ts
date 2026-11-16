import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductFlowDemo,productDemoFrame,uploadSparklePose} from '../src/studio/ProductFlowDemo';
import {communicationPose} from '../src/studio/CommunicationBeat';
import {studioSchema,validateProject} from '../server/schema';
import {addStudioElement} from '../src/studio/registry';
import {splitClip,type Project} from '../src/model';
test('the recreated demo has the original continuous flow, Spanish gallery/upload text and a stable final hold',()=>{
 const instance={template:'product-flow-demo-es',props:{speed:1}};
 const html=(frame:number)=>renderToStaticMarkup(createElement(ProductFlowDemo,{instance,frame,libraryPreview:true}));
 assert.match(html(120),/Cancelar/);assert.match(html(120),/Fotos/);assert.match(html(120),/1 foto seleccionada/);assert.match(html(170),/Subiendo tu archivo/);
 for(const frame of [0,90,120,170,240,290,330,390,420,457])assert.doesNotMatch(html(frame),/NaN|Infinity|>Photos<|>Cancel<|Uploading your file/);
 assert.equal(productDemoFrame(457,1),437);assert.equal(productDemoFrame(180,1.5),270);
});
test('native demo and visual resources validate and retain animation time after splitting',()=>{
 const empty:Project={version:1,name:'Flow',width:1080,height:1920,fps:30,tracks:[],clips:[]};
 let p=addStudioElement(empty,'product-flow-demo-es',630,'demo');p=addStudioElement(p,'communication-beat',90,'bell');const saved=validateProject(p,[]);
 const [,right]=splitClip(saved.clips[0],700,'part');assert.equal(productDemoFrame(right.sourceIn,1),70);
 assert.equal(studioSchema.safeParse({template:'product-flow-demo-es',props:{speed:3}}).success,false);
 assert.equal(studioSchema.safeParse({template:'communication-beat',props:{unknown:7}}).success,false);
 for(const frame of [0,1,10,45,83]){const v=communicationPose(frame);assert.ok(Object.values(v).every(Number.isFinite));assert.deepEqual(v,communicationPose(frame));}
});
test('upload restores both animated logo pieces, with the original staggered loop',()=>{
 const html=renderToStaticMarkup(createElement(ProductFlowDemo,{instance:{template:'product-flow-demo-es',props:{speed:1}},frame:150,libraryPreview:true}));
 for(const file of ['upload-crown.svg','upload-eye-left.svg','upload-eye-right.svg'])assert.ok(html.includes(file));
 assert.notDeepEqual(uploadSparklePose(12),uploadSparklePose(0));
 assert.deepEqual(uploadSparklePose(12,42),uploadSparklePose(0));
 assert.deepEqual(uploadSparklePose(54,42),uploadSparklePose(12));
 assert.deepEqual(uploadSparklePose(84),uploadSparklePose(0));
 for(const f of [0,8,21,38,42,84,150])assert.ok(Object.values(uploadSparklePose(f)).every(Number.isFinite));
});

test('English variant reuses the flow with its original artwork and translated live scenes',()=>{
 const instance={template:'product-flow-demo-en',props:{speed:1}};
 const html=(frame:number)=>renderToStaticMarkup(createElement(ProductFlowDemo,{instance,frame,libraryPreview:true}));
 assert.match(html(120),/>Cancel</);assert.match(html(120),/>Photos</);assert.match(html(120),/1 photo selected/);
 assert.match(html(150),/Uploading your file/);assert.match(html(330),/product-flow-en\/screens\/description/);
 for(const f of [0,90,120,150,240,330,390,420])assert.doesNotMatch(html(f),/product-flow-es|Cancelar|Subiendo|NaN|Infinity/);
 assert.equal(studioSchema.safeParse(instance).success,true);
});
