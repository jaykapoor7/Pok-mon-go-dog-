import {fixture} from './fixture-env.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {verifyAction} from '../../src/sp3/ai/verify.ts';
if(!fixture)throw Error('Isolated fixture required');
async function as(role){const db=createClient(process.env.STAGING_URL,process.env.STAGING_ANON,{auth:{persistSession:false}});assert.equal((await db.auth.signInWithPassword({email:fixture.users[role].email,password:fixture.password})).error,null);return db;}
const db=await as('coord'),other=await as('other');let n=0;const ok=s=>console.log(`PASS ${++n} ${s}`);
let caseId;
for(const kind of ['open_case','add_note','schedule_followup','record_care']){
 const p={id:randomUUID(),kind,title:'STAGING TEST Kaju confirmed case',city:'Coimbatore',zone:'Gandhipuram',category:'injury',severity:'normal',description:'Isolated authenticated confirmation check. Fictional.',dogId:fixture.dog,caseId,note:'STAGING TEST confirmed note',dueAt:new Date(Date.now()+86400000).toISOString(),careKind:'checkup',date:new Date().toISOString().slice(0,10),notes:'STAGING TEST care claim, not a clinical authorisation'};
 const args={p_request:p.id,p_kind:kind,p_payload:p};
 const first=await db.rpc('kaju_confirm_action',args);assert.equal(first.error,null,first.error?.message);ok(`${kind} confirms under own session`);
 const verified=await verifyAction(db,fixture.users.coord.id,p.id);assert.equal(verified.verified,true);ok(`${kind} independently reads source and audit`);
 const replay=await db.rpc('kaju_confirm_action',args);assert.equal(replay.error,null);assert.equal(replay.data.record_id,first.data.record_id);assert.equal(replay.data.replayed,true);ok(`${kind} retry returns same record`);
 const changed=await db.rpc('kaju_confirm_action',{...args,p_payload:{...p,note:'Changed request'}});assert.ok(changed.error);ok(`${kind} changed payload cannot reuse request`);
 const leaked=await other.from('kaju_action_receipts').select('*').eq('request_id',p.id);assert.equal(leaked.error,null);assert.equal(leaked.data.length,0);ok(`${kind} receipt isolated from other organisation`);
 if(kind==='open_case')caseId=first.data.record_id;
}
const unauthorised=await other.rpc('kaju_confirm_action',{p_request:randomUUID(),p_kind:'add_note',p_payload:{caseId,note:'Must be refused'}});assert.ok(unauthorised.error);ok('cross-tenant confirmation is refused');
const own=await db.rpc('check_own_rate_limit',{p_action:'not-an-allowed-budget'});assert.equal(own.data,false);ok('caller cannot select arbitrary rate policy');
console.log(`${n} confirmed-action checks passed`);
