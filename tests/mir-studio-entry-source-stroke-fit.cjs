'use strict';
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js');
// Source samples from a raster diagonal with normal subpixel rounding, crossed
// by a short horizontal hatch. This is unrelated synthetic source geometry.
const samples=Array.from({length:60},(_,x)=>[x,Math.round(100-.5*x)+(x%5===0?1:0)]);for(let x=5;x<12;x++)samples[x][1]=103.5;
const before=structuredClone(samples),result=V.sourceStrokeFit(samples);assert.ok(result);assert.equal(result.estimator,'bounded-consensus-on-observed-source-pixels');assert.ok(result.points.length>=samples.length*.8,'the existing 80-percent source support requirement is retained');assert.ok(result.points.every(p=>samples.includes(p)),'only original observed pixels are fitted');
const slope=(result.points.at(-1)[1]-result.points[0][1])/(result.points.at(-1)[0]-result.points[0][0]);assert.ok(Math.abs(slope+.5)<.03,'a short hatch must not flatten the source roof slope');assert.ok(result.points.every(([x,y])=>Math.abs(y-(100-.5*x))<2),'the residual budget remains two source pixels');assert.deepEqual(samples,before);
const transformed=samples.map(([x,y])=>[x+217,y-43]),shifted=V.sourceStrokeFit(transformed);assert.deepEqual(shifted.points.map(([x,y])=>[x-217,y+43]),result.points,'the result does not depend on the location of the roof on a sheet');
const mirrored=V.sourceStrokeFit(samples.map(([x,y])=>[x,300-y]));assert.ok(mirrored);assert.deepEqual(mirrored.points.map(([x,y])=>[x,300-y]),result.points,'the opposite roof slope uses the same source rule');
const conflicting=Array.from({length:60},(_,x)=>[x,100+(x<30?-.5:.5)*x]);assert.equal(V.sourceStrokeFit(conflicting),null,'two incompatible source contours cannot become one averaged roof');
const turnedEnd=Array.from({length:60},(_,x)=>[x,100-.5*x+(x<10?15-x:0)]);assert.equal(V.sourceStrokeFit(turnedEnd),null,'a discarded source endpoint can represent a real roof return, not an interior hatch');
const scattered=Array.from({length:60},(_,x)=>[x,100+x*.4+(x%3-1)*8]);assert.equal(V.sourceStrokeFit(scattered),null,'insufficient coherent ink cannot be promoted by a lower threshold');
for(const p of [[],[[1,2],[1,3],[1,4]],[[2,3],[1,4],[3,5]],[[0,0],[1,NaN],[2,2]]])assert.equal(V.sourceStrokeFit(p),null);
const exact=Array.from({length:60},(_,x)=>[x,100-x*.5]),legacy=V.sourceStrokeFit(exact);assert.equal(legacy.estimator,'least-squares-source-ink');assert.deepEqual(legacy.points,exact,'already valid source fits retain their original observations');
console.log('PASS entrance source stroke fit: short hatch bias corrected from original pixels, unchanged support/residual limits, translated/mirrored cases, conflicting and insufficient ink refused, ordinary fits preserved');
