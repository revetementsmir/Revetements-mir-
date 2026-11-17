'use strict';
// Synthetic source planes at different raster scales. The same 12 m width is
// 600 plan pixels and 300 elevation pixels; height anchors belong to the latter.
const assert=require('node:assert/strict'),M=require('../dist/plan-level-model.js'),R=require('../dist/plan-reconstruction.js');
const floor={id:'plan',kind:'floor',buildingId:'house',levelId:'level-1',frame:{units:'pixels'},payload:{}},elevation={id:'elevation',kind:'elevation',buildingId:'house',direction:'front',frame:{units:'pixels'},payload:{}},level={id:'house:level-1',buildingId:'house',sourceLevel:'level-1'},inventory={views:[floor,elevation],levels:[level]};
const reference={scale:.02,value:12,anchors:[[100,700],[700,700]],sourceViewId:floor.id,sourceFrame:floor.frame,kind:'written',status:'proposed',label:'12 m synthetic source width'};
const datum=(levelHint,y,datumType='floor')=>({levelHint,y,datumType,sourceViewId:elevation.id,sourceFrame:elevation.frame,label:datumType+' '+levelHint,confidence:99});
const view={viewId:elevation.id,direction:'front',envelope:{status:'proposed',box:[200,150,300,500]},facing:{axis:0,min:100,max:700,length:600},guides:[datum('level-1',600),datum('level-2',525),datum('level-3',450),datum('level-3',380,'ceiling')]};
const before=structuredClone({view,reference,inventory}),height=R.heightFromLevelDatums([view],'level-1',reference,inventory)[0];
assert.equal(height.value,3);assert.equal(height.scaleUsed,.04);assert.equal(height.status,'proposed');assert.equal(height.sourceViewId,elevation.id);
const draft=M.draftFor(floor,level);draft.points=[[100,200],[700,200],[700,700],[100,700]].map((xy,i)=>({id:'p'+i,xy}));draft.reference=structuredClone(reference);draft.height=height;draft.alignment={origin:[100,700],offset:[0,0],rotationDegrees:0,status:'proposed'};draft.status='proposed';
assert.deepEqual(M.validateDraft(draft,inventory,level),[],'two source datums must survive the actual model validator when plan/elevation scales differ');
assert.equal(height.references[0].sourceViewId,elevation.id);assert.deepEqual(height.references[0].anchors,[[200,600],[500,600]]);assert.equal(height.references[0].kind,'estimated-calibrated','a transferred span never becomes a written elevation cote');assert.deepEqual(height.references[0].relationship.sourceReference,reference);
assert.equal(M.referenceAssessment({id:elevation.id,calibration:{}},height.references).scale,.04);
assert.equal(M.wallsFor({...level,contours:[draft]},inventory,{includeProposed:true}).length,4,'the model really produces the proposed walls');assert.equal(M.wallsFor({...level,contours:[draft]},inventory).length,0,'this fix does not confirm geometry');assert.ok(M.validateDraft(draft,inventory,level,{confirm:true}).includes('HEIGHT_UNKNOWN'));
// Regression is present even when the two raster scales happen to coincide:
// the old reference was discarded because it carried the floor's view ID.
const sameScale={...view,envelope:{...view.envelope,box:[200,150,600,500]}};const same=structuredClone(draft);same.height=R.heightFromLevelDatums([sameScale],'level-1',reference,inventory)[0];assert.equal(same.height.value,1.5);assert.deepEqual(M.validateDraft(same,inventory,level),[]);
// Contour constraints can adjust the supported physical span. Its height and
// source calibration must update together while preserving the datum anchors.
const rescaled=structuredClone(draft);rescaled.reference.value=13.2;rescaled.reference.scale=.022;const constrained=R.constrainProposal(rescaled,{views:[view],contourDimensions:[]});assert.ok(Math.abs(constrained.height.value-3.3)<1e-9);assert.ok(Math.abs(constrained.height.scaleUsed-.044)<1e-9);assert.deepEqual(constrained.height.anchors,height.anchors);assert.deepEqual(constrained.height.datumEvidence,height.datumEvidence);assert.deepEqual(constrained.height.references[0].relationship.sourcePlanSpan,view.facing);assert.equal(constrained.height.references[0].relationship.sourceReference.value,13.2);assert.deepEqual(M.validateDraft(constrained,inventory,level),[]);
// Unknown or contradictory source information stays explicit; it does not get
// replaced by a repeated storey height or a weighted average.
assert.equal(R.heightFromLevelDatums([view],'level-1',null,inventory).length,0);assert.equal(R.heightFromLevelDatums([{...view,guides:[view.guides[0]]}],'level-1',reference,inventory).length,0);assert.equal(R.heightFromLevelDatums([view],'level-4',reference,inventory).length,0);
const conflictingView={...view,viewId:'other-elevation',guides:[{...datum('level-1',600),sourceViewId:'other-elevation'},{...datum('level-2',490),sourceViewId:'other-elevation'}]};const conflicts=R.heightFromLevelDatums([view,conflictingView],'level-1',reference,{...inventory,views:[...inventory.views,{...elevation,id:'other-elevation'}]});assert.deepEqual(conflicts.map(h=>h.value),[3,4.4],'conflicting observations remain two different candidates');const broken=structuredClone(draft);broken.height.references.push({...height.references[0],value:18});assert.ok(M.validateDraft(broken,inventory,level).includes('REFERENCE_CONFLICT'));
assert.deepEqual({view,reference,inventory},before,'source drawings remain unchanged');
console.log('PASS level datum scale: real model validation across independent raster scales, local source anchors, constraints recalibrated, unknown/conflicting values retained, no confirmation');
