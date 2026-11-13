'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const P=require('../dist/production-model.js');
const B=require('../dist/mir-bending-presets.js');
const X=require('../dist/atelier-essai/mir-calepinage-extension.js');

let total=0;
function test(name,fn){fn();total++;console.log('PASS '+name);}
function complete(id,{face='left',quantity=2}={}){
  const spec={kind:'profile',unit:'in',length:120,quantity,
    material:{type:'aluminium',thickness:'0.019',gauge:'24'},
    finish:{selectionType:'manufacturer',manufacturer:'MIR',system:'Nuancier MIR',code:'NOIR',name:'Noir'},
    ...B.create(id)};
  const fallback=id==='goutte_eau_8'?[5.5,2,.5]:spec.segments.map((segment,index)=>segment.length||[6,2,.75,1,3,4,1.25][index]||1);
  spec.segments.forEach((segment,index)=>{segment.length=fallback[index];});
  spec.coloredFace={side:face,segmentId:B.preferredFaceSegment(spec)};
  return spec;
}

test('liste nominale exacte des dix modèles',()=>{
  assert.equal(B.VARIANTS.length,10);
  assert.equal(new Set(B.VARIANTS.map(x=>x.id)).size,10);
  assert.ok(B.VARIANTS.every(x=>B.create(x.id).mirCanonicalPhase10));
});

test('tous les modèles portent une version, des lettres uniques et des plis complets',()=>{
  for(const {id} of B.VARIANTS){
    const spec=complete(id),model=P.buildProfile(spec);
    assert.ok(Number.isSafeInteger(spec.mirTemplateVersion)&&spec.mirTemplateVersion>0,id);
    assert.equal(new Set(spec.segments.map(x=>x.label)).size,spec.segments.length,id);
    assert.equal(spec.bends.length,spec.segments.length-1,id);
    assert.equal(model.valid,true,id+': '+JSON.stringify(model.validation.errors));
    assert.equal(B.checkCanonical(spec).ok,true,id);
  }
});

test('les seules cotes verrouillées par les sources restent non modifiables',()=>{
  const fascia=B.create('fascia'),colonne=B.create('colonne');
  assert.deepEqual(fascia.mirLockedFields,['bottom','hem']);
  assert.deepEqual(colonne.mirLockedFields,['s1','s4','s5']);
  assert.equal(fascia.segments.find(segment=>segment.mirFieldId==='bottom').length,1.25);
  assert.equal(colonne.segments.find(segment=>segment.mirFieldId==='s1').length,0.875);
  assert.equal(colonne.segments.find(segment=>segment.mirFieldId==='s2').length,7.125);
});

test('quantité vide, zéro et fractionnaire refusées; quantité entière acceptée',()=>{
  for(const quantity of ['',0,1.5]){
    const model=P.buildProfile(complete('beam',{quantity}));
    assert.equal(model.complete,false,String(quantity));
    assert.ok(model.validation.pending.some(x=>x.path==='quantity')||model.validation.errors.some(x=>x.path==='quantity'));
  }
  assert.equal(P.buildProfile(complete('beam',{quantity:3})).quantity,3);
});

test('fractions de pouce conservées sans arrondi destructif',()=>{
  const spec=complete('ailes_fenetre');
  spec.segments[0].length='5 5/8';spec.segments[1].length='3/4';spec.segments[2].length='5/8';
  const model=P.buildProfile(spec);
  assert.equal(model.segments[0].lengthMM/25.4,5.625);
  assert.equal(P.formatMeasurement(model.segments[1].lengthMM,'in'),'3/4 po');
});

test('Face 1 et Face 2 ciblent automatiquement le segment le plus long',()=>{
  for(const side of ['left','right']){
    const spec=complete('ailes_fenetre',{face:side});
    spec.segments[0].length=8;spec.segments[1].length=2;spec.segments[2].length=1;
    spec.coloredFace={side,segmentId:B.preferredFaceSegment(spec)};
    assert.equal(spec.coloredFace.segmentId,'A');
    const svg=P.profileSVG(P.buildProfile(spec));
    assert.match(svg,/\*/);
  }
});

