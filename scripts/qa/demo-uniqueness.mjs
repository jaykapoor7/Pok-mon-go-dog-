#!/usr/bin/env node
/* Every product demo on the public site must be unique: no two demo
   fragments (hero, nav menus, sections, inner pages) may show the same
   content. Reports any repeated demo with where it appears. */
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3100";
const PAGES = ["/", "/ai", "/abc-operations", "/platform", "/for-ngos", "/for-governments", "/solutions/abc-arv", "/solutions/rescue-care", "/whatsapp", "/security", "/customers", "/pricing", "/for-community", "/for-feeders", "/education", "/research", "/demo", "/faq", "/docs", "/our-story", "/data-governance", "/evidence", "/product", "/solutions"];
const SEL = ".s4u-frag, .s4u-pg, .s4-mega-shot, .s4u-cfg, .s4-hero-stage";
const b = await chromium.launch();
const seen = new Map();
for (const path of PAGES) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const res = await p.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => null);
  /* A redirect (e.g. /product → /platform) is the same page, not a second copy. */
  if (!res || res.status() >= 400 || new URL(p.url()).pathname !== path) { await p.close(); continue; }
  /* Open the nav menu that carries a demo, so it is compared too. */
  if (path === "/") { await p.getByRole("button", { name: "Platform" }).first().click().catch(() => {}); await p.waitForTimeout(300); }
  const blocks = await p.evaluate((sel) => [...document.querySelectorAll(sel)]
    .filter((e) => !e.parentElement?.closest(".s4u-frag, .s4u-pg, .s4-hero-stage"))
    /* Responsive twins (desktop and phone versions of one step) show one at a time: count what is rendered. */
    .filter((e) => e.checkVisibility ? e.checkVisibility({ visibilityProperty: true }) : e.getClientRects().length > 0)
    .map((e) => ({ k: e.className.split(" ").find((c) => c.startsWith("s4")), t: (e.textContent || "").replace(/\s+/g, " ").trim() }))
    .filter((x) => x.t.length > 20), SEL);
  /* The nav menu is the same component on every page: count it once. */
  for (const x of blocks) {
    if (x.k === "s4-mega-shot" && path !== "/") continue;
    const list = seen.get(x.t) ?? []; list.push(path); seen.set(x.t, list);
  }
  await p.close();
}
await b.close();
const dups = [...seen.entries()].filter(([, l]) => l.length > 1);
for (const [t, l] of dups) console.log(`REPEATED on ${l.join(", ")}: ${t.slice(0, 110)}`);
console.log(`${seen.size} demo blocks checked, ${dups.length} repeated`);
process.exit(dups.length ? 1 : 0);
