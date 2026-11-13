import React from 'react';
import {Camera,CheckCheck,ChevronLeft,Download,FileText,Mic,MousePointer2,Plus,Send,UserRound,Video,Phone} from 'lucide-react';
import type {StudioInstance} from './registry';
import {conversationDefaults,conversationProgress,conversationState} from './conversationTiming';

const ink='#17231F', green='#D9FDD3';
const iconStyle:React.CSSProperties={width:'4.4cqw',height:'4.4cqw',flexShrink:0,strokeWidth:1.65};
function Bubble({text,time,incoming=false,children,progress=1}:{text?:string;time:string;incoming?:boolean;children?:React.ReactNode;progress?:number}){
  const background=incoming?'#FFFFFF':green;
  return <div style={{position:'relative',alignSelf:incoming?'flex-start':'flex-end',maxWidth:'83%',minWidth:'23%',padding:'2.5cqw 2.9cqw 1.3cqw',borderRadius:'1.8cqw',background,boxShadow:'0 1px 2px #26352a22',opacity:progress,transform:`translateY(${(1-progress)*24}px) scale(${.96+.04*progress})`,transformOrigin:incoming?'left bottom':'right bottom'}}>
    <span style={{position:'absolute',top:0,[incoming?'left':'right']:'-1cqw',width:'2.3cqw',height:'2.3cqw',background,clipPath:incoming?'polygon(0 0,100% 0,100% 100%)':'polygon(0 0,100% 0,0 100%)'}}/>
    {text&&<div style={{fontSize:'4.1cqw',lineHeight:1.3,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{text}</div>}
    {children}
    <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:'.8cqw',fontSize:'2.65cqw',color:'#66756D',marginTop:'.6cqw'}}>{time}{!incoming&&<CheckCheck style={{...iconStyle,width:'3.5cqw',height:'3.5cqw',color:'#7E8A80'}}/>}</div>
  </div>;
}
function Document({name,download=1}:{name:string;download?:number}){
  return <div style={{display:'flex',alignItems:'center',gap:'2.3cqw',padding:'2.6cqw',background:'#66756D0D',borderRadius:'1.4cqw',minWidth:'42cqw'}}>
    <FileText style={{...iconStyle,width:'7.3cqw',height:'7.3cqw',color:'#D35555'}}/>
    <div style={{flex:1}}><div style={{fontSize:'3.9cqw',fontWeight:550}}>{name}</div><div style={{fontSize:'2.65cqw',color:'#728077',marginTop:'.8cqw'}}>PDF · Documento</div></div>
    {download<1?<div style={{width:'4.4cqw',height:'4.4cqw',borderRadius:'50%',background:`conic-gradient(#6BAE9E ${download*360}deg,#9CAA9F33 0)`,mask:'radial-gradient(transparent 48%,black 50%)'}}/>:<Download style={iconStyle}/>}
  </div>;
}

