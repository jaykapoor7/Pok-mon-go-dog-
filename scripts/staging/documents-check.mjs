/** Real authenticated HTTP exports and native readbacks. No external accounts. */
import {fixture} from './fixture-env.mjs';
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
if(!fixture)throw Error('STAGING_FIXTURE_FILE is required');
const base=process.env.BASE??'http://localhost:3100';
const db=createClient(process.env.STAGING_URL,fixture.anon,{auth:{persistSession:false}});
const {data,error}=await db.auth.signInWithPassword({email:fixture.users.coord.email,password:fixture.password});
if(error)throw error;
const headers={Authorization:`Bearer ${data.session.access_token}`};
let n=0;const ok=m=>console.log(`PASS ${++n} ${m}`);
for(const format of ['pdf','docx','xlsx','csv','pptx','geojson','kml']){
 const r=await fetch(`${base}/api/files/export`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({format,source:'animals',title:'STAGING TEST native document'})});
 assert.equal(r.status,200,`${format}: ${await (r.ok?Promise.resolve(''):r.text())}`);
 const bytes=await r.arrayBuffer();assert.ok(bytes.byteLength>40);ok(`${format} authenticated organisation export`);
 if(format==='geojson'){const j=JSON.parse(Buffer.from(bytes).toString());assert.equal(j.type,'FeatureCollection');assert.ok(j.features.length);ok('GeoJSON contains actual staged coordinates');}
 else if(format==='kml'){assert.match(Buffer.from(bytes).toString(),/<coordinates>/);ok('KML contains actual staged coordinates');}
 else {
  const form=new FormData();form.append('file',new File([bytes],`staging.${format}`,{type:r.headers.get('content-type')}));
  const read=await fetch(`${base}/api/files/read`,{method:'POST',headers,body:form});const j=await read.json();assert.equal(read.status,200,JSON.stringify(j));assert.equal(j.kind,format);assert.match(j.text,/STAGING TEST|Tag/);ok(`${format} native upload and extracted record text`);
 }
}
const guest=await fetch(`${base}/api/files/export`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(guest.status,401);ok('guest export denied');
const large=await fetch(`${base}/api/files/read`,{method:'POST',headers:{...headers,'Content-Length':String(5*1024*1024)},body:Buffer.alloc(5*1024*1024)});assert.equal(large.status,413);ok('oversized upload refused with usable server response');
console.log(`${n} actual document HTTP checks passed`);
