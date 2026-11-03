import {fixture} from './fixture-env.mjs';
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
if(!fixture)throw Error('Isolated staging fixture required');
const anon=createClient(process.env.STAGING_URL,fixture.anon,{auth:{persistSession:false}});
async function login(role){const db=createClient(process.env.STAGING_URL,fixture.anon,{auth:{persistSession:false}});const r=await db.auth.signInWithPassword({email:fixture.users[role].email,password:fixture.password});if(r.error)throw r.error;return db}
const db=await login('coord'),other=await login('other');
const args={p_request:crypto.randomUUID(),p_case:fixture.storageCase,p_note:`STAGING TEST field sync ${Date.now()}`,p_captured:new Date().toISOString()};
let n=0;const ok=m=>console.log(`PASS ${++n} ${m}`);
const first=await db.rpc('field_confirm_note',args);assert.equal(first.error,null,first.error?.message);assert.ok(first.data.record_id&&first.data.audit_id);ok('field note commits with audit and receipt');
const replay=await db.rpc('field_confirm_note',args);assert.equal(replay.error,null);assert.equal(replay.data.replayed,true);assert.equal(replay.data.record_id,first.data.record_id);ok('interrupted request replay returns the same record');
const rows=await db.from('case_updates').select('id,note').eq('id',first.data.record_id);assert.equal(rows.data.length,1);assert.ok(rows.data[0].note.includes(args.p_note));ok('independent source read verifies content');
const audit=await db.from('operational_audit_log').select('after_data').eq('id',first.data.audit_id).single();assert.equal(audit.error,null);assert.equal(audit.data.after_data.request_id,args.p_request);ok('independent audit read verifies request');
assert.ok((await db.rpc('field_confirm_note',{...args,p_note:'changed payload'})).error);ok('request reuse with changed content refused');
assert.ok((await other.rpc('field_confirm_note',args)).error);ok('another organisation cannot submit this case');
assert.ok((await anon.rpc('field_confirm_note',args)).error);ok('anonymous submission denied');
const hidden=await other.from('field_note_receipts').select('record_id').eq('request_id',args.p_request);assert.equal(hidden.error,null);assert.equal(hidden.data.length,0);ok('receipt RLS prevents cross-organisation disclosure');
assert.ok((await db.from('field_note_receipts').insert({actor_id:fixture.users.coord.id,request_id:crypto.randomUUID(),ngo_id:fixture.ngo,record_id:first.data.record_id,audit_id:first.data.audit_id,payload_hash:'x'})).error);ok('client cannot forge receipts');
console.log(`${n} real staging field-sync checks passed`);
