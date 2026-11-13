import { expect, test } from "@playwright/test";

/* The operating path, read-only, against the STAGING demo (illustrative data
   only). One vocabulary and one route through the workspace:

     Today's strip  →  the Pipeline board, at that stage
     a card         →  the record, with its place in the line and one next step
     a stage on the record's rail  →  back to the board, at that stage

   Nothing is written. Skipped unless OH_E2E=1: it needs a build pointed at
   staging, because the NGO coordinator signs in through the demonstration.

   OH_E2E=1 E2E_BASE_URL=http://localhost:3300 npx playwright test e2e/operating-path.spec.ts */
test.skip(process.env.OH_E2E !== "1", "Needs a build pointed at the staging demonstration");
test.setTimeout(240_000);

const STAGES = ["New", "In care", "With the vet", "Evidence", "To report"];

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => { for (const k of ["straypaw.notice.storage.v1", "straypaw.tour.v2", "straypaw-install-dismissed", "straypaw.analytics.optout", "sp.welcome.first-workflow", "sp.videocard.dismissed"]) localStorage.setItem(k, "1"); });
});

test("Today, the board and a record share one line of work, and each click lands where it points", async ({ page, isMobile }) => {
  await page.goto("/try", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /NGO coordinator/ }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/try"), { timeout: 120_000 });
  await page.evaluate(() => localStorage.setItem("sp.demo.tour.v1", JSON.stringify({ mode: "off", step: 0, role: null })));

  /* Today names the same five stages as the board, in the same order. */
  await page.goto("/ngo");
  const strip = page.getByRole("navigation", { name: "The line of work today" });
  await expect(strip.getByRole("link")).toHaveCount(5, { timeout: 60_000 });
  for (const [i, s] of STAGES.entries()) await expect(strip.getByRole("link").nth(i)).toContainText(s);

  /* A stage on Today opens the board with that stage in view and marked. */
  await strip.getByRole("link", { name: /Evidence/ }).click();
  await expect(page).toHaveURL(/\/ngo\/pipeline\?stage=evidence$/, { timeout: 60_000 });
  const board = page.getByRole("list", { name: "The line of work, by stage" });
  await expect(board.locator("[data-stage]")).toHaveCount(5);
  for (const [i, s] of STAGES.entries()) await expect(board.locator("[data-stage]").nth(i).getByRole("heading", { level: 2 })).toHaveText(s);
  const focus = board.locator("[data-stage='evidence']");
  await expect(focus).toHaveAttribute("aria-current", "true");
  await expect(focus).toBeInViewport();
  /* The numbers match: Today's count for a stage is the number of cards the board holds for it. */
  const cards = focus.locator(".k-card");
  await expect(cards.first()).toBeVisible({ timeout: 60_000 });

  /* A card opens the record. The record says where it is in the line and gives one next step. */
  /* On a wide screen a card opens the record over the board; "Open as a full page" makes it the page. */
  await cards.first().click();
  if (!isMobile) { await expect(page.getByRole("dialog", { name: /opened over the page/ })).toBeVisible({ timeout: 60_000 }); await page.getByRole("button", { name: "Open as a full page" }).click(); }
  await expect(page).toHaveURL(/\/ngo\/verification\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  const rail = page.getByRole("navigation", { name: "Where this record is in the line of work" });
  await expect(rail.locator("[aria-current='step']")).toContainText("Evidence", { timeout: 60_000 });
  await expect(rail.locator("li.is-done")).toHaveCount(3);
  const next = page.locator(".abc-next");
  await expect(next).toBeVisible();
  await expect(next.locator(".abc-next-k")).toHaveText(/Next step|Returned/);
  /* The one action takes the person to the control that does the step, and focuses it. */
  await next.getByRole("button", { name: /Take me there/ }).click();
  await expect(page.locator("#abc-add")).toBeInViewport();
  await expect(page.locator("#abc-add select")).toBeFocused();
  /* The record keeps the Pipeline's views and one breadcrumb. */
  if (!isMobile) await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Cases");

  /* A stage on the rail goes back to the board, at that stage. */
  await rail.getByRole("link", { name: /With the vet/ }).click();
  await expect(page).toHaveURL(/\/ngo\/pipeline\?stage=vet$/, { timeout: 60_000 });
  await expect(page.locator("[data-stage='vet']")).toHaveAttribute("aria-current", "true");

  /* A case that needs no procedure has a shorter line: New, In care, Closed. */
  await page.goto((await page.locator("[data-stage='care'] .k-card").first().getAttribute("href"))!);
  await expect(page).toHaveURL(/\/ngo\/cases\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  const caseRail = page.getByRole("navigation", { name: "Where this record is in the line of work" });
  await expect(caseRail.locator("[aria-current='step']")).toContainText("In care", { timeout: 60_000 });
  await expect(caseRail.getByRole("listitem")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("the first-day guide points at the real controls and ends on real actions", async ({ page, isMobile }) => {
  await page.goto("/try", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /NGO coordinator/ }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/try"), { timeout: 120_000 });
  await page.evaluate(() => localStorage.setItem("sp.demo.tour.v1", JSON.stringify({ mode: "off", step: 0, role: null })));
  await page.goto("/ngo");
  await expect(page.getByRole("navigation", { name: "The line of work today" }).getByRole("link")).toHaveCount(5, { timeout: 60_000 });
  /* A sample session has its own guide, so this one waits to be asked for. */
  await expect(page.getByRole("dialog")).toHaveCount(0);
  test.skip(!!isMobile, "The guide is asked for from the sidebar, which is part of the desktop frame");
  await page.getByRole("complementary", { name: "Workspace" }).getByRole("button", { name: "Help and keys" }).click();
  await page.getByRole("menuitem", { name: "Take the tour" }).click();
  const guide = page.getByRole("dialog");
  await expect(guide.getByRole("heading")).toHaveText("This is your place");
  /* The lit control is the one being described. */
  const lit = async (sel: string) => { const [a, b] = await Promise.all([page.locator(".fd1-light").boundingBox(), page.locator(sel).first().boundingBox()]); expect(Math.abs(a!.x + 6 - b!.x)).toBeLessThanOrEqual(2); expect(Math.abs(a!.y + 6 - b!.y)).toBeLessThanOrEqual(2); };
  await expect.poll(async () => (await page.locator(".fd1-light").boundingBox())?.width ?? 0).toBeGreaterThan(100);
  await page.waitForTimeout(700); await lit(".ws-place");
  for (const title of ["The menu is short on purpose", "One thing first", "The line of work", "Kaju", "Your open pages"]) {
    await guide.getByRole("button", { name: /^(Next|Finish)/ }).click();
    await expect(guide.getByRole("heading")).toHaveText(title);
  }
  await page.waitForTimeout(700); await lit(".ws-tabs");
});
