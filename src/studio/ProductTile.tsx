import React from 'react';
import {studioDefaults, type StudioInstance} from './registry';

function ease(frame: number, start: number, duration: number) {
  const t = Math.min(1, Math.max(0, (frame-start)/duration));
  return 1-(1-t)**3;
}

export function ProductTile({instance, frame}: {instance: StudioInstance; frame: number}) {
  const props = {...studioDefaults(instance.template), ...instance.props};
  const entry = ease(frame, -1, 7);
  const stamp = ease(frame, Number(props.priceBeat)-1, 5);
  const ink = '#292929';
  const amount = String(props.price);
  return <svg width="100%" height="100%" viewBox="0 0 400 456" style={{display:'block'}} aria-hidden="true">
    <g opacity={entry} transform={`translate(0 ${18*(1-entry)}) rotate(${-3-entry} 200 228)`}>
      <rect x="20" y="13" width="360" height="424" rx="42" fill="#202020" opacity=".16" transform="translate(2 6)"/>
      <rect x="20" y="13" width="360" height="424" rx="42" fill="#FAFAFA"/>
      <rect x="32" y="25" width="336" height="239" rx="30" fill="#E6E6E6"/>
      <g fill="none" stroke="#878787" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        <rect x="164" y="114" width="72" height="56" rx="16"/>
        <circle cx="185" cy="130" r="4" fill="#878787" stroke="none"/>
        <path d="M167 158l13-13q4-4 8 0l5 5q3 3 6-1l10-12q3-4 7 0l17 18"/>
      </g>
      <rect x="43" y="284" width="218" height="12" rx="6" fill="#C5C5C5"/>
      <rect x="43" y="306" width="137" height="8" rx="4" fill="#E1E1E1"/>
      <g opacity={stamp} transform={`translate(0 ${8*(1-stamp)})`}>
        <rect x="42" y="338" width="202" height="75" rx="23" fill={String(props.accent)}/>
        <text x="143" y="391" textAnchor="middle" fontFamily="'Inter Variable', sans-serif" fontSize="51" fontWeight="850" letterSpacing="-2" fill={ink}
          textLength={amount.length>6?178:undefined} lengthAdjust="spacingAndGlyphs">{amount}</text>
      </g>
      <g transform="translate(317 375)">
        <circle r="27" fill={ink}/>
        <path d="M-9-5h18q3 0 3.4 3l1.2 11q.4 4-3.6 4h-20q-4 0-3.6-4l1.2-11Q-12-5-9-5Z M-5-4v-4a5 5 0 0 1 10 0v4" stroke="#FFFFFF" fill="none" strokeWidth="2.5" strokeLinejoin="round"/>
      </g>
    </g>
  </svg>;
}
