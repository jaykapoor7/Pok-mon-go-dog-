import { chromium } from 'playwright';
const out = process.argv[2]; const base = 'https://demo.straypaw.org';
const REF = 'ucxfxiddufwqithtdtix', ANON = process.env.ANON;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
async function session(role) {
  const r = await fetch(base + '/api/demo/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
  const t = await r.json();
  const u = await (await fetch(`https://${REF}.supabase.co/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${t.access_token}` } })).json();
  return { ...t, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: u };
}
const plan = { field: ['/ngo', '/ngo/field', '/ngo/work'], coordinator: ['/ngo', '/ngo/animals', '/ngo/packages', '/ngo/programmes'], vet: ['/ngo/verification?stage=vet'], municipal: ['/city', '/city/insights', '/city/review'] };
for (const [vw, vh, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  for (const [role, paths] of Object.entries(plan)) {
    const s = await session(role);
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, reducedMotion: 'reduce' });
    await ctx.addInitScript(([k, v]) => { localStorage.setItem(k, v); for (const q of ['straypaw.notice.storage.v1','straypaw.tour.v2','sp.welcome.first-workflow','straypaw-install-dismissed','sp.videocard.dismissed','straypaw.analytics.optout']) localStorage.setItem(q, '1'); localStorage.setItem('sp.demo.tour.v1', JSON.stringify({mode:'off',step:0,role:null})); }, [`sb-${REF}-auth-token`, JSON.stringify(s)]);
    const page = await ctx.newPage();
    for (const p of (tag === 'phone' ? paths.slice(0, 1) : paths)) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(4500);
      const name = `${tag}-${role}${p.replace(/[/?=]/g, '_')}`; await page.screenshot({ path: `${out}/${name}.png` });
      const nav = await page.$$eval('aside a, nav a', as => as.map(a => a.textContent.trim()).filter(Boolean).slice(0, 40)).catch(() => []);
      const btns = await page.$$eval('main button, main a', as => as.length).catch(() => 0);
      console.log(name, '| links:', nav.length, '| main actions:', btns, '|', nav.join(' · ').slice(0, 300));
    }
    await ctx.close();
  }
}
await b.close();
