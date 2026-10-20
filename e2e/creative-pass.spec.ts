import {test,expect} from "@playwright/test";
for(const width of [320,390,768,1440])test(`hero and section order remain usable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto("/");await expect(page.locator("h1")).toHaveText("Street-animal care, connected.");
 for(const a of await page.locator(".production-hero-copy .sw-acts a").all()){await expect(a).toBeInViewport();const b=await a.boundingBox();expect(b!.width).toBeGreaterThanOrEqual(44);expect(b!.height).toBeGreaterThanOrEqual(44);}
 const headings=(await page.locator("main > section h1, main > section h2").allTextContents()).map(s=>s.replace(/\s+/g," "));
 expect(headings.slice(0,5)).toEqual(["Street-animal care, connected.","Every animal has a story.","One report. A connected record.","One request, followed to the end.","Better together."]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await expect(page.getByRole("button",{name:/Pause motion|Play motion/})).toHaveCount(0);
 await expect(page.locator("#world .wd-map,#world canvas")).toHaveCount(0);
 await expect(page.locator(".cv")).toHaveCount(1);await expect(page.locator(".wa-phone")).toHaveCount(0);
});
test("reduced motion shows the complete original request and removes ambient movement",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");const section=page.locator("#one-request");await section.scrollIntoViewIfNeeded();
 await expect(section.locator(".cv-ev")).toBeVisible();await expect(section).toContainText("Day 7");
 await expect(page.locator("#request-journey .ld-dive-day b")).toBeVisible();
 expect(await section.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==="running").length)).toBe(0);
});
test("essential public information and actions survive without JavaScript",async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto("/");
 await expect(page.getByRole("heading",{level:1})).toHaveText("Street-animal care, connected.");
 await expect(page.locator(".production-hero-copy a").filter({hasText:"Explore the Map"})).toHaveAttribute("href","/explore");
 await page.getByText("Is StrayPaw free to use?",{exact:true}).click();await expect(page.locator("details").filter({hasText:"Is StrayPaw free to use?"})).toContainText("Institutional programmes");await context.close();
});
