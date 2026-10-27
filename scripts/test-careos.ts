import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { receiveWebhook, verifyWebhook } from '../src/lib/whatsapp/webhook';
import { validSignature } from '../src/lib/whatsapp/security';
import { parseWebhook, type Event } from '../src/lib/whatsapp/protocol';
import { staffCommand } from '../src/lib/whatsapp/commands';
import { isMetaMediaUrl, messagePayload, sendMeta, downloadMedia, type Outbound } from '../src/lib/whatsapp/transport';
import { META, assertCareosEnvironment } from '../src/lib/whatsapp/config';
import { runWorker } from '../src/lib/whatsapp/worker';

// No network or production credentials are used by this test. PGlite executes actual PostgreSQL/PLpgSQL.
async function main() {
const db = new PGlite();
await db.exec(readFileSync('scripts/fixtures/careos-schema.sql','utf8'));
await db.exec(readFileSync('scripts/fixtures/careos-case-facts.sql','utf8'));
try { await db.exec(readFileSync('supabase/migrations/20261027080753_whatsapp_careos_v1.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261027085732_careos_record_isolation.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261027092130_careos_audit_fixes.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261027092646_careos_dashboard_sync.sql','utf8')); }
catch(e) { console.error((e as Error).message); process.exit(1); }
let passed=0;
function check(name:string,fn:()=>unknown){fn();console.log('PASS',name);passed++;}
async function test(name:string,fn:()=>Promise<unknown>){await db.exec('update careos.contacts set rate_count=0,rate_start=now()');await fn();console.log('PASS',name);passed++;}
async function rows<T=Record<string,unknown>>(sql:string,params:unknown[]=[]){return (await db.query<T>(sql,params)).rows;}
async function scalar(sql:string,params:unknown[]=[]):Promise<unknown>{return Object.values((await rows(sql,params))[0]||{})[0];}
async function as(user:string|null,fn:()=>Promise<unknown>){
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);
 await db.exec(`set role ${user?'authenticated':'anon'}`);
 try{return await fn();}finally{await db.exec('reset role');}
}
const ngoA=randomUUID(),ngoB=randomUUID(),leadA=randomUUID(),leadB=randomUUID(),volA=randomUUID();
await db.query('insert into auth.users(id) values($1),($2),($3)',[leadA,leadB,volA]);
await db.query("insert into ngos(id,name,verified) values($1,'Synthetic NGO A',true),($2,'Synthetic NGO B',true)",[ngoA,ngoB]);
await db.query("insert into ngo_members(user_id,ngo_id,role) values($1,$2,'lead'),($3,$4,'lead'),($5,$2,'volunteer')",[leadA,ngoA,leadB,ngoB,volA]);
await as(leadA,()=>db.query('select careos_configure_route(13.01,80.20,10,true)'));
await as(leadB,()=>db.query('select careos_configure_route(28.6,77.2,10,true)'));
const config={appSecret:'synthetic-app-secret',verifyToken:'synthetic-verify-token',appId:META.appId,wabaId:META.wabaId,phoneNumberId:META.phoneNumberId,version:'v25.0',accessToken:undefined};
const request=(text:string,signature?:string)=>new Request('https://staging.invalid/api/whatsapp/webhook',{method:'POST',body:text,headers:{'x-hub-signature-256':signature||'sha256='+createHmac('sha256',config.appSecret).update(text).digest('hex')}});
const enqueue=async(events:Event[])=>{await db.exec('set role service_role');try{await db.query('select careos_enqueue($1::jsonb)',[JSON.stringify(events)]);}finally{await db.exec('reset role');}};
let seq=0;
function payload(phone:string,text:string,extra:Record<string,unknown>={}){return {object:'whatsapp_business_account',entry:[{id:String(META.wabaId),changes:[{field:'messages',value:{metadata:{phone_number_id:String(META.phoneNumberId)},messages:[{id:'wamid.synthetic.'+(++seq),from:phone,timestamp:Math.floor(Date.now()/1000).toString(),type:'text',text:{body:text},...extra}]}}]}]};}
// Network doubles exist only at the Meta boundary. Database operations use the migration functions.
const sent:Record<string,unknown>[]=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(String(init?.body)));return Response.json({messages:[{id:'wamid.out.'+sent.length}]});};
process.env.WHATSAPP_ACCESS_TOKEN='synthetic-not-a-real-token';
const adapter={rpc:async(name:string,args:Record<string,unknown>={})=>{
 if(!/^careos_[a-z_]+$/.test(name))throw new Error('bad function');
 const keys=Object.keys(args);if(!keys.every(k=>/^p_[a-z_]+$/.test(k)))throw new Error('bad parameter');
 const values=keys.map(k=>typeof args[k]==='object'&&args[k]!==null?JSON.stringify(args[k]):args[k]);
 try{
 await db.exec('set role service_role');
 const r=await rows(`select * from public.${name}(${keys.map((k,i)=>`${k} => $${i+1}`).join(',')})`,values);
 // Composite/set-returning calls vs scalar JSON/void calls.
 return {data:['careos_claim_jobs','careos_claim_outbox'].includes(name)?r:Object.values(r[0]||{})[0],error:null};
 }catch(e){return {data:null,error:{code:'local_sql',message:(e as Error).message}};}finally{await db.exec('reset role');}
}} as unknown as SupabaseClient;
async function drain(){return runWorker(adapter,45000);}
async function say(phone:string,text:string,extra:Record<string,unknown>={}){
 const body=JSON.stringify(payload(phone,text,extra));
 assert.equal((await receiveWebhook(request(body),enqueue,config)).status,200);
 const summary=await drain();assert.equal(summary.failed,0,'worker must not fail');
}
await db.exec(`create function public.synthetic_legacy_cost(p_case uuid) returns void language sql security definer as $$ update public.cases set cost_spent=999999 where id=p_case $$; grant execute on function public.synthetic_legacy_cost(uuid) to anon,authenticated;`);
await db.exec(`create function public.synthetic_legacy_note(p_case uuid) returns void language sql security definer as $$ update public.cases set outcome_note='Private dashboard note' where id=p_case $$; grant execute on function public.synthetic_legacy_note(uuid) to authenticated;`);
const citizen='919000000001',staffA='919000000002',staffB='919000000003',volPhone='919000000004';

