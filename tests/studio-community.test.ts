import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {communityPose} from '../src/studio/CommunitySelection';
import {creatorProgramScreenFile} from '../src/studio/CreatorProgramScreen';
import {StudioElement} from '../src/studio/StudioElement';
import {addStudioElement,studioDefaults,studioAssets} from '../src/studio/registry';
import {validateProject,studioSchema} from '../server/schema';
import {splitClip,type Project} from '../src/model';
test('X is drawn before rejected profiles leave, while the close group remains',()=>{
 assert.equal(communityPose(0,8,4,35,64).opacity,0);
 const crossed=communityPose(56,8,4,35,64);assert.equal(crossed.cross,1);assert.equal(crossed.opacity,1);
 assert.equal(communityPose(105,8,4,35,64).opacity,0);
 assert.equal(communityPose(150,0,4,35,64).opacity,1);assert.equal(communityPose(150,0,4,35,64).cross,0);
});
test('new Studio clips persist with editable props, no synthetic media and local animation phase',()=>{
 let p:Project={version:1,name:'Native Studio',width:1080,height:1920,fps:30,tracks:[],clips:[]};
 for(const template of ['community-selection','creator-program-screen']){
  p=addStudioElement(p,template,30,template);
  assert.ok(studioAssets.some(a=>a.id==='studio-'+template));
  const html=renderToStaticMarkup(createElement(StudioElement,{instance:{template,props:studioDefaults(template)},frame:60,libraryPreview:true}));assert.ok(html.length>100);
 }
 const saved=validateProject(JSON.parse(JSON.stringify(p)),[]);assert.equal(saved.clips.length,2);assert.notEqual(saved.clips[0].trackId,saved.clips[1].trackId);
 const [,right]=splitClip(saved.clips[0],60,'split');assert.equal(right.sourceIn,30);assert.deepEqual(communityPose(right.sourceIn,5,4,35,64),communityPose(30,5,4,35,64));
 assert.equal(studioSchema.safeParse({template:'community-selection',props:{total:50}}).success,false);
 assert.equal(studioSchema.safeParse({template:'creator-program-screen',props:{unknown:'no'}}).success,false);
 assert.equal(creatorProgramScreenFile('editor'),'/studio/creator-program/editor-es.jpg');
 assert.equal(creatorProgramScreenFile('../unsafe'),'/studio/creator-program/inicio-es.jpg');
});