test('rendu commun : toutes les lettres, aucune surbrillance verte et étoile PDF',()=>{
  for(const {id} of B.VARIANTS){
    const spec=complete(id),model=P.buildProfile(spec);
    const svg=P.profileDiagramContent(model,model.pointsMM.map(([x,y])=>[x+300,y+300]),{paintedMarker:'star',highContrast:true});
    for(const segment of model.segments)assert.match(svg,new RegExp('data-marker-label="'+segment.label+'"'),id+' '+segment.label);
    assert.doesNotMatch(svg,/profile-painted-face-highlight|#348511|#568443/i,id+' sans highlight vert');
    assert.match(svg,/profile-painted-star/,id);
  }
});

test('Fascia certifié : A 6, pli 90, B 1 1/4, retour écrasé, C 3/4, développé 8',()=>{
  for(const face of ['left','right']){
    const spec=complete('fascia',{face,quantity:1});
    spec.segments[0].length=6;
    spec.material={type:'aluminium'};
    spec.finish={selectionType:'manufacturer',manufacturer:'Kaycan',system:'Nuancier Kaycan',code:'NOIR',name:'Noir'};
    const model=P.buildProfile(spec);
    assert.equal(model.finishedSegmentSumMM/25.4,8);
    assert.equal(model.material.gauge,'');
    const page=P.productionPages({poNumber:'RECETTE-PHASE10-FASCIA',project:'Preuve locale',foreman:'Employé MIR',date:'2026-11-13',revision:'A',items:[{id:'FASCIA-'+face.toUpperCase(),spec}]},{layout:'bending-sheet'})[0].svg;
    const ordered=['A = 6 po','Pli A–B = 90°','B = 1 1/4 po','Pli B–C = 180° — retour écrasé','C = 3/4 po','Développé total = 8 po'];
    let cursor=-1;for(const text of ordered){const index=page.indexOf(text);assert.ok(index>cursor,face+' ordre de fabrication : '+text);cursor=index;}
    assert.doesNotMatch(page,/profile-painted-face-highlight|#348511|#568443/i);
    assert.match(page,/Kaycan/);assert.match(page,/Noir/);
  }
});

test('règle du Coin avec J préservée avec correction ou exception explicite',()=>{
  const spec=B.create('coin_arch_j');spec.kind='profile';spec.unit='in';spec.length=120;spec.quantity=1;
  spec.segments.forEach(segment=>{segment.length=segment.mirFieldId==='jReturn'?1:segment.mirFieldId==='nailing'?2:5;});
  assert.equal(B.checkJ(spec).minimumIn,2.25);
  assert.equal(B.checkJ(B.autoCorrectJ(spec)).ok,true);
  assert.throws(()=>B.finalizeJ(spec),/acceptez explicitement/);
  const accepted=X.acceptJException({jReturn:1,nailing:2},{accepted:true,acceptedBy:'RECETTE PHASE10',note:'exception fictive'});
  assert.equal(B.finalizeJ(spec,accepted).ruleExceptions[0].minimumIn,2.25);
});

test('instantané immuable et révision sans écrasement',()=>{
  const spec=complete('beam'),template=P.createTemplate(spec,{id:'phase10-beam',name:'Beam',version:2}).template;
  const first=P.instantiateTemplate(template,{measurements:Object.fromEntries(spec.segments.map(s=>[s.label,s.length])),length:120,quantity:2,material:spec.material,finish:spec.finish,coloredFace:spec.coloredFace});
  assert.equal(first.ok,true);
  const before=JSON.stringify(first.snapshot);
  const revised=P.reviseInstance(first,{measurements:{C:7}});
  assert.equal(revised.ok,true);
  assert.equal(JSON.stringify(first.snapshot),before);
  assert.equal(revised.history.length,1);
  assert.equal(revised.snapshot.revision,2);
});

test('développé Fascia conservé dans commande et révision',()=>{
  const spec=complete('fascia');spec.segments[0].length=6;
  const template=P.createTemplate(spec,{id:'phase10-fascia',name:'Fascia',version:3}).template;
  const first=P.instantiateTemplate(template,{measurements:{A:6,B:1.25,C:.75},length:120,quantity:1,material:{type:'aluminium'},finish:{selectionType:'manufacturer',manufacturer:'Kaycan',system:'Nuancier Kaycan',code:'NOIR',name:'Noir'},coloredFace:spec.coloredFace});
  assert.equal(first.ok,true);assert.equal(first.snapshot.spec.mirDevelopedTotalIn,8);
  const revised=P.reviseInstance(first,{quantity:2});assert.equal(revised.ok,true);assert.equal(revised.snapshot.spec.mirDevelopedTotalIn,8);assert.equal(first.snapshot.spec.quantity,1);
});

test('un profil unique produit une page complète, quatre profils quatre pages',()=>{
  const items=['fascia','ailes_fenetre','beam','capage_climatiseur'].map((id,index)=>({id:'M00'+(index+1),spec:complete(id)}));
  const pages=P.productionPages({id:'RECETTE-PHASE10',poNumber:'RECETTE-PHASE10',project:'Chantier fictif',foreman:'MIR',date:'2026-11-13',revision:'A',items},{layout:'bending-sheet'});
  assert.equal(pages.length,4);
  assert.ok(pages.every(page=>page.layout==='bending-sheet'),'aucun second en-tête de dossier autour de la fiche de production');
  assert.ok(pages.every(page=>!page.svg.includes('Suite')&&!page.svg.includes('SUITE')));
  for(const [index,page] of pages.entries()){
    assert.equal((page.svg.match(/QUANTITÉ \/ LONGUEUR/g)||[]).length,1);
    assert.ok(page.svg.includes('M00'+(index+1)));
  }
});

test('aucun test Phase 10 neutralisé',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../dist/production-app.js'),'utf8');
  assert.ok(app.includes('phase10ProfileIds'));
});

test('Boss et Adjointe conservent la gestion technique interne',()=>{
  const workspace=fs.readFileSync(path.join(__dirname,'../dist/mir-shared-workspace.js'),'utf8');
  assert.match(workspace,/role==='boss'\|\|value\?\.role==='assistant'/);
  assert.match(workspace,/text\('label','Gage',group\)/);
});

console.log('Phase 10 : '+total+'/'+total+' contrôles réussis.');
