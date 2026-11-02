import {fixture} from './fixture-env.mjs';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const base=process.env.BASE??'http://localhost:3110';
const output=process.env.OUT??'/tmp/kaju-polish-visual';fs.mkdirSync(output,{recursive:true});
if(!fixture)throw Error('Isolated staging fixture required');
const sessions={};for(const role of ['coord','reviewer']){const client=createClient(process.env.STAGING_URL,fixture.anon,{auth:{persistSession:false}});const result=await client.auth.signInWithPassword({email:fixture.users[role].email,password:fixture.password});if(result.error)throw result.error;sessions[role]=result.data.session}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
const results=[];
try{
 for(const [device,width,height] of [['desktop',1440,1000],['tablet',834,1100],['phone',390,844]]){
  for(const [name,path,role] of [['home','/',null],['ai','/ai',null],['assistant','/assistant','coord'],['ngo','/ngo','coord'],['municipal','/city/review','reviewer']]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   if(process.env.QA_BYPASS_FILE){const access=JSON.parse(fs.readFileSync(process.env.QA_BYPASS_FILE,'utf8'));const gate=await context.newPage();await gate.goto(access.url??`${base}?_vercel_share=${encodeURIComponent(access.secret)}`);await gate.close()}
   await context.addInitScript(({ref,session})=>{if(session)localStorage.setItem(`sb-${ref}-auth-token`,JSON.stringify(session));localStorage.setItem('straypaw.notice.storage.v1','1');localStorage.setItem('straypaw.analytics.optout','1');localStorage.setItem('straypaw.tour.v2','1')},{ref:fixture.ref,session:role?sessions[role]:null});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+path);await expect(page.locator('h1').first()).toBeVisible();
   if(name==='assistant'){
    await expect(page.getByRole('textbox',{name:'Message Kaju'})).toBeEnabled({timeout:20000});
    const heading=await page.locator('.ai3-empty-h').boundingBox(),log=await page.getByRole('log',{name:'Kaju conversation'}).boundingBox();
    assert.ok(heading&&log&&heading.y>=log.y,'The empty greeting must not be scrolled out of view');
   }
   if(name==='ngo'){await expect(page.getByRole('region',{name:'Kaju activity'}).locator('time').first()).toBeVisible();await expect(page.locator('.br-skel')).toHaveCount(0,{timeout:30000})}
   if(name==='municipal')await expect(page.getByRole('group',{name:'Show'})).toBeVisible();
   await page.screenshot({path:`${output}/${name}-${device}.png`,fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${name}/${device} overflow`);
   await page.addScriptTag({path:require.resolve('axe-core')});
   const audit=await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
   const violations=audit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
   results.push({name,device,errors,violations});assert.deepEqual(errors,[],`${name}/${device} page errors`);
   console.log(JSON.stringify({name,device,violations}));await context.close();
  }
 }
 fs.writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));assert.equal(results.reduce((sum,r)=>sum+r.violations.length,0),0,'Accessibility findings need review');
 console.log('PASS 15 desktop/tablet/phone Kaju placements, no overflow/page errors and WCAG A/AA checks');
}finally{fs.writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));await browser.close()}
