import { test, expect, type Page } from "@playwright/test";

/* ════════════════════════════════════════════════════════════════════
   The reporting journey, the one flow that has to survive every change.

   These run without Supabase credentials, which is deliberate: they cover
   everything up to the write, so they are runnable in CI and by anyone who
   has just cloned the repo. The write itself needs a real project and lives
   in the manual checklist (docs/QA-CHECKLIST.md) instead of being faked
   here with a mock that would pass whatever the backend actually did.
   ════════════════════════════════════════════════════════════════════ */

/** A 1x1 JPEG. Enough to satisfy the file input and the type check. */
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
    "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAA" +
    "AAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64"
);

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}


async function addPhoto(page: Page) {
  await page.setInputFiles('input[type="file"]', {
    name: "dog.jpg",
    mimeType: "image/jpeg",
    buffer: TINY_JPEG,
  });
  const usePhoto = page.getByRole("button", { name: "Use this photo" });
  await expect(usePhoto).toBeEnabled();
  await usePhoto.click();
  await expect(page.getByRole("button", { name: /next|continue/i }).first()).toBeVisible();
}

test.describe("reporting", () => {
  test("opens straight into the flow, with no interstitial", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/report");

    /* The role picker used to open over this page. Someone who tapped
       "report an animal" is standing in front of one; anything between them
       and the first field costs the observation. */
    await expect(page.getByText("Which of these is you?")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Add a photo" })
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("will not advance without a photo, then will with one", async ({ page }) => {
    await page.goto("/report");
    const next = page.getByRole("button", { name: /next|continue/i }).first();

    await expect(next).toBeDisabled();
    await addPhoto(page);
    await expect(next).toBeEnabled();
  });

  test("will not advance past location until a point is set", async ({ page }) => {
    await page.goto("/report");
    await addPhoto(page);
    const next = page.getByRole("button", { name: /next|continue/i }).first();
    await expect(next).toBeEnabled();
    await next.click();

    await expect(page.getByText(/where is it/i)).toBeVisible();
    /* No coordinates yet, from EXIF or otherwise, so the flow holds here
       rather than filing an observation with no place. A record without a
       location is not an observation of anywhere. */
    await expect(next).toBeDisabled();
  });

  test("never scrolls sideways on a phone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "phone widths only");
    await page.goto("/report");
    const bleeds = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(bleeds).toBe(false);
  });
});

test.describe("public routes", () => {
  const ROUTES = [
    "/",
    "/report",
    "/app",
    "/feed",
    "/map",
    "/stories",
    "/orgs",
    "/partners",
    "/gaps",
    "/get-involved",
    "/adopt",
    "/education",
    "/mission",
    "/for-ngos",
    "/for-funders",
    "/contact",
    "/privacy",
    "/what-would-it-take",
    "/how-to-help",
    "/why-straypaw",
    "/the-network",
    "/the-data",
    "/research-standards",
    "/partner",
    "/partner/cases",
    "/partner/animals",
    "/partner/map",
    "/partner/reports",
    "/partner/team",
    "/partner/settings",
    "/partner/import",
  ];

  for (const route of ROUTES) {
    test(`${route} renders without throwing`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "route smoke runs once; mobile behavior has dedicated tests");
      const errors = collectPageErrors(page);
      const res = await page.goto(route);
      expect(res?.status(), `${route} status`).toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible();
      expect(errors, `${route} console errors`).toEqual([]);
    });
  }

  test("unknown routes use the branded recovery page", async ({ page }) => {
    const res = await page.goto("/this-route-should-never-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This trail ends here." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Open live map" })).toHaveAttribute("href", "/map");
    await expect(page.getByRole("link", { name: "Report an animal" })).toHaveAttribute("href", "/report");
  });

  test("primary public navigation does not point at a missing route", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "internal-link crawl is viewport-independent");
    const hrefs = new Set<string>();
    for (const route of ["/", "/app", "/partner"]) {
      await page.goto(route);
      const links = await page.locator('a[href^="/"]').evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href") || "")
      );
      links.forEach((href) => {
        const clean = href.split("#")[0];
        if (clean && !clean.startsWith("/api/")) hrefs.add(clean);
      });
    }

    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.status(), `broken internal link: ${href}`).toBeLessThan(400);
    }
  });
});

test.describe("resilience", () => {
  test("renders with browser storage blocked", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "storage behavior is viewport-independent");
    /* Private mode, blocked site data and some enterprise policies make these
       accessors *throw*, not return null. An unguarded read in an app-wide
       effect takes the whole tree down with it, which has happened here
       before. */
    await page.addInitScript(() => {
      const boom = () => {
        throw new DOMException("blocked");
      };
      Object.defineProperty(window, "localStorage", { get: boom });
      Object.defineProperty(window, "sessionStorage", { get: boom });
    });

    const errors = collectPageErrors(page);
    for (const route of ["/", "/report", "/app", "/map"]) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
