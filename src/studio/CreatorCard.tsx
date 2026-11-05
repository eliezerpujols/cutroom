import React from 'react';
import {getRemotionEnvironment, Img, staticFile} from 'remotion';
import {cardArtUrl} from './creatorCards';
import {studioDefaults, type StudioInstance} from './registry';

export function CreatorCard({instance,frame,libraryPreview}: {instance:StudioInstance; frame:number; libraryPreview:boolean}) {
  const {template}=instance;
  const props={...studioDefaults(template),...instance.props};
  const progress=Math.min(1,Math.max(0,(frame-5)/34));
  const file=cardArtUrl(template);
  const ImageComponent=libraryPreview?'img':Img;
  const src=!libraryPreview&&getRemotionEnvironment().isRendering?staticFile(file.slice(1)):file;
  return <div style={{position:'relative',width:'100%',height:'100%'}}>
    <ImageComponent alt="" src={src} style={{width:'100%',height:'100%'}}/>
    <svg viewBox="0 0 400 312" width="100%" height="100%" style={{position:'absolute',inset:0}} aria-hidden="true">
      {template==='lesson-player'&&<rect x="21" y="288" width={37+162*progress} height="3" rx="1.5" fill="white"/>}
      {template==='price-editor'&&<text x="200" y="280" textAnchor="middle" fill="#FFFFFF"
        fontFamily="'Inter Variable', sans-serif" fontSize="22" fontWeight="700">Desbloquear por {String(props.amount)}</text>}
    </svg>
  </div>;
}
