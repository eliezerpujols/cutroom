import type {CSSProperties} from 'react';
export const textAnimationOptions=[['text-typewriter','Typewriter'],['text-words','Word by word'],['text-fade','Cascade'],['text-rise','Rise'],['text-bounce','Bounce'],['text-wave','Wave'],['text-flip','Flip'],['text-spin','Spin'],['text-pop','Pop'],['text-blur','Blur reveal'],['text-scatter','Scatter'],['text-track','Spread']] as const;
export const textMotionOptions=[['none','None'],['wave','Wave'],['bounce','Bounce'],['float','Float'],['jitter','Jitter'],['pulse','Pulse letters'],['ripple','Ripple']] as const;
export const textStyleOptions=[['none','None'],['gradient','Gradient'],['neon','Neon'],['chromatic','Chromatic'],['metallic','Metallic'],['rainbow','Rainbow'],['duotone','Duotone']] as const;
export const textAppearanceOptions=[['none','None'],['outline','Outline'],['shadow','Soft shadow'],['extrude','Extrude'],['glow','Glow'],['highlight','Highlight']] as const;
export type TextAnimation=typeof textAnimationOptions[number][0];
export type TextEffects={textMotion?:typeof textMotionOptions[number][0];textStyle?:typeof textStyleOptions[number][0];textAppearance?:typeof textAppearanceOptions[number][0];textAccent?:string;textUnit?:'letter'|'word';textStagger?:number};
export const isTextAnimation=(kind:string|undefined):kind is TextAnimation=>textAnimationOptions.some(([id])=>id===kind);
export const textEffectDefaults={textMotion:'none',textStyle:'none',textAppearance:'none',textAccent:'#d3e8b5',textUnit:'letter',textStagger:60} as const;
export const graphemes=(text:string)=>Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),part=>part.segment);
export const textParts=(text:string)=>text.split(/(\s+)/u).filter(Boolean);
export const connectedScript=(text:string)=>/[\u0600-\u06ff\u0750-\u077f\u0900-\u0dff]/u.test(text);
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function textProgress(progress:number,index:number,count:number,stagger=60){const spread=Math.min(.9,Math.max(0,stagger/100));return clamp((progress-(count<=1?0:index/(count-1)*spread))/(1-spread));}
export function textAnimationStyle(kind:TextAnimation,progress:number,index:number,count:number,stagger=60):CSSProperties{
  const p=textProgress(progress,index,count,stagger),ease=1-(1-p)**3,remain=1-ease,base:CSSProperties={opacity:p===0?0:kind==='text-typewriter'||kind==='text-words'?1:p};
  switch(kind){
    case 'text-typewriter':case 'text-words':return base;
    case 'text-fade':return base;
    case 'text-rise':return {...base,transform:`translateY(${remain*.9}em)`};
    case 'text-bounce':return {...base,transform:`translateY(${p===1?0:Math.cos(p*Math.PI*3)*remain*-.8}em)`};
    case 'text-wave':return {...base,transform:`translateY(${Math.sin(p*Math.PI*2)*remain*.7}em)`};
    case 'text-flip':return {...base,transform:`perspective(5em) rotateX(${remain*-90}deg)`};
    case 'text-spin':return {...base,transform:`rotate(${remain*-160}deg) scale(${.3+.7*ease})`};
    case 'text-pop':return {...base,transform:`scale(${p===1?1:1+Math.cos(p*Math.PI*2)*remain*-.7})`};
    case 'text-blur':return {...base,filter:`blur(${remain*.3}em)`};
    case 'text-scatter':return {...base,transform:`translate(${Math.sin(index*13.7)*remain*1.5}em,${Math.cos(index*7.3)*remain*1.2}em) rotate(${remain*Math.sin(index*3.1)*90}deg)`};
    case 'text-track':return {...base,transform:`translateX(${(index-(count-1)/2)*remain*.25}em)`};
  }
}
export function textMotionStyle(kind:TextEffects['textMotion'],phase:number,index:number,amount:number,loop:boolean):CSSProperties{
  const strength=amount/100*(loop?1:Math.sin(Math.PI*phase)**2),wave=Math.sin(phase*Math.PI*2-index*.65);
  switch(kind){
    case 'wave':return {transform:`translateY(${wave*.35*strength}em)`};
    case 'bounce':return {transform:`translateY(${-Math.abs(wave)*.45*strength}em)`};
    case 'float':return {transform:`translateY(${wave*.18*strength}em) rotate(${wave*5*strength}deg)`};
    case 'jitter':return {transform:`translate(${Math.sin(phase*48+index*7)*.08*strength}em,${Math.cos(phase*35+index*3)*.08*strength}em)`};
    case 'pulse':return {transform:`scale(${1+wave*.3*strength})`};
    case 'ripple':return {transform:`translateY(${wave*.15*strength}em) scale(${1+wave*.2*strength})`,opacity:1-(wave+1)*.2*strength};
    default:return {};
  }
}
export function textPaint(e:TextEffects,index:number,frame:number,intensity=50):CSSProperties{
  const accent=e.textAccent??textEffectDefaults.textAccent,a=intensity/100,paint:CSSProperties={};
  switch(e.textStyle){
    case 'gradient':Object.assign(paint,{backgroundImage:`linear-gradient(135deg,${accent},#ffffff 55%,${accent})`,backgroundClip:'text',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',WebkitTextStrokeWidth:0});break;
    case 'neon':Object.assign(paint,{color:'#ffffff',textShadow:`0 0 .06em #fff,0 0 ${.1+.25*a}em ${accent},0 0 ${.2+.4*a}em ${accent}`,WebkitTextStrokeWidth:0});break;
    case 'chromatic':Object.assign(paint,{textShadow:`${.02+.06*a}em 0 #ff5277,${-.02-.06*a}em 0 #53e0ff`});break;
    case 'metallic':Object.assign(paint,{backgroundImage:'linear-gradient(#fff 10%,#8995a1 42%,#eef4fa 48%,#57616c 55%,#fff 90%)',backgroundClip:'text',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',WebkitTextStrokeWidth:0});break;
    case 'rainbow':Object.assign(paint,{color:`hsl(${(index*31+frame*2)%360} 85% 65%)`});break;
    case 'duotone':Object.assign(paint,{color:index%2?accent:'#ffffff'});break;
  }
  switch(e.textAppearance){
    case 'outline':Object.assign(paint,{WebkitTextFillColor:'transparent',WebkitTextStroke:`.025em ${accent}`});break;
    case 'shadow':Object.assign(paint,{textShadow:'0 .05em .12em #0009'});break;
    case 'extrude':Object.assign(paint,{textShadow:Array.from({length:5},(_,i)=>`${(i+1)*.018}em ${(i+1)*.018}em ${accent}`).join(',')});break;
    case 'glow':Object.assign(paint,{textShadow:`0 0 .15em ${accent},0 0 .3em ${accent}`,WebkitTextStrokeWidth:0});break;
    case 'highlight':Object.assign(paint,{backgroundColor:accent,color:'#15231b',WebkitTextFillColor:'#15231b',WebkitTextStrokeWidth:0,borderRadius:'.08em'});break;
  }
  return paint;
}
