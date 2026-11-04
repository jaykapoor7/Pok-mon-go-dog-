"use client";
import {useEffect,useId,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {getImageProps} from 'next/image';
import {useReducedMotion} from './controller';
import {useKajuAmbient} from './ambient';
import {POSES,type KajuState,type Part,type T} from './poses';
import './kaju.css';

const ART=getImageProps({src:'/kaju/companion-rig.png',alt:'',width:512,height:512,quality:90}).props.src;
/** Source remains unmodified. Silhouette clips isolate the joints cleanly. */
const TEXTURES={
 head:{box:[39,56,343,349],shape:'M50 0C78 0 97 21 99 47C102 69 94 86 83 96C72 101 31 101 18 98C7 94 1 79 0 59C-1 36 8 14 28 4C36 1 44 0 50 0Z'},
 torso:{box:[446,74,355,334],shape:'M31 1C44 0 63 0 77 1C82 4 82 13 87 21C95 37 100 51 100 65C100 87 82 100 55 100C26 102 7 95 1 78C-3 59 5 38 12 25C18 14 19 2 31 1Z'},
 earL:{box:[62,449,269,363],shape:'M60 0C77 -1 95 5 99 13C101 25 88 27 79 30C69 36 66 49 64 65C61 85 47 99 30 100C13 100 0 89 0 74C1 47 15 20 40 5C47 2 53 0 60 0Z'},
 earR:{box:[923,55,256,345],shape:'M26 0C49 -1 69 13 80 32C93 53 102 77 99 91C97 101 86 101 73 98C53 92 37 79 31 62C26 48 29 32 20 28C7 25 -1 24 1 16C3 6 15 1 26 0Z'},
 armL:{box:[433,465,326,335],shape:'M84 0C97 1 103 11 99 25C93 49 76 70 55 84L22 99C17 100 12 99 11 96C8 97 3 96 2 91C1 87 5 83 7 81C0 79 -1 74 2 70C5 66 11 67 15 68C18 61 28 58 36 62C53 51 65 40 68 22C70 10 74 1 84 0Z'},
 armR:{box:[858,464,356,331],shape:'M16 0C25 0 31 8 33 18C36 35 44 48 58 50C62 41 65 35 72 36C80 37 80 43 77 48C86 41 94 42 97 46C101 51 96 57 91 59C101 58 104 64 100 69C98 73 92 74 88 73C99 81 99 87 94 91C88 94 82 87 78 85C68 93 52 94 39 87C17 76 7 57 2 33C-2 14 0 1 16 0Z'},
 footL:{box:[86,931,211,240],shape:'M19 1C42 -4 82 7 93 20C100 33 101 57 94 73C87 90 72 100 48 100C25 100 9 85 3 61C-2 41 0 16 9 5Z'},
 footR:{box:[508,931,212,240],shape:'M30 4C54 -4 82 -1 94 15C104 32 99 61 91 76C82 93 65 100 42 99C17 97 4 79 1 59C-2 37 8 12 30 4Z'},
 laptop:{box:[836,899,390,282],shape:'M38 7L85 0C99 -1 102 9 98 23L87 78C86 83 81 86 76 87L80 92L17 100L0 89L0 80L25 66L30 18C31 11 33 9 38 7Z'},
}as const;
type TextureName=keyof typeof TEXTURES;
function Texture({name,x,y,width,height}:{name:TextureName;x:number;y:number;width:number;height:number}){const id=useId();const{box,shape}=TEXTURES[name];const[cx,cy,cw,ch]=box;return<svg x={x} y={y} width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none" overflow="hidden"><defs><clipPath id={id}><path d={shape}/></clipPath></defs><g clipPath={`url(#${id})`}><image href={ART} x={-cx/cw*100} y={-cy/ch*100} width={1254/cw*100} height={1254/ch*100} preserveAspectRatio="none"/></g></svg>}
const transform=(p:T):CSSProperties=>({transform:`translate(${p.x}px,${p.y}px) rotate(${p.r??0}deg) scale(${p.sx??1},${p.sy??1})`,opacity:p.hide?0:1});
type Props={state?:KajuState;size?:number|string;label?:string;still?:boolean;flip?:boolean;className?:string};
export function Kaju({state='sitting',size=120,label,still=false,flip=false,className=''}:Props){
 const ref=useRef<SVGSVGElement>(null),[visible,setVisible]=useState(false),[awake,setAwake]=useState(false);const[ambient]=useKajuAmbient(),reduced=useReducedMotion();
 useEffect(()=>{const el=ref.current;if(!el)return;const observer=new IntersectionObserver(([e])=>setVisible(e.isIntersecting));observer.observe(el);const read=()=>setAwake(document.visibilityState==='visible');read();document.addEventListener('visibilitychange',read);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',read)}},[]);
 still=still||!ambient||reduced;const pose=POSES[state]??POSES.sitting,loops=still?[]:pose.loops,has=(name:string)=>loops.some(l=>l===name);const gait=has('walk')?'walk':has('trot')?'trot':'';
 const part=(name:Part,child:ReactNode,loop='')=><g className={`kj-pose kj-${name}`} style={transform(pose.parts[name])}><g className={`kj-loop ${loop}`}>{child}</g></g>;
 return<svg ref={ref} className={`kaju kaju-companion is-${state} eyes-${pose.eyes}${still?' is-still':''}${!visible||!awake?' is-paused':''}${flip?' is-flip':''} ${loops.map(l=>`l-${l}`).join(' ')} ${className}`} viewBox="0 0 240 200" width={size} height={typeof size==='number'?size*200/240:undefined} role={label?'img':undefined} aria-label={label?`${label} (${pose.label})`:undefined} aria-hidden={label?undefined:true} focusable="false" data-kaju-state={state} data-kaju-art="companion" data-kaju-rig="articulated">
 <g className="kj-flip"><ellipse className="kj-shadow" cx="120" cy="194" rx="57" ry="4" style={{opacity:state==='peeking'?0:.11,transform:`scaleX(${pose.shadow??1})`}}/>
 <g className={`kj-whole ${has('hop')?'hop':has('wag')?'sway':''}`}>
 {part('bFar',<Foot far/>,gait?`${gait}-foot far`:'')}{part('bNear',<Foot/>,gait?`${gait}-foot near`:'')}
 {part('fFar',<Arm far/>,gait?`${gait}-arm far`:has('type')?'typing far':'')}
 {part('head',<Head eyes={pose.eyes} mouth={pose.mouth} ears={pose.ears} brows={pose.brows} blink={has('blink')} twitch={has('twitch')} state={state}/>,gait?'gait-head':has('look')?'look':has('think')?'ponder':has('sigh')?'sigh':has('wake')?'wake':'')}
 {part('torso',<Texture name="torso" x={-43} y={-40} width={86} height={92}/>,gait?'gait-body':has('breathe')?'breathe':'')}

 {part('fNear',<Arm/>,gait?`${gait}-arm near`:has('wave')?'wave':has('type')?'typing near':has('explain')?'explain':'')}
 <g className="kj-laptop" style={{opacity:state==='working'?1:0}} aria-hidden data-kaju-prop="laptop"><Texture name="laptop" x={78} y={136} width={86} height={60}/></g>
 </g>
 {has('zz')&&<g className="kj-zz"><text x="185" y="117">z</text><text x="198" y="100">z</text><text x="210" y="83">Z</text></g>}
 {has('think')&&<g className="kj-think"><circle cx="179" cy="60" r="2"/><circle cx="187" cy="51" r="3"/><circle cx="196" cy="41" r="4"/></g>}
 {has('puzzle')&&<g className="kj-question"><path d="M184 42C183 31 204 30 204 42C204 50 193 48 193 57M193 64v1"/></g>}
 {has('sparkle')&&<g className="kj-spark"><path d="m190 36 3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/></g>}
 </g></svg>
}
function Arm({far=false}:{far?:boolean}){
 const id=useId(),elbow=far?-7:7;
 const art=<Texture name={far?'armL':'armR'} x={far?-38:-8} y={-5} width={48} height={62}/>;
 return<g className="kj-arm"><defs><clipPath id={`${id}-upper`}><path d={far?'M-50-10H15V44Z':'M50-10H-15V44Z'}/></clipPath><clipPath id={`${id}-lower`}><path d={far?'M-50-12 15 42V80H-60Z':'M50-12-15 42V80H60Z'}/></clipPath></defs><g clipPath={`url(#${id}-upper)`}>{art}</g><g transform={`translate(${elbow} 27)`}><g className="kj-elbow"><g transform={`translate(${-elbow} -27)`} clipPath={`url(#${id}-lower)`}>{art}</g></g></g></g>
}
function Foot({far=false}:{far?:boolean}){return<g className="kj-ankle"><Texture name={far?'footL':'footR'} x={-15} y={-4} width={31} height={29}/></g>}
function Head({eyes='open',mouth='smile',ears='relaxed',brows=false,blink=false,twitch=false,state='sitting'}:{eyes?:string;mouth?:string;ears?:string;brows?:boolean;blink?:boolean;twitch?:boolean;state?:KajuState}){
 const id=useId();const happy=eyes==='happy',closed=eyes==='closed',half=eyes==='half';const up=eyes==='up'?-4:state==='working'?2:0;
 return<g className="kj-head-shape"><Texture name="head" x={-46} y={-62} width={92} height={95}/>
 <g className="kj-ear kj-ear-left" style={{transform:`translate(-35px,-54px) rotate(${ears==='back'?-8:2}deg)`}}><g className={twitch?'ear-flutter':''}><Texture name="earL" x={-22} y={-2} width={34} height={65}/></g></g>
 <g className="kj-ear kj-ear-right" style={{transform:`translate(36px,-53px) rotate(${ears==='back'?9:-2}deg)`}}><g className={twitch?'ear-follow':''}><Texture name="earR" x={-9} y={-2} width={33} height={64}/></g></g>
 <defs><filter id={`${id}-glow`} x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.4"/></filter><clipPath id={`${id}-screen`}><path d="M-25-32Q4-42 31-32Q40-26 37 2Q35 13 5 13Q-24 13-27 2Q-31-18-25-32Z"/></clipPath></defs>
 <g className="kj-display" data-kaju-expression={state} clipPath={`url(#${id}-screen)`}>
 <g className="kj-screen-details" fill="none" stroke="#70e3f1" strokeWidth=".65" strokeLinecap="round"><path d="M-24-14v8q0 8 8 9M-20 6h5m2 0h1M28 5h3m-1-2v4M26-25q4-4 8 0m-6 2q2-2 4 0m-2 2v.1"/><path d="m-19-30 1.3 3 2.8.7-2.8 1-1.3 3-1-3-2.6-1 2.6-.7z" fill="#72e6ee"/><circle cx="-23" cy="-19" r=".6" fill="#72e6ee"/><circle cx="-13" cy="-33" r=".5" fill="#72e6ee"/></g>
 <g transform={`translate(0 ${up})`} className="kj-face-features" fill="#ffe780" stroke="#ffe780" strokeWidth="2" strokeLinecap="round"><g className={blink?'kj-eye-pair blink':'kj-eye-pair'}><g className="kj-gaze">
 {closed||happy?<><path d={closed?'M-14-12q4 3 8 0':'M-14-9q4-7 8 0'} fill="none"/><path d={closed?'M16-12q4 3 8 0':'M16-9q4-7 8 0'} fill="none"/></>:half?<><path d="M-14-11h8M16-11h8" fill="none"/></>:<><ellipse className="kj-eye" cx="-10" cy="-13" rx={eyes==='wide'?3.4:2.8} ry={eyes==='wide'?5.4:4.7} stroke="none"/><ellipse className="kj-eye" cx="20" cy="-13" rx={eyes==='wide'?3.4:2.8} ry={eyes==='wide'?5.4:4.7} stroke="none"/><g filter={`url(#${id}-glow)`} opacity=".65"><ellipse cx="-10" cy="-13" rx="3" ry="5"/><ellipse cx="20" cy="-13" rx="3" ry="5"/></g></>}
 </g></g>{mouth==='open'?<path d="M-2 0Q5 3 12 0Q10 9 5 9Q0 9-2 0Z" strokeWidth=".6"/>:mouth==='flat'?<path d={state==='confused'?'M1 5q4-3 8 0':'M2 4h6'} fill="none" strokeWidth="1.7"/>:<path d="M-1 1q6 8 12 0" fill="none"/>}{(brows||state==='confused')&&<g className="kj-brows" fill="none" strokeWidth="1.3"><path d={state==='confused'?'M-15-23q4-4 9-1M16-23l8 1':'m-15-20 9-3M16-23l8 3'}/></g>}
 </g></g></g>
}
/** Compact placements use the same head, ears and screen details. */
export function KajuFace({size=20,className=''}:{size?:number;className?:string}){return<svg className={`kaju-face kaju kaju-companion ${className}`} viewBox="-63 -66 126 105" width={size} height={size} aria-hidden focusable="false"><Head/></svg>}
