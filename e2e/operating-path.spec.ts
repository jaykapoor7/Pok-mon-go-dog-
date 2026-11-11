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
  const cards = focus.locator(".pl-card");
  await expect(cards.first()).toBeVisible({ timeout: 60_000 });

  /* A card opens the record. The record says where it is in the line and gives one next step. */
  await cards.first().click();
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
  await expect(page.getByRole("navigation", { name: "Pipeline views" }).getByRole("link", { name: "Sign-off & evidence", exact: true })).toHaveAttribute("aria-current", "true");
  if (!isMobile) await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Pipeline");

  /* A stage on the rail goes back to the board, at that stage. */
  await rail.getByRole("link", { name: /With the vet/ }).click();
  await expect(page).toHaveURL(/\/ngo\/pipeline\?stage=vet$/, { timeout: 60_000 });
  await expect(page.locator("[data-stage='vet']")).toHaveAttribute("aria-current", "true");

  /* A case that needs no procedure has a shorter line: New, In care, Closed. */
  await page.locator("[data-stage='care'] .pl-card").first().click();
  await expect(page).toHaveURL(/\/ngo\/cases\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  const caseRail = page.getByRole("navigation", { name: "Where this record is in the line of work" });
  await expect(caseRail.locator("[aria-current='step']")).toContainText("In care", { timeout: 60_000 });
  await expect(caseRail.getByRole("listitem")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
