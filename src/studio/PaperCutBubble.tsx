import React from 'react';
import {CheckCheck} from 'lucide-react';

// An uneven scissor-cut silhouette, including the lower-right tail. Mirror only
// the paper layers for incoming messages so the lettering remains upright.
const edge='polygon(1.4% 5.1%, 2.9% 2.3%, 5.1% 1.1%, 12% 1.4%, 20% .6%, 29% 1.2%, 38% .5%, 47% 1.1%, 57% .7%, 66% 1.5%, 75% .6%, 84% 1.2%, 92% .8%, 96% 1.8%, 98.1% 4.2%, 98.6% 10%, 98.2% 21%, 98.9% 32%, 98.3% 44%, 98.8% 56%, 98.1% 68%, 97.2% 78%, 96% 82%, 97.1% 88%, 99.8% 98.2%, 95.1% 96.4%, 91.3% 93.1%, 86% 94.1%, 77% 93.6%, 68% 94.5%, 59% 93.7%, 50% 94.3%, 41% 93.5%, 32% 94.2%, 23% 93.5%, 14% 94.3%, 6% 93.7%, 3% 92%, 1.4% 88%, .9% 78%, 1.3% 67%, .6% 56%, 1.2% 45%, .7% 34%, 1.3% 23%, .8% 13%)';
const fiber='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><filter id="p"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="17" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="120" height="120" opacity=".1" filter="url(#p)"/></svg>');

export function PaperCutBubble({text,time,incoming=false,children}:{text?:string;time:string;incoming?:boolean;children?:React.ReactNode}){
  const paper:React.CSSProperties={position:'absolute',inset:0,clipPath:edge,transform:incoming?'scaleX(-1)':undefined};
  return <div style={{position:'relative',alignSelf:incoming?'flex-start':'flex-end',maxWidth:'83%',minWidth:'23%',padding:'3.3cqw 3.6cqw 4cqw',filter:'drop-shadow(.35cqw .85cqw .55cqw #004F8C32)'}}>
    <div aria-hidden style={{...paper,background:'#FFFDF7'}}/>
    <div aria-hidden style={{...paper,inset:'.45cqw .5cqw .5cqw',backgroundColor:incoming?'#F7F5EF':'#D9F4D0',backgroundImage:`url("${fiber}")`,backgroundSize:'12cqw 12cqw'}}/>
    <div style={{position:'relative'}}>
      {text&&<div style={{fontSize:'4.1cqw',lineHeight:1.3,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{text}</div>}
      {children}
      <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:'.8cqw',fontSize:'2.65cqw',color:'#66756D',marginTop:'.6cqw'}}>{time}{!incoming&&<CheckCheck style={{width:'3.5cqw',height:'3.5cqw',strokeWidth:1.65}}/>}</div>
    </div>
  </div>;
}
