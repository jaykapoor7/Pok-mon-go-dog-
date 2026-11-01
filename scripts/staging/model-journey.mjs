/** Hosted, real model + scoped tools + human-confirmed action verification. */
import {fixture} from './fixture-env.mjs';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
if(!fixture)throw Error('Isolated staging fixture required');
const base=process.env.BASE;if(!base)throw Error('Set the exact hosted staging BASE');
const bypass=process.env.QA_BYPASS_FILE?JSON.parse(fs.readFileSync(process.env.QA_BYPASS_FILE,'utf8')).secret:null;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
let n=0;const ok=m=>console.log(`PASS ${++n} ${m}`);
const db=createClient(process.env.STAGING_URL,fixture.anon,{auth:{persistSession:false}});
const {data,error}=await db.auth.signInWithPassword({email:fixture.users.coord.email,password:fixture.password});if(error)throw error;
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await context.addInitScript(([k,v])=>{localStorage.setItem(k,v);localStorage.setItem('straypaw.notice.storage.v1','1');localStorage.setItem('straypaw.analytics.optout','1');localStorage.setItem('straypaw.tour.v2','1')},[`sb-${fixture.ref}-auth-token`,JSON.stringify(data.session)]);
const headers={Authorization:`Bearer ${data.session.access_token}`};
const turns=[];
async function ask(text){turns.push({role:'user',text});const r=await context.request.post(base+'/api/ai',{headers,data:{messages:turns,context:{path:'/assistant'}}});const j=await r.json();assert.equal(r.status(),200,JSON.stringify(j));assert.equal(j.engine,'model',j.notice??j.text);turns.push({role:'assistant',text:j.text});return j;}
try{
 if(bypass){const access=await context.newPage();await access.goto(`${base}?_vercel_share=${encodeURIComponent(bypass)}`);await access.close();}
 const hello=await ask('Hello Kaju. Briefly explain how you can help with my work.');assert.ok(hello.text.length>20);ok('hosted natural chat returns actual model engine');
 const investigation=await ask('Use BOTH abc_verification_status and abc_package_status. Compare my ABC queue with visible municipal packages, identify a case needing attention and explain the recorded evidence gaps. Do not change records.');assert.ok(investigation.tools.some(t=>t.name==='abc_verification_status'&&t.ok));assert.ok(investigation.tools.some(t=>t.name==='abc_package_status'&&t.ok));assert.ok(investigation.citations.length);ok('model investigates across ABC tools with real source links');
 const follow=await ask('What should I do next about the first case you mentioned, and what can only the veterinarian authorise?');assert.ok(follow.text.length>40);assert.match(follow.text,/vet|veterinar/i);ok('natural follow-up preserves case and veterinary boundary');
 const marker=`STAGING TEST model note ${Date.now()}`;
 const before=await db.from('case_updates').select('id',{count:'exact',head:true}).eq('case_id',fixture.storageCase);if(before.error)throw before.error;
 const page=await context.newPage();await page.goto(base+'/assistant');
 await page.getByRole('textbox',{name:'Message Kaju'}).fill(`Prepare an add_note proposal on case ${fixture.storageCase}. Note text must be exactly: ${marker}. Do not save it yet.`);
 const response=page.waitForResponse(r=>r.url().endsWith('/api/ai')&&r.request().method()==='POST');await page.getByRole('button',{name:'Send',exact:true}).click();const j=await (await response).json();assert.equal(j.engine,'model',j.notice);const proposal=j.proposals.find(p=>p.kind==='add_note'&&p.caseId===fixture.storageCase);assert.ok(proposal,'Actual model must prepare the scoped action');
 const after=await db.from('case_updates').select('id',{count:'exact',head:true}).eq('case_id',fixture.storageCase);assert.equal(after.count,before.count);ok('model proposal does not mutate before human confirmation');
 const card=page.getByRole('group',{name:'Prepared change'}).filter({hasText:marker});await expect(card).toBeVisible();const saved=page.waitForResponse(r=>r.url().endsWith('/api/ai/act'));await card.getByRole('button',{name:'Confirm and save'}).click();const receipt=await (await saved).json();assert.equal(receipt.verified,true,JSON.stringify(receipt));await expect(card.getByText('Saved to the record',{exact:true})).toBeVisible();ok('human confirms in actual UI; source and audit readback verify save');
 const record=await db.from('case_updates').select('id,note').eq('id',receipt.id).single();if(record.error)throw record.error;assert.ok(record.data.note.includes(marker));ok('independent authenticated database read finds the actual note');
 const verified=await ask('Use recent_confirmed_actions to verify the latest note was actually saved. Say which source and audit you checked.');assert.ok(verified.tools.some(t=>t.name==='recent_confirmed_actions'&&t.ok));assert.ok(verified.citations.length);ok('model re-investigates completion through independently verified receipt tool');
 const checks=await ask('Run operational checks. Explain any overdue work and missing evidence, and prepare a report draft for review. Do not send notifications.');assert.ok(checks.tools.some(t=>t.name==='operations_insights'&&t.ok));assert.ok(checks.proposals.some(p=>p.kind==='report_file'&&p.source==='operations_checks'));ok('model explains deterministic findings and prepares a reviewable report');
 console.log(`${n} hosted real-model journey checks passed`);
}finally{await browser.close();}
