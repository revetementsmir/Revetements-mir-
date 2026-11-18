'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const runtime=require('../dist/mir-field-runtime.js'),policy=require('../mobile/web/policy.cjs');
test('Le temps écoulé dérive du timestamp confirmé, sans compteur local ni heures payables',()=>{const now=Date.parse('2026-11-14T15:02:03Z');assert.equal(runtime.duration(runtime.elapsed('2026-11-14T14:00:00Z',now)),'01:02:03');assert.equal(runtime.duration(runtime.elapsed('2026-11-14T14:00:00Z',now+2*3600000)),'03:02:03');assert.equal(runtime.duration(runtime.elapsed('2026-11-14T15:00:00Z',now)),'00:02:03');assert.equal(runtime.elapsed('',now),0);assert.equal(runtime.elapsed('incorrect',now),0);assert.equal(runtime.elapsed('2026-11-15T00:00Z',now),0);assert.equal(runtime.duration(26*3600+60+2),'26:01:02');});
test('Les trois limites météo n’ouvrent que les deux hôtes et chemins publics nécessaires',()=>{for(const url of['https://geocoding-api.open-meteo.com/v1/search?name=L%C3%A9vis','https://api.open-meteo.com/v1/forecast?latitude=46.8&longitude=-71.2'])assert.equal(policy.allowedRequest(url),true,url);for(const url of['http://api.open-meteo.com/v1/forecast','https://api.open-meteo.com.evil.example/v1/forecast','https://geocoding-api.open-meteo.com/v1/forecast','https://api.open-meteo.com/v1/search','https://api.open-meteo.com/v1/other','https://user@api.open-meteo.com/v1/forecast','https://api.open-meteo.com:8443/v1/forecast','https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/'])assert.equal(policy.allowedRequest(url),false,url);const builder=fs.readFileSync('mobile/tools/build-web.cjs','utf8'),java=fs.readFileSync('mobile/android/app/src/main/java/ca/revetementsmir/equipe/test/MirPolicy.java','utf8');for(const host of['geocoding-api.open-meteo.com','api.open-meteo.com']){assert.ok(builder.includes('https://'+host));assert.ok(java.includes('"'+host+'"'));}assert.doesNotMatch(builder,/https:\/\/\*\.open-meteo\.com/);assert.match(java,/"\/v1\/forecast"\.equals\(u\.getPath\(\)\)/);assert.match(java,/"\/v1\/search"\.equals\(u\.getPath\(\)\)/);});
test('La météo ambiguë, hors ligne ou périmée n’invente jamais des conditions',async()=>{const load=()=>{delete require.cache[require.resolve('../dist/mir-today.js')];return require('../dist/mir-today.js');},turn=()=>new Promise(r=>setImmediate(r));let today=load(),calls=[];today.weather({city:'Ville QA ambiguë'},null,{fetch:async u=>{calls.push(u);return{ok:true,json:async()=>({results:[{name:'Ville QA ambiguë',country_code:'CA'},{name:'Ville QA ambiguë',country_code:'CA'}]})};}});await turn();await turn();assert.equal(calls.length,1);assert.equal(today.weather({city:'Ville QA ambiguë'}).status,'unavailable');today=load();today.weather({latitude:46.8,longitude:-71.2},null,{fetch:async()=>({ok:true,json:async()=>({current:{time:'2020-01-01T10:00',temperature_2m:15,weather_code:0}})})});await turn();await turn();assert.equal(today.weather({latitude:46.8,longitude:-71.2}).label,'Météo indisponible');today=load();let requested=0;assert.equal(today.weather({},null,{fetch:async()=>{requested++;}}).status,'unavailable');assert.equal(requested,0);});
test('Le cadran fait exactement un tour horaire et conserve les heures entières',()=>{const start='2026-11-13T12:00:00Z',base=Date.parse(start);assert.deepEqual([0,15,30,45,60,75].map(m=>runtime.angle(start,base+m*60000)),[0,90,180,270,0,90]);assert.equal(runtime.duration(runtime.elapsed(start,base+(125*3600+125)*1000)),'125:02:05');});
test('Le dernier chantier provient de la journée travaillée strictement précédente, même après le week-end',()=>{const friday={id:'friday',work_date:'2026-11-13',ended_at:'2026-11-13T22:00:00Z',segments:[{type:'job',jobId:'A',startedAt:'2026-11-13T12:00:00Z'},{type:'travel',jobId:'A',nextJobId:'B',startedAt:'2026-11-13T21:00:00Z'}]},monday={id:'monday',work_date:'2026-11-16',ended_at:'2026-11-16T16:00:00Z',segments:[{type:'job',jobId:'B',startedAt:'2026-11-16T12:00:00Z'}]};assert.deepEqual(runtime.lastWorked([monday,friday],'2026-11-16'),{jobId:'A',shiftId:'friday',date:'2026-11-13'});assert.equal(runtime.businessDay(new Date('2026-11-15T03:30:00Z')),'2026-11-14');assert.equal(runtime.previousDay('2026-03-09'),'2026-03-08');assert.equal(runtime.lastWorked([{...friday,work_date:undefined}],'2026-11-16'),null);});

