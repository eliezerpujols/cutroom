import {clamp,uid,type Clip,type Project} from './model';
import {defaultCover,type CoverText} from './visuals';
import {defaultVideoText,type VideoText} from './videoText';
import type {CaptionLayer} from './captions';

export type ObjectSelection={kind:'cover';id:string|null}|{kind:'text';id:string|null}|{kind:'media';ids:string[]}|{kind:'caption';layerId:string;cueId?:string};
export type EditorClipboard={kind:'cover';text:CoverText}|{kind:'text';text:VideoText}|{kind:'media';clips:Clip[]}|{kind:'caption';layer:CaptionLayer;cueOnly:boolean};
export function copyEditorSelection(project:Project,selection:ObjectSelection):EditorClipboard|null{
  if(selection.kind==='cover'){const text=project.cover?.texts.find(item=>item.id===selection.id);return text?{kind:'cover',text:structuredClone(text)}:null;}
  if(selection.kind==='text'){const text=project.texts?.find(item=>item.id===selection.id);return text?{kind:'text',text:structuredClone(text)}:null;}
  if(selection.kind==='media'){const clips=project.clips.filter(clip=>selection.ids.includes(clip.id));return clips.length?{kind:'media',clips:structuredClone(clips)}:null;}
  const layer=project.captions?.find(item=>item.id===selection.layerId),cue=layer?.cues.find(item=>item.id===selection.cueId);
  if(!layer||(selection.cueId&&!cue))return null;
  return {kind:'caption',layer:structuredClone({...layer,cues:cue?[cue]:layer.cues}),cueOnly:!!cue};
}
export function removeEditorSelection(project:Project,selection:ObjectSelection):Project{
  if(selection.kind==='cover')return {...project,cover:{...defaultCover,...project.cover,texts:project.cover?.texts.filter(item=>item.id!==selection.id)||[]}};
  if(selection.kind==='text')return {...project,texts:project.texts?.filter(item=>item.id!==selection.id)};
  if(selection.kind==='media')return {...project,clips:project.clips.filter(clip=>!selection.ids.includes(clip.id))};
  return {...project,captions:selection.cueId?project.captions?.map(layer=>layer.id===selection.layerId?{...layer,cues:layer.cues.filter(cue=>cue.id!==selection.cueId)}:layer):project.captions?.filter(layer=>layer.id!==selection.layerId)};
}
function startsAt<T extends {start:number}>(items:T[],at:number):T[]{
  const first=Math.min(...items.map(item=>item.start)),delta=Math.max(0,Math.round(at))-first;
  if(items.some(item=>item.start+delta>108000))throw new Error('Move the playhead earlier to keep this selection inside the timeline limit.');
  return items.map(item=>({...item,start:item.start+delta}));
}
export function pasteEditorClipboard(project:Project,clipboard:EditorClipboard,coverMode:boolean,frame:number,duplicate=false):{project:Project;selection:ObjectSelection}{
  if(clipboard.kind==='cover'||clipboard.kind==='text'){
    const source=clipboard.text;
    if(coverMode){
      const cover=project.cover||defaultCover;if(cover.texts.length>=12)throw new Error('Remove an unused cover title before adding another.');
      // Strip timeline-only fields when moving video text onto a cover.
      const {start:_start,duration:_duration,muted:_muted,...style}={...defaultVideoText,...source};
      const text={...style,id:uid(),x:clamp(source.x+2,0,100),y:clamp(source.y+2,0,100)};
      return {project:{...project,cover:{...cover,texts:[...cover.texts,text]}},selection:{kind:'cover',id:text.id}};
    }
    if((project.texts?.length||0)>=100)throw new Error('Remove an unused text clip before adding another.');
    const start=duplicate&&clipboard.kind==='text'?Math.min(108000,clipboard.text.start+clipboard.text.duration):clamp(Math.round(frame),0,108000);
    const text={...defaultVideoText,...source,id:uid(),start};
    return {project:{...project,texts:[text,...(project.texts||[])]},selection:{kind:'text',id:text.id}};
  }
  if(coverMode)throw new Error('Close the cover panel to paste timeline clips.');
  if(clipboard.kind==='media'){
    if(project.clips.length+clipboard.clips.length>300)throw new Error('Remove unused clips before pasting this selection.');
    const at=duplicate?Math.max(...clipboard.clips.map(clip=>clip.start+clip.duration)):frame;
    const clips=startsAt(clipboard.clips,at).map(clip=>({...structuredClone(clip),id:uid()}));
    return {project:{...project,clips:[...project.clips,...clips]},selection:{kind:'media',ids:clips.map(clip=>clip.id)}};
  }
  const source=clipboard.layer,at=duplicate?Math.max(0,...source.cues.map(cue=>cue.start+cue.duration)):frame;
  const cues=startsAt(source.cues,at).map(cue=>({...structuredClone(cue),id:uid()}));
  const existing=clipboard.cueOnly?project.captions?.find(layer=>layer.id===source.id):undefined;
  if(existing){
    if(existing.cues.length+cues.length>1000)throw new Error('This caption layer has reached its cue limit.');
    return {project:{...project,captions:project.captions?.map(layer=>layer.id===existing.id?{...layer,cues:[...layer.cues,...cues].sort((a,b)=>a.start-b.start)}:layer)},selection:{kind:'caption',layerId:existing.id,cueId:cues[0]?.id}};
  }
  if((project.captions?.length||0)>=4)throw new Error('Remove an unused caption layer before pasting another.');
  const layer={...structuredClone(source),id:uid(),cues,sourceJobId:undefined};
  return {project:{...project,captions:[...(project.captions||[]),layer]},selection:{kind:'caption',layerId:layer.id,...(clipboard.cueOnly?{cueId:cues[0]?.id}:{})}};
}
