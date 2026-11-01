import {fixture} from './fixture-env.mjs';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
if(!fixture)throw Error('Isolated fixture required');
async function as(role){const db=createClient(process.env.STAGING_URL,process.env.STAGING_ANON,{auth:{persistSession:false}});assert.equal((await db.auth.signInWithPassword({email:fixture.users[role].email,password:fixture.password})).error,null);return db;}
const admin=await as('admin'),coord=await as('coord'),other=await as('other');let n=0;const ok=s=>console.log(`PASS ${++n} ${s}`);
const deny=await coord.rpc('kaju_set_report_deadline',{p_due:'2026-11-02'});assert.ok(deny.error);ok('non-lead cannot configure reporting deadline');
assert.equal((await admin.rpc('kaju_set_report_deadline',{p_due:'2026-11-02'})).error,null);ok('lead configures explicit deadline');
const result=await coord.rpc('kaju_refresh_checks');assert.equal(result.error,null,result.error?.message);assert.equal(result.data.findings.length,6);ok('six deterministic checks run on real organisation records');
assert.equal(result.data.findings.find(f=>f.rule==='reporting_deadline').configured,true);assert.equal(result.data.findings.find(f=>f.rule==='reporting_deadline').due_on,'2026-11-02');ok('deadline finding names lead-supplied date');
assert.ok(result.data.findings.every(f=>typeof f.explanation==='string'));ok('every finding explains its rule');
const saved=await coord.from('kaju_check_runs').select('id,rules_version').eq('id',result.data.id).single();assert.equal(saved.error,null);assert.equal(saved.data.rules_version,'2026-11-01-v1');ok('immutable run and rule version persisted');
const hidden=await other.from('kaju_check_runs').select('id').eq('id',result.data.id);assert.equal(hidden.error,null);assert.equal(hidden.data.length,0);ok('other organisation cannot read snapshot');
const cross=await other.rpc('kaju_refresh_checks',{p_ngo:fixture.ngo});assert.ok(cross.error);ok('cannot run another organisation checks');
const forge=await coord.from('kaju_check_runs').insert({ngo_id:fixture.ngo,findings:[]});assert.ok(forge.error);ok('client cannot forge findings');
const cron=await coord.rpc('kaju_due_checks');assert.equal(cron.error?.code,'42501');ok('scheduler queue restricted to server role');
console.log(`${n} recurring-intelligence checks passed`);
