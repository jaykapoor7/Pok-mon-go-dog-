/** Isolated engine tests. The model transport and record store are test doubles;
 * these prove control flow, not provider availability or deployed tenant RLS. */
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { answer, privateModelApproved, withTools } from '../src/sp3/ai/engine';
import { setInferenceLedger } from '../src/lib/ai/inference';
/* Model paths are exercised against mocked fetch only, with the gate switched on explicitly. */
const ON={STRAYPAW_AI_MODE:'model',STRAYPAW_AI_AUTHORISED_BY:'test:2026-11-03',STRAYPAW_AI_MONTHLY_CEILING_INR:'100',STRAYPAW_AI_USER_DAILY_REQUESTS:'50',STRAYPAW_AI_ORG_DAILY_REQUESTS:'50'} as const;
const enable=()=>{Object.assign(process.env,ON);setInferenceLedger({usage:async()=>({userToday:0,orgToday:0,monthInr:0})})};
const disable=()=>{for(const k of Object.keys(ON))delete process.env[k];setInferenceLedger(null)};
import { runTool, type ToolCtx } from '../src/sp3/ai/tools';

async function main() {
let checks = 0;
const ok = (label: string) => console.log(`ok ${++checks} - ${label}`);
const calls: string[] = [];
function db(result: Record<string, unknown>) {
  const builder = new Proxy({}, { get: (_, key) => key === 'then' ? (resolve: (r: unknown) => void) => Promise.resolve(result).then(resolve) : () => builder });
  return { from: (name: string) => { calls.push(name); return builder; }, rpc: async (name: string) => { calls.push(name); return result; } } as unknown as SupabaseClient;
}
const fail: ToolCtx = { db: db({ data: null, count: null, error: { message: 'database unavailable' } }), orgId: 'isolated-test-org', userName: 'Test coordinator' };
for (const name of ['search_records', 'work_summary', 'find_missing_evidence', 'programme_report', 'abc_verification_status', 'abc_package_status']) {
  const r = await runTool(name, { query: 'Kaju' }, fail);
  assert.equal(r.ok, false); assert.deepEqual(r.citations, []); ok(`${name}: failed read never becomes successful empty data`);
}
for (const q of ['summary today', 'missing evidence', 'programme report', 'ABC verification queue', 'package status']) {
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
 const lost=await withTools('zzqx plorb',{...ctx,db:db({data:[],error:null})});assert.ok((lost as {suggestions?:string[]}).suggestions?.includes('What should I do first?'));ok('an unmatched request offers runnable next steps instead of a dead end');
}
console.log(`kaju reliability: ${checks} checks passed`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
