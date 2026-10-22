import { test, expect } from "@playwright/test";
const audiences=["Community","NGOs & Rescues","Municipalities","Feeders","Education"];
test("the audience navigation has exactly five ordered, distinct destinations",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");
 const disclosure=page.getByRole("button",{name:"Who It’s For"});await disclosure.click();
 const links=page.locator("#sp-audiences a");await expect(links.locator("span")).toHaveText(audiences);
 expect(new Set(await links.evaluateAll(els=>els.map(el=>el.getAttribute("href")))).size).toBe(5);
 await page.keyboard.press("Escape");await expect(disclosure).toBeFocused();await expect(disclosure).toHaveAttribute("aria-expanded","false");
 await disclosure.focus();await page.keyboard.press("ArrowDown");await expect(links.first()).toBeFocused();
 await links.getByText("Feeders",{exact:true}).click();await expect(page).toHaveURL(/\/for-feeders$/);await expect(page.getByRole("heading",{level:1})).toContainText("Know the animals");
});
test("the restored example stays separate from real reports and names its limits",async({page})=>{
 const writes:string[]=[];await page.route("**/api/**",async route=>{if(route.request().method()!=="GET"){writes.push(route.request().url());await route.abort();}else await route.continue();});
 await page.goto("/");
 await page.getByRole("button",{name:"Send example report",exact:true}).click();
 await expect(page.locator(".rs-record")).toContainText("Review required");
 await expect(page.locator(".request-story-note")).toContainText("Acceptance and care depend on participating teams");
 await page.locator(".request-story-steps button").nth(3).click();await expect(page.locator(".rs-city")).toBeVisible();
 await page.locator(".request-story-controls").getByRole("button",{name:"Replay",exact:true}).click();await expect(page.locator(".rs-chat")).toBeVisible();expect(writes).toEqual([]);
});
test("WhatsApp is presented as launched without invented prices",async({page})=>{
 await page.goto("/for-ngos");await expect(page.getByRole("heading",{name:"WhatsApp, connected through CareOS."})).toBeVisible();
 await expect(page.getByRole("link",{name:"Get WhatsApp access"})).toHaveAttribute("href",/WhatsApp%20CareOS%20access/);
 await expect(page.locator("main")).not.toContainText(/backend is not deployed|Concept only|waitlist/);
 await page.goto("/for-governments#pilot");await expect(page.locator("#pilot")).toContainText("four-to-six-week");await expect(page.locator("#pilot")).toContainText("fees and deliverables are agreed");
});
test("Explore remains the public map and does not open an app chooser",async({page})=>{
 await page.goto("/explore");await expect(page.getByRole("combobox",{name:/Search the map/})).toBeVisible();await expect(page).toHaveURL(/\/explore/);
 await expect(page.locator(".sp-header-cta")).toBeVisible();await expect(page.getByRole("heading",{level:1})).toContainText("India");
 await page.getByRole("button",{name:"Needs help",exact:true}).click();await expect(page).toHaveURL(/lens=help/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
