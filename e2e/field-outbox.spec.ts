import {test,expect} from '@playwright/test';
import ts from 'typescript';
import fs from 'node:fs';
import type * as Outbox from '../src/lib/field/outbox';
declare global{interface Window{FieldOutbox:typeof Outbox}}
const compiled=ts.transpileModule(fs.readFileSync('src/lib/field/outbox.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const source=`window.FieldOutbox=(()=>{const exports={};${compiled};return exports})()`;
test('offline draft survives reload and remains isolated by workspace',async({page})=>{
 await page.goto('/ngo/field');await page.addScriptTag({content:source});
 await page.context().setOffline(true);
 await page.evaluate(async()=>{await window.FieldOutbox.putDraft({id:'isolated-event',scope:'user-a:org-a',caseId:'isolated-case',code:'TEST',note:'Offline observation',at:new Date().toISOString(),status:'pending'});await window.FieldOutbox.fieldCache('user-a:org-a',{cases:['test-assignment']})});
 expect(await page.evaluate(()=>window.FieldOutbox.readDrafts('user-b:org-a'))).toEqual([]);
 expect(await page.evaluate(()=>window.FieldOutbox.readDrafts('user-a:org-b'))).toEqual([]);
 await page.context().setOffline(false);await page.reload();await page.addScriptTag({content:source});
 expect(await page.evaluate(async()=>(await window.FieldOutbox.readDrafts('user-a:org-a'))[0].note)).toBe('Offline observation');
 expect(await page.evaluate(async()=>(await window.FieldOutbox.fieldCache<{cases:string[]}>('user-a:org-a'))?.value.cases)).toEqual(['test-assignment']);
 await page.evaluate(()=>window.FieldOutbox.deleteDraft('isolated-event'));expect(await page.evaluate(()=>window.FieldOutbox.readDrafts('user-a:org-a'))).toEqual([]);
});
