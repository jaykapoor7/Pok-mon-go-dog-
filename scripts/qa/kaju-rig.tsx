/** Render every actual component state and inspect articulation in Chromium. */
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
async function main(){
const out=process.env.OUT??'/tmp/straypaw-rig';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH??'/usr/bin/chromium'});
try{
const page=await browser.newPage({viewport:{width:1440,height:1200}});
// Establish a real origin so the device's ambient preference can be read.
await page.goto(`${process.env.BASE??'http://localhost:3108'}/ai`);
await page.evaluate(()=>localStorage.setItem('kaju.ambient','on'));
const {build}=await import('esbuild');
const rendered=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {Kaju} from './src/kaju/Kaju';import {ALL_STATES} from './src/kaju/poses';createRoot(document.getElementById('rig')).render(<main>{ALL_STATES.map(state=><figure key={state}><Kaju state={state} size={240}/><figcaption>{state}</figcaption></figure>)}</main>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"','process.env':'{}'}});
await page.setContent(`<base href="${process.env.BASE??'http://localhost:3108'}"><style>${readFileSync('src/kaju/kaju.css','utf8')}body{margin:0;background:#fff;color:#122441;font:14px system-ui}main{display:grid;grid-template-columns:repeat(6,1fr);gap:0}figure{margin:0;height:250px;text-align:center}figcaption{padding:8px}</style><div id="rig"></div>`);
await page.addScriptTag({content:rendered.outputFiles[0].text});
await page.waitForFunction(()=>document.querySelectorAll('svg[data-kaju-state]').length===23);
await page.waitForFunction(()=>document.querySelectorAll('.kaju.is-still,.kaju.is-paused').length===0);
const href=await page.locator('svg.kaju image').first().getAttribute('href');
const asset=await page.request.get(`${process.env.BASE??'http://localhost:3100'}${href}`);assert.ok(asset.ok(),'Rig image must actually load');
await page.waitForTimeout(1200);
await page.screenshot({path:`${out}/states.png`,fullPage:true});
const legMotion=async()=>page.locator('.is-walking .kj-pose > .kj-loop').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).transform));
const before=await legMotion();await page.waitForTimeout(150);const after=await legMotion();assert.ok(before.filter((v,i)=>v!==after[i]).length>=4);
const phases=await page.locator('.is-walking .kj-pose > .kj-loop').evaluateAll(nodes=>nodes.filter(n=>/[wt]-[fb][12]/.test(n.className.baseVal)).map(n=>getComputedStyle(n).animationDelay));assert.equal(new Set(phases).size,4);
assert.equal(await page.locator('.is-walking .kj-knee').count(),4);
// Inspect actual joint transforms at stance contacts, not just animation names.
const feet=await page.locator('.is-walking').evaluate(svg=>{
 const rig=svg as SVGSVGElement;const frames=[0,110,220,330,440,550,660];const node=svg.querySelector('.kj-fNear .kj-ankle') as SVGGraphicsElement;
 const animations=svg.getAnimations({subtree:true}).filter(a=>a instanceof CSSAnimation&&a.animationName.startsWith('kj-walk'));
 return frames.map(time=>{for(const a of animations){a.pause();a.currentTime=time}const point=rig.createSVGPoint();point.x=0;point.y=8;return point.matrixTransform(node.getScreenCTM()!).y});
});assert.ok(Math.max(...feet)-Math.min(...feet)<1,'Stance paw must remain on the same ground plane');
await page.emulateMedia({reducedMotion:'reduce'});
assert.equal(await page.locator('svg.kaju *').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).animationName!=='none').length),0);
await page.screenshot({path:`${out}/states-still.png`,fullPage:true});
console.log('PASS 23 states rendered; four independent walking phases; knee articulation; reduced motion stops every loop');

}finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
