'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs');
const {chromium}=require('playwright');
const script=fs.readFileSync(require('node:path').join(__dirname,'../dist/mir-local-backup.js'));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/backup.js'?'application/javascript':'text/html');res.end(req.url==='/backup.js'?script:'<!doctype html><script src="/backup.js"></script>');});
(async()=>{
  let browser;
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
    const result=await page.evaluate(async()=>{
      const raw=' {"version":1,"records":[]} ';
      localStorage.setItem('mir_production_templates_v1',raw);localStorage.setItem('sb-auth-token','private');
      const before=JSON.stringify({...localStorage});
      const backup=MIRLocalBackup.capture(localStorage),hash=await MIRLocalBackup.checksum(backup);
      const report=MIRLocalBackup.reconcile(localStorage,backup);
      return {before,after:JSON.stringify({...localStorage}),backup,hash,report};
    });
    assert.equal(result.before,result.after);assert.equal(result.backup.entries.length,1);
    assert.equal(result.backup.entries[0].raw,' {"version":1,"records":[]} ');
    assert.match(result.hash,/^[a-f0-9]{64}$/);assert.equal(result.report[0].state,'unchanged');
    console.log('PASS Chromium : sauvegarde exacte, SHA-256, aucun secret exporté, localStorage inchangé');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
