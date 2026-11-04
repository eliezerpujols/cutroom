import test from 'node:test';
import assert from 'node:assert/strict';
import {graphemes,connectedScript,textAnimationOptions,textAnimationStyle,textProgress,textMotionOptions,textMotionStyle,textPaint} from '../src/textEffects';
import {defaultEffects,patchSelectionEffects} from '../src/effects';
import {makeVideoText} from '../src/videoText';
import {defaultCaptionStyle} from '../src/captions';
import {previousTitle,previousCaption,textTransitionTargets} from '../src/textTransitions';
import {projectSchema,effectsSchema} from '../server/schema';
import type {Project} from '../src/model';
const first={...makeVideoText('one',0),duration:60},second={...makeVideoText('two',60),duration:60};
const layer={id:'captions',name:'Captions',language:'en',muted:false,style:defaultCaptionStyle,cues:[{id:'c1',start:0,duration:60,words:[{text:'Hello',start:0,end:60}]},{id:'c2',start:60,duration:60,words:[{text:'World',start:0,end:60}]}]};
const project:Project={version:1,name:'Text effects',width:1080,height:1920,fps:30,clips:[],tracks:[],texts:[first,second],captions:[layer]};
test('text segmentation preserves combining marks, family emoji, spaces and connected scripts',()=>{
 assert.deepEqual(graphemes('á👨‍👩‍👧‍👦🇩🇴'),['á','👨‍👩‍👧‍👦','🇩🇴']);
 assert.equal(connectedScript('مرحبا'),true);assert.equal(connectedScript('नमस्ते'),true);assert.equal(connectedScript('Hola'),false);
});
test('every text animation reaches hidden and visible endpoints for each unit and stays finite',()=>{
 for(const [kind] of textAnimationOptions)for(const count of [1,2,30])for(let i=0;i<count;i++){
  assert.equal(textAnimationStyle(kind,0,i,count).opacity,0);assert.equal(textAnimationStyle(kind,1,i,count).opacity,1);
  for(const p of [0,.1,.5,.99,1])assert.doesNotMatch(JSON.stringify(textAnimationStyle(kind,p,i,count,90)),/NaN|Infinity/);
 }
 assert.ok(textProgress(.5,0,10)>textProgress(.5,9,10));assert.equal(textProgress(.5,0,10,0),textProgress(.5,9,10,0));
});
test('letter motion returns to rest and appearance uses its selected accent',()=>{
 for(const [kind] of textMotionOptions)for(const p of [0,.5,1])assert.doesNotMatch(JSON.stringify(textMotionStyle(kind,p,3,100,false)),/NaN|Infinity/);
 assert.equal(textMotionStyle('pulse',0,0,100,false).transform,'scale(1)');assert.equal(textMotionStyle('pulse',1,0,100,false).transform,'scale(1)');
 assert.equal(textPaint({textAppearance:'outline',textAccent:'#ff1234'},0,0).WebkitTextStroke,'.025em #ff1234');
});
test('text effects persist on authored titles and caption cues and preserve unselected items',()=>{
 const next=patchSelectionEffects(project,['one','c1'],{enter:'text-typewriter',exit:'text-scatter',textMotion:'wave',textStyle:'neon',textAppearance:'outline',textAccent:'#ff1234',textUnit:'word',textStagger:75});
 const saved=projectSchema.parse(JSON.parse(JSON.stringify(next)));
 assert.equal(saved.texts?.[0].effects?.textMotion,'wave');assert.equal(saved.captions?.[0].cues[0].effects?.exit,'text-scatter');assert.deepEqual(saved.texts?.[1],projectSchema.parse(project).texts?.[1]);
 for(const invalid of [{textStagger:100},{textStagger:NaN},{textMotion:'invalid'},{textAccent:'red'}])assert.equal(effectsSchema.safeParse({...defaultEffects,...invalid}).success,false);
});
test('between text effects bind only to eligible preceding titles and nonempty captions',()=>{
 assert.equal(previousTitle(project,second)?.id,'one');assert.equal(previousTitle(project,{...second,y:90}),undefined);assert.equal(previousTitle(project,{...second,start:61}),undefined);
 assert.equal(previousCaption(layer,layer.cues[1])?.id,'c1');assert.equal(previousCaption({...layer,cues:[{...layer.cues[0],words:[]},layer.cues[1]]},layer.cues[1]),undefined);
 assert.deepEqual(textTransitionTargets(project,['one','two','c1','c2']).map(x=>x.id),['two','c2']);
});

test('rendering preserves plain text, whole-word grouping and caption highlight colors',async()=>{
 const React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{AnimatedText}=await import('../src/remotion/AnimatedText');
 const plain=renderToStaticMarkup(React.createElement(AnimatedText,{text:'Hello world',frame:20,duration:60}));assert.equal(plain,'Hello world');
 const animated=renderToStaticMarkup(React.createElement(AnimatedText,{text:'Hello world',effects:{...defaultEffects,enter:'text-words',textStyle:'gradient'},frame:40,duration:60,wordColors:['#ff1234',undefined]}));
 assert.match(animated,/aria-label="Hello world"/);assert.match(animated,/>Hello<\/span>/);assert.match(animated,/-webkit-text-fill-color:#ff1234/);
 const joined=renderToStaticMarkup(React.createElement(AnimatedText,{text:'مرحبا',effects:{...defaultEffects,enter:'text-wave'},frame:20,duration:60}));assert.match(joined,/>مرحبا<\/span>/);
});
