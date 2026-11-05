'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent((req.url||'/').split('?')[0]);const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Absent');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
async function main(){
 await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
  for(const width of [360,390,820,1440,3440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.goto('http://127.0.0.1:'+server.address().port+'/production.html?mode=client',{waitUntil:'domcontentloaded'});
   const result=await page.evaluate(()=>{
    const steps=document.querySelector('.mir-production-steps');
    return {mode:document.documentElement.classList.contains('mir-production-client'),
      color:getComputedStyle(document.documentElement).getPropertyValue('--green').trim(),
      bg:getComputedStyle(document.body).backgroundColor,
      steps:!!steps&&getComputedStyle(steps).display!=='none',scroll:document.documentElement.scrollWidth,inner:innerWidth,
      overflowers:[...document.querySelectorAll('body *')].filter(el=>{const box=el.getBoundingClientRect(),style=getComputedStyle(el);return style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.right>innerWidth+2}).slice(0,24).map(el=>({tag:el.tagName,cls:String(el.className||'').slice(0,95),id:el.id,right:Math.round(el.getBoundingClientRect().right),width:Math.round(el.getBoundingClientRect().width)}))};
   });
   assert.ok(result.mode&&result.steps,'Parcours client '+width);
   assert.equal(result.color,'#348511','Couleur MIR '+width);
   assert.equal(result.bg,'rgb(250, 250, 247)','Fond MIR '+width);
   assert.ok(result.scroll<=result.inner+2,'Débordement client '+width+': '+result.scroll+' ; éléments: '+JSON.stringify(result.overflowers));
   if(width===390||width===1440||width===3440)await page.screenshot({path:path.resolve(__dirname,'../artifacts/mir-production-signature-'+width+'.png'),fullPage:true});
   await page.close();console.log('PASS Production client '+width+' px');
  }
  const admin=await browser.newPage({viewport:{width:1440,height:900}});
  await admin.goto('http://127.0.0.1:'+server.address().port+'/production.html',{waitUntil:'domcontentloaded'});
  const check=await admin.evaluate(()=>({mode:document.documentElement.classList.contains('mir-production-client'),steps:getComputedStyle(document.querySelector('.mir-production-steps')).display}));
  assert.equal(check.mode,false,'Mode Admin inchangé');
  assert.equal(check.steps,'none','Guide client absent dans Admin');
  await admin.close();console.log('PASS Interface Admin non modifiée');
 }finally{if(browser)await browser.close();server.close();}
}
main().catch(err=>{console.error(err);server.close();process.exitCode=1});
