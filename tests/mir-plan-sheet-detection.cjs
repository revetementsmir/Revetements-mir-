'use strict';
const assert = require('node:assert/strict');
const S = require('../dist/plan-sheet-detection.js');
const Spatial = require('../dist/plan-spatial-dimensions.js');
const Visual = require('../dist/plan-facade-visual.js');
const {parseDimension} = require('../dist/plan-import-core.js');
assert.deepEqual(S.classify('Élévation latérale droite'), {kind:'elevation',face:'right'});
assert.deepEqual(S.classify('02. Élévation arrière'), {kind:'elevation',face:'back'});
assert.deepEqual(S.classify('((D) Élévation droite :'), {kind:'elevation',face:'right'});
assert.deepEqual(S.classify('Left Side Elevation'), {kind:'elevation',face:'left'});
assert.deepEqual(S.classify('Élévation nord'), {kind:'reference'});
assert.deepEqual(S.classify('West Elevation'), {kind:'reference'});
assert.deepEqual(S.classify('Élévation (arrière)'), {kind:'elevation',face:'back'});
assert.deepEqual(S.classify('Plan du rez-de-chaussée'), {kind:'floor'});
assert.deepEqual(S.classify('Plan d’étage 2'), {kind:'floor'});
assert.deepEqual(S.classify('2nd Floor Plan'), {kind:'floor'});
assert.deepEqual(S.classify('Plan des fondations'), {kind:'foundation'});
assert.deepEqual(S.classify('Coupe A-A'), {kind:'section'});
assert.deepEqual(S.classify('Coupe schématique'), {kind:'section'});
assert.deepEqual(S.classify('Plan de toiture'), {kind:'roof'});
for (const text of ['Voir élévation gauche', 'Élévation avant existante', 'Détail élévation avant', 'Hauteur du mur : 20 pi', 'Plan niveau', 'Coupe et'])
  assert.equal(S.classify(text), null, text);
const words = [
  {text:'Élévation',box:[30,350,74,365]}, {text:'avant',box:[79,350,114,365]},
  {text:'Élévation arrière',box:[340,350,430,365]}
];
const views = S.divideViews(S.viewsForPage(S.lines(words)), 500, 400);
assert.deepEqual(views.map(x=>x.face), ['front','back']);
assert.equal(views[0].crop[2],views[1].crop[0]);
const duplicateTitle = S.viewsForPage(S.lines([
  {text:'Élévation avant',box:[438,55,492,70]},
  {text:'A2 | Élévation avant',box:[52,350,141,365]}
]), 500);
assert.equal(duplicateTitle.length,1);
assert.deepEqual(duplicateTitle[0].box,[52,350,141,365]);
// Full-sheet plan titles occur under the drawing and again in a vertical
// cartouche. They identify ONE level; an OCR duplicate is not a second plan.
for(const [caption,kind,key] of [['PLAN NIVEAU 3','floor','floor-3'],['PLAN DE TOITURE','roof','plan de toiture']]){
 const drawing={text:caption,box:[295,615,445,637],confidence:94,source:'ocr'};
 const cartouche={text:caption,box:[875,530,985,552],confidence:98,source:'ocr'};
 const legend={text:'ARCHITECTURE',box:[872,590,979,608],confidence:96,source:'ocr'};
 const classified=S.viewsForPage([drawing,cartouche,legend],1000,700);
 assert.equal(classified.length,1,'drawing caption and matching cartouche title are one sheet');
 assert.equal(classified[0].kind,kind);
 assert.equal(classified[0].key,key);
 assert.deepEqual(classified[0].box,drawing.box,'the drawing title wins over the cartouche duplicate');
 assert.equal(classified[0].sheetTitle.text,caption);
 assert.equal(classified[0].sheetTitle.method,'matched-sheet-title-block-and-drawing-caption');
 assert.deepEqual(classified[0].sheetTitle.box,cartouche.box);
 assert.equal(S.divideViews(classified,1000,700).length,1,'duplicate titles cannot split a full drawing');
 assert.equal(S.viewsForPage([cartouche,legend],1000,700).length,1,'the cartouche title still classifies a sheet when the smaller caption is missed');
}
assert.deepEqual(S.classify('PLAN NIVEAU 0'),{kind:'floor'});
assert.deepEqual(S.classify('PLAN NIVEAU 3'),{kind:'floor'});
assert.deepEqual(S.classify('titre: PLAN NIVEAU 3'),{kind:'floor'},'OCR joining titre: to the label must not erase the level');
assert.deepEqual(S.classify('titre: PLAN DE TOITURE'),{kind:'roof'},'the roof title block must not become a floor');
assert.deepEqual(S.classify('PLAN DE TOITURE'),{kind:'roof'});
// Two actual drawings in the drawing area remain two views; this correction
// must not collapse legitimate multi-view PDF pages.
const adjacent=S.viewsForPage([{text:'PLAN NIVEAU 2',box:[100,360,230,380],confidence:95},
 {text:'PLAN NIVEAU 3',box:[560,360,690,380],confidence:95}],1000,700);
