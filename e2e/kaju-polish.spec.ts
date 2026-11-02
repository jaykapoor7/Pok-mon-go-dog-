import {test,expect} from '@playwright/test';
const response=(text:string,scope='guest')=>({text,scope,engine:'tools',tools:[],citations:[],proposals:[]});
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('straypaw.notice.storage.v1','1');localStorage.setItem('straypaw.analytics.optout','1')});
});
test('malformed reply shows a retry and leaves the thread usable',async({page})=>{
 await page.route('**/api/ai',r=>r.request().method()==='GET'?r.fulfill({json:{scope:'guest',tools:true,model:false}}):r.fulfill({json:{text:'broken',engine:'model',tools:null}}));
 await page.goto('/assistant');const input=page.getByRole('textbox',{name:'Message Kaju'});await expect(input).toBeEnabled();await input.fill('A transport test');await page.getByRole('button',{name:'Send',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'incomplete response'})).toBeVisible();await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();await expect(input).toBeEnabled();
});
test('stop and new conversation discard late replies without fake streaming',async({page})=>{
 let release:()=>void=()=>{};let received:()=>void=()=>{};const started=new Promise<void>(r=>received=r);const held=new Promise<void>(r=>release=r);
 await page.route('**/api/ai',async r=>{if(r.request().method()==='GET')return r.fulfill({json:{scope:'guest',tools:true,model:false}});received();await held;await r.fulfill({json:response('LATE TRANSPORT TEXT')}).catch(()=>{})});
 await page.goto('/assistant');const input=page.getByRole('textbox',{name:'Message Kaju'});await expect(input).toBeEnabled();await input.fill('Hold this response');await page.getByRole('button',{name:'Send',exact:true}).click();await started;
 await page.getByRole('button',{name:'Stop waiting'}).click();await expect(page.getByText('Stopped waiting. No prepared action was confirmed.')).toBeVisible();await page.getByRole('button',{name:'New conversation',exact:true}).click();release();await expect(page.getByText('LATE TRANSPORT TEXT')).toHaveCount(0);await expect(page.getByRole('button',{name:'Send',exact:true})).toBeVisible();
});
test('a server workspace scope change hides the old conversation',async({page})=>{
 let scope='isolated-scope-one';
 await page.route('**/api/ai',r=>r.fulfill({json:r.request().method()==='GET'?{scope,tools:true,model:false}:response('FIRST WORKSPACE PRIVATE TEST TEXT',scope)}));
 await page.goto('/assistant');const input=page.getByRole('textbox',{name:'Message Kaju'});await expect(input).toBeEnabled();await input.fill('Read this isolated workspace');await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.getByText('FIRST WORKSPACE PRIVATE TEST TEXT')).toBeVisible();
 scope='isolated-scope-two';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByText('FIRST WORKSPACE PRIVATE TEST TEXT')).toHaveCount(0);
});
test('panel restores launcher focus and full screen never duplicates the thread',async({page,isMobile})=>{
 await page.route('**/api/ai',r=>r.fulfill({json:{scope:'guest',tools:true,model:false}}));
 await page.goto('/community');const opener=isMobile?page.getByRole('navigation',{name:/navigation/}).getByRole('button',{name:'Kaju',exact:true}):page.getByRole('banner').getByRole('button',{name:'Kaju',exact:true});await opener.click();
 const panel=page.getByRole('complementary',{name:'Kaju'});await expect(panel).toBeVisible();await expect(panel.getByRole('textbox',{name:'Message Kaju'})).toBeFocused();await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);await expect(opener).toBeFocused();
 await opener.click();await page.getByRole('link',{name:'Open full screen',exact:true}).click();await expect(page.getByRole('textbox',{name:'Message Kaju'})).toHaveCount(1);await expect(page.getByRole('complementary',{name:'Kaju'})).toHaveCount(0);
});
test('unsafe citation and unsupported proposal are rejected as malformed',async({page})=>{
 await page.route('**/api/ai',r=>r.fulfill({json:r.request().method()==='GET'?{scope:'guest',tools:true,model:false}:{...response('Unsafe fixture'),citations:[{id:'x',label:'Unsafe',href:'javascript:alert(1)',kind:'page'}]}}));
 await page.goto('/assistant');await page.getByRole('textbox',{name:'Message Kaju'}).fill('Check invalid citation');await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.getByText('Kaju returned an incomplete response. No action was confirmed. Try again.')).toBeVisible();await expect(page.getByRole('link',{name:'Unsafe',exact:true})).toHaveCount(0);
});
test('expired sessions hide the thread and offer a sign-in route',async({page})=>{
 let expired=false;
 await page.route('**/api/ai',r=>{if(r.request().method()==='GET')return r.fulfill({status:expired?401:200,json:expired?{error:'Session expired'}:{scope:'guest',tools:true,model:false}});expired=true;return r.fulfill({status:401,json:{error:'Session expired'}})});
 await page.goto('/assistant');await page.getByRole('textbox',{name:'Message Kaju'}).fill('Expired transport test');await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'session has expired'})).toBeVisible();await expect(page.getByRole('alert').getByRole('link',{name:'Sign in',exact:true})).toHaveAttribute('href',/\/sign-in\?next=/);await expect(page.getByRole('textbox',{name:'Message Kaju'})).toBeDisabled();
});
test('a timed out request can be retried and cannot append its late reply',async({page})=>{
 let release:()=>void=()=>{};let started:()=>void=()=>{};const received=new Promise<void>(r=>started=r);const held=new Promise<void>(r=>release=r);
 await page.route('**/api/ai',async r=>{if(r.request().method()==='GET')return r.fulfill({json:{scope:'guest',tools:true,model:false}});started();await held;await r.fulfill({json:response('LATE TIMEOUT TEXT')}).catch(()=>{})});
 await page.goto('/assistant');await page.clock.install();await page.getByRole('textbox',{name:'Message Kaju'}).fill('Timeout transport test');await page.getByRole('button',{name:'Send',exact:true}).click();await received;await page.clock.fastForward(56000);
 await expect(page.getByRole('alert').filter({hasText:/timed out/i})).toBeVisible();await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();release();await expect(page.getByText('LATE TIMEOUT TEXT')).toHaveCount(0);
});
