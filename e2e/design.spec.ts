import { test, expect } from "@playwright/test";

test("landing story keeps the map and reporting within reach", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".street-hero");
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("They livehere, too.");
  await expect(hero.getByRole("link", { name: "Explore the map" })).toHaveAttribute("href", "/map");
  await expect(hero.getByRole("link", { name: "Report a sighting" })).toHaveAttribute("href", "/report");
  await expect(page.locator(".chs")).toHaveCount(0);
  await expect(page.locator('img[src*="brown-on-ledge"]')).toHaveCount(0);
  await expect(page.locator(".field-eyebrow i")).toHaveCount(0);
  await expect(page.locator(".neighbour-model canvas")).toHaveCount(0);
});

test("reduced motion keeps the landing readable without animated reveals", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".street-hero h1")).toBeVisible();
  await expect(page.locator(".field-site")).not.toHaveAttribute("data-motion", "on");
  await expect(page.locator(".neighbour-story")).toHaveCount(0);
});

test("phone navigation keeps search and account access available", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "phone navigation");
  await page.goto("/map");
  await expect(page.getByRole("combobox", {name:"Search the network"})).toBeVisible();
  await page.getByRole("button", {name:"All sections", exact:true}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("link", {name:"Dashboard", exact:true})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("public map filters and list remain operable without records", async ({ page }) => {
  await page.goto("/map");
  const filter = page.getByRole("button", { name: /need help/i });
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("No matching records.")).toBeVisible();
  await page.getByRole("button", { name: "Show all animals" }).click();
  await expect(filter).toHaveAttribute("aria-pressed", "false");
  const list = page.getByRole("button", { name: /Hide list/ });
  await list.click();
  await expect(page.locator("#map-animal-list")).toHaveCount(0);
  await page.getByRole("button", { name: /Show list/ }).click();
  await expect(page.locator("#map-animal-list")).toBeVisible();
});

for (const route of ["/", "/app", "/map", "/partner", "/partner/animals", "/partner/medical", "/partner/incoming", "/partner/team", "/partner/reports"]) {
  test(`${route} fits its viewport and opens without client errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("medical cases remain available alongside animal events", async ({ page }) => {
  await page.goto("/partner/medical");
  await page.getByRole("button", { name: "Medical cases", exact: true }).click();
  await expect(page.getByText("No medical work recorded yet")).toBeVisible();
  await page.getByRole("button", { name: "Animal care history", exact: true }).click();
  await expect(page.getByText("No care events recorded yet")).toBeVisible();
});
