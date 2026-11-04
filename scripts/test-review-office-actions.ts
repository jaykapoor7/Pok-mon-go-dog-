import assert from 'node:assert/strict';
import type {SupabaseClient} from '@supabase/supabase-js';
import {verifyOfficeChange} from '../src/lib/review-office-actions';
const receipt={audit_id:42,office_id:'office-test',user_id:'user-test',action:'addReviewer'};
let audit:unknown={id:42,after_data:{request_id:'request-test',user_id:'user-test'},created_at:'2026-11-02T09:00:00Z'};
let office:unknown={id:'office-test',name:'Isolated test office',city:null},member:unknown={user_id:'user-test',role:'reviewer'};
let failed=false;
const db={from:(table:string)=>{const q=new Proxy({},{get:(_,key)=>key==='maybeSingle'?async()=>({data:table==='operational_audit_log'?audit:table==='review_offices'?office:member,error:failed?{message:'unavailable'}:null}):()=>q});return q}} as unknown as SupabaseClient;
let count=0;const ok=(label:string)=>console.log(`PASS ${++count} ${label}`);
async function main(){
 assert.deepEqual(await verifyOfficeChange(db,'request-test','addReviewer',{name:null,city:null},receipt),{at:'2026-11-02T09:00:00Z'});ok('source membership and numeric audit receipt read independently');
 audit=null;await assert.rejects(verifyOfficeChange(db,'request-test','addReviewer',{name:null,city:null},receipt));ok('saved membership without audit cannot claim success');
 audit={after_data:{user_id:'other-user'},created_at:'date'};await assert.rejects(verifyOfficeChange(db,'request-test','addReviewer',{name:null,city:null},receipt));ok('wrong reviewer audit cannot claim success');
 audit={after_data:{user_id:'user-test'},created_at:'date'};member=null;await assert.rejects(verifyOfficeChange(db,'request-test','addReviewer',{name:null,city:null},receipt));ok('missing membership cannot claim success');
 member={role:'reviewer'};await assert.rejects(verifyOfficeChange(db,'request-test','removeReviewer',{name:null,city:null},{...receipt,action:'removeReviewer'}));ok('removal verifies access actually disappeared');
 member=null;await verifyOfficeChange(db,'request-test','removeReviewer',{name:null,city:null},{...receipt,action:'removeReviewer'});ok('removed membership and matching audit verify');
 await assert.rejects(verifyOfficeChange(db,'request-test','rename',{name:'Different name',city:null},{...receipt,action:'rename'}));ok('concurrent office edit cannot claim stale success');
 failed=true;await assert.rejects(verifyOfficeChange(db,'request-test','rename',{name:'Isolated test office',city:null},{...receipt,action:'rename'}));ok('independent read error fails closed');failed=false;
 office=null;await assert.rejects(verifyOfficeChange(db,'request-test','rename',{name:'Isolated test office',city:null},{...receipt,action:'rename'}));ok('missing source fails closed');
 console.log(`${count} reviewer receipt checks passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
