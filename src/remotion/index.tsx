import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {EditComposition,type EditorProps} from './Composition';
import {endFrame} from '../model';
const defaults:EditorProps={project:{version:1,name:'Untitled',width:1080,height:1920,fps:30,clips:[],tracks:[]},assets:[]};
function Root(){return <Composition id="Cutroom" component={EditComposition} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={defaults}
  calculateMetadata={({props})=>({width:props.project.width,height:props.project.height,durationInFrames:endFrame(props.project)})}/>;}
registerRoot(Root);
