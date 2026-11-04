import type {Project} from './model';
import type {VideoText} from './videoText';
import type {CaptionCue,CaptionLayer} from './captions';
// Text titles may have independent lanes. Only join non-overlapping titles at
// the same position; captions join within their own layer, across a small gap.
export function previousTitle(project:Project,text:VideoText){return project.texts?.filter(previous=>previous.id!==text.id&&!previous.hidden&&!previous.muted&&previous.start+previous.duration===text.start&&Math.abs(previous.x-text.x)<1&&Math.abs(previous.y-text.y)<1).sort((a,b)=>b.start-a.start)[0];}
export function previousCaption(layer:CaptionLayer,cue:CaptionCue){return layer.cues.filter(previous=>previous.id!==cue.id&&previous.words.length>0&&!previous.hidden&&previous.start+previous.duration<=cue.start&&cue.start-(previous.start+previous.duration)<=30).sort((a,b)=>b.start-a.start)[0];}
export function textTransitionTargets(project:Project,ids:readonly string[]){const selected=new Set(ids);return [...(project.texts??[]).filter(text=>selected.has(text.id)&&previousTitle(project,text)),...(project.captions??[]).flatMap(layer=>layer.cues.filter(cue=>selected.has(cue.id)&&previousCaption(layer,cue)))];}