const vm = require('node:vm');
const views = { MIRFieldRuntime: runtime };
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/mir-field-views.js'), 'utf8'), { window: views });
const consultedJob = { id: 'consulted', name: 'Pavillon du Parc', closed: false };
const pointedJob = { id: 'pointed', name: 'Résidence des Érables', closed: false };

function renderHome(mode, state, punchPending = false) {
  return views.MIRFieldViews.render({
    view: 'day', mode, job: consultedJob, jobs: [consultedJob, pointedJob],
    actor: { name: 'Alex' }, state, punchPending, icon: () => '',
  });
}

test('Accueil chantier affiche le pointage en attente ou le chantier confirmé, même si une autre job est consultée', () => {
  const state = { punch: { enabled: true } };
  for (const mode of ['employe', 'chef_equipe']) {
    const ready = renderHome(mode, state);
    assert.match(ready, /field-home-punch-primary[^>]+data-view="punch"/);
    assert.match(ready, /Ouvrir le punch/);
    assert.doesNotMatch(ready, /data-punch=/);

    const pending = renderHome(mode, state, true);
    assert.match(pending, /Pointage en attente de synchronisation/);
    assert.doesNotMatch(pending, /field-home-punch-primary|Prêt à commencer/);

    const activeState = { punch: { enabled: true, activeShift: {
      started_at: new Date().toISOString(), segment: { segment_type: 'job', job_id: pointedJob.id },
    } } };
    assert.match(renderHome(mode, activeState), /<strong>Pointage en cours<\/strong>\s*<small>Résidence des Érables<\/small>/);
    assert.match(renderHome(mode, activeState, true), /Dernier chantier confirmé · Résidence des Érables/);
  }
});

test('Accueil Chef compte les présences du chantier supervisé et donne accès aux parcours existants', () => {
  const lead = {
    selectedJobId: consultedJob.id,
    assignment: { jobId: consultedJob.id },
    team: [{ status: 'present' }, { status: 'absent' }, { status: 'unconfirmed' }],
  };
  const chef = renderHome('chef_equipe', { lead });
  assert.match(chef, /data-view="lead-team"[^>]*>[^]*?1 présence à confirmer/);
  assert.match(chef, /data-lead-report/);
  assert.doesNotMatch(renderHome('chef_equipe', { lead: { ...lead, selectedJobId: pointedJob.id } }), /data-lead-report|présence à confirmer/);
  const employee = renderHome('employe', { lead });
  assert.doesNotMatch(employee, /data-lead-report|data-view="lead-team"/);
  assert.match(employee, /data-field-catalogue="fold"[^>]*>[^]*?Commander un pliage/);
});
