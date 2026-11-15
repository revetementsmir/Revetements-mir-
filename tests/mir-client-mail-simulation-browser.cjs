'use strict';
/* Verify pre-existing internal mail templates only. No transport, recipients,
 * provider access, invitation sending, Supabase, or production. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),P=require('../dist/mir-estimate-presentation.js');
const out=path.resolve(__dirname,'../artifacts');fs.mkdirSync(out,{recursive:true});
const payload={source:'general',contact:{name:'MIR CLIENT FICTIF',email:'fake@example.invalid',phone:'555-0123'},address:{street:'123 rue de test',city:'Québec',postalCode:'G1A 1A1'},note:'Not a real request',selection:{materials:{items:[]}}};
const before=JSON.stringify(payload);
const notice=P.notification({payload,requestNumber:'MIR-TEST-ONLY-0042',privateURL:'https://example.invalid/preview',test:true});
assert.match(notice.subject,/RECETTE MIR TEST/);
assert.match(notice.text,/demande fictive, ne pas traiter/);
assert.equal(JSON.stringify(payload),before);
async function main(){
 let browser;
 try{
  try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
  catch(e){const bin=process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium';browser=await chromium.launch({executablePath:bin,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});}
  for(const width of [390,834,1440]){
   const page=await browser.newPage({viewport:{width,height:width===390?844:width===834?1112:900},reducedMotion:'reduce'});
   const html=notice.html.replace('cid:mir-logo','data:image/png;base64,'+P.logoBase64);
   await page.setContent(html,{waitUntil:'load'});
   assert.equal(await page.locator('html').getAttribute('lang'),'fr','internal staff email is not a customer English template');
   assert.match(await page.locator('body').innerText(),/RECETTE MIR TEST/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'email no overflow at '+width);
   await page.screenshot({path:path.join(out,'mir-mail-internal-fictive-'+width+'.png'),animations:'disabled'});
   await page.close();
   console.log('PASS MIR internal mail simulated only '+width+'px: no sending or external data');
  }
 }finally{await browser?.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
