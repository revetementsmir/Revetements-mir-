'use strict';
// Preserve the candidate helpers introduced by the preceding entrance fix,
// but exercise production detectors instead of substituting geometry mocks.
const assert=require('node:assert/strict'),E=require('../dist/plan-reconstructed-exterior.js'),Roof=require('../dist/plan-reconstructed-roofs.js'),{entryFixture,blank,line}=require('./helpers/mir-studio-entry-fixture.cjs');
const front=blank(),side=blank();line(front,100,50,250,50);line(front,100,65,250,65);line(side,100,50,200,40);
const canopy={status:'proposed',box:[115,52,120,148],beamLine:[100,50,150,2],columns:[{x:115,width:10,bottom:200},{x:226,width:10,bottom:200}]};
assert.equal(E.entryBeamFace(front,canopy).status,'proposed','paired horizontal edges remain low-level candidates');
assert.equal(E.entryRoofStroke(side,100,200,50).status,'proposed','a continuous side stroke remains a low-level candidate');
assert.equal(E.entryRoofStroke(blank(),100,200,50).status,'unresolved');
const build=s=>E.build(s.proposal,s.inventory,s.images,s.reviewed,s.levels);
const complete=build(entryFixture()),roofs=complete.byLevel.flatMap(l=>l.reconstructedRoofs);
assert.equal(roofs.length,1);assert.deepEqual(Roof.issues(roofs[0],{confirm:false}),[]);assert.ok(Roof.faces(roofs[0],[0,0],{includeProposed:true}).some(f=>f.type==='roof'));
for(const level of complete.byLevel)assert.deepEqual(level.roofProposals,level.reconstructedRoofs,'the prior result key remains a compatibility alias, not a second roof');
const noRoof=build(entryFixture({roof:false}));assert.equal(noRoof.byLevel.flatMap(l=>l.reconstructedRoofs).length,0,'two posts and a beam guide cannot substitute for the observed front roof profile');
assert.equal(noRoof.byLevel.flatMap(l=>l.exteriorElements).filter(e=>e.type==='beam').length,3,'independently observed front/return beam faces remain available');
const missingSide=entryFixture();for(const v of missingSide.inventory.views.filter(v=>['left','right'].includes(v.direction)))missingSide.images[v.id]=blank();const rejected=build(missingSide);
assert.equal(rejected.byLevel.flatMap(l=>l.reconstructedRoofs).length,0,'a missing side observation cannot become a roof depth');
console.log('PASS entrance compatibility: retained candidate helpers; actual front/side raster detectors; legacy roof result alias; beam guides and missing side profiles cannot invent a roof.');
