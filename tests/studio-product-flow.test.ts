import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductFlowDemo,productDemoFrame} from '../src/studio/ProductFlowDemo';
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
