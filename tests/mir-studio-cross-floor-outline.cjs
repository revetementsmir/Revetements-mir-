'use strict';
// Synthetic rasters only. Each level has independent ink and labelled grid
// rings; the target's normal detector must fail before recovery is exercised.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const V=require('../dist/plan-reconstruction-vision.js'),R=require('../dist/plan-reconstruction.js'),Grid=require('../dist/plan-grid-registration.js');
const rectangle=[[180,170],[620,170],[620,500],[180,500]],setback=[[180,170],[620,170],[620,500],[430,500],[430,420],[180,420]];
function drawing({id='upper',levelId='level-2',buildingId='house',sx=1,sy=1,tx=0,ty=0,width=3,poly=rectangle,colour=[0,0,0],gridColour=[0,0,0],omit=[],labelsOnly=false,additional=[]}={}){
 const image={width:800,height:600,data:new Uint8ClampedArray(800*600*4).fill(255)},rows=[];
 const point=p=>[(p[0]-tx)/sx,(p[1]-ty)/sy],pixel=(x,y,color)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&x<image.width&&y>=0&&y<image.height)image.data.set([...color,255],(y*image.width+x)*4);};
 const stroke=(a,b,w=width)=>{a=point(a);b=point(b);const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let k=0;k<=n;k++)for(let y=-Math.floor(w/2);y<=Math.floor(w/2);y++)for(let x=-Math.floor(w/2);x<=Math.floor(w/2);x++)pixel(a[0]+(b[0]-a[0])*k/n+x,a[1]+(b[1]-a[1])*k/n+y,colour);};
 for(const [label,x,y]of [...['1','2','3','4'].map((l,i)=>[l,170+i*170,65]),['A',90,235],['B',90,485]]){
  if(omit.includes(label))continue;const c=point([x,y]);
  if(!labelsOnly)for(let n=0;n<360;n++){const a=n*Math.PI/180;for(const dr of [-1,0,1])pixel(c[0]+Math.cos(a)*(17+dr),c[1]+Math.sin(a)*(17+dr),gridColour);}
  rows.push({text:label,box:[c[0]-5,c[1]-5,c[0]+5,c[1]+5],confidence:98});
 }
 for(const polygon of [poly,...additional])polygon.forEach((p,i)=>stroke(p,polygon[(i+1)%polygon.length]));
 stroke([300,170],[300,420]);stroke([180,350],[620,350]);
 return {view:{id,kind:'floor',buildingId,levelId,page:2,frame:{units:'pixels',rasterSize:[800,600],pdfToRaster:[1,0,0,-1,0,600],cropToRaster:[1,0,0,1,0,0]},payload:{sourceWidth:800,sourceHeight:600,drawingReadings:{rows}}},image};
}
function inventoryFor(drawings){return {views:drawings.map(d=>d.view),levels:drawings.map(d=>({id:d.view.buildingId+':'+d.view.levelId,buildingId:d.view.buildingId,sourceLevel:d.view.levelId,contours:[]}))};}
const imagesFor=drawings=>Object.fromEntries(drawings.map(d=>[d.view.id,d.image]));
const direct=d=>V.floorEnvelope(d.image,{sourceViewId:d.view.id,frame:d.view.frame,rows:d.view.payload.drawingReadings.rows});
function propose(target,donors,api=R){const drawings=[target,...donors],inventory=inventoryFor(drawings),images=imagesFor(drawings);return api.propose(inventory,'house',images,{levelId:'house:'+target.view.levelId});}
function erase(image,[x0,y0,x1,y1]){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)image.data.set([255,255,255,255],(y*image.width+x)*4);}

