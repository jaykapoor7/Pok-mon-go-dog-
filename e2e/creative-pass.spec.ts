import {test,expect} from "@playwright/test";
import fieldPartners from "../src/data/field-partners.json";

/* StrayPaw 3.0 landing (redesigned 31 Oct 2026). The night hero, photo
   register and WhatsApp-group story were replaced by the product-led
   homepage; these tests hold the new page to the same standards: usable at
   every width, real tap targets, keyboard access, no-JS essentials. */
for(const width of [320,390,768,1440])test(`hero and section order remain usable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto("/");await expect(page.locator("h1")).toHaveText(/Every intervention\.\s*Accounted for\./);
 for(const a of await page.locator(".s3-hero-copy .s3-actions a").all()){await expect(a).toBeInViewport();const b=await a.boundingBox();expect(b!.height).toBeGreaterThanOrEqual(44);}
 const headings=(await page.locator("main section h2").allTextContents()).map(s=>s.replace(/\s+/g," "));
 expect(headings.slice(0,4)).toEqual(["From a field message to a report a municipality can sign.","One record for the work programmes actually do.","An assistant that reads the record and does the admin.","Works with how field teams already work."]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await expect(page.locator(".s3-hero-copy .is-flame")).toHaveCount(0);
});
test("Our Story describes the company without founder or staff identities",async({page})=>{
 await page.goto("/our-story");await expect(page.locator("main")).not.toContainText(/Jay Kapoor|Founder|Staff/i);
 await expect(page.locator("main")).toContainText("StrayPaw began as a community reporting tool.");
 await expect(page.locator("main")).toContainText("The Kind Hour Foundation");await expect(page.locator("main")).toContainText("Humane Animal Society");
 await expect(page.locator("main")).not.toContainText(/Humane Society International|Humane World for Animals/);
});
test("navigation dropdown stays accessible and closes on Escape",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");
 const toggle=page.getByRole("button",{name:"Platform",exact:true});await toggle.focus();await page.keyboard.press("ArrowDown");
 await expect(toggle).toHaveAttribute("aria-expanded","true");await expect(page.locator("#s3-dd-platform a").first()).toBeFocused();
 await page.keyboard.press("Escape");await expect(toggle).toHaveAttribute("aria-expanded","false");
});
test("audiences remain one click away in the Solutions menu",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");
 await page.getByRole("button",{name:"Solutions",exact:true}).click();
 const menu=page.locator("#s3-dd-solutions");
 for(const href of ["/for-governments","/for-ngos","/solutions/abc-arv","/solutions/rescue-care","/for-funders","/for-community","/for-feeders","/education"])await expect(menu.locator(`a[href="${href}"]`)).toHaveCount(1);
});
test("FAQ opens by keyboard and the ending has one purposeful action",async({page})=>{
 await page.goto("/");const question=page.locator(".s3h-faq summary").first();await question.focus();await page.keyboard.press("Enter");await expect(page.locator(".s3h-faq details").first()).toHaveAttribute("open","");
 await expect(page.locator(".s3-foot-cta a").first()).toHaveText(/Book a demo/);await expect(page.locator(".s3-foot-cta .is-primary")).toHaveCount(1);
});
test("every published field partner has an accessible organisation profile",async({request})=>{
 for(const partner of fieldPartners.organisations){
  const response=await request.get(`/community/organisations/${partner.slug}`);expect(response.status()).toBe(200);
  expect(await response.text()).toContain(`<h1 class="display">${partner.name.replaceAll("&","&amp;").replaceAll("'","&#x27;")}</h1>`);
 }
 expect((await request.get("/community/organisations/not-a-published-straypaw-organisation")).status()).toBe(404);
});
test("essential public information and actions survive without JavaScript",async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto("/");
 await expect(page.getByRole("heading",{level:1})).toHaveText(/Every intervention\.\s*Accounted for\./);
 await expect(page.locator(".s3-hero-copy a").filter({hasText:"Request a government demo"})).toHaveAttribute("href","/demo?type=pilot");
 await page.getByText("What does it cost?",{exact:true}).click();await expect(page.locator("details").filter({hasText:"What does it cost?"})).toContainText("free");await context.close();
});