assert.equal(adjacent.length,2);
assert.deepEqual(adjacent.map(v=>v.key),['floor-2','floor-3']);
const I=require('../dist/plan-view-inventory.js');
const sourceTitle=S.viewsForPage([{text:'PLAN NIVEAU 3',box:[250,610,390,630],confidence:98},
 {text:'PLAN NIVEAU 3',box:[870,530,975,548],confidence:98}],1000,700)[0];
const incoming=I.create([{
 page:8,name:sourceTitle.name,kind:sourceTitle.kind,titleBox:sourceTitle.box,
 sourceWidth:1000,sourceHeight:700,sourceCrop:[0,0,1000,700],
 sheetTitleEvidence:{...sourceTitle.sheetTitle,frame:'raster-page'}
}],{filename:'synthetic-titleblock.pdf',bytes:500,sha256:'synthetic-titleblock'});
assert.equal(incoming.views.length,1);
assert.equal(incoming.views[0].levelId,'level-3','sheet title must become the level source');
assert.equal(incoming.views[0].provenance.sheetTitle.text,'PLAN NIVEAU 3');
assert.equal(incoming.views[0].provenance.sheetTitle.method,'matched-sheet-title-block-and-drawing-caption');
assert.equal(incoming.views[0].provenance.sheetTitle.confirmationRequired,true);
const roofSheet=I.create([{page:9,name:'PLAN DE TOITURE',kind:'roof',sourceWidth:1000,sourceHeight:700,sourceCrop:[0,0,1000,700]}],{filename:'synthetic-roof.pdf',bytes:50,sha256:'synthetic-roof'});
assert.equal(roofSheet.views[0].kind,'roof');
assert.equal(roofSheet.levels.length,0,'a roof drawing is not a new floor');
const indexTitles=['Plan niveau 0','Plan niveau 1','Plan niveau 2','Plan niveau 3'].map((text,i)=>({
  text,box:[380,180+i*7,440,186+i*7],confidence:92,source:'ocr'
}));
assert.deepEqual(S.viewsForPage(indexTitles,500,400),[]);
const rows = (...texts)=>texts.map(text=>({text,confidence:100}));
const foundation = S.volumeEvidence(rows('Dimensions hors tout : 40 pi × 35 pi','Hauteur du solage apparente : 2 pi'), {kind:'foundation',name:'Solage'}, 5, parseDimension);
const section = S.volumeEvidence(rows('Hauteur des murs : 25 pi','Montée du toit : 8 pi','Toit à deux versants','Largeur balcon : 5 pi'), {kind:'section',name:'Coupe A-A'}, 19, parseDimension);
const volume = S.volumeFrom([...foundation,...section]);
assert.deepEqual(volume.dimensions,{width:40*.3048,depth:35*.3048,wallHeight:25*.3048,roofRise:8*.3048});
assert.equal(volume.roofStyle,'gable');
assert.equal(volume.foundationDrop,2*.3048);
assert.equal(S.volumeFrom([...foundation,{field:'depth',value:25*.3048}]).dimensions.depth,null);
assert.equal(S.volumeFrom([{field:'roofStyle',value:'flat'}]).dimensions.roofRise,0);
assert.equal(S.volumeFrom([{field:'roofStyle',value:'flat'},{field:'roofRise',value:2}]).dimensions.roofRise,null);
const profile=(face,value)=>({field:'roofProfile',face,value});
assert.equal(S.volumeFrom([profile('front','trapezoid'),profile('left','triangle')]).roofStyle,'hip');
assert.equal(S.volumeFrom([profile('front','flat'),profile('left','triangle')]).roofStyle,'gable');
assert.equal(S.volumeFrom([profile('front','trapezoid'),profile('back','trapezoid')]).roofStyle,null);
assert.equal(S.volumeFrom([profile('front','trapezoid'),profile('back','flat'),profile('left','triangle')]).roofStyle,null);
const estimatedWidth = {field:'width',value:12,estimated:true};
assert.deepEqual(S.volumeFrom([estimatedWidth]).approximated,['width']);
assert.equal(S.volumeFrom([estimatedWidth,{field:'width',value:13}]).dimensions.width,13);
assert.deepEqual(S.volumeFrom([]).dimensions,{width:null,depth:null,wallHeight:null,roofRise:null});
const sectionLevels = S.volumeEvidence(rows('Dessus des fondations : 0.00 m','Ligne de sablière : +7.50 m','Niveau du faîte : +9.75 m'),{kind:'section',name:'Coupe B-B'},21,parseDimension);
assert.ok(Math.abs(sectionLevels.find(e=>e.field==='wallHeight').value-7.5)<1e-10);
assert.ok(Math.abs(sectionLevels.find(e=>e.field==='roofRise').value-2.25)<1e-10);
const cote=(x0,x1,y,referenceFt)=>({axis:'x',score:.9,anchors:[[x0,y],[x1,y]],referenceFt,normalized:referenceFt+' pi'});
const chain=[cote(10,410,10,40),cote(10,210,60,20),cote(210,410,60,20)];
assert.equal(S.volumeEvidence([], {kind:'elevation',face:'right',name:'Élévation droite'},11,parseDimension,chain)[0].value,40*.3048);
assert.deepEqual(S.volumeEvidence([], {kind:'elevation',face:'right',name:'Élévation droite'},11,parseDimension,chain.slice(0,2)),[]);
const levelRows = [
  {text:'Faîte de la toiture : +12.25 m',box:[250,50,400,62]},
  {text:'Plafond niv 3 : +9.5 m',box:[250,95,400,107]},
  {text:'Niveau du sol fini : +0.5 m',box:[250,200,400,212]},
].map(row=>({...row,confidence:100,source:'pdf-text'}));
const levelVolume = S.volumeFrom(Spatial.evidence({
  rows:levelRows,page:8,view:{kind:'elevation',face:'front',name:'Élévation avant'},crop:[0,0,500,400]
},parseDimension));
assert.ok(Math.abs(levelVolume.dimensions.wallHeight-9)<1e-10);
assert.ok(Math.abs(levelVolume.dimensions.roofRise-2.75)<1e-10);