const donor=drawing(),target=drawing({id:'lower',levelId:'level-0',width:1,sx:1.025,sy:1.02,tx:8,ty:-5});
assert.equal(direct(donor).status,'proposed','donor geometry is actually found in independent source ink');
assert.equal(direct(target).status,'unresolved','fixture reproduces thin target walls missed by its normal detector');
const originalInventory=inventoryFor([target,donor]),before=structuredClone(originalInventory),targetPixels=Buffer.from(target.image.data),donorPixels=Buffer.from(donor.image.data);
const result=R.propose(originalInventory,'house',imagesFor([target,donor]),{levelId:'house:level-0'});
assert.equal(result.status,'proposed');assert.equal(result.complete,false);assert.equal(result.confirmationRequired,true);
assert.equal(result.draft.proposal.method,'cross-floor-labelled-grid-and-target-strokes');
assert.equal(result.draft.reference.value,null,'cross-level pixel registration is not a metric dimension');
assert.equal(result.draft.height.value,null,'a donor level does not supply an unknown height');
assert.equal(result.draft.sourceViewId,target.view.id);assert.deepEqual(result.draft.proposal.sourceFrame,target.view.frame);
const evidence=result.draft.proposal.recovery;
assert.equal(evidence.originalReason,direct(target).reason);assert.equal(evidence.donorSourceViewId,donor.view.id);
assert.deepEqual(evidence.donorOutline.points,direct(donor).points);assert.deepEqual(evidence.sourcePoints,result.draft.points.map(p=>p.xy));
assert.equal(evidence.gridObservations.donor.status,'observed');assert.equal(evidence.gridObservations.target.status,'observed');
assert.ok(evidence.gridObservations.target.numbers.every(m=>m.ringSupport>=.68&&m.sourceViewId===target.view.id));
assert.ok(evidence.registration.evidence.every(e=>e.reference.sourceViewId===donor.view.id&&e.moving.sourceViewId===target.view.id));
const t=evidence.registration.transform;
for(let i=0;i<result.draft.points.length;i++){
 const p=result.draft.points[i].xy,source=evidence.donorOutline.points[evidence.donorPointIndices[i]];
 assert.ok(Math.hypot(p[0]*t.scaleX+t.offsetX-source[0],p[1]*t.scaleY+t.offsetY-source[1])<1e-8,'inverse transform keeps points in the TARGET raster');
}
assert.ok(result.draft.proposal.sourceEdgeEvidence.every(e=>e.status==='proposed'&&e.maxGap<=Math.max(4,Math.round(target.image.width/525)*2)));
assert.deepEqual(originalInventory,before,'proposal generation does not rewrite stored levels or source observations');
assert.deepEqual(Buffer.from(target.image.data),targetPixels);assert.deepEqual(Buffer.from(donor.image.data),donorPixels);
assert.deepEqual(JSON.parse(JSON.stringify(result.draft.proposal.recovery)),evidence,'all registration and source evidence survives persistence');

// Strong target support alone is insufficient without two observed grid axes.
for(const opts of [{omit:['B']},{labelsOnly:true},{gridColour:[0,150,210]}]){
 const missing=drawing({id:'lower',levelId:'level-0',width:1,...opts});
 assert.equal(direct(missing).status,'unresolved');assert.equal(propose(missing,[donor]).status,'unresolved','missing or coloured rings cannot align an otherwise visible contour');
}
const noDonorGrid=drawing({labelsOnly:true});assert.equal(propose(target,[noDonorGrid]).status,'unresolved','the donor needs its own raster grid evidence');
const deformation=drawing({id:'lower',levelId:'level-0',width:1,sx:1.15,sy:.98});
assert.equal(propose(deformation,[donor]).status,'unresolved','contradictory X/Y scales cannot be warped to fit');
const otherBuilding=drawing({buildingId:'shed'});assert.equal(propose(target,[otherBuilding]).status,'unresolved','a matching shed cannot donate the house contour');
const unidentified=drawing({levelId:null});assert.equal(propose(target,[unidentified]).status,'unresolved','an unassigned source cannot become a compatible level');
const duplicate=drawing({id:'upper-alternative'});assert.equal(propose(target,[donor,duplicate]).status,'unresolved','two views of an unresolved donor level are not selected silently');

const coloured=drawing({id:'lower',levelId:'level-0',width:1,colour:[0,170,0]});
assert.equal(direct(coloured).status,'unresolved');assert.equal(propose(coloured,[donor]).status,'unresolved','a colour mask cannot satisfy the target wall support');
const broken=drawing({id:'lower',levelId:'level-0',width:1});erase(broken.image,[615,265,625,325]);
assert.equal(direct(broken).status,'unresolved');const refused=propose(broken,[donor]);assert.equal(refused.status,'unresolved');
assert.ok(refused.outlineRecovery.attempts.some(a=>a.sourceEdgeEvidence?.some(e=>e.status==='unresolved'&&e.maxGap>8)),'missing target wall remains visible as a failed source check');
const doorGap=drawing({id:'lower',levelId:'level-0',width:1});erase(doorGap.image,[390,495,408,505]);
assert.equal(propose(doorGap,[donor]).status,'unresolved','this fallback does not invent an opening to bridge a failed segment');

