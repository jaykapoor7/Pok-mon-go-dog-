import { expect, test, type Locator, type Page } from '@playwright/test';

async function autofilled(page: Page, selector: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
  await cdp.send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['autofill']});
  const field=page.locator(selector);
  expect(await field.evaluate(node=>node.matches(':-webkit-autofill'))).toBe(true);
  await readable(field,'123456');
  await cdp.detach();
}

async function readable(field: Locator, value: string) {
  await field.fill(value);
  await expect(field).toHaveValue(value);
  const style = await field.evaluate(node => {
    const s = getComputedStyle(node);
    return {color:s.color,fill:s.webkitTextFillColor,caret:s.caretColor,scheme:s.colorScheme,background:s.backgroundColor};
  });
  const rgb = (s:string) => s.match(/[\d.]+/g)!.slice(0,3).map(Number);
  const luminance = (s:string) => rgb(s).map(v=>{const n=v/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
  // Autofill can force the UA text colour to black while WebKit paints our ink.
  // Both paint paths and the caret must remain readable on the actual surface.
  for(const foreground of [style.color,style.fill,style.caret]){
    const contrast=(luminance(style.background)+0.05)/(luminance(foreground)+0.05);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
  expect(style.scheme).toBe('light');
}

for(const theme of ['light','dark'] as const){
  test(`sign-in text stays readable with a saved ${theme} theme`,async({page})=>{
    await page.emulateMedia({colorScheme:theme});
    await page.addInitScript(t=>{localStorage.setItem('straypaw.theme',t);localStorage.setItem('straypaw.notice.storage.v1','1')},theme);
    await page.goto('/sign-in');await page.getByRole('button',{name:'I accept',exact:true}).click();
    await expect(page.locator('html')).toHaveClass(theme==='dark'?/dark/:/^(?!.*dark)/);
    await readable(page.getByLabel('Work email',{exact:true}),'contrast@straypaw.invalid');
    await readable(page.getByLabel('Access code',{exact:true}),'123456');
    await autofilled(page,'#si-code');
  });

  test(`sign-in pop-up text stays readable with a saved ${theme} theme`,async({page,isMobile})=>{
    test.skip(!isMobile,'The phone account button opens the pop-up; desktop uses the full sign-in page.');
    await page.emulateMedia({colorScheme:theme});
    await page.addInitScript(t=>{localStorage.setItem('straypaw.theme',t);localStorage.setItem('straypaw.notice.storage.v1','1')},theme);
    await page.goto('/community');await page.getByRole('button',{name:'Sign in',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Sign in to StrayPaw'});await expect(dialog).toBeVisible();
    await readable(dialog.getByLabel('Work email',{exact:true}),'contrast@straypaw.invalid');
    await readable(dialog.getByLabel('Access code',{exact:true}),'123456');
    await autofilled(page,'#sheet-code');
  });
}
