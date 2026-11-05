import test from 'node:test';
import assert from 'node:assert/strict';
import {coverFrameItems,coverSceneProject,editCoverScene,moveCoverFrame,syncCoverAppearance} from '../src/coverScene';
import {setItemVisibility} from '../src/itemVisibility';
import {setCoverElement} from '../server/coverElements';
import {validateProject,type StoredAsset} from '../server/schema';
import {coverFrame,defaultCover,defaultCoverText} from '../src/visuals';
import {defaultCaptionStyle} from '../src/captions';
import {studioDefaults} from '../src/studio/registry';
import type {Project,Asset} from '../src/model';

const project:Project={
 version:1,name:'Cover QA',width:1080,height:1920,fps:30,
 tracks:[{id:'video',name:'Video',kind:'video',muted:false},{id:'audio',name:'Audio',kind:'audio',muted:false}],
 clips:[{id:'base',assetId:'source',name:'Source',kind:'video',trackId:'video',start:0,duration:120,sourceIn:0,rate:1,volume:1,muted:false,fadeIn:0,fadeOut:0},
 {id:'studio',assetId:'studio-product-tile',name:'Product tile',kind:'video',trackId:'video',start:30,duration:30,sourceIn:0,rate:1,volume:0,muted:true,fadeIn:0,fadeOut:0,studio:{template:'product-tile',props:studioDefaults('product-tile')}}],
 texts:[{...defaultCoverText,id:'text',text:'Timed title',start:30,duration:30,muted:false}],
 captions:[{id:'captions',name:'Captions',muted:false,language:'en',style:defaultCaptionStyle,cues:[{id:'cue',start:30,duration:30,words:[{text:'Hello',start:0,end:30}]}]}],
 cover:{...defaultCover,frame:40},
};
const asset:Asset={id:'source',name:'Source',kind:'video',width:1080,height:1920,frames:120,duration:4,hasAudio:true,url:'/source',thumbnails:[],peaks:[]};
const stored:StoredAsset={...asset,file:'media/source.mp4',thumbnails:[]};

test('cover lists only frame-active visual elements, including hidden captions and Studio',()=>{
 assert.deepEqual(new Set(coverFrameItems(project,40).map(x=>x.id)),new Set(['base','studio','text','cue']));
 assert.deepEqual(coverFrameItems(project,80).map(x=>x.id),['base']);
});
test('cover visibility, caption edits and styles are isolated and survive serialization',()=>{
 const hidden=editCoverScene(project,p=>setItemVisibility(p,[{kind:'clip',id:'studio'}],false));
 const changed=setCoverElement(hidden,[asset],{element_id:'cue',visible:true,text:'Cover only',caption_style:{color:'#FF0000'}}).project;
 const restored=validateProject(JSON.parse(JSON.stringify(changed)),[stored]);
 assert.deepEqual(restored.clips,project.clips);
 assert.deepEqual(restored.captions,project.captions);
 assert.equal(coverSceneProject(restored).clips.find(c=>c.id==='studio')?.hidden,true);
 assert.equal(coverSceneProject(restored).captions?.[0].cues[0].style?.color,'#FF0000');
 assert.equal(coverSceneProject(restored).captions?.[0].cues[0].words.map(w=>w.text).join(' '),'Cover only');
 assert.equal(restored.cover?.showCaptions,true);
});
test('cover Studio, media, text and effects keep timeline sources and timing intact',()=>{
 let next=setCoverElement(project,[asset],{kind:'studio',template:'heart-pop',props:{color:'#FF0000'}}).project;
 const media=setCoverElement(next,[asset],{kind:'media',asset_id:'source',source_frame:10});next=media.project;
 const title=setCoverElement(next,[asset],{kind:'text',text:'Cover title',style:{color:'#FFFFFF'}});next=title.project;
 next=setCoverElement(next,[asset],{element_id:title.elementId,effects:{textStyle:'neon'}}).project;
 next=validateProject(JSON.parse(JSON.stringify(next)),[stored]);
 assert.deepEqual(next.clips,project.clips);
 assert.deepEqual(next.texts,project.texts);
 const scene=coverSceneProject(next);
 assert.equal(scene.clips.find(c=>c.id===media.elementId)?.sourceIn,10);
 assert.equal(scene.texts?.find(t=>t.id===title.elementId)?.effects?.textStyle,'neon');
 const moved=moveCoverFrame(next,70),movedScene=coverSceneProject(moved);
 assert.equal(movedScene.clips.find(c=>c.id===media.elementId)?.start,70);
 assert.equal(movedScene.clips.find(c=>c.id==='studio')?.start,30);
 assert.equal(movedScene.texts?.find(t=>t.id===title.elementId)?.start,70);
});
test('invalid cover sources and source ranges fail without mutating the video',()=>{
 assert.throws(()=>setCoverElement(project,[asset],{kind:'media',asset_id:'missing'}));
 const invalid=setCoverElement(project,[asset],{kind:'media',asset_id:'source',source_frame:500}).project;
 assert.throws(()=>validateProject(invalid,[stored]));
 assert.equal(project.cover?.scene,undefined);
});
test('legacy cover title effects remain cover-only',()=>{
 const legacy={...project,cover:{...defaultCover,frame:40,texts:[{...defaultCoverText,id:'legacy'}]}};
 const next=setCoverElement(legacy,[asset],{element_id:'legacy',effects:{textStyle:'neon'}}).project;
 assert.equal(next.cover?.texts[0].effects?.textStyle,'neon');
 assert.deepEqual(next.texts,project.texts);
});

