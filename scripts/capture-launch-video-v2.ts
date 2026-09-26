import { chromium, type Locator, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const ROOT = process.cwd();
const OUT = resolve(ROOT, "launch-video-v2");
const STILLS = resolve(OUT, "stills");
const PUBLIC_URL = (process.env.PUBLIC_BASE_URL || "https://www.straypaw.org").replace(/\/$/, "");
let localApp: ChildProcess | undefined;

const wait = (page: Page, ms = 1200) => page.waitForTimeout(ms);

async function startLocalDemo() {
  const existing = process.env.DEMO_BASE_URL?.trim();
  if (existing) return existing.replace(/\/$/, "");
  const port = Number(process.env.DEMO_PORT || 3101);
  const url = "http://127.0.0.1:" + port;
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  localApp = spawn(npm, ["run", "dev", "--", "--hostname", "127.0.0.1", "-p", String(port)], {
    env: { ...process.env, NEXT_PUBLIC_DEMO_RECORDING: "true" },
    stdio: "inherit",
  });
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(url + "/partner");
      if (res.ok) return url;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Local recording demo did not start.");
}

async function clean(page: Page) {
  await page.keyboard.press("Escape").catch(() => {});
  const controls = page
    .getByRole("button", { name: /got it|dismiss|skip for now|close|not now|maybe later/i })
    .or(page.getByRole("link", { name: /got it|dismiss|skip for now|close|not now|maybe later/i }));
  const n = Math.min(await controls.count().catch(() => 0), 8);
  for (let i = 0; i < n; i++) {
    const el = controls.nth(i);
    if (await el.isVisible().catch(() => false)) await el.click({ force: true }).catch(() => {});
  }
  await page.addStyleTag({ content: `
    * { animation: none !important; transition: none !important; scroll-behavior: auto !important; caret-color: transparent !important; }
    [data-radix-dialog-overlay], [data-radix-alert-dialog-overlay], .snotice,
    [class*="toast"], [class*="Toast"], [class*="cookieBanner"], [class*="cookie-banner"] { display: none !important; }
  ` }).catch(() => {});
}

async function settle(page: Page, ms = 1800) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await clean(page);
  await wait(page, ms);
}

async function center(loc: Locator) {
  await loc.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" as ScrollBehavior })).catch(() => {});
}

async function viewportShot(page: Page, name: string, focus?: Locator) {
  if (focus && await focus.isVisible().catch(() => false)) {
    await center(focus);
    await wait(page, 350);
  }
  await clean(page);
  await page.screenshot({
    path: join(STILLS, name + ".png"),
    animations: "disabled",
    clip: { x: 64, y: 36, width: 1792, height: 1008 },
  });
}

async function largestImage(page: Page) {
  const imgs = page.locator("main img, article img");
  const n = Math.min(await imgs.count().catch(() => 0), 40);
  let best: Locator | null = null;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const img = imgs.nth(i);
    if (!(await img.isVisible().catch(() => false))) continue;
    const b = await img.boundingBox().catch(() => null);
    if (!b) continue;
    const a = b.width * b.height;
    if (b.width >= 220 && b.height >= 180 && a > area) {
      best = img;
      area = a;
    }
  }
  return best;
}

async function openPublicAnimal(page: Page) {
  await page.goto(PUBLIC_URL + "/feed", { waitUntil: "domcontentloaded" });
  await settle(page, 1800);
  const direct = page.locator('a[href^="/dog/"]').first();
  if (await direct.isVisible().catch(() => false)) {
    await direct.click();
    await settle(page, 1900);
    return;
  }
  const named = page.getByRole("link", { name: /pinky|dog near|view.*profile|view.*animal/i }).first();
  if (await named.isVisible().catch(() => false)) {
    await named.click();
    await settle(page, 1900);
    return;
  }
  throw new Error("No public animal profile link found from /feed.");
}

async function captureAnimal(page: Page) {
  await openPublicAnimal(page);
  const img = await largestImage(page);
  if (!img) throw new Error("No substantial animal photo found.");
  await img.screenshot({ path: join(STILLS, "01-animal.png"), animations: "disabled" });

  const tag = page.locator(".lr-tag").first();
  const hero = page.locator(".lr-hero").first();
  const focus = await tag.isVisible().catch(() => false) ? tag : hero;
  await viewportShot(page, "02-profile", focus);
}

async function captureMap(page: Page) {
  await page.goto(PUBLIC_URL + "/map?mode=animals", { waitUntil: "domcontentloaded" });
  await settle(page, 2800);
  const map = page.locator(".sm-host, .maplibregl-map, .mapboxgl-map").first();
  await viewportShot(page, "03-map", map);
}

