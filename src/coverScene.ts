import type {Project} from './model';
import {defaultCover} from './visuals';
import {cueText} from './captions';
import {timelineLayers} from './layers';
import {itemVisible,setItemVisibility,type VisibilityTarget} from './itemVisibility';

export type CoverScene=Pick<Project,'clips'|'tracks'|'texts'|'captions'|'layerOrder'|'adjustments'>;

// Follow timeline appearance changes only where the cover still has the old
// value. A cover-specific override wins, down to individual nested fields.
function inheritAppearance<T>(before:T,cover:T,after:T):T{
  if(JSON.stringify(before)===JSON.stringify(after))return cover;
  if(JSON.stringify(before)===JSON.stringify(cover))return after;
  if(!before||!cover||!after||typeof before!=='object'||typeof cover!=='object'||typeof after!=='object'||Array.isArray(before)||Array.isArray(cover)||Array.isArray(after))return cover;
  const result={...cover} as Record<string,unknown>;
  for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
    const value=inheritAppearance((before as Record<string,unknown>)[key],result[key],(after as Record<string,unknown>)[key]);
    if(value===undefined)delete result[key];else result[key]=value;
  }
  return result as T;
}

export function syncCoverAppearance(before:Project,after:Project):Project{
  const scene=after.cover?.scene;
  if(!scene)return after;
  const clips=scene.clips.map(cover=>{
    const old=before.clips.find(c=>c.id===cover.id),next=after.clips.find(c=>c.id===cover.id);
    if(!old||!next)return cover;
    const appearance=(c:typeof cover)=>({studio:c.studio,effects:c.effects,adjustments:c.adjustments});
    return {...cover,...inheritAppearance(appearance(old),appearance(cover),appearance(next))};
  });
  const texts=scene.texts?.map(cover=>{
    const old=before.texts?.find(t=>t.id===cover.id),next=after.texts?.find(t=>t.id===cover.id);
    if(!old||!next)return cover;
    const appearance=({id,text,start,duration,muted,hidden,x,y,width,...style}:typeof cover)=>style;
    const {id,text,start,duration,muted,hidden,x,y,width}=cover;
    return {...inheritAppearance(appearance(old),appearance(cover),appearance(next)),id,text,start,duration,muted,hidden,x,y,width};
  });
  const captions=scene.captions?.map(cover=>{
    const old=before.captions?.find(l=>l.id===cover.id),next=after.captions?.find(l=>l.id===cover.id);
    if(!old||!next)return cover;
    return {...cover,style:inheritAppearance(old.style,cover.style,next.style),cues:cover.cues.map(cue=>{
      const oldCue=old.cues.find(c=>c.id===cue.id),nextCue=next.cues.find(c=>c.id===cue.id);
      return oldCue&&nextCue?{...cue,style:inheritAppearance(oldCue.style,cue.style,nextCue.style),effects:inheritAppearance(oldCue.effects,cue.effects,nextCue.effects)}:cue;
    })};
  });
  return {...after,cover:{...after.cover!,scene:{...scene,clips,texts,captions,adjustments:inheritAppearance(before.adjustments,scene.adjustments,after.adjustments)}}};
}

export function coverSceneProject(project:Project):Project{
  const scene=project.cover?.scene?{...project,...project.cover.scene}:project;
  const tracks=scene.tracks.filter(t=>t.kind==='video');
  const trackKeys=new Set(tracks.map(t=>'track:'+t.id));
  return {...scene,tracks,clips:scene.clips.filter(c=>c.kind==='video'),layerOrder:scene.layerOrder?.filter(key=>!key.startsWith('track:')||trackKeys.has(key))};
}

export function saveCoverScene(project:Project,edited:Project):Project{
  const {clips,tracks,texts,captions,layerOrder,adjustments}=edited;
  return {...project,cover:{...defaultCover,...edited.cover,scene:{clips,tracks,texts,captions,layerOrder,adjustments}}};
}

export function editCoverScene(project:Project,change:(scene:Project)=>Project):Project{
  return saveCoverScene(project,change(coverSceneProject(project)));
}

export function setCoverItemVisibility(scene:Project,target:VisibilityTarget,visible:boolean):Project{
  const next=setItemVisibility(scene,[target],visible);
  if(target.kind!=='caption'||!visible)return next;
  return {...next,cover:{...defaultCover,...next.cover,showCaptions:true},
    captions:next.captions?.map(layer=>layer.cues.some(cue=>cue.id===target.id)?{...layer,muted:false}:layer),
  };
}

export type CoverFrameItem={id:string;name:string;kind:'Studio'|'Media'|'Text'|'Caption';target:VisibilityTarget;visible:boolean};
export function coverFrameItems(project:Project,frame:number):CoverFrameItem[]{
  const scene=coverSceneProject(project),present=(item:{start:number;duration:number})=>item.start<=frame&&frame<item.start+item.duration;
  const items=timelineLayers(scene).flatMap((layer):CoverFrameItem[]=>{
    if(layer.kind==='text'){
      if(!present(layer.text))return [];
      const target:VisibilityTarget={kind:'text',id:layer.text.id};
      return [{id:layer.text.id,name:layer.text.text||'Empty text',kind:'Text',target,visible:itemVisible(scene,target)}];
    }
    if(layer.kind==='caption')return layer.layer.cues.filter(present).map(cue=>{
      const target:VisibilityTarget={kind:'caption',id:cue.id};
      return {id:cue.id,name:cueText(cue),kind:'Caption',target,visible:itemVisible(scene,target)&&!layer.layer.muted&&!!project.cover?.showCaptions};
    });
    return scene.clips.filter(c=>c.trackId===layer.id&&c.kind==='video'&&present(c)).map(c=>{
      const target:VisibilityTarget={kind:'clip',id:c.id};
      return {id:c.id,name:c.name,kind:c.studio?'Studio':'Media',target,visible:itemVisible(scene,target)};
    });
  });
  return [...(project.cover?.texts??[]).map(text=>({id:text.id,name:text.text||'Empty text',kind:'Text' as const,target:{kind:'cover' as const,id:text.id},visible:!text.hidden})),...items];
}

export function moveCoverFrame(project:Project,frame:number):Project{
  const cover={...defaultCover,...project.cover,frame};
  if(!cover.scene)return {...project,cover};
  const clipIds=new Set(project.clips.map(c=>c.id));
  const textIds=new Set(project.texts?.map(t=>t.id));
  const cueIds=new Set(project.captions?.flatMap(l=>l.cues.map(c=>c.id)));
  return {...project,cover:{...cover,scene:{...cover.scene,
    clips:cover.scene.clips.map(c=>clipIds.has(c.id)?c:{...c,start:frame}),
    texts:cover.scene.texts?.map(t=>textIds.has(t.id)?t:{...t,start:frame}),
    captions:cover.scene.captions?.map(l=>({...l,cues:l.cues.map(c=>cueIds.has(c.id)?c:{...c,start:frame})})),
  }}};
}
