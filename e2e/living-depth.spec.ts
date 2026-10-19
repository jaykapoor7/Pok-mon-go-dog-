import { test, expect } from "@playwright/test";
import { REGISTER_FRAMES } from "../src/lib/landing/frames";

test("public gallery uses native profiles or an honest unavailable state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const gallery = page.locator(".depth-gallery");
  await gallery.scrollIntoViewIfNeeded();
  const profiles = gallery.locator(".depth-gallery-set:not(.is-copy) .depth-portrait:not(.is-repeat)");
  if (await profiles.count()) {
    expect(await profiles.count()).toBeLessThanOrEqual(Object.keys(REGISTER_FRAMES).length);
    for (const profile of await profiles.all()) {
      await expect(profile).toHaveAttribute("href", /^\/animal\/[a-f0-9-]+$/i);
      await expect(profile.locator("img")).toHaveAttribute("loading", "lazy");
    }
    await expect(gallery.getByRole("button", { name: "Motion off" })).toBeDisabled();
    await expect(gallery.locator(".is-copy").first()).toHaveAttribute("aria-hidden", "true");
    await expect(gallery.locator(".is-copy a").first()).toHaveAttribute("tabindex", "-1");
    expect(await gallery.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  } else {
    await expect(gallery).toContainText("Reviewed public photographs are unavailable");
    await expect(gallery.getByRole("link", { name: "Explore the animal records" })).toHaveAttribute("href", "/explore");
  }
});

test("real map is opt-in, read-only and leaves landing navigation state intact", async ({ page }) => {
  const writes: string[] = [];
  await page.route("**/*", async route => {
    if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) {
      writes.push(route.request().method());
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/");
  await expect(page.locator("main > section")).toHaveCount(4);
  const map = page.locator("#living-map-showcase");
  await expect(map.locator("iframe")).toHaveCount(0);
  const start = map.getByRole("button", { name: "Explore the interactive map" });
  await start.click();
  const frame = page.frameLocator('iframe[title="Interactive Living Map: actual public records"]');
  await expect(frame.locator(".fm")).toBeVisible();
  await expect(frame.getByRole("button", { name: "Report here", exact: true })).toHaveCount(0);
  await expect(frame.getByRole("button", { name: "Open a case here", exact: true })).toHaveCount(0);
  await expect(frame.getByRole("button", { name: "Go to where I am", exact: true })).toHaveCount(0);
  await expect(frame.getByRole("button", { name: "Open requests", exact: true })).toBeVisible();
  await frame.getByRole("button", { name: "Open requests", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await map.getByRole("button", { name: "Close interactive map" }).click();
  await expect(map.locator("iframe")).toHaveCount(0);
  await expect(start).toBeFocused();
  expect(writes).toEqual([]);
});

test("the visual trail distinguishes viewed panels from recorded workflow events", async ({ page }) => {
  await page.goto("/");
  const demo = page.locator("#why");
  await demo.getByLabel("What you saw", { exact: true }).fill("A local example observation, not a public record.");
  await demo.getByRole("button", { name: "Send the example report" }).click();
  await expect(demo.locator(".depth-trail")).toContainText("Received");
  await expect(demo.locator(".depth-trail")).toContainText("Pending review");
  await demo.getByRole("button", { name: "Animal history", exact: true }).click();
  await expect(demo.locator(".depth-history")).toContainText("A local example observation");
  await expect(demo.locator(".depth-history [data-recorded=true]")).toHaveCount(1);
  await demo.getByRole("button", { name: "Case details", exact: true }).click();
  await demo.getByRole("button", { name: "Try acceptance" }).click();
  await demo.getByRole("button", { name: "Animal history", exact: true }).click();
  await expect(demo.locator(".depth-history [data-recorded=true]")).toHaveCount(2);
  await expect(demo.locator(".depth-history")).toContainText("demo only");
  await expect(demo.locator(".depth-history")).toContainText("None recorded");
  await demo.getByRole("button", { name: "Replay the example" }).click();
  await expect(demo.locator(".depth-example-identity")).toHaveCount(0);
  await expect(demo.locator(".depth-trail")).toContainText("Not sent");
});
