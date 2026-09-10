#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Does every piece of text on this site have enough contrast to read?
//
// Usage:  npm run dev            (in one terminal)
//         BASE=http://127.0.0.1:3000 npm run audit:contrast   (override port)
//         npm run audit:contrast (in another)
//
// Exits non-zero if anything fails, so it can gate a commit.
//
// WHY THIS EXISTS
//
// The console is light in both themes, and it achieves that by neutralising
// dark-mode utilities inside .spa. That neutralisation was a list of exact
// class names, which is a blacklist: every dark: variant nobody thought to
// add stayed dark-themed on a light ground. The role picker's three options
// rendered white on white — the one question that dialog exists to ask was
// invisible — and seventy-odd other strings across the site were under the
// readable threshold, none of which anybody had reported.
//
// A screenshot finds one of those. This finds all of them, which is the
// only way a rule like "the console is light" can actually hold.
//
// WHAT IT MEASURES
//
// Real computed colour against the real painted background — walking up
// ancestors and compositing translucent layers and gradients rather than
// reading the stylesheet, because what a rule says and what a pixel ends up
// being are different questions. WCAG AA: 4.5:1 for body text, 3:1 for
// large or bold text.
// ─────────────────────────────────────────────────────────────

import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const ROUTES = process.env.ROUTES
  ? process.env.ROUTES.split(",")
  : ["/", "/map", "/wards", "/report", "/adopt", "/orgs", "/gaps", "/evidence",
     "/mission", "/why-straypaw", "/sources", "/take-action", "/get-involved",
     "/what-would-it-take", "/studies", "/interventions", "/outcomes", "/needs",
     "/following", "/learn", "/join", "/partner/resources", "/the-data", "/the-network"];

