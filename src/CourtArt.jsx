import React from 'react';

export function Ball({size=34}) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 40 40"><g fill="#fe783e" stroke="#262c29" strokeWidth="2.1"><circle cx="20" cy="20" r="17.5"/><path fill="none" d="M4 13q15 7 32 15M10 34 29 5M5 26Q23 28 23 3M18 37Q18 19 37 15"/></g></svg>;
}

export function Hoop({impact}) {
  return <svg className="sw-hoop" viewBox="0 0 260 200" aria-hidden="true">
    <path d="M121 122h18v68h-18z" fill="#a0a698"/>
    <rect x="14" y="11" width="236" height="115" rx="12" fill="#9da499"/>
    <rect x="10" y="6" width="236" height="114" rx="12" fill="#fbfcf5" stroke="#303b33" strokeWidth="3"/>
    <rect x="18" y="14" width="220" height="98" rx="7" fill="none" stroke="#c7cdc0" strokeWidth="2"/>
    <path d="M94 105V62h69v43" stroke="#fc7037" strokeWidth="5" fill="none"/>
    {[30,226].map(x=><g key={x} fill="#929d90"><circle cx={x} cy="24" r="2"/><circle cx={x} cy="103" r="2"/></g>)}
    <g className={impact.id ? 'sw-flex' : ''} style={{'--tilt':impact.side*2+'deg','--sway':impact.side*-7+'deg'}}>
    <g className="sw-net" fill="none" stroke="#526459" strokeWidth="2.4" strokeLinejoin="round">
    {Array.from({length:8},(_,i)=><g key={i}><path d={`M${74+i*16} 111 L${88+i*12} 142 L${102+i*8} 169`}/><path d={`M${74+i*16} 111 L${88+Math.max(0,i-1)*12} 142 L${102+Math.max(0,i-2)*8} 169`}/></g>)}
    <path d="M102 169q28 8 56 0"/></g>
    <ellipse cx="130" cy="110" rx="58" ry="8.5" stroke="#8d3a1b" strokeWidth="7" fill="none"/>
    <ellipse cx="130" cy="108" rx="58" ry="8" stroke="#ff7435" strokeWidth="6" fill="none"/>
    </g>
  </svg>;
}
