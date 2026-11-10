import { chromium } from 'playwright';
const [, , out, base = 'http://localhost:3200'] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const plan = JSON.parse(process.env.PLAN);
const errors = [];
for (const [vw, vh, tag] of (process.env.SIZES ? JSON.parse(process.env.SIZES) : [[1440, 900, 'desktop'], [390, 844, 'phone']])) {
  for (const [who, paths] of Object.entries(plan)) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { for (const q of ['straypaw.notice.storage.v1','straypaw.tour.v2','straypaw-install-dismissed','straypaw.analytics.optout']) localStorage.setItem(q, '1'); });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${who} ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Download the React|maplibre/.test(m.text())) errors.push(`${who} console: ${m.text().slice(0, 200)}`); });
    await page.goto(base + '/today', { waitUntil: 'networkidle', timeout: 90000 });
    if (who !== 'signedout') { await page.getByRole('button', { name: new RegExp(who, 'i') }).first().click(); await page.waitForURL((u) => !u.pathname.endsWith('/today') || true, { timeout: 15000 }); await page.waitForTimeout(2500); }
    for (const p of paths) {
      if (p !== '.') await page.goto(base + p, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(1200);
      const name = `${tag}-${who.replace(/\W+/g, '_')}${(p === '.' ? '_landing' : p).replace(/[/?=&]+/g, '_')}`;
      await page.screenshot({ path: `${out}/${name}.png`, fullPage: process.env.FULL === '1' });
      console.log(name, page.url().replace(base, ''));
    }
    await ctx.close();
  }
}
await b.close();
console.log('errors:', errors.length); for (const e of [...new Set(errors)].slice(0, 20)) console.log(' ', e);
