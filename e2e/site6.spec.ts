import { expect, test } from "@playwright/test";

/* The public site (StrayPaw 6): what must stay true whatever the design.
   Readable at every width, one clear action, menus that work from the
   keyboard, focus that never gets lost on a phone, essentials without
   JavaScript, honest labels, and motion that never hides content. */
const H1 = /One record for every animal,\s*bite, dose and sample\./;
test.beforeEach(async ({ context }) => { await context.addInitScript(() => localStorage.setItem("straypaw.notice.storage.v1", "1")); });

for (const width of [320, 390, 768, 1440]) test(`landing is usable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto("/");
  await expect(page.locator("h1")).toHaveText(H1);
  for (const a of await page.locator(".s6-hero .s6-hero-cta a").all()) { const b = await a.boundingBox(); expect(b!.height).toBeGreaterThanOrEqual(44); }
  await expect(page.locator(".s6-hero .s6-hero-cta a").first()).toBeInViewport();
  const headings = (await page.locator("main h2:visible").allInnerTexts()).map((s) => s.replace(/\s+/g, " ").trim());
  expect(headings.slice(0, 2)).toEqual(["A coordinator's morning, start to finish.", "Use cases"]);
  for (const h of ["Switch on what your programme does. Leave the rest off.", "Kaju prepares. People approve.", "One place. Every role sees its own work.", "Honest about what is live.", "Questions"]) expect(headings).toContain(h);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("the landing says what is live and what is not connected", async ({ page }) => {
  await page.goto("/");
  const status = page.getByLabel("What is live and what is not connected");
  await expect(status).toContainText("SMS and WhatsApp not connected");
  await expect(status).toContainText("No stock system connected");
  await expect(status).toContainText("accuracy not yet validated");
  await expect(page.getByRole("group", { name: "Product demo: one bite, four institutions" })).toContainText("Product demo · illustrative records");
  await expect(page.getByRole("group", { name: /Product demo: a coordinator's day in StrayPaw/ })).toBeVisible();
});

test("the relay advances on its own and can be paused", async ({ page }) => {
  await page.goto("/");
  const relay = page.getByRole("group", { name: "Product demo: one bite, four institutions" });
  await expect(relay).toContainText("Find and observe the dog", { timeout: 12_000 });
  await relay.getByRole("button", { name: "Step 4 of 4" }).click();
  await relay.getByRole("button", { name: /Pause the relay|Play the relay/ }).click();
  await expect(relay).toContainText("Rabies confirmed · HSR Layout");
});

test("under reduced motion nothing is hidden and the relay stands still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/");
  await expect(page.getByRole("group", { name: "Product demo: one bite, four institutions" })).toContainText("Rabies confirmed · HSR Layout");
  for (const id of ["product", "offer", "kaju", "trust", "questions", "offer", "product"]) { const sec = page.locator(`#${id}`); await sec.scrollIntoViewIfNeeded(); await expect(sec.locator("h2:visible").first()).toBeVisible(); }
  expect(await page.evaluate(() => [...document.querySelectorAll(".s6 [data-reveal]")].every((el) => getComputedStyle(el).opacity === "1"))).toBe(true);
});

test("what we offer: picking a module plays its scene and a switch turns it off", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/");
  const offer = page.locator("#offer"); await offer.scrollIntoViewIfNeeded();
  await offer.getByRole("button", { name: /^Laboratory/ }).click();
  await expect(offer.getByRole("img", { name: "Illustration: Laboratory" })).toContainText("Sample S-2611");
  const sw = offer.getByRole("switch", { name: "Laboratory module" });
  await expect(sw).toHaveAttribute("aria-checked", "true"); await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await expect(offer.getByRole("img", { name: "Illustration: Laboratory, switched off" })).toBeVisible();
  await expect(offer).toContainText("Off for this programme");
  for (const s of await offer.getByRole("switch").all()) { const b = await s.boundingBox(); expect(b!.width).toBeGreaterThanOrEqual(40); }
});

test("meet Kaju: the scene reaches a person's approval, and stands finished under reduced motion", async ({ page }) => {
  await page.goto("/");
  const scene = page.getByRole("group", { name: "Product demo: Kaju prepares, a person approves" });
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toContainText("Which animals block this month");
  await expect(scene.locator('.s6-ks-ok[data-pressed="true"]')).toBeVisible({ timeout: 20_000 });
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.reload();
  const still = page.getByRole("group", { name: "Product demo: Kaju prepares, a person approves" });
  await still.scrollIntoViewIfNeeded();
  await expect(still.locator('.s6-ks-ok[data-pressed="true"]')).toBeVisible();
  await expect(still.getByRole("button", { name: /Kaju demo/ })).toHaveCount(0);
});