// Legitimate setbacks on another level are preserved. Even if target ink can
// support both templates, disagreement between registered donors is explicit.
const recessed=drawing({id:'middle',levelId:'level-1',poly:setback});assert.equal(direct(recessed).status,'proposed');
const ambiguous=drawing({id:'lower',levelId:'level-0',width:1,additional:[setback]});assert.equal(direct(ambiguous).status,'unresolved');
const conflict=propose(ambiguous,[donor,recessed]);assert.equal(conflict.status,'unresolved');assert.equal(conflict.reason,'CROSS_FLOOR_OUTLINE_CONFLICT');
assert.deepEqual(new Set(conflict.outlineRecovery.conflictingSourceViewIds),new Set(['middle','upper']));
const directSetback=propose(recessed,[donor]);assert.equal(directSetback.status,'proposed');assert.equal(directSetback.draft.proposal.recovery,undefined,'a valid per-level contour is never replaced with another floor');
assert.deepEqual(directSetback.draft.points.map(p=>p.xy),direct(recessed).points);
const same=drawing({id:'third',levelId:'level-3'}),a=propose(target,[donor,same]),b=propose(target,[same,donor]);
assert.equal(a.status,'proposed');assert.deepEqual(a.draft.points,b.draft.points,'inventory ordering cannot change wall corner identifiers');
assert.equal(a.draft.proposal.recovery.corroboratingSourceViewIds.length,2);

