import {fixture} from './fixture-env.mjs';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
if(!fixture)throw Error('Isolated staging fixture required');
const base=process.env.BASE??'http://localhost:3108';
async function as(role){const db=createClient(process.env.STAGING_URL,fixture.anon,{auth:{persistSession:false}});const auth=await db.auth.signInWithPassword({email:fixture.users[role].email,password:fixture.password});if(auth.error)throw auth.error;return {db,session:auth.data.session};}
const coord=await as('coord'),other=await as('other');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
let checks=0;const ok=s=>console.log(`PASS ${++checks} ${s}`);
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();
 if(process.env.QA_BYPASS_FILE){const access=JSON.parse(fs.readFileSync(process.env.QA_BYPASS_FILE,'utf8'));await page.goto(access.url??`${base}?_vercel_share=${encodeURIComponent(access.secret)}`)}
 const headers={Authorization:`Bearer ${coord.session.access_token}`};const otherHeaders={Authorization:`Bearer ${other.session.access_token}`};
 const access=await (await context.request.get(base+'/api/ai',{headers})).json();assert.equal(access.userId,fixture.users.coord.id);assert.ok(access.scope);ok('server derives actual staging user, organisation and role scope');
 const forged=await context.request.post(base+'/api/ai',{headers,data:{messages:[{role:'user',text:'Hello'}],context:{scope:'another-organisation'}}});assert.equal(forged.status(),409);ok('forged or stale workspace scope refused before processing');
 const selected={messages:[{role:'user',text:'Check this case and its evidence'}],context:{path:`/ngo/verification/${fixture.storageCase}`}};
 const read=await (await context.request.post(base+'/api/ai',{headers,data:selected})).json();assert.equal(read.engine,'tools');assert.ok(read.tools.some(t=>t.name==='current_record'&&t.ok),JSON.stringify(read));assert.equal(read.citations[0].id,fixture.storageCase);ok('selected actual case and evidence read through own scope with a real source');
 const foreign=await (await context.request.post(base+'/api/ai',{headers:otherHeaders,data:selected})).json();assert.ok(foreign.tools.some(t=>t.name==='current_record'&&!t.ok));assert.equal(foreign.citations.length,0);ok('another organisation cannot read the selected case');
 await context.addInitScript(([key,session])=>{localStorage.setItem(key,session);localStorage.setItem('straypaw.notice.storage.v1','1');localStorage.setItem('straypaw.analytics.optout','1');localStorage.setItem('straypaw.tour.v2','1')},[`sb-${fixture.ref}-auth-token`,JSON.stringify(coord.session)]);
 await page.goto(base+'/assistant');const input=page.getByRole('textbox',{name:'Message Kaju'});await expect(input).toBeEnabled();
 const marker=`STAGING TEST Kaju polish ${Date.now()}`;const before=await coord.db.from('case_updates').select('id',{head:true,count:'exact'}).eq('case_id',fixture.storageCase);if(before.error)throw before.error;
 await input.fill(`Add a note to ${fixture.storageCase}: ${marker}`);const reply=page.waitForResponse(r=>r.url().endsWith('/api/ai')&&r.request().method()==='POST');await page.getByRole('button',{name:'Send',exact:true}).click();const result=await (await reply).json();assert.equal(result.engine,'tools');const proposal=result.proposals.find(p=>p.kind==='add_note');assert.ok(proposal,JSON.stringify(result));
 const prepared=await coord.db.from('case_updates').select('id',{head:true,count:'exact'}).eq('case_id',fixture.storageCase);assert.equal(prepared.count,before.count);ok('real UI proposal never saves without confirmation');
 const card=page.getByRole('group',{name:'Prepared change'}).filter({hasText:marker});const confirm=card.getByRole('button',{name:'Confirm and save'});await expect(confirm).toBeEnabled();let posts=0;page.on('request',r=>{if(r.url().endsWith('/api/ai/act')&&r.method()==='POST')posts++});
 const action=page.waitForResponse(r=>r.url().endsWith('/api/ai/act')&&r.request().method()==='POST');await confirm.evaluate(el=>{el.click();el.click()});const saved=await (await action).json();assert.equal(saved.verified,true);await expect(card.getByText('Saved to the record',{exact:true})).toBeVisible();assert.equal(posts,1);ok('double click makes one confirmed request and independently verifies source/audit');
 const row=await coord.db.from('case_updates').select('id,note').eq('id',saved.id).single();if(row.error)throw row.error;assert.ok(row.data.note.includes(marker));ok('independent database read confirms the exact staged note');
 await page.reload();const restored=page.getByRole('group',{name:'Prepared change'}).filter({hasText:marker});await expect(restored.getByText('Saved to the record',{exact:true})).toBeVisible({timeout:20000});await expect(restored.getByRole('button',{name:'Confirm and save'})).toHaveCount(0);const after=await coord.db.from('case_updates').select('id',{head:true,count:'exact'}).eq('case_id',fixture.storageCase);assert.equal(after.count,before.count+1);ok('reload independently reads receipt; it never replays the write');
 const forbidden=await context.request.get(`${base}/api/ai/act?request=${encodeURIComponent(proposal.id)}`,{headers:otherHeaders});assert.equal((await forbidden.json()).verified,false);ok('receipt readback is isolated from another actor and organisation');
 await page.screenshot({path:'/tmp/kaju-polish-confirmed-phone.png',fullPage:true});console.log(`${checks} actual staged Kaju polish journey checks passed`);
}finally{await browser.close()}
