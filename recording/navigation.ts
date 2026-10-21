import {useSyncExternalStore} from 'react';
export function go(href:string,replace=false){window.history[replace?'replaceState':'pushState'](null,'',href);window.dispatchEvent(new Event('sp:navigate'));window.scrollTo(0,0);}
const sub=(f:()=>void)=>{window.addEventListener('popstate',f);window.addEventListener('sp:navigate',f);return()=>{window.removeEventListener('popstate',f);window.removeEventListener('sp:navigate',f);};};
const snapshot=()=>location.pathname+location.search;
export function usePathname(){return useSyncExternalStore(sub,snapshot,snapshot).split('?')[0];}
export function useSearchParams(){const s=useSyncExternalStore(sub,snapshot,snapshot);return new URLSearchParams(s.split('?')[1]||'');}
const router={push:(v:string)=>go(v),replace:(v:string)=>go(v,true),back:()=>history.back(),forward:()=>history.forward(),prefetch:()=>{},refresh:()=>window.dispatchEvent(new Event('sp:navigate'))};
export function useRouter(){return router;}
export function notFound(){throw new Error('Record not found');}export function redirect(href:string){go(href);}
