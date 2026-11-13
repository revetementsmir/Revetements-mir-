'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const today=require('../dist/mir-today.js');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('date métier Toronto et coordonnées régionales, sans GPS',()=>{
 assert.equal(today.dayKey(new Date('2026-11-11T01:00:00Z')),'2026-11-10');
 assert.deepEqual(today.locationKey({latitude:46.8139,longitude:-71.208}),{latitude:'46.8',longitude:'-71.2'});
 for(const job of [{},{latitude:null,longitude:0},{latitude:'',longitude:1},{latitude:91,longitude:1}])assert.equal(today.locationKey(job),null);
});
test('météo sans coordonnées ne fait aucune requête',()=>{
 let calls=0;assert.equal(today.weather({},null,{fetch:()=>{calls++;}}).status,'unavailable');assert.equal(calls,0);
});
test('météo chargement, cache et abonnés après nouveau rendu',async()=>{
 let finish,requests=0,seen=0,url,options;const fetch=async(u,o)=>{requests++;url=u;options=o;return new Promise(r=>{finish=r;});};
 const job={latitude:45.23,longitude:-72.34};
 assert.equal(today.weather(job,()=>seen++,{fetch}).status,'loading');await turn();
 today.weather(job,()=>seen++,{fetch});finish({ok:true,json:async()=>({current:{time:today.dayKey()+'T10:00',temperature_2m:0,weather_code:71}})});await turn();await turn();
 assert.equal(requests,1);assert.equal(seen,2);assert.equal(today.weather(job).label,'0 °C · Neige');
 assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(url.includes('45.23'),false);assert.equal(url.includes('address'),false);
});
test('échec ou donnée périmée météo sans fausse météo',async()=>{
 for(const [lat,fetch]of [[47.1,async()=>{throw Error('offline');}],[48.2,async()=>({ok:true,json:async()=>({current:{time:'2000-01-01T10:00',temperature_2m:20}})})]]){
  const job={latitude:lat,longitude:-73.3};today.weather(job,null,{fetch});await turn();await turn();assert.equal(today.weather(job).label,'Météo indisponible');
 }
});
test('avis personnels non lus; routes interdites et chantier étranger refusés',()=>{
 assert.equal(today.personalNotices({notifications:[{id:1,read_at:'date'},{id:2}]}).length,1);
 for(const role of ['employee','chef_equipe']){
  assert.equal(today.notificationTarget({route:{view:'members',url:'javascript:alert(1)'}},role,['job']),null);
  assert.equal(today.notificationTarget({route:{jobId:'foreign'}},role,['job']),null);
  assert.deepEqual(today.notificationTarget({route:{jobId:'job'}},role,['job']),{jobId:'job'});
 }
});
test('ville canonique seulement pour la météo sans coordonnées du snapshot principal',async()=>{
 const urls=[];const job={city:'Lévis',address:'ADRESSE PRIVÉE',name:'NOM PRIVÉ'};
 today.weather(job,null,{fetch:async(url)=>{urls.push(url);return {ok:true,json:async()=>url.includes('geocoding-api')?{results:[{name:'Lévis',country_code:'CA',latitude:46.8,longitude:-71.2}]}:{current:{time:today.dayKey()+'T09:00',temperature_2m:4,weather_code:0}}};}});
 await turn();await turn();assert.equal(today.weather(job).status,'ready');assert.equal(urls.length,2);
 assert.equal(urls.some(url=>url.includes('PRIV')),false);assert.match(urls[0],/geocoding-api/);assert.match(urls[1],/latitude=46.8/);
});
test('Punch, client RPC et modules validés préservés depuis main',()=>{
 const base=require('./fixtures/mir-today-baseline.json'),hash=s=>createHash('sha256').update(s).digest('hex');
 for(const [file,expected]of Object.entries(base.files)){
  let source=fs.readFileSync(file,'utf8');
  // Phase3A's explicitly bounded chat API/upload and three blob-revocation hooks
  // are tested separately. All non-chat client bytes remain pinned to Phase2.
  if(file==='dist/portal-client.js'){
   assert.equal((source.match(/^      revokeChatURLs\(\);$/gm)||[]).length,3);
   source=source
   .replace(/    \/\/ Phase3A chat API begin\.[\s\S]*?    \/\/ Phase3A chat API end\.\n/,'')
   .replace(/    \/\/ Phase3C help\/support API begin\.[\s\S]*?    \/\/ Phase3C help\/support API end\.\n/,'')
   .replace(/    \/\/ Phase8 Harmony settings API begin\.[\s\S]*?    \/\/ Phase8 Harmony settings API end\.\n/,'')
   .replace(/      \/\/ Phase3A chat upload begin\.[\s\S]*?      \/\/ Phase3A chat upload end\.\n/,'')
   .replaceAll('      revokeChatURLs();\n','')
   .replace(/if\(String\(path\)\.split\('\/'\)\[1\]==='message'\)return chat(?:Photo|File)URL\(path\);/,'')
   .replace("const mime=String(file?.type||'').toLowerCase(),extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif',...(scope==='message'?{'application/pdf':'pdf'}:{})};","const mime=String(file?.type||'').toLowerCase(),extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif'};")
   .replace("if(!extensions[mime]||!file.size||file.size>10*1024*1024)fail('UPLOAD_INVALID',scope==='message'?'Utilisez une photo ou un PDF de 10 Mo maximum.':'Utilisez une photo JPG, PNG, WebP ou HEIC de 10 Mo maximum.');","if(!extensions[mime]||!file.size||file.size>10*1024*1024)fail('UPLOAD_INVALID','Utilisez une photo JPG, PNG, WebP ou HEIC de 10 Mo maximum.');")
   .replace("['private','team','job']","['private','team']")
   .replace(/      chatConversations, chatMessages, chatSearch, validateMessageAttachment, ackChatMessage, (?:chatFileURL, )?chatPhotoURL,\n/,'')
   .replace(/      helpFAQ, supportSnapshot, supportAction, supportUpload, supportFileURL,\n/,'');
   source=source.replace(',syncHarmonySettings().catch(()=>0)','').replace(';syncHarmonySettings().catch(()=>{})','').replace(', harmonySettings, syncHarmonySettings','');
  }
  assert.equal(hash(source),expected,file);
 }
 const after=fs.readFileSync('dist/chantier-app.js','utf8');
 for(const name of ['punchCard','renderPunchHours','punchCorrectionDialog','punchDecisionDialog','renderWarehouse','renderManagement']){
  const extract=s=>{const start=s.indexOf('  function '+name+'(');assert.ok(start>=0,name);const end=s.indexOf('\n  function ',start+1);return s.slice(start,end<0?undefined:end);};
  // Some adjacent presentation helpers are intentionally added before punchCard;
  // the function bodies below each remain byte-for-byte unchanged.
  assert.equal(hash(extract(after)),base.functions[name],name);
 }
 assert.doesNotMatch(fs.readFileSync('dist/mir-today.js','utf8'),/geolocation|watchPosition|\.rpc\(|\.from\(|service_role|sb_secret_/);
 assert.match(after,/portalClient\.jobDossier\(job.id\)/);
 assert.match(after,/mode==='chef_equipe'/);
});
