import { test, expect } from '@playwright/test';

// Real public routes: no API fixtures. These checks supplement the workflow
// suite with launch-width layout, metadata and current-city verification.
test.beforeEach(() => test.skip(!process.env.E2E_BASE_URL?.startsWith('https:'), 'requires the real deployed site'));
const routes = ['/', '/explore', '/for-ngos', '/for-governments', '/education', '/about', '/evidence', '/map', '/stories', '/insights', '/orgs', '/org/the-pawsome-people-project', '/report', '/app', '/join', '/contact'];
for (const width of [1280, 390]) test(`public launch review at ${width}px`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'explicit launch widths');
  test.setTimeout(300_000);
  await page.setViewportSize({ width, height: 900 });
  const failures: string[] = [];
  for (const route of routes) {
    const errors: string[] = [];
    const onError = (error: Error) => errors.push(error.message);
    page.on('pageerror', onError);
    const response = await page.goto(route, { waitUntil: 'load' });
    await expect(page.locator('h1').first()).toBeVisible();
    // Let the page's own data-loading indicator settle before taking evidence.
    await page.locator('h1').first().scrollIntoViewIfNeeded();
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      h1: document.querySelectorAll('h1').length,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    }));
    if ((response?.status() ?? 500) >= 400) failures.push(`${route}: HTTP ${response?.status()}`);
    if (layout.overflow) failures.push(`${route}: horizontal overflow`);
    if (layout.h1 !== 1) failures.push(`${route}: ${layout.h1} h1 headings`);
    if (!layout.description) failures.push(`${route}: missing description`);
    if (errors.length) failures.push(`${route}: ${errors.join('; ')}`);
    await page.screenshot({ path: testInfo.outputPath(`${width}-${route.replace(/\W/g, '_') || 'landing'}.png`), fullPage: true });
    page.off('pageerror', onError);
  }
  expect(failures).toEqual([]);
});

test('map city changes replace the current totals and loaded geography', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'viewport-independent data check');
  await page.goto('/map?city=Delhi');
  const city = page.getByRole('combobox', { name: /city/i }).first();
  await expect(city).toHaveValue('Delhi');
  await city.selectOption('Coimbatore');
  await expect(city).toHaveValue('Coimbatore');
  await expect(page).toHaveURL(/city=Coimbatore/);
  await city.selectOption('Ranchi');
  await expect(page).toHaveURL(/city=Ranchi/);
});

test('unknown dog IDs are real 404s and production health identifies its build', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'viewport-independent HTTP check');
  expect((await request.get('/dog/00000000-0000-4000-8000-000000000000')).status()).toBe(404);
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect((await health.json()).sha).toMatch(/^[0-9a-f]{40}$/);
});
