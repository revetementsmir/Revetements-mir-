'use strict';
const assert=require('node:assert/strict');
const roof=require('../dist/mir-panel-roof.js');
const sketch=require('../dist/mir-panel-sketch.js');
const M=require('../dist/production-model.js');
const V=require('../dist/production-volume.js');
const close=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,`${a} !== ${b}`);
const base={kind:'panel',shape:'roof-slope',unit:'in',width:'108',height:'96',relief:'2',lip:'1',
 roofPitch:'6/12',roofDirection:'right',bottomEdgeId:'bottom',
 perforation:{enabled:false,edgeId:'bottom',details:''},
 material:{type:'acier',thickness:'1',thicknessUnit:'mm'},
 lips:{slope:'0',left:'0'}};
assert.equal(roof.pitchFactor('6/12'),.5);close(roof.riseForRun(108,'6/12'),54);
assert.equal(roof.pitchFactor('6'),.5);
assert.equal(roof.pitchFactor('5,5/12'),5.5/12);
assert.ok(Number.isNaN(roof.pitchFactor('xx'))); // invalid math inputs are rejected, never guessed
assert.deepEqual(roof.slopePanel(108,96,'6/12','right'),[[0,0],[108,0],[108,96],[0,42]]);
assert.deepEqual(roof.slopePanel(108,96,'6/12','left'),[[0,0],[108,0],[108,42],[0,96]]);
assert.equal(roof.slopePanel(108,50,'6/12','right'),null);
const model=M.buildPanel(base);
assert.equal(model.valid,true,JSON.stringify(model.validation.errors));
assert.equal(model.edges.find(e=>e.id==='slope').lipMM,0);
assert.equal(model.edges.find(e=>e.id==='left').lipMM,0);
assert.equal(model.edges.find(e=>e.id==='right').lipMM,25.4);
close(model.parameters.riseMM,54*25.4);
const mesh=V.buildMesh(model);
assert.equal(mesh.valid,true,JSON.stringify(mesh.errors));
const face=roof.visibleFace(mesh);
assert.ok(face?.widthMM>0&&face.heightMM>0);
assert.ok(face.widthMM<=model.widthMM&&face.heightMM<=model.heightMM);
const invalid=M.buildPanel({...base,height:'40'});
assert.equal(invalid.valid,false);
assert.ok(invalid.validation.errors.some(e=>e.code==='ROOF_PANEL_IMPOSSIBLE'));
const tri=M.buildPanel({...base,shape:'triangle',height:'27',apexX:'54',roofPitch:'6/12',lips:{bottom:'0', 'right-slope':'0','left-slope':'0'}});
assert.equal(tri.valid,true,JSON.stringify(tri.validation.errors));
assert.equal(M.buildPanel({...tri.spec,height:'28'}).valid,false,'Triangle pitch and measured height must agree');
const poly=M.buildPanel({...base,shape:'polygon',roofPitch:'',contourRatios:[[0,0],[1,0],[1,.7],[.55,1],[0,.7]],
 width:'80',height:'64',lip:'0',bottomEdgeId:'edge-1',lips:{'edge-1':'0','edge-2':'0','edge-3':'0','edge-4':'0','edge-5':'0'}});
assert.equal(poly.valid,true,JSON.stringify(poly.validation.errors));
assert.equal(V.buildMesh(poly).valid,true,'Concave-free polygon accepts explicitly zero lips on every side');
const ratios=sketch.normalize([[200,170],[740,170],[740,450],[200,450]]);
assert.deepEqual(ratios,[[0,1],[1,1],[1,0],[0,0]]);
assert.deepEqual(sketch.orthogonal([20,35],[130,50],true),[130,35]);
assert.deepEqual(sketch.orthogonal([20,35],[45,130],true),[20,130]);
const template=M.createTemplate(base,{id:'mir-audit-roof',name:'Panneau 6/12'});
assert.equal(template.ok,true,JSON.stringify(template.errors));
assert.equal(M.templatePreview(template.template).ok,true,'Roof template must remain drawable with no commande dimensions');
const legacy=M.buildPanel({...base,shape:'rectangle',roofPitch:'',lip:'1'});
assert.equal(legacy.valid,true,'Old rectangular panel still valid');
console.log('PASS MIR panel 6/12, triangle, slope side, explicit zero lips, polygon and template backwards compatibility');
