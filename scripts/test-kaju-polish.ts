import assert from 'node:assert/strict';
import type {SupabaseClient} from '@supabase/supabase-js';
import {answer,privateModelApproved} from '../src/sp3/ai/engine';
import {isAiReply,safeAiHref,auditReference} from '../src/sp3/ai/validation';
import {buildReport} from '../src/lib/files/reports';
import {readSnapshot} from '../src/sp3/ai/snapshots';
import {readAiScope} from '../src/sp3/ai/scope';
import {runTool,type ToolCtx} from '../src/sp3/ai/tools';
let checks=0;const ok=(s:string)=>console.log(`PASS ${++checks} ${s}`);
async function main(){
 const base={text:'Checked',engine:'tools',citations:[],tools:[],proposals:[]};assert.equal(isAiReply(base),true);
 for(const payload of [null,{...base,tools:null},{...base,engine:'pretend'},{...base,proposals:[{kind:'authorise_surgery'}]},{...base,citations:[{id:'x',kind:'case',label:'x',href:'javascript:alert(1)'}]}])assert.equal(isAiReply(payload),false);ok('malformed replies, unsafe citations and unsupported writes rejected');
 for(const href of ['javascript:alert(1)','//evil.test','/\\evil.test','https://user:secret@example.org','data:text/html,test'])assert.equal(safeAiHref(href),false);
 assert.equal(safeAiHref('/ngo/verification/case'),true);assert.equal(safeAiHref('https://drive.google.com/file/x'),true);ok('record and provider sources accept safe destinations only');
 assert.equal(auditReference(42),'42');assert.equal(auditReference('audit-id'),'audit-id');for(const invalid of [null,0,-1,1.5,Number.MAX_SAFE_INTEGER+1,{}])assert.equal(auditReference(invalid),null);ok('numeric and text audit IDs are accepted without inventing a receipt');
 const raw={id:'run',checked_at:'2026-11-02T04:34:00Z',rules_version:'v1',findings:[{rule:'missing',count:null,explanation:'Unknown',records:[]}]};assert.equal(readSnapshot(raw)?.findings[0].count,null);assert.equal(readSnapshot({...raw,findings:null}),null);assert.equal(readSnapshot({...raw,checked_at:'invalid'}),null);ok('missing snapshot counts remain unknown; malformed runs do not become empty success');
 let stored:unknown={...raw,findings:[...raw.findings,{rule:'reporting_deadline',count:0,configured:false,explanation:'No date supplied',records:[]}]};
 const reportDb={rpc:async()=>({data:'org-a',error:null}),from:()=>{const q=new Proxy({},{get:(_,key)=>key==='maybeSingle'?async()=>({data:stored,error:null}):()=>q});return q}} as unknown as SupabaseClient;
 const report=await buildReport('operations_checks',reportDb);assert.equal(report.rows[0][2],'Unknown');assert.equal(report.rows[1][2],'Not set');stored={...raw,findings:null};await assert.rejects(buildReport('operations_checks',reportDb),/Run operational checks/);ok('exported findings preserve unknown/unset values and reject malformed snapshots');
 let ngo='org-a';let role='coordinator';const db={rpc:async(name:string)=>({data:name==='my_ngo'?ngo:{role,offices:[{id:'office-z'},{id:'office-a'}]},error:null})} as unknown as SupabaseClient;
 const a=await readAiScope(db,'user');ngo='org-b';const b=await readAiScope(db,'user');assert.notEqual(a.scope,b.scope);role='member';assert.notEqual(b.scope,(await readAiScope(db,'user')).scope);ok('organisation and role changes produce distinct server scope fingerprints');
 await assert.rejects(readAiScope({rpc:async()=>({data:null,error:{message:'denied'}})} as unknown as SupabaseClient,'user'));ok('workspace lookup errors fail closed');
 const saved={key:process.env.ANTHROPIC_API_KEY,approval:process.env.STRAYPAW_AI_APPROVED_DATA_ROUTE,model:process.env.STRAYPAW_AI_MODEL};const fetcher=globalThis.fetch;
 const context:ToolCtx={db,orgId:'private-org',userId:'user',userName:'Private name'};let requests=0;
 try{
  process.env.ANTHROPIC_API_KEY='isolated-test-key';delete process.env.STRAYPAW_AI_MODEL;delete process.env.STRAYPAW_AI_APPROVED_DATA_ROUTE;
  globalThis.fetch=async()=>{requests++;throw Error('should not leave StrayPaw')};
  const reply=await answer([{role:'user',text:'Hello'}],context,{});assert.equal(reply.engine,'tools');assert.equal(requests,0);assert.match(reply.notice??'',/inside StrayPaw/);ok('private workspace text never reaches an unapproved model route');
  process.env.STRAYPAW_AI_APPROVED_DATA_ROUTE='gateway:google/gemini-2.5-flash';assert.equal(await privateModelApproved(),false);ok('approval for another transport/model cannot enable this route');
  process.env.STRAYPAW_AI_APPROVED_DATA_ROUTE='direct:claude-opus-5-5';assert.equal(await privateModelApproved(),true);
  const cancelled=new AbortController();cancelled.abort();await assert.rejects(answer([{role:'user',text:'Hello'}],context,{signal:cancelled.signal}));assert.equal(requests,0);ok('cancelled model requests stop before provider access');
  globalThis.fetch=async()=>{requests++;return new Response('unavailable',{status:503})};
  const error=await answer([{role:'user',text:'Hello'}],context,{});assert.equal(error.engine,'tools');assert.equal(requests,1);ok('provider errors fall back honestly, without automatic retries or writes');
  globalThis.fetch=async()=>new Response(JSON.stringify({content:null,stop_reason:'end_turn'}),{headers:{'content-type':'application/json'}});
  assert.equal((await answer([{role:'user',text:'Hello'}],context,{})).engine,'tools');ok('malformed provider envelopes cannot crash the caller');
 }finally{globalThis.fetch=fetcher;for(const [key,value] of Object.entries({ANTHROPIC_API_KEY:saved.key,STRAYPAW_AI_APPROVED_DATA_ROUTE:saved.approval,STRAYPAW_AI_MODEL:saved.model})){if(value===undefined)delete process.env[key];else process.env[key]=value}}
 const failed={from:()=>{const q=new Proxy({},{get:(_,k)=>k==='then'?(resolve:(r:unknown)=>unknown)=>Promise.resolve({count:null,data:[],error:null}).then(resolve):()=>q});return q;}} as unknown as SupabaseClient;
 assert.equal((await runTool('work_summary',{}, {...context,db:failed})).ok,false);ok('a successful transport with a missing count is unknown, never zero');
 console.log(`${checks} Kaju polish contract checks passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
