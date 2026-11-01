import { expect, test } from "@playwright/test";

/* Kaju is StrayPaw's AI agent; the puppy is its mascot. His pose follows
   the agent's real state and he never moves under reduced motion. */

test("Kaju greets when the agent opens and listens after", async ({ page, isMobile }) => {
  await page.goto("/community");
  const open = isMobile
    ? page.getByRole("navigation", { name: /navigation/ }).getByRole("button", { name: "Kaju" })
    : page.getByRole("banner").getByRole("button", { name: "Kaju" });
  await open.click();
  const panel = page.getByRole("complementary", { name: "Kaju" });
  await expect(panel).toBeVisible();
  const mascot = panel.locator("svg.kaju").first();
  await expect(mascot).toHaveAttribute("data-kaju-state", /greeting|listening/);
  await expect(mascot).toHaveAttribute("data-kaju-state", "listening", { timeout: 4000 });
  await expect(panel.getByRole("textbox", { name: "Message Kaju" })).toBeVisible();
});

test("Kaju stays still when the device asks for reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/assistant");
  const running = await page.evaluate(() => [...document.querySelectorAll("svg.kaju *")].filter((e) => getComputedStyle(e).animationName !== "none").length);
  expect(running).toBe(0);
  await ctx.close();
});

test("the workspace is called Kaju everywhere a person reads it", async ({ page }) => {
  await page.goto("/assistant");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ask Kaju.");
  expect(await page.locator("body").innerText()).not.toMatch(/StrayPaw AI\b(?!, confirmed)/);
});

test("Explorer artwork loads as an articulated rig", async ({ page, request }) => {
  await page.goto("/assistant");
  const explorer = page.locator('svg[data-kaju-art="explorer"]:visible').first();
  await expect(explorer).toBeVisible();
  await expect(explorer).toHaveAttribute('data-kaju-rig', 'articulated');
  for (const part of ['head', 'torso', 'tail', 'fFar', 'fNear', 'bFar', 'bNear']) await expect(explorer.locator(`.kj-${part}`)).toHaveCount(1);
  const asset = await explorer.locator('image').first().getAttribute('href');
  expect(asset).toContain('explorer-rig');
  const response = await request.get(asset!);
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toMatch(/^image\//);
});
