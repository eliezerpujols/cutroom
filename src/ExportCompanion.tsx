import React from 'react';
import {Download} from 'lucide-react';
export type Companion={filename:string;url:string;frame:number};
export function ExportCompanion({cover,error}:{cover?:Companion;error?:string}){
  if(error)return <p className="inline-error" role="alert">Video saved. Cover could not be exported: {error}</p>;
  if(!cover)return null;
  return <div className="export-cover-companion"><span>Cover PNG</span><a className="button button-outline button-sm" href={cover.url} download={cover.filename}><Download size={14}/><span>{cover.filename}</span></a></div>;
}
