"use client";

import {useEffect,useRef,useState} from 'react';
import {Kaju} from './Kaju';
import {useKajuAmbient} from './ambient';
import {useKajuSequence,useReducedMotion} from './controller';
import {ALL_STATES,POSES,type KajuState,type Step} from './poses';
import './preview.css';

// Character states only. This preview never calls Kaju's record/action APIs.
const TOUR:Step[]=[
 {state:'greeting',ms:2300},{state:'listening',ms:2300},{state:'looking',ms:2600},
 {state:'headTilt',ms:2200},{state:'earTwitch',ms:2200},{state:'thinking',ms:2600},
 {state:'explaining',ms:2300},{state:'insight',ms:2200},{state:'success',ms:2200},
 {state:'standing',ms:1000},{state:'walking',ms:3300},{state:'trotting',ms:2760},
 {state:'standing',ms:1000},{state:'tailWag',ms:2200},{state:'sitting',ms:2200},
 {state:'concerned',ms:2200},{state:'error',ms:2200},{state:'listening',ms:1400},
 {state:'peeking',ms:2200},{state:'goodbye',ms:2200},{state:'settling',ms:1800},
 {state:'lying',ms:2800},{state:'sleeping',ms:3600},{state:'waking',ms:1800},
 {state:'stretching',ms:2200},{state:'standing',ms:1000},{state:'sitting',ms:2200},
];

export function KajuMotionPreview(){
 const [open,setOpen]=useState(false),[cycling,setCycling]=useState(false),[paused,setPaused]=useState(false);
 const [selected,setSelected]=useState<KajuState>('sitting');
 const [visible,setVisible]=useState(false),[awake,setAwake]=useState(false);
 const ref=useRef<HTMLDivElement>(null);
 const [ambient]=useKajuAmbient();const reduced=useReducedMotion();
 useEffect(()=>{
  const node=ref.current;if(!open||!node)return;
  const io=new IntersectionObserver(([e])=>setVisible(e.isIntersecting),{threshold:.1});io.observe(node);
  const check=()=>setAwake(document.visibilityState==='visible');check();document.addEventListener('visibilitychange',check);
  return()=>{io.disconnect();document.removeEventListener('visibilitychange',check);setVisible(false)};
 },[open]);
 const motion=ambient&&!reduced&&!paused;
 const tour=useKajuSequence(TOUR,{loop:true,run:open&&cycling&&motion&&visible&&awake});
 const state=cycling?tour:selected;
 return <details className="kj-preview" onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary>See Kaju move</summary>
  {open&&<div ref={ref} className="kj-preview-in" role="region" aria-label="Kaju character preview">
   <div className="kj-preview-stage"><Kaju state={state} size={264} still={!motion} label="Kaju Explorer" /></div>
   <div className="kj-preview-controls">
    <p className="s4-eyebrow">Character preview · {ALL_STATES.length} states</p>
    <h2 className="s4-h4">Meet Kaju in motion</h2>
    <p className="s4-body">The same Kaju used across StrayPaw. These movements preview the character; they do not run tasks.</p>
    <label htmlFor="kaju-preview-state">Movement</label>
    <select id="kaju-preview-state" value={state} onChange={e=>{setSelected(e.target.value as KajuState);setCycling(false);setPaused(false)}}>
     {ALL_STATES.map(s=><option key={s} value={s}>{POSES[s].label}</option>)}
    </select>
    <div className="kj-preview-actions">
     <button type="button" className="s4-btn is-primary" disabled={!ambient||reduced||cycling&&!paused} onClick={()=>{setCycling(true);setPaused(false)}}>Play all movements</button>
     <button type="button" className="s4-btn is-line" disabled={!ambient||reduced} onClick={()=>setPaused(v=>!v)}>{paused?'Resume motion':'Pause motion'}</button>
    </div>
    <p className="s4-small">{reduced?'Your device requests reduced motion. You can still select each pose.':!ambient?'Animation is off in your StrayPaw settings. You can still select each pose.':paused?'Motion paused.':'Choose a movement or play the full sequence.'}</p>
   </div>
  </div>}
 </details>;
}
