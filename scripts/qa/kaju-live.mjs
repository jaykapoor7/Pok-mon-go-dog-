/** Record and inspect the actual rendered website; never inject a rig or mock data. */
import {chromium,webkit,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=process.env.BASE??'https://www.straypaw.org';
const out=process.env.OUT??'/workspace/artifacts/straypaw-live-2026-11-02';fs.mkdirSync(out,{recursive:true});
const engine=process.env.ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({...(engine==='chromium'?{executablePath:'/usr/bin/chromium'}:process.env.WEBKIT_EXECUTABLE_PATH?{executablePath:process.env.WEBKIT_EXECUTABLE_PATH}:{}),proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
const results=[];
async function actualMotion(svg){
 await expect(svg).not.toHaveClass(/is-still|is-paused/);
 const read=()=>svg.evaluate(node=>node.getAnimations({subtree:true}).filter(a=>a.playState==='running').map(a=>({name:a.animationName??'transition',time:a.currentTime})));
 const before=await read();await new Promise(r=>setTimeout(r,650));const after=await read();
 assert.ok(before.some((a,i)=>typeof a.time==='number'&&typeof after[i]?.time==='number'&&after[i].time>a.time),'Actual browser animation time must advance');
 return after.map(a=>a.name);
}
try{
 for(const [device,width,height] of [['desktop',1440,1000],['phone',390,844],['tablet',834,1100]]){
  const record=engine==='chromium'&&device!=='tablet'&&process.env.NO_RECORD!=='true';
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference',...(device==='phone'?{isMobile:true,hasTouch:true}:{}),...(record?{recordVideo:{dir:path.join(out,'raw'),size:{width,height}}}:{})});
  await context.addInitScript(()=>{localStorage.setItem('straypaw.notice.storage.v1','1');localStorage.setItem('straypaw.analytics.optout','1')});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(process.env.QA_BYPASS_FILE){const a=JSON.parse(fs.readFileSync(process.env.QA_BYPASS_FILE,'utf8'));await page.goto(a.url)}
  const health=await(await context.request.get(base+'/api/health')).json();if(process.env.EXPECT_SHA)assert.equal(health.sha,process.env.EXPECT_SHA);
  const started=new Date().toISOString();await page.goto(base,{waitUntil:'domcontentloaded'});
  const hero=page.locator('.s4-hero-perch svg.kaju');await expect(hero).toBeVisible();await hero.evaluate(el=>el.scrollIntoView({block:'center'}));const homeMotion=await actualMotion(hero);
  await page.screenshot({path:path.join(out,`${engine}-${device}-home.png`)});await page.waitForTimeout(record?4000:500);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Homepage horizontal overflow');
  await page.goto(base+'/ai');await page.getByText('See Kaju move',{exact:true}).click();
  const preview=page.getByRole('region',{name:'Kaju character preview'});await preview.scrollIntoViewIfNeeded();
  const select=preview.getByLabel('Movement',{exact:true});const states=await select.locator('option').evaluateAll(options=>options.map(o=>o.value));assert.equal(states.length,23);
  const rig=preview.locator('svg.kaju');const seen=[];
  for(const state of ['walking','trotting','greeting','sleeping']){
   await select.selectOption(state);await rig.evaluate(el=>el.scrollIntoView({block:'center'}));await expect(rig).toHaveAttribute('data-kaju-state',state);await actualMotion(rig);await page.waitForTimeout(record?1600:100);seen.push(state);
  }
  await page.screenshot({path:path.join(out,`${engine}-${device}-kaju.png`)});
  await preview.getByRole('button',{name:'Pause motion',exact:true}).click();await expect(rig).toHaveClass(/is-still/);
  await preview.getByRole('button',{name:'Resume motion',exact:true}).click();await actualMotion(rig);
  // Exercise every public selector option through the real product control.
  for(const state of states){await select.selectOption(state);await expect(rig).toHaveAttribute('data-kaju-state',state);await page.waitForTimeout(45)}
  await preview.getByRole('button',{name:'Play all movements',exact:true}).click();await expect(preview.getByRole('button',{name:'Play all movements',exact:true})).toBeDisabled();
  const first=await rig.getAttribute('data-kaju-state');await expect.poll(()=>rig.getAttribute('data-kaju-state'),{timeout:6000}).not.toBe(first);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(rig).toHaveClass(/is-still/);assert.equal(await rig.evaluate(node=>[...node.querySelectorAll('*')].filter(n=>getComputedStyle(n).animationName!=='none').length),0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(base+'/community');const opener=device==='desktop'?page.getByRole('banner').getByRole('button',{name:'Kaju',exact:true}):page.getByRole('navigation',{name:/navigation/}).getByRole('button',{name:'Kaju',exact:true});await opener.click();
  const panel=page.getByRole('complementary',{name:'Kaju'});await expect(panel).toBeVisible();await expect(panel.getByRole('textbox',{name:'Message Kaju'})).toBeEnabled({timeout:20000});await page.waitForTimeout(record?1600:100);
  await panel.getByRole('link',{name:'Open full screen',exact:true}).click();await expect(page.getByRole('textbox',{name:'Message Kaju'})).toHaveCount(1);await expect(panel).toHaveCount(0);await page.waitForTimeout(record?1600:100);
  await page.screenshot({path:path.join(out,`${engine}-${device}-assistant.png`)});
  assert.deepEqual(errors,[]);const video=record?page.video():null;await context.close();if(video)await video.saveAs(path.join(out,`kaju-live-${device}.webm`));
  results.push({device,engine,base,sha:health.sha,started,homeMotion,selectedStates:states,recordedMovements:seen,checks:['home motion advances','23 real selector states','pause/resume','tour advances','reduced motion','launcher','side panel','full workspace','no browser errors']});
  console.log(`PASS ${engine}/${device}: actual homepage motion, 23 public states, playback, reduced motion and assistant placements`);
 }
}finally{await browser.close();fs.writeFileSync(path.join(out,`live-${engine}-results.json`),JSON.stringify(results,null,2))}
