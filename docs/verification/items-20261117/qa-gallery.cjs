'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {serve}=require('../../../tests/helpers/mir-static-http.cjs');
(async()=>{
 const root=path.resolve(__dirname,'../../..'),server=await serve(path.join(root,'dist'));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),checks=[];
 try{for(const width of [1440,834,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===server.base&&route.request().method()==='GET'?route.continue():route.abort());
  await page.goto(server.base+'/items-20261117.html');
  const images=await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(image=>{image.loading='eager';return image.decode();}));return images.map(image=>({src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight}));});
  assert.equal(images.length,12);assert.ok(images.every(image=>image.width>0&&image.height>0));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);
  checks.push({width,decodedImages:images.length,overflow:false,errors});await page.close();
 }}finally{await browser.close();await server.close();}
 fs.writeFileSync(path.join(__dirname,'gallery-results.json'),JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2)+'\n');
 console.log(JSON.stringify({success:true,widths:checks.map(x=>x.width),images:12}));
})().catch(error=>{console.error(error);process.exitCode=1;});
