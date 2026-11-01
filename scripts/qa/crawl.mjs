#!/usr/bin/env node
/* Route crawl: every page at desktop, tablet and phone in a real browser.
   Records HTTP status, console errors, page errors, failed requests,
   horizontal overflow, broken images, links without a destination, buttons
   and links without an accessible name, h1 count, and every internal link
   (each checked once for a 4xx/5xx answer).
   Usage: BASE=http://localhost:3100 node scripts/qa/crawl.mjs > crawl.json */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.env.OUT ?? "/tmp/crawl.json";
const seeds = fs.readFileSync(new URL("./routes.txt", import.meta.url), "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const VPS = (process.env.VPS ?? "desktop,tablet,phone").split(",");
const SIZES = { desktop: { width: 1440, height: 900 }, tablet: { width: 834, height: 1112 }, phone: { width: 390, height: 844 } };
const IGNORE = /(_vercel\/insights|_vercel\/speed-insights|va\.vercel-scripts|plausible|googletagmanager|mapbox.*events|favicon)/;

const browser = await chromium.launch();
const results = [];
const links = new Map();
const queue = [];
for (const r of seeds) for (const vp of VPS) queue.push({ r, vp });

async function visit({ r, vp }) {
  const ctx = await browser.newContext({ viewport: SIZES[vp], isMobile: vp === "phone", hasTouch: vp !== "desktop", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [], fails = [];
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) errs.push(m.text().slice(0, 300)); });
  page.on("pageerror", (e) => errs.push(`PAGEERROR ${String(e.message).slice(0, 300)}`));
  page.on("response", (res) => { const u = res.url(); if (res.status() >= 400 && !IGNORE.test(u)) fails.push(`${res.status()} ${u.slice(0, 200)}`); });
  page.on("requestfailed", (q) => { const u = q.url(); const f = q.failure()?.errorText ?? ""; if (!IGNORE.test(u) && !/ERR_ABORTED/.test(f)) fails.push(`FAILED ${f} ${u.slice(0, 200)}`); });
  let status = 0;
  try {
    const res = await page.goto(BASE + r, { waitUntil: "domcontentloaded", timeout: 45000 });
    status = res?.status() ?? 0;
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const vis = (el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0; };
      const name = (el) => (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || el.querySelector("img,svg[aria-label]")?.getAttribute("alt") || el.querySelector("svg[aria-label]")?.getAttribute("aria-label") || "").trim();
      const overflowX = document.documentElement.scrollWidth - innerWidth;
      const wide = overflowX > 1 ? [...document.querySelectorAll("body *")].filter((e) => { const b = e.getBoundingClientRect(); return b.right > innerWidth + 1 && vis(e) && getComputedStyle(e).position !== "fixed"; }).slice(0, 5).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 60)} right=${Math.round(e.getBoundingClientRect().right)}`) : [];
      const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && vis(i) && i.src).map((i) => i.src.slice(0, 160));
      const deadLinks = [...document.querySelectorAll("a")].filter((a) => vis(a) && (!a.getAttribute("href") || a.getAttribute("href") === "#")).map((a) => (a.textContent || "").trim().slice(0, 40));
      const unnamed = [...document.querySelectorAll("a[href],button")].filter((e) => vis(e) && !name(e)).map((e) => e.outerHTML.slice(0, 120));
      const hrefs = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("/") && !h.startsWith("//"));
      const h1 = document.querySelectorAll("h1").length;
      const title = document.title;
      const smallTap = innerWidth < 500 ? [...document.querySelectorAll("a[href],button,input,select")].filter((e) => { if (!vis(e)) return false; const b = e.getBoundingClientRect(); return b.height < 24 && b.width < 24 && e.tagName !== "INPUT"; }).length : 0;
      return { overflowX, wide, imgs, deadLinks, unnamed: unnamed.slice(0, 6), hrefs, h1, title, smallTap };
    });
    for (const h of info.hrefs) { const k = h.split("#")[0]; if (k && !links.has(k)) links.set(k, r); }
    delete info.hrefs;
    results.push({ r, vp, status, errs: [...new Set(errs)].slice(0, 8), fails: [...new Set(fails)].slice(0, 8), ...info });
  } catch (e) {
    results.push({ r, vp, status, crash: String(e.message).slice(0, 200), errs, fails });
  }
  await ctx.close();
}

const W = Number(process.env.WORKERS ?? 4);
await Promise.all(Array.from({ length: W }, async () => { while (queue.length) await visit(queue.shift()); }));

/* Second pass: pages reached only through links (records, stories, lessons), two per section. */
if (!process.env.NO_DISCOVER) {
  const seen = new Set(seeds), per = new Map(), extra = [];
  for (const h of links.keys()) {
    const path = h.split("?")[0];
    if (seen.has(path) || /\.(pdf|xlsx|csv|png|jpg|svg|xml|txt|json)$/.test(path) || path.startsWith("/api/")) continue;
    const key = path.split("/").slice(0, 3).join("/");
    if ((per.get(key) ?? 0) >= 2) continue;
    per.set(key, (per.get(key) ?? 0) + 1); seen.add(path); extra.push(path);
  }
  for (const r of extra.slice(0, 60)) for (const vp of VPS) queue.push({ r, vp });
  await Promise.all(Array.from({ length: W }, async () => { while (queue.length) await visit(queue.shift()); }));
}

const linkStatus = [];
const lq = [...links.entries()];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (lq.length) {
    const [h, from] = lq.shift();
    try { const res = await fetch(BASE + h, { redirect: "manual" }); if (res.status >= 400) linkStatus.push({ h, from, status: res.status }); }
    catch (e) { linkStatus.push({ h, from, status: String(e.message) }); }
  }
}));
await browser.close();
fs.writeFileSync(OUT, JSON.stringify({ results, broken: linkStatus, linksChecked: links.size }, null, 1));
const bad = results.filter((x) => x.crash || x.status >= 400 || x.errs.length || x.fails.length || x.overflowX > 1 || x.imgs?.length || x.deadLinks?.length || x.unnamed?.length || x.h1 !== 1);
console.log(`pages ${results.length}, with findings ${bad.length}, links checked ${links.size}, broken links ${linkStatus.length}`);
