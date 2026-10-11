/* ════════════════════════════════════════════════════════════════════
   reel.js: a seekable timeline for StrayPaw reels.

   A scene is a plain HTML page. It builds a timeline of tracks; every
   track is a pure function of time, so any frame can be drawn in any
   order — which is what lets the renderer step through a reel one
   frame at a time in a headless browser and get the same picture every
   run. The page contract is the one awesome-ai-motion's renderer uses
   (gongnyang/awesome-ai-motion, MIT):

     window.__size   [w, h]     window.__dur    seconds
     window.__seek(t)           window.__ready  true once fonts and images are in
     window.__poster seconds    (the cover frame)

   Opened directly in a browser (no renderer), a scene plays itself in a
   loop so it can be reviewed and tuned live. Add ?t=4.2 to freeze a frame.

   The motion vocabulary is StrayPaw's (src/lib/motion.ts): ink settles,
   lines are drawn at the speed of time, figures arrive and hold.
   ════════════════════════════════════════════════════════════════════ */

export const E = {
  linear: (t) => t,
  settle: (t) => 1 - Math.pow(1 - t, 5),
  decel: (t) => 1 - (1 - t) * (1 - t),
  travel: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  /* The one spring: a decision becoming true. */
  confirm: (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const mix = (a, b, p) => a + (b - a) * p;
const KEYS = new WeakMap(); let KN = 0;
/** A stable key for "this element's property". */
export const key = (node, prop) => { if (!KEYS.has(node)) KEYS.set(node, ++KN); return `${KEYS.get(node)}:${prop}`; };

export function timeline({ dur, size = [1080, 1920], poster }) {
  const tracks = [];
  let sorted = false;
  const api = {
    /** fn(p, t) is called with eased progress p ∈ [0,1] across [start, start+len].
     *  `key` names what the track writes (an element and a property). Tracks
     *  are applied in start order, so a later track on the same key takes
     *  over once it begins; before then only the earliest track on a key
     *  sets the resting state. Tracks without a key apply on every frame. */
    add(start, len, fn, ease = E.settle, key = null) { tracks.push({ start, len, fn, ease, key }); return api; },
    seek(t) {
      if (!sorted) { tracks.sort((a, b) => a.start - b.start); sorted = true; }
      const seen = new Set();
      for (const k of tracks) {
        const first = !k.key || !seen.has(k.key);
        if (k.key) seen.add(k.key);
        if (t < k.start && !first) continue;
        k.fn(k.ease(clamp01(k.len > 0 ? (t - k.start) / k.len : t >= k.start ? 1 : 0)), t);
      }
    },
    async ready() {
      window.__size = size; window.__dur = dur; window.__poster = poster ?? dur - 0.4;
      window.__seek = (t) => api.seek(t);
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => (img.complete ? null : img.decode().catch(() => null))));
      api.seek(0);
      window.__ready = true;
      const q = new URLSearchParams(location.search);
      if (q.has("t")) { api.seek(Number(q.get("t"))); return; }
      if (navigator.webdriver) return; // the renderer drives the clock
      const t0 = performance.now();
      const loop = (now) => { api.seek(((now - t0) / 1000) % (dur + 1)); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    },
  };
  return api;
}

/* ── helpers: each one a catalogue technique at StrayPaw's register ── */

/** mask-reveal: lines rise into clipped windows, one after another. */
export function maskLines(tl, el, start, { each = 0.62, gap = 0.12 } = {}) {
  [...el.querySelectorAll(".ln > span")].forEach((s, i) =>
    tl.add(start + i * gap, each, (p) => { s.style.transform = `translate3d(0, ${(1 - p) * 105}%, 0)`; }, E.settle, key(s, "tf")));
}

/** fade-slide (the product's mo-rise): opacity and a short rise. */
export function rise(tl, el, start, len = 0.5, dy = 18) {
  tl.add(start, len, (p) => { el.style.transform = `translate3d(0, ${(1 - p) * dy}px, 0)`; }, E.settle, key(el, "tf"));
  tl.add(start, len, (p) => { el.style.opacity = p; }, E.settle, key(el, "op"));
}
export function fade(tl, el, start, len, from = 0, to = 1, ease = E.settle) {
  tl.add(start, len, (p) => { el.style.opacity = mix(from, to, p); }, ease, key(el, "op"));
}

/** line-draw: an SVG path with pathLength=1 draws at constant speed. */
export function draw(tl, path, start, len, ease = E.linear) {
  path.setAttribute("pathLength", "1");
  path.style.strokeDasharray = "1";
  tl.add(start, len, (p) => { path.style.strokeDashoffset = String(1 - p); }, ease, key(path, "draw"));
}

/** count-up: a figure arrives at its value (power2.out) and holds. */
export function count(tl, el, start, len, to, fmt = (n) => Math.round(n).toLocaleString("en-IN")) {
  el.style.fontVariantNumeric = "tabular-nums";
  tl.add(start, len, (p) => { el.textContent = fmt(to * p); }, E.decel, key(el, "text"));
}

/** India-shaped projection for [lng, lat] into a box, equirectangular at India's mid-latitude. */
export function projector(bbox, box) {
  const [w, s, e, n] = bbox, k = Math.cos(((s + n) / 2) * Math.PI / 180);
  const sx = box.w / ((e - w) * k), sy = box.h / (n - s), sc = Math.min(sx, sy);
  const ox = box.x + (box.w - (e - w) * k * sc) / 2, oy = box.y + (box.h - (n - s) * sc) / 2;
  return ([lng, lat]) => [ox + (lng - w) * k * sc, oy + (n - lat) * sc];
}
export const ringPath = (ring, proj) => ring.map((pt, i) => { const [x, y] = proj(pt); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join("") + "Z";
