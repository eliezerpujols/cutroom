import {clamp,clipsInRenderOrder,endFrame,type Asset,type Project} from './model';

export type VisualAdjustments={preset:'none'|'clean'|'warm'|'cool'|'cinema'|'mono';intensity:number;exposure:number;brightness:number;contrast:number;saturation:number;warmth:number;tint:number};
export const defaultAdjustments:VisualAdjustments={preset:'none',intensity:100,exposure:0,brightness:0,contrast:0,saturation:0,warmth:0,tint:0};
export const visualPresets=[{id:'none',name:'Original',values:{}},{id:'clean',name:'Clean',values:{brightness:5,contrast:8,saturation:8}},{id:'warm',name:'Warm',values:{warmth:45,saturation:8}},{id:'cool',name:'Cool',values:{warmth:-40,contrast:5}},{id:'cinema',name:'Cinema',values:{contrast:20,saturation:-18,warmth:12}},{id:'mono',name:'Mono',values:{saturation:-100,contrast:12}}] as const;
export function resolvedAdjustments(input?:Partial<VisualAdjustments>):VisualAdjustments{
  const value={...defaultAdjustments,...input},preset=visualPresets.find(p=>p.id===value.preset)?.values||{};
  for(const [key,amount] of Object.entries(preset))value[key as 'brightness']+=Number(amount)*value.intensity/100;
  return {...value,brightness:clamp(value.brightness,-100,100),contrast:clamp(value.contrast,-100,100),saturation:clamp(value.saturation,-100,100),warmth:clamp(value.warmth,-100,100),tint:clamp(value.tint,-100,100)};
}
export function adjustmentFilter(input?:Partial<VisualAdjustments>){const a=resolvedAdjustments(input);return `brightness(${2**a.exposure*Math.max(0,1+a.brightness/100)}) contrast(${1+a.contrast/100}) saturate(${1+a.saturation/100})`;}
export function colorMatrix(input?:Partial<VisualAdjustments>){const a=resolvedAdjustments(input),w=a.warmth/100,t=a.tint/100;return `${1+w*.15+t*.05} 0 0 0 0 0 ${1-t*.12} 0 0 0 0 0 ${1-w*.15+t*.05} 0 0 0 0 0 1 0`;}
export const hasAdjustments=(input?:Partial<VisualAdjustments>)=>!!input&&Object.keys(defaultAdjustments).some(key=>input[key as keyof VisualAdjustments]!==undefined&&input[key as keyof VisualAdjustments]!==defaultAdjustments[key as keyof VisualAdjustments]);

export type CoverText={id:string;text:string;fontFamily:'Inter Variable'|'DM Sans Variable'|'Manrope Variable';fontSize:number;fontWeight:number;italic:boolean;color:string;stroke:boolean;strokeColor:string;strokeWidth:number;fill:'none'|'box'|'lines';fillColor:string;padding:number;radius:number;x:number;y:number;width:number;align:'left'|'center'|'right'};
export type Cover={frame:number;showCaptions:boolean;texts:CoverText[]};
export const defaultCover:Cover={frame:0,showCaptions:false,texts:[]};
export const defaultCoverText:Omit<CoverText,'id'>={text:'Your title here',fontFamily:'Inter Variable',fontSize:76,fontWeight:800,italic:false,color:'#111111',stroke:false,strokeColor:'#111111',strokeWidth:3,fill:'box',fillColor:'#ffffff',padding:24,radius:46,x:50,y:18,width:84,align:'center'};
export const coverFrame=(project:Project)=>clamp(Math.round(project.cover?.frame||0),0,endFrame(project)-1);
// Existing cached thumbnails keep the picker lightweight; the main canvas uses
// the exact timeline frame, including upper tracks and clip-level adjustments.
export function frameThumbnail(project:Project,assets:Asset[],frame:number):string|undefined{
  const clip=clipsInRenderOrder(project).reverse().find(c=>c.kind==='video'&&c.start<=frame&&frame<c.start+c.duration);
  const asset=assets.find(a=>a.id===clip?.assetId);if(!clip||!asset||asset.missing)return;
  const source=clip.sourceIn+(frame-clip.start)*clip.rate;
  return asset.thumbnails[asset.kind==='image'?0:clamp(Math.floor(source/asset.frames*asset.thumbnails.length),0,asset.thumbnails.length-1)];
}
