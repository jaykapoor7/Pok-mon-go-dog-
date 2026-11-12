/** Isolated engine tests. The model transport and record store are test doubles;
 * these prove control flow, not provider availability or deployed tenant RLS. */
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { answer, privateModelApproved, withTools } from '../src/sp3/ai/engine';
import { setInferenceLedger } from '../src/lib/ai/inference';
/* Model paths are exercised against mocked fetch only, with the gate switched on explicitly. */
const ON={STRAYPAW_AI_MODE:'model',STRAYPAW_AI_AUTHORISED_BY:'test:2026-11-03',STRAYPAW_AI_MONTHLY_CEILING_INR:'100',STRAYPAW_AI_USER_DAILY_REQUESTS:'50',STRAYPAW_AI_ORG_DAILY_REQUESTS:'50',STRAYPAW_AI_INR_PER_MTOK_IN:'420',STRAYPAW_AI_INR_PER_MTOK_OUT:'2100'} as const;
const enable=()=>{Object.assign(process.env,ON);setInferenceLedger({usage:async()=>({userToday:0,orgToday:0,monthInr:0})})};
const disable=()=>{for(const k of Object.keys(ON))delete process.env[k];setInferenceLedger(null)};
import { runTool, TOOL_DEFS, type ToolCtx } from '../src/sp3/ai/tools';
import { SKILLS } from '../src/sp3/ai/understand';
import { caseReference, caseSummaryAsked } from '../src/sp3/ai/caseSummary';
import { readFileSync } from 'node:fs';

