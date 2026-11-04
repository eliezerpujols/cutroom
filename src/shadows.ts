export type ShadowKind='drop'|'inner';
export type ShadowSettings={enabled:boolean;color:string;opacity:number;blur:number;x:number;y:number};
// Keep the original single-shadow fields readable for existing project files.
export type TextShadow={mode:'none'|ShadowKind;color:string;opacity:number;blur:number;x:number;y:number;drop?:Partial<ShadowSettings>;inner?:Partial<ShadowSettings>};
export const defaultShadow:TextShadow={mode:'none',color:'#000000',opacity:60,blur:8,x:0,y:4};
export function resolveShadow(shadow:Partial<TextShadow>|undefined,kind:ShadowKind):ShadowSettings{
  const legacy={...defaultShadow,...shadow};
  const {color,opacity,blur,x,y}=legacy.mode===kind?legacy:defaultShadow;
  return {enabled:legacy.mode===kind,color,opacity,blur,x,y,...shadow?.[kind]};
}
export function mergeTextShadows(base:Partial<TextShadow>|undefined,patch:Partial<TextShadow>|undefined):Partial<TextShadow>{
  return {...base,...patch,...(base?.drop||patch?.drop?{drop:{...base?.drop,...patch?.drop}}:{}),...(base?.inner||patch?.inner?{inner:{...base?.inner,...patch?.inner}}:{})};
}
export function clearShadowOverrides(base:Partial<TextShadow>,patch:Partial<TextShadow>):Partial<TextShadow>{
  const next={...base};
  for(const key of Object.keys(patch) as (keyof TextShadow)[]){
    if((key==='drop'||key==='inner')&&next[key]&&patch[key]){
      const layer={...next[key]};for(const field of Object.keys(patch[key]!) as (keyof ShadowSettings)[])delete layer[field];
      if(Object.keys(layer).length)next[key]=layer;else delete next[key];
    }else delete next[key];
  }
  return next;
}
