'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..');const {serve}=require(path.join(root,'tests/helpers/mir-static-http.cjs'));
const sizes=[{width:1440,height:1100},{width:834,height:1112},{width:390,height:844}];
async function ready(page){await page.evaluate(async()=>{await document.fonts.ready;await Promise.race([Promise.all([...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0}).map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,2500))]);await new Promise(requestAnimationFrame);});}
async function screenshot(page,name){await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)});await ready(page);await page.screenshot({path:path.join(__dirname,name+'.png')});}
(async()=>{const server=await serve(path.join(root,'dist')),browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const results=[];
try{for(const size of sizes)for(const lang of ['fr-CA','en-CA']){
 const ctx=await browser.newContext({viewport:size,reducedMotion:'reduce',hasTouch:size.width<1100,serviceWorkers:'block'}),page=await ctx.newPage(),blocked=[],errors=[];page.setDefaultTimeout(12000);
 await ctx.route('**/*',r=>{const q=r.request();if(new URL(q.url()).origin!==server.base||!['GET','HEAD'].includes(q.method())){blocked.push({method:q.method(),url:q.url().split('?')[0]});return r.abort();}return r.continue();});page.on('pageerror',e=>errors.push(e.message));
 const row={width:size.width,language:lang,passed:false};
 try{
  await page.goto(server.base+'/boutique.html?view=brands&recette=1');await page.locator('.brand-collection-card').first().waitFor();
  if(lang==='en-CA'){await page.locator('[data-mir-locale="en-CA"]').first().click();await page.waitForFunction(()=>document.documentElement.lang==='en-CA');}
  const count=await page.locator('.brand-collection-card').count();assert.equal(count,20);
  if(lang==='en-CA')await screenshot(page,`after-brands-${size.width}-en`);
  await page.locator('.brand-collection-card').filter({hasText:'James Hardie'}).click();
  const product=page.locator('[data-shop-card="hardieplank-select-625"]');await product.waitFor();assert.equal(await page.locator('#shop-brand').inputValue(),'James Hardie');
  await product.locator('h3 a').click();await page.locator('#product-add').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),lang);
  assert.equal(new URL(page.url()).searchParams.get('id'),'hardieplank-select-625');
  await page.locator('#product-return').click();await product.waitFor();assert.equal(await page.locator('#shop-brand').inputValue(),'James Hardie');
  await page.goto(server.base+'/boutique.html?view=all&recette=1');await product.waitFor();assert.equal(await page.locator('.shop-card').count(),78);
  if(lang==='en-CA')await screenshot(page,`after-all-${size.width}-en`);
  await page.locator('#shop-search').fill('CanExel');await page.waitForFunction(()=>document.querySelectorAll('.shop-card').length===5);assert.equal(await page.locator('.shop-card').count(),5);
  assert((await page.locator('.shop-card').allTextContents()).every(t=>t.includes('CanExel')));await screenshot(page,`navigation-search-${size.width}-${lang}`);
  await page.locator('#shop-search').fill('');await page.locator('.category-card').filter({hasText:lang==='en-CA'?'Fibre cement':'Fibrociment'}).click();
  await product.waitFor();assert.equal(await page.locator('#shop-family').inputValue(),'fibre');
  await page.locator('#shop-filter-toggle').click();await page.locator('#shop-brand').selectOption('James Hardie');assert.equal(await page.locator('#shop-brand').inputValue(),'James Hardie');await page.locator('#shop-filter-toggle').click();
  await screenshot(page,`navigation-filter-${size.width}-${lang}`);
  await product.locator('h3 a').click();await page.locator('#product-add').waitFor();await page.locator('[data-color="hardie-pierre-des-champs"]').click();await page.locator('#product-unit').selectOption('pièces');await page.locator('#product-quantity').fill('2');
  await screenshot(page,`navigation-product-${size.width}-${lang}`);await page.locator('#product-add').click();await page.locator('#product-added').waitFor();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir-shopping-list-v1')));assert.equal(stored.items.length,1);assert.equal(stored.items[0].quantity,2);assert.equal(stored.items[0].colorId,'hardie-pierre-des-champs');assert.equal(stored.items[0].unit,'pièces');
  await page.locator('#product-added a').click();await page.locator('[data-qty]').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.locator('[data-qty]').inputValue(),'2');assert.equal(await page.locator('[data-cart-color]').inputValue(),'hardie-pierre-des-champs');assert.equal(await page.locator('[data-prestige-cart-count]').innerText(),'1');
  await screenshot(page,`navigation-cart-${size.width}-${lang}`);await page.reload();await page.locator('[data-qty]').waitFor();assert.equal(await page.locator('[data-qty]').inputValue(),'2');
  await page.goto(server.base+'/boutique.html?view=all&recette=1');await product.waitFor();assert.equal(await page.locator('[data-prestige-cart-count]').innerText(),'1');assert.equal(await page.locator('html').getAttribute('lang'),lang);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),size.width);assert.equal(errors.length,0);row.passed=true;row.brands=count;row.products=78;row.searchResults=5;row.localCart={count:1,quantity:2,colour:'hardie-pierre-des-champs',unit:'pièces'};row.estimateSubmitted=false;
 }catch(e){row.error=e.message;console.error(e.message);}finally{row.errors=errors;row.blocked=blocked;results.push(row);await ctx.close();console.log(JSON.stringify(row));}
}}finally{await browser.close();await server.close();fs.writeFileSync(path.join(__dirname,'navigation-results.json'),JSON.stringify({createdAt:new Date().toISOString(),network:'local GET only',results},null,2)+'\n');}
if(results.some(r=>!r.passed))process.exitCode=1;
})();
