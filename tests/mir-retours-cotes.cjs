'use strict';
/* MIR — repères A-D et double retour 180° lorsque les bouts se rejoignent. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const M=require('../dist/production-model.js');
const source=fs.readFileSync(path.join(__dirname,'../dist/production-model.js'),'utf8');
const start=source.indexOf('function profileSectionPath(');
const end=source.indexOf('\nfunction profileSideMarkers(',start);
assert.ok(start>0&&end>start);
const display=new Function('decimal',source.slice(start,end)+'\nreturn profileDrawingSection;')(
  value=>String(Math.round(value*1000)/1000)
);
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
const points=[[110,110],[520,110],[520,410],[520,110],[110,110]];
const bends=[
 {mode:'signed',angle:90,turnDeg:90},
 {mode:'hem',angle:180,direction:'right',turnDeg:-180},
 {mode:'signed',angle:90,turnDeg:90}
];
const labels=[{label:'A',lengthMM:50.8},{label:'B',lengthMM:38.1},{label:'C',lengthMM:38.1},{label:'D',lengthMM:50.8}];
const model={kind:'profile',name:'Deux retours identiques',unit:'in',segments:labels,bends,
 coloredFace:{side:'',segmentId:'A'}};
test('Double retour : B-C et D-A ont chacun un arrondi de 180 degrés',()=>{
 const shape=display(points,bends);
 assert.equal(shape.closedReturn,true);
 assert.equal(shape.segments.length,4);
 assert.equal(shape.folds.length,2);
 assert.equal((shape.path.match(/ A5 5 0 0 [01] /g)||[]).length,2);
 const first=shape.segments[0][0],end=shape.segments[3][1];
 assert.ok(Math.abs(first[0]-end[0])<1,'extrémités alignées');
 assert.ok(Math.abs(first[1]-end[1])>8&&Math.abs(first[1]-end[1])<12,'ouverture du repli de 10px');
});
test('Les données de fabrication ne changent pas pendant la présentation',()=>{
 const old=JSON.stringify({model,points,bends});
 M.profileDiagramContent(model,points,{bends,markers:true});
 assert.equal(JSON.stringify({model,points,bends}),old);
 const result=M.buildProfile({
  kind:'profile',template:'custom',unit:'in',segments:[
   {label:'A',length:2},{label:'B',length:1.5},{label:'C',length:1.5},{label:'D',length:2}
  ],bends:[{mode:'signed',angle:-90},{mode:'hem',direction:'right'},{mode:'signed',angle:90}],
  length:120,quantity:1,material:{type:'aluminium'},finish:{system:'Kaycan',name:'Noir',code:'Noir'},
  coloredFace:{side:'left',segmentId:'A'}
 });
 assert.equal(result.valid,true,JSON.stringify(result.validation.errors));
 assert.ok(Math.abs(result.finishedSegmentSumMM-7*25.4)<1e-7);
});
test('Deux longueurs identiques avec angle droit restent un L',()=>{
 const l=display([[120,130],[360,130],[360,370]],[{mode:'signed',angle:90}]);
 assert.ok(!l.closedReturn);
 assert.doesNotMatch(l.path,/ A5 5/);
});
test('La fermeture D-A est absente si D est plus court que A',()=>{
 const different=points.map(p=>p.slice());
 different[4]=[280,110];
 const result=display(different,bends);
 assert.ok(!result.closedReturn);
 assert.equal((result.path.match(/ A5 5/g)||[]).length,1);
});
test('Les jambes disjointes ne sont jamais reliées même si leurs longueurs correspondent',()=>{
 const far=points.map(p=>p.slice());
 far[3][1]+=120;far[4][1]+=120;
 const result=display(far,bends);
 assert.ok(!result.closedReturn);
});
test('Toutes les étiquettes A-D sont présentes une seule fois avec un identifiant',()=>{
 const svg=M.profileDiagramContent(model,points,{bends,markers:true});
 for(const letter of ['A','B','C','D']){
  const matches=[...svg.matchAll(new RegExp('data-marker-label="'+letter+'"','g'))];
  assert.equal(matches.length,1,'repère '+letter);
 }
 assert.ok(svg.includes('A5 5 0 0'),'retour visible dans le dessin');
});
test('Sur mobile, les repères des deux feuilles restent nettement séparés',()=>{
 const markerModel={...model,segments:model.segments.map(({label})=>({label}))};
 const svg=M.profileDiagramContent(model,points,{bends,markers:true,markerModel,horizontalBounds:[100,540]});
 const point=label=>{
  const match=svg.match(new RegExp('data-marker-label="'+label+'"[^>]*>\\s*<g transform="translate\\(([^,]+),([^\\)]+)\\)'));
  return match&&match.slice(1).map(Number);
 };
 const b=point('B'),c=point('C');
 assert.ok(b&&c&&b.every(Number.isFinite)&&c.every(Number.isFinite));
 assert.ok(Math.hypot(b[0]-c[0],b[1]-c[1])>=49,'B et C doivent être séparés sur téléphone');
});
test('Le retour symétrique fonctionne aussi en miroir',()=>{
 const mirrored=points.map(([x,y])=>[x,520-y]);
 const opposite=bends.map(b=>b.mode==='hem'?{...b,direction:'left'}:b);
 const result=display(mirrored,opposite);
 assert.equal(result.closedReturn,true);
 assert.equal((result.path.match(/ A5 5 0 0 [01] /g)||[]).length,2);
});
test('Les cotes de la capture A=2, B=1½, C=1 7/16, D=1¼ restent ouvertes',()=>{
 const actual=[[110,110],[520,110],[520,410],[520,122.5],[263.75,122.5]];
 const result=display(actual,bends);
 assert.ok(!result.closedReturn,'D est différent de A, aucune fermeture inventée');
 const fake={...model,segments:[{label:'A',lengthMM:50.8},{label:'B',lengthMM:38.1},
   {label:'C',lengthMM:36.5125},{label:'D',lengthMM:31.75}]};
 const svg=M.profileDiagramContent(fake,actual,{bends,markers:true});
 for(const letter of ['A','B','C','D'])assert.ok(svg.includes('data-marker-label="'+letter+'"'));
});
console.log('MIR A-D: '+passed+'/'+passed+' tests réussis');
