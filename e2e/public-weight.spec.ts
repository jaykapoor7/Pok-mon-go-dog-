import { expect, test, type Page } from "@playwright/test";

/* A public page ships only what it uses. The application shell, Kaju's
   panel, the sign-in sheet and the guided demo are loaded by the pages that
   show them, not by every page through the root layout (see
   src/components/nav/Chrome.tsx). Each is recognised by a string only its
   own module contains, so this holds whatever the chunks are called. */
const SHELL = "ws-phone-title"; /* src/sp/shell/Shell.tsx */
const KAJU_PANEL = "sp3.ai.thread"; /* src/sp3/ai/AiPanel.tsx */
const SIGN_IN_SHEET = "s3-signin-sheet"; /* src/components/auth/SignInSheet.tsx */
const DEMO_TOUR = "dt-transit-who"; /* src/sp/demo/DemoTour.tsx, demonstration builds only */

/** Every script the page has downloaded so far, including the routes its links prefetched. */
async function scripts(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle");
  const urls = await page.evaluate(() => [...new Set(performance.getEntriesByType("resource").map((e) => e.name).filter((n) => /\/_next\/static\/.+\.js(\?|$)/.test(n)))]);
  const bodies = await Promise.all(urls.map(async (u) => (await page.request.get(u)).text()));
  return bodies.join("\n");
}

for (const path of ["/security/summary", "/for-ngos"]) {
  test(`${path} does not download the app shell, Kaju's panel or the sign-in sheet`, async ({ page }) => {
    await page.goto(path);
    const js = await scripts(page);
    expect(js.includes(SHELL), "the app shell was downloaded").toBe(false);
    expect(js.includes(KAJU_PANEL), "Kaju's panel was downloaded").toBe(false);
    expect(js.includes(SIGN_IN_SHEET), "the sign-in sheet was downloaded").toBe(false);
    if (process.env.OH_E2E !== "1") expect(js.includes(DEMO_TOUR), "the guided demo was downloaded").toBe(false);
  });
}

test("an app page loads its shell and Kaju's panel, and the sign-in sheet when it is asked for", async ({ page }) => {
  await page.goto("/today");
  let js = await scripts(page);
  expect(js.includes(SHELL), "the app shell is loaded").toBe(true);
  expect(js.includes(KAJU_PANEL), "Kaju's panel is loaded").toBe(true);
  expect(js.includes(SIGN_IN_SHEET), "the sign-in sheet waits until it is asked for").toBe(false);

  await page.getByRole("main").getByRole("button", { name: "Sign in", exact: true }).first().click();
  await expect(page.getByRole("dialog", { name: "Sign in to StrayPaw" })).toBeVisible();
  js = await scripts(page);
  expect(js.includes(SIGN_IN_SHEET), "the sign-in sheet is loaded once opened").toBe(true);
});
