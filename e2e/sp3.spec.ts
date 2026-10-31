import { expect, test } from "@playwright/test";

/* StrayPaw 3.0: the site, the entry flow, the app shell, StrayPaw AI and
   CareOS, as a visitor and an unauthenticated user can exercise them. */

const PUBLIC = ["/", "/abc-operations", "/security", "/research", "/platform", "/ai", "/whatsapp", "/solutions", "/solutions/abc-arv", "/solutions/rescue-care", "/for-governments", "/for-ngos", "/for-funders",
  "/customers", "/customers/the-pawsome-people-project", "/customers/the-kind-hour-foundation", "/demo", "/docs", "/faq", "/sign-in", "/app", "/join", "/access",
  "/our-story", "/mission", "/contact", "/privacy", "/explore", "/evidence", "/for-community", "/education", "/partner-apply", "/partner-programmes"];
const APP = ["/ngo", "/ngo/animals", "/ngo/inbox", "/ngo/programmes", "/ngo/field", "/ngo/review", "/ngo/proof", "/ngo/team", "/city", "/city/programmes", "/city/insights", "/city/report", "/community", "/community/report", "/learn", "/assistant", "/fundraisers", "/surveys"];

test("every public and app route answers 200", async ({ request }) => {
  for (const path of [...PUBLIC, ...APP]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
  }
});

test("consolidated URLs redirect to their 3.0 homes", async ({ request }) => {
  for (const [from, to] of [["/product", "/platform"], ["/partners", "/customers"], ["/login", "/sign-in"], ["/book-a-demo", "/demo"], ["/careos", "/whatsapp"]]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect([307, 308], from).toContain(res.status());
    expect(res.headers().location, from).toContain(to);
  }
});

test("homepage leads with the operator product and a labelled demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Run ABC programmes your\s*municipality can verify/);
  await expect(page.locator(".s4-hero").getByRole("link", { name: "Book a demo" })).toHaveAttribute("href", "/demo");
  await expect(page.getByRole("group", { name: /Product demo: an ABC operator's workspace/ })).toBeVisible();
  await expect(page.getByText("Product demo · illustrative records, not live programme data")).toBeAttached();
  await expect(page.getByText("In development · not connected").first()).toBeAttached();
});

test("navigation dropdowns open, list solutions and close on Escape", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop navigation");
  await page.goto("/");
  const solutions = page.getByRole("button", { name: "Solutions" });
  await solutions.click();
  await expect(solutions).toHaveAttribute("aria-expanded", "true");
  for (const name of ["ABC operators & NGOs", "ABC / ARV programmes", "Rescue & care", "Government oversight", "Community & welfare groups"]) await expect(page.locator("#s4-dd-solutions").getByRole("link", { name: new RegExp(name) })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(solutions).toHaveAttribute("aria-expanded", "false");
});

test("phone menu opens and reaches sign in and demo", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone navigation");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const sheet = page.locator("#s4-sheet");
  await expect(sheet.getByRole("link", { name: "Book a demo" })).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("sign in shows the authorised-users notice, then the email and code form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Authorised users only" })).toBeVisible();
  await page.getByRole("button", { name: "I understand" }).click();
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByLabel("Access code")).toBeVisible();
  await page.getByLabel("Work email").fill("not-an-email");
  await page.getByLabel("Access code").fill("ABC123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".s3-err")).toContainText("email");
});

test("Open App offers ways in to a signed-out visitor", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("link", { name: /Sign in to your workspace/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Join with an invitation code/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Report an animal/ })).toBeVisible();
});

test("the app shell carries workspace navigation, search and StrayPaw AI", async ({ page, isMobile }) => {
  await page.goto("/city/programmes");
  if (!isMobile) {
    const side = page.getByRole("complementary", { name: "Workspace" });
    await expect(side.getByRole("link", { name: "Programmes" })).toHaveAttribute("aria-current", "page");
    await side.getByRole("button", { name: /Ask StrayPaw AI/ }).click();
  } else {
    await page.getByRole("navigation", { name: /navigation/ }).getByRole("button", { name: "AI" }).click();
  }
  const panel = page.getByRole("complementary", { name: "StrayPaw AI" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("textbox", { name: "Message StrayPaw AI" })).toBeVisible();
});

/* CI builds without Supabase keys: the AI must then say so (503), never
   answer from nothing. With a record store it must answer from real tools. */
test("StrayPaw AI answers public questions with sources and refuses a forged session", async ({ request }) => {
  const res = await request.post("/api/ai", { data: { messages: [{ role: "user", text: "What programmes are published?" }] } });
  const body = await res.json();
  if (res.status() === 503) { expect(body.error).toMatch(/not configured/); return; }
  expect(res.status()).toBe(200);
  expect(body.tools.length).toBeGreaterThan(0);
  expect(body.proposals).toEqual([]);
  const forged = await request.post("/api/ai", { headers: { Authorization: "Bearer forged" }, data: { messages: [{ role: "user", text: "summarise my work" }] } });
  expect(forged.status()).toBe(401);
});

test("organisation-only AI tools refuse without an organisation", async ({ request }) => {
  const res = await request.post("/api/ai", { data: { messages: [{ role: "user", text: "Which records are missing evidence?" }] } });
  const body = await res.json();
  if (res.status() === 503) { expect(body.error).toMatch(/not configured/); return; }
  expect(body.text).toMatch(/organisation workspace/);
  expect(body.proposals).toEqual([]);
});

test("the CareOS webhook refuses everything until Meta credentials are configured", async ({ request }) => {
  expect((await request.get("/api/careos/webhook?hub.mode=subscribe&hub.verify_token=x&hub.challenge=1")).status()).toBe(503);
  expect((await request.post("/api/careos/webhook", { data: {} })).status()).toBe(503);
});

test("customer stories label imported data honestly and show no testimonial", async ({ page }) => {
  await page.goto("/customers/the-pawsome-people-project");
  await expect(page.getByText(/imported historical registers, not from work entered live/)).toBeVisible();
  await expect(page.getByText(/Time saved has not been measured yet/)).toBeVisible();
  await expect(page.locator("blockquote")).toHaveCount(0);
});
