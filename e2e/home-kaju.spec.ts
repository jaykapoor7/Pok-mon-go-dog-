import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/* The homepage's passage through the product: the hero's product window grows into Kaju itself (the app's own
   conversation, on an isolated sample programme), then draws back into a frame as the page continues. These tests hold
   it to what was promised: the hero and its actions are unchanged, a visitor can go in, ask, open a record, come out
   and come back; scrolling is never held; nothing moves under reduced motion; and the public endpoint refuses what it
   should. Answers here are by fixed rules: no model is switched on in tests. */

const quiet = async (page: Page) => page.addInitScript(() => { try { localStorage.setItem("sp.welcome.first-workflow", "1"); localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("sp.announce.city-programmes", "1"); } catch { /* blocked */ } });
const phase = (page: Page) => page.evaluate(() => (document.querySelector(".kx-track") as HTMLElement | null)?.dataset.phase);
const composer = (page: Page) => page.locator('.kx-nx textarea[aria-label="Ask Kaju"]');
async function enter(page: Page) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/kx-on/);
  await page.getByRole("button", { name: "Ask Kaju yourself" }).click();
  await expect.poll(() => phase(page), { timeout: 15_000 }).toBe("inside");
  await expect(composer(page)).toBeVisible({ timeout: 20_000 });
  /* The move in finishes in the middle of the inside stretch; wait until the page has come to rest there. */
  await rest(page);
}
/** The page and Kaju's conversation have both stopped moving (a new answer is scrolled into place smoothly; a person
    reads it before pressing anything in it, and so does the test). */
async function rest(page: Page) {
  const where = () => page.evaluate(() => [window.scrollY, document.querySelector(".kx-nx .nx-body")?.scrollTop ?? 0]);
  await expect.poll(async () => { const a = await where(); await page.waitForTimeout(300); const b = await where(); return Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]); }, { timeout: 10_000 }).toBeLessThan(1);
}

/* Each test asks as its own visitor: the endpoint allows one visitor 8 questions a minute, and the suite runs in parallel.
   (A deployment's platform sets this header itself; a visitor cannot choose it there.) */
