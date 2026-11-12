const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dist=path.resolve(__dirname,'../dist');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(dist,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    const base=`http://127.0.0.1:${server.address().port}/`;
    await page.goto(base+'index.html?responsive=atelier');
    await page.waitForSelector('html[data-mir-responsive="ready"]',{timeout:30000});
    console.log('READY',await page.locator('.mir-responsive-page').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,heading:e.querySelector('h1').textContent})));
    console.log('MENU',await page.locator('.mir-client-menu-toggle').evaluate(e=>({hidden:e.hidden,display:getComputedStyle(e).display})));
    for(const layout of ['phone','tablet','web']){
      await page.evaluate(layout=>window.MIRResponsive.workspace.setLayout(layout),layout);
      await page.waitForTimeout(400);
      const result=await page.locator('.mir-responsive-page').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,visible:e.getBoundingClientRect().width>0}));
      assert(result.visible);assert(result.width>300);
      assert(result.scroll<=result.width+2, 'Débordement '+layout);
      if(result.scroll>result.width+2)console.log('OVERFLOW',await page.locator('.mir-responsive-page').evaluate(root=>[...root.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>root.getBoundingClientRect().right+2).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,width:e.clientWidth,style:getComputedStyle(e).fontSize}))));
      assert.equal(await page.locator('iframe').count(),0);
      assert.equal(await page.locator('#hero-title').count(),1);
      console.log(layout,result);
    }
    await page.evaluate(()=>window.MIRResponsive.workspace.setLayout('phone'));
    await page.waitForTimeout(300);
    await page.locator('.mir-client-menu-toggle').click();
    assert.equal(await page.locator('.mir-client-menu-toggle').getAttribute('aria-expanded'),'true');
    console.log('buttons',await page.locator('.preview-workspace-toolbar button').allTextContents());
    await page.getByRole('button',{name:'Annoter',exact:true}).click();
    await page.locator('.mir-home-account').click();
    console.log('ANNOTATION',await page.locator('textarea').evaluateAll(es=>es.map(e=>({placeholder:e.placeholder,aria:e.getAttribute('aria-label')}))));
    console.log('ANNOTATION UI',(await page.locator('body').innerText()).slice(-9000));
    await page.getByPlaceholder('Qu’aimerais-tu changer ?').fill('Recette locale MIR : vérifier ce lien.');
    console.log('AFTER FILL',await page.locator('body').innerText()); await page.screenshot({path:path.resolve(__dirname,'../artifacts/annotation-debug.png')}); await page.locator('button').filter({hasText:/^Ajouter$/}).click({timeout:4000});
    assert(await page.getByText('Recette locale MIR : vérifier ce lien.',{exact:false}).count()>0);
    const plain=await context.newPage();
    await plain.setViewportSize({width:837,height:1180});await plain.goto(base+'index.html');
    console.log('BASELINE TABLET',await plain.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})));
    const measure=()=>['.site-header','.mir-client-links','.mir-home-brand','.mir-home-header-actions','body'].map(s=>{const e=document.querySelector(s);const c=getComputedStyle(e);return {s,width:e.clientWidth,font:c.font,display:c.display,gap:c.gap}});
    console.log('BASELINE STYLES',await plain.evaluate(measure));
    await page.keyboard.press('Escape');
    await page.evaluate(()=>window.MIRResponsive.workspace.setLayout('tablet'));await page.waitForTimeout(250);
    console.log('PREVIEW STYLES',await page.evaluate(measure));
    console.log('ERRORS',errors);
    for (const route of ['realisations','contact','materiaux','boutique','produit','selection','pliage']) {
      await page.goto(base+route+'.html?responsive=atelier');
      await page.waitForSelector('html[data-mir-responsive="ready"]');
      for(const layout of ['phone','tablet','web']) {
        await page.evaluate(value=>window.MIRResponsive.workspace.setLayout(value),layout);
        await page.waitForTimeout(150);
        assert.equal(await page.locator('.mir-responsive-page').count(),1);
        assert.equal(await page.locator('iframe').count(),0);
        console.log('PAGE',route,layout,await page.locator('.mir-responsive-page').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth})));
        const overflow=await page.locator('.mir-responsive-page').evaluate(root=>{
          const edge=root.getBoundingClientRect().right;
          return [...root.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>edge+2).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,width:Math.round(e.getBoundingClientRect().width),right:Math.round(e.getBoundingClientRect().right-edge)}));
        });
        if(overflow.length) console.log('OVERFLOW',route,layout,overflow);
        assert.equal(await page.locator('.mir-responsive-page').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true,'Débordement global '+route+' '+layout);
      }
    }
    await page.goto(base+'production.html?responsive=atelier');
    assert.equal(await page.locator('.preview-workspace').count(),0);
    assert.equal(await page.locator('.mir-responsive-page').count(),0);
    console.log('PASS: private production screen not mounted by public adapter');
    fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
    await page.screenshot({path:path.resolve(__dirname,'../artifacts/mir-responsive-phone.png')});
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
