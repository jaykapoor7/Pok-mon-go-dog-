import { test, expect } from "@playwright/test";

test("landing makes the core action and live map immediately reachable", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".ld-hero");
  await expect(hero.getByRole("heading", { level: 1, name: /Every stray animal in India/i })).toBeVisible();
  await expect(hero.getByRole("link", { name: /Open the live map/ })).toHaveAttribute("href", "/map");
  await expect(hero.getByRole("link", { name: /Report a sighting/ })).toHaveAttribute("href", "/report");
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
  await expect(page.locator(".ld-hero h1")).toBeVisible();
  await expect(page.locator(".field-site")).not.toHaveAttribute("data-motion", "on");
  await expect(page.locator(".ld-hero-actions")).toBeVisible();
});

test("open app asks which workspace a person needs", async ({ page }) => {
  await page.goto("/app?choose=1");
  const picker = page.getByRole("dialog");
  await expect(picker.getByRole("heading", { name: "How will you use StrayPaw?" })).toBeVisible();
  await expect(picker.getByRole("button", { name: /I want to report or follow street animals/i })).toBeVisible();
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
  /* The dialog must actually be gone, not merely behind the page. A Radix
     dialog marks the rest of the document aria-hidden while it is open, so
     leaving it mounted takes the whole workspace out of the accessibility
     tree even when it looks dismissed. Asserting its absence states the
     requirement directly instead of inferring it. */
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await expect(page.locator(".cp-head").getByRole("heading", { level: 1 })).toBeVisible();
  /* Reporting has to be reachable, not phrased a particular way. On a phone
     the header's copy of this action is gone and the tab bar's permanent
     centre slot carries it, so asserting the long label tested the desktop
     wording rather than the requirement. */
  await expect(page.locator('a[href^="/report"]:visible').first()).toBeVisible();
});

test("community home keeps location and reporting within immediate reach", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("straypaw.role", "individual"));
  await page.goto("/app");
  const head = page.locator(".cp-head");
  await expect(head.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(head.getByRole("button", { name: "Use my location" })).toBeVisible();
  await expect(page.locator('a[href^="/report"]:visible').first()).toBeVisible();
});

test("public map filters and modes remain operable", async ({ page }) => {
  await page.goto("/map");
  /* The one-time storage notice sits over the foot of a phone screen until
     it is acknowledged, as a person would. */
  const ok = page.getByRole("button", { name: "Got it" });
  await ok.click({ timeout: 5000 }).catch(() => {});
  const open = page.getByRole("button", { name: /^Filters/ });
  await expect(open).toBeVisible();
  await open.click();
  const filters = page.getByRole("dialog", { name: "Filters" });
  const residents = filters.getByRole("group", { name: "Recorded by" }).getByRole("button", { name: "Residents" });
  await residents.click();
  await expect(residents).toHaveAttribute("aria-pressed", "true");
  await expect(open).toContainText("1");
  await filters.getByRole("button", { name: "Reset" }).click();
  await expect(residents).toHaveAttribute("aria-pressed", "false");

  /* Only the filters that change a mode are offered in it: coverage is read
     from every record, so it has none. */
  await page.getByRole("tab", { name: "Coverage" }).click();
  await expect(filters.getByRole("group", { name: "Recorded by" })).toHaveCount(0);
  await expect(filters.getByText("only the date changes it")).toBeVisible();
  await filters.getByRole("button", { name: "Close filters" }).click();
  await expect(filters).toHaveCount(0);

  const density = page.getByRole("tab", { name: "Density" });
  await density.click();
  await expect(density).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Where recorded animals gather, drawn as terrain").first()).toBeVisible();
});


