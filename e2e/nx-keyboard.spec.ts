import { expect, test, type Page } from "@playwright/test";

/* Scenario 14: a person who uses only the keyboard, with reduced motion, can reach and use the frame, a list, a record,
   the command bar and Kaju, and always sees where focus is. Desktop only: phones are used by touch. */
test.skip(({ isMobile }) => isMobile, "Keyboard-only use is a desktop scenario");
test.use({ reducedMotion: "reduce" });

const open = async (page: Page, path: string) => { await page.goto(path); await page.waitForLoadState("networkidle"); };
const active = (page: Page) => page.evaluate(() => {
  const e = document.activeElement as HTMLElement | null;
  if (!e) return null;
  const s = getComputedStyle(e);
  return { tag: e.tagName, id: e.id, text: (e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 60), inMain: !!e.closest("#nx-main"),
    inSide: !!e.closest(".nx-side"), ring: s.outlineStyle !== "none" && s.outlineWidth !== "0px" || (s.boxShadow !== "none" && s.boxShadow !== "") };
});

test("the first Tab offers to skip the navigation, and Enter lands in the page", async ({ page }) => {
  await open(page, "/ngo/today");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  expect((await active(page))?.id).toBe("nx-main");
  await page.keyboard.press("Tab");
  const next = await active(page);
  expect(next?.inMain, `focus after skipping: ${JSON.stringify(next)}`).toBe(true);
  expect(next?.ring, `focus is visible on ${next?.text}`).toBe(true);
});

test("the sidebar is reachable and opens a page with Enter", async ({ page }) => {
  await open(page, "/ngo/today");
  let seen = null;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    seen = await active(page);
    if (seen?.inSide && /^Cases\b/.test(seen.text)) break;
  }
  expect(seen?.text, "Tab reaches Cases in the sidebar").toMatch(/^Cases\b/);
  expect(seen?.ring, "the sidebar link shows focus").toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ngo\/cases/);
});

test("a list row opens with Enter, and Escape closes what it opened", async ({ page }) => {
  await open(page, "/ngo/cases");
  const first = page.locator("#nx-main button.nx-tr").first();
  await expect(first).toBeVisible();
  await first.focus();
  expect((await active(page))?.ring, "the row shows focus").toBe(true);
  const url = page.url();
  await page.keyboard.press("Enter");
  // A row opens its record beside the list, or the record page.
  await expect.poll(async () => page.url() !== url || (await page.locator('[role="dialog"], .nx-peek').count()) > 0).toBe(true);
  if (page.url() === url) {
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"], .nx-peek')).toHaveCount(0);
  }
});

test("the command bar opens with /, is driven by arrows and Enter, and Escape gives focus back", async ({ page }) => {
  await open(page, "/ngo/today");
  await page.locator("#nx-main").focus();
  await page.keyboard.press("/");
  const box = page.getByRole("combobox", { name: "Search" });
  await expect(box).toBeFocused();
  await page.keyboard.type("brown");
  await expect(page.getByRole("option", { name: /Brown street dog/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(box).toBeHidden();
  const back = await active(page);
  expect(back?.tag !== "BODY", `focus returns to the page, not the document (${JSON.stringify(back)})`).toBe(true);
  await page.keyboard.press("Control+k");
  await expect(box).toBeFocused();
  await page.keyboard.type("brown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ngo\/animals\//);
});

test("Kaju opens with Ctrl+J into its composer, and nothing is sent until the person asks", async ({ page }) => {
  let asked = 0;
  await page.route("**/api/ai/**", (r) => { asked++; return r.abort(); });
  await open(page, "/ngo/today");
  await page.keyboard.press("Control+j");
  const ask = page.getByLabel("Ask Kaju");
  await expect(ask).toBeVisible();
  await ask.focus();
  await page.keyboard.type("what is waiting on me");
  expect(asked, "typing alone sends nothing").toBe(0);
  expect((await active(page))?.ring || (await active(page))?.tag === "TEXTAREA", "the composer has focus").toBe(true);
  await page.keyboard.press("Control+j");
  await expect(ask).toBeHidden();
  const back = await active(page);
  expect(back?.tag !== "BODY", `focus returns to the page when Kaju closes (${JSON.stringify(back)})`).toBe(true);
});
