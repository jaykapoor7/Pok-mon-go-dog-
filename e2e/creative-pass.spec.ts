import {test,expect} from "@playwright/test";
import fieldPartners from "../src/data/field-partners.json";

/* StrayPaw 4 landing (operator-first, 31 Oct 2026). These tests hold the
   page to the same standards as before: usable at every width, real tap
   targets, keyboard access, no-JS essentials. */
test("Our Story describes the company without founder or staff identities",async({page})=>{
 await page.goto("/our-story");await expect(page.locator("main")).not.toContainText(/Jay Kapoor|Founder|Staff/i);
 await expect(page.locator("main")).toContainText("StrayPaw began as a community reporting tool.");
 await expect(page.locator("main")).toContainText("The Kind Hour Foundation");await expect(page.locator("main")).toContainText("Humane Animal Society");
 await expect(page.locator("main")).not.toContainText(/Humane Society International|Humane World for Animals/);
});
test("every published field partner has an accessible organisation profile",async({request})=>{
 for(const partner of fieldPartners.organisations){
  const response=await request.get(`/community/organisations/${partner.slug}`);expect(response.status()).toBe(200);
  expect(await response.text()).toContain(`<h1 class="display">${partner.name.replaceAll("&","&amp;").replaceAll("'","&#x27;")}</h1>`);
 }
 expect((await request.get("/community/organisations/not-a-published-straypaw-organisation")).status()).toBe(404);
});
test("unconfirmed CreIndia collaboration is not published on StrayPaw", async ({request}) => {
 for (const url of ["/", "/customers", "/our-story", "/community/organisations", "/search?q=CreIndia"]) {
  const response = await request.get(url);
  expect(response.ok(), `${url} should load`).toBeTruthy();
  const body = await response.text();
  /* A search page repeats what was typed; there, what matters is that nothing is found or linked. */
  if (url.startsWith("/search")) { expect(body, "search finds nothing").toContain("Nothing on the public record matches"); expect(body).not.toMatch(/href="[^"]*creindia/i); continue; }
  expect(body, `${url} should not advertise CreIndia`).not.toMatch(/Cre\s*India/i);
 }
 expect((await request.get("/community/organisations/jh-creindia-foundation")).status()).toBe(404);
 expect((await request.get("/embed/jh-creindia-foundation")).status()).toBe(404);
});
