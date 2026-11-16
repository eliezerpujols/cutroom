import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PaperChatStack,paperChatState,paperChatPose} from '../src/studio/PaperChatStack';
import {addStudioElement,studioDefaults,studioAssets} from '../src/studio/registry';
import {splitClip} from '../src/model';
import {validateProject,studioSchema} from '../server/schema';

test('reply bubbles alternate sides, retain earlier messages and never deliver a PDF',()=>{
  const props={scenario:'reply',message1:'Ya pagué',message2:'Te la envío',message3:'Está bien',sendSecondAt:31,sendThirdAt:97};
  assert.equal(paperChatState(30,props).messages.length,1);
  assert.deepEqual(paperChatState(31,props).messages.map(m=>m.incoming),[false,true]);
  const end=paperChatState(120,props);
  assert.deepEqual(end.messages.map(m=>m.text),['Ya pagué','Te la envío','Está bien']);
  assert.equal(end.document,false);
});
test('each message moves diagonally from its corner and settles without moving prior messages',()=>{
  for(const incoming of [true,false]){
    const start=paperChatPose(30,30,incoming,1,12),middle=paperChatPose(36,30,incoming,1,12),end=paperChatPose(42,30,incoming,1,12);
    assert.equal(Math.sign(start.x),incoming?-1:1);
    assert.ok(Math.abs(middle.x)<Math.abs(start.x));
    assert.ok(middle.y>0&&middle.y<start.y);
    assert.equal(end.x,0);assert.equal(end.y,0);
    assert.deepEqual(end,paperChatPose(90,30,incoming,1,12));
  }
});
test('stop motion holds discrete poses rather than tweening every frame',()=>{
  assert.deepEqual(paperChatPose(0,0,false,0,12),paperChatPose(2,0,false,0,12));
  assert.notDeepEqual(paperChatPose(2,0,false,0,12),paperChatPose(3,0,false,0,12));
  assert.deepEqual(paperChatPose(3,0,false,0,12),paperChatPose(5,0,false,0,12));
  assert.deepEqual(paperChatPose(6,0,true,1,12),paperChatPose(8,0,true,1,12));
});
test('followup delivery and movement survive split, validation and serialization',()=>{
  const project=addStudioElement({version:1,name:'Paper chat QA',width:1080,height:1920,fps:30,clips:[],tracks:[]},'paper-chat-stack',0,'stack');
  const saved=validateProject(JSON.parse(JSON.stringify(project)),[]);
  const [,right]=splitClip(saved.clips[0],60,'right');
  assert.deepEqual(paperChatState(right.sourceIn,right.studio!.props),paperChatState(60,studioDefaults('paper-chat-stack')));
  assert.equal(paperChatState(83,{}).document,false);
  assert.equal(paperChatState(84,{}).document,true);
  assert.ok(studioAssets.some(a=>a.id==='studio-paper-chat-stack'));
  assert.equal(studioSchema.safeParse({template:'paper-chat-stack',props:{entranceFrames:0}}).success,false);
});
test('renders loose messages and delivery with no phone chrome or wallpaper',()=>{
  const html=renderToStaticMarkup(createElement(PaperChatStack,{instance:{template:'paper-chat-stack',props:{}},frame:110}));
  assert.match(html,/Hola, sigo esperando/);assert.match(html,/Rutina\.pdf/);
  assert.doesNotMatch(html,/wallpaper|contacto|Enviar documento|Hoy/);
  assert.match(html,/rotate\(/);
});
test('document label can be translated without changing saved Spanish instances',()=>{
  const render=(props:Record<string,string|number>)=>renderToStaticMarkup(createElement(PaperChatStack,{instance:{template:'paper-chat-stack',props},frame:110}));
  assert.match(render({}),/PDF · Documento/);
  const english=render({documentName:'Workout.pdf',documentLabel:'Document'});
  assert.match(english,/Workout\.pdf/);
  assert.match(english,/PDF · Document</);
  assert.doesNotMatch(english,/Documento/);
  assert.equal(studioSchema.safeParse({template:'paper-chat-stack',props:{documentLabel:'Document'}}).success,true);
  assert.equal(studioDefaults('paper-chat-stack').documentLabel,'Documento');
});
