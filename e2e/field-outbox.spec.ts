import {test,expect} from '@playwright/test';
import ts from 'typescript';
import fs from 'node:fs';
import type * as Outbox from '../src/lib/field/outbox';
declare global{interface Window{FieldOutbox:typeof Outbox}}
const compiled=ts.transpileModule(fs.readFileSync('src/lib/field/outbox.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const source=`window.FieldOutbox=(()=>{const exports={};${compiled};return exports})()`;
test('encrypted offline records recover after reload and stay locked across scopes',async({page})=>{
 await page.goto('/ngo/field');await page.addScriptTag({content:source});
 await page.evaluate(async()=>{await window.FieldOutbox.unlockOffline('user-a:org-a','Field test passphrase 2026');await window.FieldOutbox.putDraft({id:'isolated-event',scope:'user-a:org-a',caseId:'isolated-case',code:'TEST',note:'Private offline observation',file:new Blob(['private photo bytes'],{type:'image/png'}),at:new Date().toISOString(),status:'pending'});await window.FieldOutbox.fieldCache('user-a:org-a',{cases:['private assignment']})});
 const raw=await page.evaluate(()=>new Promise<string>((resolve,reject)=>{const r=indexedDB.open('straypaw-field-v1',3);r.onsuccess=()=>{const t=r.result.transaction('drafts'),q=t.objectStore('drafts').get('isolated-event');q.onsuccess=()=>{resolve(JSON.stringify(q.result));r.result.close()};q.onerror=()=>reject(q.error)}}));
 expect(raw).not.toContain('Private offline observation');expect(raw).not.toContain('private photo bytes');expect(raw).toContain('encrypted');
 expect(await page.evaluate(()=>window.FieldOutbox.readDrafts('user-b:org-a').then(()=>false,()=>true))).toBe(true);
 expect(await page.evaluate(()=>window.FieldOutbox.clearOfflineDevice('user-a:org-a').then(()=>false,()=>true))).toBe(true);
 await page.evaluate(()=>window.FieldOutbox.lockOffline());expect(await page.evaluate(()=>window.FieldOutbox.readDrafts('user-a:org-a').then(()=>false,()=>true))).toBe(true);
 expect(await page.evaluate(()=>window.FieldOutbox.unlockOffline('user-a:org-a','Wrong passphrase 2026').then(()=>false,()=>true))).toBe(true);
 await page.reload();await page.addScriptTag({content:source});await page.evaluate(()=>window.FieldOutbox.unlockOffline('user-a:org-a','Field test passphrase 2026'));
 const recovered=await page.evaluate(async()=>{const d=(await window.FieldOutbox.readDrafts('user-a:org-a'))[0];return{note:d.note,photo:await d.file?.text(),cache:(await window.FieldOutbox.fieldCache<{cases:string[]}>('user-a:org-a'))?.value.cases}});
 expect(recovered).toEqual({note:'Private offline observation',photo:'private photo bytes',cache:['private assignment']});
 await page.evaluate(async()=>{await window.FieldOutbox.unlockOffline('user-b:org-b','Other account passphrase');});expect(await page.evaluate(()=>window.FieldOutbox.putDraft({id:'isolated-event',scope:'user-b:org-b',caseId:'foreign-case',code:null,note:'must not overwrite',at:new Date().toISOString(),status:'pending'}).then(()=>false,()=>true))).toBe(true);expect(await page.evaluate(()=>window.FieldOutbox.readDrafts('user-a:org-a').then(()=>false,()=>true))).toBe(true);
 await page.evaluate(async()=>{await window.FieldOutbox.unlockOffline('user-a:org-a','Field test passphrase 2026');await window.FieldOutbox.archiveDraft((await window.FieldOutbox.readDrafts('user-a:org-a'))[0],{id:'isolated-event',scope:'user-a:org-a',at:new Date().toISOString(),caseId:'saved-case',auditId:1,label:'Synced fixture'});});
 expect(await page.evaluate(()=>window.FieldOutbox.readDrafts('user-a:org-a'))).toEqual([]);expect(await page.evaluate(async()=>(await window.FieldOutbox.readSynced('user-a:org-a'))[0].caseId)).toBe('saved-case');
 await page.evaluate(()=>window.FieldOutbox.clearOfflineDevice('user-a:org-a'));expect(await page.evaluate(()=>window.FieldOutbox.offlineVaultExists('user-a:org-a'))).toBe(false);
});

/* Field mode without a PIN (20 Nov 2026): this phone's own key, kept in device storage, so records are ciphertext at
   rest, survive a reload without anyone typing anything, and stay apart per person and organisation. Records kept with
   the earlier PIN move across once, keeping their ids (their request ids), and survey observations stay where they are. */
test('field records on this phone: encrypted without a PIN, kept across reloads, older PIN records brought across',async({page})=>{
 await page.goto('/ngo/field');await page.addScriptTag({content:source});
 const device=await page.evaluate(async()=>{const s=await window.FieldOutbox.openDevice('user-d:org-d');await window.FieldOutbox.putDraft({id:'device-event',scope:s,caseId:'case-d',code:'TEST',note:'Private field note',file:new Blob(['device photo bytes'],{type:'image/png'}),at:new Date().toISOString(),status:'pending'});return s});
 expect(device).toBe('user-d:org-d:device');
 const raw=await page.evaluate(()=>new Promise<string>((resolve,reject)=>{const r=indexedDB.open('straypaw-field-v1',3);r.onsuccess=()=>{const q=r.result.transaction('drafts').objectStore('drafts').get('device-event');q.onsuccess=()=>{resolve(JSON.stringify(q.result));r.result.close()};q.onerror=()=>reject(q.error)}}));
 expect(raw).toContain('encrypted');expect(raw).not.toContain('Private field note');expect(raw).not.toContain('device photo bytes');
 // Another person's scope is not opened by this one.
 expect(await page.evaluate(()=>window.FieldOutbox.readDrafts('user-e:org-d:device').then(()=>false,()=>true))).toBe(true);
 // After a reload the same phone opens the same records with no PIN.
 await page.reload();await page.addScriptTag({content:source});
 const back=await page.evaluate(async()=>{const s=await window.FieldOutbox.openDevice('user-d:org-d');const d=(await window.FieldOutbox.readDrafts(s))[0];return{note:d.note,photo:await d.file?.text()}});
 expect(back).toEqual({note:'Private field note',photo:'device photo bytes'});
 // Older records under the PIN: the field ones move across with their ids; the survey one stays with its survey.
 const moved=await page.evaluate(async()=>{const O=window.FieldOutbox;await O.unlockOffline('user-d:org-d','Older field PIN 2026');
  await O.putDraft({id:'old-field',scope:'user-d:org-d',caseId:'case-o',code:null,note:'Older field record',at:new Date().toISOString(),status:'pending'});
  await O.putDraft({id:'old-survey',scope:'user-d:org-d',caseId:'survey-o',code:null,note:'Older survey record',at:new Date().toISOString(),status:'pending',survey:{surveyId:'survey-o'} as never});
  const s=await O.openDevice('user-d:org-d');const n=await O.moveRecords('user-d:org-d',s,(d)=>!d.survey);
  return{n,device:(await O.readDrafts(s)).map((d)=>d.id).sort(),pin:(await O.readDrafts('user-d:org-d')).map((d)=>d.id),kept:await O.keptCount('user-d:org-d')}});
 expect(moved).toEqual({n:1,device:['device-event','old-field'],pin:['old-survey'],kept:1});
});
