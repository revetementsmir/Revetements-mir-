'use strict';
// Guard genuine profile-producer output, not hand-filled fit coefficients.
const assert=require('node:assert/strict'),X=require('../dist/studio-exterior-model.js');
const {faceProfileFixture}=require('./mir-studio-entry-face-profile.cjs');
for(const scale of [.75,1,1.5]){
 const f=faceProfileFixture({scale}),source={sourceViewId:f.envelope.sourceViewId,sourceFrame:f.envelope.sourceFrame},view={id:source.sourceViewId,frame:source.sourceFrame,payload:{sourceWidth:f.image.width,sourceHeight:f.image.height}};
 assert.deepEqual(X.entryFaceProfileIssues(source,f.profile,view),[]);
 const changes={
  'detached-face':p=>{p.faceEvidence.box[1]+=8;},
  'open-face':p=>{p.faceEvidence.boundary[1].support=.4;},
  'relabelled-proof':p=>{delete p.method;},
  'invented-apex':p=>{p.apexEvidence.point[1]-=10;},
  'shifted-fit':p=>{p.slopes[0].c+=4;},
  'unrelated-inlier':p=>{p.slopes[0].fit.inlierSamples[0][1]+=8;},
  'hidden-source-frame':p=>{p.sourceFrame={rasterSize:[1,1]};},
  'unknown-family':p=>{p.apexEvidence.bounds[2]+=40;},
  'lost-observation':p=>{delete p.faceEvidence;}
 };
 for(const [name,change]of Object.entries(changes)){
  const p=structuredClone(f.profile);change(p);
  assert.ok(X.entryFaceProfileIssues(source,p,view).includes('ENTRY_REGISTERED_FACE_PROFILE'),name+' must fail at scale '+scale);
 }
 assert.ok(X.entryFaceProfileIssues({...source,sourceViewId:'foreign-view'},f.profile,view).length);
 assert.deepEqual(X.entryFaceProfileIssues(source,{method:'legacy-profile'},view),[],'Existing profile formats retain their own validators.');
}
console.log('PASS entry face source guards: real raster fits, closed-face/apex/source identity, independent least-squares replay and rejection of lost, shifted or unrelated evidence.');
// Exercise the actual roof-only producer, including the calculated hidden
// rear attachment. An invented fixture is retained through source validation.
{
 const f=require('./mir-studio-entry-roof-only.cjs').roofOnlyFixture(),inventory={...f.inventory,levels:f.result.levels},level=f.level,id=f.roof.id;
 assert.deepEqual(X.proposalIssues(level,inventory),[]);
 for(const [name,change]of Object.entries({
  'missing-plan':r=>{delete r.entryPlanEvidence;},
  'missing-contract':r=>{delete r.entryAssembly.footprintSource;},
  'downgraded-to-legacy':r=>{delete r.entryPlanEvidence;delete r.entryAssembly.footprintSource;for(const s of r.sources.filter(s=>s.axis==='y'))for(const k of ['eaveConstraint','sourceSlopeEvidence','wallContactEvidence'])delete s.profileEvidence[k];},
  'invented-legacy-support':r=>{r.sourceCategory='pdf-entry-assembly';r.entryAssembly.supportStatus='observed-proposed';delete r.entryPlanEvidence;delete r.entryAssembly.footprintSource;for(const s of r.sources.filter(s=>s.axis==='y'))for(const k of ['eaveConstraint','sourceSlopeEvidence','wallContactEvidence'])delete s.profileEvidence[k];const p=r.sources.find(s=>s.axis==='x').profileEvidence;for(const k of ['method','faceEvidence','apexEvidence'])delete p[k];},
  'foreign-plan-page':r=>{r.entryPlanEvidence.sourcePage++;},
  'wrong-floor-contour':r=>{r.entryPlanEvidence.reference.contourId='foreign-contour';},
  'shifted-plan-grid':r=>{r.entryPlanEvidence.gridRegistration.transform.offsetY+=20;},
  'lost-apex-guide':r=>{delete r.entryPlanEvidence.sourcePixelEvidence.search.ridgeX;},
  'foreign-apex-source':r=>{r.entryPlanEvidence.sourcePixelEvidence.search.ridgeReference.sourceViewId='foreign-front';},
  'shifted-apex-anchor':r=>{r.entryPlanEvidence.sourcePixelEvidence.search.ridgeReference.anchor[0]+=1;},
  'lost-apex-provenance':r=>{delete r.entryPlanEvidence.sourcePixelEvidence.search.ridgeReference;},
  'shifted-wall-search':r=>{r.entryPlanEvidence.sourcePixelEvidence.search.wallY+=1;},
  'lost-source-pixels':r=>{r.entryPlanEvidence.sourcePixelEvidence.pixelEvidence.rgbaHex=r.entryPlanEvidence.sourcePixelEvidence.pixelEvidence.rgbaHex.slice(8);},
  'shifted-footprint':r=>{r.entryPlanEvidence.footprint[0][1]-=.2;},
  'invented-visible-rear':r=>{r.entryPlanEvidence.sourceBoundary.rearPixelsObserved=true;},
  'detached-completion':r=>{r.entryPlanEvidence.sourceBoundary.completedSides[0][1][1]+=20;},
  'invented-diagonal':r=>{r.entryPlanEvidence.association.diagonalResiduals[0].modelAnchors[0][0]+=.2;},
  'false-side-contact':r=>{r.entryPlanEvidence.association.sideAttachments[0].worldContact[0]+=.2;},
  'erased-depth-residual':r=>{r.entryPlanEvidence.association.sideAttachments[0].planEaveResidual=1;}
 })){
  const next=structuredClone(level),roof=next.reconstructedRoofs.find(r=>r.id===id);change(roof);
  const sourceIssues=X.registeredSourceIssues(next,{...inventory,levels:inventory.levels.map(l=>l.id===next.id?next:l)});
  assert.ok(sourceIssues.length,name+' must be rejected');assert.ok(X.historyIssues(next,level).length,name+' must preserve its previous proof');
 }
 for(const [name,change]of Object.entries({
  'lost-side-pixel-contract':p=>{delete p.eaveConstraint;delete p.sourceSlopeEvidence;delete p.wallContactEvidence;},
  'lost-wall-contact':p=>{delete p.wallContactEvidence;},
  'shifted-wall-contact':p=>{p.wallContactEvidence.contact[0]+=1;},
  'lost-wall-pixels':p=>{p.wallContactEvidence.sourcePixels.pixels.length=0;},
  'lost-side-slope':p=>{delete p.sourceSlopeEvidence;}
 })){
  const next=structuredClone(level),roof=next.reconstructedRoofs.find(r=>r.id===id);change(roof.sources.find(s=>s.axis==='y').profileEvidence);
  assert.ok(X.registeredSourceIssues(next,{...inventory,levels:inventory.levels.map(l=>l.id===next.id?next:l)}).length,name+' must be rejected');
  assert.ok(X.historyIssues(next,level).length,name+' must preserve the observed side proof');
 }
 const paint=structuredClone(level);paint.reconstructedRoofs.find(r=>r.id===id).finish={color:'#123456'};assert.deepEqual(X.historyIssues(paint,level),[]);assert.deepEqual(X.proposalIssues(paint,{...inventory,levels:inventory.levels.map(l=>l.id===paint.id?paint:l)}),[]);
 const M=require('../dist/plan-level-model.js'),confirmed=structuredClone(level);
 for(const name of ['reference','height','base','alignment'])confirmed.contours[0][name].status='confirmed';
 confirmed.contours[0]=M.confirmDraft(confirmed.contours[0],inventory,confirmed);
 const confirmedInventory={...inventory,levels:inventory.levels.map(l=>l.id===confirmed.id?confirmed:l)};
 assert.deepEqual(X.proposalIssues(confirmed,confirmedInventory),[],'Source confirmation and exactly calculated PDF coordinates preserve the roof proof.');
 for(const name of ['point','reference','status']){
  const next=structuredClone(confirmed);
  if(name==='point')next.contours[0].points[0].pdfPoint=[99,99];
  if(name==='reference')next.contours[0].reference.pdfAnchors=[[99,99],[100,100]];
  if(name==='status')next.contours[0].height.status='conflict';
  assert.ok(X.registeredSourceIssues(next,{...confirmedInventory,levels:confirmedInventory.levels.map(l=>l.id===next.id?next:l)}).length,'False derived '+name+' must be refused.');
 }
 console.log('PASS roof-only entry source guards: registered plan/face/side intersection, retained pixel replay, immutable hidden attachment and rejection of source, footprint, depth or history mutations.');
}
