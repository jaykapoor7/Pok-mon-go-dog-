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
 await page.evaluate(async()=>{await window.FieldOutbox.unlockOffline('user-b:org-b','Other account passphrase');});expect(await page.evaluate(()=>window.FieldOutbox.readDrafts('user-a:org-a').then(()=>false,()=>true))).toBe(true);
 await page.evaluate(async()=>{await window.FieldOutbox.unlockOffline('user-a:org-a','Field test passphrase 2026');await window.FieldOutbox.archiveDraft((await window.FieldOutbox.readDrafts('user-a:org-a'))[0],{id:'isolated-event',scope:'user-a:org-a',at:new Date().toISOString(),caseId:'saved-case',auditId:1,label:'Synced fixture'});});
 expect(await page.evaluate(()=>window.FieldOutbox.readDrafts('user-a:org-a'))).toEqual([]);expect(await page.evaluate(async()=>(await window.FieldOutbox.readSynced('user-a:org-a'))[0].caseId)).toBe('saved-case');
 await page.evaluate(()=>window.FieldOutbox.clearOfflineDevice('user-a:org-a'));expect(await page.evaluate(()=>window.FieldOutbox.offlineVaultExists('user-a:org-a'))).toBe(false);
});
