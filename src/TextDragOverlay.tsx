import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {CoverTextContent,coverTextPosition} from './remotion/Visuals';
import type {CoverText} from './visuals';
import {clamp} from './model';
import {snapCanvasPosition} from './canvasSnapping';

type Props={width:number;height:number;texts:CoverText[];label?:string;selected:string|null;select:(id:string)=>void;change:(id:string,patch:Partial<CoverText>,record?:boolean)=>void;checkpoint:()=>void;editingChanged?:(id:string|null)=>void;editText?:(id:string)=>string;commitText?:(id:string,text:string)=>void;maxLength?:number;reportError?:(message:string)=>void};
type Editing={id:string;value:string;draft:string};
function InlineEditor({value,editor,finish,update}:{value:string;editor:React.RefObject<HTMLSpanElement|null>;finish:(cancel?:boolean)=>void;update:(value:string)=>void}){
  useLayoutEffect(()=>{const element=editor.current;if(!element)return;element.textContent=value;element.focus({preventScroll:true});const range=document.createRange();range.selectNodeContents(element);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);},[]);
  return <span ref={editor} className="canvas-inline-editor" contentEditable="plaintext-only" suppressContentEditableWarning role="textbox" aria-label="Edit text on canvas" aria-multiline="true" spellCheck onInput={event=>update(event.currentTarget.innerText)} onBlur={()=>finish()} onPointerDown={event=>event.stopPropagation()} onDoubleClick={event=>event.stopPropagation()} onKeyDown={event=>{event.stopPropagation();if(event.nativeEvent.isComposing)return;if(event.key==='Escape'){event.preventDefault();finish(true);}else if(event.key==='Enter'&&(event.metaKey||event.ctrlKey)){event.preventDefault();finish();}}} onPaste={event=>{
    event.preventDefault();const selection=window.getSelection();if(!selection?.rangeCount)return;const range=selection.getRangeAt(0);if(!editor.current?.contains(range.commonAncestorContainer))return;range.deleteContents();const node=document.createTextNode(event.clipboardData.getData('text/plain'));range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);update(editor.current?.innerText??'');
  }}/>;
}
export function TextDragOverlay(props:Props){
  const {width,height,texts,selected,select,change,checkpoint,label='text'}=props;
  const surface=useRef<HTMLDivElement>(null),cleanup=useRef<(()=>void)|null>(null),[scale,setScale]=useState(1);
  const [editing,setEditing]=useState<Editing|null>(null),session=useRef<Editing|null>(null),editor=useRef<HTMLSpanElement>(null),latest=useRef(props);
  const [error,setError]=useState(''),[guides,setGuides]=useState<{x:number|null;y:number|null}>({x:null,y:null});latest.current=props;
  function saveSession(cancel=false,unmount=false){
    const active=session.current;if(!active)return;
    const value=(editor.current?.innerText??active.draft).replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ');
    try{
      if(!cancel&&value!==active.value){if(value.length>(latest.current.maxLength??500))throw new Error(`Use up to ${latest.current.maxLength??500} characters.`);if(latest.current.commitText)latest.current.commitText(active.id,value);else latest.current.change(active.id,{text:value});}
    }catch(e){const message=(e as Error).message;if(!unmount){setError(message);requestAnimationFrame(()=>editor.current?.focus({preventScroll:true}));return;}latest.current.reportError?.(message);}
    session.current=null;latest.current.editingChanged?.(null);if(!unmount){setEditing(null);setError('');}
  }
  useEffect(()=>{const element=surface.current;if(!element)return;const observer=new ResizeObserver(()=>setScale(element.clientWidth/width));observer.observe(element);return()=>observer.disconnect();},[width]);
  useEffect(()=>()=>{cleanup.current?.();saveSession(false,true);},[]);
  useEffect(()=>{if(session.current&&!texts.some(text=>text.id===session.current!.id)){saveSession(false,true);setEditing(null);setError('');}},[texts]);
  function beginEditing(event:React.SyntheticEvent,text:CoverText){
    event.preventDefault();event.stopPropagation();cleanup.current?.();if(session.current){saveSession();if(session.current)return;}
    select(text.id);const value=props.editText?.(text.id)??text.text,next={id:text.id,value,draft:value};session.current=next;setError('');setEditing(next);props.editingChanged?.(text.id);
  }
  function drag(event:React.PointerEvent<HTMLDivElement>,text:CoverText){
    if(session.current||event.button!==0||!event.isPrimary||event.detail>1)return;event.preventDefault();event.stopPropagation();cleanup.current?.();select(text.id);
    const element=event.currentTarget,rect=surface.current!.getBoundingClientRect(),box=element.getBoundingClientRect(),x=event.clientX,y=event.clientY;let started=false;
    // Snap the visible letters (or filled card), rather than an oversized text box.
    const ink=text.fill==='box'?box:element.querySelector('[data-canvas-ink]')?.getBoundingClientRect()??box;
    const paddingX=(text.fill==='lines'?text.padding:0)*scale+(text.stroke?text.strokeWidth*scale/2:0),paddingY=(text.fill==='lines'?text.padding*.2:0)*scale+(text.stroke?text.strokeWidth*scale/2:0);
    const halfW=Math.min(50,(ink.width+paddingX*2)/rect.width*50),halfH=Math.min(50,(ink.height+paddingY*2)/rect.height*50);
    const offsetX=((ink.left+ink.right)-(box.left+box.right))/2/rect.width*100,offsetY=((ink.top+ink.bottom)-(box.top+box.bottom))/2/rect.height*100;
    element.focus({preventScroll:true});element.setPointerCapture(event.pointerId);
    const move=(next:PointerEvent)=>{if(next.pointerId!==event.pointerId)return;const dx=next.clientX-x,dy=next.clientY-y;if(!started&&Math.hypot(dx,dy)<2)return;if(!started){checkpoint();started=true;}const position=snapCanvasPosition(text.x+offsetX+dx/rect.width*100,text.y+offsetY+dy/rect.height*100,halfW,halfH,rect.width,rect.height,!next.shiftKey);const nextX=clamp(position.x-offsetX,0,100),nextY=clamp(position.y-offsetY,0,100);setGuides({x:Math.abs(nextX+offsetX-position.x)<.01?position.guides.x:null,y:Math.abs(nextY+offsetY-position.y)<.01?position.guides.y:null});change(text.id,{x:nextX,y:nextY},false);};
    const finish=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',finish);try{if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);}catch{}cleanup.current=null;setGuides({x:null,y:null});};
    const up=(next:PointerEvent)=>{if(next.pointerId!==event.pointerId)return;move(next);finish();};const revert=()=>{if(started)change(text.id,{x:text.x,y:text.y},false);finish();};const cancel=(next:PointerEvent)=>{if(next.pointerId===event.pointerId)revert();};const escape=(next:KeyboardEvent)=>{if(next.key==='Escape'){next.preventDefault();next.stopPropagation();revert();}};
    cleanup.current=finish;window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape,true);window.addEventListener('blur',finish);
  }
  return <div className="cover-drag-surface" ref={surface}><div style={{position:'absolute',width,height,transform:`scale(${scale})`,transformOrigin:'top left',pointerEvents:'none'}}>{texts.map(text=>{
    const active=editing?.id===text.id;
    return <div key={text.id} data-text-id={text.id} role={active?undefined:'button'} tabIndex={active?undefined:0} aria-label={active?undefined:`Move ${label}: ${text.text||'Empty text'}`} aria-pressed={active?undefined:selected===text.id} title={active?undefined:"Double-click or press Enter to edit · Drag to move · Hold Shift to bypass snapping"} className={`cover-drag-text ${active?'editing':''}`} style={{...coverTextPosition(text),outline:selected===text.id?`${1.5/scale}px solid #ffffff`:undefined,outlineOffset:5/scale,pointerEvents:'auto'}} onPointerDown={event=>drag(event,text)} onDoubleClick={event=>beginEditing(event,text)} onKeyDown={event=>{if(active)return;if(event.key==='Enter'){event.preventDefault();event.stopPropagation();beginEditing(event,text);return;}if(event.key===' '){event.preventDefault();event.stopPropagation();select(text.id);return;}const step=event.shiftKey?5:1,dx=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,dy=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;if(dx||dy){event.preventDefault();event.stopPropagation();change(text.id,{x:clamp(text.x+dx,0,100),y:clamp(text.y+dy,0,100)});}}}>
      <div style={{opacity:active?1:0}}><CoverTextContent text={text}>{active?<InlineEditor value={editing!.value} editor={editor} finish={saveSession} update={value=>{if(session.current)session.current.draft=value;}}/>:<span data-canvas-ink>{text.text||'\u200b'}</span>}</CoverTextContent></div>
      {active&&<div className="canvas-inline-hint" style={{fontSize:11,transform:`translateY(-100%) scale(${1/scale})`,transformOrigin:'bottom left'}}>{error||'⌘ / Ctrl + Enter to finish · Esc to cancel'}</div>}
    </div>;
  })}</div>{guides.x!==null&&<div className="canvas-snap-guide vertical" aria-hidden="true" style={{left:`${clamp(guides.x,.1,99.9)}%`}}/>}{guides.y!==null&&<div className="canvas-snap-guide horizontal" aria-hidden="true" style={{top:`${clamp(guides.y,.1,99.9)}%`}}/>}</div>;
}
