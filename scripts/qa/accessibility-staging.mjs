import {fixture} from '../staging/fixture-env.mjs';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
if(!fixture)throw Error('Isolated staging fixture required');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
let failed=0;const results=[];
try{
for(const role of ['coord','admin','reviewer']){
 const db=createClient(process.env.STAGING_URL,fixture.anon,{auth:{persistSession:false}});const {data,error}=await db.auth.signInWithPassword({email:fixture.users[role].email,password:fixture.password});if(error)throw error;
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const ctx=await browser.newContext({viewport,reducedMotion:'reduce'});await ctx.addInitScript(([k,v])=>{localStorage.setItem(k,v);localStorage.setItem('straypaw.notice.storage.v1','1');localStorage.setItem('straypaw.analytics.optout','1');localStorage.setItem('straypaw.tour.v2','1')},[`sb-${fixture.ref}-auth-token`,JSON.stringify(data.session)]);
  for(const path of role==='coord'?['/assistant','/ngo/cases/new',`/ngo/verification/${fixture.abcCase}`]:role==='admin'?['/ngo/settings']:[`/city/review/${fixture.packageId}`]){
   const page=await ctx.newPage();await page.goto((process.env.BASE??'http://localhost:3100')+path);await page.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{});await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
   const result=await page.evaluate(async()=>await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}));
   const violations=result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));failed+=violations.filter(v=>['critical','serious'].includes(v.impact)).length;
   await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,visible:!!document.activeElement?.getClientRects().length}));assert.ok(focus.visible);assert.notEqual(focus.tag,'BODY');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1);
   results.push({role,width:viewport.width,path,violations});console.log(`${violations.length?'FINDINGS':'PASS'} ${role} ${viewport.width} ${path}: ${violations.map(v=>v.id).join(', ')||'no automated WCAG A/AA findings; keyboard focus and width checked'}`);await page.close();
  }await ctx.close();
 }
}
fs.writeFileSync(process.env.OUT??'/tmp/straypaw-accessibility.json',JSON.stringify(results,null,2));
assert.equal(failed,0,'Critical/serious automated accessibility findings require review');
}finally{await browser.close();}
