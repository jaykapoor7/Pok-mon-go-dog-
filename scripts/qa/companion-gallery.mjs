/** Actual React renderer, not a sprite preview. BASE points to a running Next app. */
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
const base=process.env.BASE??'http://localhost:3150';
const out=process.env.OUT??'/tmp/straypaw-companion';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH??'/usr/bin/chromium'});
try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}});
 await page.goto(`${base}/ai`,{timeout:120000});
 await page.evaluate(()=>localStorage.setItem('kaju.ambient','on'));
 const rendered=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{Kaju}from'./src/kaju/Kaju';import{ALL_STATES}from'./src/kaju/poses';createRoot(document.getElementById('rig')).render(<main>{ALL_STATES.map(state=><figure key={state}><Kaju state={state} size={300} label={state}/><figcaption>{state}</figcaption></figure>)}</main>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"','process.env':'{}'}});
 await page.setContent(`<base href="${base}"><style>${readFileSync('src/kaju/kaju.css','utf8')}body{margin:0;background:#f1f5fc;color:#0b1e3d;font:14px system-ui}main{display:grid;grid-template-columns:repeat(4,1fr)}figure{margin:0;height:280px;text-align:center}figcaption{padding:8px}</style><div id="rig"></div>`);
 await page.addScriptTag({content:rendered.outputFiles[0].text});
 await page.waitForFunction(()=>document.querySelectorAll('svg[data-kaju-state]').length===27);
 const asset=await page.locator('svg.kaju image').first().getAttribute('href');
 assert.ok((await page.request.get(new URL(asset,base).href)).ok(),'Shared rig asset loads');
 // Bring each state into view before inspecting its running joint animations.
 const motion=async(selector)=>{const part=page.locator(selector);await part.evaluate(n=>n.closest("figure").scrollIntoView({block:"center"}));await page.waitForTimeout(100);const a=await part.evaluate(n=>getComputedStyle(n).transform);await page.waitForTimeout(180);const b=await part.evaluate(n=>getComputedStyle(n).transform);assert.notEqual(a,b,`${selector} articulates`)};
 await motion('.is-greeting .wave');await motion('.is-greeting .kj-fNear .kj-elbow');
 await motion('.is-working .typing.near');const gaze=await page.locator('.is-looking .kj-gaze').evaluate(n=>{const a=n.getAnimations()[0];a.pause();a.currentTime=0;const first=getComputedStyle(n).transform;a.currentTime=1500;return[first,getComputedStyle(n).transform]});assert.notEqual(...gaze,'Eyes look independently');
 const ear=page.locator('.is-earTwitch .ear-flutter');const earMotion=await ear.evaluate(n=>{const a=n.getAnimations()[0];a.pause();a.currentTime=0;const first=getComputedStyle(n).transform;a.currentTime=3750;return[first,getComputedStyle(n).transform]});assert.notEqual(...earMotion,'Ear twitches independently');
 const walking=page.locator('.is-walking');await walking.scrollIntoViewIfNeeded();
 const phases=await walking.locator('.walk-foot').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).animationDelay));assert.equal(new Set(phases).size,2,'Feet alternate');
 const contacts=await walking.evaluate(svg=>{const node=svg.querySelector('.walk-foot.far');const anim=node.getAnimations()[0];return[0,100,200,300,500].map(time=>{anim.pause();anim.currentTime=time;return getComputedStyle(node).transform})});assert.equal(new Set(contacts).size,1,'Planted foot stays fixed through stance');
 assert.equal(await page.locator('.kj-tail').count(),0,'Reference has no tail');
 for(const state of ['happy','bored','confused','thinking','working','sleeping'])assert.equal(await page.locator(`.is-${state} [data-kaju-expression="${state}"]`).count(),1);
 const expressions=await page.locator('.is-happy .kj-face-features,.is-bored .kj-face-features,.is-confused .kj-face-features,.is-thinking .kj-face-features').evaluateAll(ns=>ns.map(n=>n.innerHTML));assert.equal(new Set(expressions).size,4,'Different expressions change the actual face');
 await page.screenshot({path:`${out}/states.png`,fullPage:true});
 for(const state of ['greeting','working','happy','bored','thinking','confused']){const figure=page.locator('figure').filter({has:page.locator(`.is-${state}`)});await figure.scrollIntoViewIfNeeded();await figure.screenshot({path:`${out}/${state}.png`})}
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('svg.kaju *').evaluateAll(ns=>ns.filter(n=>getComputedStyle(n).animationName!=='none').length),0,'Reduced motion stops all loops');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('.is-goodbye')?.classList.contains('is-paused'),{},{timeout:3000});
 assert.ok(await page.locator('.is-goodbye').evaluate(n=>n.classList.contains('is-paused')),'Offscreen characters pause');
 console.log('PASS: 27 states; distinct facial expressions; shoulder/elbow/laptop/gaze motion; two foot phases; fixed stance; no tail; reduced motion; offscreen pause.');
}finally{await browser.close()}