test("no menu lists the same destination twice", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/");
  const seen: string[] = [];
  for (const m of ["Platform", "Who it's for", "Trust", "Resources"]) {
    const toggle = page.getByRole("button", { name: m, exact: true });
    await expect(async () => { await toggle.click(); await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 1000 }); }).toPass({ timeout: 15_000 });
    seen.push(...await page.locator(".s6-panel ul a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? "")));
    await page.keyboard.press("Escape");
  }
  expect(seen.length).toBeGreaterThan(15);
  expect(new Set(seen).size).toBe(seen.length);
});

test("menus open from the keyboard, move with arrows and close on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/");
  const toggle = page.getByRole("button", { name: "Who it's for", exact: true });
  await expect(async () => { await toggle.focus(); await page.keyboard.press("ArrowDown"); await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 1000 }); }).toPass({ timeout: 15_000 });
  const links = page.locator("#s6-panel-solutions a");
  await expect(links.first()).toBeFocused();
  await page.keyboard.press("ArrowDown"); await expect(links.nth(1)).toBeFocused();
  for (const href of ["/for-governments", "/for-ngos", "/for-hospitals", "/research", "/for-funders"]) await expect(page.locator(`#s6-panel-solutions a[href="${href}"]`).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false"); await expect(toggle).toBeFocused();
  await toggle.click(); await page.locator('#s6-panel-solutions a[href="/for-governments"]').click();
  await expect(page).toHaveURL(/\/for-governments$/); await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("phone menu keeps focus, offers one demo action and one sign in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  await expect(async () => { await menu.click(); await expect(page.locator("#s6-sheet")).toBeVisible({ timeout: 1000 }); }).toPass({ timeout: 15_000 });
  const sheet = page.locator("#s6-sheet");
  await expect(sheet.locator("summary").first()).toBeFocused();
  await expect(sheet.getByRole("link", { name: "Book a demo" })).toHaveCount(1);
  await expect(sheet.getByRole("link", { name: "Sign in" })).toHaveCount(1);
  await expect(sheet.locator("details > summary")).toHaveCount(4);
  await sheet.locator("a").last().focus(); await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close menu", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused(); await expect(menu).toHaveAttribute("aria-expanded", "false");
});

test("questions open from the keyboard and the page ends with one primary action", async ({ page }) => {
  await page.goto("/");
  const faq = page.locator("#questions");
  const second = faq.locator("summary").nth(1); await second.focus(); await page.keyboard.press("Enter");
  await expect(faq.locator("details").nth(1)).toHaveAttribute("open", "");
  await expect(page.locator("main .s6-close .is-primary")).toHaveCount(1);
  const end = page.getByRole("contentinfo");
  for (const col of ["Platform", "Who it's for", "Trust", "Resources"]) await expect(end.getByRole("heading", { name: col, exact: true })).toHaveCount(1);
});

test("essentials survive without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false }); const page = await context.newPage(); await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(H1);
  await expect(page.locator(".s6-hero a").filter({ hasText: "Book a demo" })).toHaveAttribute("href", "/demo");
  await expect(page.getByRole("heading", { name: "Honest about what is live." })).toBeVisible();
  await expect(page.locator("#offer").getByRole("img", { name: "Illustration: ABC and vaccination" })).toContainText("Released where caught");
  await expect(page.getByRole("group", { name: "Product demo: Kaju prepares, a person approves" }).getByText("Approved by Farah")).toBeVisible();
  await page.getByText("Who can see patient information?", { exact: true }).click();
  await expect(page.locator("details").filter({ hasText: "Who can see patient information?" })).toContainText("no name is stored");
  await context.close();
});

test("every link in the navigation and footer resolves", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/");
  const hrefs = new Set<string>(await page.locator("footer a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!.split("#")[0])));
  for (const name of ["Platform", "Who it's for", "Trust", "Resources"]) {
    await page.getByRole("button", { name, exact: true }).click();
    for (const h of await page.locator(".s6-panel a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!.split("#")[0]))) hrefs.add(h);
  }
  expect(hrefs.size).toBeGreaterThan(25);
  for (const h of hrefs) expect((await request.get(h)).status(), h).toBe(200);
});

test("sign-in says what the product is and keeps one field", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/sign-in");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in or get started");
  await expect(page.locator(".en-side")).toContainText("One record for every animal, bite, dose and sample.");
  await expect(page.locator("input:visible")).toHaveCount(1);
});
