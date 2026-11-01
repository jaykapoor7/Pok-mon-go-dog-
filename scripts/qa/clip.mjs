import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2]; /* Phone-width check for visible text cut off at the screen edges (not caught by page overflow when a parent clips it). */
const routes = fs.readFileSync("scripts/qa/routes.txt", "utf8").split("\n").filter(Boolean);
const b = await chromium.launch();
const out = [];
await Promise.all([0,1,2,3].map(async (k) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  for (let i = k; i < routes.length; i += 4) {
    const p = await ctx.newPage();
    try {
      await p.goto(BASE + routes[i], { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await p.waitForTimeout(500);
      const hits = await p.evaluate(() => {
        const scrollable = (e) => { for (let x = e.parentElement; x; x = x.parentElement) { const s = getComputedStyle(x); if (/(auto|scroll)/.test(s.overflowX)) return true; if (s.position === "fixed") return true; } return false; };
        const r = [];
        for (const e of document.querySelectorAll("p, h1, h2, h3, li, a, button, span, td, small, b")) {
          if (!e.textContent.trim() || e.children.length > 3) continue;
          const s = getComputedStyle(e); if (s.visibility === "hidden" || s.display === "none" || +s.opacity === 0) continue;
          const q = e.getBoundingClientRect(); if (!q.width || !q.height || q.bottom < 0) continue;
          if ((q.left < -2 || q.right > innerWidth + 2) && !scrollable(e) && !e.closest("[aria-hidden=true]") && !e.classList.contains("skip-link") && !e.classList.contains("skip-link")) r.push(`${e.tagName.toLowerCase()}.${String(e.className).slice(0, 30)} [${Math.round(q.left)},${Math.round(q.right)}] "${e.textContent.trim().slice(0, 40)}"`);
        }
        return r.slice(0, 4);
      });
      if (hits.length) out.push(`${routes[i]}\n  ${hits.join("\n  ")}`);
    } catch (e) { out.push(`${routes[i]} ERR ${e.message}`); }
    await p.close();
  }
  await ctx.close();
}));
await b.close(); console.log(out.join("\n") || "no clipped text");
