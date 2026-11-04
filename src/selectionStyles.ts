import {clearShadowOverrides} from './shadows';
import {mergeShadow} from './effects';
import type {Project} from './model';
import {textLineHeight,type CoverText} from './visuals';
import {effectiveCaptionStyle,type CaptionCue,type CaptionLayer,type CaptionStyle} from './captions';

export type SelectionStyle=Omit<CoverText,'id'|'text'>&Pick<CaptionStyle,'display'|'motion'|'highlight'|'highlightColor'|'highlightMotion'>;
export type SelectionStylePatch=Partial<SelectionStyle>;
const textKeys=['shadow','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','italic','color','stroke','strokeColor','strokeWidth','fill','fillColor','padding','radius','x','y','width','align'] as const;
const captionKeys=['shadow','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color','stroke','strokeColor','strokeWidth','display','motion','highlight','highlightColor','highlightMotion','x','y','width','align'] as const;

function only<K extends keyof SelectionStyle>(patch:SelectionStylePatch,keys:readonly K[]):Pick<SelectionStylePatch,K>{
  return Object.fromEntries(keys.filter(key=>patch[key]!==undefined).map(key=>[key,patch[key]])) as Pick<SelectionStylePatch,K>;
}
function clearOverrides(cue:CaptionCue,patch:Partial<CaptionStyle>):CaptionCue{
  if(!cue.style)return cue;
  const style={...cue.style};for(const key of Object.keys(patch) as (keyof CaptionStyle)[]){if(key==='shadow'&&style.shadow&&patch.shadow){const shadow=clearShadowOverrides(style.shadow,patch.shadow);if(Object.keys(shadow).length)style.shadow=shadow;else delete style.shadow;}else delete style[key];}
  if(Object.keys(style).length)return {...cue,style};
  const {style:_style,...rest}=cue;return rest;
}
export function patchCaptionLayerStyle(layer:CaptionLayer,patch:Partial<CaptionStyle>):CaptionLayer{
  return {...layer,style:mergeShadow(layer.style,patch),cues:layer.cues.map(cue=>clearOverrides(cue,patch))};
}
export function patchSelectionStyles(project:Project,ids:readonly string[],patch:SelectionStylePatch):Project{
  const selected=new Set(ids),textPatch=only(patch,textKeys),captionPatch=only(patch,captionKeys);
  return {...project,
    texts:Object.keys(textPatch).length?project.texts?.map(text=>selected.has(text.id)?mergeShadow(text,textPatch):text):project.texts,
    captions:Object.keys(captionPatch).length?project.captions?.map(layer=>{
      const cues=layer.cues.filter(cue=>selected.has(cue.id));if(!cues.length)return layer;
      // A whole layer keeps its shared style. A partial selection needs cue overrides.
      if(cues.length===layer.cues.length)return patchCaptionLayerStyle(layer,captionPatch);
      return {...layer,cues:layer.cues.map(cue=>selected.has(cue.id)?{...cue,style:mergeShadow({...cue.style,...(captionPatch.shadow?{shadow:effectiveCaptionStyle(layer,cue).shadow}:{})},captionPatch)}:cue)};
    }):project.captions,
  };
}
export function selectedStyles(project:Project,ids:readonly string[]){
  const selected=new Set(ids);
  const texts=(project.texts||[]).filter(text=>selected.has(text.id)).map(text=>({...text,lineHeight:textLineHeight(text),letterSpacing:text.letterSpacing??-.02}));
  const captions=(project.captions||[]).flatMap(layer=>layer.cues.filter(cue=>selected.has(cue.id)).map(cue=>{
    const style=effectiveCaptionStyle(layer,cue);return {...style,lineHeight:style.lineHeight??1.2,letterSpacing:style.letterSpacing??0,x:style.x??50,width:style.width??88,align:style.align??'center'};
  }));
  return {texts,captions,all:[...texts,...captions] as Partial<SelectionStyle>[]};
}
export function sharedStyleValue<K extends keyof SelectionStyle>(styles:Partial<SelectionStyle>[],key:K):SelectionStyle[K]|undefined{
  const normalize=(value:SelectionStyle[K]|undefined)=>typeof value==='string'&&value.startsWith('#')?value.toLowerCase():value;
  const first=normalize(styles[0]?.[key]);return styles.length&&styles.every(style=>Object.is(normalize(style[key]),first))?first as SelectionStyle[K]:undefined;
}