check('GET returns exact plain-text challenge and 200',()=>{
 const r=verifyWebhook(new Request('https://staging.invalid?hub.mode=subscribe&hub.verify_token=synthetic-verify-token&hub.challenge=314159265'),config.verifyToken);
 assert.equal(r.status,200);assert.match(r.headers.get('content-type')||'',/^text\/plain/);
});
await test('GET challenge body and token/mode rejection',async()=>{
 assert.equal(await verifyWebhook(new Request('https://x.invalid?hub.mode=subscribe&hub.verify_token=synthetic-verify-token&hub.challenge=314159265'),config.verifyToken).text(),'314159265');
 assert.equal(verifyWebhook(new Request('https://x.invalid?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=1'),config.verifyToken).status,403);
 assert.equal(verifyWebhook(new Request('https://x.invalid?hub.mode=invalid&hub.verify_token=synthetic-verify-token&hub.challenge=1'),config.verifyToken).status,403);
});
await test('invalid/missing signature rejected before persistence',async()=>{
 const body=JSON.stringify(payload(citizen,'hello'));
 assert.equal((await receiveWebhook(request(body,'sha256='+'0'.repeat(64)),enqueue,config)).status,401);
 assert.equal((await receiveWebhook(request(body,'no-signature'),enqueue,config)).status,401);
 assert.equal(await scalar('select count(*)::int from careos.jobs'),0);
});
check('raw body tampering fails HMAC',()=>{
 const raw=Buffer.from('{"a": 1}');const sig='sha256='+createHmac('sha256',config.appSecret).update(raw).digest('hex');
 assert(validSignature(raw,sig,config.appSecret));assert(!validSignature(Buffer.from('{"a":1}'),sig,config.appSecret));
});
await test('invalid JSON, oversize and durable-store failure',async()=>{
 assert.equal((await receiveWebhook(request('{'),enqueue,config)).status,400);
 assert.equal((await receiveWebhook(request('a'.repeat(1024*1024+1)),enqueue,config)).status,413);
 const b=JSON.stringify(payload(citizen,'hi'));
 assert.equal((await receiveWebhook(request(b),async()=>{throw new Error('store down');},config)).status,503);
});
check('foreign WABA and phone IDs ignored',()=>{
 const b=payload(citizen,'hi');b.entry[0].id='another';assert.equal(parseWebhook(b,META.wabaId,META.phoneNumberId).length,0);
 b.entry[0].id=META.wabaId;b.entry[0].changes[0].value.metadata.phone_number_id='another';assert.equal(parseWebhook(b,META.wabaId,META.phoneNumberId).length,0);
});
await test('anonymous cannot execute transport or privileged inbox functions',async()=>{
 await assert.rejects(()=>as(null,()=>db.query("select careos_enqueue('[]')")),/permission denied/);
 await assert.rejects(()=>as(null,()=>db.query('select careos_inbox_list()')),/permission denied/);
});
await test('secure two-channel staff onboarding with phone binding',async()=>{
 for(const [user,phone] of [[leadA,staffA],[leadB,staffB],[volA,volPhone]]){
 const c=await as(user,()=>scalar('select careos_staff_link_code($1)',[phone])) as {code:string};
 await say('919000000099','LINK '+c.code);
 assert.equal(await scalar('select count(*)::int from careos.staff where user_id=$1',[user]),0);
 await say(phone,'LINK '+c.code);
 assert.equal(await scalar('select count(*)::int from careos.staff where user_id=$1',[user]),1);
 await say(phone,'LINK '+c.code); // cannot replay consumed code
 }
 assert.equal(await scalar('select count(*)::int from careos.staff'),3);
});
await test('guided report through signed webhook to existing case and inbox',async()=>{
 await say(citizen,'REPORT');await say(citizen,'YES');
 await say(citizen,'Dog has a wound near a bus stop.');
 await say(citizen,'',{type:'location',text:undefined,location:{latitude:13.01,longitude:80.20}});
 await say(citizen,'2');
 assert.equal(await scalar('select count(*)::int from cases'),0,'no case before confirmation');
 await say(citizen,'CONFIRM');
 assert.equal(await scalar('select count(*)::int from cases'),1);
 const c=(await rows('select * from cases'))[0];assert.equal(c.ngo_id,ngoA);assert.equal(c.description,null);assert.equal(c.lat,null);
 assert.equal(await scalar("select count(*)::int from careos.inbox where status='new'"),1);
});
const item=(await rows('select * from careos.inbox'))[0],tracking=String(item.tracking),caseId=String(item.linked_case_id);
await test('duplicate delivery cannot create duplicate report, audit or reply',async()=>{
 const p=payload(citizen,'STATUS '+tracking);const b=JSON.stringify(p);
 await receiveWebhook(request(b),enqueue,config);await receiveWebhook(request(b),enqueue,config);await drain();
 assert.equal(await scalar('select count(*)::int from careos.jobs where key=$1',['in:'+p.entry[0].changes[0].value.messages[0].id]),1);
 assert.equal(await scalar('select count(*)::int from cases'),1);
});
await test('cross-NGO inbox, case writes and citizen status access denied',async()=>{
 const b=await as(leadB,()=>rows('select careos_inbox_list()')) as unknown[];assert.equal(b.length,0);
 await assert.rejects(()=>as(leadB,()=>db.query('select careos_case_action($1,$2,$3,$4)',[caseId,'accept','{}',randomUUID()])),/Not authorized/);
 await say(staffB,'VIEW '+tracking);assert.match(String(sent.at(-1)?.text && (sent.at(-1)?.text as {body:string}).body),/Not authorized/);
 await say('919000000098','STATUS '+tracking);
 assert.match(String((sent.at(-1)?.text as {body:string})?.body||''),/No matching|consent|StrayPaw/);
});
await test('acceptance is confirmed, synchronizes shared case and dashboard inbox',async()=>{
 await say(staffA,'ACCEPT '+tracking);assert.equal(await scalar('select status from careos.inbox'),'new');
 await say(staffA,'CONFIRM');assert.equal(await scalar('select status from careos.inbox'),'triaged');
 const visible=await as(leadA,()=>rows('select careos_inbox_list()')) as Record<string,unknown>[];
 assert.equal(visible.length,1);const j=visible[0].careos_inbox_list as Record<string,unknown>;
 assert.equal(j.linked_case_id,caseId);assert(!JSON.stringify(j).includes(citizen),'no phone in dashboard projection');
});
await test('cross-NGO volunteer assignment and animal linking rejected atomically',async()=>{
 await say(staffA,`ASSIGN ${tracking} ${leadB}`);await say(staffA,'CONFIRM');assert.equal(await scalar('select assignee_id from cases'),null);
 const foreignDog=randomUUID();await db.query('insert into dogs(id,lat,lng,ngo_id) values($1,13.01,80.20,$2)',[foreignDog,ngoB]);
 await say(staffA,`ANIMAL ${tracking} ${foreignDog}`);await say(staffA,'CONFIRM');assert.equal(await scalar('select dog_id from cases'),null);
});
await test('assignment, private animal match and explicit animal linkage',async()=>{
 await say(staffA,`ASSIGN ${tracking} ${volA}`);await say(staffA,'CONFIRM');assert.equal(await scalar('select assignee_id from cases'),volA);
 const dog=randomUUID();await db.query("insert into dogs(id,name,lat,lng,ngo_id) values($1,'Synthetic dog',13.01,80.20,$2)",[dog,ngoA]);
 await say(staffA,`MATCH ${tracking}`);assert.match((sent.at(-1)?.text as {body:string}).body,/Suggestions only/);
 assert.equal(await scalar('select dog_id from cases'),null);
 await say(staffA,`ANIMAL ${tracking} ${dog}`);await say(staffA,'CONFIRM');assert.equal(await scalar('select dog_id from cases'),dog);
});
await test('volunteer permitted rescue but forbidden medical and expense actions',async()=>{
 await say(volPhone,`RESCUE ${tracking} Safely transported`);await say(volPhone,'CONFIRM');assert.equal(await scalar('select stage from cases'),'rescued');
 await say(volPhone,`TREAT ${tracking} Not allowed`);await say(volPhone,'CONFIRM');assert.equal(await scalar('select count(*)::int from medical_events'),0);
});
await test('treatment, vaccination, sterilisation and INR expenses persist in existing tables',async()=>{
 for(const verb of ['TREAT','VACCINATE','STERILISE']){await say(staffA,`${verb} ${tracking} Recorded by vet`);await say(staffA,'CONFIRM');}
 await say(staffA,`EXPENSE ${tracking} 250.50 Vet receipt`);await say(staffA,'CONFIRM');
 assert.equal(await scalar('select count(*)::int from medical_events'),3);
 assert.equal(Number(await scalar('select cost_spent from cases')),250.5);
 assert.equal(await scalar('select vaccinated from dogs where ngo_id=$1',[ngoA]),true);
 assert.equal(await scalar('select sterilised from dogs where ngo_id=$1',[ngoA]),true);
 assert((await rows('select * from animal_timeline_events')).every(x=>x.visibility==='private'));
 assert(!(await rows('select * from medical_events')).some(x=>String(x.notes).includes('Recorded by vet')));
});
await test('follow-up blocks closure until completed, then closure notifies citizen',async()=>{
 const due=new Date(Date.now()+60*60*1000).toISOString();
 await say(staffA,`FOLLOWUP ${tracking} ${due} Check wound`);await say(staffA,'CONFIRM');
 assert.equal(await scalar('select count(*)::int from animal_followups'),1);
 await say(staffA,`CLOSE ${tracking} recovered Vet confirmed recovery`);await say(staffA,'CONFIRM');assert.notEqual(await scalar('select status from cases'),'closed');
 const id=String(await scalar('select id from animal_followups'));
 await say(volPhone,`DONE ${tracking} ${id}`);await say(volPhone,'CONFIRM');
 await say(staffA,`CLOSE ${tracking} recovered Vet confirmed recovery`);await say(staffA,'CONFIRM');
 assert.equal(await scalar('select status from cases'),'closed');
 assert(sent.some(s=>s.to===citizen&&String((s.text as {body:string})?.body).includes('closed')));
});
await test('reopening and dashboard case projection reflect current state',async()=>{
 await say(staffA,`REOPEN ${tracking} Needs review`);await say(staffA,'CONFIRM');
 assert.equal(await scalar('select status from cases'),'in_progress');
 const c=await as(leadA,()=>rows('select status from org_case_facts where id=$1',[caseId])) as {status:string}[];assert.equal(c[0].status,'in_progress');
 const notes=await as(leadA,()=>rows('select careos_case_notes($1)',[caseId])) as unknown[];assert(notes.length>0);
});
await test('outbox delivery receipts monotonic and duplicate-safe',async()=>{
 const o=(await rows("select * from careos.outbox where state='sent' and phone=$1 limit 1",[citizen]))[0];
 const receipt=(status:string,ts:number)=>({object:'whatsapp_business_account',entry:[{id:String(META.wabaId),changes:[{field:'messages',value:{metadata:{phone_number_id:String(META.phoneNumberId)},statuses:[{id:o.meta_id,recipient_id:citizen,status,timestamp:String(ts)}]}}]}]});
 for(const [status,t] of [['read',100],['sent',90],['delivered',110]] as const){const b=JSON.stringify(receipt(status,Math.floor(Date.now()/1000)+t));await receiveWebhook(request(b),enqueue,config);await drain();}
 assert.equal(await scalar('select state from careos.outbox where id=$1',[o.id]),'read');
});
await test('opt-out blocks later notifications and Hindi intake works',async()=>{
 await say(citizen,'STOP');assert.equal(await scalar('select consent from careos.contacts where phone=$1',[citizen]),false);
 await say(staffA,`NOTE ${tracking} checked`);await say(staffA,'CONFIRM');
 await say('919000000005','HI');await say('919000000005','REPORT');
 assert.match((sent.at(-1)?.text as {body:string}).body,/[ऀ-ॿ]/);
});
check('24-hour compliance requires approved template; never falls back to free text',()=>{
 const old={phone:citizen,body:'Case update',notice:'closed',buttons:[],language:'en',last_inbound:new Date(Date.now()-25*3600000).toISOString()} as unknown as Outbound;
 assert.equal(messagePayload(old,Date.now(),''),null);
 const t=messagePayload(old,Date.now(),JSON.stringify({'closed:en':{name:'synthetic_approved_template',language:'en'}}));assert.equal(t?.type,'template');
});
check('long confirmation falls back to full text and template parameters normalize whitespace',()=>{
 const row={phone:citizen,body:'अ'.repeat(1025),notice:'reply',buttons:[{id:'confirm_report',title:'Confirm'}],language:'hi',last_inbound:new Date().toISOString()} as Outbound;
 const payload=messagePayload(row);assert.equal(payload?.type,'text');assert.equal((payload?.text as {body:string}).body,row.body);
 const old={...row,body:'SP-123456789ABC\n  Case update',notice:'closed',last_inbound:new Date(Date.now()-25*3600000).toISOString()};
 const p=messagePayload(old,Date.now(),JSON.stringify({'closed:hi':{name:'synthetic_approved_template',language:'hi'}}));
 const t=p?.template as {components:{parameters:{text:string}[]}[]};assert.equal(t.components[0].parameters[0].text,'SP-123456789ABC Case update');
});
await test('failed sends distinguish explicit rejection, permanent failure, and ambiguous acceptance',async()=>{
 const row={phone:citizen,body:'hello',notice:'reply',buttons:[],language:'en',last_inbound:new Date().toISOString()} as unknown as Outbound;
 await assert.rejects(()=>sendMeta(row,async()=>Response.json({error:{code:130429}},{status:429})),e=>Boolean((e as {retryable?:boolean}).retryable));
 await assert.rejects(()=>sendMeta(row,async()=>Response.json({error:{code:190}},{status:401})),e=>!(e as {retryable?:boolean}).retryable);
 await assert.rejects(()=>sendMeta(row,async()=>{throw new Error('timeout');}),e=>Boolean((e as {uncertain?:boolean}).uncertain));
});
check('media URLs cannot exfiltrate bearer tokens to arbitrary hosts',()=>{
 assert(isMetaMediaUrl('https://lookaside.fbsbx.com/whatsapp_business/attachments/x'));
 for(const u of ['http://lookaside.fbsbx.com/x','https://evil.invalid/x','https://lookaside.fbsbx.com.evil.invalid','https://user:password@lookaside.fbsbx.com/x'])assert(!isMetaMediaUrl(u));
});
await test('revoked NGO membership invalidates an already linked staff phone',async()=>{
 await db.query('delete from ngo_members where user_id=$1',[leadB]);
 await say(staffB,'MY');assert.equal(await scalar('select count(*)::int from careos.staff where phone=$1',[staffB]),0);
});
await test('anonymous cannot read private storage metadata or transport tables',async()=>{
 await assert.rejects(()=>as(null,()=>db.query('select * from careos.contacts')),/permission denied/);
 await assert.rejects(()=>as(leadA,()=>db.query('select * from careos.outbox')),/permission denied/);
 assert.equal(await scalar("select public from storage.buckets where id='careos-private'"),false);
});