async function main() {
let checks = 0;
const ok = (label: string) => console.log(`ok ${++checks} - ${label}`);
const calls: string[] = [];
function db(result: Record<string, unknown>) {
  const builder = new Proxy({}, { get: (_, key) => key === 'then' ? (resolve: (r: unknown) => void) => Promise.resolve(result).then(resolve) : () => builder });
  return { from: (name: string) => { calls.push(name); return builder; }, rpc: async (name: string) => { calls.push(name); return result; } } as unknown as SupabaseClient;
}
const fail: ToolCtx = { db: db({ data: null, count: null, error: { message: 'database unavailable' } }), orgId: 'isolated-test-org', userName: 'Test coordinator' };
for (const name of ['search_records', 'work_summary', 'find_missing_evidence', 'programme_report', 'abc_verification_status', 'abc_package_status', 'query_cases']) {
  const r = await runTool(name, { query: 'Kaju' }, fail);
  assert.equal(r.ok, false); assert.deepEqual(r.citations, []); ok(`${name}: failed read never becomes successful empty data`);
}
for (const q of ['summary today', 'missing evidence', 'programme report', 'ABC verification queue', 'package status', 'how many open cases']) {
  const r = await withTools(q, fail);
  assert.ok(r.tools.some(t => !t.ok)); assert.doesNotMatch(r.text, /\*\*0|0 open|No published/); ok(`router reports unknown on failed read: ${q}`);
}
const knowledge = await runTool('search_knowledge', { query: 'unknown status' }, fail);
assert.ok(knowledge.citations.some(c => c.href.includes('unknown-is-not-zero'))); ok('knowledge cites published Academy lessons');
const emptyKnowledge = await runTool('search_knowledge', { query: 'zzzzzzzzzzz' }, fail);
assert.equal(emptyKnowledge.citations.length, 0); ok('unmatched knowledge query invents no citation');
const before = calls.length;
for (const question of ['Hello Kaju', 'What can you do?', 'How can you help me?']) {
  const reply = await withTools(question, fail); assert.match(reply.text,/Hello.*Kaju/); assert.equal(reply.tools.length,0);
}
assert.equal(calls.length,before);ok('greetings and help explain real capabilities without searching or inventing records');
assert.equal((await runTool('abc_verification_status', {}, { ...fail, orgId: null })).ok, false);
assert.equal(calls.length, before); ok('ABC queue requires organisation before reading');
const rows = [{ case_id: 'test-case', case_code: 'TEST-1', missing: ['release_photo'], vet_authorised: false }];
const ctx: ToolCtx = { ...fail, db: db({ data: rows, error: null }) };
const queue = await runTool('abc_verification_status', {}, ctx);
assert.equal(queue.citations[0].href, '/ngo/verification/test-case'); assert.equal((queue.data as { limit: number }).limit, 100); ok('ABC queue uses bounded source results and exact record links');

const reportText = 'Injured dog limping near the bus stop';
const first = await answer([{ role: 'user', text: reportText }], ctx, {});
assert.match(first.text, /Tell me the city/);
const followup = await answer([{ role: 'user', text: reportText }, { role: 'assistant', text: first.text }, { role: 'user', text: 'Delhi' }], ctx, {});
assert.ok(followup.proposals.some(p => p.kind === 'open_case' && p.city === 'Delhi')); ok('city follow-up completes the prior field draft without writing');
const originalFetch = globalThis.fetch;
const originalKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = 'isolated-test-key';
enable();
const oldApproval=process.env.STRAYPAW_AI_APPROVED_DATA_ROUTE;
process.env.STRAYPAW_AI_APPROVED_DATA_ROUTE='direct:claude-opus-5-5';
let responses = 0;
let fanout = 1;
globalThis.fetch = async () => {
  responses++;
  return new Response(JSON.stringify({ id: `msg_${responses}`, type: 'message', role: 'assistant', model: 'test', stop_reason: 'tool_use', stop_sequence: null,
    content: Array.from({ length: fanout }, (_, i) => ({ type: 'tool_use', id: `tool_${responses}_${i}`, name: 'extract_field_message', input: { text: 'Animal seen in Delhi' } })),
    usage: { input_tokens: 1, output_tokens: 1 } }), { headers: { 'content-type': 'application/json' } });
};
try {
  const signed: ToolCtx = { ...ctx, userId: 'user' };
  const r = await answer([{ role: 'user', text: 'Investigate' }], signed, {});
  assert.equal(responses, 6); assert.equal(r.tools.length, 6); assert.match(r.notice ?? '', /incomplete/i); assert.doesNotMatch(r.text, /^Done/); ok('step exhaustion reports incomplete and preserves tool evidence');
  responses = 0; fanout = 13;
  const capped = await answer([{ role: 'user', text: 'Investigate' }], signed, {});
  assert.equal(responses, 1); assert.equal(capped.tools.length, 0); assert.match(capped.notice ?? '', /incomplete/i); ok('oversized tool fan-out is refused before execution');
} finally {
  if(oldApproval===undefined)delete process.env.STRAYPAW_AI_APPROVED_DATA_ROUTE;else process.env.STRAYPAW_AI_APPROVED_DATA_ROUTE=oldApproval;
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = originalKey;
  disable();
}
// Reproduce Vercel Functions: identity arrives in request context even when
// build-time VERCEL and VERCEL_OIDC_TOKEN variables are absent.
const symbol=Symbol.for('@vercel/request-context');
const globalContext=globalThis as typeof globalThis & {[key:symbol]:unknown};
const oldContext=globalContext[symbol];
const names=['ANTHROPIC_API_KEY','AI_GATEWAY_API_KEY','VERCEL_OIDC_TOKEN','VERCEL_OIDC_TOKEN_FILE','VERCEL','STRAYPAW_AI_APPROVED_DATA_ROUTE'] as const;
const saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));
let tokenVersion=1;const seen:string[]=[];
const jwt=()=>`${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,jti:`isolated-${tokenVersion}`})).toString('base64url')}.isolated`;
try{
 for(const name of names)delete process.env[name];
 globalContext[symbol]={get:()=>({headers:{'x-vercel-oidc-token':jwt()}})};
 process.env.STRAYPAW_AI_APPROVED_DATA_ROUTE='gateway:google/gemini-2.5-flash';
 let oidcCalls=0;const realFetch=globalThis.fetch;globalThis.fetch=async()=>{oidcCalls++;throw Error('no provider call while off')};
 assert.equal(await privateModelApproved({purpose:'kaju_chat',userId:'user',orgId:'org'}),false);
 assert.equal((await answer([{role:'user',text:'Hello'}],ctx,{})).engine,'tools');assert.equal(oidcCalls,0);ok('with inference off, a present OIDC identity is never used and no provider is called');
 globalThis.fetch=realFetch;enable();
 assert.equal(await privateModelApproved({purpose:'kaju_chat',userId:'user',orgId:'org'}),false);ok('OIDC needs its own explicit opt-in even when inference is on');
 process.env.STRAYPAW_AI_ALLOW_OIDC='true';
 assert.equal(await privateModelApproved({purpose:'kaju_chat',userId:'user',orgId:'org'}),true);ok('runtime request-context OIDC configures the model only after explicit enablement');
 globalThis.fetch=async(input,init)=>{
  seen.push(new Headers(input instanceof Request?input.headers:init?.headers).get('authorization')??'');
  return new Response(JSON.stringify({id:'isolated',type:'message',role:'assistant',model:'isolated',stop_reason:'end_turn',content:[{type:'text',text:'Hello. I can help with the available records.'}],usage:{input_tokens:1,output_tokens:1}}),{headers:{'content-type':'application/json'}});
 };
 assert.equal((await answer([{role:'user',text:'Hello'}],{...ctx,userId:'user'},{})).engine,'model');tokenVersion++;
 assert.equal((await answer([{role:'user',text:'Hello again'}],{...ctx,userId:'user'},{})).engine,'model');
 assert.ok(seen.every(value=>value.startsWith('Bearer ')));assert.notEqual(seen[0],seen[1]);ok('Gateway uses the current scoped token for each run rather than caching an old identity');
}finally{
 globalThis.fetch=originalFetch;if(oldContext===undefined)delete globalContext[symbol];else globalContext[symbol]=oldContext;
 for(const name of names){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}
 delete process.env.STRAYPAW_AI_ALLOW_OIDC;disable();
}
{
 const nav=await withTools('open intake',{...ctx,actorRole:'member'});assert.equal(nav.navigate?.href,'/ngo/inbox');ok('a plain navigation command opens the screen without a model');
 const conn={caller:{userId:'u',email:null,ngoId:'isolated-test-org',role:'coordinator',db:ctx.db},caps:{google:['calendar.create']}} as never;
 const visit=await withTools('schedule a field visit for Ward 14 tomorrow at 10am',{...ctx,conn});const ev=visit.proposals.find(p=>p.kind==='calendar_event') as {start:string;title:string}|undefined;
 assert.ok(ev&&ev.title.startsWith('Field visit')&&ev.start.endsWith(':30:00.000Z'));ok('a field visit is prepared for the connected calendar without a model, in IST, pending confirmation');
 assert.match((await withTools('find emails about ward 14',{...ctx,conn})).text,/Find correspondence/);ok('correspondence search is refused plainly when it was not allowed');
 const lost=await withTools('zzqx plorb',{...ctx,db:db({data:[],error:null})});assert.ok((lost as {suggestions?:string[]}).suggestions?.includes('What should I do first?'));ok('an unmatched request offers runnable next steps instead of a dead end');
}
/* Questions about cases and one case in words, without a model. The record store double answers by table and logs every read, RPC and schema. */
{
 const DAY=86_400_000,iso=(d:number)=>new Date(Date.now()-d*DAY).toISOString(),day=(d:number)=>iso(d).slice(0,10);
 const ORG='isolated-test-org',CASE='0b9a3c1e-1f2a-4c3d-9e8f-123456789abc',DOG='5d6e7f80-1a2b-4c3d-8e9f-abcdef012345';
 type Res={data?:unknown;error?:unknown;count?:number|null};
 const records=(tables:Record<string,Res>,rpcs:Record<string,Res>={})=>{
  const log={tables:[] as string[],rpcs:[] as string[],schemas:[] as string[],filters:[] as unknown[][]};
  const read=(name:string):Res=>tables[name]??{data:null,error:{message:`unexpected read of ${name}`}};
  const builder=(name:string):unknown=>{const q:unknown=new Proxy({},{get:(_,k)=>k==='then'?(res:(r:unknown)=>unknown)=>Promise.resolve(read(name)).then(res):k==='maybeSingle'?async()=>{const r=read(name);return {...r,data:Array.isArray(r.data)?r.data[0]??null:r.data??null}}:(...a:unknown[])=>{log.filters.push([name,String(k),...a]);return q}});return q};
  const store={from:(name:string)=>{log.tables.push(name);return builder(name)},rpc:async(name:string)=>{log.rpcs.push(name);return rpcs[name]??{data:null,error:{message:'no rpc'}}},schema:(s:string)=>{log.schemas.push(s);return store}};
  return {db:store as unknown as SupabaseClient,log};
 };
 const named=(log:{filters:unknown[][]},table:string)=>log.filters.some(f=>f[0]===table&&f[1]==='eq'&&f[2]==='ngo_id'&&f[3]===ORG);
 const member=(db:SupabaseClient,pagePath?:string):ToolCtx=>({db,orgId:ORG,userId:'u1',userName:'Asha',actorRole:'coordinator',pagePath});
 assert.ok(['query_cases','case_summary'].every(n=>TOOL_DEFS.some(t=>t.name===n)));ok('the case tools are offered to the model path too');

 /* Counted, listed and grouped case questions, and short follow-ups. */
 const fact=(id:string,zone:string,condition:string,holder:string|null,daysAgo:number,provenance:string|null=null)=>({id,case_code:`SPC-${id.toUpperCase()}0001`,title:null,condition_class:condition,status_class:'open',zone,city:'Chennai',assignee_id:holder?'u2':null,assignee_name:holder,animal_name:null,occurred_at:iso(daysAgo),last_activity_at:iso(daysAgo),next_due:null,provenance,reviewed_at:null});
 const facts=[fact('c1','Adyar','Road accident',null,2),fact('c2','Adyar','Skin disease','Ravi Kumar',5),fact('c3','Besant Nagar','Maggot wound',null,40),fact('c4','Adyar','Road accident',null,400,'imported_historical_record')];
 const reg=records({org_case_facts:{data:facts,error:null}});
 const counted=await withTools('How many open cases are unassigned?',member(reg.db));
 assert.equal(counted.tools[0]?.name,'query_cases');assert.match(counted.text,/\*\*2\*\* unassigned open cases/);assert.match(counted.text,/Imported history that nobody has reviewed is not included/);
 assert.deepEqual(counted.citations.map(c=>c.href).sort(),['/ngo/cases/c1','/ngo/cases/c3']);assert.ok(named(reg.log,'org_case_facts'));assert.ok(counted.suggestions?.includes('By zone'));
 ok('a case question is counted from the organisation’s own rows; unreviewed imports are left out and said to be');
 const regrouped=await withTools('by zone',member(reg.db),['How many open cases are unassigned?']);
 assert.equal(regrouped.tools[0]?.name,'query_cases');assert.match(regrouped.text,/By zone:/);assert.match(regrouped.text,/\*\*Adyar\*\*: 1/);assert.match(regrouped.text,/\*\*Besant Nagar\*\*: 1/);
 const later=await withTools('and last month?',member(reg.db),['How many open cases?']);assert.match(later.text,/open cases opened last month/);
 const moved=await withTools('by zone',member(reg.db),['How many open cases?','Thanks']);assert.notEqual(moved.tools[0]?.name,'query_cases');
 ok('a short follow-up changes the previous case question, and only the one just asked');
 const most=await withTools('who holds the most cases',member(reg.db));assert.match(most.text,/\*\*Ravi Kumar\*\* holds the most: 1\. 2 have nobody assigned\./);assert.doesNotMatch(most.text,/\*\*Unassigned\*\* holds/);
 ok('“who holds the most” names a person, and counts the cases nobody holds separately');
 const place=await withTools('how many open cases in adyr',member(reg.db));assert.match(place.text,/in Adyar/);
 const nowhere=await withTools('how many open cases in xyzzy',member(reg.db));assert.match(nowhere.text,/could not match “xyzzy”/);
 ok('a rough place word matches only a place in the records; an unmatched word is said, never guessed');
 const guestReg=records({});const guestCount=await withTools('How many open cases?',{...member(guestReg.db),orgId:null});
 assert.match(guestCount.text,/needs an organisation workspace/);assert.deepEqual(guestReg.log.tables,[]);ok('case questions need an organisation before anything is read');
 assert.ok(!(await withTools('anything pending for me?',member(reg.db))).tools.some(t=>t.name==='query_cases'));ok('a request the router already restates keeps its own route');
 const abc=await withTools('What is ABC?',member(reg.db));assert.match(abc.text,/Animal Birth Control/);assert.equal(abc.tools.length,0);
 const pkgWord=await withTools('What is a report package?',member(reg.db));assert.match(pkgWord.text,/acceptance is not payment/);assert.equal(pkgWord.tools.length,0);
 assert.ok((await withTools('Where is our submission?',member(records({}).db))).tools.some(t=>t.name==='abc_package_status'));
 assert.ok((await withTools('What is unknown status?',member(reg.db))).tools.some(t=>t.name==='search_knowledge'));
 ok('the programme’s own words are explained without a read; unknown status still cites the Academy');
 for(const s of SKILLS){const r=await withTools(s.ask,s.office?{db:records({}).db,orgId:null,userName:'L',userId:'u',actorRole:'municipal_reviewer'}:s.org?member(records({}).db):{db:records({}).db,orgId:null,userName:null});assert.doesNotMatch(r.text,/could not match/,s.ask);}
 ok('every “closest thing I can do” is a request the router answers');

 /* One case in words. */
 for(const q of ['Summarise this case','summarize the case please',"What's happening with case BLR-2041?",'status of this case','What is the status of SPC-47A86E?','Where does this case stand?','Any update on this case?','tell me about case SPA-DOG-497C3A','case summary','How is this case going?'])assert.equal(caseSummaryAsked(q),true,q);
 for(const q of ['Check this case and its evidence','What needs attention on this case?','Summarise this animal’s history',"Summarise today's work",'how many open cases','case status by zone','which case is overdue','What’s the latest case?','Add a note to SPC-47A86E: dog eating well','Follow up on SPC-47A86E tomorrow','how do I update the status of a case','Open a new case','update case SPC-47A86E to closed','what is the status of our submission'])assert.equal(caseSummaryAsked(q),false,q);
 assert.deepEqual(caseReference('status of case BLR-2041',`/ngo/cases/${CASE}`),{by:'code',value:'BLR-2041'});assert.deepEqual(caseReference('summarise this case',`/ngo/verification/${CASE}`),{by:'page',value:CASE});
 assert.deepEqual(caseReference('what is the status of the case re-opened yesterday','/ngo/work'),{by:'none'});assert.deepEqual(caseReference(`summary of ${CASE.toUpperCase()}`),{by:'id',value:CASE});
 ok('“summarise this case” and its everyday phrasings reach the case summary; checks, commands, counts and how-to questions keep their routes; a named case wins over the open page');
 const head={id:CASE,case_code:'SPC-0B9A3C1E1F2A4C3D9E8F123456789ABC',title:'Dog with a wound',condition_class:'Maggot wound',status_class:'in_progress',zone:'Adyar',city:'Chennai',assignee_name:'Ravi Kumar',dog_id:DOG,animal_name:'Ginger',straypaw_id:'SPA-DOG-ACC70743182B',occurred_at:iso(10),last_activity_at:iso(2),next_action:'Recheck the wound',provenance:null,reviewed_at:null,closure_reason:null,
  /* Fields no summary may repeat, as if a projection had leaked them. */ patient_name:'SECRET PATIENT',doses_due:97,exposure_category:'III'};
 const full=()=>records({
  org_case_facts:{data:head,error:null},cases:{data:{id:CASE,category:'sterilisation',resolution:null,outcome_note:null},error:null},
  case_updates:{data:[{id:'u1',type:'note',to_status:null,note:'Called the feeder on 98450 12345, dog eating well',actor_name:'Ravi Kumar',created_at:iso(6)},{id:'u0',type:'created',to_status:null,note:null,actor_name:'Asha',created_at:iso(10)}],error:null},
  animal_followups:{data:[{id:'f1',due_at:iso(4),status:'done',kind:'recheck',completed_at:iso(4)},{id:'f2',due_at:iso(3),status:'upcoming',kind:'dressing_change',completed_at:null}],error:null},
  medical_events:{data:[{id:'m1',kind:'sterilisation',event_date:day(8),notes:'Spay done',performed_by:'Dr Meena'}],error:null},
  abc_attestations:{data:[{kind:'vet_authorised',actor_name:'Dr Meena',note:null,created_at:iso(7),revoked_at:null}],error:null},
  report_packages:{data:[],error:null},
 },{abc_case_checklist:{data:{required:['capture_photo','surgery_record','ear_notch_photo','release_photo','release_location'],missing:['release_photo'],vet_authorised:true,evidence_reviewed:false,government_accepted:false},error:null}});
 const a=full();
 const sum=await withTools('Summarise this case',member(a.db,`/ngo/cases/${CASE}`));
 assert.equal(sum.tools[0]?.name,'case_summary');assert.equal(sum.tools[0]?.ok,true);
 for(const want of ['**SPC-0B9A3C** · Maggot wound','In progress. Held by Ravi Kumar.','Ginger (SPA-DOG-ACC707)','Adyar, Chennai','Evidence: 4 of 5 recorded; missing release photo.','Veterinary sign-off: recorded by Dr Meena','Coordinator review: not recorded.','Stage: **Needs evidence**. Next step for the field team: add the missing evidence items.','Follow-up (dressing change) was due','3 days overdue','Next action noted on the case: “Recheck the wound”','Nothing was changed'])assert.ok(sum.text.includes(want),want);
 const at=(s:string)=>sum.text.indexOf(s);assert.ok(at('Case opened (Asha)')>0&&at('Case opened')<at('Care recorded: sterilisation, Spay done (Dr Meena)')&&at('Care recorded')<at('Note: “Called the feeder')&&at('Note:')<at('Follow-up done (recheck)'));
 assert.match(sum.text,/\[phone removed\]/);assert.doesNotMatch(JSON.stringify(sum),/98450|SECRET PATIENT|patient_name|doses_due|exposure_category/);
 assert.deepEqual(sum.citations.map(c=>c.href),[`/ngo/cases/${CASE}`,`/ngo/verification/${CASE}`,`/ngo/animals/${DOG}`]);
 ok('a case summary: status and holder, animal and place, history oldest first, ABC evidence and sign-off, what is next; contact details masked; links to the record only');
 for(const said of ['','this case','current']){const r=await runTool('case_summary',{case:said},member(full().db,`/ngo/cases/${CASE}`));assert.equal((r.data as {id?:string}).id,CASE,said);}
 assert.equal((await runTool('case_summary',{case:'this case'},member(full().db,'/ngo/work'))).ok,false);
 ok('the model path’s “this case” means the case open on the page, and nothing when no case is open');
 const allowed=['org_case_facts','cases','case_updates','animal_followups','medical_events','abc_attestations','report_packages'];
 assert.ok(a.log.tables.every(t=>allowed.includes(t)),a.log.tables.join());assert.deepEqual(a.log.rpcs,['abc_case_checklist']);assert.deepEqual(a.log.schemas,[]);
 for(const t of ['org_case_facts','cases','animal_followups','abc_attestations','report_packages'])assert.ok(named(a.log,t),t);
 const people=full();const asked=await withTools("Summarise this case and the bite victim's doses",member(people.db,`/ngo/cases/${CASE}`));
 assert.match(asked.text,/Bite, patient and dose records stay with the treating hospital and never reach me/);assert.deepEqual(people.log.schemas,[]);assert.ok(people.log.tables.every(t=>allowed.includes(t)));assert.ok(!people.log.rpcs.some(r=>/^oh_|health/.test(r)));
 const src=readFileSync(new URL('../src/sp3/ai/caseSummary.ts',import.meta.url),'utf8');const body=src.slice(src.indexOf('export async function caseSummary'),src.indexOf('/* ── the summary in words'));
 assert.ok(body.length>500);assert.doesNotMatch(body,/\.schema\(|health\.|oh_|exposure|pep_|patient|dose/);
 ok('case summary reads only the animal’s case under the organisation, never the health schema, and says so when asked about people');

 const unknown=records({org_case_facts:{data:{id:CASE,case_code:null,title:null,condition_class:null,status_class:null,zone:null,city:null,assignee_name:null,dog_id:null,animal_name:null,straypaw_id:null,occurred_at:null,last_activity_at:null,next_action:null,provenance:null,reviewed_at:null,closure_reason:null},error:null},cases:{data:{id:CASE,category:'sterilisation',resolution:null,outcome_note:null},error:null}});
 const u=await withTools('status of this case',member(unknown.db,`/ngo/verification/${CASE}`));
 for(const want of ['**Status:** not recorded. Nobody holds it.','**Animal:** no animal linked. **Place:** not recorded.','date not recorded','The case history could not be read just now, so it is unknown.','Evidence could not be read just now, so it is unknown.','Veterinary sign-off: unknown (could not be read).','Stage: unknown','Follow-ups could not be read just now, so what is scheduled is unknown.','Those parts are unknown, not empty.'])assert.ok(u.text.includes(want),want);
 assert.doesNotMatch(u.text,/Nothing is recorded|No follow-up is scheduled|\*\*0\b|not recorded\.\s*$/);
 const partial=records({org_case_facts:{data:head,error:null},cases:{data:{id:CASE,category:'injury',resolution:null,outcome_note:null},error:null},medical_events:{data:[],error:null},animal_followups:{data:[],error:null}});
 const pt=await withTools('status of this case',member(partial.db,`/ngo/cases/${CASE}`));
 assert.ok(pt.text.includes('Nothing was found in the part of the history that could be read; the rest is unknown.'));assert.doesNotMatch(pt.text,/Nothing is recorded on this case yet|Evidence and veterinary sign-off/);assert.match(pt.text,/Could not be read just now: updates and notes\. That part is unknown, not empty\./);
 ok('a case with nothing filled in and failed reads says unknown and not recorded, never none or zero; a non-ABC case shows no evidence section');

 const missing=records({org_case_facts:{data:[],error:null}});
 const none=await withTools("What's happening with case BLR-2041?",member(missing.db));
 assert.match(none.text,/could not find a case matching “BLR-2041”/);assert.deepEqual(none.citations,[]);assert.doesNotMatch(none.text,/Status:/);
 assert.deepEqual(missing.log.tables,['org_case_facts']);assert.ok(missing.log.filters.some(f=>f[0]==='org_case_facts'&&f[1]==='ilike'&&f[3]==='BLR-2041%'));
 const elsewhere=await withTools('Summarise this case',member(records({org_case_facts:{data:null,error:null}}).db,`/ngo/cases/${CASE}`));assert.match(elsewhere.text,/could not find this case/);assert.deepEqual(elsewhere.citations,[]);
 const two=await withTools('status of SPC-1A2B3C',member(records({org_case_facts:{data:[{...head,id:'x1',case_code:'SPC-1A2B3C40'},{...head,id:'x2',case_code:'SPC-1A2B3C41'}],error:null}}).db));
 assert.match(two.text,/2 cases start with SPC-1A2B3C/);assert.deepEqual(two.citations.map(c=>c.id),['x1','x2']);
 ok('a case that is not found, or another organisation’s, is said to be not found; two matches are listed, never chosen');
 const broke=await withTools('Summarise this case',member(records({org_case_facts:{data:null,error:{message:'down'}}}).db,`/ngo/cases/${CASE}`));
 assert.match(broke.text,/could not be read/);assert.deepEqual(broke.citations,[]);assert.equal(broke.tools[0]?.ok,false);
 assert.equal((await runTool('case_summary',{case:'SPC-1A2B3C'},fail)).ok,false);assert.deepEqual((await runTool('case_summary',{case:'SPC-1A2B3C'},fail)).citations,[]);
 ok('a failed read of the case is a failure, never an empty summary');
 const which=records({});const ask=await withTools('summarise this case',member(which.db,'/ngo/work'));assert.match(ask.text,/Which case\?/);assert.deepEqual(which.log.tables,[]);
 const guest=records({});assert.match((await withTools('Summarise this case',{...member(guest.db,`/ngo/cases/${CASE}`),orgId:null})).text,/needs an organisation workspace/);assert.deepEqual(guest.log.tables,[]);
 ok('with no case named or open, Kaju asks which; a guest is refused before any read');
 assert.equal((await withTools('Check this case and its evidence',member(full().db,`/ngo/verification/${CASE}`))).tools[0]?.name,'current_record');ok('checking a record’s evidence keeps its own route');
}
console.log(`kaju reliability: ${checks} checks passed`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
