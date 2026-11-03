import {fixture} from './fixture-env.mjs';import {createClient} from '@supabase/supabase-js';import assert from 'node:assert/strict';import fs from 'node:fs';
if(!fixture)throw Error('Isolated fixture required');const db=createClient(process.env.STAGING_URL,fixture.anon,{auth:{persistSession:false}});const a=await db.auth.signInWithPassword({email:fixture.users.coord.email,password:fixture.password});if(a.error)throw a.error;const file='/tmp/ux-followup-scope-fixture.json';
const counts=async()=>{const r=await db.rpc('org_followup_scope_counts').single();assert.equal(r.error,null,r.error?.message);return Number(r.data.scheduled_overdue)};
if(process.env.MODE==='prepare'){
 const before=await counts();const animal=await db.rpc('create_animal_with_location',{p_city:'Coimbatore',p_name:'STAGING TEST unlinked follow-up',p_species:'dog',p_intake_notes:'Synthetic scope-count test; no real clinical outcome'});assert.equal(animal.error,null,animal.error?.message);
 const c=await db.rpc('create_case_with_location',{p_city:'Coimbatore',p_title:'STAGING TEST unlinked follow-up source',p_actor_id:fixture.users.coord.id,p_actor_name:fixture.users.coord.name,p_category:'other',p_dog_id:animal.data,p_description:'Synthetic schedule test'});assert.equal(c.error,null);
 const follow=await db.rpc('add_case_followup',{p_case_id:c.data,p_dog_id:animal.data,p_due_at:new Date(Date.now()-86400000).toISOString().slice(0,10),p_note:'STAGING TEST unlinked follow-up'});assert.equal(follow.error,null);
 fs.writeFileSync(file,JSON.stringify({dogId:animal.data,followupId:follow.data,expected:before+1}),{mode:0o600});assert.equal(await counts(),before);console.log('PASS demo fixture is excluded from scheduled operational counts');
 // Staging-only setup: mark this new synthetic animal non-demo and detach only
 // this new follow-up from its synthetic case. Then run MODE=verify.
}else{
 const {dogId,followupId,expected}=JSON.parse(fs.readFileSync(file,'utf8'));const source=await db.from('animal_followups').select('case_id,dog_id').eq('id',followupId).single();assert.equal(source.error,null);assert.equal(source.data.case_id,null);assert.equal(source.data.dog_id,dogId);assert.equal(await counts(),expected);console.log('PASS animal-only scheduled work is counted when the case join is absent; source dates and provenance preserved');
}
