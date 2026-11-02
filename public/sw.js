/* StrayPaw service worker.

   Scope is deliberately narrow. A service worker that caches too eagerly is
   worse than none: it serves a stale register to somebody standing in front
   of the animal. So this only does two things.

   1. Allowed shell navigations are network-first. If the network fails, the last copy of
      the home, offline or Field client shell is served; if there is no copy, the offline page is. The
      register is never served from cache while the network is available.
   2. Build assets (immutable, content-hashed) are cache-first.

   Everything else, API calls, Supabase, POSTs, anything cross-origin, is
   passed straight through. A queued report must never be answered by a
   cached 200, and no personal data belongs in the cache. */

const VERSION = "straypaw-v2";
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png"]))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => (k.startsWith("straypaw-v1-") || k.startsWith("straypaw-field-shell-"))).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isBuildAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // The register and every mutation path stay live, never cached.
  if (url.pathname.startsWith("/api/")) return;

  if (isBuildAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(SHELL).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate" && ["/", "/offline", "/ngo/field"].includes(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return (
            offline ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }),
    );
  }
});

// Warm only the non-personalised Field client shell and immutable assets.
self.addEventListener('message',event=>{
 if(event.data?.type!=='warm-field-shell'||!Array.isArray(event.data.urls))return;
 event.waitUntil((async()=>{
  try{const shell=await caches.open(SHELL),pages=await caches.open(PAGES);await pages.add('/ngo/field');
   const urls=event.data.urls.filter(value=>{try{const u=new URL(value,self.location.origin);return u.origin===self.location.origin&&isBuildAsset(u)}catch{return false}}).slice(0,120);
   await Promise.all(urls.map(url=>shell.add(url)));event.ports[0]?.postMessage({ready:true});
  }catch{event.ports[0]?.postMessage({ready:false})}
 })());
});
