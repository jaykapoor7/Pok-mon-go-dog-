/** Real public-page and assistant interactions; no private records or model requests. */
import{chromium,expect}from'@playwright/test';import fs from'node:fs';import assert from'node:assert/strict';
const base=process.env.BASE??'http://localhost:3150',out=process.env.OUT??'/tmp/straypaw-companion';fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH??'/usr/bin/chromium'});
try{
 for(const[device,width,height]of[['desktop',1440,1000],['tablet',820,1180],['phone',390,844]]){
  const c=await b.newContext({viewport:{width,height},reducedMotion:'no-preference',recordVideo:process.env.RECORD?{dir:out,size:{width,height}}:undefined});
  await c.addInitScript(()=>{localStorage.setItem('straypaw.notice.storage.v1','1');localStorage.setItem('straypaw.analytics.optout','1')});
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base,{timeout:120000});
  await p.locator('[data-kaju-art="companion"]').first().waitFor();
  const header=p.locator('header [data-brand-art="animal-wordmark"]');assert.ok(await header.isVisible(),'Header logo visible');
  const href=await header.locator('image').getAttribute('href');assert.ok((await p.request.get(new URL(href,base).href)).ok(),'Logo asset loads');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  const hero=p.locator('.s4-hero-perch [data-kaju-art="companion"]');
  await p.waitForFunction(()=>document.querySelector('.s4-hero-perch svg')?.getAttribute('data-kaju-state')==='greeting',{},{timeout:25000});
  const first=await hero.locator('.wave').evaluate(n=>getComputedStyle(n).transform);await p.waitForTimeout(220);const next=await hero.locator('.wave').evaluate(n=>getComputedStyle(n).transform);assert.notEqual(first,next,'Homepage wave actually moves');
  await p.screenshot({path:`${out}/home-${device}.png`});
  if(process.env.RECORD)await p.waitForTimeout(3500);
  await p.locator('footer.s4-foot').scrollIntoViewIfNeeded();
  await p.getByRole('button',{name:'Pause Kaju',exact:true}).click();assert.equal(await p.locator('.kaju:not(.kaju-face)').evaluateAll(ns=>ns.filter(n=>!n.classList.contains('is-still')).length),0,'Pause control stops Kaju');
  await p.getByRole('button',{name:'Animate Kaju',exact:true}).click();
  await p.screenshot({path:`${out}/footer-${device}.png`});
  await p.goto(`${base}/ai`,{timeout:120000});const work=p.locator('[data-kaju-state="working"]').first();await work.waitFor({state:'visible',timeout:20000});
  await work.evaluate(n=>n.scrollIntoView({block:'center'}));await p.waitForTimeout(150);
  await expect(work.locator('[data-kaju-prop="laptop"]')).toHaveCSS('opacity','1');
  await p.screenshot({path:`${out}/ai-${device}.png`});if(process.env.RECORD)await p.waitForTimeout(3000);
  await p.goto(`${base}/assistant`,{timeout:120000});await p.getByRole('textbox',{name:'Message Kaju'}).waitFor();
  await p.getByRole('textbox',{name:'Message Kaju'}).fill('Draft remains editable');
  await p.screenshot({path:`${out}/assistant-${device}.png`});
  await p.addScriptTag({content:fs.readFileSync('node_modules/axe-core/axe.min.js','utf8')});
  const a11y=await p.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  fs.writeFileSync(`${out}/axe-${device}.json`,JSON.stringify(a11y.violations,null,2));
  assert.equal(a11y.violations.filter(v=>['critical','serious'].includes(v.impact)).length,0,`No serious/critical assistant accessibility failures: ${a11y.violations.map(v=>v.id)}`);
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('svg.kaju *').evaluateAll(ns=>ns.filter(n=>getComputedStyle(n).animationName!=='none').length),0);
  assert.deepEqual(errors,[],'No browser exceptions');
  const video=p.video();await c.close();if(video)await video.saveAs(`${out}/journey-${device}.webm`);
  console.log(`PASS ${device}: transparent logo served; no overflow; live wave; laptop; pause/resume; assistant typing; reduced motion; axe; no exceptions`);
 }
}finally{await b.close()}
