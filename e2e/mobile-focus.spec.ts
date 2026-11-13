import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("straypaw.notice.storage.v1", "1"));
});

/** Scroll a pinned section to a fraction of its scroll track, the way a reader would. */
async function scrollThrough(page: Page, selector: string, f: number) {
  await page.evaluate(([sel, frac]) => {
    const el = document.querySelector(sel as string)!;
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: r.top + scrollY + (r.height - innerHeight) * (frac as number), behavior: "instant" });
  }, [selector, f] as const);
  await page.waitForTimeout(250);
}

test("landing closes with one primary action, one demo link in the page, and the site index", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main .s4-close")).toHaveCount(1);
  await expect(page.locator("main .s4-close .is-primary")).toHaveCount(1);
  await expect(page.locator("main .s4-close .is-primary")).toHaveText("Explore the platform");
  await expect(page.locator("main a").filter({ hasText: /^Book a demo$/ })).toHaveCount(1);
  const end = page.getByRole("contentinfo");
  for (const col of ["Product", "Solutions", "Resources", "Company"]) await expect(end.getByRole("heading", { name: col, exact: true })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("the hero demo is labelled, plays its story with the phone, and can be paused", async ({ page }) => {
  await page.goto("/");
  const demo = page.getByRole("group", { name: /Product demo: a coordinator's day in StrayPaw/ });
  await expect(demo).toBeVisible();
  await expect(demo).toContainText("Product demo · illustrative records");
  await expect(demo).toContainText("WhatsApp not connected");
  await expect(demo).toContainText("Here is your daily brief.");
  /* the story moves on by itself, and the phone thread grows with it */
  await expect(demo).toContainText("Weekly evidence check", { timeout: 15_000 });
  await expect(demo).toContainText("Three of eighteen");
  /* Pause holds the scene; a step can be chosen directly */
  await demo.getByRole("button", { name: "Pause the demo" }).click();
  await demo.getByRole("button", { name: "Show: Report package" }).click();
  await expect(demo).toContainText("Ward 14 ABC drive · October 2026");
  await page.waitForTimeout(6000);
  await expect(demo).toContainText("Ward 14 ABC drive · October 2026");
});

test("the AI jobs advance by themselves and stop when one is chosen", async ({ page }) => {
  await page.goto("/");
  const band = page.locator(".s7-rec");
  await band.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const jobs = band.locator(".s7-rec-list button");
  await expect(jobs.first()).toHaveAttribute("aria-pressed", "true");
  await expect(jobs.nth(1)).toHaveAttribute("aria-pressed", "true", { timeout: 12_000 });
  await jobs.nth(3).click();
  await expect(jobs.nth(3)).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(7000);
  await expect(jobs.nth(3)).toHaveAttribute("aria-pressed", "true");
});

test("only a verified dual-role member gets a workspace switcher", async ({ page }) => {
  for (const path of ["/community", "/ngo"]) {
    await page.goto(path);
    await expect(page.locator(".sx3-ws-btn:visible, .sp-ws-btn:visible")).toHaveCount(0);
  }
});

test("phone menu: grouped places, one demo action, one sign in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const sheet = page.locator("#s4-sheet");
  await expect(sheet.getByRole("link", { name: "Book a demo" })).toHaveCount(1);
  await expect(sheet.getByRole("link", { name: "Sign in" })).toHaveCount(1);
  await expect(sheet.locator("details > summary")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu", exact: true })).toHaveAttribute("aria-expanded", "false");
});

test("signed-out NGO page shows what the workspace includes at every width", async ({ page }) => {
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ngo");
    const items = page.locator(".ngo-door-inc li");
    await expect(items).toHaveCount(3);
    for (const p of await page.locator(".ngo-door-inc p").all()) {
      await expect(p).toBeVisible();
      expect(await p.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(150);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("desktop sidebar is a tree of the work, each place once, with tabs above the page", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop sidebar");
  await page.goto("/ngo"); const side = page.getByRole("complementary", { name: "Workspace" });
  await expect(side.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
  /* The whole line of work is one page, Cases; its board, queue, intake and sign-off are views folded under it, not more rows. */
  for (const place of ["Cases", "Animals"]) await expect(side.getByRole("link", { name: place, exact: true })).toHaveCount(1);
  for (const gone of ["Work queue", "Intake", "Treatment & release", "Pipeline", "Map"]) await expect(side.getByRole("link", { name: gone, exact: true })).toHaveCount(0);
  /* Search and Kaju are buttons at the top of the sidebar; the place switcher sits above them. */
  await expect(side.getByRole("button", { name: /Places and account/ })).toBeVisible();
  await expect(side.getByRole("button", { name: /^Kaju/ })).toBeVisible();
  await expect(side.getByRole("link", { name: "Kaju", exact: true })).toHaveCount(0);
  /* The sidebar runs the full height and the page starts where it ends. */
  const [sb, main, vh] = await Promise.all([side.boundingBox(), page.locator("#sp-main").boundingBox(), page.evaluate(() => window.innerHeight)]);
  expect(sb!.y).toBe(0); expect(Math.round(sb!.height)).toBe(vh);
  expect(Math.abs(main!.x - (sb!.x + sb!.width))).toBeLessThanOrEqual(1);
  /* Every page opened is a tab; going somewhere else keeps the first one open. */
  const tabs = page.getByRole("navigation", { name: "Open pages" });
  await side.getByRole("link", { name: "Cases", exact: true }).click();
  await expect(page).toHaveURL(/\/ngo\/pipeline$/);
  await expect(tabs.getByRole("link", { name: "Cases" })).toHaveAttribute("aria-current", "page");
  await expect(tabs.getByRole("link", { name: "Home" })).toHaveCount(1);
  /* Opening a folded page shows its views in the tree. */
  await side.getByRole("button", { name: "Unfold Cases" }).click();
  await expect(side.getByRole("link", { name: "Queue", exact: true })).toBeVisible();
  /* One Quick actions button; it opens search. */
  await side.getByRole("button", { name: /^Quick actions/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
});
test("the phone menu opens the same tree and closes without losing the page", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone menu");
  await page.goto("/ngo"); const side = page.getByRole("complementary", { name: "Workspace" });
  await expect(side).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Open the menu", exact: true }).click();
  await expect(side.getByRole("link", { name: "Cases", exact: true })).toBeVisible();
  await expect(side.getByRole("link", { name: "Team", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(side).toHaveAttribute("inert", "");
  await expect(page).toHaveURL(/\/ngo$/);
});
test("workshops run one activity at a time and pair attributed originals", async ({ page }) => {
  await page.goto("/learn/workshops");
  const track = page.getByRole("list", { name: /where the group is/ });
  await expect(track.getByRole("button")).toHaveCount(6);
  await expect(page.locator(".lrn-act-k")).toContainText("Activity 1 of 5");
  await page.getByRole("button", { name: "Next activity", exact: true }).click();
  await expect(page.locator(".lrn-act-k")).toContainText("Activity 2 of 5");
  await expect(page.locator("#lrn-act-t")).toContainText("A calm encounter");
  await expect(track.locator('button[aria-current="step"]')).toHaveCount(1);
  await page.getByRole("group", { name: "Sessions" }).getByRole("button", { name: /Reading a map/ }).click();
  await expect(page.locator(".lrn-act-k")).toContainText("Activity 1 of 6");
  await expect(page.locator(".lrn-doc")).toHaveCount(1);
  await expect(page.locator(".lrn-doc a")).toHaveAttribute("href", /drive.google.com\/file\/d\//);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("the Academy features every Kind Hour original with a preview", async ({ page }) => {
  await page.goto("/learn");
  const docs = page.locator("#kind-hour .lrn-doc");
  await expect(docs).toHaveCount(5);
  await expect(page.locator("#kind-hour .lrn-fine")).toContainText("created by and belong to The Kind Hour Foundation");
  await expect(page.locator("#kind-hour .lrn-warn")).toHaveCount(1);
  await docs.first().getByRole("button", { name: /^Preview/ }).click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveAttribute("src", /drive.google.com\/file\/d\/.+\/preview/);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("practice gives feedback; there are no printable cards", async ({ page }) => {
  await page.goto("/learn/resources");
  await expect(page.getByText("Cards to print", { exact: true })).toHaveCount(0);
  await page.getByLabel("Where", { exact: true }).fill("Bus stop opposite the market on MG Road");
  await page.getByLabel("What you saw", { exact: true }).fill("A brown dog limping on its left back leg at 6 pm");
  await page.getByRole("button", { name: "Not safely", exact: true }).click();
  await page.getByRole("button", { name: "Check my practice report", exact: true }).click();
  await expect(page.getByText(/Practice complete/)).toBeVisible();
});

test("the sidebar tucks away, comes back on the key, and has no More list", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop sidebar");
  await page.goto("/ngo"); const side = page.getByRole("complementary", { name: "Workspace" });
  await expect(side.getByText("More", { exact: true })).toHaveCount(0);
  await expect(side.locator("details")).toHaveCount(0);
  await expect(async () => { await side.getByRole("button", { name: "Tuck the sidebar away" }).click({ timeout: 1000 }); await expect(page.locator(".sp.ws")).toHaveClass(/is-tucked/, { timeout: 1000 }); }).toPass({ timeout: 15_000 });
  await page.mouse.move(900, 500);
  await expect(side).toHaveAttribute("inert", "");
  /* The same key brings it back, and its links work. */
  await page.keyboard.press("Control+Backslash");
  await expect(page.locator(".sp.ws")).not.toHaveClass(/is-tucked/);
  await expect(side.getByRole("link", { name: "Home", exact: true })).toBeVisible();
});

test("Cases is one board, and the queue, intake and sign-off are its views", async ({ page, isMobile }) => {
  await page.goto("/ngo/pipeline");
  /* Signed out, the board is the same door as every NGO page: it reads nothing private. */
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cases");
  await expect(page.getByRole("link", { name: /Sign in with your code|Join with a code/ })).toBeVisible();
  const views = page.getByRole("navigation", { name: "Views of Cases" });
  for (const v of ["Board", "Queue", "Intake", "Sign-off"]) await expect(views.getByRole("link", { name: v, exact: true })).toHaveCount(1);
  await expect(views.getByRole("link", { name: "Board", exact: true })).toHaveAttribute("aria-current", "page");
  /* Decisions are a coordinator's view: a visitor is not offered it. */
  await expect(views.getByRole("link", { name: "Decisions", exact: true })).toHaveCount(0);
  await views.getByRole("link", { name: "Intake", exact: true }).click();
  await expect(page).toHaveURL(/\/ngo\/inbox$/);
  await expect(page.getByRole("navigation", { name: "Views of Cases" }).getByRole("link", { name: "Intake", exact: true })).toHaveAttribute("aria-current", "page");
  if (!isMobile) await expect(page.getByRole("complementary", { name: "Workspace" }).getByRole("link", { name: "Cases", exact: true })).toHaveAttribute("aria-current", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("Quick actions is an organised index of the workspace", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop sidebar");
  await page.goto("/ngo"); const side = page.getByRole("complementary", { name: "Workspace" });
  await expect(async () => { await side.getByRole("button", { name: /^Quick actions/ }).click({ timeout: 1000 }); await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible({ timeout: 1000 }); }).toPass({ timeout: 15_000 });
  const index = page.getByRole("dialog", { name: "Search" });
  await expect(index.locator(".sp-finder-group").first()).toBeVisible();
  await expect(index.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Escape"); await expect(index).toBeHidden();
});
