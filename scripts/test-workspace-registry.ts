import assert from 'node:assert/strict';
import {DESTINATIONS,workspaceView,destinations,tabsFor,currentDestination,type Role} from '../src/sp/shell/workspaces';
let n=0;function check(label:string,fn:()=>void){fn();console.log(`PASS ${++n} ${label}`)}
check('unique destinations per workspace',()=>assert.equal(new Set(DESTINATIONS.map(x=>x.workspace+':'+x.href)).size,DESTINATIONS.length));
for(const role of [null,'member','veterinarian','coordinator','admin'] as (Role|null)[]){
 check(`all surfaces share visibility for ${role??'unknown'}`,()=>{const view=workspaceView('ngo',role);const allowed=new Set(destinations('ngo',role).map(x=>x.href));for(const x of [...view.nav,...view.dests,...view.index.flatMap(g=>g.links)])assert.ok(allowed.has(x.href));for(const x of DESTINATIONS.filter(x=>x.workspace==='ngo'))for(const t of tabsFor(x.href,role)?.tabs??[])assert.ok(allowed.has(t.href));if(role!=='admin')assert.ok(!allowed.has('/ngo/team'));if(!role)assert.ok(!allowed.has('/ngo/packages'))});
}
check('clinical authorisation is directly discoverable for veterinarians',()=>assert.ok(workspaceView('ngo','veterinarian').nav.some(n=>n.href==='/ngo/verification')));
check('reviewer-only discovery denied by default',()=>assert.ok(!destinations('city',null).some(n=>n.href==='/city/review')));
check('reviewer discovery allowed with verified context',()=>assert.ok(destinations('city',null,true).some(n=>n.href==='/city/review')));
check('longest path wins for record breadcrumbs',()=>assert.equal(currentDestination('ngo','/ngo/cases/new','coordinator')?.href,'/ngo/cases/new'));
check('existing case links remain in Work',()=>assert.equal(tabsFor('/ngo/cases/new','coordinator')?.tabs.some(n=>n.href==='/ngo/work'),true));
check('organisation map belongs to Animals on every surface',()=>{assert.equal(currentDestination('ngo','/ngo/map','member')?.group,'Animals');assert.ok(tabsFor('/ngo/map','member')?.tabs.some(n=>n.href==='/ngo/animals'))});
console.log(`${n} registry checks passed`);
