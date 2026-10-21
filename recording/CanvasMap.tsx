import indiaMask from "../public/geo/india-mask.json";
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {INK} from '@/sp/map/ground';
import {compressedGround} from './coimbatore-ground';
import {bucketOf,RECENCY} from '@/sp/atlas/recency';
let groundPromise:Promise<any[]>|null=null;
function ground(){return groundPromise??=new Response(new Blob([Uint8Array.from(atob(compressedGround),c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).json().then(d=>d.features);}
const project=([lng,lat]:number[])=>[(lng+180)/360,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2];
const unproject=([x,y]:number[])=>[x*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI];
export type CanvasHandle={fly:(c:number[],z?:number)=>void;zoom:(d:number)=>void};
type Props={national?:boolean;cells?:any[];lens?:string;selected?:string|null;onArea?:(h:string)=>void;point?:{lat:number;lng:number}|null;picking?:boolean;onPick?:(p:{lat:number;lng:number})=>void;panel?:boolean;quiet?:boolean;onCenter?:(c:[number,number])=>void};
export const CanvasMap=forwardRef<CanvasHandle,Props>(function CanvasMap({national=false,cells=[],lens='animals',selected,onArea,point,picking,onPick,panel=true,quiet=false,onCenter},ref){
 const canvas=useRef<HTMLCanvasElement>(null),host=useRef<HTMLDivElement>(null);
 const [geo,setGeo]=useState<any[]>([]),[size,setSize]=useState([1000,700]);
 const [camera,setCamera]=useState({c:project(point?[point.lng,point.lat]:[76.97,11.015]),z:point?15:12.6});
 const drag=useRef<{x:number;y:number;c:number[];moved:boolean}|null>(null);
 const scale=256*2**camera.z,anchor=[size[0]*(panel?.34:.5),size[1]*.55];
 const screen=(p:number[])=>{const q=project(p);return[(q[0]-camera.c[0])*scale+anchor[0],(q[1]-camera.c[1])*scale+anchor[1]];};
 const clamp=(c:number[])=>national?c:[Math.max(project([76.91,11])[0],Math.min(project([77.04,11])[0],c[0])),Math.max(project([77,11.055])[1],Math.min(project([77,10.965])[1],c[1]))];
 useImperativeHandle(ref,()=>({fly:(c,z=14.6)=>setCamera({c:project(c),z:Math.min(17,Math.max(12,z))}),zoom:d=>setCamera(c=>({...c,z:Math.max(national?3:12,Math.min(national?7:17,c.z+d))}))}),[national]);
 useEffect(()=>{let live=true;ground().then(g=>{if(live)setGeo(g);});return()=>{live=false;};},[]);
 useEffect(()=>{onCenter?.(unproject(camera.c) as [number,number]);},[camera]);
 useEffect(()=>{const el=host.current;if(!el)return;const ro=new ResizeObserver(()=>setSize([el.clientWidth,el.clientHeight]));ro.observe(el);return()=>ro.disconnect();},[]);
 useEffect(()=>{if(!point)setCamera({c:project(national?[80.5,22.7]:[76.97,11.015]),z:national?4.5:12.6});},[national]);
 useEffect(()=>{if(point)setCamera({c:project([point.lng,point.lat]),z:15.4});},[point?.lat,point?.lng]);
 useEffect(()=>{const c=cells.find(c=>c.h3===selected);if(c)setCamera({c:project(c.c),z:14.5});},[selected]);
 useEffect(()=>{const el=host.current;if(!el)return;const wheel=(e:WheelEvent)=>{e.preventDefault();setCamera(c=>({...c,z:Math.max(national?3:12,Math.min(national?7:17,c.z-(e.deltaY>0?.25:-.25)))}));};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[national]);
 useEffect(()=>{const cv=canvas.current;if(!cv)return;const g=cv.getContext('2d');if(!g)return;const ratio=Math.min(devicePixelRatio||1,2);cv.width=size[0]*ratio;cv.height=size[1]*ratio;g.scale(ratio,ratio);g.fillStyle=INK.paper;g.fillRect(0,0,...size as [number,number]);g.lineCap='round';g.lineJoin='round';
 const paths=(geom:any):number[][][]=>{switch(geom.type){case'LineString':return[geom.coordinates];case'MultiLineString':case'Polygon':return geom.coordinates;case'MultiPolygon':return geom.coordinates.flat();default:return[];}};
 const trace=(ps:number[][])=>{g.beginPath();for(let i=0;i<ps.length;i++){const p=screen(ps[i]);if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);}};
 const k=2**(camera.z-13);
 if(national){g.fillStyle=INK.sea;g.fillRect(0,0,...size as [number,number]);for(const ring of indiaMask.features[0].geometry.coordinates.slice(1)){trace(ring);g.fillStyle=INK.paper;g.fill();g.strokeStyle=INK.vermilion;g.lineWidth=1.2;g.stroke();}}
 if(!national&&!quiet){for(const layer of ['landuse','landcover','park','water','waterway','transportation'])for(const f of geo){const p=f.properties;if(p.layer!==layer)continue;const cls=p.class;for(const ps of paths(f.geometry)){trace(ps);if(['landuse','landcover','park','water'].includes(layer)){g.fillStyle=layer==='water'?INK.water:layer==='landcover'||layer==='park'?INK.leaf:INK.residential;g.globalAlpha=layer==='landuse'?.5:.9;g.fill('evenodd');if(layer==='water'){g.strokeStyle=INK.waterLine;g.lineWidth=.8;g.stroke();}}else{g.globalAlpha=1;if(layer==='waterway'){g.strokeStyle=INK.river;g.lineWidth=Math.max(.7,1.1*k);g.stroke();}else{const major=['motorway','trunk','primary','secondary','tertiary'].includes(cls);g.strokeStyle=major?'#d3c4ab':INK.laneEdge;g.lineWidth=Math.max(.6,(major?3:1.2)*k);g.stroke();g.strokeStyle=cls==='motorway'?INK.highway:INK.lane;g.lineWidth=Math.max(.4,(major?1.8:.7)*k);g.stroke();}}}}
 g.globalAlpha=1;const labels=new Set<string>();for(const f of geo){const p=f.properties;if(!p.name||labels.has(p.name)||!['place','transportation_name'].includes(p.layer)||p.layer==='transportation_name'&&camera.z<14)continue;const pts=f.geometry.type==='Point'?f.geometry.coordinates:paths(f.geometry)[0]?.[Math.floor((paths(f.geometry)[0]?.length||1)/2)];if(!pts)continue;const [x,y]=screen(pts);if(x<15||x>size[0]-15||y<15||y>size[1]-15)continue;labels.add(p.name);g.font=(p.layer==='place'?'600 12px':'10px')+' "DM Sans",sans-serif';g.textAlign='center';g.lineWidth=3;g.strokeStyle=INK.paper;g.strokeText(p.name,x,y);g.fillStyle=INK.label;g.fillText(p.name,x,y);}}
 },[geo,camera,size,quiet,national]);
 const metric=(c:any)=>lens==='help'?c.needs_help:lens==='requests'?c.open_cases:lens==='followups'?c.fu_upcoming+c.fu_missed:lens==='abc'?c.ster_yes:lens==='arv'?c.vacc_yes:lens==='care'?c.care:c.animals;
 return <div ref={host} className="demo-map-canvas" onPointerDown={e=>{if((e.target as HTMLElement).closest('button'))return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,c:camera.c,moved:false};}} onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>3)d.moved=true;setCamera(c=>({...c,c:clamp([d.c[0]-dx/scale,d.c[1]-dy/scale])}));}} onPointerUp={e=>{const d=drag.current;drag.current=null;if(!d)return;if(picking){const xy=d.moved?camera.c:[camera.c[0]+(e.clientX-e.currentTarget.getBoundingClientRect().left-anchor[0])/scale,camera.c[1]+(e.clientY-e.currentTarget.getBoundingClientRect().top-anchor[1])/scale];const [lng,lat]=unproject(xy);onPick?.({lat,lng});}const c=unproject(camera.c);onCenter?.(c as [number,number]);}}>
 <canvas ref={canvas} aria-label="Coimbatore streets and waterways from OpenStreetMap"/>
 {cells.map(c=>{const [x,y]=screen(c.c),n=metric(c),bucket=bucketOf(c.last_seen,Date.now()),ink=bucket?.color||'#1f6f80';return <button key={c.h3} type="button" className={'demo-map-marker'+(selected===c.h3?' is-selected':'')} aria-label={`${c.zone}: ${n} ${lens==='animals'?'animal records':lens}, ${c.open_cases} open cases`} title={`${c.zone} · ${c.animals} animals · ${c.open_cases} open cases`} style={{left:x,top:y,width:Math.max(28,Math.min(54,24+Math.sqrt(n)*7)),height:Math.max(28,Math.min(54,24+Math.sqrt(n)*7)),background:ink,opacity:n?1:.35}} onClick={()=>onArea?.(c.h3)}>{n}</button>;})}
 {point&&<span className="demo-map-pin" style={{left:screen([point.lng,point.lat])[0],top:screen([point.lng,point.lat])[1]}} aria-label="Selected report location"/>}
 <small className="demo-map-attribution">© OpenStreetMap contributors · OpenFreeMap · map snapshot 18 Oct 2026</small>
 </div>;
});
