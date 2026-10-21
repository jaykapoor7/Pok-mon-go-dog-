import assert from "node:assert/strict";

async function main() {
  // Every request is intercepted; this test sends no email and writes no records.
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://forms-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  process.env.RESEND_API_KEY = "test-mail-key";
  const sent: { to:string; reply_to?:string; subject:string; html:string }[] = [];
  let rejectDelivery = false;
  let storageAttempts = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://api.resend.com/emails") {
      sent.push(JSON.parse(String(init?.body)));
      return Response.json(rejectDelivery ? {message:"Rejected for test"} : {id:"test-only"}, {status:rejectDelivery ? 503 : 200});
    }
    if (url.startsWith("https://forms-test.supabase.co/rest/v1/partner_applications")) {
      storageAttempts++;
      return Response.json({message:"Record service restricted"}, {status:402});
    }
    throw new Error(`Unexpected network request: ${new URL(url).origin}`);
  };
  const {POST:contact} = await import("../src/app/api/contact/route");
  const {POST:application} = await import("../src/app/api/partner-apply/route");
  const request=(body:unknown)=>new Request("http://localhost/api/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  for (const subject of ["Contact", "Request a Pilot", "Work With Us", "WhatsApp CareOS access"]) {
    const response=await contact(request({name:"<Test sender>",email:"sender@example.com",subject,message:"A mocked enquiry."}));
    assert.equal(response.status,200);assert.equal((await response.json()).delivered,true);
    const email=sent.at(-1)!;assert.equal(email.to,"jaykapoor700@gmail.com");assert.equal(email.reply_to,"sender@example.com");assert(email.subject.includes(subject));assert(email.html.includes("&lt;Test sender&gt;"));
  }
  const apply=()=>application(request({org_name:"Test organisation",email:"ngo@example.com",about:"Mocked application; do not deliver."}));
  const accepted=await apply();assert.equal(accepted.status,200);assert.equal((await accepted.json()).delivered,true);assert.equal(storageAttempts,1);assert.equal(sent.at(-1)!.to,"jaykapoor700@gmail.com");assert.equal(sent.at(-1)!.reply_to,"ngo@example.com");
  rejectDelivery=true;
  assert.equal((await contact(request({name:"Test",email:"sender@example.com",message:"Mocked failure"}))).status,503);
  assert.equal((await apply()).status,503);
  const count=sent.length;
  assert.equal((await contact(request({name:"Test",email:"invalid",message:"No delivery"}))).status,400);
  assert.equal((await application(request({org_name:"Test",email:"invalid",about:"No delivery"}))).status,400);
  assert.equal(sent.length,count);
  console.log("Contact delivery passed: Gmail routing, reply-to, HTML escaping, storage outage, provider failure and input validation. No emails sent.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
