import { test, expect } from "@playwright/test";
import path from "node:path";

// No production writes. Form recovery uses an unavailable transport; no invented records.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/contact", route => route.abort("failed"));
});

test("the homepage remains readable in both scroll directions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/");
  for (const id of ["world", "one-request", "whatsapp-groups", "one-request", "world"]) {
    const section=page.locator(`#${id}`);await section.scrollIntoViewIfNeeded();await expect(section.locator("h1,h2").first()).toBeVisible();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
test("audience destinations remain reachable by keyboard in the header",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");
 await page.getByRole("button",{name:"Who It’s For",exact:true}).focus();await page.keyboard.press("ArrowDown");
 const links=page.locator("#sp-audiences > a");await expect(links).toHaveCount(5);
 for(let i=0;i<5;i++){await expect(links.nth(i)).toBeFocused();if(i<4)await page.keyboard.press("Tab");}
 await expect(links.last()).toContainText("Education");
});

test("mobile navigation contains focus and restores the menu button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  await menu.click();
  await expect(page.locator("#sp-sheet a").first()).toBeFocused();
  await page.locator("#sp-sheet a").last().focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".sp-header-cta")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#sp-sheet a").last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
});

test("contact validation focuses each invalid field; transport failure keeps the message", async ({ page }) => {
  await page.goto("/contact?subject=Feedback");
  await expect(page.getByLabel("Subject optional")).toHaveValue("Feedback");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByLabel("Your name")).toBeFocused();
  await expect(page.getByLabel("Your name")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Your name").fill("QA review");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await page.getByLabel("Email", { exact: true }).fill("qa@example.com");
  await page.getByLabel("Message", { exact: true }).fill("Checking failure recovery without sending this message.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".ct-error[role=alert]")).toBeVisible();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Checking failure recovery without sending this message.");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
});

test("a report can select a location when WebGL is unavailable", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 11.0168, longitude: 76.9558 });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
      return getContext.apply(this, [type, ...args] as Parameters<typeof getContext>);
    } as typeof getContext;
  });
  await page.goto("/community/report?help=1");
  await expect(page.getByText("This browser cannot draw the map. Search for the place instead.")).toBeVisible();
  await page.getByRole("button", { name: "Where I am" }).click();
  await expect(page.getByRole("button", { name: "This is the place" })).toBeEnabled();
  await expect(page.locator(".rp2-where")).toContainText("Coimbatore");
});

test("choosing a replacement photo requires fresh consent", async ({ page }) => {
  await page.goto("/community/report");
  await page.getByRole("button", { name: /I spotted an animal/ }).click();
  const upload = page.locator('input[type="file"]');
  await upload.setInputFiles(path.join(process.cwd(), "public/hero/skyline-dog-640.jpg"));
  await page.getByRole("checkbox", { name: /I took this photo/ }).check();
  await expect(page.getByRole("button", { name: "Use this photo" })).toBeEnabled();
  await upload.setInputFiles(path.join(process.cwd(), "public/hero/skyline-dog-1024.jpg"));
  await expect(page.getByRole("checkbox", { name: /I took this photo/ })).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Use this photo" })).toBeDisabled();
});
