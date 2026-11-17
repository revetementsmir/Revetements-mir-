'use strict';
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js');
function planScene({eave=true,left=true,right=true,diagonals=true,markup=false,interiorLine=true,gutter=false,ridgeAtWall=false,competing=false}={}){
 const width=860,height=650,image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)},color=markup?[183,220,218]:[220,220,220];
 const line=(x1,y1,x2,y2,c=color)=>{const n=Math.ceil(Math.hypot(x2-x1,y2-y1)*1.5);for(let i=0;i<=n;i++){const x=Math.round(x1+(x2-x1)*i/n),y=Math.round(y1+(y2-y1)*i/n);image.data.set([...c,255],(y*width+x)*4);}};
 const roofs=[{span:[90,210],wallY:250,front:420},{span:[355,475],wallY:250,front:450},{span:[620,740],wallY:250,front:435}];
 for(const roof of roofs){const [l,r]=roof.span,back=350,y=roof.front;
  if(left)line(l,back,l,y);if(right)line(r,back,r,y);if(eave)line(l,y,r,y);
  const fragment=ridgeAtWall?(r-l)/2*(y-back)/(y-roof.wallY):42;
  if(diagonals){line(l,y,l+fragment,back);line(r,y,r-fragment,back);}
  if(competing){line(l,y,l+7,back);line(r,y,r-7,back);}
  if(gutter){line(l-4,back-4,l-4,y+4);line(r+4,back-4,r+4,y+4);line(l-4,y+4,r+4,y+4);}
  if(interiorLine)line(l,y-19,r,y-19);
 }
 // The higher roof hides the lower roof's rear. This boundary is not an
 // observed attachment line of any of the three lower roofs.
 line(30,345,810,345,[90,90,90]);
 return {image,roofs};
}
function ambiguousBudgetScene({firstObserved=false,ambiguous=true}={}){
 const width=640,height=firstObserved?540:400,image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)},left=60,right=580,top=firstObserved?280:100,bottom=firstObserved?500:320;
 const pixel=(x,y)=>image.data.set([220,220,220,255],(y*width+x)*4);
 if(ambiguous)for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if((x-left)%3===0||(y-top)%3===0||x===right||y===bottom)pixel(x,y);
 if(firstObserved){
  const line=(a,b)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2);for(let i=0;i<=n;i++)pixel(Math.round(a[0]+(b[0]-a[0])*i/n),Math.round(a[1]+(b[1]-a[1])*i/n));};
  for(const [a,b]of [[[left,100],[left,190]],[[right,100],[right,190]],[[left,190],[right,190]],[[left,190],[left+90,100]],[[right,190],[right-90,100]]])line(a,b);
 }
 return {image,search:{span:[left,right],wallY:40}};
}
module.exports={planScene,ambiguousBudgetScene};
if(require.main===module){
 const sample=planScene(),before=Buffer.from(sample.image.data),seen=sample.roofs.map(r=>V.entryRoofPlanBoundaries(sample.image,{span:r.span,wallY:r.wallY}));
 for(let i=0;i<seen.length;i++){
  assert.equal(seen[i].length,1,'Each independently observed front edge must keep its own depth.');const p=seen[i][0];
  assert.ok(Math.abs(p.eave.anchors[0][1]-sample.roofs[i].front)<=1);assert.equal(p.rear.status,'unresolved');assert.equal(p.rear.pixelsObserved,false);
  assert.equal(p.sides.length,2);assert.equal(p.diagonals.length,2);assert.ok(p.diagonals.every(d=>d.support>=.9&&d.sourceSamples.length>=5));
  assert.ok(p.sides.every(s=>s.anchors[1][1]>sample.roofs[i].wallY),'The hidden interval is preserved, not relabelled observed.');
  assert.deepEqual(V.entryRoofPlanBoundaryIssues(JSON.parse(JSON.stringify(p)),{sourceSize:[sample.image.width,sample.image.height]}),[],'Persisted observations replay against their exact retained source pixels.');
  assert.equal(seen[i].work.exhausted,undefined);
 }
 const valid=seen[0][0],size={sourceSize:[sample.image.width,sample.image.height]};
 for(const change of [p=>delete p.pixelEvidence,p=>p.pixelEvidence.rgbaHex='ff'.repeat(p.pixelEvidence.rgbaHex.length/2),p=>p.pixelEvidence.sourceRegion[0]++,p=>p.eave.anchors[0][0]++,p=>p.sides[0].anchors[1][1]++,p=>p.diagonals[0].sourceSamples[3][1]++,p=>p.diagonals[0].fit.c++,p=>p.rear.pixelsObserved=true]){
  const p=structuredClone(valid);change(p);assert.notDeepEqual(V.entryRoofPlanBoundaryIssues(p,size),[],'Missing pixels or rewritten boundaries/samples cannot remain a current source proof.');
 }
 assert.notDeepEqual(V.entryRoofPlanBoundaryIssues(valid,{sourceSize:[sample.image.width+1,sample.image.height]}),[],'A different source raster cannot inherit the retained proof.');
 assert.equal(new Set(seen.map(o=>o[0].eave.anchors[0][1])).size,3,'No common side depth is copied onto the three plan footprints.');
 assert.equal(Buffer.compare(before,Buffer.from(sample.image.data)),0);
 const layered=planScene({gutter:true,ridgeAtWall:true,competing:true});
 for(const roof of layered.roofs){
  const ridgeX=(roof.span[0]+roof.span[1])/2,observed=V.entryRoofPlanBoundaries(layered.image,{span:roof.span,wallY:roof.wallY,ridgeX});
  const own=observed.find(o=>Math.abs(o.eave.anchors[0][1]-roof.front)<=1);
  assert.ok(own,'A paper separator preserves the own roof edge beside a separate gutter; a registered ridge guide disambiguates its observed diagonal fragments.');
  assert.equal(observed.work.exhausted,undefined,'The normal source corpus remains inside the work budget.');
  assert.equal(own.search.ridgeX,ridgeX);
  assert.deepEqual(V.entryRoofPlanBoundaryIssues(own,{sourceSize:[layered.image.width,layered.image.height]}),[]);
  const changed=structuredClone(own);changed.search.ridgeX=roof.span[0]+4;
  assert.notDeepEqual(V.entryRoofPlanBoundaryIssues(changed,{sourceSize:[layered.image.width,layered.image.height]}),[],'The registered search guide cannot be rewritten without losing its correspondence to the retained diagonal strokes.');
 }
 for(const options of [{eave:false},{left:false},{right:false},{diagonals:false},{markup:true}]){const s=planScene(options);for(const r of s.roofs)assert.equal(V.entryRoofPlanBoundaries(s.image,{span:r.span,wallY:r.wallY}).length,0,'Missing boundaries or markup alone cannot supply an entry plan: '+JSON.stringify(options));}
 const wide=ambiguousBudgetScene({firstObserved:true,ambiguous:false}),wideObserved=V.entryRoofPlanBoundaries(wide.image,wide.search);
 assert.equal(wideObserved.length,1,'A wide, unambiguous source roof must not exhaust the search budget.');assert.equal(wideObserved.work.exhausted,undefined);
 assert.deepEqual(V.entryRoofPlanBoundaryIssues(wideObserved[0],{sourceSize:[wide.image.width,wide.image.height]}),[]);
 for(const firstObserved of [false,true]){
  const s=ambiguousBudgetScene({firstObserved}),before=Buffer.from(s.image.data),observed=V.entryRoofPlanBoundaries(s.image,s.search),work=observed.work;
  assert.equal(observed.status,'unresolved');assert.deepEqual(observed.issues,['ENTRY_ROOF_PLAN_WORK_LIMIT']);assert.equal(observed.length,0,'An incomplete ambiguity search cannot retain partial roof evidence.');
  assert.ok(work.boundaryPairs>0&&work.diagonalHypotheses>0&&work.fitCalls>0);
  assert.ok(work.exhausted in work.limits);assert.ok(work[work.exhausted]+work.rejectedCharge>work.limits[work.exhausted]);
  for(const [key,limit]of Object.entries(work.limits))assert.ok(work[key]<=limit,'The operation exceeding '+key+' is rejected before execution.');
  if(firstObserved)assert.ok(work.discardedObservations>0,'A valid early observation is discarded when the later ambiguity search reaches the budget.');
  assert.equal(Buffer.compare(before,Buffer.from(s.image.data)),0);
 }
 console.log('PASS entry roof plan: individual source boundaries/depths, replayed pixels, no invented hidden rear, bounded ambiguous search and atomic discard of partial evidence.');
}
