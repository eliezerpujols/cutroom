import React from 'react';
import {AbsoluteFill,useCurrentFrame} from 'remotion';
import type {Project} from '../model';
import {visibleVideoText} from '../videoText';
import {CoverTextContent,coverTextPosition} from './Visuals';

export function VideoTextOverlay({project}:{project:Project}){
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{pointerEvents:'none',overflow:'hidden'}}>{visibleVideoText(project,frame).reverse().map(text=><div key={text.id} style={coverTextPosition(text)}><CoverTextContent text={text}/></div>)}</AbsoluteFill>;
}
