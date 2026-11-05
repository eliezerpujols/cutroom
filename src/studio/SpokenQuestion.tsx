import React, {useId} from 'react';
import {studioDefaults, type StudioInstance} from './registry';

function reveal(frame: number, start: number, duration: number) {
  const t = Math.max(0, Math.min(1, (frame - start) / duration));
  return 1 - (1 - t) ** 3;
}

export function SpokenQuestion({instance, frame}: {instance: StudioInstance; frame: number}) {
  const props = {...studioDefaults(instance.template), ...instance.props};
  const heading = String(props.lead);
  const word = String(props.word);
  const ending = String(props.ending);
  const ink = String(props.ink);
  const accent = String(props.accent);
  const lead = reveal(frame, -1, 6);
  const hit = reveal(frame, Number(props.wordBeat) - 1, 6);
  const tail = reveal(frame, Number(props.endBeat) - 1, 7);
  const underline = reveal(frame, Number(props.wordBeat) + 3, 11);
  const maskId = useId();
  return <svg viewBox="0 0 800 480" width="100%" height="100%" style={{display:'block'}} aria-hidden="true">
    <defs><clipPath id={maskId}><rect x="0" y="104" width="800" height="202"/></clipPath></defs>
    <g fill={ink} opacity={lead} transform={`translate(0 ${12 * (1-lead)}) rotate(-3 95 107)`}>
      <text x="37" y="104" fontFamily="Georgia, serif" fontStyle="italic" fontSize="77"
        textLength={Math.min(713, heading.length * 38)} lengthAdjust="spacingAndGlyphs">{heading}</text>
    </g>
    <g clipPath={`url(#${maskId})`}>
      <text x="396" y={286 + (1-hit)*183} opacity={hit} textAnchor="middle" fill={accent}
        fontFamily="'Inter Variable', sans-serif" fontWeight="900" fontSize="219"
        textLength={Math.min(750,word.length*150)} lengthAdjust="spacingAndGlyphs">{word}</text>
    </g>
    <path d="M38 312 Q320 291 757 300 Q652 302 600 313" fill="none" stroke={accent}
      strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray="1"
      strokeDashoffset={1-underline} opacity={underline}/>
    <text x="763" y={388+(1-tail)*14} opacity={tail} textAnchor="end" fill={ink}
      fontFamily="Georgia, serif" fontStyle="italic" fontSize="76" transform="rotate(-5 763 388)"
      textLength={Math.min(715, ending.length*33)} lengthAdjust="spacingAndGlyphs">{ending}</text>
  </svg>;
}