// plan.html loads the reconstruction module before grid registration. Resolve
// the dependency when proposing, so the browser uses the same recovery as Node.
const window={MIRLevelModel:require('../dist/plan-level-model.js'),MIRReconstructionVision:V,MIRPDFAnalysis:require('../dist/plan-import-core.js'),MIRSpatialDimensions:require('../dist/plan-spatial-dimensions.js')};
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/plan-reconstruction.js'),'utf8'),{window});
assert.equal(propose(target,[donor],window.MIRPlanReconstruction).status,'unresolved','an absent module does not bypass registration');
window.MIRGridRegistration=Grid;
assert.equal(propose(target,[donor],window.MIRPlanReconstruction).status,'proposed','late browser grid dependency reaches the common proposal pipeline');
// Multi-level elevations use their local floor/ceiling band. Two windows at
// identical local heights on different storeys must not share a deduction or
// acquire a scale based on the entire building's visible height.
{
 const M=require('../dist/plan-level-model.js'),frame=donor.view.frame;
 const floors=[0,1].map(n=>({id:'band-floor-'+n,kind:'floor',levelId:'level-'+n,buildingId:'house',frame,payload:{}}));
 const elevations=['front','right'].map(direction=>({id:'band-'+direction,kind:'elevation',buildingId:'house',direction,frame,payload:{}}));
 const inventory={views:[...floors,...elevations],levels:floors.map((v,n)=>({id:'house:level-'+n,buildingId:'house',sourceLevel:v.levelId,contours:[]}))};
 const infos=elevations.map(v=>({viewId:v.id,direction:v.direction,envelope:{status:'proposed',box:[100,150,400,400]},supportY:150,guides:[
  {sourceViewId:v.id,levelHint:'level-0',datumType:'floor',y:550,confidence:95},
  {sourceViewId:v.id,levelHint:'level-1',datumType:'floor',y:350,confidence:95},
  {sourceViewId:v.id,levelHint:'level-1',datumType:'ceiling',y:150,confidence:95}],
  roofProfile:{slopes:[{eaveX:100,eaveY:150,highX:300,highY:50},{eaveX:500,eaveY:150,highX:300,highY:50}]}}));
 const drafts=floors.map((v,n)=>{const draft=M.draftFor(v,inventory.levels[n]);draft.points=[[100,100],[500,100],[500,400],[100,400]].map((xy,i)=>({id:'p'+i,xy}));draft.alignment={origin:[100,400],offset:[0,0],rotationDegrees:0};draft.reference={kind:'written',value:4,anchors:[[100,400],[500,400]]};draft.base={value:3*n};draft.height={kind:'estimated-calibrated',value:3,sourceViewId:'band-front',relationship:'two-visible-level-datums',datumEvidence:{lower:infos[0].guides[n],upper:infos[0].guides[n+1]}};return draft;});
 const bands=drafts.map(d=>R.levelBand(infos[0],d,inventory));
 assert.equal(bands[0].topY,350);assert.equal(bands[0].bottomY,550);assert.equal(bands[1].topY,150);assert.equal(bands[1].bottomY,350);assert.equal(bands[0].scaleY,.015);assert.equal(bands[1].scaleY,.015);
 const registered=drafts.map(d=>R.elevationRegistration(infos[0],d,inventory));assert.equal(registered[0].z(350),3);assert.equal(registered[1].z(350),3,'both levels meet at the same written floor datum');assert.equal(registered[1].z(150),6);
 const im={width:800,height:600,data:new Uint8ClampedArray(800*600*4).fill(255)};
 for(const [x,y,w,h]of [[150,420,70,60],[150,220,70,60],[300,320,60,80]])for(let yy=y;yy<=y+h;yy++)for(let xx=x;xx<=x+w;xx++)if(yy<=y+1||yy>=y+h-1||xx<=x+1||xx>=x+w-1)im.data.set([0,0,0,255],(yy*im.width+xx)*4);
 const proposals=drafts.map((draft,n)=>({buildingId:'house',levelId:inventory.levels[n].id,draft,views:[infos[0]],sourceOpeningGaps:[],openingSizeCandidates:[]}));
 const openings=proposals.map(p=>R.openingsFor(p,inventory,{'band-front':im}));
 assert.equal(openings[0].length,1,'lower-floor band finds only its own complete frame');assert.equal(openings[1].length,1,'upper-floor band does not reuse the lower window');
 assert.notEqual(openings[0][0].id,openings[1][0].id);assert.notEqual(openings[0][0].wallId,openings[1][0].wallId);
 assert.equal(openings[0][0].height,openings[1][0].height);assert.equal(openings[0][0].sill,openings[1][0].sill);assert.ok(Math.abs(openings[0][0].height-.9)<.03);
 const roofProposals=proposals.map(p=>({...p,views:infos}));
 assert.equal(R.roofProposal(roofProposals[0],inventory,drafts[0]).status,'unresolved','main roof above another level is not duplicated on the lower floor');
 const roof=R.roofProposal(roofProposals[1],inventory,drafts[1]);assert.equal(roof.status,'proposed');assert.equal(Math.min(...roof.profiles.x.map(p=>p[1])),6);assert.equal(Math.max(...roof.profiles.x.map(p=>p[1])),7.5);
 const missing={...infos[0],guides:infos[0].guides.filter(g=>g.levelHint!=='level-1'||g.datumType!=='floor')};
 missing.guides.push({sourceViewId:'band-front',levelHint:'level-0',datumType:'ceiling',y:370,confidence:98});
 assert.equal(R.levelBand(missing,drafts[0],inventory),null,'a ceiling cannot replace the floor used to establish this height');assert.equal(R.elevationRegistration(missing,drafts[0],inventory),null);
 assert.equal(R.openingsFor({...proposals[0],views:[missing]},inventory,{'band-front':im}).length,0,'missing local datum does not fall back to the building top');
 const contradicted={...infos[0],guides:[...infos[0].guides,{...infos[0].guides[1],y:365}]};assert.equal(R.levelBand(contradicted,drafts[0],inventory),null,'contradictory local floor datums remain unresolved');
 const legacy=structuredClone(drafts[0]);legacy.height.relationship='floor-span-to-elevation-registration';
 assert.equal(R.levelBand(infos[0],legacy,inventory),null);assert.equal(R.elevationRegistration(infos[0],legacy,inventory).sz,.0075,'legacy registration behavior is unchanged');
}
console.log('PASS cross-floor outline and level bands: actual detector failure, target strokes, inverse grid, provenance/persistence, setbacks, isolation, local opening scales and roof-level ownership');
