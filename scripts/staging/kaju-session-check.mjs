/** Real staging sessions; only the model transport is held to test an account-change race. */
import {fixture} from './fixture-env.mjs';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
if(!fixture)throw Error('Isolated staging fixture required');
const client=createClient(process.env.STAGING_URL,fixture.anon,{auth:{persistSession:false}});
const {data,error}=await client.auth.signInWithPassword({email:fixture.users.coord.email,password:fixture.password});if(error)throw error;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined});
try{
 const context=await browser.newContext();
 await context.addInitScript(({session,ref,userId,otherId})=>{
  localStorage.setItem(`sb-${ref}-auth-token`,JSON.stringify(session));localStorage.setItem('straypaw.notice.storage.v1','1');localStorage.setItem('straypaw.analytics.optout','1');localStorage.setItem('straypaw.tour.v2','1');
  const message=text=>JSON.stringify([{id:'isolated',role:'assistant',text,reply:{text,engine:'tools',tools:[],citations:[],proposals:[]}}]);
  sessionStorage.setItem('sp3.ai.thread',message('FORBIDDEN LEGACY ACCOUNT TEXT'));
  sessionStorage.setItem(`sp3.ai.thread.${otherId}`,message('FORBIDDEN OTHER ACCOUNT TEXT'));
  sessionStorage.setItem(`sp3.ai.thread.${userId}`,message('CURRENT ACCOUNT TEST TEXT'));
 },{session:data.session,ref:fixture.ref,userId:data.user.id,otherId:fixture.users.other.id});
 const page=await context.newPage();const base=process.env.BASE??'http://localhost:3105';await page.goto(base+'/assistant');
 await expect(page.getByText('CURRENT ACCOUNT TEST TEXT',{exact:true})).toBeVisible();await expect(page.getByText(/FORBIDDEN/)).toHaveCount(0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('sp3.ai.thread')),null);
 console.log('PASS current account history restored; another account and legacy history never displayed');
 let held;let started;const received=new Promise(resolve=>{started=resolve});const hold=new Promise(resolve=>{held=resolve});
 await page.route('**/api/ai',async route=>{if(route.request().method()!=='POST')return route.continue();started();await hold;await route.fulfill({json:{text:'FORBIDDEN LATE ACCOUNT REPLY',engine:'model',tools:[],citations:[],proposals:[]}}).catch(()=>{})});
 await page.getByRole('textbox',{name:'Message Kaju'}).fill('Isolated request held during sign-out');await page.getByRole('button',{name:'Send',exact:true}).click();await received;
 await page.getByRole('button',{name:/^Account:/}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page.getByText('CURRENT ACCOUNT TEST TEXT',{exact:true})).toHaveCount(0);held();await expect(page.getByText(/FORBIDDEN/)).toHaveCount(0);
 assert.ok(!(await page.evaluate(()=>sessionStorage.getItem('sp3.ai.thread.guest')??'')).includes('CURRENT ACCOUNT'));
 console.log('PASS real auth sign-out clears visible transcript and pending reply cannot enter guest history');
}finally{await browser.close()}
