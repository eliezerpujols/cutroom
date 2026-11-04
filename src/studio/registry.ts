import type {Asset,Clip,Project} from '../model';
import {placeTimelineClip} from '../videoTracks';
export type StudioField={key:string;label:string;type:'text'|'color'|'number';default:string|number;min?:number;max?:number;step?:number;unit?:string};
export type StudioInstance={template:string;props:Record<string,string|number>};
export const studioTemplates=[{id:'orbit-card',name:'Orbit card',width:800,height:480,duration:120,fields:[
  {key:'title',label:'Name',type:'text',default:'Alex Morgan'},
  {key:'subtitle',label:'Subtitle',type:'text',default:'Designer & creator'},
  {key:'tag',label:'Label',type:'text',default:'LET’S CREATE'},
  {key:'background',label:'Card',type:'color',default:'#203E35'},
  {key:'color',label:'Text',type:'color',default:'#F4F5EC'},
  {key:'accent',label:'Accent',type:'color',default:'#D3E8B5'},
  {key:'turnSeconds',label:'Turn time',type:'number',default:2.4,min:.6,max:10,step:.1,unit:'s'},
] satisfies StudioField[]}];
export function studioDefaults(id:string){const template=studioTemplates.find(t=>t.id===id);if(!template)throw new Error('Unknown Studio element.');return Object.fromEntries(template.fields.map(f=>[f.key,f.default]));}
const thumbnail='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480"><rect width="800" height="480" rx="38" fill="#203e35"/><circle cx="670" cy="100" r="40" fill="#d3e8b5"/><text x="65" y="285" font-family="sans-serif" font-size="70" fill="#f4f5ec">Orbit card</text><path d="M65 340h300" stroke="#d3e8b5" stroke-width="12"/></svg>');
export const studioAssets:Asset[]=studioTemplates.map(t=>({id:`studio-${t.id}`,name:t.name,kind:'image',duration:3600,frames:108000,width:t.width,height:t.height,hasAudio:false,url:thumbnail,thumbnails:[thumbnail],peaks:[]}));
export const withStudioAssets=(assets:Asset[])=>[...assets.filter(a=>!studioAssets.some(s=>s.id===a.id)),...studioAssets];
export function addStudioElement(project:Project,templateId:string,start:number,id:string,trackId?:string):Project{
  const t=studioTemplates.find(t=>t.id===templateId);if(!t)throw new Error('Unknown Studio element.');
  const clip:Clip={id,assetId:`studio-${t.id}`,name:t.name,trackId:project.tracks.find(t=>t.id===trackId&&t.kind==='video')?.id??project.tracks.find(t=>t.kind==='video')?.id??'',kind:'video',start:Math.max(0,Math.round(start)),duration:t.duration,sourceIn:0,rate:1,volume:0,muted:false,fadeIn:0,fadeOut:0,overlay:{x:50,y:50,width:75},studio:{template:t.id,props:studioDefaults(t.id)}};
  return placeTimelineClip(project,clip);
}
// Frame is local to the element. Trims and splits preserve the original phase.
export function orbitPose(frame:number,seconds:number){const p=Math.max(0,Math.min(1,frame/(Math.max(.6,seconds)*30))),ease=p*p*(3-2*p);return {rotateY:360*ease,rotateX:Math.sin(p*Math.PI*2)*12,lift:-Math.sin(p*Math.PI)*18};}
