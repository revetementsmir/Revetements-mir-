'use strict';
/* Immutable baseline comparison and isolated browser proof. No external requests. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),{once}=require('node:events');
const {chromium}=require('playwright'),{PNG}=require('pngjs');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const baseline='e58964cd8937766d2457904d2d7d625d1bc7df5e';
const out=path.join(path.resolve(process.env.MIR_PLIAGE03_OUT||path.join(root,'docs/verification/pliage03-20261118')),'protected');
const modifiedAllowed=new Set(['mir-estimate.js','mir-unified-client-dossier.js','pliage.html','production-app.js','production-model.js','production.html','selection.html']);
const newAllowed=new Set(['mir-pliage-documents.js','mir-pliage-surfaces.js','mir-pliage03-en-ca.js','mir-pliage03.css','mir-pliage03.js']);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const git=args=>execFileSync('git',args,{cwd:root,maxBuffer:100*1024*1024});
const report={baseline,checks:[],captures:[],comparisons:[],blockedExternal:[],blockedNonGET:[],pageErrors:[],httpErrors:[],consoleErrors:[]};
const cache={before:new Map(),after:new Map()};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.ico':'image/x-icon'};
function walk(directory,prefix=''){
 return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const relative=path.posix.join(prefix,entry.name),absolute=path.join(directory,entry.name);
  return entry.isDirectory()?walk(absolute,relative):[relative];
 });
}
function currentBytes(file){const absolute=path.join(dist,file);return fs.lstatSync(absolute).isSymbolicLink()?Buffer.from(fs.readlinkSync(absolute)):fs.readFileSync(absolute);}
function boundaries(){
 const tree=new Map(git(['ls-tree','-r','-z',baseline,'--','dist']).toString('utf8').split('\0').filter(Boolean).map(record=>{
  const tab=record.indexOf('\t'),[mode,type,object]=record.slice(0,tab).split(' '),name=record.slice(tab+1).replace(/^dist\//,'');assert.equal(type,'blob');return[name,{mode,object}];
 }));
 const current=new Set(walk(dist)),protectedFiles=[],changed=[],missing=[],unexpectedNew=[],unexpectedChanged=[];
 for(const [file,entry] of tree){
  if(!current.has(file)){missing.push(file);continue;}
  const bytes=currentBytes(file),actualBlob=gitBlob(bytes),same=entry.object===actualBlob;
  const detail={file,bytes:bytes.length,baselineGitBlob:entry.object,currentGitBlob:actualBlob,sha256:sha(bytes),identical:same};
  if(modifiedAllowed.has(file)){if(!same)changed.push(detail);}
  else{protectedFiles.push(detail);if(!same)unexpectedChanged.push(file);}
 }
 const added=[...current].filter(file=>!tree.has(file)).sort();
 for(const file of added)if(!newAllowed.has(file))unexpectedNew.push(file);
 for(const file of modifiedAllowed)assert.ok(tree.has(file),'allowlist must refer to a baseline file: '+file);
 for(const file of newAllowed)assert.ok(!tree.has(file),'new allowlist must not hide a baseline edit: '+file);
 const manifest={baseline,baselineFiles:tree.size,currentFiles:current.size,protectedCount:protectedFiles.length,
  protectedFiles,allowedChanges:changed,allowedNew:added.filter(file=>newAllowed.has(file)).map(file=>({file,sha256:sha(currentBytes(file))})),missing,unexpectedChanged,unexpectedNew};
 fs.writeFileSync(path.join(out,'file-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 report.files={baseline:tree.size,current:current.size,protected:protectedFiles.length,identical:protectedFiles.filter(file=>file.identical).length,allowedModified:changed.map(row=>row.file),allowedNew:manifest.allowedNew.map(row=>row.file),missing,unexpectedChanged,unexpectedNew};
 assert.deepEqual(missing,[],'no removed baseline files');assert.deepEqual(unexpectedChanged,[],'no changes outside the explicit public bending allowlist');assert.deepEqual(unexpectedNew,[],'no unrelated new dist files');
 report.checks.push({name:'all-dist-boundaries',passed:true,protected:protectedFiles.length});
 console.log('PASS protected dist: '+protectedFiles.length+' byte-identical files; '+changed.length+' allowed changes, '+manifest.allowedNew.length+' allowed additions.');
}
function bytes(phase,file){
 const store=cache[phase];if(!store.has(file))store.set(file,phase==='before'?git(['show',baseline+':dist/'+file]):currentBytes(file));return store.get(file);
}
async function serve(){
 const server=http.createServer((req,res)=>{
  if(req.method!=='GET')return res.writeHead(405).end();
  try{
   const url=new URL(req.url,'http://localhost'),segments=decodeURIComponent(url.pathname).replace(/^\/+/, '').split('/'),phase=segments.shift(),file=segments.join('/');
   if(!['before','after'].includes(phase)||!file||file.split('/').some(part=>part==='.'||part==='..')||file.includes('\\'))throw Error('path');
   const data=bytes(phase,file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(data);
  }catch{res.writeHead(404).end();}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');return{origin:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(resolve=>server.close(resolve))};
}
async function capture(browser,server,phase,pageName,viewport){
 const key=pageName.replace('.html','')+'-'+viewport.width,context=await browser.newContext({viewport,hasTouch:viewport.width===390,deviceScaleFactor:1,locale:'fr-CA',reducedMotion:'reduce',serviceWorkers:'block'});
 await context.addInitScript(()=>localStorage.setItem('mir-client-locale-v1','fr-CA'));
 await context.route('**/*',route=>{
  const request=route.request(),url=request.url(),method=request.method();
  if(new URL(url).origin===server.origin&&method==='GET')return route.continue();
  (method==='GET'?report.blockedExternal:report.blockedNonGET).push({phase,pageName,viewport,url,method});return route.abort();
 });
 const page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',error=>report.pageErrors.push({phase,key,message:error.message}));
 page.on('response',response=>{if(response.status()>=400)report.httpErrors.push({phase,key,url:response.url(),status:response.status()});});
 page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push({phase,key,message:message.text(),url:message.location().url});});
 try{
  await page.goto(server.origin+'/'+phase+'/'+pageName,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.MIRClientLocale&&document.documentElement.lang==='fr-CA');
  const images=await page.evaluate(async()=>{
   await document.fonts.ready;
   const visible=[...document.images].filter(image=>{const r=image.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight;});
   await Promise.all(visible.map(async image=>{image.loading='eager';await image.decode().catch(()=>{});}));
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   return visible.map(image=>({src:image.getAttribute('src'),loaded:image.complete&&image.naturalWidth>0,width:image.naturalWidth,height:image.naturalHeight}));
  });
  assert.ok(images.every(image=>image.loaded),'all visible images loaded: '+JSON.stringify(images));
  await page.mouse.move(0,0);const file=path.join(out,key+'-'+phase+'.png');
  await page.screenshot({path:file,animations:'disabled',caret:'hide'});
  const png=fs.readFileSync(file),info={phase,page:pageName,viewport,language:'fr-CA',file:path.basename(file),sha256:sha(png),images,title:await page.title(),bodyClass:await page.locator('body').getAttribute('class')};
  report.captures.push(info);console.log('CAPTURE '+info.file);return png;
 }finally{await context.close();}
}
function compare(before,after,page,viewport){
 const a=PNG.sync.read(before),b=PNG.sync.read(after);assert.equal(a.width,b.width);assert.equal(a.height,b.height);
 let changedPixels=0,maxChannelDelta=0;const diff=new PNG({width:a.width,height:a.height});
 for(let i=0;i<a.data.length;i+=4){let changed=false;for(let channel=0;channel<4;channel++){const delta=Math.abs(a.data[i+channel]-b.data[i+channel]);if(delta)changed=true;maxChannelDelta=Math.max(maxChannelDelta,delta);}if(changed){changedPixels++;diff.data[i]=255;diff.data[i+3]=255;}}
 const detail={page,viewport,pngBytesIdentical:before.equals(after),width:a.width,height:a.height,changedPixels,totalPixels:a.width*a.height,maxChannelDelta,passed:changedPixels===0};
 if(changedPixels){detail.diffFile=page.replace('.html','')+'-'+viewport.width+'-diff.png';fs.writeFileSync(path.join(out,detail.diffFile),PNG.sync.write(diff));}
 report.comparisons.push(detail);assert.equal(changedPixels,0,page+' '+viewport.width+' rendered pixels changed');
 console.log('PASS '+page+' '+viewport.width+': 0 changed pixels; PNG bytes '+(detail.pngBytesIdentical?'identical':'different metadata only')+'.');
}
async function main(){
 fs.mkdirSync(out,{recursive:true});let server,browser;
 try{
  boundaries();
  const home=bytes('before','index.html').toString('utf8');assert.match(home,/href="maison\.html"/,'actual Particuliers link');
  server=await serve();browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});report.browser=browser.version();
  for(const viewport of[{width:1440,height:900},{width:390,height:844}])for(const page of['index.html','maison.html'])compare(await capture(browser,server,'before',page,viewport),await capture(browser,server,'after',page,viewport),page,viewport);
  const requested=new Set([...cache.before.keys(),...cache.after.keys()]);
  report.loadedResources=[...requested].sort().map(file=>({file,beforeSha256:cache.before.has(file)?sha(cache.before.get(file)):null,afterSha256:cache.after.has(file)?sha(cache.after.get(file)):null}));
  assert.ok(report.loadedResources.every(row=>row.beforeSha256===row.afterSha256),'same loaded resources on both versions');
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.httpErrors,[]);assert.deepEqual(report.blockedNonGET,[]);
  const unexpectedConsole=report.consoleErrors.filter(error=>!report.blockedExternal.some(request=>request.url===error.url));assert.deepEqual(unexpectedConsole,[]);
  report.checks.push({name:'home-particuliers-desktop-phone',passed:true,comparisons:report.comparisons.length});
  report.passed=true;
 }catch(error){report.passed=false;report.error=error.stack;throw error;}
 finally{
  report.testSha256=sha(fs.readFileSync(__filename));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();if(server)await server.close();
 }
 console.log('PASS boundaries: '+report.files.protected+' protected files, '+report.comparisons.length+' exact pixel comparisons, '+report.captures.length+' captures.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