/** Printed conversation UI. Its outer box stays fixed; the timeline stages it. */
export function PaperConversation({instance,frame}:{instance:StudioInstance;frame:number}){
  const p={...conversationDefaults,...instance.props}, s=conversationState(frame,p);
  const root:React.CSSProperties={position:'absolute',inset:0,containerType:'inline-size',fontFamily:'Arial,Helvetica,sans-serif',fontStyle:'normal',fontWeight:400,color:ink};
  if(instance.template==='paper-message')return <div style={root}><div style={{position:'absolute',inset:'10% 4%',display:'flex',flexDirection:'column',justifyContent:'center',filter:'drop-shadow(0 7px 5px #004F8C18)'}}><Bubble text={String(p.message1)} time="09:41"/></div></div>;
  const entrance=conversationProgress(frame,0,8);
  const scroll=s.document?conversationProgress(frame,s.receive)*100:s.messages.length===3?conversationProgress(frame,Number(p.sendThirdAt))*20:0;
  return <div style={root}>
    <div style={{position:'absolute',inset:'1.5% 2%',background:'#FDFCF9',border:'5px solid #FFFFFF',borderRadius:'.8cqw',boxShadow:'2px 9px 13px #004F8C26',overflow:'hidden',opacity:entrance}}>
      <div style={{height:'11%',background:'#F8F8F6',borderBottom:'1px solid #D4D8D2',display:'flex',alignItems:'center',gap:'2.2cqw',padding:'0 2.5cqw'}}>
        <ChevronLeft style={{...iconStyle,color:'#168D73'}}/>
        <div style={{width:'8.3cqw',height:'8.3cqw',borderRadius:'50%',background:'#DFE5DF',display:'grid',placeItems:'center',color:'#8F9C93'}}><UserRound style={{...iconStyle,width:'5.5cqw',height:'5.5cqw'}}/></div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:'3.9cqw',fontWeight:600,filter:'blur(5px)',whiteSpace:'nowrap'}}>{p.contact}</div></div>
        <Video style={{...iconStyle,color:'#168D73',marginRight:'2cqw'}}/><Phone style={{...iconStyle,color:'#168D73'}}/>
      </div>
      <div style={{position:'absolute',top:'11%',bottom:'10%',left:0,right:0,overflow:'hidden',background:'#EFEAE2',padding:'4.5cqw 3.6cqw'}}>
        <div style={{display:'flex',flexDirection:'column',gap:'2.8cqw',transform:`translateY(${-scroll}px)`}}>
          <div style={{alignSelf:'center',fontSize:'2.7cqw',background:'#FFFFFFCC',padding:'.8cqw 2.5cqw',borderRadius:'1.1cqw',color:'#65746B',marginBottom:'1cqw'}}>Hoy</div>
          {s.messages.map((message,i)=><Bubble key={i} {...message} progress={conversationProgress(frame,message.at)}/>)}
          {s.document&&<Bubble time="12:42" incoming={s.documentIncoming} progress={conversationProgress(frame,s.receive)}><Document name={String(p.documentName)} download={s.documentIncoming?s.download:1}/></Bubble>}
        </div>
      </div>
      {s.attached&&<div style={{position:'absolute',left:'4%',right:'4%',bottom:'13%',padding:'4cqw',background:'#FFFFFF',borderRadius:'2cqw',boxShadow:'0 0 1px #728077,0 6px 20px #17231F22',transform:`translateY(${(1-conversationProgress(frame,s.receive-32))*90}px)`}}><Document name={String(p.documentName)}/><div style={{fontSize:'2.8cqw',color:'#728077',margin:'2cqw 0 0'}}>Enviar documento</div></div>}
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:'10%',padding:'1.9cqw 2.5cqw',background:'#F6F6F3',display:'flex',alignItems:'center',gap:'2.3cqw',borderTop:'1px solid #D4D8D2'}}>
        <Plus style={{...iconStyle,color:'#168D73'}}/>
        <div style={{minHeight:'6.4cqw',flex:1,border:'1px solid #D5DAD3',background:'#FFFFFF',borderRadius:'4cqw',fontSize:'3.3cqw',padding:'1.2cqw 2.4cqw',lineHeight:1.25}}>{s.draft||' '}{s.draft&&<span style={{color:'#168D73'}}>│</span>}</div>
        {s.draft?<Send style={{...iconStyle,color:'#168D73'}}/>:s.attached?<span style={{width:'4.4cqw'}}/>:<><Camera style={{...iconStyle,color:'#168D73'}}/><Mic style={{...iconStyle,color:'#168D73'}}/></>}
      </div>
      {s.attached&&frame>=s.receive-18&&<MousePointer2 style={{position:'absolute',width:'5.5cqw',height:'5.5cqw',right:`${5+(1-conversationProgress(frame,s.receive-18,12))*20}%`,bottom:`${4+(1-conversationProgress(frame,s.receive-18,12))*17}%`,zIndex:2,fill:'#FFFFFF',stroke:'#17231F',strokeWidth:1.4,filter:'drop-shadow(0 2px 2px #17231F55)'}}/>}
      {s.attached&&<div style={{position:'absolute',right:'4%',bottom:'3.5%',transform:`scale(${frame>=s.receive-4?.82:1})`,background:'#168D73',borderRadius:'50%',padding:'2cqw',color:'#FFFFFF'}}><Send style={iconStyle}/></div>}
    </div>
  </div>;
}
