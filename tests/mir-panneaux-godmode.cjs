'use strict';
/* MIR — real geometry/production non-regression, no page mocks. */
const assert=require('node:assert/strict');
const M=require('../dist/production-model.js'),E=require('../dist/panel-layout-engine.js'),
 H=require('../dist/mir-architect-measures.js'),R=require('../dist/mir-panel-roof.js'),
 S=require('../dist/mir-panel-sketch.js'),V=require('../dist/production-volume.js');
const near=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,'expected '+a+' ≈ '+b);
assert.equal(R.pitchFactor('6/12'),.5);
assert.equal(R.pitchFactor('6'),.5);
assert.equal(R.pitchFactor('36/12'),3);
assert.ok(Number.isNaN(R.pitchFactor('-1/12')));
assert.equal(R.riseForRun(108,'6/12'),54);
assert.deepEqual(R.slopePanel(108,100,'6/12','right'),[[0,0],[108,0],[108,100],[0,46]]);
assert.deepEqual(R.slopePanel(108,100,'6/12','left'),[[0,0],[108,0],[108,46],[0,100]]);
assert.equal(R.slopePanel(108,20,'6/12'),null,'height below roof rise rejected');
const panel={kind:'panel',unit:'in',shape:'roof-slope',width:'108',height:'100',relief:'2',
 roofPitch:'6/12',roofDirection:'right',lip:'1',lips:{left:'0',right:'0',slope:'1/2',bottom:'1'},
 bottomEdgeId:'bottom',perforation:{enabled:false},material:{type:'acier'}};
const model=M.buildPanel(panel);
assert.ok(model.valid,JSON.stringify(model.validation.errors));
assert.equal(model.edges.length,4);
const lips=Object.fromEntries(model.edges.map(e=>[e.id,e.lipMM]));
near(lips.left,0);near(lips.right,0);near(lips.bottom,25.4);near(lips.slope,12.7);
const mesh=V.buildMesh(model);
assert.ok(mesh.valid,JSON.stringify(mesh.errors));
const face=R.visibleFace(mesh);
assert.ok(face&&face.widthMM>0&&face.heightMM>0);
assert.ok(face.widthMM<=model.widthMM+1e-5);
const triangle=M.buildPanel({...panel,shape:'triangle',width:'108',height:'27',
 apexX:'54',roofPitch:'6/12',lips:{'right-slope':'0','left-slope':'1/2'},bottomEdgeId:'bottom'});
assert.ok(triangle.valid,JSON.stringify(triangle.validation.errors));
const incorrect=M.buildPanel({...panel,shape:'triangle',width:'108',height:'30',apexX:'54',roofPitch:'6/12'});
assert.equal(incorrect.valid,false,'incompatible triangle roof height rejected');
assert.ok(incorrect.validation.errors.some(e=>e.code==='ROOF_PITCH_DIMENSION'));
const ratio=S.normalize([[40,40],[140,40],[140,100],[40,100]]);
assert.deepEqual(ratio,[[0,1],[1,1],[1,0],[0,0]]);
assert.deepEqual(S.orthogonal([0,0],[57,2],true),[57,0]);
const layout=E.build({widthIn:120,heightIn:96,lipIn:1,columns:4,rows:2,mode:'equal',precisionIn:0});
assert.ok(layout.ok,JSON.stringify(layout.errors));
assert.equal(layout.pieces.length,8);
const p=layout.pieces[1];
near(H.parseDimension('762','mm',M),30);
near(H.parseDimension('30 1/2','in',M),30.5);
assert.equal(H.display(30,'mm',M),'762');
const proposed=H.propose(layout,p,{width:'762',height:'1206.5',unit:'mm',lockWidth:true,lockHeight:true},E,M);
assert.ok(proposed.ok,proposed.error);
near(proposed.layout.columnWidthsIn[p.col],30);
near(proposed.layout.rowHeightsIn[p.row],47.5);
near(proposed.layout.columnWidthsIn.reduce((sum,v)=>sum+v,0)-3*proposed.layout.lipIn,120);
near(proposed.layout.rowHeightsIn.reduce((sum,v)=>sum+v,0)-proposed.layout.lipIn,96);
assert.ok(proposed.others.length>0,'linked panels must be declared before confirmation');
assert.equal(proposed.config.widthLocks[p.col],30);
assert.equal(proposed.config.heightLocks[p.row],47.5);
const failure=H.propose(layout,p,{width:'5000',height:'1206.5',unit:'mm'},E,M);
assert.equal(failure.ok,false,'out-of-bounds size rejected atomically');
assert.ok(!layout.config.widthLocks?.[p.col],'source layout remained unchanged');
console.log('PASS MIR panels: slope 6/12; per-side zero lip; face-vs-outer; polygon sketch; 8-panel layout; mm/fractions; locked width/height; exact closure; invalid sizes');
