export const FPS = 30;
export type Asset = {
  id:string; name:string; kind:'video'|'audio'|'image'; duration:number; frames:number;
  width:number; height:number; hasAudio:boolean; missing?:boolean; url:string; extension?:string; thumbnails:string[]; peaks:number[];
};
export type Clip = {
  id:string; assetId:string; name:string; trackId:string; kind:'video'|'audio';
  start:number; duration:number; sourceIn:number; rate:number; volume:number; muted:boolean;
  fadeIn:number; fadeOut:number; adjustments?:import('./visuals').VisualAdjustments;
};
export type Track = {id:string; kind:'video'|'audio'; name:string; muted:boolean};
export type Project = {version:1; name:string; width:number; height:number; fps:30; clips:Clip[]; tracks:Track[]; captions?:import('./captions').CaptionLayer[]; cover?:import('./visuals').Cover; adjustments?:import('./visuals').VisualAdjustments; texts?:import('./videoText').VideoText[]};
export type Tool = 'select'|'slip';
export const uid = () => crypto.randomUUID();
export const endFrame = (p:Project) => Math.max(1,...p.clips.map(c=>c.start+c.duration),...(p.captions||[]).flatMap(layer=>layer.cues.map(cue=>cue.start+cue.duration)),...(p.texts||[]).map(text=>text.start+text.duration));
export const clamp = (v:number,min:number,max:number) => Math.max(min,Math.min(max,v));
export const seconds = (f:number) => f/FPS;
export const time = (frames:number, precise=false) => {
  const s=Math.max(0,frames)/FPS; const m=Math.floor(s/60);
  return `${String(m).padStart(2,'0')}:${String(Math.floor(s)%60).padStart(2,'0')}${precise?'.'+String(Math.floor((s%1)*100)).padStart(2,'0'):''}`;
};
export const maxDuration = (c:Clip, a:Asset) => a.kind==='image'?108000:Math.max(1,Math.floor((a.frames-c.sourceIn)/c.rate));
export function clipsInRenderOrder(p:Project):Clip[]{
  const order=new Map(p.tracks.map((t,i)=>[t.id,i]));
  return [...p.clips].sort((a,b)=>(order.get(b.trackId)??Number.MAX_SAFE_INTEGER)-(order.get(a.trackId)??Number.MAX_SAFE_INTEGER));
}
export function splitTarget(p:Project,selected:string|null,frame:number):Clip|null {
  const chosen=p.clips.find(c=>c.id===selected);
  const covering=(c:Clip)=>c.start<=frame&&frame<c.start+c.duration;
  const top=clipsInRenderOrder(p).reverse();
  const target=chosen||top.find(c=>c.kind==='video'&&covering(c))||top.find(c=>c.kind==='audio'&&covering(c));
  return target&&frame>target.start&&frame<target.start+target.duration?target:null;
}
export function splitClip(c:Clip,at:number,newId:string):Clip[] {
  const offset=at-c.start;
  if(offset<1||offset>=c.duration)return [c];
  return [{...c,duration:offset,fadeOut:0},{...c,id:newId,start:at,duration:c.duration-offset,sourceIn:c.sourceIn+offset*c.rate,fadeIn:0}];
}
export function trimClip(c:Clip,delta:number,edge:'left'|'right',a:Asset):Clip {
  if(edge==='left') {
    const d=clamp(Math.round(delta),Math.max(-c.start,Math.ceil(-c.sourceIn/c.rate)),c.duration-1);
    return {...c,start:c.start+d,sourceIn:c.sourceIn+d*c.rate,duration:c.duration-d};
  }
  return {...c,duration:clamp(c.duration+Math.round(delta),1,maxDuration(c,a))};
}
export function slipClip(c:Clip,delta:number,a:Asset):Clip {
  if(a.kind==='image')return c;
  return {...c,sourceIn:clamp(c.sourceIn+Math.round(delta)*c.rate,0,Math.max(0,a.frames-c.duration*c.rate))};
}
export function setClipRate(c:Clip,rate:number,a:Asset):Clip {
  if(a.kind==='image')return c;
  const desired=Math.max(1,Math.round(c.duration*c.rate/rate));
  const available=Math.max(1,Math.floor((a.frames-c.sourceIn)/rate));
  return {...c,rate,duration:Math.min(desired,available)};
}
export function snapFrame(value:number,points:number[],threshold:number):number {
  let closest=value,dist=threshold;
  for(const p of points)if(Math.abs(value-p)<dist){dist=Math.abs(value-p);closest=p;}
  return Math.round(closest);
}
export function fadeGainAt(c:Clip,frame:number):number {
  return Math.min(c.fadeIn?clamp(frame/c.fadeIn,0,1):1,c.fadeOut?clamp((c.duration-1-frame)/c.fadeOut,0,1):1);
}
export function gainAt(c:Clip,frame:number):number {return c.muted?0:c.volume*fadeGainAt(c,frame);}