await test('legacy definer APIs cannot bypass CareOS tenant checks',async()=>{
 await assert.rejects(()=>as(null,()=>db.query('select synthetic_legacy_cost($1)',[caseId])),/Not authorized/);
 await assert.rejects(()=>as(leadB,()=>db.query('select synthetic_legacy_cost($1)',[caseId])),/Not authorized/);
 assert.notEqual(Number(await scalar('select cost_spent from cases where id=$1',[caseId])),999999);
});

await test('captionless photo stays private in the draft until text and confirmation',async()=>{
 const phone='919000000081';await say(phone,'REPORT');await say(phone,'YES');
 // Exercise the real processor with worker-enriched media, without a network double for storage.
 const body=JSON.stringify(payload(phone,''));await receiveWebhook(request(body),enqueue,config);
 const jobs=await rows('select * from careos_claim_jobs(20)');const job=jobs.find(x=>(x.payload as {from:string}).from===phone)!;
 await db.query('select careos_process_job($1,$2,$3)',[job.id,job.lease,JSON.stringify({media:{id:'123456',path:'synthetic/123456',kind:'image',mime:'image/jpeg'}})]);
 assert.equal(await scalar("select jsonb_array_length(state->'media') from careos.contacts where phone=$1",[phone]),1);
 await say(phone,'Dog is limping');
 assert.equal(await scalar("select jsonb_array_length(state->'media') from careos.contacts where phone=$1",[phone]),1);
 assert.equal(await scalar("select state->>'step' from careos.contacts where phone=$1",[phone]),'location');
 await say(phone,'CANCEL');
});
await test('queued private staff reply is blocked after role revocation',async()=>{
 await db.query("select careos.say($1,$2,$3)",[staffA,tracking+' private report and GPS','synthetic:revoked-send']);
 await db.query('delete from ngo_members where user_id=$1',[leadA]);
 await rows('select * from careos_claim_outbox(20)');
 assert.equal(await scalar("select state from careos.outbox where key='synthetic:revoked-send'"),'blocked');
 await db.query("insert into ngo_members(user_id,ngo_id,role) values($1,$2,'lead')",[leadA,ngoA]);
});


