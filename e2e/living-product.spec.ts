import { test, expect } from "@playwright/test";
/* StrayPaw 4: audiences live in the Solutions mega menu, operator first,
   in three columns; WhatsApp is shown as built but not connected;
   Explore remains the map. */
const solutions=["NGOs & ABC operators","Municipal corporations","Hospitals & laboratories","Funders & CSR","Rescue & community groups","Animal birth control","Anti-rabies vaccination","Rescue & treatment","Feeding & community care","Coordinators","Field staff","Veterinarians","Municipal reviewers","Leadership"];
test("the solutions menu lists organisations, programmes and teams in order",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");
 const disclosure=page.getByRole("button",{name:"Solutions",exact:true});await disclosure.click();
 const links=page.locator("#s4-dd-solutions .s4-dd-item");await expect(links.locator("b")).toHaveText(solutions);
 await expect(page.locator("#s4-dd-solutions .s4-mega-h")).toHaveText(["By organisation","By programme","By team"]);
 await page.keyboard.press("Escape");await expect(disclosure).toHaveAttribute("aria-expanded","false");
 await disclosure.click();await links.filter({hasText:"Municipal corporations"}).click();
 await expect(page).toHaveURL(/\/for-governments$/);await expect(page.getByRole("heading",{level:1})).toBeVisible();
});
test("the WhatsApp demo never writes to the record",async({page})=>{
 const writes:string[]=[];await page.route("**/api/**",async route=>{if(route.request().method()!=="GET"){writes.push(route.request().url());await route.abort();}else await route.continue();});
 await page.goto("/");
 const tour=page.getByRole("tablist",{name:"Workflow steps"});
 if(await tour.isVisible())for(const tab of await tour.getByRole("tab").all())await tab.click();
 await page.locator("#integrations").scrollIntoViewIfNeeded();await page.waitForTimeout(500);
 expect(writes).toEqual([]);
});
test("WhatsApp is presented honestly as not connected, without invented prices",async({page})=>{
 await page.goto("/whatsapp");await expect(page.getByText("Not connected",{exact:true}).first()).toBeVisible();
 await expect(page.locator("main")).toContainText("We will not call it live until a real message has gone end to end in production.");
 await expect(page.locator("main")).not.toContainText(/₹\s?\d|\$\d|per month|\/month/);
 await page.goto("/for-ngos");await expect(page.locator("main")).toContainText("Not connected");
 await expect(page.locator("main")).not.toContainText(/₹\s?\d|\$\d|per month|\/month/);
});
test("Explore remains the public map and does not open an app chooser",async({page})=>{
 await page.goto("/explore");await expect(page.getByRole("combobox",{name:/Search the map/})).toBeVisible();await expect(page).toHaveURL(/\/explore/);
 await expect(page.locator(".s4-nav")).toBeVisible();await expect(page.getByRole("heading",{level:1})).toContainText("India");
 await page.getByRole("button",{name:"Needs help",exact:true}).click();await expect(page).toHaveURL(/lens=help/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test("use cases tell a second story in the same frame: a city rabies programme", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/");
  const section = page.locator("#workflow"); await section.scrollIntoViewIfNeeded();
  const city = section.getByRole("button", { name: "City rabies programme" });
  await expect(section.getByRole("button", { name: "ABC programme" })).toHaveAttribute("aria-pressed", "true");
  await city.click(); await expect(city).toHaveAttribute("aria-pressed", "true");
  await expect(section.getByRole("tab")).toHaveText(["Record", "Follow up", "Test", "Decide", "Report"]);
  await expect(section.getByRole("heading", { level: 3 })).toHaveText("A bite is recorded once.");
  await expect(section).toContainText("no name stored", { ignoreCase: true });
  await section.getByRole("tab", { name: "Follow up" }).click();
  await expect(section.getByRole("heading", { level: 3 })).toHaveText("The field team finds the animal.");
  await expect(section).toContainText("never the patient");
  await section.getByRole("button", { name: "ABC programme" }).click();
  await expect(section.getByRole("tab")).toHaveText(["Receive", "Register", "Treat", "Release", "Submit & bill"]);
});

test("menus carry a drawing, a pill follows the pointer, and pages announce their loading", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/");
  const solutions = page.getByRole("button", { name: "Solutions", exact: true });
  await expect(async () => { await solutions.hover(); await expect(solutions).toHaveAttribute("aria-expanded", "true", { timeout: 1000 }); }).toPass({ timeout: 15_000 });
  await expect(page.locator('#s4-dd-solutions a.s4-mega-art[href="/platform#one-health"]')).toBeVisible();
  await expect(page.locator(".s4-nav-links")).toHaveAttribute("data-glide", "true");
  await page.keyboard.press("Escape");
  /* The route line is decorative and idle until a link to another page is pressed. */
  const line = page.locator(".rp"); await expect(line).toHaveAttribute("aria-hidden", "true"); await expect(line).toHaveAttribute("data-state", "idle");
  await page.goto("/platform");
  await expect(page.locator(".pm-progress")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
