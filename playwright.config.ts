import { defineConfig, devices } from "@playwright/test";

/* The suite boots a production build, because the bugs worth catching here —
   a route that only fails when prerendered, a client component that throws on
   hydration — do not reproduce under `next dev`. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
    /* PLAYWRIGHT_CHROMIUM_PATH lets a sandbox or CI image with its own
       Chromium run the suite without re-downloading one that only has to
       match the pinned Playwright version. Unset everywhere else, where the
       bundled browser is used as normal. */
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
      args: process.env.PLAYWRIGHT_CHROMIUM_PATH ? ["--no-proxy-server"] : [],
    },
  },
  projects: [
    /* Phone first: this is where the product is actually used. */
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start -- -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
