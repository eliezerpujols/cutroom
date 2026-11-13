import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationState} from '../src/studio/conversationTiming';
import {studioTemplates,studioDefaults,studioAssets} from '../src/studio/registry';

test('follow-up composes, sends, then receives the document on exact frames',()=>{
  assert.equal(conversationState(7,{}).draft,'');
  assert.ok(conversationState(20,{}).draft.length>0);
  assert.equal(conversationState(27,{}).messages.length,1);
  assert.equal(conversationState(28,{}).messages.length,2);
  assert.equal(conversationState(28,{}).draft,'');
  assert.equal(conversationState(60,{}).messages.length,3);
  assert.equal(conversationState(83,{}).document,false);
  assert.equal(conversationState(84,{}).document,true);
  assert.equal(conversationState(97,{}).download,1);
});
test('manual delivery is the seller perspective and attaches before sending',()=>{
  const p={scenario:'manual',receiveAt:100};
  assert.equal(conversationState(0,p).messages[0].incoming,true);
  assert.equal(conversationState(67,p).attached,false);
  assert.equal(conversationState(68,p).attached,true);
  assert.equal(conversationState(100,p).attached,false);
  assert.equal(conversationState(100,p).documentIncoming,false);
  assert.equal(conversationState(100,p).document,true);
});
test('waiting does not accidentally receive; reversed timing preserves action order',()=>{
  assert.equal(conversationState(999,{scenario:'waiting'}).document,false);
  const state=conversationState(21,{sendSecondAt:4,sendThirdAt:1,receiveAt:0});
  assert.equal(state.messages.length,3);
  assert.equal(state.document,false);
  assert.equal(state.receive,24);
});
test('both registered crops resolve synthetic assets and independent defaults',()=>{
  for(const id of ['paper-conversation','paper-message']){
    assert.ok(studioTemplates.find(t=>t.id===id));
    assert.ok(studioAssets.find(a=>a.id===`studio-${id}`));
    assert.equal(studioDefaults(id).message2,'¿Alguna novedad con la rutina?');
  }
});

test('conversation cues survive split/save and reject unknown or out-of-range props',async()=>{
  const {addStudioElement}=await import('../src/studio/registry');
  const {studioSchema,validateProject}=await import('../server/schema');
  const {splitClip}=await import('../src/model');
  const project=addStudioElement({version:1,name:'Chat QA',width:1080,height:1920,fps:30,clips:[],tracks:[]},'paper-conversation',0,'conversation');
  const saved=validateProject(JSON.parse(JSON.stringify(project)),[]);
  const [,right]=splitClip(saved.clips[0],60,'next');
  assert.equal(conversationState(right.sourceIn,right.studio!.props).messages.length,3);
  assert.equal(studioSchema.safeParse({template:'paper-conversation',props:{receiveAt:-1}}).success,false);
  assert.equal(studioSchema.safeParse({template:'paper-conversation',props:{unknown:'x'}}).success,false);
  assert.equal(studioSchema.safeParse({template:'paper-message',props:{message1:'x'.repeat(161)}}).success,false);
});
