import {FPS,type Project} from './model';
import {defaultCoverText,type CoverText} from './visuals';

export type VideoText=CoverText&{start:number;duration:number;muted:boolean};
export type TextPreset='heading'|'subtitle'|'body';
export const defaultVideoText:Omit<VideoText,'id'>={...defaultCoverText,text:'Your text here',fontSize:64,fontWeight:700,color:'#ffffff',fill:'none',stroke:true,strokeWidth:3,y:50,start:0,duration:FPS*3,muted:false};
export function makeVideoText(id:string,start:number,preset:TextPreset='heading'):VideoText{
  return {...defaultVideoText,id,start,...(preset==='subtitle'?{text:'Your subtitle here',fontSize:44,fontWeight:600,strokeWidth:2,y:76}:preset==='body'?{fontSize:36,fontWeight:400,strokeWidth:1.5}:{} )};
}
export function splitVideoText(text:VideoText,frame:number,rightId:string):VideoText[]{
  if(frame<=text.start||frame>=text.start+text.duration)return [text];
  return [{...text,duration:frame-text.start},{...text,id:rightId,start:frame,duration:text.start+text.duration-frame}];
}
export const visibleVideoText=(project:Project,frame:number)=>(project.texts||[]).filter(text=>!text.muted&&text.start<=frame&&frame<text.start+text.duration);
