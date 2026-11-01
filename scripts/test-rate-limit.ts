import assert from 'node:assert/strict';
async function main(){
 const before=globalThis.fetch;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://rate-test.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';
 let response:unknown=true;let fail=false;
 globalThis.fetch=async()=>{if(fail)throw new Error('counter unavailable');return new Response(JSON.stringify(response),{headers:{'content-type':'application/json'}});};
 try{
 const {allowRequest}=await import('../src/lib/rate-limit');
 delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 assert.equal(await allowRequest('u','ai',2,60),false);
 process.env.SUPABASE_SERVICE_ROLE_KEY='isolated-test-key';
 assert.equal(await allowRequest(null,'ai',2,60),false);
 for(const value of [null,false,{},'true']){response=value;assert.equal(await allowRequest('u','ai',2,60),false);}
 response=true;assert.equal(await allowRequest('u','ai',2,60),true);
 fail=true;assert.equal(await allowRequest('u','ai',2,60),false);
 console.log('PASS missing configuration/identity, malformed decisions, denial and failed counter all close; explicit true allows');
 }finally{globalThis.fetch=before;}
}
main().catch(e=>{console.error(e);process.exitCode=1});
