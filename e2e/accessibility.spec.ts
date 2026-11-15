import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/* WCAG 2.2 AA checks with axe on the app's main pages (signed out, sample data) and the public pages people reach
   first. A serious or critical violation fails the run; the list of what failed is printed so it can be fixed. Runs in
   light and dark, at the phone and desktop sizes the projects define. */

const PAGES = [
  "/ngo/today", "/ngo/inbox", "/ngo/cases", "/ngo/animals", "/ngo/operations", "/ngo/programmes", "/ngo/submissions",
  "/gov/overview", "/gov/verification", "/gov/surveillance",
  "/health/today", "/health/pep", "/health/referrals", "/health/samples",
  "/research/datasets", "/research/explore",
  "/kaju", "/kaju/missions", "/kaju/automations", "/channels/abc-ward-12", "/start",
  "/", "/community/report", "/sign-in",
];

for (const theme of ["light", "dark"] as const) {
  for (const path of PAGES) {
    test(`${path} has no serious accessibility problems (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => { try { localStorage.setItem("nx.theme", t); for (const k of ["straypaw.notice.storage.v1", "sp.firstday.v1", "sp.firstday.offer.v1", "sp.onboard.done"]) localStorage.setItem(k, "1"); } catch {} }, theme);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude("iframe").analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      if (bad.length) console.log(`${path} (${theme}):\n` + bad.map((v) => `  ${v.id}: ${v.help} (${v.nodes.length})\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n    ")}`).join("\n"));
      expect(bad.map((v) => v.id)).toEqual([]);
    });
  }
}
