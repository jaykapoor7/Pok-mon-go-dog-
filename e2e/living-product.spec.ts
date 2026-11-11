import { test, expect } from "@playwright/test";
/* StrayPaw 4: audiences live in the Solutions mega menu, operator first,
   in three columns; WhatsApp is shown as built but not connected;
   Explore remains the map. */
const solutions=["NGOs & ABC operators","Municipal corporations","Funders & CSR","Rescue & community groups","Animal birth control","Anti-rabies vaccination","Rescue & treatment","Feeding & community care","Coordinators","Field staff","Veterinarians","Municipal reviewers","Leadership"];
test("the WhatsApp demo never writes to the record",async({page})=>{
 const writes:string[]=[];await page.route("**/api/**",async route=>{if(route.request().method()!=="GET"){writes.push(route.request().url());await route.abort();}else await route.continue();});
 await page.goto("/");
 const tour=page.getByRole("tablist",{name:"Workflow steps"});
 if(await tour.isVisible())for(const tab of await tour.getByRole("tab").all())await tab.click();
 await page.locator("#trust").scrollIntoViewIfNeeded();await page.waitForTimeout(500);
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
