import {nearestCity} from '../delhi';

/* Where the phone is, for the field record: a quick fix first (the phone's last known position, if it is under a
   minute old), then a precise one, keeping whichever is more accurate. Nothing here is sent anywhere; the record's
   own coordinates, accuracy and time are what the phone reported. */
export type Fix={lat:number;lng:number;accuracy:number;at:string};
export type FixError='refused'|'unavailable';
export function findPhone(onFix:(f:Fix)=>void,onFail:(e:FixError)=>void):()=>void{
 if(typeof navigator==='undefined'||!navigator.geolocation){onFail('unavailable');return()=>{}}
 let live=true,best:Fix|null=null,misses=0;
 const ok=(p:GeolocationPosition)=>{if(!live)return;const f={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,at:new Date(p.timestamp).toISOString()};if(best&&best.accuracy<=f.accuracy)return;best=f;onFix(f)};
 const bad=(e:GeolocationPositionError)=>{if(!live)return;if(e.code===e.PERMISSION_DENIED){live=false;onFail('refused');return}if(++misses===2&&!best)onFail('unavailable')};
 navigator.geolocation.getCurrentPosition(ok,bad,{enableHighAccuracy:false,maximumAge:60000,timeout:6000});
 navigator.geolocation.getCurrentPosition(ok,bad,{enableHighAccuracy:true,maximumAge:0,timeout:15000});
 return()=>{live=false};
}

/** The city from the phone's own list of Indian cities (works offline); null when no listed city is within 50 km. */
export function cityNear(lat:number,lng:number):string|null{const c=nearestCity(lat,lng);return c==='Location name unavailable'?null:c}

/** The area and city a map service gives for the point, when there is signal; null when it cannot say. */
export async function areaNear(lat:number,lng:number):Promise<{area:string|null;city:string|null}|null>{
 if(typeof navigator!=='undefined'&&!navigator.onLine)return null;
 try{
  const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}&zoom=17&addressdetails=1&accept-language=en`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout?.(4000)});
  if(!res.ok)return null;
  const a=((await res.json()) as {address?:Record<string,string>}).address??{};
  const area=a.suburb||a.neighbourhood||a.quarter||a.residential||a.village||a.hamlet||a.city_district||null;
  const city=a.city||a.town||a.municipality||a.state_district||a.county||null;
  return area||city?{area:area?.slice(0,120)??null,city:city?.slice(0,120)??null}:null;
 }catch{return null}
}
