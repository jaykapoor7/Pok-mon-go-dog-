import { test, expect } from "@playwright/test";
/* StrayPaw 3.0: audiences live in the Solutions menu; WhatsApp is shown as
   built but not connected; Explore remains the public map. */
const solutions=["Municipalities","NGOs","ABC / ARV programmes","Rescue & care","Funders"];
test("the solutions navigation has exactly five ordered, distinct destinations",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");
 const disclosure=page.getByRole("button",{name:"Solutions",exact:true});await disclosure.click();
 const links=page.locator("#s3-dd-solutions .s3-dd-item");await expect(links.locator("b")).toHaveText(solutions);
 expect(new Set(await links.evaluateAll(els=>els.map(el=>el.getAttribute("href")))).size).toBe(5);
 await page.keyboard.press("Escape");await expect(disclosure).toHaveAttribute("aria-expanded","false");
 await disclosure.click();await page.locator("#s3-dd-solutions .s3-dd-foot").getByRole("link",{name:"Feeders",exact:true}).click();
 await expect(page).toHaveURL(/\/for-feeders$/);await expect(page.getByRole("heading",{level:1})).toContainText("Know the animals");
});
test("the WhatsApp demo never writes to the record",async({page})=>{
 const writes:string[]=[];await page.route("**/api/**",async route=>{if(route.request().method()!=="GET"){writes.push(route.request().url());await route.abort();}else await route.continue();});
 await page.goto("/");
 const tour=page.getByRole("tablist",{name:"Product tour"});await tour.scrollIntoViewIfNeeded();
 for(const step of ["Field message","AI-prepared record","Evidence review","Municipal report"])await tour.getByRole("tab",{name:new RegExp(step)}).click();
 expect(writes).toEqual([]);
});
test("WhatsApp is presented honestly as not connected, without invented prices",async({page})=>{
 await page.goto("/whatsapp");await expect(page.getByText("Not connected in production yet")).toBeVisible();
 await expect(page.locator("main")).toContainText("We will not call it live until a real message has gone end to end in production.");
 await expect(page.locator("main")).not.toContainText(/₹\s?\d|\$\d|per month|\/month/);
 await page.goto("/for-ngos");await expect(page.locator("main")).toContainText("Not connected yet");
 await expect(page.locator("main")).not.toContainText(/₹\s?\d|\$\d|per month|\/month/);
});
test("Explore remains the public map and does not open an app chooser",async({page})=>{
 await page.goto("/explore");await expect(page.getByRole("combobox",{name:/Search the map/})).toBeVisible();await expect(page).toHaveURL(/\/explore/);
 await expect(page.locator(".s3-nav")).toBeVisible();await expect(page.getByRole("heading",{level:1})).toContainText("India");
 await page.getByRole("button",{name:"Needs help",exact:true}).click();await expect(page).toHaveURL(/lens=help/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
