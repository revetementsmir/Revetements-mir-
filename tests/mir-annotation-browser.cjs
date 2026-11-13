'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {once} = require('node:events');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'../dist');
const server = http.createServer((req,res) => {
  const name = decodeURIComponent(new URL(req.url,'http://local').pathname);
  const file = path.resolve(root,'.'+name);
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  const mime = {'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'};
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
(async()=>{
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  const browser = await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    await page.route('**/*.supabase.co/**',route=>route.abort());
    const base = 'http://127.0.0.1:'+server.address().port;
    await page.goto(base+'/annoter.html');
    await page.locator('[data-mir-annotation-ready="true"]').waitFor();
    assert.equal(await page.locator('iframe').count(),0,'real screen must be in the main DOM');
    await page.getByRole('button',{name:'Annoter',exact:true}).click();
    await page.getByRole('link',{name:'Voir notre boutique',exact:true}).click();
    assert.equal(new URL(page.url()).pathname,'/annoter.html','annotation click must not navigate');
    await page.getByPlaceholder('Qu’aimerais-tu changer ?').fill('PREUVE LOCALE — modifier le bouton Boutique');
    await page.getByRole('button',{name:'Ajouter l’annotation au tableau',exact:true}).click();
    await page.getByText('PREUVE LOCALE — modifier le bouton Boutique',{exact:true}).first().waitFor();
    const target = await page.locator('.annotation-list').innerText();
    assert(target.includes('PREUVE LOCALE'));
    fs.mkdirSync('artifacts/mir-annotations',{recursive:true});
    await page.screenshot({path:'artifacts/mir-annotations/note.png'});
    await page.close();
    const mobile = await browser.newPage({viewport:{width:390,height:844}});
    await mobile.route('**/*.supabase.co/**',route=>route.abort());
    await mobile.goto(base+'/annoter.html?page=boutique.html');
    await mobile.locator('[data-mir-annotation-ready="true"]').waitFor();
    assert.equal(await mobile.locator('iframe').count(),0);
    await mobile.getByRole('button',{name:'Annoter',exact:true}).click();
    assert(await mobile.locator('button.preview-annotation-start').getAttribute('aria-pressed')==='true');
    await mobile.goto(base+'/annoter.html?page=https://example.com');
    assert((await mobile.locator('[role=status]').innerText()).includes('ne fait pas partie'));
    console.log('PASS main-document selection, note, navigation prevention, mobile and page allowlist');
  } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
