import React from 'react';
import type {StudioInstance} from './registry';

// Anonymous comment card: flat white card, initials avatar, blurred name on the
// avatar's centre line and the message below. 968 design units span the width.
const u=(units:number)=>`${units*100/968}cqw`;
export const commentCardDefaults={initials:'EP',name:'Entrenador personal',message:'Una vez pagué por la rutina de un\nentrenador muy conocido y recibí\ncontenido de…',background:'#FFFFFF',avatar:'#99D2FF',initialsColor:'#004F8C',color:'#1D2934',radius:44};

export function CommentCard({instance}:{instance:StudioInstance}){
  const p={...commentCardDefaults,...instance.props} as typeof commentCardDefaults;
  return <div style={{position:'absolute',inset:0,containerType:'inline-size',fontFamily:'Epilogue,"Inter Variable",sans-serif',letterSpacing:'-.018em',fontStyle:'normal'}}>
    <div style={{position:'absolute',inset:0,background:p.background,borderRadius:u(Number(p.radius))}}>
      <div style={{position:'absolute',left:u(32),top:u(30),width:u(80),height:u(80),borderRadius:u(18),background:p.avatar,display:'grid',placeItems:'center',color:p.initialsColor,fontSize:u(35),fontWeight:700,lineHeight:1}}><span style={{transform:`translateY(${u(2)})`}}>{p.initials}</span></div>
      <div style={{position:'absolute',left:u(145),top:u(30),height:u(80),display:'flex',alignItems:'center'}}><span style={{fontSize:u(34),fontWeight:700,color:p.color,filter:`blur(${u(9)})`,whiteSpace:'nowrap'}}>{p.name}</span></div>
      <div style={{position:'absolute',left:u(145),right:u(40),top:u(128),fontSize:u(39),fontWeight:500,lineHeight:1.09,color:p.color,whiteSpace:'pre-wrap'}}>{p.message}</div>
    </div>
  </div>;
}
