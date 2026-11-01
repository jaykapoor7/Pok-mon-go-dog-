import {expect,test} from '@playwright/test';

test('old NGO domains preserve bookmarks and POSTs while moving to the canonical host', async({request})=>{
  test.skip(!!process.env.E2E_BASE_URL?.startsWith('https:'),'Host matching is checked against the local production server; live aliases are probed separately.');
  for(const host of ['straypaw.kapoorjay.com','pok-mon-go-dog.vercel.app']){
    for(const path of ['/','/sign-in?next=%2Fngo%2Fverification','/login?next=%2Fdashboard','/partner/animals?city=Coimbatore']){
      const response=await request.get(path,{headers:{Host:host},maxRedirects:0});
      expect(response.status()).toBe(307);
      const location=new URL(response.headers().location);expect(location.origin).toBe('https://www.straypaw.org');
      expect(location.pathname+location.search).toBe(path);
    }
    const response=await request.post('/api/join',{headers:{Host:host},data:{email:'nonexistent@straypaw.invalid',code:'ZZZZZZ'},maxRedirects:0});
    expect(response.status()).toBe(307);expect(response.headers().location).toBe('https://www.straypaw.org/api/join');
  }
  const canonical=await request.get('/sign-in',{headers:{Host:'www.straypaw.org'},maxRedirects:0});expect(canonical.status()).toBe(200);
});

test('a stale or missing page offers a direct workspace sign-in recovery',async({page})=>{
  await page.goto('/old-workspace-link-that-does-not-exist');
  const link=page.getByRole('link',{name:'Sign in with your email and access code.'});await expect(link).toBeVisible();
  await link.click();await expect(page).toHaveURL(/\/sign-in\?next=\/app/);
  await page.getByRole('button',{name:'I accept',exact:true}).click();
  await expect(page.getByLabel('Work email',{exact:true})).toBeVisible();await expect(page.getByLabel('Access code',{exact:true})).toBeVisible();
});
