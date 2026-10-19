import { test, expect } from "@playwright/test";

// All example paths remain local, even when live public data is configured.
test("playable report keeps ownership explicit and never sends writes", async ({ page }) => {
  const writes: string[] = [];
  await page.route("**/*", async route => {
    if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) {
      writes.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/");
  const demo = page.locator("#why");
  await demo.getByLabel("What you saw", { exact: true }).fill("Example observation for a limping dog.");
  await demo.getByLabel("Reported condition").selectOption("Road accident");
  await demo.getByRole("button", { name: "Send the example report" }).click();
  await expect(demo.getByRole("status")).toContainText("no organisation has accepted");
  await expect(demo.locator(".lp-queue-row")).toContainText("Critical");
  await demo.locator(".lp-queue-row").click();
  await expect(demo.locator(".brief")).toContainText("Pending acceptance");
  await expect(demo.locator(".brief")).toContainText("Unassigned");
  await expect(demo.locator(".brief")).toContainText("None recorded");
  await demo.getByRole("button", { name: "Try acceptance" }).click();
  await expect(demo.getByRole("status")).toContainText("demo only");
  await demo.getByRole("button", { name: "Try assignment" }).click();
  await expect(demo.locator(".brief")).toContainText("Example team member");
  await demo.getByRole("button", { name: "How care is recorded" }).click();
  await expect(demo.locator(".lp-action-note")).toContainText("neither treatment nor an outcome");
  await demo.getByRole("button", { name: "Animal history", exact: true }).click();
  await expect(demo.locator(".lp-panel")).toContainText("Not linked");
  await demo.getByRole("button", { name: "Geographic area", exact: true }).click();
  await expect(demo.locator(".lp-panel")).toContainText("This example is not on the map");
  await demo.getByRole("button", { name: "Back", exact: true }).click();
  await expect(demo.locator(".lp-panel h3")).toHaveText("Animal history");
  await demo.getByRole("button", { name: "Replay the example" }).click();
  await expect(demo.getByLabel("What you saw", { exact: true })).toBeFocused();
  await demo.getByRole("button", { name: "Send the example report" }).click();
  await demo.getByRole("button", { name: "Inspect the case" }).click();
  await expect(demo.locator(".brief")).toContainText("Pending acceptance");
  expect(writes).toEqual([]);
});

test("example identity follows audience tasks and clears on reload", async ({ page }) => {
  await page.goto("/");
  const demo = page.locator("#why");
  await demo.getByLabel("What you saw", { exact: true }).fill("Shared example, never a public record.");
  await demo.getByRole("button", { name: "Send the example report" }).click();
  const ecosystem = page.locator("#how");
  await expect(ecosystem.locator(".lp-resident-receipt")).toContainText("Shared example, never a public record.");
  await ecosystem.getByRole("tab", { name: "Organisations", exact: true }).click();
  await expect(ecosystem.locator(".lp-panel")).toContainText("Shared example, never a public record.");
  await ecosystem.getByRole("button", { name: "Try acceptance" }).click();
  await ecosystem.getByRole("tab", { name: "Residents", exact: true }).click();
  await expect(ecosystem.locator(".lp-resident-receipt")).toContainText("Example organisation · demo only");
  await ecosystem.getByRole("tab", { name: "Municipal teams", exact: true }).click();
  await ecosystem.getByRole("button", { name: "Unknown sterilisation", exact: true }).click();
  await expect(ecosystem.locator(".lp-public-figures")).toContainText("Unknown is not counted as unsterilised");
  await ecosystem.getByRole("tab", { name: "Partners and funders", exact: true }).click();
  await ecosystem.getByRole("button", { name: "Inspect sources and limits" }).click();
  await expect(ecosystem.locator("#audience-sources")).toContainText("contributes to none");
  await page.reload();
  await expect(demo.getByRole("button", { name: "Send the example report" })).toBeVisible();
  await expect(page.locator(".lp-resident-receipt")).toContainText("Not sent");
});

test("mobile can return to the report, edit and resubmit without losing the example", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const demo = page.locator("#why");
  await demo.getByRole("button", { name: "Send the example report" }).click();
  await expect(demo.locator(".lp-demo-record")).toBeFocused();
  await demo.getByRole("button", { name: "Edit report" }).click();
  const observation = demo.getByLabel("What you saw", { exact: true });
  await expect(observation).toBeFocused();
  await observation.fill("An updated example observation.");
  await demo.getByRole("button", { name: "Update the example report" }).click();
  await demo.getByRole("button", { name: "Inspect the case" }).click();
  await expect(demo.locator(".lp-panel")).toContainText("An updated example observation.");
});

test("hero switches without movement and retains real destinations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.locator("#world");
  await hero.getByRole("button", { name: "Living Map", exact: true }).click();
  await expect(hero.locator("#living-geography")).toBeVisible();
  await expect(hero.locator("#living-record")).toBeHidden();
  await hero.getByRole("button", { name: "Animal record", exact: true }).click();
  await expect(hero.locator("#living-record")).toBeVisible();
  expect(await hero.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
});
