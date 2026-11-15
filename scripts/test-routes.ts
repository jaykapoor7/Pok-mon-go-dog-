/* Navigation and deep links: every link the app offers (the sidebars, Kaju's screens, old links people have stored)
   opens a page that exists, and none of the retired classic routes exists any more. Reads the route files in src/app;
   needs no server. */
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { CLINIC_VET, GOV, HEALTH, KAJU, LAB, NGO, NGO_MORE, RESEARCH, VET } from "../src/nx/nav";
import { SCREENS } from "../src/lib/kaju/screens";
import { canonicalHref } from "../src/lib/routes/canonical";

const APP = join(process.cwd(), "src", "app");
const pages: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/^page\.(tsx|ts|jsx|js)$/.test(f)) pages.push(p); } };
walk(APP);
/* A page file's address: route groups "(x)" and private folders "_x" do not appear in it; [param] matches one segment. */
const routes = pages.map((p) => {
  const segs = relative(APP, p).split(sep).slice(0, -1).filter((s) => !/^\(.*\)$/.test(s));
  if (segs.some((s) => s.startsWith("_"))) return null;
  return new RegExp(`^/${segs.map((s) => (/^\[\[?\.\.\./.test(s) ? ".*" : /^\[.+\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/")}$`.replace("^/$", "^/$"));
}).filter((r): r is RegExp => !!r);
const exists = (href: string) => { const path = href.split(/[?#]/)[0].replace(/\/$/, "") || "/"; return routes.some((r) => r.test(path)); };

let n = 0;
const check = (label: string, fn: () => void) => { fn(); n++; console.log(`ok ${n} - ${label}`); };

check("every sidebar link opens a page", () => {
  for (const i of [...NGO, ...NGO_MORE, ...GOV, ...HEALTH, ...VET, ...CLINIC_VET, ...LAB, ...RESEARCH, ...KAJU]) assert.ok(exists(i.href), `sidebar ${i.label}: ${i.href}`);
});
check("every screen Kaju can open exists", () => { for (const s of SCREENS) assert.ok(exists(s.href), `Kaju screen ${s.key}: ${s.href}`); });
check("Home, Start, settings, requests and channels exist", () => { for (const h of ["/home", "/start", "/settings", "/settings/notifications", "/requests", "/channels/general", "/app", "/sign-in"]) assert.ok(exists(h), h); });

/* Retired classic routes: none of these may be a page any more. */
const RETIRED = ["/today", "/assistant", "/workspace/x", "/workspace/x/record/y", "/programme/x", "/programme/x/setup", "/city/review", "/city/review/x", "/city/contracts", "/city/connections",
  "/ngo", "/ngo/work", "/ngo/review", "/ngo/pipeline", "/ngo/verification", "/ngo/packages", "/ngo/proof", "/ngo/care", "/ngo/map", "/ngo/add", "/ngo/automations", "/ngo/contracts", "/ngo/evidence",
  "/ngo/stories", "/ngo/quality", "/ngo/surveys", "/ngo/projects", "/ngo/feeding", "/ngo/fundraising", "/ngo/volunteers", "/ngo/readiness", "/ngo/rescues", "/ngo/sterilisation", "/ngo/offline",
  "/surveys", "/surveys/x", "/partner", "/next", "/next/ngo/today"];
check("no classic route is still a page", () => { for (const h of RETIRED) assert.ok(!exists(h), `retired route still exists: ${h}`); });

/* Links stored before the rebuild (notifications, Kaju findings, bookmarks) open the page doing that work now. */
const OLD: [string, string][] = [
  ["/ngo/work", "/ngo/cases"], ["/ngo", "/ngo/today"], ["/today", "/home"], ["/assistant", "/kaju"],
  ["/ngo/verification/abc", "/ngo/cases/abc?tab=abc"], ["/ngo/verification?stage=vet", "/ngo/submissions?tab=evidence"],
  ["/ngo/packages/p1", "/ngo/submissions/p1"], ["/city/review/p1", "/gov/verification/p1"], ["/city/review", "/gov/verification"],
  ["/workspace/w/record/r1", "/health/bites/r1"], ["/workspace/w", "/health/today"], ["/programme/bbmp/coverage", "/gov/programmes/bbmp?tab=coverage"],
  ["/ngo/automations?rule=x", "/kaju/automations?rule=x"], ["/ngo/map", "/ngo/operations?view=map"], ["/surveys/s1", "/ngo/programmes/surveys/s1"],
  ["/ngo/cases/c1", "/ngo/cases/c1"], ["/ngo/animals/a1", "/ngo/animals/a1"], ["/partner/cases/c1", "/ngo/cases/c1"], ["/community/report", "/community/report"],
];
check("stored classic links map to current pages", () => { for (const [from, to] of OLD) assert.equal(canonicalHref(from), to, from); });
check("every mapped link opens a page", () => { for (const [from] of OLD) assert.ok(exists(canonicalHref(from)), `${from} → ${canonicalHref(from)}`); });
check("outside links are left alone", () => { for (const h of ["https://example.org/ngo/work", "mailto:a@b.c", ""]) assert.equal(canonicalHref(h), h); });

console.log(`${n} route checks passed`);
