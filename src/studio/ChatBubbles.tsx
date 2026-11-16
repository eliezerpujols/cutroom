import React from 'react';
import type {StudioInstance} from './registry';
import {Bubble} from './PhoneChat';

// Up to three loose chat bubbles in the iPhone chat's style (393 points wide).
// Each later bubble cuts in at its local frame; there is no entrance motion.
export const chatBubblesDefaults={message1:'¿Cómo cuido la postura?',message2:'¿Qué hago mal?',message3:'¿Cuántas series hago?',side:'in',secondAt:11,thirdAt:23};

export function ChatBubbles({instance,frame}:{instance:StudioInstance;frame:number}){
  const p={...chatBubblesDefaults,...instance.props} as typeof chatBubblesDefaults;
  const incoming=String(p.side).toLowerCase()!=='out';
  const shown=[{text:p.message1,at:0,time:'18:02'},{text:p.message2,at:Number(p.secondAt),time:'18:04'},{text:p.message3,at:Number(p.thirdAt),time:'18:07'}]
    .filter(message=>String(message.text).trim()&&frame>=message.at);
  return <div style={{position:'absolute',inset:0,containerType:'inline-size',fontFamily:'-apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif',color:'#0A0A0A'}}>
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',justifyContent:'flex-start',gap:`${8*100/393}cqw`,filter:`drop-shadow(0 ${100/393}cqw ${5*100/393}cqw #004F8C2E)`}}>
      {shown.map((message,i)=><Bubble key={i} text={String(message.text)} time={message.time} incoming={incoming}/>)}
    </div>
  </div>;
}
