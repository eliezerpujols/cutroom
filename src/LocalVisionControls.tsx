import React from 'react';
import {ScanFace,Scissors,LoaderCircle,X} from 'lucide-react';
import {InspectorSection} from './InspectorSection';
import {Button,IconButton} from './ui/primitives';
import type {Clip} from './model';
import type {useLocalVision} from './localVision';
export function LocalVisionControls({clip,vision,removeTracking}:{clip:Clip;vision:ReturnType<typeof useLocalVision>;removeTracking:()=>void}){
 return <InspectorSection title="Camera & cutout">{vision.job?<div className="local-vision-progress" role="status"><LoaderCircle size={14} className="spin"/><span>{vision.job.kind==='cutout'?'Cutting out':'Tracking face'} · {Math.round(vision.job.progress*100)}%</span><IconButton label="Cancel local processing" onClick={vision.cancel}><X size={14}/></IconButton></div>:<div className="local-vision-tools"><Button variant="outline" size="sm" disabled={!vision.available} onClick={()=>void vision.start('cutout',clip)}><Scissors size={14}/>Person cutout</Button>{clip.transform?.faceTrack?.length?<Button variant="outline" size="sm" onClick={removeTracking}><ScanFace size={14}/>Remove tracking</Button>:<Button variant="outline" size="sm" disabled={!vision.available} onClick={()=>void vision.start('track',clip)}><ScanFace size={14}/>Track face</Button>}</div>}{vision.available===false&&<p className="field-hint">These local tools require macOS.</p>}</InspectorSection>;
}
