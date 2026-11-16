import React from 'react';
import type {StudioInstance} from './registry';
import {Document} from './PaperConversation';
import {PaperCutBubble} from './PaperCutBubble';
import {conversationDefaults,conversationState,type ConversationProps} from './conversationTiming';

/** Buyer perspective, with source-local cues shared by preview, splits and export. */
export function paperChatState(frame:number,input:ConversationProps){
  const p={...conversationDefaults,...input},reply=p.scenario==='reply';
  const state=conversationState(frame,reply?{...p,scenario:'followup'}:p);
  return {...state,document:!reply&&state.document,documentIncoming:true,
    messages:state.messages.map((message,i)=>({...message,at:i===0?0:message.at,incoming:reply&&i===1,time:reply?['09:41','09:43','09:43'][i]:message.time}))
      .filter(message=>message.text.trim()&&frame>=message.at)};
}

export function paperChatPose(frame:number,at:number,incoming:boolean,index:number,entranceFrames:number){
  // Four physical repositionings held on threes at the default 12-frame entry.
  // No tweening, fading, scaling or interpolation between photographed poses.
  const pose=Math.min(4,Math.floor(Math.max(0,frame-at)/Math.max(1,entranceFrames/4)));
  const remaining=[1,.58,.27,.08,0][pose];
  const tilt=[-2,2.2,-1.4,1.6][index%4];
  return {x:remaining===0?0:(incoming?-125:125)*remaining,y:24*remaining,rotation:tilt+(incoming?-9:9)*remaining};
}

/** Loose paper cutouts; the composition owns the background and placement. */
export function PaperChatStack({instance,frame}:{instance:StudioInstance;frame:number}){
  const p:ConversationProps={...conversationDefaults,entranceFrames:12,...instance.props},s=paperChatState(frame,p);
  const stage=(at:number,incoming:boolean,index:number,children:React.ReactNode)=>{
    const pose=paperChatPose(frame,at,incoming,index,Number(p.entranceFrames));
    return <div key={index} style={{display:'flex',flexDirection:'column',transform:`translate(${pose.x}cqw, ${pose.y}cqw) rotate(${pose.rotation}deg)`,transformOrigin:incoming?'left bottom':'right bottom'}}>{children}</div>;
  };
  return <div style={{position:'absolute',inset:0,containerType:'inline-size',fontFamily:'Arial,Helvetica,sans-serif',fontWeight:400,fontStyle:'normal',color:'#17231F'}}>
    <div style={{position:'absolute',inset:'7% 6%',display:'flex',flexDirection:'column',gap:'5cqw'}}>
      {s.messages.map((message,i)=>stage(message.at,message.incoming,i,<PaperCutBubble {...message}/>))}
      {s.document&&stage(s.receive,true,3,<PaperCutBubble time="12:42" incoming><Document name={String(p.documentName)} download={s.download} label={String(p.documentLabel??'Documento')}/></PaperCutBubble>)}
    </div>
  </div>;
}
