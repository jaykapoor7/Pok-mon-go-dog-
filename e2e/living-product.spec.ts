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
 await page.goto("/");await page.evaluate(()=>{const el=document.querySelector("#one-request")!;window.scrollTo(0,el.getBoundingClientRect().top+scrollY+(el.clientHeight-innerHeight)*.265);});
 const send=page.getByRole("button",{name:"Send the example report and watch StrayPaw respond"});await expect(send).toBeEnabled();await send.click();
 await expect(page.locator(".cv")).toHaveAttribute("data-phase","d",{timeout:12000});
 await expect(page.locator(".cv-disclosure")).toContainText("No guaranteed acceptance");await expect(page.locator(".cv-ev")).toContainText("Day 7");
 await page.getByRole("button",{name:"Replay the chain from the message"}).click();await expect(page.locator(".cv")).toHaveAttribute("data-phase","c");expect(writes).toEqual([]);
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
