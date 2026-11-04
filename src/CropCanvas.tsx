import {createPortal} from 'react-dom';
import React,{useEffect,useRef} from 'react';
import {Button} from './ui/primitives';
import {clamp,type Asset,type Clip,type Project} from './model';
import {overlayHeight} from './overlays';
import {noCrop,type Crop} from './transforms';
import './crop-canvas.css';
const handles=['left','top','right','bottom','top-left','top-right','bottom-left','bottom-right'] as const;
export function CropCanvas({project,clip,asset,change,checkpoint,done}:{project:Project;clip:Clip;asset:Asset;change:(crop:Crop,record?:boolean)=>void;checkpoint:()=>void;done:()=>void}){
 const box=useRef<HTMLDivElement>(null),cleanup=useRef<(()=>void)|null>(null),initial=useRef(clip.transform?.crop??noCrop),crop=clip.transform?.crop??noCrop;
 useEffect(()=>()=>cleanup.current?.(),[]);
 const vw=clip.overlay?project.width*clip.overlay.width/100:project.width,vh=clip.overlay?project.height*overlayHeight(project,asset,clip.overlay.width)/100:project.height,fit=Math.min(vw/asset.width,vh/asset.height),w=asset.width*fit,h=asset.height*fit;
 const patch=(old:Crop,handle:string,dx:number,dy:number)=>({...old,...(handle.includes('left')?{left:clamp(old.left+dx,0,Math.min(90,94-old.right))}:{}),...(handle.includes('right')?{right:clamp(old.right-dx,0,Math.min(90,94-old.left))}:{}),...(handle.includes('top')?{top:clamp(old.top+dy,0,Math.min(90,94-old.bottom))}:{}),...(handle.includes('bottom')?{bottom:clamp(old.bottom-dy,0,Math.min(90,94-old.top))}:{})});
 function start(event:React.PointerEvent,handle:string){if(event.button!==0||!box.current)return;event.preventDefault();event.stopPropagation();cleanup.current?.();const root=box.current,angle=(clip.transform?.rotation??0)*Math.PI/180,unrotatedWidth=w/project.width*root.parentElement!.getBoundingClientRect().width,unrotatedHeight=h/project.height*root.parentElement!.getBoundingClientRect().height,old={...crop},x=event.clientX,y=event.clientY;let moved=false;
 const move=(e:PointerEvent)=>{if(e.pointerId!==event.pointerId)return;const dx=e.clientX-x,dy=e.clientY-y;if(!moved&&Math.hypot(dx,dy)<2)return;if(!moved){checkpoint();moved=true;}change(patch(old,handle,(dx*Math.cos(angle)+dy*Math.sin(angle))*(clip.transform?.flipX?-1:1)/unrotatedWidth*100,(-dx*Math.sin(angle)+dy*Math.cos(angle))*(clip.transform?.flipY?-1:1)/unrotatedHeight*100),false);};
 const stop=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape,true);cleanup.current=null;};
 const up=(e:PointerEvent)=>{if(e.pointerId===event.pointerId){move(e);stop();}};const cancel=()=>{if(moved)change(old,false);stop();};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}};cleanup.current=stop;window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape,true);
 }
 return <div className="crop-canvas" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();change(initial.current,false);done();}}}>
  <div ref={box} className="crop-source-box" style={{left:`${clip.overlay?.x??50}%`,top:`${clip.overlay?.y??50}%`,width:`${w/project.width*100}%`,height:`${h/project.height*100}%`,transform:`translate(-50%,-50%) rotate(${clip.transform?.rotation??0}deg) scale(${clip.transform?.flipX?-1:1},${clip.transform?.flipY?-1:1})`}}>
   <div className="crop-boundary" style={{left:`${crop.left}%`,top:`${crop.top}%`,right:`${crop.right}%`,bottom:`${crop.bottom}%`}}><div className="crop-thirds"/>{handles.map(handle=><button key={handle} className={`crop-handle ${handle}`} role="slider" aria-label={`Crop ${handle.replace('-',' ')}`} aria-valuemin={0} aria-valuemax={90} aria-valuenow={crop[handle.split('-').at(-1) as keyof Crop]} onPointerDown={e=>start(e,handle)} onKeyDown={e=>{const dx=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,dy=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;if(dx||dy){e.preventDefault();e.stopPropagation();change(patch(crop,handle,dx*(e.shiftKey?5:.5),dy*(e.shiftKey?5:.5)));}}}/>)}</div>
  </div>{createPortal(<div className="crop-toolbar"><Button variant="ghost" size="sm" onClick={()=>change(noCrop)}>Reset</Button><Button variant="ghost" size="sm" onClick={()=>{change(initial.current,false);done();}}>Cancel</Button><Button size="sm" onClick={done}>Done</Button></div>,document.querySelector('.preview-stage')!)}
 </div>;
}
