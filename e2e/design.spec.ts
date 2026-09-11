import { test, expect } from "@playwright/test";

test("landing leads with a real field record and keeps reporting within reach", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".product-hero");
  await expect(hero.getByRole("heading", { level: 1, name: /A street animal should not have to/i })).toBeVisible();
  await expect(hero.getByRole("link", { name: "See the live map" })).toHaveAttribute("href", "/map");
  await expect(hero.getByRole("link", { name: "Report a sighting" })).toHaveAttribute("href", "/report");
  await expect(hero.locator(".hero-record-stage")).toBeVisible();
  await expect(page.locator(".product-story")).toBeVisible();
});

test("a code sign-in always asks for the receiving email", async ({ page }) => {
  await page.goto("/join");
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Your six-character code")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
});

test("reduced motion keeps the landing readable without animated reveals", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".product-hero h1")).toBeVisible();
  await expect(page.locator(".field-site")).not.toHaveAttribute("data-motion", "on");
  await expect(page.locator(".product-story")).toBeVisible();
});

test("open app asks which workspace a person needs", async ({ page }) => {
  await page.goto("/app?choose=1");
  const picker = page.getByRole("dialog");
  await expect(picker.getByRole("heading", { name: "How will you use StrayPaw?" })).toBeVisible();
  await expect(picker.getByRole("button", { name: /I want to report an animal/i })).toBeVisible();
  await expect(picker.getByRole("button", { name: /I work at an organisation/i })).toBeVisible();
  await expect(picker.getByText(/I fund this work/i)).toHaveCount(0);
});

test("the entry choice opens the right product surface", async ({ page }) => {
  await page.goto("/app?choose=1");
  await page.getByRole("button", { name: /I work at an organisation/i }).click();
  await expect(page).toHaveURL(/\/partner$/);
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Following" })).toHaveCount(0);
});

test("community choice stays account-free", async ({ page }) => {
  await page.goto("/app?choose=1");
  await page.getByRole("button", { name: /I want to report an animal/i }).click();
  await expect(page.getByRole("heading", { name: /Reporting takes a photo and a spot on the map/i })).toBeVisible();
  await expect(page.getByText(/you@email\.com/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: /open the map/i }).click();
  await expect(page).toHaveURL(/\/map$/);
});

test("community home starts local rather than presenting a national tally as nearby", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("straypaw.role", "individual"));
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Start with your street." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible();
  await expect(page.getByText(/Animals recorded nearby/i)).toHaveCount(0);
});

test("public map filters and list remain operable without records", async ({ page }) => {
  await page.goto("/map");
  const filter = page.getByRole("button", { name: /need help/i });
  await expect(filter).toBeVisible();
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("No animal records match this filter.")).toBeVisible();
  await page.getByRole("button", { name: "Show all records" }).click();
  await expect(filter).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#map-animal-list")).toHaveCount(0);
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
