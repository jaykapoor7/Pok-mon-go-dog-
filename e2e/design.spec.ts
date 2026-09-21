import { test, expect } from "@playwright/test";

test("landing makes the core action and live map immediately reachable", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".product-hero");
  await expect(hero.getByRole("heading", { level: 1, name: /Every stray animal in India/i })).toBeVisible();
  await expect(hero.getByRole("link", { name: "See the live map" })).toHaveAttribute("href", "/map");
  await expect(hero.getByRole("link", { name: "Report a sighting" })).toHaveAttribute("href", "/report");
  await expect(hero.locator(".hero-wall-lead")).toBeVisible();
  await expect(page.locator(".role-help")).toBeVisible();
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
  await expect(page.locator(".hero-wall-lead")).toBeVisible();
});

test("open app asks which workspace a person needs", async ({ page }) => {
  await page.goto("/app?choose=1");
  const picker = page.getByRole("dialog");
  await expect(picker.getByRole("heading", { name: "How will you use StrayPaw?" })).toBeVisible();
  await expect(picker.getByRole("button", { name: /I want to report an animal/i })).toBeVisible();
  await expect(picker.getByRole("button", { name: /I work at an organisation/i })).toBeVisible();
  await expect(picker.getByText(/I fund this work/i)).toHaveCount(0);
});

test("the organisation entry tour ends in the partner workspace", async ({ page }) => {
  await page.goto("/app?choose=1");
  await page.getByRole("button", { name: /I work at an organisation/i }).click();
  await expect(page.getByRole("heading", { name: /Organisation records stay in a verified workspace/i })).toBeVisible();
  await page.getByRole("button", { name: /Next/i }).click();
  await expect(page.getByRole("heading", { name: /Your existing records can come with you/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Enter my code/i })).toHaveAttribute("href", "/join");
  await page.getByRole("button", { name: /Begin/i }).click();
  await expect(page).toHaveURL(/\/partner$/);
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Following" })).toHaveCount(0);
});

test("community choice stays account-free and lands in the community record", async ({ page }) => {
  await page.goto("/app?choose=1");
  await page.getByRole("button", { name: /I want to report or follow street animals/i }).click();
  await expect(page.getByRole("heading", { name: /Report what you actually see/i })).toBeVisible();
  await expect(page.getByText(/you@email\.com/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: /The record becomes useful on the map/i })).toBeVisible();
  await page.getByRole("button", { name: /Begin/i }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Animals in your area." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Report an animal" })).toHaveAttribute("href", "/report");
});

test("community home keeps location and reporting within immediate reach", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("straypaw.role", "individual"));
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Animals in your area." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Report an animal" })).toHaveAttribute("href", "/report");
  await expect(page.getByText("Nearby animals")).toBeVisible();
});

test("public map filters and insight controls remain operable without records", async ({ page }) => {
  await page.goto("/map");
  const filter = page.getByRole("button", { name: /need help/i });
  await expect(filter).toBeVisible();
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("No mapped animal records match this view.")).toBeVisible();
  await page.getByRole("button", { name: "Show all records" }).click();
  await expect(filter).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("No animal records here yet.")).toBeVisible();

  const density = page.getByRole("button", { name: "Density" });
  await density.click();
  await expect(density).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("complementary", { name: "Animal density clusters" })).toBeVisible();
});


test("mobile public navigation exposes the core destinations without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const nav = page.locator(".sp-nav");
  await expect(nav.getByRole("link", { name: "Mission" })).toBeVisible();
  const involved = nav.getByRole("button", { name: "Get involved" });
  await involved.click();
  await expect(involved).toHaveAttribute("aria-expanded", "true");
  await expect(nav.getByRole("link", { name: "Report an animal" })).toHaveAttribute("href", "/report");
  await expect(nav.getByRole("link", { name: "For NGOs", exact: true }).first()).toHaveAttribute("href", "/for-ngos");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
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
