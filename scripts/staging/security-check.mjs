import { fixture } from './fixture-env.mjs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
if(!fixture)throw Error('Isolated staging fixture required');
const anon=createClient(process.env.STAGING_URL,process.env.STAGING_ANON,{auth:{persistSession:false}});
let n=0;const ok=s=>console.log(`PASS ${++n} ${s}`);
for(const [name,args] of [
 ['create_feeding_zone',{p_name:'STAGING SECURITY TEST',p_lat:0,p_lng:0}],
 ['add_comment',{p_dog_id:fixture.dog,p_body:'Must be refused'}],
 ['log_feed',{p_dog_id:fixture.dog}], ['like_sighting',{p_sighting_id:fixture.dog}],
 ['check_rate_limit',{p_bucket:'spoof',p_action:'ai',p_max:100,p_window_seconds:60}],
 ['admin_list_orgs',{}]
]){const {error}=await anon.rpc(name,args);assert.equal(error?.code,'42501',`${name}: ${error?.message}`);ok(`anon cannot execute ${name}`);}
for(const view of ['public_spatial_animals','public_programme_cards','public_case_facts','public_care_facts','public_sighting_facts']){
 const {data,error}=await anon.from(view).select('id').limit(1);assert.equal(error,null,`${view}: ${error?.message}`);ok(`public read preserved: ${view}`);
}
const denied=await anon.from('feeding_zone_public').insert({name:'Must be refused',lat:0,lng:0});assert.equal(denied.error?.code,'42501');ok('anonymous projection writes refused');
const c=createClient(process.env.STAGING_URL,process.env.STAGING_ANON,{auth:{persistSession:false}});
assert.equal((await c.auth.signInWithPassword({email:fixture.users.coord.email,password:fixture.password})).error,null);
const {error}=await c.rpc('create_feeding_zone',{p_name:'STAGING TEST authenticated feeding location',p_lat:11.01,p_lng:76.95,p_actor_id:fixture.users.coord.id,p_actor_name:fixture.users.coord.name});assert.equal(error,null,error?.message);ok('signed-in feeding creation works');
const wrong=await c.rpc('create_feeding_zone',{p_name:'Must be refused',p_lat:11.01,p_lng:76.95,p_actor_id:fixture.users.other.id});assert.ok(wrong.error);ok('spoofed actor refused');
const secret=await c.from('connection_secrets').select('*').limit(1);assert.equal(secret.error?.code,'42501');ok('connection tokens inaccessible to authenticated client');
console.log(`${n} staging security checks passed`);
