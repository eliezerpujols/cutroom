import type {Project} from './model';
export type VisibilityTarget={kind:'clip'|'text'|'cover'|'caption'|'caption-layer';id:string};
export function itemVisible(project:Project,target:VisibilityTarget):boolean{
  if(target.kind==='clip'){const clip=project.clips.find(item=>item.id===target.id);return !!clip&&(clip.kind==='audio'?!clip.muted:!clip.hidden);}
  if(target.kind==='text'){const text=project.texts?.find(item=>item.id===target.id);return !!text&&!text.muted&&!text.hidden;}
  if(target.kind==='cover')return !!project.cover?.texts.some(item=>item.id===target.id&&!item.hidden);
  if(target.kind==='caption-layer')return !!project.captions?.some(item=>item.id===target.id&&!item.muted);
  return !!project.captions?.some(layer=>layer.cues.some(cue=>cue.id===target.id&&!cue.hidden));
}
export function selectionVisibility(project:Project,targets:VisibilityTarget[]):boolean|'mixed'{
  const shown=targets.filter(target=>itemVisible(project,target)).length;return shown===targets.length?true:shown===0?false:'mixed';
}
export function selectionVisibilityTargets(project:Project,ids:readonly string[]):VisibilityTarget[]{
  const selected=new Set(ids);return [...project.clips.filter(item=>selected.has(item.id)).map(item=>({kind:'clip' as const,id:item.id})),...(project.texts||[]).filter(item=>selected.has(item.id)).map(item=>({kind:'text' as const,id:item.id})),...(project.captions||[]).flatMap(layer=>layer.cues.filter(item=>selected.has(item.id)).map(item=>({kind:'caption' as const,id:item.id})))];
}
export function setItemVisibility(project:Project,targets:VisibilityTarget[],visible:boolean):Project{
  const ids=(kind:VisibilityTarget['kind'])=>new Set(targets.filter(target=>target.kind===kind).map(target=>target.id));
  const clips=ids('clip'),texts=ids('text'),covers=ids('cover'),cues=ids('caption'),layers=ids('caption-layer');
  return {...project,clips:project.clips.map(clip=>clips.has(clip.id)?clip.kind==='audio'?{...clip,muted:!visible}:{...clip,hidden:!visible}:clip),
    ...(project.texts?{texts:project.texts.map(text=>texts.has(text.id)?{...text,muted:!visible,hidden:false}:text)}:{}),
    ...(project.cover?{cover:{...project.cover,texts:project.cover.texts.map(text=>covers.has(text.id)?{...text,hidden:!visible}:text)}}:{}),
    ...(project.captions?{captions:project.captions.map(layer=>({...layer,muted:layers.has(layer.id)?!visible:layer.muted,cues:layer.cues.map(cue=>cues.has(cue.id)?{...cue,hidden:!visible}:cue)}))}:{})};
}
