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
test('Solin brique et coin avec J sont directement accessibles sur la vraie page de production', () => {
  const html=fs.readFileSync(path.join(__dirname,'../dist/production.html'),'utf8');
  const app=fs.readFileSync(path.join(__dirname,'../dist/production-app.js'),'utf8');
  assert.ok(html.includes('production.html?profile=solin_brique'));
  assert.ok(html.includes('production.html?profile=coin_arch_j'));
  assert.ok(app.includes("params.get('profile')"));
  assert.ok(!html.includes('href="atelier-essai/index.html"'));
  assert.ok(!html.includes('href="atelier-essai/pliages-integration-candidate.html'));
});
test('Les pages principales ne renvoient plus vers les écrans de démonstration', () => {
  for(const name of ['production.html','pliage.html','metres.html']){
    const html=fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
    assert.doesNotMatch(html,/href=["']atelier-essai\/[^"']*(?:candidate\.html|index\.html)/);
  }
  const pliage=fs.readFileSync(path.join(__dirname,'../dist/pliage.html'),'utf8');
  const metres=fs.readFileSync(path.join(__dirname,'../dist/metres.html'),'utf8');
  assert.ok(pliage.includes('profile=solin_brique'));
  assert.ok(pliage.includes('profile=coin_arch_j'));
  assert.ok(metres.includes('production.html?view=orders'));
});
test('La page des coins charge les composants de production', () => {
  const html=fs.readFileSync(path.join(__dirname,'../dist/atelier-essai/pliages-integration-candidate.html'),'utf8');
  assert.ok(html.includes('../profile-production-transfer.js'));
  assert.ok(html.includes('MIR — Solin brique et coins architecturaux'));
});
const Presets = require('../dist/mir-bending-presets.js');
test('Les dix modèles canoniques Phase 10 sont disponibles dans le configurateur', () => {
  assert.equal(Presets.VARIANTS.length,10);
  assert.deepEqual(Presets.VARIANTS.map(({id})=>id),[
    'fascia','ailes_fenetre','eloignement_eaux','goutte_eau_8','sill_trim',
    'beam','colonne','l_transition','capage_climatiseur','ventilation_mur_fenetre'
  ]);
  assert.ok(!Presets.VARIANTS.some(({id})=>['omega','beam_replis','solin_brique_goutte'].includes(id)));
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
test('Fascia Phase 10 verrouille le retour à 3/4 po', () => {
  const s=Presets.create('fascia');
  assert.equal(s.segments.at(-1).length,.75);
  assert.ok(s.mirLockedFields.includes('hem'));
});
test('Les trois topologies décidées par Frederick n’inventent aucune cote', () => {
  for(const id of ['ailes_fenetre','eloignement_eaux','goutte_eau_8']){
    const s=Presets.create(id);
    assert.ok(s.segments.every(segment=>segment.length===''),id);
  }
  assert.deepEqual(Presets.create('ailes_fenetre').bends.map(b=>b.angle),[90,-90]);
  assert.deepEqual(Presets.create('eloignement_eaux').bends.map(b=>b.angle),[-90,90]);
  assert.deepEqual(Presets.create('goutte_eau_8').bends.map(b=>b.angle),[-90,90]);
});
test('Goutte d’eau exige un développé total exactement égal à 8 po', () => {
  const s=Presets.create('goutte_eau_8');
  s.kind='profile';s.unit='in';s.length=120;
  s.segments.forEach((segment,index)=>segment.length=[5.5,2,.5][index]);
  assert.equal(Presets.checkCanonical(s).ok,true);
  s.segments.at(-1).length=1.5;
  const invalid=Presets.checkCanonical(s);
  assert.equal(invalid.ok,false);
  assert.equal(invalid.errors[0].code,'DEVELOPED_TOTAL_8_REQUIRED');
});
test('Les variantes dérivées et profils historiques restent accessibles hors décompte', () => {
  assert.equal(Presets.create('beam_replis').mirCanonicalPhase10,false);
  assert.equal(Presets.create('solin_brique_goutte').mirCanonicalPhase10,false);
  assert.equal(Presets.create('coin_arch_j').mirCanonicalPhase10,false);
  assert.ok(Presets.catalog().omega===undefined);
});
test('Beam avec replis : sept segments, deux retours écrasés', () => {
  const s=Presets.create('beam_replis');
  assert.equal(s.segments.length,7);
  assert.equal(s.bends.filter(b=>b.mode==='hem').length,2);
  assert.equal(s.segments[0].length,.625);
  assert.equal(s.segments.at(-1).length,.625);
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
  assert.ok(html.includes('mir-bending-presets.js?v=phase10-1'));
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


test('MIR : nouvelle version conservée en brouillon jusqu’au tarif, ancienne version intacte', () => {
  const app=fs.readFileSync(path.join(__dirname,'../dist/production-app.js'),'utf8');
  const begin=app.indexOf('function saveTemplateDialog()');
  const end=app.indexOf('function renderRequests()',begin);
  assert.ok(begin>=0&&end>begin,'dialogue de modèle localisé');
  const form=app.slice(begin,end);
  assert.ok(form.includes("old?.commercial?.wantsClient===true||old?.channels?.client===true||boutiqueChecked?' checked':''"),'Le canal Boutique ne se préremplit que par historique ou sélection explicite de la nouvelle pièce');
  assert.ok(form.includes("boutiqueChecked=document.querySelector('#mir-freeform-client-toggle')?.checked===true"),'Le choix Boutique est décoché par défaut et lu explicitement');
   assert.ok(form.includes("storeChecked=document.querySelector('#mir-freeform-store-toggle')?.checked===true"),'Le Magasin est indépendant du choix Boutique');
  assert.ok(form.includes("old?.channels?.store===true||storeChecked?' checked':''"));
  assert.ok(!form.includes('old?.channels?.client===false'));
  assert.ok(!form.includes('old?.channels?.store===false'));
  assert.ok(form.includes('Nouveau modèle privé par défaut sur cet appareil'));
  assert.ok(app.includes("channels:{client:data.has('client'),store:data.has('store'),po:data.has('po')}"),'Une moulure rejoint la boutique uniquement si la case correspondante est cochée');
  assert.ok(app.includes("commercial:{...(old?.commercial||{}),status:'draft'"),'La sélection Boutique ne publie pas un produit sans prix');
  assert.ok(app.includes("commercial:{...(old?.commercial||{}),status:'draft'"));
  assert.ok(app.includes('versions:old?[...old.versions,copy(result.template)]:[copy(result.template)]'));
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
  assert.ok(app.includes("old?.commercial?.wantsClient===true||old?.channels?.client===true||boutiqueChecked?' checked':''"),'Le catalogue existant conserve son choix; Boutique facultative pour un nouveau tracé');
 assert.ok(app.includes("old?.channels?.store===true||storeChecked?' checked':''"));
});


test('Pliage MIR : retour écrasé avec un raccord arrondi', () => {
 const code=fs.readFileSync(path.join(__dirname,'../dist/production-model.js'),'utf8');
 const start=code.indexOf('function profileSectionPath(');
 const end=code.indexOf('\nfunction profileSideMarkers(',start);
 assert.ok(start>=0&&end>start);
 const draw=new Function('decimal',code.slice(start,end)+'\nreturn profileSectionPath;')(v=>String(Math.round(v*100)/100));
 const section=draw([[0,0],[100,0],[0,0]],[{mode:'hem',angle:180,direction:'left'}]);
 assert.equal(section.folds.length,1);
 assert.equal(section.segments.length,2);
 assert.match(section.path,/ A5 5 0 0 0 /);
 const mirrored=draw([[0,0],[100,0],[0,0]],[{mode:'hem',angle:180,direction:'right'}]);
 assert.match(mirrored.path,/ A5 5 0 0 1 /);
 assert.doesNotMatch(draw([[0,0],[100,0],[100,100]],[{mode:'signed',angle:90}]).path,/ A/);
 assert.equal((section.path.match(/ L/g)||[]).length,2,'deux côtés droits reliés par un arc');
 assert.equal(section.segments[1][0][1],-10,'repli à 10 pixels du premier trait');
});


test('Repères A-B-C : le solveur garde tous les badges dans le cadre et cible le milieu exact', () => {
 const code=fs.readFileSync(path.join(__dirname,'../dist/production-model.js'),'utf8');
 const begin=code.indexOf('function profileSideMarkers(');
 const end=code.indexOf('\nfunction profileDiagramContent(',begin);
 assert.ok(begin>0&&end>begin);
 const place=new Function('decimal','esc',code.slice(begin,end)+'\nreturn profileSideMarkers;')(
   v=>String(Math.round(v*100)/100),s=>String(s));
 const segments=[[[140,200],[390,200]],[[390,200],[390,300]],[[390,300],[500,300]]];
 const labels={segments:[{label:'A'},{label:'B'},{label:'C'}]};
 const normal=place({segments,folds:[]},labels,[]);
 assert.ok(normal.includes('>A</text>')&&normal.includes('>B</text>')&&normal.includes('>C</text>'));
 const tiny=place({segments:[[[80,80],[81,80]]],folds:[]},{segments:[{label:'A'}]},[],null,[0,160],[0,160]);
 assert.ok(tiny.includes('>A</text>'));
 assert.equal((tiny.match(/>A<\/text>/g)||[]).length,1,'un seul badge par segment');
 assert.match(tiny,/data-anchor-x="80\.5" data-anchor-y="80"/,'le rappel vise le milieu du segment');
 const center=tiny.match(/transform="translate\(([\d.]+),([\d.]+)\)/);
 assert.ok(center,'badge rendu');
 assert.ok(Number(center[1])>=12&&Number(center[1])<=148&&Number(center[2])>=12&&Number(center[2])<=148,'badge et ses marges dans le cadre');
});


test('Tracé MIR : un repli manuel reste écrasé après une petite retouche', () => {
 const code=fs.readFileSync(path.join(__dirname,'../dist/production-app.js'),'utf8');
 const start=code.indexOf('function toCustom(');
 const end=code.indexOf('\nfunction unlockCustom(',start);
 assert.ok(start>0&&end>start);
 function makeTracer(tool){
  return new Function('draft','tool','fmt','unitValue','copy','authoring',
   code.slice(start,end)+'\nreturn toCustom;')(
    {},tool,v=>String(Math.round(v*10000)/10000),
    (length,unit)=>unit==='mm'?length:length/25.4,
    value=>JSON.parse(JSON.stringify(value)),false);
 }
 const points=[[0,0],[100,0],[5,5],[5,85]];
 const base={unit:'in',name:'Retour serré',template:'custom',
  bends:[{mode:'hem',angle:180,direction:'right'},{mode:'signed',angle:-90}]};
 const after=makeTracer('edit')(points,base);
 assert.equal(after.segments.length,3);
 assert.equal(after.bends.length,2);
 assert.equal(after.bends[0].mode,'hem');
 assert.equal(after.bends[0].direction,'right');
 assert.equal(after.bends[1].mode,'signed');
 const withoutHem=makeTracer('edit')(points,{...base,bends:[]});
 assert.equal(withoutHem.bends[0].mode,'signed','pas de repli créé silencieusement en édition');
 const drawn=makeTracer('draw')(points,{...base,bends:[]});
 assert.equal(drawn.bends[0].mode,'hem','un retour quasi 180° dessiné est détecté');
});


const TemplateBackup=require('../dist/template-library-backup.js');
test('Sauvegarde MIR : modèles et mesures seulement, pas de commandes', () => {
 const t=P.createTemplate({kind:'profile',template:'custom',unit:'in',segments:[{label:'A',length:3},{label:'B',length:1.5}],bends:[{mode:'interior',angle:90,direction:'left'}],length:120},{id:'mir-backup-test-1',name:'L MIR standard'}).template;
 assert.ok(t);
 const record={id:t.id,name:t.name,versions:[t],currentVersion:1,allowed:{materials:['acier'],colorSystems:['manufacturer']},
  measurementDefaults:{unit:'in',templateVersion:1,values:{A:{value:'3',locked:true},B:{value:'1½',locked:false},length:{value:'120',locked:false}}},
  channels:{client:true,store:true},archived:false,updatedAt:'2026-11-04'};
 const exported=TemplateBackup.create([record]);
 assert.equal(exported.ok,true,exported.error);
 assert.equal(exported.count,1);
 assert.ok(!exported.content.includes('orders'));
 assert.ok(!exported.content.includes('requests'));
 const restored=TemplateBackup.merge(exported.content,[]);
 assert.equal(restored.ok,true,restored.error);
 assert.equal(restored.added,1);
 assert.equal(restored.records[0].channels.client,false);
 assert.equal(restored.records[0].channels.store,false);
 assert.equal(restored.records[0].measurementDefaults.values.A.locked,true);
 assert.equal(restored.records[0].measurementDefaults.values.B.value,'1½');
});
test('Sauvegarde MIR : ne jamais remplacer un modèle local par une vieille version', () => {
 const t=P.createTemplate({kind:'profile',template:'custom',unit:'in',segments:[{label:'A',length:6},{label:'B',length:2}],bends:[{mode:'interior',angle:90,direction:'left'}],length:120},{id:'mir-backup-test-2',name:'Profil existant'}).template;
 const imported={id:t.id,name:'Ancienne version',versions:[t],currentVersion:1,allowed:{materials:['aluminium'],colorSystems:['ral']},channels:{client:true,store:true},archived:false};
 const exported=TemplateBackup.create([imported]);
 assert.equal(exported.ok,true);
 const local={...imported,name:'Révision locale',channels:{client:false,store:false}};
 const result=TemplateBackup.merge(exported.content,[local]);
 assert.equal(result.ok,true);
 assert.equal(result.added,0);
 assert.equal(result.skipped,1);
 assert.deepEqual(result.records,[local]);
});
test('Sauvegarde MIR : rejeter fichiers erronés et doublons sans écriture', () => {
 assert.equal(TemplateBackup.merge('oops',[]).ok,false);
 assert.equal(TemplateBackup.merge(JSON.stringify({schema:'other',records:[]}),[]).ok,false);
 const t=P.createTemplate({kind:'profile',template:'custom',unit:'in',segments:[{label:'A',length:5},{label:'B',length:4}],bends:[{mode:'interior',angle:90,direction:'left'}],length:120},{id:'mir-backup-test-3',name:'Profil'}).template;
 const row={id:t.id,name:t.name,versions:[t],currentVersion:1,channels:{client:false,store:false},archived:false};
 const duplicate={schema:TemplateBackup.SCHEMA,records:[row,row]};
 assert.equal(TemplateBackup.merge(JSON.stringify(duplicate),[]).ok,false);
});
test('Sauvegarde MIR : interface réservée à l’atelier local', () => {
 const html=fs.readFileSync(path.join(__dirname,'../dist/production.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../dist/production-app.js'),'utf8');
 assert.ok(html.includes('template-library-backup.js?v=backup-1'));
 assert.ok(html.indexOf('template-library-backup.js')<html.indexOf('production-app.js'));
 assert.ok(app.includes('data-export-mir-models="1"'));
 assert.ok(app.includes('data-import-mir-models="1"'));
 assert.ok(app.includes('if(!store(KEYS.templates,{version:1,records:result.records}))return;'));
 assert.ok(app.includes("record.channels?.store===true?'Magasin employés':'"));
});

console.log('Tests MIR : '+total+'/'+total+' réussis.');