const AUDIT = () => {
  const px = (v) => parseFloat(v) || 0;
  const parse = (c) => {
    const m = c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
    if (!m) return null;
    return [ +m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4] ];
  };
  const over = (fg, bg) => {
    const a = fg[3];
    return [0,1,2].map(i => fg[i]*a + bg[i]*(1-a)).concat(1);
  };
  const lin = (v) => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  const L = (c) => 0.2126*lin(c[0]) + 0.7152*lin(c[1]) + 0.0722*lin(c[2]);
  const ratio = (a, b) => {
    const l1 = L(a), l2 = L(b);
    return (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
  };
  /* A gradient is a background too. Reading only background-color walked
     straight past every gradient surface on the site and reported the
     section behind it, which turned a perfectly readable dark card into
     eight "invisible text" findings. Computed backgroundImage has its
     var()s already resolved to rgb(), so the stops can be averaged. */
  const gradientColor = (cs) => {
    const bi = cs.backgroundImage;
    if (!bi || bi === "none" || !/gradient/.test(bi)) return null;
    const stops = [...bi.matchAll(/rgba?\(([^)]+)\)/g)].map(m => {
      const n = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return [n[0], n[1], n[2], n.length > 3 ? n[3] : 1];
    }).filter(c => c.every(v => !Number.isNaN(v)));
    if (!stops.length) return null;
    /* Premultiply. A `transparent` stop computes to rgba(0,0,0,0) — no
       colour at all — but averaging the raw channels let its zeros drag the
       result toward black. The dotted texture on the app console is one
       faint blue dot every 43px against nothing, and this reported it as a
       solid mid-grey, failing 32 pieces of perfectly readable text across
       four routes. A stop with no alpha contributes no colour; it only
       lowers how much the gradient covers. */
    const totalA = stops.reduce((s, c) => s + c[3], 0);
    if (totalA === 0) return null;
    const rgb = [0,1,2].map(i => stops.reduce((s, c) => s + c[i] * c[3], 0) / totalA);
    return [...rgb, totalA / stops.length];
  };
  const effBg = (el) => {
    /* Walk up collecting one layer per element, nearest first, and stop at
       the first element that is opaque — nothing behind it can show through.
       Two bugs lived here. An element carrying BOTH an opaque background
       colour and a decorative gradient did not stop the walk, so the search
       ran past a white card and reported the dark page behind it: on
       /why-straypaw that turned #4d5766 on white (7.0:1, fine) into
       #4d5766 on #0f1626 (2.5:1, "unreadable"), and did it 91 times.
       And the layers were composited in the wrong order, putting an
       element's background colour on top of its own gradient rather than
       under it, which is backwards — background-image paints over
       background-colour. */
    const layers = [];
    let cur = el;
    while (cur && cur !== document.documentElement.parentNode) {
      const cs = getComputedStyle(cur);
      const c = parse(cs.backgroundColor);
      const g = gradientColor(cs);
      /* This element's own surface: its gradient over its colour. */
      let layer = null;
      if (c && c[3] > 0) layer = c;
      if (g && g[3] > 0) layer = layer ? over(g, layer) : g;
      if (layer) layers.push(layer);
      if (c && c[3] === 1) break;
      cur = cur.parentElement;
    }
    /* Farthest layer first, each nearer one painted over it. */
    let acc = [255,255,255,1];
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return acc;
  };
  const path = (el) => {
    const bits = [];
    for (let c = el; c && bits.length < 4; c = c.parentElement) {
      let s = c.tagName.toLowerCase();
      if (c.id) s += "#" + c.id;
      else if (c.className && typeof c.className === "string")
        s += "." + c.className.trim().split(/\s+/).slice(0,3).join(".");
      bits.unshift(s);
    }
    return bits.join(" > ");
  };

  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    // only elements with their own visible text
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (cs.webkitTextFillColor && cs.webkitTextFillColor === "rgba(0, 0, 0, 0)") continue;
    const fg = parse(cs.color);
    if (!fg || fg[3] === 0) continue;
    const bg = effBg(el);
    const c = ratio(over(fg, bg), bg);
    const size = px(cs.fontSize);
    const bold = px(cs.fontWeight) >= 700 || cs.fontWeight === "bold";
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (c >= need) continue;
    const key = path(el) + "|" + cs.color + "|" + Math.round(c*10);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      sel: path(el),
      text: el.textContent.trim().slice(0, 42),
      color: cs.color, bg: `rgb(${bg.slice(0,3).map(Math.round).join(",")})`,
      ratio: +c.toFixed(2), need, size: +size.toFixed(1),
    });
  }
  return out.sort((a,b) => a.ratio - b.ratio);
};

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const findings = [];
/* Both widths. The console's responsive rules swap layouts and, with them,
   which surface a given piece of text sits on, so a phone-only pass is only
   half a check — and the report that started this was "same on phone and
   laptop". */
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "laptop", width: 1440, height: 900 },
];
for (const { name: vp, width, height } of VIEWPORTS)
for (const theme of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width, height } });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem("straypaw.theme", t);
      if (process?.env) {}
    } catch {}
  }, theme);
  const p = await ctx.newPage();
  for (const route of ROUTES) {
    try {
      await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 25000 });
      await p.evaluate((t) => document.documentElement.classList.toggle("dark", t === "dark"), theme);
      await p.waitForTimeout(1200);
      const res = await p.evaluate(AUDIT);
      for (const r of res) findings.push({ vp, theme, route, ...r });
    } catch (e) {
      findings.push({ vp, theme, route, sel: "(page failed)", text: String(e).slice(0, 90), ratio: 0, need: 0 });
    }
  }
  await ctx.close();
}
await b.close();

const worst = findings.filter(f => f.ratio < 3);
console.log(`\n${findings.length} contrast failures, ${worst.length} of them severe (< 3:1)\n`);
for (const f of findings.slice(0, 80)) {
  console.log(`${f.ratio.toString().padStart(5)} (need ${f.need})  [${f.vp}/${f.theme}] ${f.route}\n        ${f.sel}\n        "${f.text}"  ${f.color} on ${f.bg} @${f.size}px`);
}
if (findings.length) {
  console.log("\nEach line is text a reader cannot read. Fix the colour, not this script.");
  process.exit(1);
}
console.log("Every string on every route clears WCAG AA, in both themes and both widths.");