// A scan can be off center, and the dimensions can outlive OCR in a saved
// project. Windows distinguish the elevation from an unmarked rectangle.
const sampleElevation = (width, height, rectangles) => {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const ink = (x, y) => data.fill(38, (y * width + x) * 4, (y * width + x) * 4 + 3);
  const outline = (x, y, w, h) => {
    for (let i = x; i <= x + w; i++) { ink(i,y); ink(i,y+h); }
    for (let j = y; j <= y + h; j++) { ink(x,j); ink(x+w,j); }
  };
  for (const [x,y,w,h,blank] of rectangles) {
    outline(x,y,w,h);
    if (!blank) for (const floor of [.2,.6]) for (const column of [.12,.33,.54,.75]) {
      outline(x+Math.round(w*column),y+Math.round(h*floor),Math.round(w*.11),Math.round(h*.19));
    }
  }
  return {width,height,data};
};
const frame = [36,38,160,100];
const ratio = frame[2]/frame[3];
const scan = sampleElevation(240,150,[frame]);
const near = (detected, expected) => assert.ok(detected?.box.every((v,i)=>Math.abs(v-expected[i])<=3), JSON.stringify(detected));
near(Visual.detect({image:scan,ratio}),frame);
const anchors = {span:{start:36,end:196},levels:{eaves:{line:{y:38}},grade:{line:{y:138}}}};
near(Visual.detect({image:scan,anchors}),frame);
assert.equal(Visual.detect({image:sampleElevation(240,150,[[...frame,true]]),ratio}),null);
const otherFrame = [260,38,160,100];
const doubled = sampleElevation(470,150,[frame,otherFrame]);
assert.equal(Visual.detect({image:doubled,ratio}),null);
near(Visual.detect({image:doubled,crop:[240,0,230,150],ratio}),otherFrame);
console.log('MIR PDF : titres, cadrages multiples, cotes traçables et conflits vérifiés');

// Each elevation keeps its own exposed foundation height and accepts common
// PDF labels without mistaking a foundation plan for an exposed wall.
const concrete=(width,height,top,grade)=>{
 const image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};
 const line=(y,start,end)=>{for(let x=start;x<end;x++){const i=(y*width+x)*4;image.data.fill(25,i,i+3);}};
 line(top,12,width-12);line(grade,12,width-12);
 const rows=[
  {text:'FONDATION',box:[20,top-9,85,top-1],confidence:95,source:'ocr'},
  {text:'NIVEAU SOL FINI',box:[20,grade-9,120,grade-1],confidence:95,source:'ocr'}
 ];
 const crop=[0,0,width,height],anchors=Spatial.readAnchors({rows,crop,geometry:{image}},parseDimension);
 const found=Visual.foundation({image,box:[12,12,width-24,grade-12],anchors});
 assert.deepEqual(found?.box,[12,top,width-24,grade-top]);
 assert.equal(found.source,'pdf-foundation-guides');
};
concrete(280,260,181,228);
concrete(445,330,250,282);
assert.equal(Visual.foundation({box:[12,12,256,216],anchors:{levels:{grade:{line:{y:228}},foundations:[]}}}),null);
console.log('PASS Solage visible repéré sur deux élévations indépendantes');
