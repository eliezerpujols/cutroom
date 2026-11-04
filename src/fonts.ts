import catalog from './google-fonts.json';
import type {Project} from './model';
export const fontFamilies=['Inter Variable','DM Sans Variable','Manrope Variable','Peacock'] as const;
export type FontFamily=string;
export const fontLabel=(family:FontFamily)=>family==='Peacock'?'Peacock Bold':family.replace(' Variable','');
export const googleFonts=catalog.families;
export const isBundledFont=(family:string)=>fontFamilies.some(font=>font===family);
const knownFonts=new Set<string>([...fontFamilies,...googleFonts.map(font=>font.family)]);
export const isKnownFont=(family:string)=>knownFonts.has(family);
export function projectFontFamilies(project:Project){return [...new Set([
  ...(project.texts??[]).map(text=>text.fontFamily),...(project.cover?.texts??[]).map(text=>text.fontFamily),
  ...(project.captions??[]).flatMap(layer=>[layer.style.fontFamily,...layer.cues.map(cue=>cue.style?.fontFamily).filter((font):font is string=>!!font)])
])].sort();}
export type FontFile={file:string;weight:string;style:string;unicodeRange?:string};
export type FontManifest={family:string;faces:FontFile[]};

export const fontCategories=[['All','All'],['Sans Serif','Sans'],['Serif','Serif'],['Display','Display'],['Handwriting','Script'],['Monospace','Mono']] as const;
export type FontCategory=typeof fontCategories[number][0];
const categoryByFamily=new Map(googleFonts.map(font=>[font.family,font.category]));
export const fontCategory=(family:string)=>family==='Peacock'?'Display':categoryByFamily.get(fontLabel(family));
export function fontPickerOptions({query='',category='All',installed=[],value}:{query?:string;category?:FontCategory;installed?:readonly string[];value?:string}){
  const local=[...new Set<string>([...fontFamilies,...installed,...(value?[value]:[])])].filter(isKnownFont);
  const bundledLabels=new Set(fontFamilies.map(fontLabel));
  const uniqueLocal=local.filter(font=>isBundledFont(font)||!bundledLabels.has(fontLabel(font)));
  const localLabels=new Set(uniqueLocal.map(fontLabel));
  const q=query.trim().toLocaleLowerCase(),matches=(family:string)=>fontLabel(family).toLocaleLowerCase().includes(q)&&(category==='All'||fontCategory(family)===category);
  const alphabetical=(a:string,b:string)=>fontLabel(a).localeCompare(fontLabel(b),'en',{sensitivity:'base',numeric:true});
  return [...uniqueLocal.filter(matches).sort(alphabetical).map(family=>({family,local:true})),...googleFonts.map(font=>font.family).filter(family=>!localLabels.has(family)&&matches(family)).sort(alphabetical).map(family=>({family,local:false}))];
}
