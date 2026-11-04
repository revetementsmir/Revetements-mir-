'use strict';
/* Contrôles de non-régression MIR sur la source GitHub Pages. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const X = require('../dist/atelier-essai/mir-calepinage-extension.js');
const P = require('../dist/production-model.js');
const Transfer = require('../dist/profile-production-transfer.js');
const StudioCoverage = require('../dist/material-coverage.js');
let total = 0;
function test(name, fn) { fn(); total++; console.log('PASS ' + name); }
test('6/12 : portée 108 po, montée 27 po et pointe 123 po', () => {
  const x = X.gableFromPitch(108, 96, '6/12');
  assert.equal(x.riseIn, 27);
  assert.equal(x.heightIn, 123);
  assert.equal(x.peakXIn, 54);
});
test('Pente 6 / 12 avec espaces', () => assert.equal(X.gableFromPitch('108', '96', '6 / 12').riseIn, 27));
test('Pente numérique 6', () => assert.equal(X.gableFromPitch(108, 96, 6).heightIn, 123));
test('Pentes gauche/droite indépendantes', () => assert.ok(Math.abs(X.gableFromPitch(108, 96, '6/12', '8/12').peakXIn - 108 * 8 / 14) < 1e-8));
test('Fractions chantier', () => {
  assert.equal(X.parseDimension('32½'), 32.5);
  assert.equal(X.parseDimension('2 1/4'), 2.25);
  assert.equal(X.parseDimension('⅜'), .375);
});
test('Largeur verrouillée, fermeture exacte', () => {
  const x = X.redistributePanels({totalAssemblyIn:108,panelCount:3,overlapIn:1,locked:{1:'32½'}});
  assert.equal(x.ok, true);
  assert.equal(x.widthsIn[1],32.5);
  assert.equal(x.closureIn,108);
});
test('Solin brique sans cotes inventées', () => {
  assert.ok(X.PROFILE_TEMPLATES.solin_brique.fields.every(f => f.defaultValue === ''));
});
test('Coin 86 degrés possible', () => {
  const x = X.buildProfileGeometry('coin_arch_90',{faceA:2,faceB:3},{angleOverrides:{faceB:86}});
  assert.equal(x.segments[1].headingDeg,86);
});
test('Coin J : clouage minimum = retour + 1¼', () => {
  assert.equal(X.checkJRule({jReturn:1,nailing:2}).minimumIn,2.25);
  assert.equal(X.autoCorrectJ({jReturn:1,nailing:2}).nailing,2.25);
});
test('Exception J requiert acceptation explicite', () => {
  assert.throws(() => X.acceptJException({jReturn:1,nailing:2},{accepted:false}));
});
test('Snapshot J avec exception transférable en production', () => {
  const s=X.finalizeProfileOrder('coin_arch_j',{faceA:5,faceB:6,jDepth:1,jReturn:1,nailing:2},{exception:{accepted:true,acceptedBy:'MIR',note:'essai'}});
  assert.equal(s.ruleExceptions[0].minimumIn,2.25);
  const prepared=Transfer.prepare(X,s,120,1);
  assert.ok(prepared.spec.note.includes('Dérogation'));
  assert.equal(P.buildProfile(prepared.spec).valid,true);
});
test('Tracé SHIFT orthogonal', () => assert.deepEqual(X.applyDrawingConstraint([0,0],[9,3],{keyboardShift:true}),[9,0]));
test('Le lien production vers coins/solin est présent', () => {
  const html=fs.readFileSync(path.join(__dirname,'../dist/production.html'),'utf8');
  assert.ok(html.includes('atelier-essai/pliages-integration-candidate.html?production=1'));
});
test('La page des coins charge les composants de production', () => {
  const html=fs.readFileSync(path.join(__dirname,'../dist/atelier-essai/pliages-integration-candidate.html'),'utf8');
  assert.ok(html.includes('../profile-production-transfer.js'));
  assert.ok(html.includes('MIR — Solin brique et coins architecturaux'));
});
const Presets = require('../dist/mir-bending-presets.js');
test('Les onze profils MIR sont disponibles dans le configurateur', () => {
  assert.equal(Presets.VARIANTS.length,11);
  for(const preset of Presets.VARIANTS){
    const s=Presets.create(preset.id);
    assert.equal(s.template,'custom');
    assert.equal(s.mirProfileId,preset.id);
    assert.ok(Presets.icon(preset.id).includes('<svg'));
    assert.ok(s.segments.every((part,i)=>part.label===String.fromCharCode(65+i)));
    const template=P.createTemplate({kind:'profile',unit:'in',...s,length:120});
    assert.equal(template.ok,true,preset.id+' : '+JSON.stringify(template.errors));
    assert.equal(P.templatePreview(template.template).ok,true,preset.id+' : aperçu');
  }
});
test('Fascia et L replié gardent le retour écrasé', () => {
  for(const id of ['fascia','l_replie']){
    const s=Presets.create(id);
    assert.equal(s.bends.at(-1).mode,'hem');
    assert.equal(s.segments.length,3);
    assert.equal(P.buildProfile({kind:'profile',unit:'in',...s,length:120}).valid,true);
  }
});
test('Beam avec replis : sept segments, deux retours écrasés', () => {
  const s=Presets.create('beam_replis');
  assert.equal(s.segments.length,7);
  assert.equal(s.bends.filter(b=>b.mode==='hem').length,2);
  assert.equal(s.segments[0].length,'');
  assert.equal(s.segments.at(-1).length,'');
});
test('Les solins brique ne préremplissent aucune cote inconnue', () => {
  for(const id of ['solin_brique','solin_brique_goutte']){
    const s=Presets.create(id);
    assert.ok(s.segments.every(p=>p.length===''));
  }
  assert.equal(Presets.create('solin_brique_goutte').segments.length,4);
});
test('Le J intégré avertit pour le clouage inférieur au minimum', () => {
  const s=Presets.create('coin_arch_j');
  s.segments.forEach(p=>{p.length=p.mirFieldId==='jReturn'?1:p.mirFieldId==='nailing'?2:5;});
  const result=Presets.checkJ({...s,kind:'profile',unit:'in'});
  assert.equal(result.ok,false);
  assert.equal(result.minimumIn,2.25);
});
test('La correction automatique du J respecte le minimum', () => {
  const s=Presets.create('coin_arch_j');
  s.segments.forEach(p=>{p.length=p.mirFieldId==='jReturn'?1:p.mirFieldId==='nailing'?2:5;});
  const after=Presets.autoCorrectJ({...s,kind:'profile',unit:'in'});
  assert.equal(Presets.checkJ(after).ok,true);
  assert.equal(s.segments.at(-1).length,2);
});
test('Une exception J exige une acceptation nominative', () => {
  const s=Presets.create('coin_arch_j');
  s.segments.forEach(p=>{p.length=p.mirFieldId==='jReturn'?1:p.mirFieldId==='nailing'?2:5;});
  s.kind='profile';s.unit='in';
  assert.throws(()=>Presets.finalizeJ(s));
  const x=Presets.checkJ(s);
  const accepted=X.acceptJException({jReturn:x.jReturnIn,nailing:x.nailingIn},
    {accepted:true,acceptedBy:'Contremaître test',note:'À revoir'});
  const result=Presets.finalizeJ(s,accepted);
  assert.equal(result.ruleExceptions[0].minimumIn,2.25);
  assert.equal(result.ruleExceptions[0].acceptedBy,'Contremaître test');
});
test('Le J ne peut pas contourner la règle après modification de la topologie', () => {
  const s=Presets.create('coin_arch_j');
  s.segments.push({label:'F',length:1});
  assert.equal(Presets.checkJ(s).valid,false);
});
test('Les profils sont chargés directement sur la page de production', () => {
  const html=fs.readFileSync(path.join(__dirname,'../dist/production.html'),'utf8');
  const app=fs.readFileSync(path.join(__dirname,'../dist/production-app.js'),'utf8');
  assert.ok(html.includes('mir-bending-presets.js?v=profils-1'));
  assert.ok(app.includes('...window.MIRBendingPresets?.catalog()'));
  assert.ok(app.includes('mir-j-exception-form'));
});

test('La page calepinage expose les contrôles préparés', () => {
  const html=fs.readFileSync(path.join(__dirname,'../dist/calepinage.html'),'utf8');
  const app=fs.readFileSync(path.join(__dirname,'../dist/calepinage-app.js'),'utf8');
  assert.ok(html.includes('id="outline-right-angle"'));
  assert.ok(html.includes('id="roof-pitch"'));
  assert.ok(html.includes('id="apply-roof-pitch"'));
  assert.ok(html.includes('id="piece-width-lock"'));
  assert.ok(html.includes('id="unlock-all"'));
  assert.ok(app.includes('event.shiftKey||outlineRightAngle'));
  assert.ok(app.includes('A?.gableFromPitch?.(width,eave,leftPitch,rightPitch)'));
  assert.ok(app.includes('E.setPanelSize(layout.config,axis'));
});


test('Studio : clin 7 po sur 10 pi = 17 rangs complets + coupe de 1 po', () => {
  const material={id:'test-lap',applications:['siding'],renderPattern:'lap',
    allowedPatterns:['lap'],allowedOrientations:['horizontal'],
    coverage:{exposureIn:7,verified:true}};
  const spec=StudioCoverage.coverageSpec(material,{pattern:'lap',orientation:'horizontal'});
  const layout=StudioCoverage.courseLayout([0,0,100,120],1/12,spec);
  assert.equal(spec.exposureIn,7);
  assert.equal(layout.count,18);
  assert.equal(layout.fullCount,17);
  assert.equal(layout.partialCount,1);
  assert.deepEqual(layout.partialWidthsIn,[1]);
});

test('Studio : panneaux 4×8 / 4×10 gardent leur format et leur orientation', () => {
  const material={id:'test-panel',applications:['siding'],renderPattern:'panel',
    allowedPatterns:['panel'],allowedOrientations:['horizontal','vertical'],
    formats:[
      {id:'48x96',label:'4 × 8',measurementKind:'physical_piece',verified:true,widthIn:48,lengthIn:96},
      {id:'48x120',label:'4 × 10',measurementKind:'physical_piece',verified:true,widthIn:48,lengthIn:120}
    ]};
  const vertical10=StudioCoverage.coverageSpec(material,{pattern:'panel',orientation:'vertical',formatId:'48x120'});
  assert.equal(vertical10.displayWidthIn,48);
  assert.equal(vertical10.displayHeightIn,120);
  const horizontal8=StudioCoverage.coverageSpec(material,{pattern:'panel',orientation:'horizontal',formatId:'48x96'});
  assert.equal(horizontal8.displayWidthIn,96);
  assert.equal(horizontal8.displayHeightIn,48);
  const grid=StudioCoverage.panelGrid([0,0,100,120],1/12,material,{pattern:'panel',orientation:'vertical',formatId:'48x120'});
  assert.equal(grid.columnCount,3);
  assert.equal(grid.rowCount,1);
  assert.equal(grid.columns.at(-1).widthIn,4);
  assert.equal(grid.columns.at(-1).full,false);
});

test('Studio : la vue 2D ne repeint plus le soffite comme une bande sur le mur', () => {
  const app=fs.readFileSync(path.join(__dirname,'../dist/plan-app.js'),'utf8');
  const start=app.indexOf('function facadeSVG');
  const end=app.indexOf('function threeViews',start);
  assert.ok(start>=0&&end>start);
  const facade=app.slice(start,end);
  assert.ok(facade.includes('The stored soffit paths locate undersides'));
  assert.ok(!facade.includes('state.soffitColor'));
  assert.ok(!facade.includes('stroke-width="12"'));
});

test('Studio : le retrait central reste continu sur les deux étages', () => {
  const renderer=fs.readFileSync(path.join(__dirname,'../dist/plan-3d.js'),'utf8');
  assert.ok(renderer.includes("upperStorey:'recessed-confirmed'"));
  assert.ok(renderer.includes("'recessed-assumption' and 'recessed-confirmed' both continue to wallHeight"));
  assert.ok(renderer.includes('The porch ceiling stays independent at its own supplied height'));
});

test('Studio : le grain du fibrociment reste indépendant de la couvrance', () => {
  const surface=fs.readFileSync(path.join(__dirname,'../dist/material-surface.js'),'utf8');
  assert.ok(surface.includes('The grain field is independent from the exposure'));
  assert.ok(surface.includes('step:scaledProfile ? exposureIn * pxPerIn : null'));
  assert.ok(surface.includes('Changing 5 in to 7 in'));
});


test('MIR : les nouveaux modèles restent privés et une diffusion existante est préservée', () => {
  const app=fs.readFileSync(path.join(__dirname,'../dist/production-app.js'),'utf8');
  const begin=app.indexOf('function saveTemplateDialog()');
  const end=app.indexOf('function renderRequests()',begin);
  assert.ok(begin>=0&&end>begin,'dialogue de modèle localisé');
  const form=app.slice(begin,end);
  assert.ok(form.includes("old?.channels?.client===true?' checked':''"));
  assert.ok(form.includes("old?.channels?.store===true?' checked':''"));
  assert.ok(!form.includes('old?.channels?.client===false'));
  assert.ok(!form.includes('old?.channels?.store===false'));
  assert.ok(form.includes('Nouveau modèle privé par défaut sur cet appareil'));
  assert.ok(app.includes("channels:{client:data.has('client'),store:data.has('store')}"));
  assert.ok(app.includes('record.channels?.[catalogueChannel]===true'));
});


const ModelDefaults=require('../dist/model-measure-defaults.js');
test('Mesures standard MIR : fractions, verrouillage et longueur', () => {
 const t=P.createTemplate({kind:'profile',template:'custom',unit:'in',segments:[{label:'A',length:3},{label:'B',length:1.5}],bends:[{mode:'interior',angle:90,direction:'left'}],length:120},{name:'L standard'}).template;
 assert.ok(t);
 const raw={A:{value:'3',locked:true},B:{value:'1½',locked:false},length:{value:'120',locked:true}};
 const validated=ModelDefaults.validate(t,raw);
 assert.equal(validated.ok,true,validated.errors.join('; '));
 const applied=ModelDefaults.prepare(t,validated.data);
 assert.deepEqual(applied.measurements,{A:'3',B:'1½'});
 assert.equal(applied.length,'120');
 assert.equal(applied.locks.A,true);
 assert.equal(applied.locks.length,true);
 const instance=P.instantiateTemplate(t,{unit:'in',measurements:applied.measurements,length:applied.length,quantity:1});
 assert.equal(instance.spec.segments[0].length,'3');
 assert.equal(instance.spec.segments[1].length,'1½');
 assert.equal(instance.snapshot.spec.segments[0].length,'3');
 raw.A.value='9';
 assert.equal(instance.snapshot.spec.segments[0].length,'3');
});
test('Mesures standard MIR : cote verrouillée vide interdite', () => {
 const t=P.createTemplate({kind:'profile',template:'custom',unit:'in',segments:[{label:'A',length:3},{label:'B',length:2}],bends:[{mode:'interior',angle:90,direction:'right'}],length:120},{name:'Test'}).template;
 assert.equal(ModelDefaults.validate(t,{A:{value:'',locked:true}}).ok,false);
 assert.equal(ModelDefaults.validate(t,{A:{value:'abc',locked:false}}).ok,false);
 assert.equal(ModelDefaults.validate(t,{A:{value:'2 1/4',locked:true}}).ok,true);
});
test('Mesures standard MIR : nouvelles fiches privées et usage magasin contrôlé', () => {
 const app=fs.readFileSync(path.join(__dirname,'../dist/production-app.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../dist/production.html'),'utf8');
 assert.ok(html.indexOf('model-measure-defaults.js')<html.indexOf('production-app.js'));
 assert.ok(app.includes('MIRModelDefaults?.prepare(t,record.measurementDefaults)'));
 assert.ok(app.includes('measurementDefaults:checked.data'));
 assert.ok(app.includes('input.readOnly=true'));
 assert.ok(app.includes("catalogueChannel==='store'"));
 assert.ok(app.includes("old?.channels?.client===true?' checked':''"));
 assert.ok(app.includes("old?.channels?.store===true?' checked':''"));
});

console.log('Tests MIR : '+total+'/'+total+' réussis.');