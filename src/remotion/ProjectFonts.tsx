import React,{useEffect,useState} from 'react';
import {cancelRender,getRemotionEnvironment,useDelayRender} from 'remotion';
import {loadProjectFont} from '../fontLoading';
export function ProjectFonts({families,projectId}:{families:string[];projectId?:string}){
  const {delayRender,continueRender}=useDelayRender();
  const [handle]=useState(()=>delayRender('Loading project fonts'));
  const [error,setError]=useState('');
  useEffect(()=>{let disposed=false;const load=async()=>{if(!projectId&&families.length)throw new Error('Project fonts require a project ID.');await Promise.all(families.map(family=>loadProjectFont(projectId!,family)));};void load().then(()=>{if(!disposed)continueRender(handle);}).catch(error=>{if(disposed)return;if(getRemotionEnvironment().isRendering)cancelRender(error);else {setError((error as Error).message);continueRender(handle);}});return()=>{disposed=true;continueRender(handle);};},[handle,projectId]);
  return error?<div role="alert" style={{position:'absolute',inset:'auto 12px 12px',zIndex:100,background:'#fff',color:'#a11',padding:12,fontSize:14}}>{error}</div>:null;
}
