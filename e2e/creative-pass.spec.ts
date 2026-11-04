import {test,expect} from "@playwright/test";
import fieldPartners from "../src/data/field-partners.json";

/* Landing-page contracts: usable layouts, tap targets, keyboard access and
   essential server-rendered content. Assert roles and structure instead of
   freezing marketing copy or an obsolete accordion implementation. */
const H1=/Meet Kaju, the AI agent for\s*animal welfare programmes/;
for(const width of [320,390,768,1440])test(`hero and section order remain usable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto("/");await expect(page.locator("h1")).toHaveText(H1);
 for(const a of await page.locator(".s4-hero .s4-actions a").all()){await expect(a).toBeInViewport();const b=await a.boundingBox();expect(b!.height).toBeGreaterThanOrEqual(44);}
 const sections=await page.locator("main h2").evaluateAll(nodes=>nodes.map(node=>node.id));
 const keys=["proof-title","steps-title","mate-title","rec-title"];
 const positions=keys.map(id=>sections.indexOf(id));
 expect(positions.every(i=>i>=0)).toBe(true);
 expect(positions).toEqual([...positions].sort((a,b)=>a-b));
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
 const toggle=page.getByRole("button",{name:"Product",exact:true});
 /* Keyboard handlers attach on hydration; retry the keypress until they have. */
 await expect(async()=>{await toggle.focus();await page.keyboard.press("ArrowDown");await expect(toggle).toHaveAttribute("aria-expanded","true",{timeout:1000});}).toPass({timeout:15_000});await expect(page.locator("#s4-dd-platform a").first()).toBeFocused();
 await page.keyboard.press("Escape");await expect(toggle).toHaveAttribute("aria-expanded","false");
});
test("audiences remain one click away in the Solutions menu",async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto("/");
 await page.getByRole("button",{name:"Solutions",exact:true}).click();
 const menu=page.locator("#s4-dd-solutions");
 for(const href of ["/for-ngos","/for-governments","/solutions/rescue-care","/for-community","/abc-operations","/solutions/abc-arv"])await expect(menu.locator(`a[href="${href}"]`).first()).toBeVisible();
});
test("FAQ is keyboard-operable and closing actions link to real destinations",async({page})=>{
 await page.goto("/");
 const faq=page.locator(".s7-q");
 const question=faq.getByRole("button",{name:"How does pricing work?"});
 await question.focus();await page.keyboard.press("Enter");
 await expect(question).toHaveAttribute("aria-expanded","true");
 await expect(page.locator("#s7-q-8")).toBeVisible();
 await expect(page.locator("#s7-q-8")).toContainText("Pricing is agreed per programme");
 await expect(page.locator(".s4-close a[href=\"/platform\"]")).toBeVisible();
 await expect(page.locator(".s4-close a[href=\"/contact\"]")).toBeVisible();
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
 await expect(page.locator(".s7-q-row.is-open")).toContainText("Kaju is StrayPaw\'s AI agent");
 await expect(page.locator(".s4-close a[href=\"/contact\"]")).toHaveCount(1);
 await context.close();
});
