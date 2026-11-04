import {mergeTextShadows} from './shadows';
import {FPS,clamp,uid} from './model';
import type {FontFamily} from './fonts';

export type CaptionWord={text:string;start:number;end:number};
export type CaptionCue={effects?:import('./effects').Effects;hidden?:boolean;id:string;start:number;duration:number;words:CaptionWord[];style?:Partial<CaptionStyle>};
export type CaptionStyle={shadow?:Partial<import('./effects').TextShadow>;fontFamily:FontFamily;fontSize:number;fontWeight:number;lineHeight?:number;letterSpacing?:number;color:string;stroke:boolean;strokeColor:string;strokeWidth:number;display:'word'|'phrase'|'sentence';motion:'none'|'fade'|'pop';highlight:boolean;highlightColor:string;x?:number;y:number;width?:number;align?:'left'|'center'|'right'};
export type CaptionLayer={id:string;name:string;muted:boolean;language:string;style:CaptionStyle;cues:CaptionCue[];sourceJobId?:string;sourceSignature?:string};
export type CaptionSelection={layerId:string;cueId?:string}|null;
export const defaultCaptionStyle:CaptionStyle={fontFamily:'Inter Variable',fontSize:56,fontWeight:700,color:'#ffffff',stroke:true,strokeColor:'#111111',strokeWidth:3,display:'phrase',motion:'none',highlight:false,highlightColor:'#d9efad',y:82};
export const cueText=(cue:CaptionCue)=>cue.words.map(word=>word.text).join(' ');
export const effectiveCaptionStyle=(layer:CaptionLayer,cue:CaptionCue):CaptionStyle=>({...layer.style,...cue.style,...(layer.style.shadow||cue.style?.shadow?{shadow:mergeTextShadows(layer.style.shadow,cue.style?.shadow)}:{})});

// Use the same active phrase for both the rendered caption and its canvas controls.
export function activeCaptionCue(layer:CaptionLayer,frame:number){
  if(layer.muted)return undefined;
  let active:CaptionCue|undefined;for(const cue of layer.cues)if(!cue.hidden&&frame>=cue.start&&frame<cue.start+cue.duration)active=cue;return active;
}
export function captionWindow(cue:CaptionCue,style:CaptionStyle,frame:number){
  const local=frame-cue.start;
  let active=0;for(let index=0;index<cue.words.length;index++)if(cue.words[index].start<=local)active=index;
  const start=style.display==='word'?active:style.display==='phrase'?Math.floor(active/6)*6:0;
  const words=style.display==='word'?cue.words.slice(start,start+1):style.display==='phrase'?cue.words.slice(start,start+6):cue.words;
  return {local,active,start,words};
}

export function captionsFromWords(words:CaptionWord[]):CaptionCue[]{
  const cues:CaptionCue[]=[];let group:CaptionWord[]=[];
  const flush=()=>{if(!group.length)return;const start=group[0].start,end=Math.max(...group.map(word=>word.end));cues.push({id:uid(),start,duration:Math.max(1,end-start),words:group.map(word=>({...word,start:word.start-start,end:word.end-start}))});group=[];};
  for(const word of words){
    const previous=group.at(-1);
    if(previous&&(word.start-previous.end>FPS*.7||group.length>=16||word.end-group[0].start>FPS*8||group.map(w=>w.text).join(' ').length+word.text.length>110))flush();
    group.push(word);if(/[.!?。！？]["'”’)]?$/.test(word.text))flush();
  }
  flush();return cues;
}

export function replaceCueText(cue:CaptionCue,text:string):CaptionCue{
  const tokens=text.trim().split(/\s+/u).filter(Boolean);
  if(tokens.length>100||tokens.some(token=>token.length>200))throw new Error('Use up to 100 words per caption, with fewer than 200 characters per word.');
  if(tokens.length===cue.words.length)return {...cue,words:cue.words.map((word,index)=>({...word,text:tokens[index]}))};
  const total=tokens.reduce((sum,word)=>sum+word.length,0);let cursor=0;
  const words=tokens.map(word=>{const start=clamp(Math.round(cursor),0,cue.duration-1);cursor+=word.length/Math.max(1,total)*cue.duration;return {text:word,start,end:clamp(Math.round(cursor),start+1,cue.duration)};});
  return {...cue,words};
}

export function captionSourceSignature(project:import('./model').Project){return JSON.stringify(project.clips.filter(clip=>!clip.muted&&clip.volume>0&&!project.tracks.find(track=>track.id===clip.trackId)?.muted).map(({assetId,start,duration,sourceIn,rate,volume,fadeIn,fadeOut})=>({assetId,start,duration,sourceIn,rate,volume,fadeIn,fadeOut})));}

export function resizeCaptionCue(cue:CaptionCue,duration:number):CaptionCue{
  const next=Math.round(clamp(duration,1,108000));
  return {...cue,duration:next,words:cue.words.map(word=>{const start=clamp(Math.round(word.start/cue.duration*next),0,next-1);return {...word,start,end:clamp(Math.round(word.end/cue.duration*next),start+1,next)};})};
}

export function captionSubtitles(layer:CaptionLayer,format:'srt'|'vtt'){
  const stamp=(frames:number)=>{const ms=Math.round(frames/FPS*1000),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}${format==='srt'?',':'.'}${String(ms%1000).padStart(3,'0')}`;};
  const cues=layer.cues.filter(cue=>!cue.hidden).flatMap(cue=>{
    const style=effectiveCaptionStyle(layer,cue);
    if(style.display==='sentence')return [{start:cue.start,end:cue.start+cue.duration,text:cueText(cue)}];
    const size=style.display==='word'?1:6,result:{start:number;end:number;text:string}[]=[];
    for(let index=0;index<cue.words.length;index+=size){const words=cue.words.slice(index,index+size);result.push({start:cue.start+words[0].start,end:cue.start+(cue.words[index+size]?.start??cue.duration),text:words.map(word=>word.text).join(' ')});}
    return result;
  }).filter(cue=>cue.text&&cue.end>cue.start).sort((a,b)=>a.start-b.start);
  return (format==='vtt'?'WEBVTT\n\n':'')+cues.map((cue,index)=>`${index+1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text.replace(/-->/g,'→')}\n`).join('\n');
}