async function captureCases(page: Page, demoUrl: string) {
  await page.goto(demoUrl + "/partner/cases", { waitUntil: "domcontentloaded" });
  await settle(page, 2300);
  const board = page.locator(".cr-board").first();
  const root = page.locator("main.cr").first();
  await viewportShot(page, "04-case-queue", await board.isVisible().catch(() => false) ? board : root);

  const links = page.locator('a[href^="/partner/cases/"]:not([href="/partner/cases/new"])');
  const n = await links.count().catch(() => 0);
  let clicked = false;
  for (let i = 0; i < n; i++) {
    const href = await links.nth(i).getAttribute("href");
    if (href && !href.endsWith("/new") && await links.nth(i).isVisible().catch(() => false)) {
      await links.nth(i).click();
      clicked = true;
      break;
    }
  }
  if (!clicked) throw new Error("No NGO case detail link found.");
  await settle(page, 1800);
  const caseRoot = page.locator("main, .cf").first();
  await viewportShot(page, "05-case-detail", caseRoot);
}

async function captureCoverage(page: Page, demoUrl: string) {
  await page.goto(demoUrl + "/partner/map", { waitUntil: "domcontentloaded" });
  await settle(page, 3000);
  const map = page.locator(".sm-host, .maplibregl-map, .mapboxgl-map, [class*='map']").filter({ visible: true }).first();
  await viewportShot(page, "06-coverage", map);
}

async function makeEndCard(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  let icon = "";
  try {
    const b = await readFile(resolve(ROOT, "public", "icon.png"));
    icon = "data:image/png;base64," + b.toString("base64");
  } catch {}
  await page.setContent("<!doctype html><html><head><meta charset='utf-8'><style>" +
    "*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#f3ede4;color:#0b1e3d;font-family:Arial,sans-serif}" +
    ".f{width:1920px;height:1080px;padding:110px 126px;display:flex;flex-direction:column;justify-content:center;position:relative}" +
    ".k{font-size:21px;letter-spacing:.18em;font-weight:700;margin-bottom:38px}" +
    ".h{font-family:Georgia,serif;font-size:118px;line-height:.96;letter-spacing:-.045em;max-width:1500px}" +
    ".h b{font-weight:400;color:#f05b40}.brand{position:absolute;left:126px;bottom:86px;display:flex;align-items:center;gap:16px;font-size:29px;font-weight:700}" +
    ".brand img{width:48px;height:48px;border-radius:12px}.rule{position:absolute;top:94px;left:126px;width:76px;height:7px;border-radius:99px;background:#2457ce}" +
    "</style></head><body><main class='f'><div class='rule'></div><div class='k'>STRAYPAW</div><div class='h'>Every stray animal.<br><b>Seen. Tracked. Cared for.</b></div>" +
    "<div class='brand'>" + (icon ? "<img src='" + icon + "' alt=''>" : "") + "<span>StrayPaw</span></div></main></body></html>");
  await page.screenshot({ path: join(STILLS, "07-end.png") });
  await page.close();
}

async function makeContactSheet(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  const names = ["01-animal","02-profile","03-map","04-case-queue","05-case-detail","06-coverage","07-end"];
  const cards: string[] = [];
  for (const name of names) {
    const b = await readFile(join(STILLS, name + ".png"));
    cards.push("<figure><img src='data:image/png;base64," + b.toString("base64") + "'><figcaption>" + name + "</figcaption></figure>");
  }
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.setContent("<!doctype html><html><head><style>" +
    "*{box-sizing:border-box}body{margin:0;background:#0b1e3d;color:#f3ede4;font-family:Arial,sans-serif;padding:34px}" +
    ".g{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}figure{margin:0}img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:14px;display:block;background:#07142b}" +
    "figcaption{font-size:17px;margin-top:8px;opacity:.8}" +
    "</style></head><body><div class='g'>" + cards.join("") + "</div></body></html>");
  await page.screenshot({ path: join(OUT, "contact-sheet.png"), fullPage: true });
  await page.close();
}

async function main() {
  await mkdir(STILLS, { recursive: true });
  const demoUrl = await startLocalDemo();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await captureAnimal(page);
    await captureMap(page);
    await captureCases(page, demoUrl);
    await captureCoverage(page, demoUrl);
    await makeEndCard(browser);
    await makeContactSheet(browser);
    await writeFile(join(OUT, "capture-manifest.json"), JSON.stringify({
      publicUrl: PUBLIC_URL,
      demoUrl,
      shots: ["01-animal","02-profile","03-map","04-case-queue","05-case-detail","06-coverage","07-end"],
      createdAt: new Date().toISOString()
    }, null, 2));
  } finally {
    await context.close();
    await browser.close();
    localApp?.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  localApp?.kill("SIGTERM");
  process.exit(1);
});
