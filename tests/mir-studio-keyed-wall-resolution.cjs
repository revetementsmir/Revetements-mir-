'use strict';
const assert=require('node:assert/strict');
const K=require('../dist/plan-keyed-wall-observations.js');
const M=require('../dist/plan-level-model.js');
const F=require('./fixtures/keyed-wall-source-fixture.cjs');
const {clone,line,frame}=F;
function solve(f){const discovery=F.applyObservedKeys(f);return K.resolve(f.inventory,f.buildingId,f.images,f.level,f.contour,{proposal:f.proposal,discovery});}
const f=F.fixture(),discovery=F.applyObservedKeys(f),before=JSON.stringify(f.inventory),result=K.resolve(f.inventory,f.buildingId,f.images,f.level,f.contour,{proposal:f.proposal,discovery});
assert.equal(result.observedPlanes.length,2);
assert.equal(result.geometryCreated,true);
assert.equal(result.complete,false);
assert.equal(JSON.stringify(f.inventory),before,'source evidence and inventory are not mutated by resolution');
const level={...clone(f.level),contours:[clone(f.contour)],observedPlanes:clone(result.observedPlanes),reconstruction:{status:'automatic-proposal',proposal:clone(f.proposal)}};
for(const plane of result.observedPlanes){
 assert.equal(plane.kind,'source-keyed-wall');
 assert.deepEqual(K.issues(plane,f.inventory,level,{confirm:false}),[]);
 assert.deepEqual(M.observedPlaneIssues(plane,f.inventory,level,{confirm:false}),[],'model dispatch validates the explicit new source contract');
 assert.deepEqual(plane.keyedWallEvidence.physicalExtent.extent,[80,260],'the separated roof crossing at77 is not a wall end');
 assert.equal(plane.footprint.length,4);
 assert.ok(Math.abs(plane.thickness-.14)<1e-10);
 assert.ok(Math.abs(M.distance(plane.from,plane.to)-3.6)<1e-10);
 assert.ok(Math.abs(plane.height-1.2)<1e-10,'written local height is independent of the sloping roof occlusion');
 assert.equal(plane.base,4.2,'the visible deck is attached to the registered upper-floor datum');
 assert.equal(plane.measurements.height.anchors,undefined,'a text height is not given fabricated elevation anchors');
 assert.equal(plane.measurements.height.sourceViewId,f.view.id);
 assert.ok(plane.keyedWallEvidence.lateralCorroborations.every(p=>p.individualWallFaceObserved===false));
}
assert.equal(M.wallsFor(level,f.inventory,{includeProposed:true}).length,6,'four parent planes plus two physical keyed walls');
assert.equal(new Set(result.observedPlanes.map(p=>p.id)).size,2,'two skins do not become two business walls');
assert.deepEqual(K.resolve(JSON.parse(JSON.stringify(f.inventory)),f.buildingId,f.images,f.level,clone(f.contour),{proposal:clone(f.proposal),discovery:clone(discovery)}).observedPlanes,result.observedPlanes,'JSON persistence preserves the same source-derived identities and geometry');

// The real save path keeps imported views intact and retains native reading
// results beside the proposal. A plane must not validate against its own copy
// of a key when the independently retained source record is absent or changed.
const persisted=clone(f.inventory),persistedLevel=clone(level),nativeKeys=clone(f.view.payload.drawingReadings.keyedWallKeys);
delete persisted.views.find(v=>v.id===f.view.id).payload.drawingReadings.keyedWallKeys;
persistedLevel.reconstruction.proposal.localReadingRetries=nativeKeys;persisted.levels=[persistedLevel];
const retainedBefore=JSON.stringify(persisted);
for(const p of persistedLevel.observedPlanes)assert.deepEqual(K.issues(p,persisted,persistedLevel,{confirm:false}),[]);
assert.equal(JSON.stringify(persisted),retainedBefore,'source replay neither hydrates nor rewrites the stored source views');
const repeated=clone(persisted);repeated.localReadingRetries=clone(nativeKeys);assert.deepEqual(K.issues(result.observedPlanes[0],repeated,repeated.levels[0],{confirm:false}),[],'identical retained copies across levels and result transport are allowed');
for(const [name,mutate]of [
 ['missing records',rows=>rows.splice(0)],
 ['wrong source',rows=>rows[0].source='ocr'],['wrong purpose',rows=>rows[0].purpose='roof'],
 ['wrong PDF hash',rows=>rows[0].nativeSource.sourceSha256='b'.repeat(64)],['wrong source page',rows=>rows[0].nativeSource.sourcePage++],
 ['wrong tile mapping',rows=>rows[0].nativeSource.viewToTile[4]++],['wrong PDF mapping',rows=>rows[0].nativeSource.pdfToTile[4]++],
 ['wrong rotation',rows=>rows[0].nativeSource.sourceRotation=90],['wrong canvas size',rows=>rows[0].nativeSource.canvasSize[0]++],
 ['different duplicate',rows=>rows.push({...clone(rows[0]),text:'R8'})]
]){const stored=clone(persisted),target=stored.levels[0];mutate(target.reconstruction.proposal.localReadingRetries);assert.ok(K.issues(target.observedPlanes[0],stored,target,{confirm:false}).length,name+' cannot substitute for a retained native key source');}

