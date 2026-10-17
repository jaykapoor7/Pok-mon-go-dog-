import { test, expect } from '@playwright/test';

// Real public routes: no API fixtures. These checks supplement the workflow
// suite with launch-width layout, metadata and current-city verification.
test.beforeEach(() => test.skip(!process.env.E2E_BASE_URL?.startsWith('https:'), 'requires the real deployed site'));
const routes = ['/', '/for-ngos', '/for-governments', '/education', '/about', '/evidence', '/community', '/community/stories', '/city/insights', '/community/organisations', '/community/organisations/the-pawsome-people-project', '/community/report', '/learn', '/join', '/contact'];
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
    await expect(page.locator("h1:visible")).toHaveCount(1);
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      h1: Array.from(document.querySelectorAll('h1')).filter(el => el.getBoundingClientRect().height > 0).length,
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
