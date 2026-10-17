// Local-only: final gallery captures. Public pages as a visitor; NGO pages as the synthetic member.
import { chromium } from "@playwright/test";
import { asMember } from "./harness.mjs";
const OUT = process.argv[2], BASE = "http://localhost:3100";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pub = [
  ["atlas-india", "/community", 12000], ["atlas-city", "/community?city=Coimbatore", 12000], ["atlas-area", "/community?city=Coimbatore&place=Ganapathy", 14000],
  ["atlas-plain", "/community?view=plain", 10000],
  ["atlas-animal", "/community?city=Coimbatore&place=Ganapathy", 14000, [".insp-animals button"]],
  ["atlas-sheet-half", "/community?city=Coimbatore", 12000, [".atlas-peek"], "phone"],
  ["atlas-sheet-area", "/community?city=Coimbatore&place=Ganapathy", 14000, [".atlas-peek", ".atlas-peek"], "phone"],
  ["animal", "/animal/d7aef187-f038-4798-bac0-f068b01a4515", 5000], ["report", "/community/report", 4000], ["activity", "/community/activity", 3000],
  ["stories", "/community/stories", 4000], ["organisations", "/community/organisations", 4000],
  ["city-map", "/city?city=Coimbatore", 12000, ["button:has-text('on the map') >> nth=1"]], ["city-ranchi", "/city?city=Ranchi", 12000],
  ["insights", "/city/insights?city=Coimbatore", 9000], ["city-report", "/city/report?city=Coimbatore", 9000], ["city-programmes", "/city/programmes", 4000],
  ["academy", "/learn", 4000], ["lesson", "/learn/courses/reading-the-record/unknown-is-not-zero", 4000, ["ALLDOGS", "button:has-text('Blanks as')"]], ["workshops", "/learn/workshops", 4000], ["resources", "/learn/resources", 3000],
  ["trust-console", "/trust/console", 2500],
];
const ngo = [
  ["ngo-work", "/ngo", 3000, [".wk-row >> nth=3"]], ["ngo-work-map", "/ngo", 3000, [".wk-row >> nth=3", "button[role=tab]:has-text('Map')"], "desktop"], ["ngo-animals", "/ngo/animals", 3000], ["ngo-casefile", "/ngo/cases/00000000-0000-4000-8000-000000001001", 3000],
  ["ngo-inbox", "/ngo/inbox", 3000], ["ngo-field", "/ngo/field", 3000], ["ngo-map", "/ngo/map?city=Coimbatore", 10000], ["ngo-care", "/ngo/care", 3000],
  ["ngo-feeding", "/ngo/feeding", 6000], ["ngo-volunteers", "/ngo/volunteers", 3000], ["ngo-stories", "/ngo/stories", 3000],
];
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const [list, member] of [[pub, false], [ngo, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 600 ? 2 : 1, isMobile: w < 600, hasTouch: w < 600 });
    if (member) await asMember(ctx);
    await ctx.addInitScript(() => { try { localStorage.setItem("sp.storage.ack", "1"); localStorage.setItem("straypaw-storage-notice", "dismissed"); } catch {} });
    for (const [name, url, wait, clicks, only] of list) {
      if (only === "phone" && w > 600) continue; if (only === "desktop" && w < 600) continue;
      const p = await ctx.newPage(); const errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      try {
        await p.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 90000 });
        await p.waitForTimeout(wait);
        const notice = p.locator("button:has-text('Got it')"); if (await notice.count()) await notice.first().click().catch(() => {});
        for (const c of clicks ?? []) {
          if (c === "ALLDOGS") { const n = await p.locator(".ex-dog").count(); for (let i = 0; i < n; i++) await p.locator(".ex-dog").nth(i).click().catch(() => {}); await p.waitForTimeout(400); continue; }
          await p.locator(c).first().click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(2200);
        }
        await p.screenshot({ path: `${OUT}/${name}-${w}.jpg`, type: "jpeg", quality: 72 });
        const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        console.log(name, w, "overflow", ov, errs.length ? errs.slice(0, 2) : "");
      } catch (e) { console.log(name, w, "FAILED", e.message.slice(0, 120)); }
      await p.close();
    }
    await ctx.close();
  }
}
await b.close();
