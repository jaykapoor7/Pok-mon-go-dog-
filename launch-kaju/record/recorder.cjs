/* Screen recorder for the Kaju launch films.
   Records a real browser session as numbered JPEG frames (Chrome's own screencast, at 2x so the edit can zoom), with a
   log of where the pointer was, every click, every keystroke burst and named markers, all on one clock. The pointer is
   not drawn into the footage: the edit draws it from the log, so it stays sharp at any zoom.
   Nothing here fakes the product: it only drives the mouse and keyboard like a person and writes down what happened. */
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function start({ out, width = 1600, height = 900, scale = 2, launch = {}, context = {}, quality = 88 }) {
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'frames'), { recursive: true });
  /* The flag makes Chrome's screencast deliver device pixels (2x), not CSS pixels. */
  const browser = await chromium.launch({ ...launch, args: ['--hide-scrollbars', '--force-color-profile=srgb', `--force-device-scale-factor=${scale}`, ...(launch.args || [])] });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, locale: 'en-IN', timezoneId: 'Asia/Kolkata', reducedMotion: 'no-preference', ...context });
  /* Voice. The microphone is fed from audio files (the spoken questions), one per turn, in order: the page records
     and sends them exactly as it would a person's voice. Each file's start, and each answer the page plays, is logged
     with its time and saved, so the film can lay the real audio back under the picture. */
  const questions = (context.questions || []).slice(); delete context.questions;
  await ctx.addInitScript((count) => {
    let turn = 0;
    if (count && navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
      const i = Math.min(turn++, count - 1);
      const Ctx = window.AudioContext || window.webkitAudioContext; const ac = new Ctx();
      const buf = await ac.decodeAudioData(await (await fetch(`/__question/${i}.wav`)).arrayBuffer());
      const dest = ac.createMediaStreamDestination(); const src = ac.createBufferSource(); src.buffer = buf; src.connect(dest);
      /* A short quiet lead-in, as when a person draws breath after tapping the microphone. */
      setTimeout(() => { src.start(); window.__recAudio?.({ kind: 'question', i }); }, 350);
      return dest.stream;
    };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) {
      const el = this; const src = el.src || el.currentSrc || '';
      if (src.startsWith('data:audio') && !el.muted) el.addEventListener('playing', () => window.__recAudio?.({ kind: 'answer', src }), { once: true });
      return play.apply(el, a);
    };
  }, questions.length);
  const page = await ctx.newPage();
  if (questions.length) await ctx.route('**/__question/*.wav', (route) => { const i = Number(route.request().url().match(/(\d+)\.wav/)[1]); route.fulfill({ status: 200, contentType: 'audio/wav', body: fs.readFileSync(questions[i].file) }); });
  const cdp = await ctx.newCDPSession(page);
  const log = { width, height, scale, frames: [], pointer: [], clicks: [], keys: [], marks: [], audio: [] };
  let t0 = null, n = 0, on = false; const pending = [];
  const now = () => (t0 === null ? 0 : Date.now() / 1000 - t0);
  cdp.on('Page.screencastFrame', (f) => {
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    if (!on) return;
    const ts = f.metadata.timestamp; if (t0 === null) t0 = ts;
    const file = `frames/f${String(n++).padStart(6, '0')}.jpg`;
    pending.push(fs.promises.writeFile(path.join(out, file), Buffer.from(f.data, 'base64')));
    log.frames.push({ t: +(ts - t0).toFixed(4), file });
  });
  let mx = width / 2, my = height * 0.6;
  let answers = 0;
  const probe = (f) => { try { return +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim(); } catch { return undefined; } };
  await ctx.exposeFunction('__recAudio', (e) => {
    if (!on) return;
    fs.mkdirSync(path.join(out, 'audio'), { recursive: true });
    if (e.kind === 'question') { const q = questions[e.i]; const file = `audio/question-${e.i}.wav`; fs.copyFileSync(q.file, path.join(out, file)); log.audio.push({ t: +now().toFixed(3), file, kind: 'question', lang: q.lang, text: q.text, gloss: q.gloss, duration: probe(q.file) }); }
    else { const m = /^data:(audio\/[\w.+-]+);base64,(.*)$/.exec(e.src); if (!m) return; const file = `audio/answer-${answers++}.mp3`; fs.writeFileSync(path.join(out, file), Buffer.from(m[2], 'base64')); log.audio.push({ t: +now().toFixed(3), file, kind: 'answer', duration: probe(path.join(out, file)) }); }
  });
  const rec = {
    page, ctx, browser, log, out, now,
    async begin() { on = true; await cdp.send('Page.startScreencast', { format: 'jpeg', quality, everyNthFrame: 1 }); await sleep(250); log.pointer.push({ t: now(), x: mx, y: my }); },
    mark(name, data) { log.marks.push({ t: +now().toFixed(3), name, ...(data || {}) }); },
    /** Move the pointer like a hand: an eased, slightly curved path, logged as it goes. */
    async moveTo(x, y, ms) {
      const dx = x - mx, dy = y - my, dist = Math.hypot(dx, dy); if (dist < 1) return;
      const dur = ms ?? Math.min(1100, 260 + dist * 0.55), steps = Math.max(6, Math.round(dur / 16));
      const bow = Math.min(60, dist * 0.12) * (dx > 0 ? -1 : 1), sx = mx, sy = my;
      for (let i = 1; i <= steps; i++) {
        const p = ease(i / steps), arc = Math.sin(Math.PI * p) * bow;
        mx = sx + dx * p - (dy / dist) * arc; my = sy + dy * p + (dx / dist) * arc;
        await page.mouse.move(mx, my); log.pointer.push({ t: +now().toFixed(3), x: +mx.toFixed(1), y: +my.toFixed(1) });
        await sleep(dur / steps);
      }
    },
    async target(locator) { const l = typeof locator === 'string' ? page.locator(locator).first() : locator; await l.scrollIntoViewIfNeeded().catch(() => {}); const b = await l.boundingBox(); if (!b) throw new Error('no box for ' + locator); return { l, b, x: b.x + b.width / 2, y: b.y + b.height / 2 }; },
    async hover(locator, ms) { const t = await rec.target(locator); await rec.moveTo(t.x, t.y, ms); return t; },
    async click(locator, opts = {}) {
      const t = await rec.hover(locator, opts.ms); await sleep(opts.settle ?? 140);
      log.clicks.push({ t: +now().toFixed(3), x: +mx.toFixed(1), y: +my.toFixed(1) });
      await page.mouse.down(); await sleep(70); await page.mouse.up(); return t;
    },
    /** Type like a person: uneven, a little faster inside words. */
    async type(text, { cps = 17 } = {}) {
      const from = now();
      for (const ch of text) { await page.keyboard.type(ch); await sleep((1000 / cps) * (ch === ' ' ? 1.5 : 0.6 + Math.random() * 0.8)); }
      log.keys.push({ t: +from.toFixed(3), end: +now().toFixed(3), chars: text.length });
    },
    async press(key) { log.keys.push({ t: +now().toFixed(3), end: +now().toFixed(3), key }); await page.keyboard.press(key); },
    /** Where an element is on screen now (CSS px), written to the log so the edit can frame it. */
    async box(name, locator) { const l = typeof locator === 'string' ? page.locator(locator).first() : locator; const b = await l.boundingBox(); if (b) log.marks.push({ t: +now().toFixed(3), name, box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } }); return b; },
    wait: sleep,
    async end({ fps = 30 } = {}) {
      await sleep(400); on = false; await cdp.send('Page.stopScreencast').catch(() => {}); await Promise.all(pending);
      log.duration = +now().toFixed(3);
      fs.writeFileSync(path.join(out, 'log.json'), JSON.stringify(log));
      /* Frames arrive only when the page changes, each with its own time: lay them on a constant clock. */
      const list = log.frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, (log.frames[i + 1]?.t ?? log.duration) - f.t).toFixed(4)}`).join('\n') + `\nfile '${log.frames[log.frames.length - 1].file}'\n`;
      fs.writeFileSync(path.join(out, 'frames.txt'), list);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'frames.txt', '-vf', `fps=${fps},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-movflags', '+faststart', 'raw.mp4'], { cwd: out });
      await browser.close();
      return log;
    },
  };
  return rec;
}
module.exports = { start, sleep, ease };
