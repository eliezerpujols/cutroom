import React from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import {IconButton,Slider} from './ui/primitives';
import {AudioFadeControls} from './ClipAdjustments';
import {commonStyleValue} from './StyleControls';
import type {Clip} from './model';

export function ClipAudioControls({clips,change,checkpoint}:{
  clips:Clip[];
  change:(patch:Partial<Clip>,record?:boolean)=>void;
  checkpoint:()=>void;
}){
  const muted=commonStyleValue(clips,'muted');
  const volume=commonStyleValue(clips,'volume');
  const singleAudio=clips.length===1&&clips[0].kind==='audio';
  const label=muted===true?'Unmute clip':'Mute clip';
  return <div className="inspector-section">
    <div className="section-title">
      <h3>{singleAudio?'Volume':'Clip audio'}</h3>
      {!singleAudio&&<IconButton label={label} aria-pressed={muted??'mixed'} onClick={()=>change({muted:muted!==true})}>
        {muted===true?<VolumeX size={16}/>:<Volume2 size={16}/>}
      </IconButton>}
    </div>
    <div className="volume-control">
      <Slider label="Clip volume" valueText={volume===undefined?'Mixed':Math.round(volume*100)+'%'} min={0} max={2} step={.01} value={[volume??1]}
        onPointerDown={checkpoint}
        onKeyDown={event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))checkpoint();}}
        onValueChange={([next])=>change(clips.length===1?{volume:next,muted:false}:{volume:next},false)}/>
      <span>{muted===true?'Muted':volume===undefined?'Mixed':Math.round(volume*100)+'%'}</span>
    </div>
    {clips.length===1&&clips[0].kind==='video'&&muted&&<p className="field-hint">Embedded sound is muted. Your separate audio track still plays.</p>}
    <AudioFadeControls clips={clips} change={change} checkpoint={checkpoint}/>
  </div>;
}