await test('existing authenticated dashboard writes queue a private reporter status update',async()=>{
 await say(citizen,'START'); await say(citizen,'YES');
 const before=Number(await scalar("select count(*) from careos.outbox where key like 'dashboard:%'"));
 await as(leadA,()=>db.query("select synthetic_legacy_note($1)",[caseId]));
 assert(Number(await scalar("select count(*) from careos.outbox where key like 'dashboard:%'"))>before);
 assert.equal(Number(await scalar("select count(*) from careos.outbox where body like '%Private dashboard note%'")),0);
 assert(Number(await scalar("select count(*) from careos.audit where action='dashboard_cases'"))>0);
});

await test('every transport RPC remains inaccessible to anonymous clients',async()=>{
 const rowsAllowed=await rows("select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'careos_%' and p.proname<>'careos_record_access' and has_function_privilege('anon',p.oid,'execute')");
 assert.equal(rowsAllowed.length,0);
});
await test('same-contact batches preserve enqueue order and concurrent claims do not overlap',async()=>{
 const phone='919000000020';
 const p=payload(phone,'REPORT');const second=payload(phone,'YES').entry[0].changes[0].value.messages[0];
 p.entry[0].changes[0].value.messages.push(second);
 const body=JSON.stringify(p);await receiveWebhook(request(body),enqueue,config);
 const one=await rows('select * from careos_claim_jobs(20)');
 assert.equal(one.filter(x=>(x.payload as {from:string}).from===phone).length,1);
 const first=one.find(x=>(x.payload as {from:string}).from===phone)!;
 assert.equal((first.payload as {text:string}).text,'REPORT');
 const two=await rows('select * from careos_claim_jobs(20)');assert.equal(two.length,0);
 await db.query("update careos.jobs set state='pending' where id=$1",[first.id]);
 await drain();
 assert.equal(await scalar("select state->>'step' from careos.contacts where phone=$1",[phone]),'description');
});
await test('stale processing leases cannot replay confirmed changes',async()=>{
 const id=randomUUID();await assert.rejects(()=>db.query('select careos_process_job($1,$2)',[id,randomUUID()]),/Lease lost/);
});
await test('same request ID cannot double-add expenses',async()=>{
 const key=randomUUID();const args=[caseId,'expense',JSON.stringify({amount:100,note:'Synthetic receipt'}),key];
 const before=Number(await scalar('select cost_spent from cases where id=$1',[caseId]));
 await as(leadA,()=>db.query('select careos_case_action($1,$2,$3,$4)',args));
 await as(leadA,()=>db.query('select careos_case_action($1,$2,$3,$4)',args));
 assert.equal(Number(await scalar('select cost_spent from cases where id=$1',[caseId])),before+100);
});
await test('uncovered report waits privately and later routes without losing its tracking ID',async()=>{
 const phone='919000000021';await say(phone,'REPORT');await say(phone,'YES');await say(phone,'Dog needs help');
 await say(phone,'',{type:'location',text:undefined,location:{latitude:19.07,longitude:72.87}});await say(phone,'3');await say(phone,'CONFIRM');
 const report=(await rows('select * from careos.inbox where phone=$1',[phone]))[0];
 assert.equal(report.ngo_id,null);assert.equal(report.linked_case_id,null);
 await as(leadA,()=>db.query('select careos_configure_route(19.07,72.87,10,true)'));
 await drain();
 const routed=(await rows('select * from careos.inbox where id=$1',[report.id]))[0];assert.equal(routed.ngo_id,ngoA);assert.equal(routed.tracking,report.tracking);assert(routed.linked_case_id);
 await as(leadA,()=>db.query('select careos_configure_route(13.01,80.2,10,true)'));
});
await test('decline requires a reason and records no invented rescue outcome',async()=>{
 const report=(await rows('select * from careos.inbox where phone=$1',['919000000021']))[0];
 await as(leadA,()=>db.query('select careos_case_action($1,$2,$3,$4)',[report.linked_case_id,'reject',JSON.stringify({note:'Outside current team capacity'}),randomUUID()]));
 const c=(await rows('select status,closure_reason,status_class from cases where id=$1',[report.linked_case_id]))[0];
 assert.equal(c.status,'closed');assert.equal(c.closure_reason,'not_attended');assert.equal(c.status_class,'not_attended');
});
await test('unverified NGO cannot enable routing, even with a lead membership',async()=>{
 await db.query('update ngos set verified=false where id=$1',[ngoA]);
 await assert.rejects(()=>as(leadA,()=>db.query('select careos_configure_route(13.01,80.2,10,true)')),/Team lead required/);
 await db.query('update ngos set verified=true where id=$1',[ngoA]);
});
await test('private media remains inaccessible under a permissive pre-existing storage policy',async()=>{
 await db.query("insert into storage.objects(bucket_id,name) values('careos-private','synthetic-private'),('sightings','synthetic-public')");
 const visible=await as(null,()=>rows('select name from storage.objects')) as {name:string}[];
 assert.deepEqual(visible.map(x=>x.name),['synthetic-public']);
 const media={id:'12345',kind:'image',path:'synthetic/private',url:'/api/whatsapp/media/12345',sensitive:true};
 await db.query('update careos.inbox set media=$1::jsonb where id=$2',[JSON.stringify([media]),item.id]);
 const path=await as(leadA,()=>scalar("select careos_media_path('12345')"));assert.equal(path,'synthetic/private');
 await assert.rejects(()=>as(volA,()=>db.query("select careos_media_path('12345')")),/Not authorized/);
});
await test('rate-limited users can still opt out immediately',async()=>{
 await db.query('update careos.contacts set consent=true,rate_count=50,rate_start=now() where phone=$1',[citizen]);
 await say(citizen,'STOP');assert.equal(await scalar('select consent from careos.contacts where phone=$1',[citizen]),false);
});
await test('follow-up reminders, escalation and daily digests are deduplicated',async()=>{
 await db.query("update careos.inbox set status='new',received_at=now()-interval '2 hours',escalated_at=null where id=$1",[item.id]);
 await db.query("insert into animal_followups(ngo_id,case_id,due_at) values($1,$2,now()+interval '1 hour')",[ngoA,caseId]);
 await db.query('select careos_automations()');
 const count=await scalar("select count(*)::int from careos.outbox where key like 'reminder:%' or key like 'escalation:%' or key like 'digest:%'");
 await db.query('select careos_automations()');
 assert.equal(await scalar("select count(*)::int from careos.outbox where key like 'reminder:%' or key like 'escalation:%' or key like 'digest:%'"),count);
 assert(await scalar('select escalated_at from careos.inbox where id=$1',[item.id]));
});
await test('delivery arriving before the send commit is reconciled',async()=>{
 await drain();
 await db.query("select careos.say($1,'Synthetic early receipt','synthetic-early')",[staffA]);
 const out=await rows('select * from careos_claim_outbox(20)');const early=out.find(o=>o.body==='Synthetic early receipt')!;
 assert(early);
 const e:Event={key:'status:early',kind:'status',payload:{id:'wamid.early',recipient:staffA,status:'delivered',timestamp:Math.floor(Date.now()/1000)}};
 await enqueue([e]);const jobs=await rows('select * from careos_claim_jobs(20)');
 for(const j of jobs)await db.query('select careos_process_job($1,$2)',[j.id,j.lease]);
 await db.query("select careos_finish_outbox($1,$2,'sent','wamid.early')",[early.id,early.lease]);
 assert.equal(await scalar('select state from careos.outbox where id=$1',[early.id]),'delivered');
});
await test('explicit 429 retry leases are bounded; expired sends are uncertain',async()=>{
 await db.query("select careos.say($1,'Ambiguous send','synthetic-ambiguous')",[staffA]);
 await db.query('select * from careos_claim_outbox(20)');
 await db.query("select careos.say($1,'Retry this','synthetic-retry')",[staffA]);
 // Other claimed sends are intentionally expired to prove the uncertain boundary.
 await db.query("update careos.outbox set lease_until=now()-interval '1 second' where state='sending'");
 let r=(await rows('select * from careos_claim_outbox(20)')).find(x=>x.body==='Retry this')!;assert(r);
 for(let attempt=1;attempt<=5;attempt++){
  await db.query("select careos_finish_outbox($1,$2,'pending',null,'meta_130429')",[r.id,r.lease]);
  if(attempt<5){await db.query('update careos.outbox set available_at=now() where id=$1',[r.id]);r=(await rows('select * from careos_claim_outbox(20)')).find(x=>x.id===r.id)!;assert(r);}
 }
 assert.equal(await scalar("select state from careos.outbox where key='synthetic-retry'"),'failed');
 assert(Number(await scalar("select count(*)::int from careos.outbox where state='uncertain'"))>0);
});
await test('media download obeys host, MIME and binary size checks',async()=>{
 let calls=0;
 const fetcher:typeof fetch=async()=>{calls++;return calls===1?Response.json({url:'https://lookaside.fbsbx.com/file',mime_type:'image/jpeg',file_size:3}):new Response(new Uint8Array([1,2,3]));};
 const media=await downloadMedia('123','wamid.safe',fetcher);assert.equal(media.bytes.length,3);assert(!media.path.includes(citizen));
 await assert.rejects(()=>downloadMedia('123','wamid.safe',async()=>Response.json({url:'https://evil.invalid/file',mime_type:'image/jpeg'})),/media_not_supported/);
 await assert.rejects(()=>downloadMedia('123','wamid.safe',async()=>Response.json({url:'https://lookaside.fbsbx.com/file',mime_type:'image/jpeg',file_size:17000000})),/media_not_supported/);
});

check('preview and accidental production credential use fail closed',()=>{
 process.env.CAREOS_ENABLED='true';process.env.CAREOS_SUPABASE_PROJECT_REF='toujthlzjmhmoyykmayx';process.env.NEXT_PUBLIC_SUPABASE_URL='https://toujthlzjmhmoyykmayx.supabase.co';process.env.VERCEL_ENV='preview';process.env.CAREOS_ALLOW_PRODUCTION='true';
 assert.throws(assertCareosEnvironment,/guard/);
 delete process.env.CAREOS_ALLOW_PRODUCTION;delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

globalThis.fetch=originalFetch;delete process.env.WHATSAPP_ACCESS_TOKEN;
await db.close();
console.log(`\n${passed} CareOS checks passed. Meta and storage network calls were not live; PostgreSQL workflow executed locally.`);

}
main().catch(e=>{ console.error(e.message); process.exitCode=1; });
