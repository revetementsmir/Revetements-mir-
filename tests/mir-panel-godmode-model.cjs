'use strict';
const assert=require('node:assert/strict');
const R=require('../dist/mir-panel-roof.js'),S=require('../dist/mir-panel-sketch.js');
const M=require('../dist/production-model.js'),V=require('../dist/production-volume.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,String(a)+' !== '+String(b));
near(R.pitchFactor('6/12'),.5);near(R.pitchFactor('5,5/12'),5.5/12);
assert.equal(R.pitchFactor('abc')!==R.pitchFactor('abc'),true);
assert.equal(R.slopePanel(48,36,'6/12','right')[3][1],12);
assert.equal(R.slopePanel(48,36,'6/12','left')[2][1],12);
assert.equal(R.slopePanel(48,20,'6/12','right'),null,'Cannot exceed real height');
assert.equal(R.riseForRun(108,'6/12'),54);
const basic={kind:'panel',unit:'in',width:48,height:36,relief:2,lip:1,
 bottomEdgeId:'bottom',perforation:{enabled:false},material:{type:'acier'},finish:{}};
const panel=M.buildPanel({...basic,shape:'roof-slope',roofPitch:'6/12',roofDirection:'right',
 lips:{bottom:'1',right:'1',slope:'0',left:'0'}});
assert.equal(panel.valid,true,JSON.stringify(panel.validation.errors));
near(panel.parameters.riseMM,48*25.4*.5);
assert.equal(panel.edges.find(e=>e.id==='slope').lipMM,0,'Slope has no lip');
assert.equal(panel.edges.find(e=>e.id==='left').lipMM,0,'Left has no lip');
near(panel.edges.find(e=>e.id==='bottom').lipMM,25.4);
const mesh=V.buildMesh(panel);
assert.equal(mesh.valid,true,JSON.stringify(mesh.errors));
const face=R.visibleFace(mesh);
assert.ok(face&&face.widthMM>0&&face.widthMM<=panel.widthMM);
assert.ok(face.heightMM>0&&face.heightMM<=panel.heightMM);
const triangle=M.buildPanel({...basic,shape:'triangle',width:48,height:12,apexX:24,roofPitch:'6/12',lip:0,bottomEdgeId:'bottom'});
assert.equal(triangle.valid,true,JSON.stringify(triangle.validation.errors));
const bad=M.buildPanel({...basic,shape:'triangle',width:48,height:24,apexX:24,roofPitch:'6/12'});
assert.equal(bad.valid,false,'Inconsistent X/12 height must be rejected');
const badRoof=M.buildPanel({...basic,shape:'roof-slope',height:12,roofPitch:'6/12'});
assert.equal(badRoof.valid,false,'Height less than rise must be rejected');
const template=M.createTemplate({...basic,shape:'roof-slope',roofPitch:'6/12',roofDirection:'right'},
{id:'mir-test-roof-pitch',name:'Panneau rampant',version:1});
assert.equal(template.ok,true,JSON.stringify(template.errors));
assert.equal(M.templatePreview(template.template).ok,true,'Template preview uses same pitch');
const ratios=S.normalize([[240,180],[560,180],[560,370],[240,370]]);
assert.deepEqual(ratios,[[0,1],[1,1],[1,0],[0,0]]);
assert.deepEqual(S.orthogonal([240,180],[563,211],true),[563,180]);
const polygon=M.buildPanel({...basic,shape:'polygon',width:48,height:36,lip:0,
 contourRatios:ratios,bottomEdgeId:'edge-1',lips:{'edge-1':'0','edge-2':'0','edge-3':'0','edge-4':'0'}});
assert.equal(polygon.valid,true,JSON.stringify(polygon.validation.errors));
assert.equal(V.buildMesh(polygon).valid,true,'Freeform 0 lips should preserve 3D');
console.log('PASS MIR sloped roof panel, X/12, zero lip per edge, free polygons, 2D/3D mesh, template compatibility');