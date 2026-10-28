import React,{useEffect,useState} from 'react';
import {ArrowLeft,AudioLines,ClosedCaption,Download,LoaderCircle,SlidersHorizontal,Type,X} from 'lucide-react';
import {Button,IconButton} from './ui/primitives';
import {CaptionStyleEditor} from './CaptionStyleEditor';
import {cueText,type CaptionLayer,type CaptionSelection,type CaptionStyle} from './captions';
import {time} from './model';
import {api} from './useEditor';
import type {useCaptions} from './useCaptions';

type Props={projectId:string;layers:CaptionLayer[];selection:CaptionSelection;select:(value:CaptionSelection)=>void;seek:(frame:number)=>void;generation:ReturnType<typeof useCaptions>;styleOpen:boolean;setStyleOpen:(value:boolean)=>void;changeStyle:(patch:Partial<CaptionStyle>,record?:boolean)=>void;checkpoint:()=>void;hide:()=>void};
const TranscriptList=React.memo(function TranscriptList({layer,selectedCue,select,seek}:{layer:CaptionLayer;selectedCue?:string;select:Props['select'];seek:Props['seek']}){
  return <div className="caption-transcript">{layer.cues.map(cue=><button key={cue.id} className={`caption-transcript-row ${selectedCue===cue.id?'selected':''}`} onClick={()=>{select({layerId:layer.id,cueId:cue.id});seek(cue.start);}}><span>{time(cue.start,true)}</span><span>{cueText(cue)||'Empty caption'}</span></button>)}</div>;
});
export function CaptionsPanel({projectId,layers,selection,select,seek,generation,styleOpen,setStyleOpen,changeStyle,checkpoint,hide}:Props){
  const [language,setLanguage]=useState('auto');const layer=layers.find(item=>item.id===selection?.layerId)||layers[0];
  useEffect(()=>{if(styleOpen&&!layer)setStyleOpen(false);},[layer,setStyleOpen,styleOpen]);
  const [downloadError,setDownloadError]=useState('');
  async function download(format:'srt'|'vtt'){
    if(!layer)return;setDownloadError('');try{const result=await api<{url:string;filename:string}>(`/api/projects/${projectId}/caption-subtitles`,{method:'POST',body:JSON.stringify({layer,format})});const anchor=document.createElement('a');anchor.href=result.url;anchor.download=result.filename;anchor.click();}catch(error){setDownloadError((error as Error).message);}
  }
  const quote=generation.quote,reuseReady=generation.needsApply&&generation.job?.sourceSignature===generation.sourceSignature,blocked=layers.length>=4||(!reuseReady&&(!quote||!quote.configured||!quote.hasAudio||quote.reservedCredits>quote.maxCredits));
  if(styleOpen&&layer)return <div className="caption-panel caption-style-panel"><div className="panel-heading"><Button variant="ghost" size="sm" autoFocus onClick={()=>setStyleOpen(false)}><ArrowLeft size={15}/>Caption style</Button><IconButton label="Close caption style" onClick={()=>setStyleOpen(false)}><X size={15}/></IconButton></div><CaptionStyleEditor style={layer.style} change={changeStyle} checkpoint={checkpoint}/></div>;
  return <div className="caption-panel"><div className="panel-heading"><h2>Text</h2><IconButton label="Hide text panel" onClick={hide}><X size={15}/></IconButton></div>
    <div className="auto-transcript"><div className="caption-tool-heading"><AudioLines size={18}/><h3>Auto-transcript</h3></div><p>Turn your timeline's speech into captions.</p>
      <label className="field"><span>Spoken language</span><select className="input" aria-label="Transcription language" value={language} onChange={event=>setLanguage(event.target.value)} disabled={generation.busy}>{[['auto','Auto-detect'],['en','English'],['es','Español'],['fr','Français'],['pt','Português'],['de','Deutsch'],['it','Italiano'],['ja','日本語']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <Button className="full-width" disabled={generation.busy||blocked} onClick={()=>reuseReady?generation.apply():void generation.start(language)}>{generation.busy?<LoaderCircle size={15} className="spin"/>:<ClosedCaption size={16}/>} {generation.busy?(generation.job?.status==='transcribing'?'Transcribing…':'Preparing audio…'):reuseReady?'Add captions':layers.length?'Generate another layer':'Generate captions'}</Button>
      {reuseReady?<p className="caption-cost">Reuse the completed transcription. No new credits.</p>:quote&&!generation.busy&&<p className="caption-cost">{!quote.configured?'ElevenLabs key is missing.':!quote.hasAudio?'Add or unmute audio to transcribe.':quote.reservedCredits>quote.maxCredits?`Estimate exceeds the ${quote.maxCredits.toLocaleString()}-credit limit.`:`About ${quote.estimatedCredits.toLocaleString()} credits · ElevenLabs`}</p>}
      {!quote&&!reuseReady&&<div className="caption-connection" role="status">{generation.quoteState==='unavailable'?<><span>Caption controls are unavailable.</span><Button variant="ghost" size="sm" onClick={generation.retryQuote}>Reconnect</Button></>:<><LoaderCircle className="spin" size={12}/><span>{generation.quoteState==='reconnecting'?'Connecting to captions…':'Checking availability…'}</span></>}</div>}
      {generation.error&&<div className="caption-error" role="alert">{generation.error}</div>}
      {generation.job?.status==='failed'&&<p className="caption-error" role="alert">{generation.job.error}</p>}
      {generation.needsApply&&!reuseReady&&<div className="caption-ready"><p>The timeline changed during transcription. These captions match the earlier audio.</p><Button variant="outline" className="full-width" onClick={generation.apply}>Add earlier captions</Button></div>}
    </div>
    {layer?<><div className="caption-list-heading"><div>{layers.length>1?<select className="caption-layer-select" aria-label="Caption layer" value={layer.id} onChange={event=>select({layerId:event.target.value})}>{layers.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>:<h3>Captions <span>{layer.cues.length}</span></h3>}</div><IconButton label="Caption style" onClick={()=>{select({layerId:layer.id});setStyleOpen(true);}}><SlidersHorizontal size={16}/></IconButton></div>
      <>{layer.sourceSignature&&layer.sourceSignature!==generation.sourceSignature&&<p className="caption-sync-note">Audio changed. Review caption timing.</p>}<TranscriptList layer={layer} selectedCue={selection?.cueId} select={select} seek={seek}/></>
      <div className="caption-downloads"><Button variant="ghost" size="sm" onClick={()=>void download('srt')}><Download size={13}/>SRT</Button><Button variant="ghost" size="sm" onClick={()=>void download('vtt')}><Download size={13}/>VTT</Button></div>{downloadError&&<p className="caption-error" role="alert">{downloadError}</p>}
    </>:<div className="caption-empty"><Type size={24} strokeWidth={1.3}/><p>Your captions will appear here and on their own timeline track.</p></div>}
  </div>;
}
