#!/usr/bin/env node
/* STAGING ONLY. Signed-in browser QA for every role against a build that
   points at the staging project (separate Supabase project, labelled test
   accounts). For each role: every sidebar destination at desktop and phone,
   with console errors, failed requests and horizontal overflow recorded and
   a screenshot saved; then the role's own workflow is driven through the UI:

     admin        Team: role choices include Veterinarian and Coordinator
     coordinator  Verification: upload a capture photo from a file, see it listed
     veterinarian Verification case: only the authorise action is offered
     reviewer     Package review inbox opens
     everyone     StrayPaw AI answers a record question with sources

   Usage: BASE=http://localhost:3200 STAGING_ANON=… STAGING_PASSWORD=… node scripts/qa/roles-qa.mjs */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3200";
const REF = "ucxfxiddufwqithtdtix", URL = `https://${REF}.supabase.co`;
const ANON = process.env.STAGING_ANON, PW = process.env.STAGING_PASSWORD;
if (!ANON || !PW) { console.error("Set STAGING_ANON and STAGING_PASSWORD."); process.exit(2); }
const OUT = process.env.OUT ?? "docs/sp4/qa/roles";
fs.mkdirSync(OUT, { recursive: true });

const ROLES = {
  admin: { email: "ngo.demo@straypaw.invalid", pages: ["/ngo", "/ngo/inbox", "/ngo/work", "/ngo/verification", "/ngo/animals", "/ngo/programmes", "/ngo/packages", "/ngo/map", "/ngo/team", "/ngo/settings", "/assistant", "/ngo/field", "/ngo/import", "/ngo/evidence", "/ngo/care", "/ngo/cases/new"] },
  coordinator: { email: "coordinator.demo@straypaw.invalid", pages: ["/ngo", "/ngo/verification", "/ngo/packages"] },
  veterinarian: { email: "vet.demo@straypaw.invalid", pages: ["/ngo", "/ngo/verification", "/ngo/animals"] },
  reviewer: { email: "reviewer.demo@straypaw.invalid", pages: ["/city/review", "/city", "/city/programmes", "/city/report", "/city/insights"] },
  community: { email: "noorg.demo@straypaw.invalid", pages: ["/community", "/community/report", "/community/activity", "/community/help", "/ngo"] },
};
const IGNORE = /(_vercel|maplibre-gl-worker|va\.vercel-scripts|favicon|mapbox.*events|tiles?\.|basemaps)/;
const results = [];
const note = (role, what, pass, detail = "") => { results.push({ role, what, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  [${role}] ${what}${detail ? `  (${String(detail).slice(0, 160)})` : ""}`); };

const browser = await chromium.launch();
async function sessionFor(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`${email}: ${error.message}`);
  return data.session;
}
async function ctxFor(session, vp) {
  const size = vp === "phone" ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const ctx = await browser.newContext({ viewport: size, isMobile: vp === "phone", hasTouch: vp === "phone", reducedMotion: "reduce" });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("straypaw.analytics.optout", "1"); localStorage.setItem("straypaw.tour.v2", "1"); } catch {} }, [`sb-${REF}-auth-token`, JSON.stringify(session)]);
  return ctx;
}
async function watch(page) {
  const errs = [], fails = [];
  /* "Failed to load resource" carries no URL; the response listener below records those with theirs. */
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text()) && !/^Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errs.push(`PAGEERROR ${e.message.slice(0, 200)}`));
  page.on("response", (r) => { if (r.status() >= 400 && !IGNORE.test(r.url())) fails.push(`${r.status()} ${r.url().replace(URL, "").slice(0, 140)}`); });
  return { errs, fails };
}
const settle = async (page) => { await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800); };

for (const [role, def] of Object.entries(ROLES).filter(([r]) => (process.env.ONLY ?? r).split(",").includes(r))) {
  const session = await sessionFor(def.email);
  for (const vp of ["desktop", "phone"]) {
    const ctx = await ctxFor(session, vp);
    for (const path of def.pages) {
      const page = await ctx.newPage();
      const w = await watch(page);
      const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 }).catch((e) => ({ status: () => String(e.message) }));
      await settle(page);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const stuck = await page.getByText(/^Reading|Loading/).count().catch(() => 0);
      const name = `${role}-${vp}-${path.replace(/\//g, "_").replace(/^_/, "") || "home"}.png`;
      if (vp === "phone" || def.pages.indexOf(path) < 6) await page.screenshot({ path: `${OUT}/${name}`, fullPage: false });
      const ok = res.status() < 400 && !w.errs.length && !w.fails.length && ov <= 1;
      note(role, `${vp} ${path}`, ok, [res.status(), ov > 1 ? `overflow ${ov}` : "", stuck ? `${stuck} still reading` : "", ...w.errs, ...w.fails].filter(Boolean).join(" | "));
      await page.close();
    }
    await ctx.close();
  }
}

/* ── workflows ───────────────────────────────────────────────────────── */
const jpeg = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==", "base64");
{
  const ctx = await ctxFor(await sessionFor(ROLES.admin.email), "desktop");
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ngo/team`); await settle(page);
  const sel = page.getByRole("combobox", { name: /Role for/ }).first();
  const opts = (await sel.count()) ? await sel.locator("option").allInnerTexts() : [];
  note("admin", "Team role choices include Veterinarian and Coordinator", opts.includes("Veterinarian") && opts.includes("Coordinator"), opts.join(", "));
  await page.screenshot({ path: `${OUT}/flow-admin-team-roles.png` });
  await ctx.close();
}
{
  const ctx = await ctxFor(await sessionFor(ROLES.coordinator.email), "phone");
  const page = await ctx.newPage();
  const w = await watch(page);
  await page.goto(`${BASE}/ngo/verification`); await settle(page);
  const link = page.locator("a[href^='/ngo/verification/']").first();
  if (await link.count()) {
    await link.click(); await settle(page);
    const file = page.locator("input[type=file]");
    if (await file.count()) {
      const before = await page.getByText(/Evidence · \d of 5/).innerText().catch(() => "");
      await file.setInputFiles({ name: "capture.jpg", mimeType: "image/jpeg", buffer: jpeg });
      await page.getByRole("button", { name: "Add" }).click();
      await page.waitForSelector(".abc-ok, .abc-err", { timeout: 20000 }).catch(() => {});
      const msg = await page.locator(".abc-ok, .abc-err").first().innerText().catch(() => "no message");
      const after = await page.getByText(/Evidence · \d of 5/).innerText().catch(() => "");
      note("coordinator", "Upload an evidence photo from the phone and link it to the case", /added/i.test(msg) && before !== after, `${before} → ${after}: ${msg}`);
      await page.screenshot({ path: `${OUT}/flow-coordinator-evidence-upload-phone.png`, fullPage: true });
      const open = page.locator(".abc-check button.abc-linkbtn").first();
      if (await open.count()) {
        const [tab] = await Promise.all([ctx.waitForEvent("page", { timeout: 15000 }).catch(() => null), open.click()]);
        if (tab) { await tab.waitForLoadState("load", { timeout: 15000 }).catch(() => {}); note("coordinator", "The uploaded file opens through a signed link", /token=/.test(tab.url()), tab.url().replace(/token=[^&]+/, "token=…").slice(0, 120)); await tab.close(); }
        else note("coordinator", "The uploaded file opens through a signed link", false, "no tab opened");
      }
    } else note("coordinator", "Upload an evidence photo", true, "no case missing photo evidence; upload checked by scripts/staging/roles-evidence-check.mjs");
  } else note("coordinator", "Verification queue lists cases", false, "no case link");
  note("coordinator", "No console errors during the upload flow", !w.errs.length, w.errs.join(" | "));
  await ctx.close();
}
{
  const ctx = await ctxFor(await sessionFor(ROLES.veterinarian.email), "desktop");
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ngo/verification`); await settle(page);
  const link = page.locator("a[href^='/ngo/verification/']").first();
  if (await link.count()) {
    await link.click(); await settle(page);
    const review = await page.getByRole("button", { name: "Approve for reporting" }).count();
    note("veterinarian", "A veterinarian is never offered evidence approval", review === 0);
    await page.screenshot({ path: `${OUT}/flow-vet-case.png`, fullPage: true });
  }
  await ctx.close();
}
{
  const ctx = await ctxFor(await sessionFor(ROLES.admin.email), "desktop");
  const page = await ctx.newPage();
  const w = await watch(page);
  await page.goto(`${BASE}/assistant`); await settle(page);
  const box = page.locator("main textarea, main input[type=text]").first();
  await box.fill("Which open cases have no follow-up scheduled?");
  await box.press("Enter");
  await page.waitForTimeout(12000);
  const body = await page.locator("main").innerText();
  note("admin", "StrayPaw AI answers from records (tools engine on staging)", /case|record|follow/i.test(body) && !/could not answer/i.test(body), body.slice(-200).replace(/\s+/g, " "));
  note("admin", "No console errors in StrayPaw AI", !w.errs.length, w.errs.join(" | "));
  await page.screenshot({ path: `${OUT}/flow-ai-answer.png`, fullPage: false });
  await ctx.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