// Sufficient independent observations: plan ends/thickness + its own keyed
// note + transverse finite skins/deck. A hidden lateral face is not invented.
const noSide=F.resolvedFixture({side:false});
assert.equal(noSide.result.observedPlanes.length,2);
assert.ok(noSide.result.observedPlanes.every(p=>p.keyedWallEvidence.lateralCorroborations.length===0));
const hiddenSide=F.fixture();hiddenSide.sideImage.data.fill(255);line(hiddenSide.sideImage,[180,430],[360,370],[20,120,220]);
const hiddenResult=solve(hiddenSide);assert.equal(hiddenResult.observedPlanes.length,2);assert.ok(hiddenResult.observedPlanes.every(p=>Math.abs(p.height-1.2)<1e-10&&p.keyedWallEvidence.lateralCorroborations.length===0),'a coloured visible triangle supplies neither height nor an individual face observation');

const noDeck=F.fixture();for(let y=429;y<=431;y++)line(noDeck.back,[280,y],[475,y],[255,255,255]);
const noDeckResult=solve(noDeck);assert.equal(noDeckResult.observedPlanes.length,0);assert.ok(noDeckResult.observations.every(o=>o.unresolved.includes('KEYED_WALL_BASE_UNRESOLVED')),'base is not zero or borrowed from a nearby roof when the deck contact is hidden');
const oneHidden=F.fixture();for(let x=440;x<=453;x++)line(oneHidden.back,[x,365],[x,434],[255,255,255]);
const partial=solve(oneHidden);assert.equal(partial.observedPlanes.length,1);assert.equal(partial.observations.filter(o=>o.geometryStatus==='unresolved').length,1,'one missing skin pair preserves the independently proven other wall');

const missingDatum=F.fixture();missingDatum.backInfo.guides=missingDatum.backInfo.guides.filter(g=>g.datumType!=='floor');assert.equal(solve(missingDatum).observedPlanes.length,0,'a missing own floor datum is not completed by hand');
const opposite=F.fixture();opposite.backView.direction='front';opposite.backInfo.direction='front';assert.equal(solve(opposite).observedPlanes.length,0,'a similar window on the opposite elevation cannot establish this exterior deck');
const unregistered=F.fixture();unregistered.contour.levelRegistration.status='unresolved';assert.equal(solve(unregistered).observedPlanes.length,0,'local height and XY alone cannot invent the global base');
const wrongFrame=F.fixture();wrongFrame.backView.frame.cropToRaster[4]=30;assert.equal(solve(wrongFrame).observedPlanes.length,0,'the source frame must match the registration');

// Pickets/crossbars within a continuing pair are not terminal caps. If the
// true cap is hidden, a crossbar does not shorten the wall to a convenient end.
const pickets=F.fixture();for(const [l,r]of [[150,157],[290,297]]){line(pickets.plan,[l+1,80],[r-1,80],[255,255,255]);for(const y of [100,120,140,200])line(pickets.plan,[l,y],[r,y]);}
const picketDiscovery=F.applyObservedKeys(pickets),picketCandidates=K.propose(pickets.inventory,pickets.buildingId,pickets.images,pickets.level,pickets.contour,{discovery:picketDiscovery});
assert.equal(picketCandidates.observations.length,2,'the lower-level detector still sees the roof crossing and paired source candidates');
const picketResult=K.resolve(pickets.inventory,pickets.buildingId,pickets.images,pickets.level,pickets.contour,{proposal:pickets.proposal,discovery:picketDiscovery});
assert.equal(picketResult.observedPlanes.length,0);assert.ok(picketResult.observations.every(o=>o.unresolved.includes('KEYED_WALL_FINITE_CAP_REQUIRED')));

// A drawn rule at the discovery-window boundary is not a physical end when
// both wall strokes continue beyond it to the edge of the source drawing.
const clipped=F.fixture();for(const [l,r]of [[150,157],[290,297]]){line(clipped.plan,[l,0],[l,80]);line(clipped.plan,[r,0],[r,80]);line(clipped.plan,[l,15],[r,15]);}
const clippedDiscovery=F.applyObservedKeys(clipped),clippedCandidates=K.propose(clipped.inventory,clipped.buildingId,clipped.images,clipped.level,clipped.contour,{discovery:clippedDiscovery});
assert.equal(clippedCandidates.observations.length,2,'the ROI crossing alone remains a low-level candidate');
const clippedResult=K.resolve(clipped.inventory,clipped.buildingId,clipped.images,clipped.level,clipped.contour,{proposal:clipped.proposal,discovery:clippedDiscovery});
assert.equal(clippedResult.observedPlanes.length,0);assert.ok(clippedResult.observations.every(o=>o.unresolved.includes('KEYED_WALL_SOURCE_EDGE_TERMINATION')));

