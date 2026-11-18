'use strict';
/* Renderer fixtures only. Real customer downloads are covered by the browser
 * journey. Fixed date, local fonts, no submission or external transport. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{once}=require('node:events'),{chromium}=require('playwright');
const {startPaintProof,finishPaintProof,verifyStudioPDF}=require('./helpers/mir-studio-pdf-proof.cjs');
const repo=path.resolve(__dirname,'..'),out=path.resolve(process.env.MIR_STUDIO_HARMONY_OUT||path.join(repo,'docs/verification/studio-harmonie-20261118/qa'));
const baseline='e0cd92d9e6dd01b3f6697dd7de972df95839c8e1',report={baseline,checks:[],errors:[],consoleErrors:[],httpErrors:[],blocked:[]};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),folder=path.join(out,'pdf');
const svg=(label='A1 — cote source')=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600"><path d="M80 500V220L500 80L920 220V500Z" fill="#aabcb0" stroke="#333" stroke-width="5"/><rect x="180" y="280" width="170" height="150" fill="#d7e1e0" stroke="#333"/><rect x="650" y="280" width="170" height="150" fill="#d7e1e0" stroke="#333"/><text x="100" y="550" font-size="25">'+label+'</text></svg>';
async function serve(){
 const cache=new Map();const server=http.createServer((req,res)=>{if(req.method!=='GET')return res.writeHead(405).end();try{
  const url=new URL(req.url,'http://local'),parts=decodeURIComponent(url.pathname).split('/').filter(Boolean),revision=parts.shift(),file=parts.join('/');if(!['before','after'].includes(revision)||file.includes('..'))throw Error('path');
  if(file==='plan.html'){
   const excluded=url.searchParams.has('embed')||url.searchParams.get('context')==='admin'||url.searchParams.get('mode')==='atelier';
   res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><style>@font-face{font-family:"DM Sans";src:url("assets/fonts/dm-sans-variable.ttf")}body{font-family:"DM Sans"}</style></head><body'+(excluded?'':' data-mir-studio-layout="materials-bottom"')+'><p>QA renderer fixture — no project or service</p><script src="mir-client-en-ca.js"></script><script src="mir-client-i18n.js"></script><script src="annotated-pdf.js"></script>'+(revision==='after'?'<script src="mir-studio-pdf.js"></script>':'')+'</body></html>');return;
  }
  const key=revision+'/'+file;if(!cache.has(key))cache.set(key,revision==='before'?execFileSync('git',['show',baseline+':dist/'+file],{cwd:repo,maxBuffer:50*1024*1024}):fs.readFileSync(path.join(repo,'dist',file)));
  res.writeHead(200,{'content-type':({'.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream'});res.end(cache.get(key));
 }catch{res.writeHead(404).end();}});server.listen(0,'127.0.0.1');await once(server,'listening');return{origin:'http://127.0.0.1:'+server.address().port,cache,close:()=>new Promise(r=>server.close(r))};
}
async function pageFor(browser,srv,revision,query='',locale='fr-CA'){
 const context=await browser.newContext({locale:'fr-CA',serviceWorkers:'block'});
 await context.addInitScript(locale=>{localStorage.setItem('mir-client-locale-v1',locale);const NativeDate=Date,fixed=Date.UTC(2026,10,18,12,0,0);window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};},locale);
 await context.route('**/*',route=>{const r=route.request();if(new URL(r.url()).origin===srv.origin&&r.method()==='GET')return route.continue();report.blocked.push({url:r.url(),method:r.method()});return route.abort();});
 const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});p.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});
 await p.goto(srv.origin+'/'+revision+'/plan.html'+query);await p.waitForFunction(()=>!!window.MIRPDF&&!!window.MIRClientLocale);await p.evaluate(async()=>{await document.fonts.ready;await document.fonts.load('400 34px "DM Sans"');await document.fonts.load('600 68px "DM Sans"');MIRClientLocale.installPdfAdapter();});return{context,p};
}
async function make(p,options){return p.evaluate(async options=>{const before=JSON.stringify(options),result=await MIRPDF.makePlan(options),bytes=new Uint8Array(await result.blob.arrayBuffer());if(before!==JSON.stringify(options))throw Error('PDF renderer mutated source options');return{pages:result.pages,renderer:result.renderer||'legacy',filename:result.filename,bytes:Array.from(bytes),diagnostics:window.MIRStudioPDF?.diagnostics()||null,expected:MIRClientLocale.localizePdfOptions(options).faces};},options);}
async function legacy(browser,srv){
 const cases=[{id:'client-no-opt-in',query:''},{id:'admin-opt-in',query:'?context=admin',theme:true},{id:'atelier-opt-in',query:'?mode=atelier',theme:true},{id:'embed-opt-in',query:'?embed',theme:true},{id:'wide-layout',query:'',theme:true,layout:'wide'},{id:'bending-layout',query:'',theme:true,layout:'bending-sheet'},{id:'english-no-opt-in',query:'',locale:'en-CA'}];const results=[];
 for(const c of cases){
  const options={title:'MIR QA — document source',subtitle:'Fixture locale, sans commande',filename:'fixture-legacy.pdf',...(c.theme?{theme:'studio-client'}:{}),faces:[{key:'front',name:'Avant',svg:svg(),summary:['Source exacte : 12,34 pi².',{label:'Référence longue : 48 1/2 po × 96 po.',color:'#aabbaa'}],...(c.layout?{layout:c.layout}:{})}]};let original;
  for(const revision of ['before','after']){const {context,p}=await pageFor(browser,srv,revision,c.query,c.locale||'fr-CA');try{const d=await make(p,options),bytes=Buffer.from(d.bytes);assert.equal(d.renderer,'legacy','excluded/opt-out call retains legacy renderer');fs.writeFileSync(path.join(folder,c.id+'-'+revision+'.pdf'),bytes);if(revision==='before')original={pages:d.pages,sha256:sha(bytes)};else{assert.equal(d.pages,original.pages);assert.equal(sha(bytes),original.sha256,'legacy output byte-identical: '+c.id);results.push({id:c.id,pages:d.pages,sha256:sha(bytes),byteIdentical:true});}}finally{await context.close();}}
 }
 return results;
}
async function stress(browser,srv,locale){
 const {context,p}=await pageFor(browser,srv,'after','',locale);try{
  const faces=['front','right','back','left'].map((key,index)=>({key,name:['Avant','Droite','Arrière','Gauche'][index],svg:svg('ANNOTATION '+key),summary:Array.from({length:8},(_,n)=>({label:'QA '+key+' '+n+' · Fabricant conservé · Couleur Écorce · 12,34 pi² · 48 1/2 po × 96 po. '+('Référence, pose et stock à confirmer. '.repeat(n===7?90:2)),color:n===0?'#8a9b7f':null})),scaleNote:'QA échelle variable — conserver 1/16 po.',footerNote:'QA sans valeur de construction.'}));
  faces[0].summary.push({text:'RéférenceSansEspace'.repeat(80)});
  const options={theme:'studio-client',includeTechnical:true,title:'QA annexes intégrales',subtitle:'Données fictives de test local uniquement',filename:'qa-annexes.pdf',faces,presentationFaces:faces.map(f=>({key:f.key,svg:svg(''),materials:[{brand:'QA fabricant',product:'QA profil',color:'Écorce'}]}))};
  await startPaintProof(p);const result=await make(p,options),paint=await finishPaintProof(p),proof=verifyStudioPDF(result.diagnostics,result.expected,paint);assert.ok(proof.technicalPages>2,'long rows span real annex pages');assert.ok(result.diagnostics.sourceRows.some(r=>r.fragments.length>1),'one source row continues without loss across pages');
  const bytes=Buffer.from(result.bytes);fs.writeFileSync(path.join(folder,'stress-'+locale+'.pdf'),bytes);fs.writeFileSync(path.join(folder,'stress-'+locale+'-proof.json'),JSON.stringify({proof,diagnostics:result.diagnostics,paint,expected:result.expected},null,2)+'\n');return{...proof,sha256:sha(bytes),bytes:bytes.length,sourceOptionsUnchanged:true};
 }finally{await context.close();}
}
async function main(){fs.mkdirSync(folder,{recursive:true});const srv=await serve(),browser=await chromium.launch({executablePath:process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const [name,fn]of [['legacy-byte-identical',()=>legacy(browser,srv)],...['fr-CA','en-CA'].map(l=>['annex-stress-'+l,()=>stress(browser,srv,l)])]){try{report.checks.push({name,passed:true,detail:await fn()});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}}
 report.sourceSha256=Object.fromEntries([...srv.cache].map(([n,b])=>[n,sha(b)]));report.testSha256=sha(fs.readFileSync(__filename));
 }finally{report.passed=report.checks.every(c=>c.passed)&&!['errors','consoleErrors','httpErrors','blocked'].some(k=>report[k].length);fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await srv.close();}assert.ok(report.passed,'see PDF results');}
main().catch(e=>{console.error(e);process.exitCode=1;});
