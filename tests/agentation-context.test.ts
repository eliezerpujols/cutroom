import test from 'node:test';
import assert from 'node:assert/strict';
import {AGENTATION_ATTRIBUTES,cutroomTarget} from '../src/agentationContext';

test('Cutroom annotation targets carry id, frame range, seconds and track', () => {
  assert.deepEqual(cutroomTarget('caption','cue_1',{start:380,duration:140},{name:'Hola',track:'layer_1'}),{
    'data-cutroom-kind':'caption',
    'data-cutroom-id':'cue_1',
    'data-cutroom-name':'Hola',
    'data-cutroom-range':'380-520 (12.67s-17.33s)',
    'data-cutroom-track':'layer_1',
  });
  assert.deepEqual(cutroomTarget('preview'),{'data-cutroom-kind':'preview'});
});

test('Agentation captures every Cutroom attribute within its limit', () => {
  assert.ok(AGENTATION_ATTRIBUTES.length<=16);
  for (const name of Object.keys(cutroomTarget('text','t',{start:0,duration:1},{name:'x',track:'y'}))) assert.ok((AGENTATION_ATTRIBUTES as readonly string[]).includes(name));
});