test("mobile public navigation exposes the core destinations without overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "phone navigation only");
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/", { waitUntil: "load" });
  /* One row on a phone: the wordmark, the way into the app and the menu.
     Exactly one of each: a hydration failure used to throw the page away
     and render it again, which briefly left two headers in the document. */
  await expect(page.locator("header.sp-header")).toHaveCount(1);
  await expect(page.locator(".sp-header-cta")).toHaveCount(1);
  await expect(page.locator(".sp-header .sp-header-cta")).toBeVisible();
  expect(errors).toEqual([]);
  await expect(page.locator(".sp-quick")).toHaveCount(0);
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  /* Five places and no menus: the rest of the site is in the footer's index. */
  const nav = page.locator(".sp-nav");
  await expect(nav.getByRole("link", { name: "Explore", exact: true })).toHaveAttribute("href", "/explore");
  await expect(nav.getByRole("link", { name: "About", exact: true })).toHaveAttribute("href", "/about");
  await expect(nav.getByRole("link", { name: "Education", exact: true })).toHaveAttribute("href", "/education");
  await expect(nav.getByRole("link", { name: "NGOs", exact: true })).toHaveAttribute("href", "/for-ngos");
  await expect(nav.getByRole("link", { name: "Municipalities", exact: true })).toHaveAttribute("href", "/for-governments");
  await expect(nav.getByRole("button")).toHaveCount(0);
  /* The invitation code stays in the bar itself, not behind the menu. */
  await expect(page.locator(".sp-header-actions").getByRole("link", { name: "I have a code" })).toHaveAttribute("href", "/join");
  await expect(page.locator(".sp-header-actions").getByRole("link", { name: "I have a code" })).toBeVisible();
  /* What left the header is one scroll away: the footer indexes it. */
  const index = page.getByRole("navigation", { name: "Site index" });
  await expect(index.getByRole("link", { name: "Report an animal" })).toHaveAttribute("href", "/report");
  await expect(index.getByRole("link", { name: "Map", exact: true })).toHaveAttribute("href", "/map");
  await expect(index.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

/* The hydration failure this guards was intermittent (about one cold load in
   seven, in production builds only), so one load proves little. Eight fresh
   contexts, first visit and returning visitor alternating, each must hydrate
   cleanly with exactly one header. */
test("cold loads hydrate cleanly with exactly one header", async ({ browser }, testInfo) => {
  for (let i = 0; i < 8; i++) {
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    if (i % 2) await context.addInitScript(() => { localStorage.setItem("straypaw.role", "resident"); localStorage.setItem("straypaw.notice.storage.v1", "1"); });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(400);
    await expect(page.locator("header.sp-header")).toHaveCount(1);
    expect(errors, `load ${i + 1}`).toEqual([]);
    await context.close();
  }
});

/* The dashboard's own map answers "where is it", the second question the
   console exists to answer. Stacked naively on a phone it landed 1,144px
   down the page, below the queue and the whole tasks block, which is a map
   nobody scrolls far enough to find. Geography comes before tasks. */
test("the dashboard map is drawn, and comes before tasks", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("straypaw.role", "ngo"));
  await page.goto("/partner");
  const map = page.locator(".pr-map");
  await expect(map).toBeVisible();
  expect((await map.boundingBox())?.height ?? 0).toBeGreaterThan(200);
  const geoBeforeTasks = await page.evaluate(() => {
    const geo = document.querySelector(".pr-geo"), tasks = document.querySelector(".pr-tasks");
    if (!geo || !tasks) return null;
    /* DOCUMENT_POSITION_FOLLOWING: tasks comes after geo. */
    return Boolean(geo.compareDocumentPosition(tasks) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(geoBeforeTasks).toBe(true);
});

/* The field map positions itself against the console shell. It used to do
   that with hardcoded pixel values — fixed at top:56px, bottom:0,
   left:240px — and on a phone that produced a page with no map on it at
   all: a fixed block whose map pane was auto-height, under a top bar that
   is 113px, over a tab bar that owns the bottom 60px. Measuring the drawn
   map against the shell states the requirement without naming a number. */
test("the field map fills the console area at every width", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("straypaw.role", "ngo"));
  await page.goto("/partner/map");
  await expect(page.locator(".sm-host")).toBeVisible();
  const box = await page.evaluate(() => {
    const pane = document.querySelector(".sm-host");
    const top = document.querySelector(".spa-top");
    const nav = document.querySelector(".spa-side");
    if (!pane || !top || !nav) return null;
    const p = pane.getBoundingClientRect(), t = top.getBoundingClientRect(), n = nav.getBoundingClientRect();
    return { paneTop: p.top, paneBottom: p.bottom, paneHeight: p.height, topBottom: t.bottom, navTop: n.top, navIsBar: n.width === window.innerWidth, viewport: window.innerHeight };
  });
  expect(box).not.toBeNull();
  /* A map with no height is the bug this guards. */
  expect(box!.paneHeight).toBeGreaterThan(200);
  /* It starts below the top bar rather than behind it. */
  expect(box!.paneTop).toBeGreaterThanOrEqual(box!.topBottom - 1);
  /* On a phone it stops at the tab bar instead of running underneath it. */
  if (box!.navIsBar) expect(box!.paneBottom).toBeLessThanOrEqual(box!.navTop + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

/* Three separate rules decided this, and on /partner/map and /partner/cases
   more than one of them said yes, so the phone tab bar showed two selected
   tabs at once. */
for (const route of ["/app", "/map", "/partner", "/partner/map", "/partner/animals", "/partner/cases", "/partner/reports"]) {
  test(`${route} marks exactly one navigation destination as current`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("straypaw.role", "ngo"));
    await page.goto(route);
    await expect(page.locator(".spa-side")).toBeVisible();
    const current = await page.evaluate(() => {
      const sel = window.innerWidth > 900 ? ".spa-primary-nav a" : ".spa-phone-links > a";
      return [...document.querySelectorAll(sel)].filter(a => a.getAttribute("aria-current") === "page").map(a => a.textContent?.trim() ?? "");
    });
    expect(current.length, `current destinations: ${current.join(", ")}`).toBe(1);
  });
}

for (const route of ["/", "/app", "/map", "/insights", "/partner", "/partner/animals", "/partner/medical", "/partner/incoming", "/partner/team", "/partner/reports"]) {
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
