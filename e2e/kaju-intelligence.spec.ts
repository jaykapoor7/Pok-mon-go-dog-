import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/* Kaju's answers as a person uses them: figures, a table, a chart and a list of records drawn by the app (not walls of
   text), a sentence with blanks that continues the conversation, a one-tap rating, and an honest line about whether the
   conversation is kept. Every answer is a fixture served in place of /api/ai; no model and no database are involved. */

const box = (page: Page) => page.getByRole("textbox", { name: "Ask Kaju" });
const send = async (page: Page, text: string) => { await box(page).fill(text); await box(page).press("Enter"); };
const TURN = "0b9a3c1e-1f2a-4c3d-9e8f-123456789abc";
const answer = {
  scope: "guest", engine: "tools", text: "**12 open cases** in Ward 12. Three are overdue.", turnId: TURN,
  tools: [{ name: "query_cases", summary: "12 open cases", ok: true }], proposals: [],
  citations: [{ id: "c1", label: "SPC-36A054", href: "/ngo/cases/0b9a3c1e-1f2a-4c3d-9e8f-123456789abc", kind: "case" }],
  blocks: [
    { kind: "stats", items: [{ label: "Open", value: "12" }, { label: "Overdue", value: "3", tone: "warn" }, { label: "Unassigned", value: "2" }] },
    { kind: "table", title: "Overdue follow-ups", columns: ["Case", "Held by", "Due"], rows: [{ cells: ["SPC-36A054", "Ravi", "12 Nov"], href: "/ngo/cases/0b9a3c1e-1f2a-4c3d-9e8f-123456789abc" }, { cells: ["SPC-36A055", "Priya", "13 Nov"] }, { cells: ["SPC-36A056", "Nobody", "14 Nov"] }] },
    { kind: "chart", title: "Cases opened by week", form: "bar", unit: "cases", points: [{ label: "W43", value: 4 }, { label: "W44", value: 7 }, { label: "W45", value: 5 }] },
    { kind: "blanks", lead: "One choice and I will prepare it.", parts: ["Send the overdue list to ", { blank: "who" }, " as a ", { blank: "format" }, "."], blanks: [{ id: "who", label: "who", control: "choice", options: ["Ravi", "Priya", "everyone"] }, { id: "format", label: "format", control: "choice", options: ["task", "message"] }] },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { for (const k of ["straypaw.notice.storage.v1", "straypaw.analytics.optout", "sp.firstday.v1", "sp.onboard.done"]) localStorage.setItem(k, "1"); sessionStorage.clear(); } catch {} });
});

async function withAnswer(page: Page, bodies: unknown[] = []) {
  await page.route("**/api/ai", async (r) => {
    if (r.request().method() === "GET") return r.fulfill({ json: { scope: "guest", tools: true, model: false } });
    bodies.push(r.request().postDataJSON());
    return r.fulfill({ json: bodies.length === 1 ? answer : { ...answer, text: "Prepared.", blocks: [], turnId: undefined } });
  });
}

test("an answer shows figures, a table, a chart and record links, drawn by the app", async ({ page }) => {
  await withAnswer(page);
  await page.goto("/kaju");
  await send(page, "how many open cases in ward 12");
  const thread = page.getByRole("list", { name: "Conversation with Kaju" });
  await expect(thread.getByText("Overdue", { exact: true }).first()).toBeVisible();
  await expect(thread.getByRole("columnheader", { name: "Held by" })).toBeVisible();
  await expect(thread.getByRole("link", { name: "SPC-36A054" }).first()).toHaveAttribute("href", /\/ngo\/cases\//);
  await expect(thread.getByLabel(/Bar chart of cases: W43 4, W44 7, W45 5/)).toBeVisible();
  await expect(page.getByText("Not saved: sign in to keep conversations.")).toBeVisible();
  const results = await new AxeBuilder({ page }).include(".nx-kthread").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test("filling the blanks sends the finished sentence as the next request", async ({ page }) => {
  const bodies: { messages: { text: string }[]; retry?: boolean; context?: { surface?: string } }[] = [];
  await withAnswer(page, bodies);
  await page.goto("/kaju");
  await send(page, "overdue list");
  await expect(page.getByRole("group", { name: "Fill in the blanks" })).toBeVisible();
  await page.getByRole("radio", { name: "Priya" }).click();
  await page.getByRole("radio", { name: "task" }).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1].messages.at(-1)?.text).toBe("Send the overdue list to Priya as a task.");
  expect(bodies[0].context?.surface).toBe("page");
  expect(bodies[0].retry).toBe(false);
});

test("an answer is rated in one tap, with an optional second step", async ({ page }) => {
  await withAnswer(page);
  await page.goto("/kaju");
  await send(page, "how many open cases");
  const rate = page.getByRole("group", { name: "Was this answer useful?" });
  await rate.getByRole("button", { name: "Yes, useful" }).click();
  await expect(rate.getByRole("button", { name: "15 min" })).toBeVisible();
  await rate.getByRole("button", { name: "15 min" }).click();
  await expect(rate.getByText(/Thanks/)).toBeVisible();
});

test("the thumbs-down step asks why, optionally, and never blocks the conversation", async ({ page }) => {
  await withAnswer(page);
  await page.goto("/kaju");
  await send(page, "how many open cases");
  const rate = page.getByRole("group", { name: "Was this answer useful?" });
  await rate.getByRole("button", { name: "No, not useful" }).click();
  await rate.getByRole("button", { name: "Missed something" }).click();
  await rate.getByLabel("What should Kaju have done?").fill("Include Ward 14 too");
  await rate.getByRole("button", { name: "Send" }).click();
  await expect(rate.getByText(/Thanks/)).toBeVisible();
  await expect(box(page)).toBeEnabled();
});

for (const width of [390, 768, 1440]) {
  test(`answers fit a ${width}px screen without sideways scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await withAnswer(page);
    await page.goto("/kaju");
    await send(page, "how many open cases in ward 12");
    await expect(page.getByRole("columnheader", { name: "Held by" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/kaju-answer-${width}.png`, fullPage: false });
  });
}
