import {test,expect} from "@playwright/test";
import fieldPartners from "../src/data/field-partners.json";
for(const width of [320,390,768,1440])test(`hero and section order remain usable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto("/");await expect(page.locator("h1")).toHaveText(/Every stray animal in India\.\s*Seen\. Tracked\. Cared\s+for\./);
 for(const a of await page.locator(".ld-hero-actions a").all()){await expect(a).toBeInViewport();const b=await a.boundingBox();expect(b!.width).toBeGreaterThanOrEqual(44);expect(b!.height).toBeGreaterThanOrEqual(44);}
 const headings=(await page.locator("main > section h1, main > section h2").allTextContents()).map(s=>s.replace(/\s+/g," "));
 expect(headings[0]).toMatch(/Every stray animal in India/);expect(headings.slice(1,6)).toEqual(["Every animal has a story.","Direct chat with the StrayPaw bot","StrayPaw in your NGO’s WhatsApp group","One request, followed to the end.","A few things to know."]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await expect(page.getByRole("button",{name:/Pause motion|Play motion/})).toHaveCount(0);
 await expect(page.locator("#world .ld-plate canvas,#world .ld-plate-fallback svg").first()).toBeVisible();
 await expect(page.locator(".rt")).toHaveCount(1);await expect(page.locator(".wa-phone")).toHaveCount(0);
 await expect(page.locator(".ld-hero-actions .is-flame")).toHaveCSS("background-color","rgb(240, 91, 64)");
 await expect(page.locator("#world")).not.toContainText("Explore the public animal record.");
 await expect(page.locator("#world")).not.toContainText("Sources & definitions");
 await expect(page.locator("#request-journey")).not.toContainText(/Archived public case|Illustrative routes|routes are illustrative|Place of care not on the public record/i);
});
test("photographic carousel loads directly from the site without a record service",async({page})=>{
 const requests:string[]=[];page.on("request",r=>{if(r.resourceType()==="image")requests.push(r.url());});
 await page.goto("/");const register=page.locator(".rx");await register.scrollIntoViewIfNeeded();
 await expect(register.locator(".rx-band")).toHaveCount(3);
 await expect(register.locator(".rx-card.is-in img").first()).toHaveAttribute("src",/^\/photos\/register\/.+\.webp$/);
 await expect.poll(()=>register.locator(".rx-card.is-in img").first().evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 const hrefs=await register.locator(".rx-tile").evaluateAll(els=>els.map(el=>el.getAttribute("href")));
 expect(hrefs.length).toBeGreaterThan(20);expect(hrefs.every(h=>/^\/animal\/[0-9a-f-]{36}$/.test(h??""))).toBe(true);
 expect(requests.filter(u=>/supabase\.co/.test(u))).toEqual([]);
 await expect(register.locator(".rx-open")).toHaveAttribute("href",/^\/animal\/[0-9a-f-]{36}$/);
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
test("every card in the swipe deck displays its own locally hosted photograph",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");const register=page.locator(".rx");await register.scrollIntoViewIfNeeded();
 await expect(register.getByRole("button")).toHaveCount(0);
 const cards=register.locator(".rx-swipe-card");await expect(cards).toHaveCount(16);
 const records=new Set<string>();
 for(let i=0;i<16;i++){
  const card=cards.nth(i);await card.scrollIntoViewIfNeeded();const photo=card.locator("img");
  await expect.poll(()=>photo.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0&&img.hasAttribute("data-loaded"))).toBe(true);
  records.add((await photo.getAttribute("src"))!);
 }
 expect(records.size).toBe(16);
});
test("the original rounded navigation returns on scroll and the dropdown stays accessible",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");await page.locator(".rx").scrollIntoViewIfNeeded();
 await expect(page.locator(".sp-header")).toHaveClass(/is-scrolled/);await expect(page.locator(".sp-header-bar")).toHaveCSS("border-radius","999px");
 const toggle=page.getByRole("button",{name:"Who It’s For",exact:true});await toggle.click();await expect(toggle).toHaveAttribute("aria-expanded","true");await expect(page.locator("#sp-audiences")).toBeVisible();await expect(page.locator("#sp-audiences a")).toHaveCount(5);
 await page.keyboard.press("Escape");await expect(toggle).toBeFocused();await expect(toggle).toHaveAttribute("aria-expanded","false");
});
test("audiences stay in the header without repeated landing sections",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");
 await page.getByRole("button",{name:"Who It’s For",exact:true}).click();
 const links=page.locator("#sp-audiences > a");const hrefs=["/for-community","/for-ngos","/for-governments","/for-feeders","/education"];
 await expect(links).toHaveCount(hrefs.length);
 for(let i=0;i<hrefs.length;i++)await expect(links.nth(i)).toHaveAttribute("href",hrefs[i]);
 await expect(page.locator(".ld-audience,.restored-partners")).toHaveCount(0);
});
test("FAQ opens by keyboard and the ending has one purposeful action",async({page})=>{
 await page.goto("/");const question=page.locator(".lx-faq summary").first();await question.focus();await page.keyboard.press("Enter");await expect(page.locator(".lx-faq details").first()).toHaveAttribute("open","");
 await expect(page.locator(".lx-end-actions a").first()).toHaveText("Report a sighting");await expect(page.locator(".lx-end-actions .is-flame")).toHaveCount(1);
});
test("the original Coimbatore hero retains its recorded geography and replay",async({page})=>{
 await page.goto("/");await expect(page.locator(".ld-meter")).toContainText("Coimbatore");
 await expect(page.locator(".ld-meter-count")).toContainText("cases");await expect(page.locator(".ld-meter-count")).toContainText("care");
 await expect(page.locator(".ld-replay")).toHaveCount(0);await expect(page.locator(".hero-record,.production-hero-art")).toHaveCount(0);
});
test("every published field partner has an accessible organisation profile",async({request})=>{
 for(const partner of fieldPartners.organisations){
  const response=await request.get(`/community/organisations/${partner.slug}`);expect(response.status()).toBe(200);
  expect(await response.text()).toContain(`<h1 class="display">${partner.name.replaceAll("&","&amp;").replaceAll("'","&#x27;")}</h1>`);
 }
 expect((await request.get("/community/organisations/not-a-published-straypaw-organisation")).status()).toBe(404);
});
test("the landing navigation blends into the hero and the WhatsApp section finishes at the checked record",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");
 await expect(page.locator(".sp-header")).toHaveClass(/is-overlay/);
 await expect(page.locator(".sp-header-bar")).toHaveCSS("background-color","rgba(0, 0, 0, 0)");
 expect(await page.locator(".ld-hero").evaluate(el=>el.getBoundingClientRect().top)).toBeLessThanOrEqual(1);
 await expect(page.locator(".faq-asterisk,.faq-ledger")).toHaveCount(0);
 await page.evaluate(()=>{const el=document.querySelector(".rt-track")!;const r=el.getBoundingClientRect();window.scrollTo({top:r.bottom+scrollY-innerHeight,behavior:"instant"});});
 /* Section 1 now ends at the checked record; the city map and replies live in later sections. */
 await expect(page.locator("#one-request .rt-rec-status")).toHaveText("Checked by a person");
 await expect(page.locator(".rt-map, .rt-city, .rt-reply")).toHaveCount(0);
});
test("reduced motion shows the whole request and removes ambient movement",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");const section=page.locator("#one-request");await section.scrollIntoViewIfNeeded();
 await expect(page.locator("#request-journey .ld-dive-day b")).toBeVisible();
 await expect(page.locator("#request-journey .is-now .ld-dive-what b")).toHaveText(/Case closed|Recovered/);
 expect(await section.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==="running").length)).toBe(0);
});
test("essential public information and actions survive without JavaScript",async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto("/");
 await expect(page.getByRole("heading",{level:1})).toHaveText(/Every stray animal in India\.\s*Seen\. Tracked\. Cared\s+for\./);
 await expect(page.locator(".ld-hero-actions a").filter({hasText:"Explore the Map"})).toHaveAttribute("href","/explore");
 await page.getByText("Is StrayPaw free to use?",{exact:true}).click();await expect(page.locator("details").filter({hasText:"Is StrayPaw free to use?"})).toContainText("Institutional programmes");await context.close();
});
