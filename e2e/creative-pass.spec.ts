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
 await expect(page.locator(".hero-pilot")).toHaveCSS("background-color","rgb(255, 138, 61)");
 await expect(page.locator("#world")).not.toContainText("Explore the public animal record.");
 await expect(page.locator("#world")).not.toContainText("Sources & definitions");
 await expect(page.locator("#request-journey")).not.toContainText(/Archived public case|Illustrative routes|routes are illustrative|Place of care not on the public record/i);
});
test("photographic carousel loads directly from the site without a record service",async({page})=>{
 const requests:string[]=[];page.on("request",r=>{if(r.resourceType()==="image")requests.push(r.url());});
 await page.goto("/");const register=page.locator(".rx");await register.scrollIntoViewIfNeeded();
 await expect(register.locator(".rx-band")).toHaveCount(3);
 await expect(register.locator(".rx-card.is-in img")).toHaveAttribute("src",/^\/photos\/register\/.+\.webp$/);
 await expect.poll(()=>register.locator(".rx-card.is-in img").evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 const hrefs=await register.locator(".rx-tile").evaluateAll(els=>els.map(el=>el.getAttribute("href")));
 expect(hrefs.length).toBeGreaterThan(20);expect(hrefs.every(h=>/^\/animal\/[0-9a-f-]{36}$/.test(h??""))).toBe(true);
 expect(requests.filter(u=>/supabase\.co/.test(u))).toEqual([]);
 await expect(register.locator(".rx-deck a")).toHaveAttribute("href",/^\/animal\/[0-9a-f-]{36}$/);
 for(const band of await register.locator(".rx-band").all()){
  const covered=await band.evaluate(el=>el.lastElementChild!.lastElementChild!.getBoundingClientRect().right>=el.getBoundingClientRect().right);
  expect(covered).toBe(true);
 }
});
test("Our Story describes the company without founder or staff identities",async({page})=>{
 await page.goto("/our-story");await expect(page.locator("main")).not.toContainText(/Jay Kapoor|Founder|Staff/i);
 await expect(page.locator("main")).toContainText("StrayPaw began as a community reporting tool.");
 await expect(page.locator("main")).toContainText("The Kind Hour Foundation");await expect(page.locator("main")).toContainText("Humane Animal Society");
 await expect(page.locator("main")).not.toContainText(/Humane Society International|Humane World for Animals/);
});
test("every flipping card displays its own locally hosted photograph",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");const register=page.locator(".rx");await register.scrollIntoViewIfNeeded();
 const records=new Set<string>();
 for(let i=0;i<16;i++){
  const photo=register.locator(".rx-card.is-in img");await expect(photo).toBeVisible();
  await expect.poll(()=>photo.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0&&img.hasAttribute("data-loaded"))).toBe(true);
  await expect(photo).toHaveCSS("opacity","1");records.add((await photo.getAttribute("src"))!);
  await register.getByRole("button",{name:"Next dog",exact:true}).click();
 }
 expect(records.size).toBe(16);
});
test("the original rounded navigation returns on scroll and the dropdown stays accessible",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");await page.locator(".rx").scrollIntoViewIfNeeded();
 await expect(page.locator(".sp-header")).toHaveClass(/is-scrolled/);await expect(page.locator(".sp-header-bar")).toHaveCSS("border-radius","999px");
 const toggle=page.getByRole("button",{name:"Who It’s For",exact:true});await toggle.click();await expect(toggle).toHaveAttribute("aria-expanded","true");await expect(page.locator("#sp-audiences")).toBeVisible();await expect(page.locator("#sp-audiences a")).toHaveCount(5);
 await page.keyboard.press("Escape");await expect(toggle).toBeFocused();await expect(toggle).toHaveAttribute("aria-expanded","false");
});
test("each shared-record role opens a concrete app action",async({page})=>{
 await page.goto("/");const roles=[["Community","/community/report"],["NGOs & Rescues","/ngo"],["Municipalities","/contact?subject=Request%20a%20Pilot"],["Feeders","/explore"],["Education","/learn/resources"]];
 for(const [name,href] of roles){await page.getByRole("tab",{name,exact:true}).click();await expect(page.locator("#people-panel .care-primary")).toHaveAttribute("href",href);await expect(page.locator("#people-panel .care-actions a")).toHaveCount(3);}
 await expect(page.locator(".care-partners a")).toHaveCount(10);
});
test("FAQ opens by keyboard and the ending has one purposeful action",async({page})=>{
 await page.goto("/");const question=page.locator(".production-faq summary").first();await question.focus();await page.keyboard.press("Enter");await expect(page.locator(".production-faq details").first()).toHaveAttribute("open","");
 await expect(page.locator(".production-close a")).toHaveCount(1);await expect(page.locator(".production-close a")).toHaveText("Work With Us");
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
