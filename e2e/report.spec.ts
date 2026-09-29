import { test, expect, type Page } from "@playwright/test";

/* ════════════════════════════════════════════════════════════════════
   The reporting journey, the one flow that has to survive every change.

   These run without Supabase credentials, which is deliberate: they cover
   everything up to the write, so they are runnable in CI and by anyone who
   has just cloned the repo. The write itself needs a real project and lives
   in the manual checklist (docs/QA-CHECKLIST.md) instead of being faked
   here with a mock that would pass whatever the backend actually did.
   ════════════════════════════════════════════════════════════════════ */

/** A real 64×48 JPEG. The old 1×1 fixture was accepted by the file input but
 * decoded inconsistently in headless Chromium, making the photo-editor tests flaky. */
const TEST_JPEG = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAwAEADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDeooor5Q+lCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9k=", "base64");

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}


/** The flow marks itself ready once hydrated, so the file input's
 * onChange is attached before a file is set. */
async function hydrated(page: Page) {
  await expect(page.locator(".rq-wrap[data-ready]")).toHaveCount(1);
}

async function addPhoto(page: Page) {
  await hydrated(page);
  await page.getByLabel("Choose a photo of the animal").setInputFiles({
    name: "dog.jpg",
    mimeType: "image/jpeg",
    buffer: TEST_JPEG,
  });
  const usePhoto = page.getByRole("button", { name: "Use this photo" });
  await expect(usePhoto).toBeEnabled();
  await usePhoto.click();
}

/* A phone standing in Bengaluru, with location allowed. */
const IN_INDIA = { geolocation: { latitude: 12.9716, longitude: 77.5946 }, permissions: ["geolocation"] };

test.describe("reporting", () => {
  test("opens straight into the flow, with no interstitial", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/report");
    await expect(page.getByText("Which of these is you?")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Start a care report" })).toBeVisible();
    await expect(page.getByRole("button", { name: /take a photo/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  /* One question per screen: a photo, or the honest "I can't take one",
     moves straight on to where. */
  test("the photo screen moves on with a photo or an honest no", async ({ page }) => {
    await page.goto("/report");
    await addPhoto(page);
    await expect(page.getByRole("heading", { name: "Where is the dog?" })).toBeVisible();

    await page.goto("/report");
    await hydrated(page);
    await page.getByRole("button", { name: /can't take one/i }).click();
    await expect(page.getByRole("heading", { name: "Where is the dog?" })).toBeVisible();
  });

  test.describe("with the phone's location", () => {
    test.use(IN_INDIA);

    test("where is already filled in from the phone", async ({ page }) => {
      await page.goto("/report");
      await hydrated(page);
      await page.getByRole("button", { name: /can't take one/i }).click();
      await expect(page.getByText("From your phone")).toBeVisible();
      await expect(page.getByRole("button", { name: /that's right/i })).toBeVisible();
    });

    /* Each answer is one tap and moves on; send waits only for the
       consent on the last screen. */
    test("one tap per screen, then check and send", async ({ page }) => {
      await page.goto("/report");
      await hydrated(page);
      await page.getByRole("button", { name: /can't take one/i }).click();
      await page.getByRole("button", { name: /that's right/i }).click();
      await page.getByRole("radio", { name: /hurt or sick/i }).click();
      await page.getByRole("radio", { name: /can't see/i }).click();
      await expect(page.getByRole("heading", { name: "Ready to share" })).toBeVisible();
      await expect(page.getByText(/call your local animal ambulance/i)).toBeVisible();
      const send = page.getByRole("button", { name: /send report/i });
      await expect(send).toBeDisabled();
      await page.getByLabel(/no faces, homes or number plates/i).check();
      if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) await expect(send).toBeEnabled();
      /* Any answer can be changed from the summary and comes straight back. */
      await page.getByRole("button", { name: /how it is/i }).click();
      await page.getByRole("radio", { name: /seems fine/i }).click();
      await expect(page.getByRole("heading", { name: "Ready to share" })).toBeVisible();
    });
  });

  test.describe("outside India", () => {
    test.use({ geolocation: { latitude: 51.5072, longitude: -0.1276 }, permissions: ["geolocation"] });

    test("says so and asks for the place on the map", async ({ page }) => {
      await page.goto("/report");
      await hydrated(page);
      await page.getByRole("button", { name: /can't take one/i }).click();
      await expect(page.getByText(/outside India/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /this is the place/i })).toBeDisabled();
    });
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

/** The first visit to the app opens the role picker; close it. */
async function openApp(page: Page) {
  await page.goto("/app");
  const skip = page.getByRole("dialog").getByRole("button", { name: "Skip for now" });
  await skip.waitFor({ state: "visible", timeout: 5000 }).then(() => skip.click()).catch(() => { /* no picker this time */ });
}

test.describe("near you", () => {
  /* No place, no sample city: the home asks where you walk and shows no
     other city's record in the meantime. */
  test("the app home asks for a place before showing any record", async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole("heading", { name: "Where do you walk?" })).toBeVisible();
    await expect(page.getByText(/Coimbatore/)).toHaveCount(0);
  });

  test.describe("outside India", () => {
    test.use({ geolocation: { latitude: 51.5072, longitude: -0.1276 }, permissions: ["geolocation"] });
    test("says so when the phone is abroad", async ({ page }) => {
      await openApp(page);
      await page.getByRole("button", { name: "Use my location" }).click();
      await expect(page.getByRole("heading", { name: "You are outside India." })).toBeVisible();
    });
  });
});

test.describe("public routes", () => {
  const ROUTES = [
    "/",
    "/report",
    "/app",
    "/map",
    "/stories",
    "/orgs",
    "/partners",
    "/get-involved",
    "/adopt",
    "/education",
    "/mission",
    "/for-ngos",
    "/for-funders",
    "/contact",
    "/privacy",
    "/how-to-help",
    "/the-network",
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
    const recovery = page.locator("[data-not-found-recovery]");
    await expect(recovery.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "/");
    await expect(recovery.getByRole("link", { name: "Open live map" })).toHaveAttribute("href", "/map");
    await expect(recovery.getByRole("link", { name: "Report an animal" })).toHaveAttribute("href", "/report");
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
