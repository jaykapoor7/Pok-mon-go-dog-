/* Field shell only. Never cache API responses, records, evidence or auth URLs. */
const CACHE='straypaw-field-shell-v1';
const allowed=url=>url.origin===self.location.origin&&(url.pathname.startsWith('/_next/static/')||url.pathname==='/straypaw-mark.png');
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/ngo/field')).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data?.type!=='warm-field-shell'||!Array.isArray(event.data.urls))return;event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(event.data.urls.filter(u=>{try{return allowed(new URL(u,self.location.origin))}catch{return false}}).slice(0,120).map(u=>cache.add(u)))))});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET')return;
 if(req.mode==='navigate'&&url.origin===self.location.origin&&url.pathname==='/ngo/field'){
  event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put('/ngo/field',copy)))}return response}).catch(()=>caches.match('/ngo/field')));return;
 }
 if(allowed(url))event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)))}return response})));
});
