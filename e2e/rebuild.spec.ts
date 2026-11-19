import { test, expect } from "@playwright/test";

/* The rebuild at /next, on sample data. These hold the interactions the handoff calls signature:
   a task settles into Done, a row opens its record, a chart choice narrows the table, a channel turns talk into
   work only on acceptance, and Kaju stops for approval. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("sp.demo.tour.v1", JSON.stringify({ mode: "off", step: 0, role: null })); });
});

/* Typing before React has attached would be lost on any server-rendered page; wait for the page to settle first. */
const open = async (page: import("@playwright/test").Page, path: string) => { await page.goto(path); await page.waitForLoadState("networkidle"); };

const noSideScroll = async (page: import("@playwright/test").Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

test("Today: finishing a task moves it to Done and updates the count", async ({ page }) => {
  await open(page, "/ngo/today");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Priya");
  await expect(page.locator(".nx-sub")).toContainText("6 things need you");
  await page.getByRole("button", { name: /^Mark done: Injured street dog/ }).click();
  await expect(page.locator(".nx-sub")).toContainText("5 things need you");
  await expect(page.getByRole("button", { name: /^Reopen: Injured street dog/ })).toBeVisible();
  await noSideScroll(page);
});

test("Animals: a view narrows the table and a row opens its record", async ({ page }) => {
  await open(page, "/ngo/animals");
  await expect(page.locator("button.nx-tr")).toHaveCount(9);
  await page.getByRole("tab", { name: /Identity to review/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await page.locator("button.nx-tr").first().click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Activity and medical history");
  await drawer.getByRole("link", { name: "Open full record" }).first().click();
  await expect(page).toHaveURL(/\/ngo\/animals\/AN-1107$/);
  await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true");
  await noSideScroll(page);
});

test("Cases: views narrow one list, and a row opens its details", async ({ page }) => {
  await open(page, "/ngo/cases");
  await expect(page.locator("button.nx-tr")).toHaveCount(5);
  await page.getByRole("tab", { name: /Critical and high/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(3);
  await page.getByRole("tab", { name: /Resolved/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(2);
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("CASE-0198");
  await noSideScroll(page);
});

test("Inbox: reports wait in one queue, and a suggested match stays a suggestion", async ({ page }) => {
  await open(page, "/ngo/inbox");
  await expect(page.locator("button.nx-tr")).toHaveCount(4);
  await page.getByRole("tab", { name: /Possible match/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(2);
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("Nothing is linked until a person confirms it");
  await noSideScroll(page);
});

test("Submissions: packages are grouped by where they stand with the reviewing office", async ({ page }) => {
  await open(page, "/ngo/submissions");
  await expect(page.locator("button.nx-tr")).toHaveCount(5);
  await expect(page.locator(".nx-sub")).toContainText("2 waiting on you");
  await page.getByRole("tab", { name: /With the reviewing office/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(2);
  await page.getByRole("tab", { name: /Decided/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(2);
  await noSideScroll(page);
});

test("Verification: the office queue sorts what waits longest first, and states that decisions are signed", async ({ page }) => {
  await open(page, "/gov/verification");
  await expect(page.locator("button.nx-tr")).toHaveCount(2);
  await expect(page.locator(".nx-sub")).toContainText("the oldest for 6 days");
  await expect(page.locator("button.nx-tr").first()).toContainText("Street Care Trust");
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("signed decision by a named reviewer");
  await expect(page.getByRole("dialog")).toContainText("2 records without a surgeon's authorisation");
  await noSideScroll(page);
});

test("Healthcare: a clinic's day and register, with doses only counted as given at the clinic", async ({ page }) => {
  await open(page, "/health/today");
  await expect(page.locator(".nx-sub").first()).toContainText("2 doses due today, 1 overdue");
  await open(page, "/health/bites");
  await expect(page.locator("button.nx-tr")).toHaveCount(6);
  await page.getByRole("tab", { name: /Dose overdue/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await open(page, "/health/pep");
  await expect(page.locator("button.nx-tr").first()).toContainText("Overdue");
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("A reminder sent is not a dose given");
  await noSideScroll(page);
});

test("Laboratory: samples arrive, testing puts the oldest first, results are released by staff", async ({ page }) => {
  await open(page, "/health/samples");
  await expect(page.locator("button.nx-tr")).toHaveCount(5);
  await page.getByRole("tab", { name: /^Arriving/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await open(page, "/health/testing");
  await expect(page.locator("button.nx-tr")).toHaveCount(2);
  await expect(page.locator("button.nx-tr").first()).toContainText("SX-ILL-004");
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("Chain of custody");
  await page.keyboard.press("Escape");
  await open(page, "/health/results");
  await page.getByRole("tab", { name: /^Positive/ }).first().click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("Kaju never does");
  await noSideScroll(page);
});

test("Research: an aggregated dataset where suppressed cells are counted apart, never added in", async ({ page }) => {
  await open(page, "/research/datasets");
  await expect(page.locator(".nx-sub").first()).toContainText("1 dataset approved for you");
  await page.getByRole("link", { name: /Explore/ }).last().click();
  await expect(page).toHaveURL(/\/research\/explore/);
  await expect(page.locator(".nx-fig").nth(1)).toContainText("Cells suppressed");
  await page.getByRole("combobox", { name: "area" }).selectOption("HSR Layout");
  await expect(page.locator(".nx-filter.is-on")).toContainText("HSR Layout");
  await noSideScroll(page);
});

test("Command bar: opens from the keyboard, finds a record, opens it, and hands words to Kaju without running them", async ({ page }) => {
  await open(page, "/ngo/today");
  await page.getByRole("button", { name: "Search" }).first().click();
  const box = page.getByRole("combobox", { name: "Search" });
  await expect(box).toBeFocused();
  await box.fill("brown");
  await expect(page.getByRole("option", { name: /Brown street dog/ })).toBeVisible();
  await box.press("Enter");
  await expect(page).toHaveURL(/\/ngo\/animals\/AN-1042$/);
  await page.getByRole("button", { name: "Search" }).first().click();
  await page.getByRole("combobox", { name: "Search" }).fill("what is waiting");
  await page.getByRole("option", { name: /Ask Kaju/ }).click();
  await expect(page).toHaveURL(/\/kaju\?q=/);
  await expect(page.getByLabel("Ask Kaju")).toHaveValue("what is waiting");
  await expect(page.locator('section[aria-labelledby="kj-m"] li')).toHaveCount(2);
  await noSideScroll(page);
});

test("Channel threads: replies open beside the channel and stay out of the main list", async ({ page }) => {
  await open(page, "/channels/abc-ward-12");
  await expect(page.locator(".nx-msgs .nx-msg")).toHaveCount(3);
  await page.getByRole("button", { name: /2 replies to Dr\. Arun K\./ }).click();
  const pane = page.getByRole("complementary", { name: /Thread/ });
  await expect(pane.locator(".nx-msg")).toHaveCount(3);
  await page.getByLabel("Reply in thread").fill("I will take it.");
  await page.getByLabel("Reply in thread").press("Enter");
  await expect(pane.locator(".nx-msg")).toHaveCount(4);
  await expect(page.locator(".nx-msgs .nx-msg")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /3 replies to Dr\. Arun K\./ })).toBeVisible();
  await noSideScroll(page);
});

test("Bell: lists what is waiting on the person, and closes with Escape", async ({ page }) => {
  await open(page, "/ngo/today");
  const bell = page.getByRole("button", { name: /2 things need you/ });
  await bell.click();
  const panel = page.getByRole("dialog", { name: "Needs you" });
  await expect(panel).toContainText("Kaju is waiting for your approval");
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
});

test("Insights: choosing a ward narrows the figures and the table together", async ({ page }) => {
  await open(page, "/gov/overview");
  await expect(page.locator("button.nx-tr")).toHaveCount(6);
  await page.locator(".nx-barrow", { hasText: "Ward 08" }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await expect(page.locator(".hm-tile").first()).toContainText("236");
  await expect(page.locator(".nx-barrow", { hasText: "Ward 14" })).toContainText("No estimate");
  await noSideScroll(page);
});

test("Channel: Kaju proposes tasks and creates them only when accepted", async ({ page }) => {
  await open(page, "/channels/abc-ward-12");
  const work = page.getByRole("tab", { name: /^Work/ });
  await expect(work).toContainText("1");
  await page.getByLabel("Message #abc-ward-12").fill("@Kaju turn these updates into tasks");
  await page.getByLabel("Message #abc-ward-12").press("Enter");
  await expect(page.getByRole("button", { name: "Create 2 tasks" })).toBeVisible();
  await expect(work).toContainText("1");
  await page.getByRole("button", { name: "Create 2 tasks" }).click();
  await expect(work).toContainText("3");
  await noSideScroll(page);
});

test("Kaju: details are recognised before sending, and a run stops for approval", async ({ page }) => {
  await open(page, "/kaju");
  const ask = page.getByLabel("Ask Kaju");
  await ask.fill("Prepare next week's follow-ups for Ward 12, assign to Field team A, and notify #field-operations");
  await expect(page.locator(".nx-span")).toHaveCount(4);
  await page.getByRole("button", { name: /^Place: Ward 12/ }).click();
  await page.getByRole("listbox", { name: /choose/ }).getByRole("option", { name: "Ward 14" }).click();
  await expect(page.getByRole("button", { name: /^Place: Ward 14/ })).toBeVisible();
  /* Signed out, Kaju can read the sentence but plans nothing: the sample work is labelled and nothing starts. */
  await expect(page.locator('section[aria-labelledby="kj-m"] li')).toHaveCount(2);
  await expect(page.getByRole("button", { name: /^Plan/ })).toHaveCount(0);
  await noSideScroll(page);
});

test("Operations: visits due by tomorrow, overdue first, with the place to plan a round", async ({ page }) => {
  await open(page, "/ngo/operations");
  await expect(page.locator(".nx-sub").first()).toContainText("overdue");
  const rows = page.locator("button.nx-tr");
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("Overdue");
  await page.getByRole("tab", { name: /^Next 7 days/ }).click();
  await expect(rows).toHaveCount(7);
  await rows.first().click();
  await expect(page.getByRole("dialog")).toContainText("does not order a route");
  await page.keyboard.press("Escape");
  await noSideScroll(page);
});

test("Programmes: coverage counts only animals whose status was recorded", async ({ page }) => {
  await open(page, "/ngo/programmes");
  await expect(page.locator("button.nx-tr")).toHaveCount(3);
  await page.getByRole("tab", { name: /^Archived/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await page.getByRole("tab", { name: /^Active/ }).click();
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("of 75 known");
  await expect(page.getByRole("dialog")).toContainText("not a share of the area");
  await noSideScroll(page);
});

test("Government programmes: coverage only where a dated estimate exists", async ({ page }) => {
  await open(page, "/gov/programmes");
  await expect(page.locator(".nx-sub").first()).toContainText("no estimate");
  await page.getByRole("tab", { name: /^No estimate/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("None recorded");
  await page.keyboard.press("Escape");
  await noSideScroll(page);
});

test("Partners: overdue requests first, services shown as last confirmed", async ({ page }) => {
  await open(page, "/gov/partners");
  const rows = page.locator("button.nx-tr");
  await expect(rows).toHaveCount(6);
  await expect(rows.first()).toContainText("overdue");
  await page.getByRole("tab", { name: /^Health and laboratory/ }).click();
  await expect(rows).toHaveCount(3);
  await rows.filter({ hasText: "Health centre" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("not a stock count");
  await noSideScroll(page);
});

test("Surveillance: small counts suppressed, alerts never declare an outbreak", async ({ page }) => {
  await open(page, "/gov/surveillance");
  await expect(page.locator(".nx-sub").first()).toContainText("none of them declares an outbreak");
  await expect(page.locator(".nx-vbars text.sup")).toHaveCount(1);
  await expect(page.locator(".nx-feed li")).toHaveCount(5);
  await page.getByRole("tab", { name: "30 days" }).click();
  await expect(page.getByRole("tab", { name: "30 days" })).toHaveAttribute("aria-selected", "true");
  await noSideScroll(page);
});

test("Government reports: programme reports and accepted packages, nothing written by Kaju", async ({ page }) => {
  await open(page, "/gov/reports");
  await expect(page.getByRole("heading", { name: "Programme reports" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Accepted packages" }).locator(".nx-tr:not(.nx-th)")).toHaveCount(3);
  await noSideScroll(page);
});

test("Laboratory quality: turnaround from recorded steps, and what StrayPaw does not hold", async ({ page }) => {
  await open(page, "/health/quality");
  await expect(page.locator(".nx-fig")).toHaveCount(5);
  await expect(page.getByText("does not hold standard operating procedures")).toBeVisible();
  await noSideScroll(page);
});

test("Referrals: people on the way here, with no names or phone numbers", async ({ page }) => {
  await open(page, "/health/referrals");
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await page.getByRole("tab", { name: /^All/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(4);
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("Only the case code and the incident facts");
  await noSideScroll(page);
});

test("Facilities: services as last confirmed, gaps in their own view", async ({ page }) => {
  await open(page, "/health/facilities");
  await expect(page.locator(".nx-sub").first()).toContainText("1 of 5");
  await page.getByRole("tab", { name: /^Gaps/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(3);
  await noSideScroll(page);
});

test("Healthcare surveillance: programme totals, not this facility's patients", async ({ page }) => {
  await open(page, "/health/surveillance");
  await expect(page.locator(".nx-sub").first()).toContainText("not this facility");
  await expect(page.locator(".nx-vbars")).toBeVisible();
  await noSideScroll(page);
});

test("Kaju's work: what waits for you is listed on Kaju's home, old approval links land there, history keeps every step", async ({ page }) => {
  /* There is no approvals page any more: an old link opens Kaju's home, where the work that waits for the person is
     listed (sample, signed out) with the step it waits on, and nothing in the sidebar or Kaju's places says "Missions". */
  await open(page, "/kaju/approvals");
  await expect(page).toHaveURL(/\/kaju$/);
  const work = page.locator('section[aria-labelledby="kj-m"]');
  await expect(work.getByRole("heading", { name: "Kaju's work" })).toBeVisible();
  await expect(work.locator("li")).toHaveCount(2);
  await expect(work.locator("li").first()).toContainText("Waiting for your approval: Send the packet to the municipal office");
  await expect(work.locator("a").first()).toHaveAttribute("href", "/try");
  await expect(page.getByText(/\bmissions?\b|workroom/i)).toHaveCount(0);
  await open(page, "/kaju/history");
  await expect(page.locator(".nx-run")).toHaveCount(2);
  await noSideScroll(page);
});

test("Research map: areas only, synced with the table, suppressed areas hatched", async ({ page }) => {
  await open(page, "/research/maps");
  await expect(page.locator(".nx-area")).toHaveCount(6);
  await page.getByRole("tab", { name: "Vaccination" }).click();
  await page.locator(".nx-area").first().click();
  await expect(page.locator(".nx-map-t .nx-tr.is-sel")).toHaveCount(1);
  await expect(page.locator(".nx-note")).toContainText("do not show cause");
  await noSideScroll(page);
});

test("Kaju insights: every check says what it counts, and an unset deadline is not assumed", async ({ page }) => {
  await open(page, "/kaju/insights");
  await expect(page.locator(".nx-chk")).toHaveCount(6);
  await expect(page.locator(".nx-chk").filter({ hasText: "Reporting deadline" })).toContainText("Not set");
  await page.getByRole("button", { name: /Run the checks now/ }).click();
  await expect(page.locator("p[role=status]")).toContainText("sign in");
  await noSideScroll(page);
});

test("Direct messages: private, and Kaju is not offered in them", async ({ page }) => {
  await open(page, "/channels/dm-nisha-r");
  await expect(page.locator(".nx-ch-h h1")).toContainText("Nisha R.");
  await expect(page.getByRole("button", { name: "Mention Kaju" })).toHaveCount(0);
  await expect(page.getByLabel("About this conversation")).toContainText("Kaju is not part of direct messages");
  await page.getByLabel("Message Nisha R.").fill("On my way");
  await page.getByLabel("Message Nisha R.").press("Enter");
  await expect(page.locator(".nx-msgs .nx-msg")).toHaveCount(3);
  await noSideScroll(page);
});

test("Every sample channel opens with its own conversation", async ({ page }) => {
  for (const name of ["general", "field-operations", "referrals"]) {
    await open(page, `/channels/${name}`);
    await expect(page.locator(".nx-msgs .nx-msg").first()).toBeVisible();
  }
});

test("Kaju automations: nothing is on until a lead turns it on, and the schedule is not promised", async ({ page }) => {
  await open(page, "/kaju/automations");
  await expect(page.locator(".nx-autos > li")).toHaveCount(15);
  await expect(page.locator(".nx-autos > li.is-on")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Turn on" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Other routine work Kaju takes on" })).toBeVisible();
  await noSideScroll(page);
});

test("Research studies and reports: snapshots are fixed, suppressed cells counted apart", async ({ page }) => {
  await open(page, "/research/studies");
  await expect(page.locator("button.nx-tr")).toHaveCount(2);
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("Take a snapshot");
  await page.keyboard.press("Escape");
  await open(page, "/research/reports");
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("Exact query");
  await expect(page.getByRole("dialog")).toContainText("never added in");
  await noSideScroll(page);
});

test("Veterinary: patients, appointments, clinical care, procedures and follow-ups", async ({ page }) => {
  for (const [path, rows] of [["patients", 4], ["appointments", 2], ["care", 3], ["procedures", 2], ["followups", 3]] as const) {
    await open(page, `/health/${path}`);
    await expect(page.locator("button.nx-tr")).toHaveCount(rows);
  }
  await page.goto("/health/procedures");
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("never done for you");
  await noSideScroll(page);
});

test("Nothing in any sidebar is marked Soon", async ({ page }) => {
  for (const path of ["/ngo/today", "/gov/overview", "/health/today", "/research/datasets", "/kaju"]) {
    await open(page, path);
    await expect(page.locator(".nx-item.is-soon")).toHaveCount(0);
  }
});

test("Start: every kind of organisation has a way in, and none is self-granted", async ({ page }) => {
  await open(page, "/start");
  await expect(page.locator(".nx-start .nx-chk")).toHaveCount(7);
  await expect(page.getByText("never self-registered")).toBeVisible();
  await expect(page.getByRole("link", { name: /Register an NGO/ })).toHaveAttribute("href", /\/sign-in\?as=org/);
  await noSideScroll(page);
});

test("Signed out, /next opens the sample workspace", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/ngo\/today/);
});
