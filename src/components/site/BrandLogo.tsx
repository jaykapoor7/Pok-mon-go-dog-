import {getImageProps} from 'next/image';
import './brand-logo.css';
/* eslint-disable @next/next/no-img-element */
const LOGO=getImageProps({src:'/brand/straypaw-logo.png',alt:'StrayPaw',width:876,height:449,quality:95}).props.src;
/** Transparent owner-supplied identity, with no background plate. */
export function BrandLogo({className='',compact=false,size}:{className?:string;compact?:boolean;size?:number}){
 if(!compact) return <img className={`brand-logo is-art ${className}`} src="/brand/straypaw-logo-600.webp" srcSet="/brand/straypaw-logo-600.webp 600w, /brand/straypaw-logo-1000.webp 1000w" sizes="(max-width: 760px) 140px, 260px" width={600} height={287} alt="StrayPaw" decoding="async" style={size?{height:size,width:"auto"}:undefined}/>;
 return<svg className={`brand-logo${compact?' is-compact':''} ${className}`} viewBox={compact?'940 110 310 475':'0 35 1740 845'} style={size?{width:size,height:size}:undefined} width={compact?32:174} height={compact?46:84.5} role="img" aria-label="StrayPaw" focusable="false" data-brand-art="animal-wordmark"><image href={LOGO} width="1752" height="897"/></svg>
}
