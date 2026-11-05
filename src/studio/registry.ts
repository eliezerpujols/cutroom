import {cardArtUrl,creatorCardArt} from './creatorCards';
import type {Asset,Clip,Project} from '../model';
import {placeTimelineClip} from '../videoTracks';
export type StudioField={key:string;label:string;type:'text'|'color'|'number';default:string|number;min?:number;max?:number;step?:number;unit?:string};
export type StudioInstance={template:string;props:Record<string,string|number>};
const creatorTemplates=[
  {id:'lesson-player',name:'Lesson player',accent:'#C9AD53'},
  {id:'social-post',name:'Social post',accent:'#BE6452'},
  {id:'price-editor',name:'Price editor',accent:'#CCAA52'},
].map(({id,name,accent})=>({
  id,name,width:400,height:312,duration:64,
  fields:[
    {key:'accent',type:'color',label:'Accent',default:accent},
    {key:'language',type:'text',label:'Language (es / en)',default:'es'},
    ...(id==='price-editor'?[{key:'amount',type:'text' as const,label:'Price',default:'$25'}]:[]),
  ] satisfies StudioField[],
}));
export const studioTemplates=[{id:'orbit-card',name:'Orbit card',width:800,height:480,duration:120,fields:[
  {key:'title',label:'Name',type:'text',default:'Alex Morgan'},
  {key:'subtitle',label:'Subtitle',type:'text',default:'Designer & creator'},
  {key:'tag',label:'Label',type:'text',default:'LET’S CREATE'},
  {key:'background',label:'Card',type:'color',default:'#203E35'},
  {key:'color',label:'Text',type:'color',default:'#F4F5EC'},
  {key:'accent',label:'Accent',type:'color',default:'#D3E8B5'},
  {key:'turnSeconds',label:'Turn time',type:'number',default:2.4,min:.6,max:10,step:.1,unit:'s'},
] satisfies StudioField[]},{
  id:'spoken-question', name:'Spoken question', width:800, height:480, duration:55,
  fields:[
    {key:'lead',label:'Opening line',type:'text',default:'¿Quién iría a'},
    {key:'word',label:'Emphasis',type:'text',default:'PAGAR'},
    {key:'ending',label:'Closing line',type:'text',default:'por esto?'},
    {key:'ink',label:'Lettering',type:'color',default:'#FFF1D4'},
    {key:'accent',label:'Emphasis color',type:'color',default:'#FFDF83'},
    {key:'wordBeat',label:'Emphasis at',type:'number',default:17,min:0,max:150,step:1,unit:'fr'},
    {key:'endBeat',label:'Closing line at',type:'number',default:26,min:0,max:150,step:1,unit:'fr'},
  ] satisfies StudioField[]
},{
  id:'product-tile', name:'Product tile', width:400, height:456, duration:56,
  fields:[
    {key:'price',label:'Price',type:'text',default:'$25'},
    {key:'accent',label:'Price backing',type:'color',default:'#FFDF83'},
    {key:'priceBeat',label:'Price at',type:'number',default:7,min:0,max:150,step:1,unit:'fr'},
  ] satisfies StudioField[]
},{
  id:'heart-pop', name:'Heart pop', width:480, height:480, duration:143,
  fields:[{key:'color',label:'Heart color',type:'color',default:'#F6AACB'}] satisfies StudioField[]
},...creatorTemplates];
export function studioDefaults(id:string){const template=studioTemplates.find(t=>t.id===id);if(!template)throw new Error('Unknown Studio element.');return Object.fromEntries(template.fields.map(f=>[f.key,f.default]));}
const thumbnail='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480"><rect width="800" height="480" rx="64" fill="#203e35"/><circle cx="670" cy="100" r="40" fill="#d3e8b5"/><text x="65" y="285" font-family="sans-serif" font-size="70" fill="#f4f5ec">Orbit card</text><path d="M65 340h300" stroke="#d3e8b5" stroke-width="12"/></svg>');
const questionThumbnail='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480"><text x="30" y="100" fill="#fff1d4" font-family="serif" font-style="italic" font-size="76">¿Quién iría a</text><text x="25" y="295" font-family="sans-serif" font-weight="900" font-size="204" fill="#ffdf83">PAGAR</text><path d="M35 320 Q330 298 760 310" fill="none" stroke="#ffdf83" stroke-width="6"/><text x="755" y="395" text-anchor="end" font-style="italic" font-size="68" fill="#fff1d4">por esto?</text></svg>');
const tileThumbnail='/studio/product-tile.svg';
export const studioAssets:Asset[]=studioTemplates.map(t=>{const preview=t.id==='heart-pop'?'/studio/heart-pop.png':creatorCardArt[t.id]?cardArtUrl(t.id):t.id==='product-tile'?tileThumbnail:t.id==='spoken-question'?questionThumbnail:thumbnail;return {id:`studio-${t.id}`,name:t.name,kind:'image',duration:3600,frames:108000,width:t.width,height:t.height,hasAudio:false,url:preview,thumbnails:[preview],peaks:[]};});
export const withStudioAssets=(assets:Asset[])=>[...assets.filter(a=>!studioAssets.some(s=>s.id===a.id)),...studioAssets];
export function addStudioElement(project:Project,templateId:string,start:number,id:string,trackId?:string):Project{
  const t=studioTemplates.find(t=>t.id===templateId);if(!t)throw new Error('Unknown Studio element.');
  const clip:Clip={id,assetId:`studio-${t.id}`,name:t.name,trackId:project.tracks.find(t=>t.id===trackId&&t.kind==='video')?.id??project.tracks.find(t=>t.kind==='video')?.id??'',kind:'video',start:Math.max(0,Math.round(start)),duration:t.duration,sourceIn:0,rate:1,volume:0,muted:false,fadeIn:0,fadeOut:0,overlay:{x:50,y:50,width:75},studio:{template:t.id,props:studioDefaults(t.id)}};
  return placeTimelineClip(project,clip);
}
// Frame is local to the element. Trims and splits preserve the original phase.
export function orbitPose(frame:number,seconds:number){const p=Math.max(0,Math.min(1,frame/(Math.max(.6,seconds)*30))),ease=p*p*(3-2*p);return {rotateY:360*ease,rotateX:Math.sin(p*Math.PI*2)*12,lift:-Math.sin(p*Math.PI)*18};}
