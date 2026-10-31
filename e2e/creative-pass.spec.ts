import {test,expect} from "@playwright/test";
import fieldPartners from "../src/data/field-partners.json";

/* StrayPaw 4 landing (operator-first, 31 Oct 2026). These tests hold the
   page to the same standards as before: usable at every width, real tap
   targets, keyboard access, no-JS essentials. */
const H1=/Run ABC programmes your\s*municipality can verify/;
for(const width of [320,390,768,1440])test(`hero and section order remain usable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto("/");await expect(page.locator("h1")).toHaveText(H1);
 for(const a of await page.locator(".s4-hero .s4-actions a").all()){await expect(a).toBeInViewport();const b=await a.boundingBox();expect(b!.height).toBeGreaterThanOrEqual(44);}
 const headings=(await page.locator("main h2:visible").allInnerTexts()).map(s=>s.replace(/\s+/g," ").trim());
 expect(headings.slice(0,4)).toEqual(["From capture to accepted report","StrayPaw AI works alongside your team","Give the routine checks to StrayPaw AI","Field teams report from the phone they have"]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await expect(page.locator(".s4-hero .s4-actions [class*=flame]")).toHaveCount(0);
});
test("Our Story describes the company without founder or staff identities",async({page})=>{
 await page.goto("/our-story");await expect(page.locator("main")).not.toContainText(/Jay Kapoor|Founder|Staff/i);
 await expect(page.locator("main")).toContainText("StrayPaw began as a community reporting tool.");
 await expect(page.locator("main")).toContainText("The Kind Hour Foundation");await expect(page.locator("main")).toContainText("Humane Animal Society");
 await expect(page.locator("main")).not.toContainText(/Humane Society International|Humane World for Animals/);
});
test("navigation dropdown stays accessible and closes on Escape",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");
 const toggle=page.getByRole("button",{name:"Platform",exact:true});
 /* Keyboard handlers attach on hydration; retry the keypress until they have. */
 await expect(async()=>{await toggle.focus();await page.keyboard.press("ArrowDown");await expect(toggle).toHaveAttribute("aria-expanded","true",{timeout:1000});}).toPass({timeout:15_000});await expect(page.locator("#s4-dd-platform a").first()).toBeFocused();
 await page.keyboard.press("Escape");await expect(toggle).toHaveAttribute("aria-expanded","false");
});
test("audiences remain one click away in the Solutions menu",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");
 await page.getByRole("button",{name:"Solutions",exact:true}).click();
 const menu=page.locator("#s4-dd-solutions");
 for(const href of ["/for-ngos","/solutions/abc-arv","/solutions/rescue-care","/for-governments","/for-community"])await expect(menu.locator(`a[href="${href}"]`)).toHaveCount(1);
});
test("FAQ opens by keyboard and the ending has one purposeful action",async({page})=>{
 await page.goto("/");const question=page.locator(".s4-faq summary").first();await question.focus();await page.keyboard.press("Enter");await expect(page.locator(".s4-faq details").first()).toHaveAttribute("open","");
 await expect(page.locator(".s4-close a").first()).toHaveText(/Book a demo/);await expect(page.locator(".s4-close .is-primary")).toHaveCount(1);
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
 await expect(page.getByRole("heading",{level:1})).toHaveText(H1);
 await expect(page.locator(".s4-hero a").filter({hasText:"Book a demo"})).toHaveAttribute("href","/demo");
 await page.getByText("What does it cost?",{exact:true}).click();await expect(page.locator("details").filter({hasText:"What does it cost?"})).toContainText("Pricing is agreed per programme");await context.close();
});