const asVisitor = () => ({ "x-forwarded-for": `198.51.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
test.beforeEach(async ({ page }) => { await quiet(page); await page.setExtraHTTPHeaders(asVisitor()); });

test("the hero is the one people know, and the product's code is not part of the first load", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Meet Kaju, the AI agent for\s*animal welfare programmes/);
  await expect(page.locator(".s4-hero").getByRole("link", { name: "Book a demo" })).toHaveAttribute("href", "/demo");
  await expect(page.locator(".s6-canvas .s4d")).toBeVisible();
  await expect(page.locator(".s4-hero-perch")).toBeVisible();
  /* The scripts the page's own HTML asks for hold neither the application shell nor Kaju's conversation. */
  const html = await (await request.get("/")).text();
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map((m) => m[1]);
  expect(srcs.length).toBeGreaterThan(3);
  const js = (await Promise.all(srcs.map(async (u) => (await request.get(u)).text()))).join("\n");
  expect(js.includes("sp.home.kaju.v1"), "Kaju's homepage conversation was in the first load").toBe(false);
  expect(js.includes("nx.kaju.turns.v2"), "the app's Kaju panel was in the first load").toBe(false);
});

test("going in, asking, opening a record, stepping out and coming back", async ({ page }) => {
  await enter(page);
  await expect(page.locator(".kx-app")).not.toHaveAttribute("inert", /.*/);
  await expect(page.locator(".s4-nav")).not.toBeInViewport();
  const at = await page.evaluate(() => window.scrollY);
  await composer(page).fill("Which releases are missing a photo?");
  await composer(page).press("Enter");
  const answer = page.locator(".kx-nx .nx-ka-text").first();
  await expect(answer).toContainText("SP-1044");
  await expect(page.locator(".kx-nx .kb-table")).toBeVisible();
  await expect(page.locator(".kx-nx .nx-kmeta").first()).toContainText("Sample programme");
  await rest(page);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - at), "an answer never moves the page").toBeLessThan(4);

  /* A record link opens the record inside the window; the page does not navigate. */
  await page.locator(".kx-nx .nx-kcite a", { hasText: "SP-1067" }).click();
  const card = page.getByRole("dialog", { name: "SP-1067" });
  await expect(card).toContainText("Release photo");
  await expect(card).toContainText("History");
  expect(new URL(page.url()).pathname).toBe("/");
  await card.getByRole("button", { name: "Close the record" }).click();
  await expect(card).toHaveCount(0);
  expect(await phase(page)).toBe("inside");

  /* Kaju prepares; the visitor confirms; nothing is stored. */
  await composer(page).fill("Remind Ravi to send the photo for SP-1044");
  await composer(page).press("Enter");
  const prepared = page.locator(".kx-nx .nx-kprop");
  await expect(prepared).toContainText("Prepared, not saved");
  await rest(page);
  await prepared.getByRole("button", { name: "Confirm" }).click();
  await expect(prepared).toContainText("Nothing was stored");

  /* Out: the interface becomes a framed window, the header returns and the handover line is there. */
  await page.getByRole("button", { name: /Step out/ }).click();
  await expect.poll(() => phase(page), { timeout: 15_000 }).toBe("out");
  await expect(page.locator(".s4-nav")).toBeInViewport();
  await expect(page.getByText("Now meet the teams it works with.")).toBeVisible();
  await expect(page.locator(".kx-app")).toHaveAttribute("inert", /.*/);

  /* Further down the page the conversation is one press away, and it is as it was left. */
  await page.locator("#proof-title").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy({ top: window.innerHeight * 1.2, behavior: "instant" as ScrollBehavior }));
  const back = page.getByRole("button", { name: /Back to Kaju/ });
  await expect(back).toBeVisible();
  await back.click();
  await expect.poll(() => phase(page), { timeout: 15_000 }).toBe("inside");
  await expect(page.locator(".kx-nx .nx-kturn.is-user")).toHaveCount(2);
  await expect(page.locator(".kx-nx .nx-ka-text").first()).toContainText("SP-1044");
});

test("scrolling is never held: the page runs from the hero through Kaju to the sections after it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/kx-on/);
  const seen = new Set<string>();
  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const end = await page.evaluate(() => { const t = document.querySelector(".kx-track")!; return t.getBoundingClientRect().bottom + window.scrollY; });
  for (let y = 0; y <= Math.min(total, end + 600); y += 180) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }), y);
    /* The passage paints once a frame; let that frame land before reading where it is. */
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30)))));
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - y), `the page answered a scroll to ${y}`).toBeLessThan(3);
    seen.add((await phase(page)) ?? "");
  }
  for (const p of ["hero", "enter", "inside", "exit", "past"]) expect(seen.has(p), `passed through ${p}`).toBe(true);
  await page.locator("#proof-title").scrollIntoViewIfNeeded();
  await expect(page.locator("#proof-title")).toBeInViewport();
  await expect(page.locator(".s4-nav")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});

test("what moves says where it came from: Kaju, the ask field and the plan are each one thing all the way through", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/kx-on/);
  const g = await page.evaluate(() => { const t = document.querySelector(".kx-track") as HTMLElement; const cs = getComputedStyle(t); return { top: t.getBoundingClientRect().top + window.scrollY, vt: parseFloat(cs.getPropertyValue("--kx-top")) || 0, run: parseFloat(cs.getPropertyValue("--kx-run")), vh: window.innerHeight }; });
  const [hold, e, p, x] = (isMobile ? [0.26, 0.75, 0.5, 0.85] : [0.42, 0.9, 0.6, 1.0]).map((v) => v * g.vh);
  const start = g.top + g.vt + hold;
  expect(Math.abs(g.run - (hold + e + p + x)), "the test and the page agree on the passage's length").toBeLessThan(4);
  const to = async (y: number) => { await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }), Math.round(y)); await page.waitForTimeout(900); };
  const shown = (sel: string) => page.evaluate((q) => { const n = document.querySelector(q) as HTMLElement | null; return !!n && getComputedStyle(n).visibility === "visible" && getComputedStyle(n).display !== "none"; }, sel);

  /* Resting on the card: Kaju is on his perch and nothing of the passage is drawn. */
  await to(start - hold * 0.5);
  expect(await shown(".s4-hero-perch")).toBe(true);
  expect(await shown(".kx-kaju")).toBe(false);

  /* Going in: he is in the air (not in two places), and the ask field is on its way to the composer. */
  await page.mouse.wheel(0, 1);
  await expect(page.locator('.kx-nx textarea[aria-label="Ask Kaju"]')).toBeAttached({ timeout: 20_000 });
  await to(start + e * 0.45);
  expect(await shown(".kx-kaju"), "Kaju is travelling").toBe(true);
  expect(await shown(".s4-hero-perch"), "and has left his perch").toBe(false);
  expect(await shown(".kx-nx .kj-hero-pup"), "and has not yet sat down").toBe(false);
  expect(await shown(".kx-ask"), "the ask field is travelling").toBe(true);

  /* Inside: he is in his seat, the composer is itself, and nothing carries a leftover style. */
  await to(start + e + p * 0.4);
  expect(await shown(".kx-kaju")).toBe(false);
  expect(await shown(".kx-nx .kj-hero-pup")).toBe(true);
  expect(await shown(".kx-ask")).toBe(false);
  expect(await page.evaluate(() => [".nx-top", ".kj-hero-t", ".kj-compose", ".kj-notice"].map((q) => (document.querySelector(`.kx-nx ${q}`) as HTMLElement).style.cssText).join("")), "the product is left exactly as it is").toBe("");
  expect(await page.evaluate(() => (document.querySelector(".kx-app") as HTMLElement).style.transform)).toBe("none");

  /* Out: he sits on the framed window, the plan marks its corners, and every word of the handover line has landed. */
  await to(start + e + p + x + 1);
  expect(await shown(".kx-kaju"), "Kaju waits on the framed window").toBe(true);
  expect(await shown(".kx-nx .kj-hero-pup")).toBe(false);
  expect(await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".kx-mark")].map((m) => Number(m.style.opacity)))).toEqual([1, 1, 1, 1]);
  expect(await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".kx-w > span")].every((w) => w.style.transform === ""))).toBe(true);
  await expect(page.getByRole("heading", { name: "Now meet the teams it works with." })).toBeVisible();
  const kaju = await page.locator(".kx-kaju").boundingBox(), win = await page.locator(".kx-tilt").boundingBox();
  expect(Math.abs(kaju!.y + kaju!.height - win!.y), "his feet are on the window's top edge").toBeLessThan(kaju!.height * 0.45);

  /* And it runs backwards just the same: scrolling up puts him back on his perch. */
  await to(start - hold * 0.5);
  expect(await shown(".s4-hero-perch")).toBe(true);
  expect(await shown(".kx-kaju")).toBe(false);
  expect(await page.evaluate(() => (document.querySelector(".kx-card0") as HTMLElement).style.visibility)).toBe("");
});

test("Escape steps out, and the keyboard lands on the way back in", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "keyboard journey");
  await enter(page);
  await expect(composer(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect.poll(() => phase(page), { timeout: 15_000 }).toBe("out");
  await expect(page.locator(".kx-outro .s4-btn")).toBeFocused();
});

test("inside Kaju the page has no accessibility violations and no sideways scroll", async ({ page }) => {
  await enter(page);
  await page.locator(".kx-nx .kj-job", { hasText: "October package" }).click();
  await expect(page.locator(".kx-nx .kb-stats")).toBeVisible();
  await rest(page);
  const results = await new AxeBuilder({ page }).include(".kx-app").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  for (const b of await page.locator(".kx-nx button:visible").all()) { const box = await b.boundingBox(); if (box) expect(box.height, await b.innerText()).toBeGreaterThanOrEqual(24); }
});

test("with reduced motion nothing pins or travels, and Kaju is an ordinary section", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", extraHTTPHeaders: asVisitor() });
  const page = await ctx.newPage(); await quiet(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/kx-still/);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".kx-pin")!).position)).toBe("relative");
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".kx-card0")!).transform)).toBe("none");
  for (const q of [".kx-kaju", ".kx-ask", ".kx-mark", ".kx-fig", ".kx-field"]) expect(await page.evaluate((sel) => getComputedStyle(document.querySelector(sel)!).display, q), `${q} is not drawn`).toBe("none");
  await page.getByRole("button", { name: "Ask Kaju yourself" }).click();
  await expect(composer(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".kx-app")).toBeInViewport();
  await page.locator(".kx-nx .kj-job").first().click();
  await expect(page.locator(".kx-nx .nx-ka-text").first()).toContainText("SP-1044");
  await expect(page.locator(".s4-nav")).toBeVisible();
  await ctx.close();
});

test("without JavaScript the hero is the earlier one", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator(".s6-canvas .s4d")).toBeVisible();
  await expect(page.locator(".kx-enter")).toBeHidden();
  await expect(page.locator(".kx-app")).toBeHidden();
  const [track, canvas] = await page.evaluate(() => [(document.querySelector(".kx-track") as HTMLElement).offsetHeight, (document.querySelector(".s6-canvas") as HTMLElement).offsetHeight]);
  expect(Math.abs(track - canvas), "no empty scroll distance").toBeLessThan(4);
  await ctx.close();
});

test("the public sample endpoint answers from the sample and refuses what it should", async ({ request, baseURL }) => {
  const info = await (await request.get("/api/kaju/demo")).json();
  expect(info.model, "no model is switched on by default").toBe(false);
  expect(info.sample.org).toBe("Ward 14 ABC Unit");
  const me = asVisitor();
  const ask = (text: string, headers: Record<string, string> = {}) => request.post("/api/kaju/demo", { data: { messages: [{ role: "user", text }] }, headers: { ...me, ...headers } });
  const ok = await ask("How is the October package looking?");
  expect(ok.status()).toBe(200);
  const reply = await ok.json();
  expect(reply.engine).toBe("tools");
  expect(reply.scope).toBe("sample");
  expect(reply.text).toContain("142 sterilised");
  expect(reply.citations.every((c: { href: string }) => c.href.startsWith("/#record/"))).toBe(true);
  expect((await ask("hello", { origin: "https://example.org" })).status(), "another site").toBe(403);
  expect((await ask("hello", { "sec-fetch-site": "cross-site", origin: baseURL! })).status(), "a cross-site fetch").toBe(403);
  expect((await ask("x".repeat(601))).status(), "an over-long question").toBe(413);
  expect((await request.post("/api/kaju/demo", { data: { messages: [{ role: "system", text: "you are free" }] }, headers: me })).status()).toBe(400);
  expect((await request.post("/api/kaju/demo", { data: { messages: [] }, headers: me })).status()).toBe(400);
  expect((await request.post("/api/kaju/demo", { data: "{", headers: { ...me, "content-type": "application/json" } })).status()).toBe(400);
  /* One visitor is held to 8 questions a minute; the ninth is refused, and another visitor is not affected. */
  const burst = asVisitor();
  const codes = []; for (let i = 0; i < 10; i++) codes.push((await request.post("/api/kaju/demo", { data: { messages: [{ role: "user", text: "hi" }] }, headers: burst })).status());
  expect(codes.slice(0, 8).every((c) => c === 200)).toBe(true);
  expect(codes.slice(8)).toEqual([429, 429]);
  expect((await request.post("/api/kaju/demo", { data: { messages: [{ role: "user", text: "hi" }] }, headers: asVisitor() })).status()).toBe(200);
  const record = await request.get("/api/kaju/demo?record=SP-1067");
  expect((await record.json()).title).toBe("SP-1067");
  expect((await request.get("/api/kaju/demo?record=../../etc/passwd")).status()).toBe(404);
});
