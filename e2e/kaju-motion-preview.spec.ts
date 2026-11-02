import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('straypaw.notice.storage.v1','1');localStorage.setItem('straypaw.analytics.optout','1')});
});
test('public movement controls drive the existing rig and respect motion settings',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/ai');
 await page.getByText('See Kaju move',{exact:true}).click();
 const preview=page.getByRole('region',{name:'Kaju character preview'});await preview.scrollIntoViewIfNeeded();
 const movement=preview.getByLabel('Movement',{exact:true}),rig=preview.locator('svg.kaju');
 const states=await movement.locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value));expect(new Set(states).size).toBe(23);
 for(const state of states){await movement.selectOption(state);await expect(rig).toHaveAttribute('data-kaju-state',state);await expect(rig).toHaveAttribute('data-kaju-rig','articulated')}
 await preview.getByRole('button',{name:'Pause motion',exact:true}).click();await expect(rig).toHaveClass(/is-still/);
 await preview.getByRole('button',{name:'Resume motion',exact:true}).click();await expect(rig).not.toHaveClass(/is-still/);
 await preview.getByRole('button',{name:'Play all movements',exact:true}).click();const first=await rig.getAttribute('data-kaju-state');await expect.poll(()=>rig.getAttribute('data-kaju-state'),{timeout:6000}).not.toBe(first);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(rig).toHaveClass(/is-still/);await expect(preview.getByRole('button',{name:'Play all movements',exact:true})).toBeDisabled();
 await movement.selectOption('sleeping');await expect(rig).toHaveAttribute('data-kaju-state','sleeping');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
});
