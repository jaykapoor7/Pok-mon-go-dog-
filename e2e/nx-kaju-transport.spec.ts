import { expect, test, type Page } from "@playwright/test";

/* Kaju's conversation when the answer does not arrive as it should: an incomplete or unsafe reply, a person who stops
   waiting, a request that times out, an expired session, and a change of workspace. In every case nothing is
   confirmed, a late answer never appears, and the person can try again. The answers are fixtures; no model runs. */

const reply = (text: string, scope = "guest") => ({ text, scope, engine: "tools", tools: [], citations: [], proposals: [] });
const box = (page: Page) => page.getByRole("textbox", { name: "Ask Kaju" });
const send = async (page: Page, text: string) => { await box(page).fill(text); await box(page).press("Enter"); };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { for (const k of ["straypaw.notice.storage.v1", "straypaw.analytics.optout", "sp.firstday.v1", "sp.onboard.done"]) localStorage.setItem(k, "1"); sessionStorage.clear(); } catch {} });
});

test("an incomplete reply shows Try again and leaves the composer usable", async ({ page }) => {
  await page.route("**/api/ai", (r) => r.request().method() === "GET" ? r.fulfill({ json: { scope: "guest", tools: true, model: false } }) : r.fulfill({ json: { text: "broken", engine: "model", tools: null } }));
  await page.goto("/kaju");
  await send(page, "What is waiting for the team?");
  await expect(page.getByRole("alert").filter({ hasText: "incomplete response" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  await expect(box(page)).toBeEnabled();
});

test("an unsafe link in a reply is refused, not shown", async ({ page }) => {
  await page.route("**/api/ai", (r) => r.fulfill({ json: r.request().method() === "GET" ? { scope: "guest", tools: true, model: false } : { ...reply("Unsafe fixture"), citations: [{ id: "x", label: "Unsafe", href: "javascript:alert(1)", kind: "page" }] } }));
  await page.goto("/kaju");
  await send(page, "What does the register say?");
  await expect(page.getByText("Kaju returned an incomplete response. No action was confirmed. Try again.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Unsafe", exact: true })).toHaveCount(0);
});

test("stopping and clearing drop a late answer", async ({ page }) => {
  let release: () => void = () => {}; let received: () => void = () => {};
  const started = new Promise<void>((r) => (received = r)); const held = new Promise<void>((r) => (release = r));
  await page.route("**/api/ai", async (r) => { if (r.request().method() === "GET") return r.fulfill({ json: { scope: "guest", tools: true, model: false } }); received(); await held; await r.fulfill({ json: reply("LATE TRANSPORT TEXT") }).catch(() => {}); });
  await page.goto("/kaju");
  await send(page, "What is open today?");
  await started;
  await page.getByRole("button", { name: "Stop waiting" }).click();
  await expect(page.getByText("Stopped waiting. No prepared action was confirmed.")).toBeVisible();
  await page.getByRole("button", { name: /New conversation/ }).click();
  release();
  await expect(page.getByText("LATE TRANSPORT TEXT")).toHaveCount(0);
  await expect(box(page)).toBeEnabled();
});

test("a request that times out can be retried and its late answer never appears", async ({ page }) => {
  let release: () => void = () => {}; let started: () => void = () => {};
  const received = new Promise<void>((r) => (started = r)); const held = new Promise<void>((r) => (release = r));
  await page.route("**/api/ai", async (r) => { if (r.request().method() === "GET") return r.fulfill({ json: { scope: "guest", tools: true, model: false } }); started(); await held; await r.fulfill({ json: reply("LATE TIMEOUT TEXT") }).catch(() => {}); });
  await page.clock.install();
  await page.goto("/kaju");
  await send(page, "What is overdue?");
  await received;
  await page.clock.fastForward(56_000);
  await expect(page.getByRole("alert").filter({ hasText: /timed out/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  release();
  await expect(page.getByText("LATE TIMEOUT TEXT")).toHaveCount(0);
});

test("an expired session hides the conversation and offers sign-in", async ({ page }) => {
  let expired = false;
  await page.route("**/api/ai", (r) => { if (r.request().method() === "GET") return r.fulfill({ status: expired ? 401 : 200, json: expired ? { error: "Session expired" } : { scope: "guest", tools: true, model: false } }); expired = true; return r.fulfill({ status: 401, json: { error: "Session expired" } }); });
  await page.goto("/kaju");
  await send(page, "What is waiting?");
  await expect(page.getByRole("alert").filter({ hasText: "session has expired" })).toBeVisible();
  await expect(page.getByRole("alert").getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", /\/sign-in\?next=/);
  await expect(page.getByText("What is waiting?")).toHaveCount(0);
  await expect(box(page)).toBeDisabled();
});

test("a change of workspace hides the earlier conversation", async ({ page }) => {
  let scope = "isolated-scope-one";
  await page.route("**/api/ai", (r) => r.fulfill({ json: r.request().method() === "GET" ? { scope, tools: true, model: false } : reply("FIRST WORKSPACE PRIVATE TEST TEXT", scope) }));
  await page.goto("/kaju");
  await send(page, "Read this workspace");
  await expect(page.getByText("FIRST WORKSPACE PRIVATE TEST TEXT")).toBeVisible();
  scope = "isolated-scope-two";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("FIRST WORKSPACE PRIVATE TEST TEXT")).toHaveCount(0);
});

test("the compact panel and the full page share one conversation", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "the compact panel opens from the desktop top bar");
  await page.route("**/api/ai", (r) => r.fulfill({ json: r.request().method() === "GET" ? { scope: "guest", tools: true, model: false } : reply("SHARED THREAD TEXT") }));
  await page.goto("/ngo/today");
  await page.getByRole("button", { name: /^Kaju/ }).first().click();
  const dock = page.getByRole("dialog", { name: "Kaju" });
  await expect(dock).toBeVisible();
  await dock.getByRole("textbox", { name: "Ask Kaju" }).fill("What is open?");
  await dock.getByRole("textbox", { name: "Ask Kaju" }).press("Enter");
  await expect(dock.getByText("SHARED THREAD TEXT")).toBeVisible();
  await dock.getByRole("button", { name: "Open full Kaju" }).click();
  await expect(page).toHaveURL(/\/kaju$/);
  await expect(page.getByText("SHARED THREAD TEXT")).toHaveCount(1);
  await expect(page.getByRole("dialog", { name: "Kaju" })).toHaveCount(0);
});
