import {PaperConversation} from './PaperConversation';
import {ProductFlowDemo} from './ProductFlowDemo';
import {CommunicationBeat} from './CommunicationBeat';
import {CommunitySelection} from './CommunitySelection';
import {CreatorProgramScreen} from './CreatorProgramScreen';
import React from 'react';
import {HeartPop} from './HeartPop';
import {CreatorCard} from './CreatorCard';
import {creatorCardArt} from './creatorCards';
import {ProductTile} from './ProductTile';
import {SpokenQuestion} from './SpokenQuestion';
import {orbitPose,studioDefaults,type StudioInstance} from './registry';
export function StudioElement({instance,frame,libraryPreview=false}:{instance:StudioInstance;frame:number;libraryPreview?:boolean}){
  if(instance.template==='product-flow-demo-es')return <ProductFlowDemo instance={instance} frame={frame} libraryPreview={libraryPreview}/>;
  if(instance.template==='paper-conversation'||instance.template==='paper-message')return <PaperConversation instance={instance} frame={frame}/>;
  if(instance.template==='communication-beat')return <CommunicationBeat instance={instance} frame={frame}/>;
  if(instance.template==='community-selection')return <CommunitySelection instance={instance} frame={frame}/>;
  if(instance.template==='creator-program-screen')return <CreatorProgramScreen instance={instance} frame={frame} libraryPreview={libraryPreview}/>;
  if(instance.template==='heart-pop')return <HeartPop instance={instance} frame={frame} libraryPreview={libraryPreview}/>;
  if(creatorCardArt[instance.template])return <CreatorCard instance={instance} frame={frame} libraryPreview={libraryPreview}/>;
  if(instance.template==='product-tile')return <ProductTile instance={instance} frame={frame}/>;
  if(instance.template==='spoken-question')return <SpokenQuestion instance={instance} frame={frame}/>;
  if(instance.template!=='orbit-card')return null;
  const p={...studioDefaults(instance.template),...instance.props},pose=orbitPose(frame,Number(p.turnSeconds));
  const face:React.CSSProperties={position:'absolute',inset:0,backfaceVisibility:'hidden',borderRadius:'8% / 13.33%',background:String(p.background),color:String(p.color),padding:'8%',boxSizing:'border-box',overflow:'hidden',border:'1px solid #ffffff30',boxShadow:'0 18px 45px #0003'};
  return <div style={{position:'absolute',inset:0,fontFamily:'"Inter Variable", sans-serif',perspective:1200,containerType:'inline-size'}}><div style={{position:'absolute',inset:0,transformStyle:'preserve-3d',transform:`translateY(${pose.lift}%) rotateX(${pose.rotateX}deg) rotateY(${pose.rotateY}deg)`}}>
    <div style={face}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:'2.3cqw',letterSpacing:'.2em',fontWeight:600}}>{p.tag}</span><span style={{width:'9%',aspectRatio:1,borderRadius:'50%',background:String(p.accent)}}/></div><div style={{position:'absolute',bottom:'17%',left:'8%',right:'8%'}}><div style={{fontSize:'7cqw',fontWeight:650,lineHeight:1.15,overflowWrap:'anywhere'}}>{p.title}</div><div style={{fontSize:'3cqw',opacity:.75,marginTop:'3%'}}>{p.subtitle}</div></div><div style={{position:'absolute',height:3,bottom:'8%',left:'8%',width:'20%',background:String(p.accent)}}/></div>
    <div style={{...face,transform:'rotateY(180deg)',display:'grid',placeItems:'center'}}><div style={{width:'32%',aspectRatio:1,border:`3px solid ${p.accent}`,borderRadius:'50%',display:'grid',placeItems:'center',transform:'rotate(-20deg)'}}><span style={{fontSize:'8cqw',fontWeight:700,color:String(p.accent)}}>{String(p.title).split(/\s+/).map(s=>s[0]).join('').slice(0,2)}</span></div></div>
  </div></div>;
}
