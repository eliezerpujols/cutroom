import React,{useEffect,useRef,useState} from 'react';
import {clamp,clipsInRenderOrder,type Asset,type Clip,type Project} from './model';
import {overlayHeight,type ClipOverlay} from './overlays';
import {snapCanvasPosition} from './canvasSnapping';
import './canvasGuides.css';

type Corner='nw'|'ne'|'sw'|'se';
export function MediaOverlayCanvas({project,assets,frame,selected,select,change,checkpoint,beforeGesture}:{project:Project;assets:Asset[];frame:number;selected:string|null;select:(id:string)=>void;change:(id:string,patch:Partial<ClipOverlay>,record?:boolean)=>void;checkpoint:()=>void;beforeGesture:()=>void}){
  const root=useRef<HTMLDivElement>(null),gesture=useRef<(()=>void)|null>(null);
  const [guides,setGuides]=useState<{x:number|null;y:number|null}>({x:null,y:null});
  useEffect(()=>()=>gesture.current?.(),[]);
  function start(event:React.PointerEvent,clip:Clip,asset:Asset,corner?:Corner){
    if(event.button!==0||!event.isPrimary||!clip.overlay||!root.current)return;
    event.preventDefault();event.stopPropagation();gesture.current?.();select(clip.id);beforeGesture();
    const handle=event.currentTarget as HTMLElement,rect=root.current.getBoundingClientRect(),original={...clip.overlay},startX=event.clientX,startY=event.clientY;
    const width=original.width/100*rect.width,height=overlayHeight(project,asset,original.width)/100*rect.height,ratio=width/height;
    const sx=corner?.endsWith('e')?1:-1,sy=corner?.startsWith('s')?1:-1;
    const anchor={x:original.x/100*rect.width-sx*width/2,y:original.y/100*rect.height-sy*height/2};
    let moved=false;handle.focus({preventScroll:true});handle.setPointerCapture(event.pointerId);
    const move=(next:PointerEvent)=>{
      if(next.pointerId!==event.pointerId)return;
      if(!moved&&Math.hypot(next.clientX-startX,next.clientY-startY)<2)return;
      if(!moved){checkpoint();moved=true;}
      let patch:ClipOverlay;
      if(corner){
        const angle=(clip.transform?.rotation??0)*Math.PI/180,cx=original.x/100*rect.width,cy=original.y/100*rect.height,dx=next.clientX-rect.left-cx,dy=next.clientY-rect.top-cy,px=cx+dx*Math.cos(angle)+dy*Math.sin(angle),py=cy-dx*Math.sin(angle)+dy*Math.cos(angle);
        const vx=(px-anchor.x)*sx,vy=(py-anchor.y)*sy;
        const w=Math.max((vx+vy/ratio)/(1+1/(ratio*ratio)),rect.width*.02),h=w/ratio;
        const nx=anchor.x+sx*w/2-cx,ny=anchor.y+sy*h/2-cy;patch={width:w/rect.width*100,x:clamp((cx+nx*Math.cos(angle)-ny*Math.sin(angle))/rect.width*100,0,100),y:clamp((cy+nx*Math.sin(angle)+ny*Math.cos(angle))/rect.height*100,0,100)};
      }else{
        const position=snapCanvasPosition(original.x+(next.clientX-startX)/rect.width*100,original.y+(next.clientY-startY)/rect.height*100,original.width/2,overlayHeight(project,asset,original.width)/2,rect.width,rect.height,!next.shiftKey,false);
        setGuides(position.guides);
        patch={...original,x:position.x,y:position.y};
      }
      change(clip.id,patch,false);
    };
    const cleanup=()=>{setGuides({x:null,y:null});window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',revert);try{if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);}catch{}gesture.current=null;};
    const up=(next:PointerEvent)=>{if(next.pointerId===event.pointerId){move(next);cleanup();}};
    const revert=()=>{if(moved)change(clip.id,original,false);cleanup();};
    const cancel=(next:PointerEvent)=>{if(next.pointerId===event.pointerId)revert();};
    const escape=(next:KeyboardEvent)=>{if(next.key==='Escape'){next.preventDefault();next.stopPropagation();revert();}};
    gesture.current=cleanup;window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape,true);window.addEventListener('blur',revert);
  }
  return <div ref={root} className="media-overlay-canvas">{clipsInRenderOrder(project).filter(clip=>!clip.hidden&&clip.overlay&&clip.start<=frame&&frame<clip.start+clip.duration).map(clip=>{
    const asset=assets.find(asset=>asset.id===clip.assetId);if(!asset||asset.missing)return null;const value=clip.overlay!,active=selected===clip.id;
    return <div key={clip.id} className={`media-overlay-box ${active?'selected':''}`} style={{left:`${value.x}%`,top:`${value.y}%`,width:`${value.width}%`,height:`${overlayHeight(project,asset,value.width)}%`,transform:`translate(-50%,-50%) rotate(${clip.transform?.rotation??0}deg)`}} role="button" tabIndex={0} aria-label={`Move overlay ${clip.name}`} aria-pressed={active} onPointerDown={event=>start(event,clip,asset)} onClick={event=>event.stopPropagation()} onKeyDown={event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();select(clip.id);}
      const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
      if(direction&&!event.metaKey&&!event.ctrlKey&&!event.altKey){event.preventDefault();event.stopPropagation();select(clip.id);const step=event.shiftKey?5:.5;change(clip.id,{x:clamp(value.x+direction[0]*step,0,100),y:clamp(value.y+direction[1]*step,0,100)});}
    }}>{active&&(['nw','ne','sw','se'] as const).map(corner=><button key={corner} className={`media-overlay-handle ${corner}`} role="spinbutton" aria-label={`Resize overlay ${corner}`} aria-valuemin={2} aria-valuenow={Number(value.width.toFixed(2))} aria-valuetext={`${value.width.toFixed(1)} percent width`} onKeyDown={event=>{const sign=['ArrowLeft','ArrowUp'].includes(event.key)?-1:['ArrowRight','ArrowDown'].includes(event.key)?1:0;if(!sign&&event.key!=='Home')return;event.preventDefault();event.stopPropagation();change(clip.id,{width:event.key==='Home'?2:Math.max(value.width+sign*(event.shiftKey?5:.5),2)});}} onPointerDown={event=>start(event,clip,asset,corner)} onClick={event=>event.stopPropagation()}/>)}</div>;
  })}{guides.x!==null&&<div className="canvas-snap-guide vertical" aria-hidden="true" style={{left:`${clamp(guides.x,.1,99.9)}%`}}/>}{guides.y!==null&&<div className="canvas-snap-guide horizontal" aria-hidden="true" style={{top:`${clamp(guides.y,.1,99.9)}%`}}/>}</div>;
}