test('a customized cover retains its source frame after the video is shortened',()=>{
 const customized=editCoverScene({...project,cover:{...defaultCover,frame:90}},p=>p);
 const shortened={...customized,clips:customized.clips.filter(c=>c.id==='base').map(c=>({...c,duration:30})),texts:[],captions:[]};
 assert.equal(coverFrame(shortened),90);
 assert.equal(coverSceneProject(shortened).clips[0].duration,120);
});

test('cover clipboard accepts media and captions as stills without changing original source windows',async()=>{
 const {copyEditorSelection,pasteEditorClipboard}=await import('../src/editorClipboard');
 const scene=coverSceneProject(project);
 const copied=copyEditorSelection(scene,{kind:'media',ids:['studio']})!;
 const pasted=pasteEditorClipboard(scene,copied,true,40,true);
 const added=pasted.project.clips.find(c=>!scene.clips.some(old=>old.id===c.id))!;
 assert.equal(added.start,40);assert.equal(added.duration,1);assert.equal(added.sourceIn,10);
 const caption=copyEditorSelection(scene,{kind:'caption',layerId:'captions',cueId:'cue'})!;
 const pastedCaption=pasteEditorClipboard(scene,caption,true,40,true);
 const cue=pastedCaption.project.captions![0].cues.find(c=>c.id!=='cue')!;
 assert.equal(cue.start,40);assert.equal(cue.duration,1);assert.equal(cue.words[0].end,1);
 assert.equal(project.clips[1].sourceIn,0);
});

test('showing a cover caption also enables its muted layer in the cover scene',()=>{
 const muted={...project,captions:project.captions?.map(l=>({...l,muted:true}))};
 const next=setCoverElement(muted,[asset],{element_id:'cue',visible:true}).project;
 assert.equal(coverFrameItems(next,40).find(item=>item.id==='cue')?.visible,true);
 assert.equal(next.captions![0].muted,true);
});

test('timeline Studio and caption colors follow into a customized cover without changing its layout or visibility',()=>{
 const before=editCoverScene(project,p=>({...p,clips:p.clips.map(c=>c.id==='studio'?{...c,hidden:true,overlay:{x:20,y:25,width:40}}:c)}));
 const changed={...before,clips:before.clips.map(c=>c.studio?{...c,studio:{...c.studio,props:{...c.studio.props,accent:'#FFED4D'}}}:c),captions:before.captions?.map(l=>({...l,style:{...l.style,highlightColor:'#FFED4D'}}))};
 const synced=validateProject(JSON.parse(JSON.stringify(syncCoverAppearance(before,changed))),[stored]);
 const scene=coverSceneProject(synced),tile=scene.clips.find(c=>c.id==='studio')!;
 assert.equal(tile.studio?.props.accent,'#FFED4D');
 assert.equal(scene.captions?.[0].style.highlightColor,'#FFED4D');
 assert.equal(tile.hidden,true);assert.deepEqual(tile.overlay,{x:20,y:25,width:40});
 assert.equal(synced.cover?.showCaptions,false);
 assert.deepEqual(synced.clips,changed.clips);assert.deepEqual(synced.captions,changed.captions);
});

test('explicit cover colors stay independent while other appearance fields keep following the timeline',()=>{
 const before=setCoverElement(editCoverScene(project,p=>p),[asset],{element_id:'studio',props:{accent:'#FF0000'}}).project;
 const caption=setCoverElement(before,[asset],{element_id:'cue',caption_style:{highlightColor:'#00FF00'}}).project;
 const changed={...caption,clips:caption.clips.map(c=>c.studio?{...c,studio:{...c.studio,props:{...c.studio.props,accent:'#FFED4D',price:'$40'}}}:c),captions:caption.captions?.map(l=>({...l,style:{...l.style,highlightColor:'#FFED4D',fontSize:60}}))};
 const scene=coverSceneProject(syncCoverAppearance(caption,changed));
 assert.equal(scene.clips.find(c=>c.id==='studio')?.studio?.props.accent,'#FF0000');
 assert.equal(scene.clips.find(c=>c.id==='studio')?.studio?.props.price,'$40');
 assert.equal(scene.captions?.[0].cues[0].style?.highlightColor,'#00FF00');
 assert.equal(scene.captions?.[0].style.highlightColor,'#FFED4D');
 assert.equal(scene.captions?.[0].style.fontSize,60);
});