const wrongHost=F.fixture();wrongHost.contour.points[0].xy[1]=270;wrongHost.contour.points[1].xy[1]=270;const wrongHostResult=solve(wrongHost);assert.equal(wrongHostResult.observedPlanes.length,0);assert.ok(wrongHostResult.observations.every(o=>o.unresolved.includes('KEYED_WALL_PARENT_CONTACT_AMBIGUOUS')),'a nearby parent boundary is not extended to touch the candidate');
const twoHosts=F.fixture(),twoHostDiscovery=F.applyObservedKeys(twoHosts),twoHostCandidate=K.propose(twoHosts.inventory,twoHosts.buildingId,twoHosts.images,twoHosts.level,twoHosts.contour,{discovery:twoHostDiscovery}).observations[0];
line(twoHosts.plan,[100,80],[200,80]);const bothParent={...twoHosts.contour,points:[[45,80],[400,80],[400,260],[45,260]].map((xy,i)=>({id:'p'+i,xy}))};
assert.equal(K.physicalExtent(twoHostCandidate,twoHosts.plan,bothParent).reason,'KEYED_WALL_PARENT_CONTACT_AMBIGUOUS','two independent host contacts remain ambiguous in this resolver scope');

const differentKey=F.fixture(),differentDiscovery=F.applyObservedKeys(differentKey);differentKey.view.payload.drawingReadings.keyedWallKeys.find(k=>k.frameId==='key-frame:120-150-138-168').text='R8';
assert.equal(K.resolve(differentKey.inventory,differentKey.buildingId,differentKey.images,differentKey.level,differentKey.contour,{proposal:differentKey.proposal,discovery:differentDiscovery}).observedPlanes.length,1,'a second wall never borrows the other wall key reading');
const contradictory=F.fixture();contradictory.view.payload.drawingReadings.rows.push({...clone(contradictory.view.payload.drawingReadings.rows[0]),text:'MURET HAUTEUR 1500 mm'});const contradictoryResult=solve(contradictory);assert.equal(contradictoryResult.observedPlanes.length,0);assert.ok(contradictoryResult.issues.includes('WALL_NOTE_HEIGHT_CONFLICT'));

// Unlinked legend glyphs used to consume the native reading budget before
// genuine callouts. Four independent pages still receive exactly12 regions.
const budget=F.fixture(),baseView=clone(budget.view),baseImage=budget.plan;for(const y of [35,65,95,125,195,225,255,285,405,435,465,495,525,555])frame(baseImage,[670,y,688,y+18]);
baseImage.data.set([255,255,255,255],(155*baseImage.width+125)*4);baseImage.data.set([255,255,255,255],(155*baseImage.width+315)*4);
budget.inventory.views=[];budget.images={};
for(let i=0;i<4;i++){const v=clone(baseView);v.id='invented-budget-plan-'+i;v.page=i+1;v.levelId='level-'+i;budget.inventory.views.push(v);budget.images[v.id]=baseImage;}
const bounded=K.discover(budget.inventory,budget.buildingId,budget.images);assert.equal(bounded.regions.length,12);assert.equal(bounded.regions.filter(r=>r.candidateEvidence.method==='written-wall-note-key-frame').length,4);assert.equal(bounded.regions.filter(r=>r.candidateEvidence.method==='observed-leader-and-paired-source-band-select-ocr-region').length,8);assert.ok(bounded.regions.filter(r=>r.priority>0).every(r=>['key-frame:120-150-138-168','key-frame:310-150-328-168'].includes(r.frame.id)),'no unlinked legend frame outranks a wall-connected callout');

