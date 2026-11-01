// Distances are measured in preview pixels, so snapping feels the same at any zoom.
function snapAxis(center:number,half:number,pixels:number,enabled:boolean,keepInside:boolean){
  const low=keepInside?Math.min(50,half):0,high=100-low,bounded=Math.max(low,Math.min(high,center));
  if(!enabled||pixels<=0)return {value:bounded,guide:null};
  const targets=[{value:50,guide:50},{value:keepInside?low:half,guide:0},{value:keepInside?high:100-half,guide:100}].filter(target=>target.value>=low&&target.value<=high);
  let best:{value:number;guide:number}|undefined,distance=8/pixels*100;
  for(const target of targets){const gap=Math.abs(target.value-bounded);if(gap<=distance&&(!best||gap<distance)){best=target;distance=gap;}}
  return best||{value:bounded,guide:null};
}
export function snapCanvasPosition(x:number,y:number,halfWidth:number,halfHeight:number,previewWidth:number,previewHeight:number,enabled=true,keepInside=true){
  const horizontal=snapAxis(x,halfWidth,previewWidth,enabled,keepInside),vertical=snapAxis(y,halfHeight,previewHeight,enabled,keepInside);
  return {x:Math.round(horizontal.value*10)/10,y:Math.round(vertical.value*10)/10,guides:{x:horizontal.guide,y:vertical.guide}};
}
