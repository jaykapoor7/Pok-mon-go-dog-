import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.OUT??'/tmp/straypaw-hero';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',proxy:process.env.BASE?.startsWith('https:')&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
try{for(const width of [1440,834,390]){
 const page=await browser.newPage({viewport:{width,height:width===1440?1000:900},reducedMotion:'reduce'});
 await page.addInitScript(()=>{localStorage.setItem('straypaw.notice.storage.v1','1');localStorage.setItem('straypaw.analytics.optout','1')});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.BASE??'http://localhost:3100')+'/');
 await expect(page.getByRole('heading',{level:1})).toHaveText(/The platform for\s*animal welfare programmes\./);
 const hero=page.locator('.s4-hero');await expect(hero.getByRole('link',{name:'Meet Kaju'})).toBeVisible();
 const href=await hero.locator('svg[data-kaju-rig="articulated"] image').first().getAttribute('href');assert.ok((await page.request.get(new URL(href,page.url()).href)).ok());
 await expect(hero.getByRole('link',{name:'Book a demo'})).toHaveAttribute('href','/demo');await expect(hero.getByRole('link',{name:'Take a tour'})).toHaveAttribute('href','#workflow');
 await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1));assert.deepEqual(errors,[]);
 await page.screenshot({path:`${out}/hero-${width}.png`,fullPage:false});
 await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const a11y=await hero.evaluate(async el=>window.axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
 const serious=a11y.violations.filter(v=>['serious','critical'].includes(v.impact));
 fs.writeFileSync(`${out}/hero-${width}-a11y.json`,JSON.stringify(a11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),null,2));
 assert.deepEqual(serious.map(v=>v.id),[],'Hero accessibility findings');
 console.log(`PASS ${width}px: specific heading and Kaju introduction, actual art, working CTA links, no overflow/page errors/serious WCAG findings`);await page.close();
}}finally{await browser.close()}