const mutations=[
 ['height',p=>p.height+=.2],['base',p=>p.base+=.2],['centreline',p=>p.from[0]+=.1],['thickness',p=>p.thickness+=.1],['footprint',p=>p.footprint[0][0]+=.1],
 ['kind',p=>p.kind='legacy-plane'],['removed proof',p=>delete p.keyedWallEvidence],['source view',p=>p.sourceViewId=f.backView.id],
 ['source height',p=>p.measurements.height.sourceReading.text='MURET HAUTEUR 900 mm'],['invented height anchors',p=>p.measurements.height.anchors=[[0,0],[0,60]]],
 ['free cap',p=>p.keyedWallEvidence.physicalExtent.extent[0]++],['host edge',p=>p.keyedWallEvidence.physicalExtent.host.edgeIndex=1],
 ['key page',p=>p.keyedWallEvidence.sourceObservation.calloutKey.nativeSource.sourcePage++],
 ['key view',p=>p.keyedWallEvidence.sourceObservation.calloutKey.sourceViewId=f.backView.id],
 ['note frame',p=>p.keyedWallEvidence.sourceObservation.sourceNote.sourceFrame.cropToRaster[4]++],
 ['leader detached from key',p=>p.keyedWallEvidence.sourceObservation.leaderEvidence.paths[0].segments[0].anchors[0][0]++],
 ['leader detached from wall',p=>p.keyedWallEvidence.sourceObservation.leaderEvidence.paths[0].segments[1].anchors[1][0]++],
 ['unproven continuous skin',p=>p.keyedWallEvidence.physicalExtent.continuousSkins[0].support=.95],
 ['unrelated first ink',p=>p.keyedWallEvidence.physicalExtent.continuousSkins[0].firstHit=[20,20]],
 ['deck',p=>p.keyedWallEvidence.baseProofs[0].deck[0].anchors[0][1]++],
 ['registration',p=>p.keyedWallEvidence.baseProofs[0].axisRegistration.transform.offset+=10],
 ['individual hidden face',p=>p.keyedWallEvidence.lateralCorroborations[0].individualWallFaceObserved=true],
 ['lateral source frame',p=>p.keyedWallEvidence.lateralCorroborations[0].sourceFrame.cropToRaster[4]++],
 ['lateral wrong cap',p=>p.keyedWallEvidence.lateralCorroborations[0].planCoordinate++],
 ['lateral false witness',p=>p.keyedWallEvidence.lateralCorroborations[0].witness.x++],
 ['invented PDF anchors',p=>p.measurements.width.reference.pdfAnchors=[[0,0],[1,1]]]
];
for(const [name,mutate]of mutations){const p=clone(result.observedPlanes[0]);mutate(p);assert.ok(K.issues(p,f.inventory,level,{confirm:false}).length,name+' cannot bypass source or geometry validation');}
const confirmed=clone(level);for(const p of confirmed.observedPlanes){p.status='confirmed';p.registration.status='confirmed';for(const m of Object.values(p.measurements))m.status='confirmed';assert.deepEqual(K.issues(p,f.inventory,confirmed),[]);}
assert.deepEqual(K.historyIssues(confirmed,level),[],'review status can change without rewriting source evidence');
const parentConfirmed=clone(confirmed);for(const item of ['reference','height','base','alignment'])parentConfirmed.contours[0][item].status='confirmed';parentConfirmed.contours[0]=M.confirmDraft(parentConfirmed.contours[0],f.inventory,parentConfirmed);parentConfirmed.contours[0].levelRegistration.status='confirmed';
for(const p of parentConfirmed.observedPlanes){assert.deepEqual(K.issues(p,f.inventory,parentConfirmed),[],'parent confirmation and calculated PDF anchors preserve the same wall evidence');p.registration.alignment.status='confirmed';p.measurements.width.reference.status='confirmed';p.measurements.width.reference.pdfAnchors=clone(parentConfirmed.contours[0].reference.pdfAnchors);assert.deepEqual(K.issues(p,f.inventory,parentConfirmed),[]);}
assert.deepEqual(K.historyIssues(parentConfirmed,level),[],'only confirmation status and independently validated derived PDF anchors may change');
confirmed.wallFinishes={[confirmed.observedPlanes[0].id]:{material:'invented-finish',colour:'dark'}};assert.deepEqual(K.historyIssues(confirmed,level),[],'finish choices are independent of source geometry');
const stripped=clone(level);delete stripped.observedPlanes[0].kind;delete stripped.observedPlanes[0].keyedWallEvidence;assert.ok(K.historyIssues(stripped,level).includes('KEYED_WALL_SOURCE_OR_GEOMETRY_CHANGED'),'dropping both type and proof cannot fall back to a legacy contract');
const removed=clone(level);removed.observedPlanes.shift();assert.ok(K.historyIssues(removed,level).includes('KEYED_WALL_SOURCE_REMOVED'));
const transformed=clone(level);transformed.observedPlanes[0].from[0]+=.4;assert.ok(K.historyIssues(transformed,level).length,'computed geometry cannot be rewritten independently of its sources');
assert.deepEqual(K.historyIssues({levels:[clone(level)]},{levels:[level]}),[],'inventory-level history uses the same guard');
console.log('PASS keyed wall resolution: source caps, parent contact, independent deck datum, written height, two identities/footprints, bounded native priorities, roof/picket/ROI/occlusion negatives, source validation and immutable history');
