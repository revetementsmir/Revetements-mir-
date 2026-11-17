'use strict';
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js'),R=require('../dist/plan-reconstruction.js');
function drawing(mode){const width=900,height=650,data=new Uint8ClampedArray(width*height*4).fill(255),put=(x,y,c)=>data.set(c,(y*width+x)*4),line=(a,b,c=[40,40,40,255])=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=n;i++)put(Math.round(a[0]+(b[0]-a[0])*i/n),Math.round(a[1]+(b[1]-a[1])*i/n),c);};line([100,350],[250,200]);line([250,200],[550,200]);line([550,200],[700,350]);line([100,350],[700,350]);for(const cx of [270,530])for(let x=cx-1;x<=cx+1;x++)for(let y=190;y<=211;y++)put(x,y,mode==='colour'?[205,65,90,255]:mode==='wide'?[205,65,90,255]:[255,255,255,255]);if(mode==='wide')for(const cx of [270,530])for(let x=cx-7;x<=cx+7;x++)for(let y=190;y<=211;y++)put(x,y,[205,65,90,255]);if(mode==='note'){line([266,195],[274,195]);line([270,194],[270,197]);line([526,204],[534,204]);}return {width,height,data};}

const envelope={status:'proposed',box:[130,356,540,200]},profile=V.roofProfile(drawing('colour'),envelope);
assert.equal(profile.status,'proposed');assert.ok(profile.slopes.every(s=>s.ridgeEvidence?.y===200));
for(const s of profile.slopes){assert.equal(s.ridgeEvidence.annotationGaps.length,2);for(const gap of s.ridgeEvidence.annotationGaps){assert.equal(gap.status,'occluded-interpolation');assert.equal(gap.pixelsObserved,false);assert.equal(gap.anchors[1][0]-gap.anchors[0][0],4);}}
for(const mode of ['blank','wide','note']){const p=V.roofProfile(drawing(mode),envelope);assert.ok(p.slopes.every(s=>!s?.ridgeEvidence),'a blank, wide or monochrome-note interruption cannot certify a horizontal ridge');}
const masked=V.roofProfile(drawing('colour'),{...envelope,occlusions:[[266,195,8,12],[526,195,8,12]]});assert.ok(masked.slopes.every(s=>!s?.ridgeEvidence),'a known legend must not be crossed by the short annotation rule');
// The supported horizontal ridge is independently checked against a pointed
// orthogonal profile. No physical point is created from the colour itself.
const make=reference=>[
 {axis:'x',side:'min',eave:[-6,0],high:[-3,3],ridgeEvidence:reference,source:{sourceViewId:'front'}},
 {axis:'x',side:'max',eave:[6,0],high:[3,3],ridgeEvidence:reference,source:{sourceViewId:'front'}},
 {axis:'y',side:'min',eave:[-3,0],high:[-.1,2.9],source:{sourceViewId:'right'}},
 {axis:'y',side:'max',eave:[3,0],high:[.1,2.9],source:{sourceViewId:'right'}}];
const observed=R.assembleRoofProfiles(make(profile.slopes[0].ridgeEvidence));assert.equal(observed.status,'proposed');assert.equal(observed.profiles.x.length,4);assert.equal(observed.profiles.y.length,3);assert.ok(observed.checks.some(c=>c.method==='two-supported-slopes-intersection-cross-checked-with-orthogonal-height'));
assert.equal(R.assembleRoofProfiles(make(null)).reason,'ROOF_ORTHOGONAL_HEIGHT_CONFLICT','without the written source line the orthogonal view forbids an invented high peak');
const conflict=make(profile.slopes[0].ridgeEvidence);conflict[2].high[1]=conflict[3].high[1]=4;assert.equal(R.assembleRoofProfiles(conflict).reason,'ROOF_ORTHOGONAL_HEIGHT_CONFLICT');
console.log('PASS ridge fragments: two neutral ends, short observed colour occlusion recorded as interpolation, blank/note/legend/wide refusal and independent orthogonal peak check');
