import { test, expect } from "@playwright/test";

/* The guided live demo exists only on a build pointed at the staging database
   (demo.straypaw.org). Any other build, production included, must not sign
   anyone in to a sample account or show the demo guide. */

test("a non-demo build refuses demo sign-in", async ({ request }) => {
  const r = await request.post("/api/demo/session", { data: { role: "lead" } });
  expect(r.status()).toBe(404);
  expect(r.headers()["cache-control"]).toContain("no-store");
});

test("a non-demo build points /try at the demo site and keeps Book a demo", async ({ page }) => {
  await page.goto("/try");
  await expect(page.getByRole("heading", { name: "The live demo runs on its own site" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the live demo" })).toHaveAttribute("href", "https://demo.straypaw.org/try?go=1");
  await page.goto("/");
  await expect(page.locator(".s4-hero").getByRole("link", { name: "Book a demo" })).toBeVisible();
  await expect(page.locator(".s4-hero").getByRole("link", { name: "Start the live demo" })).toHaveCount(0);
  await expect(page.locator(".dt, .dt-pill")).toHaveCount(0);
});
