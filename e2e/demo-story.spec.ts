import { expect, test } from "@playwright/test";

/* The guided demo as a first-time visitor sees it: /try, Start the tour,
   every chapter in turn (each signs in as its person), the thing each
   chapter is about highlighted on the page, Kaju asked on screen, and the
   closing card. Needs a demonstration build (staging database, demo
   accounts), so it is skipped unless OH_E2E=1:

     OH_E2E=1 E2E_BASE_URL=https://demo.straypaw.org npx playwright test e2e/demo-story.spec.ts
*/
test.skip(process.env.OH_E2E !== "1", "Needs the demonstration site or a build pointed at staging");
test.setTimeout(600_000);

const CHAPTERS = ["Hospital", "NGO", "Laboratory", "Programme", "Municipal office"];

test("the story plays from the first chapter to the last, each one pointing at its screen", async ({ page }) => {
  await page.addInitScript(() => { for (const k of ["straypaw.notice.storage.v1", "straypaw.analytics.optout"]) localStorage.setItem(k, "1"); });
  await page.goto("/try");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("See StrayPaw at work.");
  await expect(page.getByRole("list", { name: "The stops" }).getByRole("listitem")).toHaveCount(CHAPTERS.length);
  await page.getByRole("button", { name: /Start the tour/ }).click();

  for (let i = 0; i < CHAPTERS.length; i++) {
    const card = page.locator("aside.dt").first();
    await expect(card.locator(".dt-k")).toContainText(`${i + 1} of ${CHAPTERS.length}`, { timeout: 120_000 });
    await expect(page.locator(".dt-transit")).toHaveCount(0, { timeout: 30_000 });
    /* the screen has its data and the chapter's subject is highlighted */
    await expect(page.locator(".sp-tour-hl").first()).toBeVisible({ timeout: 30_000 });
    await card.locator(".dt-btn.is-go").click();
  }

  const end = page.locator("aside.dt.is-end");
  await expect(end).toContainText("That is the platform", { timeout: 60_000 });
  for (const c of CHAPTERS) await expect(end.locator(".dt-shown")).toContainText(c);
  await end.getByRole("button", { name: /Explore freely/ }).click();
  await expect(page.locator(".dt-pill")).toBeVisible();
});
