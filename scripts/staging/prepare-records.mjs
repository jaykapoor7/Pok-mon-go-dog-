import { fixture } from './fixture-env.mjs';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
if (!fixture) throw new Error('Isolated fixture required');
for (const role of ['coord','other']) {
 const c=createClient(process.env.STAGING_URL,process.env.STAGING_ANON,{auth:{persistSession:false}});
 const {error}=await c.auth.signInWithPassword({email:fixture.users[role].email,password:fixture.password});if(error)throw error;
 const volunteer=await c.rpc('upsert_volunteer',{p_id:fixture.users[role].id,p_name:fixture.users[role].name});if(volunteer.error)throw volunteer.error;
 const {data,error:e}=await c.rpc('create_animal_with_location',{p_city:'Coimbatore',p_h3_r8:null,p_name:`STAGING TEST ${role} animal`,p_species:'dog',p_code:null,p_zone:'Gandhipuram',p_lat:null,p_lng:null,p_cover_photo:null,p_intake_notes:'Isolated QA fixture. Fictional.'});if(e)throw e;
 if(role==='coord')fixture.dog=data;
 fs.writeFileSync(process.env.STAGING_FIXTURE_FILE,JSON.stringify(fixture),{mode:0o600});
 const r=await c.rpc('create_case_with_location',{p_city:'Coimbatore',p_h3_r8:null,p_title:`STAGING TEST ${role} storage case`,p_description:'Isolated QA fixture. Fictional.',p_dog_id:data,p_zone:'Gandhipuram',p_lat:null,p_lng:null,p_severity:'normal',p_category:'injury',p_tags:[],p_actor_id:fixture.users[role].id,p_actor_name:fixture.users[role].name,p_species:'dog',p_informer_contact:null,p_hospital:null,p_cost_estimate:null,p_cost_spent:null});if(r.error)throw r.error;
 fixture[role==='coord'?'storageCase':'otherCase']=r.data;
 fs.writeFileSync(process.env.STAGING_FIXTURE_FILE,JSON.stringify(fixture),{mode:0o600});
 console.log(`Prepared ${role} animal and case through authenticated RPCs`);
}
fs.writeFileSync(process.env.STAGING_FIXTURE_FILE,JSON.stringify(fixture),{mode:0o600});
