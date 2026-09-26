import { test, expect } from "@playwright/test";

test("the landing first view is self-contained and names all three roles", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".ld-hero");
  const firstSystemSection = page.locator(".ld-hero + .ld-sec");
  const geometry = await page.evaluate(() => {
    const h = document.querySelector(".ld-hero")?.getBoundingClientRect();
    const next = document.querySelector(".ld-hero + .ld-sec")?.getBoundingClientRect();
    return h && next ? { heroTop: h.top, heroBottom: h.bottom, heroHeight: h.height, nextTop: next.top, viewport: innerHeight } : null;
  });
  expect(geometry).not.toBeNull();
  expect(geometry!.heroHeight).toBeGreaterThan(geometry!.viewport * .78);
  expect(geometry!.nextTop).toBeGreaterThanOrEqual(geometry!.viewport - 1);
  await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(firstSystemSection.getByText("Resident", { exact: true }).first()).toBeAttached();
  await expect(firstSystemSection.getByText("NGO", { exact: true }).first()).toBeAttached();
  await expect(firstSystemSection.getByText("Municipality", { exact: true }).first()).toBeAttached();
  if (await page.locator("#ld-relay-title").count()) {
    const ids = await page.locator(".rl-id b, .rl-link b, .rl-id-inline").allTextContents();
    expect(new Set(ids.map((id) => id.trim()).filter(Boolean)).size).toBe(1);
  }
});

test("educators enter a lesson studio containing the original Kind Hour materials", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("straypaw.role", "educator"));
  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1, name: /Lesson materials/ })).toBeVisible();
  const materials = page.getByRole("link", { name: /Open original PDF/ });
  await expect(materials).toHaveCount(5);
  for (const link of await materials.all()) {
    await expect(link).toHaveAttribute("href", /drive\.google\.com\/file\/d\//);
    await expect(link).toHaveAttribute("target", "_blank");
  }
  await expect(page.getByText(/Sensitive material: it opens with sexual-violence content/)).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Lesson studio" })).toHaveAttribute("aria-current", "page");
});

test("community navigation restores Saved dogs and the destination opens", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("straypaw.role", "individual"));
  await page.goto("/app");
  const saved = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Saved dogs" });
  await expect(saved).toHaveAttribute("href", "/following");
  await saved.click();
  await expect(page).toHaveURL(/\/following$/);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("contact form validates clearly and preserves its success state", async ({ page }) => {
  await page.route("**/api/contact", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, delivered: true }) }));
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".ct-error")).toContainText("valid email");
  await page.getByLabel("Your name").fill("QA Visitor");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("qa@example.com");
  await page.getByLabel("Message").fill("Checking the contact journey.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("Message sent");
  await expect(page.getByRole("contentinfo")).toBeVisible();
});

test("Kind Hour opens as a sourced public organisation record", async ({ page }) => {
  const response = await page.goto("/org/the-kind-hour-foundation");
  expect(response?.status()).toBeLessThan(400);
  test.skip(await page.locator(".op-head").count() === 0, "requires configured production data");
  await expect(page.locator(".op-head").getByRole("heading", { level: 1 })).toContainText("Kind Hour");
  await expect(page.getByText("Public organisation record")).toBeVisible();
  await expect(page.getByText(/Figures, animals and coverage appear only where a published StrayPaw record supports them/)).toBeVisible();
});
