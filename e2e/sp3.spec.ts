import { expect, test } from "@playwright/test";

/* StrayPaw 3.0: the site, the entry flow, the app shell, Kaju and
   CareOS, as a visitor and an unauthenticated user can exercise them. */

const PUBLIC = ["/", "/abc-operations", "/security", "/research", "/platform", "/ai", "/kaju-agents", "/blog", "/product-updates", "/roadmap", "/events", "/teams/coordinators", "/whatsapp", "/solutions", "/solutions/abc-arv", "/solutions/rescue-care", "/for-governments", "/for-ngos", "/for-funders",
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

test("homepage introduces the general platform and a labelled demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Meet Kaju, the AI agent for\s*animal welfare programmes/);
  await expect(page.locator(".s4-hero").getByRole("link", { name: "Book a demo" })).toHaveAttribute("href", "/demo");
  await expect(page.getByRole("group", { name: /Product demo: a coordinator's day in StrayPaw/ })).toBeVisible();
  await expect(page.getByText("Product demo · illustrative records, not live programme data")).toBeAttached();
});

test("navigation dropdowns open, list solutions and close on Escape", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "desktop navigation");
  await page.goto("/");
  const solutions = page.getByRole("button", { name: "Solutions" });
  await solutions.click();
  await expect(solutions).toHaveAttribute("aria-expanded", "true");
  for (const name of ["NGOs & ABC operators", "Municipal corporations", "Rescue & community groups", "Anti-rabies vaccination", "Municipal reviewers"]) await expect(page.locator("#s4-dd-solutions").getByRole("link", { name: new RegExp(name) })).toBeVisible();
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

test("sign in is one email step, with the authorised-use notice, then the emailed code", async ({ page }) => {
  await page.route("**/api/access/start", (r) => r.fulfill({ json: { ok: true } }));
  await page.goto("/sign-in");
  await expect(page.getByText(/Authorised users only; activity is recorded/)).toBeVisible();
  const email = page.getByLabel("Email", { exact: true });
  await expect(email).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue/ })).toBeDisabled();
  await email.fill("someone@example.org");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Enter your code" })).toBeVisible();
  await expect(page.getByLabel("Six-character code")).toBeVisible();
});

test("sign-in never says whether an address has an account, and offers a new account from the code screen", async ({ page }) => {
  let body = "";
  await page.route("**/api/access/start", async (r) => { const res = await r.fetch().catch(() => null); body = res ? await res.text() : ""; await r.fulfill({ json: { ok: true } }); });
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("new@example.org");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Enter your code" })).toBeVisible();
  expect(body).not.toMatch(/known|exists|no account/i);
  await page.getByRole("button", { name: "Create your account" }).click();
  await page.getByRole("button", { name: /My organisation/ }).click();
  await expect(page.getByLabel("Organisation name")).toBeVisible();
  await expect(page.getByRole("button", { name: /Create our workspace/ })).toBeDisabled();
});

test("a person who came to register an organisation goes straight to registering", async ({ page }) => {
  await page.route("**/api/access/start", (r) => r.fulfill({ json: { ok: true } }));
  await page.goto("/sign-in?as=org");
  await page.getByLabel("Email", { exact: true }).fill("new@example.org");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByLabel("Organisation name")).toBeVisible();
});

test("Open App offers ways in to a signed-out visitor", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("link", { name: /Sign in to your workspace/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Join with an invitation code/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Report an animal/ })).toBeVisible();
});

test("the app shell carries workspace navigation, search and Kaju", async ({ page, isMobile }) => {
  await page.goto("/city/programmes");
  if (!isMobile) {
    const side = page.getByRole("complementary", { name: "Workspace" });
    await expect(side.getByRole("link", { name: "Programmes" })).toHaveAttribute("aria-current", "page");
    /* Every page is a tab; search and Kaju sit at the top of the sidebar. Kaju is a button, not a page link. */
    await expect(page.getByRole("navigation", { name: "Open pages" }).getByRole("link", { name: "Programmes" })).toHaveAttribute("aria-current", "page");
    await expect(side.getByRole("button", { name: /^Quick actions/ })).toBeVisible();
    await expect(side.getByRole("link", { name: "Kaju", exact: true })).toHaveCount(0);
    await side.getByRole("button", { name: /^Kaju/ }).click();
  } else {
    await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Kaju" }).click();
  }
  const panel = page.getByRole("complementary", { name: "Kaju" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("textbox", { name: "Message Kaju" })).toBeVisible();
});

/* A missing distributed counter denies guest questions (429). Forged
   sessions are still checked separately; no empty answer counts as success. */
test("Kaju answers public questions with sources and refuses a forged session", async ({ request }) => {
  const res = await request.post("/api/ai", { data: { messages: [{ role: "user", text: "What programmes are published?" }] } });
  const body = await res.json();
  if (res.status() === 429) { expect(body.error).toMatch(/temporarily unavailable|Too many/); expect(body.text).toBeUndefined(); }
  else if (res.status() === 503) expect(body.error).toMatch(/not configured/);
  else { expect(res.status()).toBe(200); expect(body.tools.length).toBeGreaterThan(0); expect(body.proposals).toEqual([]); }
  const forged = await request.post("/api/ai", { headers: { Authorization: "Bearer forged" }, data: { messages: [{ role: "user", text: "summarise my work" }] } });
  expect(forged.status()).toBe(401);
});

test("organisation-only AI tools refuse without an organisation", async ({ request }) => {
  const res = await request.post("/api/ai", { data: { messages: [{ role: "user", text: "Which records are missing evidence?" }] } });
  const body = await res.json();
  if (res.status() === 429) { expect(body.error).toMatch(/temporarily unavailable|Too many/); expect(body.text).toBeUndefined(); return; }
  if (res.status() === 503) { expect(body.error).toMatch(/not configured/); return; }
  expect(body.text).toMatch(/organisation workspace/);
  expect(body.proposals).toEqual([]);
});

test("the CareOS webhook refuses everything until Meta credentials are configured", async ({ request }) => {
  expect((await request.get("/api/careos/webhook?hub.mode=subscribe&hub.verify_token=x&hub.challenge=1")).status()).toBe(503);
  expect((await request.post("/api/careos/webhook", { data: {} })).status()).toBe(503);
});

test("customer stories say where their figures come from and show no testimonial", async ({ page }) => {
  await page.goto("/customers/the-pawsome-people-project");
  await expect(page.getByText(/Figures come from the organisation's imported registers/)).toBeVisible();
  await expect(page.locator("blockquote")).toHaveCount(0);
});
