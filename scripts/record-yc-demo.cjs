/* Records the Kaju product walkthrough on the local recording build
   (NEXT_PUBLIC_DEMO_RECORDING=true, illustrative records only).
   Run under a virtual display:  DISPLAY=:99 node scripts/record-yc-demo.cjs
   Output: demo-footage/kaju-walkthrough-raw.mp4 (screen capture via ffmpeg). */
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const { mkdirSync } = require("node:fs");

const BASE = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3101";
const OUT = process.env.DEMO_OUT ?? "demo-footage/kaju-walkthrough-raw.mp4";
const W = 1920, H = 1080;

const OVERLAY = () => {
  const css = `
  #yc-cur{position:fixed;z-index:2147483647;left:0;top:0;width:22px;height:22px;pointer-events:none;transform:translate(-3px,-2px);transition:transform .05s}
  #yc-cur.down svg{transform:scale(.85)}
  #yc-cap{position:fixed;z-index:2147483646;left:50%;bottom:34px;transform:translateX(-50%) translateY(12px);max-width:880px;padding:14px 22px;border-radius:14px;background:rgba(11,30,61,.92);color:#fff;font:500 21px/1.4 Inter,system-ui,sans-serif;letter-spacing:-.01em;text-align:center;opacity:0;transition:opacity .35s,transform .35s;pointer-events:none;box-shadow:0 12px 40px rgba(11,30,61,.25)}
  #yc-cap.on{opacity:1;transform:translateX(-50%) translateY(0)}
  #yc-card{position:fixed;z-index:2147483645;inset:0;display:grid;place-items:center;background:#f7f3ec;opacity:0;transition:opacity .5s;pointer-events:none;font-family:Inter,system-ui,sans-serif;color:#0b1e3d;text-align:center}
  #yc-card.on{opacity:1}
  #yc-card h1{margin:0 0 14px;font-size:54px;font-weight:600;letter-spacing:-.035em;line-height:1.1}
  #yc-card p{margin:0;font-size:22px;color:#33415c}
  #yc-card small{display:block;margin-top:28px;font-size:14px;color:#5f6b7e;letter-spacing:.02em}
  #yc-card img{width:64px;height:64px;margin-bottom:22px}`;
  const boot = () => {
    if (document.getElementById("yc-cur")) return;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const cur = document.createElement("div"); cur.id = "yc-cur";
    cur.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l16 9.5-7 1.6-3.6 6.6z" fill="#0b1e3d" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(cur);
    const cap = document.createElement("div"); cap.id = "yc-cap"; document.body.appendChild(cap);
    const card = document.createElement("div"); card.id = "yc-card"; document.body.appendChild(card);
    const p = JSON.parse(sessionStorage.getItem("yc.cur") || "[960,540]"); cur.style.left = p[0] + "px"; cur.style.top = p[1] + "px";
    addEventListener("mousemove", (e) => { cur.style.left = e.clientX + "px"; cur.style.top = e.clientY + "px"; sessionStorage.setItem("yc.cur", JSON.stringify([e.clientX, e.clientY])); }, true);
    addEventListener("mousedown", () => cur.classList.add("down"), true);
    addEventListener("mouseup", () => cur.classList.remove("down"), true);
    window.__cap = (t) => { cap.textContent = t || ""; cap.classList.toggle("on", !!t); };
    window.__card = (h, p2, s) => { card.innerHTML = h ? `<div><img src="/straypaw-mark.png" alt=""><h1>${h}</h1><p>${p2 || ""}</p>${s ? `<small>${s}</small>` : ""}</div>` : ""; card.classList.toggle("on", !!h); };
    try { localStorage.setItem("straypaw.notice.storage.v1", "1"); } catch {}
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  mkdirSync("demo-footage", { recursive: true });
  const browser = await chromium.launch({ headless: false, args: [`--window-size=${W / 1.25},${H / 1.25 + 120}`, "--window-position=0,0", "--force-device-scale-factor=1.25", "--disable-infobars", "--hide-scrollbars", "--no-first-run", "--disable-features=Translate"], ignoreDefaultArgs: ["--enable-automation"] });
  const ctx = await browser.newContext({ viewport: null, locale: "en-IN", timezoneId: "Asia/Kolkata" });
  await ctx.addInitScript(OVERLAY);
  const page = await ctx.newPage();
  /* Size the page area to exactly 1536×864 CSS px (1920×1080 on screen); the capture crops the browser frame above it. */
  await page.goto(BASE + "/ngo/inbox");
  const cdp = await ctx.newCDPSession(page);
  const { windowId } = await cdp.send("Browser.getWindowForTarget");
  let m = await page.evaluate(() => ({ ow: outerWidth, oh: outerHeight, iw: innerWidth, ih: innerHeight }));
  await cdp.send("Browser.setWindowBounds", { windowId, bounds: { left: 0, top: 0, width: m.ow + (W / 1.25 - m.iw), height: m.oh + (H / 1.25 - m.ih) } });
  await sleep(500);
  m = await page.evaluate(() => ({ ow: outerWidth, oh: outerHeight, iw: innerWidth, ih: innerHeight, sx: screenX, sy: screenY }));
  const TOP = Math.round((m.oh - m.ih) * 1.25 + m.sy * 1.25);
  console.log("page area", m, "capture top", TOP);

  const cap = (t) => page.evaluate((x) => window.__cap?.(x), t);
  const card = (h, p, s) => page.evaluate(([a, b, c]) => window.__card?.(a, b, c), [h, p, s]);
  let pos = [960 / 1.25, 540 / 1.25];
  const glide = async (x, y, ms = 650) => { const steps = Math.max(8, Math.round(ms / 16)); for (let i = 1; i <= steps; i++) { const t = i / steps, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; await page.mouse.move(pos[0] + (x - pos[0]) * e, pos[1] + (y - pos[1]) * e); await sleep(16); } pos = [x, y]; };
  const click = async (loc, { ms = 650, after = 500 } = {}) => {
    const el = loc.first(); await el.waitFor({ state: "visible", timeout: 15000 }); await el.scrollIntoViewIfNeeded();
    const b = await el.boundingBox(); await glide(b.x + b.width / 2, b.y + b.height / 2, ms);
    await sleep(160); await page.mouse.down(); await sleep(90); await page.mouse.up(); await el.click({ trial: true }).catch(() => {}); await sleep(after);
  };
  const press = async (loc, opts) => { await click(loc, opts); };
  const type = async (text) => { const box = page.getByRole("textbox", { name: "Message Kaju" }); await click(box, { after: 200 }); await page.keyboard.type(text, { delay: 34 }); await sleep(350); await page.keyboard.press("Enter"); };
  const kajuToBottom = async (ms = 1600) => page.evaluate((d) => new Promise((r) => { const el = document.querySelector(".ai3-scroll"); if (!el) return r(); const from = el.scrollTop, to = el.scrollHeight - el.clientHeight, t0 = performance.now(); const f = (n) => { const k = Math.min(1, (n - t0) / d); el.scrollTop = from + (to - from) * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2); k < 1 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); }), ms);
  const kajuScrollTo = async (sel, ms = 1400) => page.evaluate(([s, d]) => new Promise((r) => { const el = document.querySelector(".ai3-scroll"); const t = el?.querySelector(s); if (!el || !t) return r(); const from = el.scrollTop, to = Math.min(el.scrollHeight - el.clientHeight, t.offsetTop - 12), t0 = performance.now(); const f = (n) => { const k = Math.min(1, (n - t0) / d); el.scrollTop = from + (to - from) * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2); k < 1 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); }), [sel, ms]);
  // Clicking real buttons: use Playwright's click so React handlers run, after the visible cursor arrives.
  const go = async (loc, opts = {}) => {
    const el = loc.first(); await el.waitFor({ state: "visible", timeout: 20000 }); await el.scrollIntoViewIfNeeded(); const b = await el.boundingBox();
    /* Lift the caption out of the way while the cursor works under it. */
    const hid = await page.evaluate((r) => { const c = document.getElementById("yc-cap"); if (!c || !c.classList.contains("on")) return false; const k = c.getBoundingClientRect(); const hit = !(r.x + r.width < k.left - 20 || r.x > k.right + 20 || r.y + r.height < k.top - 20 || r.y > k.bottom + 20); if (hit) c.style.opacity = "0"; return hit; }, b);
    await glide(b.x + b.width / 2, b.y + b.height / 2, opts.ms ?? 650); await sleep(140); await el.click(); await sleep(opts.after ?? 600);
    if (hid) await page.evaluate(() => { const c = document.getElementById("yc-cap"); if (c) c.style.opacity = ""; });
  };
  const typeKaju = async (text) => { const box = page.getByRole("textbox", { name: "Message Kaju" }); await go(box, { after: 150 }); await page.keyboard.type(text, { delay: 32 }); await sleep(300); await page.keyboard.press("Enter"); };

  /* Warm every screen once so recording never shows a cold compile. */
  for (const u of ["/ngo/inbox", "/ngo/verification", "/ngo/packages", "/city/review"]) { await page.goto(BASE + u, { waitUntil: "networkidle" }); }
  await page.evaluate(() => { sessionStorage.clear(); });
  await page.goto(BASE + "/ngo/inbox", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 3000 }).catch(() => {});
  await card("Meet Kaju", "StrayPaw's AI agent for animal welfare programmes", "Product demo · illustrative records");
  await sleep(600);

  const rec = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "x11grab", "-video_size", `${W}x${H}`, "-framerate", "30", "-draw_mouse", "0", "-i", `${process.env.DISPLAY || ":99"}+0,${TOP}`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", OUT], { stdio: ["pipe", "inherit", "inherit"] });
  await sleep(3200);
  await card("", "");
  await sleep(700);

  /* 1 · WhatsApp intake */
  await cap("7:42 am. Ravi, on the field team, sends a photo and a Hindi voice note on WhatsApp.");
  await sleep(1800);
  await go(page.getByRole("button", { name: "Play voice note" }), { after: 2200 });
  await cap("Kaju reads the photo, transcribes the voice note and checks the animal register.");
  await go(page.getByRole("button", { name: "Prepare the record with Kaju" }), { after: 3600 });
  await sleep(2600);
  await kajuScrollTo(".ai3-prop", 1800);
  await cap("It prepares the record and lists what is still missing. Nothing is saved until a person confirms.");
  await sleep(2600);
  await go(page.getByRole("button", { name: /Confirm and save/ }), { after: 1600 });

  /* 2 · Month end */
  await cap("Saved. The record now waits for the surgery evidence and the vet's sign-off.");
  await go(page.getByRole("link", { name: "Open the record" }), { after: 2800 });
  await go(page.getByRole("button", { name: "New conversation" }), { after: 300 });
  await cap("Month end: 146 sterilisations in October, each needing five pieces of evidence and a vet sign-off.");
  await go(page.locator("nav.sx3-tabs").getByRole("link", { name: "Verification" }), { after: 2800 });
  await cap("Instead of a day of spreadsheet checks, Anjali asks Kaju.");
  await typeKaju("What's blocking the October package?");
  await sleep(3900);
  await cap("Kaju finds the four problems, cites each record and prepares the fixes.");
  await sleep(2600);
  await kajuScrollTo(".ai3-prop", 2200);
  await sleep(800);
  await go(page.getByRole("button", { name: /Confirm and send SMS/ }), { after: 900 });
  await kajuToBottom(1200);
  for (let i = 0; i < 2; i++) await go(page.getByRole("button", { name: /Confirm and save/ }), { after: 900 });
  await sleep(600);

  /* 3 · Package */
  await cap("Then one step builds the billing package for the municipal office.");
  await go(page.getByRole("button", { name: "Close Kaju" }), { after: 300 });
  await go(page.getByRole("link", { name: "Report packages" }), { after: 1600 });
  await go(page.getByLabel("Title"), { after: 100 }); await page.keyboard.type("October 2026 · ABC programme, Zone 13", { delay: 28 });
  await page.getByLabel("From").fill("2026-10-01"); await page.getByLabel("To").fill("2026-10-31");
  await sleep(500);
  await go(page.getByRole("button", { name: "Prepare package" }), { after: 2600 });
  await cap("142 verified procedures, 710 evidence files, every vet sign-off. The 4 unready records stay out.");
  await sleep(2400);
  await go(page.getByRole("button", { name: "Download PDF" }), { after: 1600 });
  await go(page.getByRole("button", { name: "Submit package" }), { after: 2200 });

  /* 4 · Government side */
  await cap("");
  await card("At the municipal office", "Dr. Kavitha Iyer reviews the packages the city pays for");
  await sleep(1400);
  await page.evaluate(() => { sessionStorage.removeItem("sp3.ai.thread"); sessionStorage.setItem("sp3.ai.open", "0"); });
  await page.goto(BASE + "/city/review", { waitUntil: "networkidle" });
  await sleep(1200);
  await card("", "");
  await sleep(900);
  await cap("The package arrives in the reviewing office's queue.");
  await sleep(1400);
  await go(page.getByRole("link", { name: /October 2026/ }), { after: 2200 });
  await cap("Kaju checks it for the government side too: missing evidence, animals billed twice, locations.");
  await go(page.getByRole("button", { name: "Kaju", exact: true }), { after: 900 });
  await typeKaju("Check this package before I accept it.");
  await sleep(4400);
  await kajuToBottom(1800);
  await sleep(2000);
  await go(page.getByRole("button", { name: "Close Kaju" }), { after: 500 });
  await cap("Accepted in her name, with the full audit trail.");
  await go(page.getByRole("button", { name: "Accept", exact: true }), { after: 2200 });
  await cap("And the payment is sanctioned against verified work.");
  await go(page.getByRole("button", { name: /^Sanction ₹/ }), { after: 2800 });
  await cap("");
  await sleep(600);
  await card("From a voice note to a sanctioned payment.", "Kaju does the paperwork, so animal welfare teams can do the work.", "straypaw.org");
  await sleep(4200);

  rec.stdin.write("q"); await new Promise((r) => rec.on("close", r));
  await browser.close();
  console.log("Saved", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
