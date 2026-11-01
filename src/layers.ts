import type {Project,Track} from './model';
import type {CaptionLayer} from './captions';
import type {VideoText} from './videoText';

export type TimelineLayer={key:string;kind:'track';id:string;name:string;track:Track}|{key:string;kind:'caption';id:string;name:string;layer:CaptionLayer}|{key:string;kind:'text';id:string;name:string;text:VideoText;number:number};
export function timelineLayers(project:Project):TimelineLayer[]{
  const defaults:TimelineLayer[]=[...(project.texts||[]).map((text,index)=>({key:`text:${text.id}`,kind:'text' as const,id:text.id,name:`Text ${index+1}`,text,number:index+1})),...(project.captions||[]).map(layer=>({key:`caption:${layer.id}`,kind:'caption' as const,id:layer.id,name:layer.name,layer})),...project.tracks.map(track=>({key:`track:${track.id}`,kind:'track' as const,id:track.id,name:track.name,track}))];
  if(!project.layerOrder)return defaults;
  const byKey=new Map(defaults.map(layer=>[layer.key,layer])),order=[...new Set(project.layerOrder.filter(key=>byKey.has(key)))];
  // Insert new rows beside their default neighbors, without losing saved ordering.
  for(let index=defaults.length-1;index>=0;index--){const key=defaults[index].key;if(order.includes(key))continue;const neighbor=defaults.slice(index+1).find(layer=>order.includes(layer.key));order.splice(neighbor?order.indexOf(neighbor.key):order.length,0,key);}
  return order.map(key=>byKey.get(key)!);
}
export function setLayerOrder(project:Project,keys:string[]):Project{
  const layers=timelineLayers(project),valid=new Set(layers.map(layer=>layer.key));
  if(keys.length!==valid.size||new Set(keys).size!==keys.length||keys.some(key=>!valid.has(key)))throw new Error('Provide every current layer key exactly once.');
  const tracks=new Map(project.tracks.map(track=>[track.id,track]));
  return {...project,layerOrder:keys,tracks:keys.filter(key=>key.startsWith('track:')).map(key=>tracks.get(key.slice(6))!)};
}
export function moveLayer(project:Project,key:string,target:string,edge:'before'|'after'):Project{
  const order=timelineLayers(project).map(layer=>layer.key);if(key===target||!order.includes(key)||!order.includes(target))return project;
  const next=order.filter(item=>item!==key);next.splice(next.indexOf(target)+(edge==='after'?1:0),0,key);
  return next.every((item,index)=>item===order[index])?project:setLayerOrder(project,next);
}
