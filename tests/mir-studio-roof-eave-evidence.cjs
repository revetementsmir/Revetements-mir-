'use strict';
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js');
const w=900,h=650,envelope={status:'proposed',box:[200,400,500,180],occlusions:[]};
function raster(){const data=new Uint8ClampedArray(w*h*4);data.fill(255);return {width:w,height:h,data};}
function line(im,a,b,color=[0,0,0],radius=1){const steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=steps;i++){const x=Math.round(a[0]+(b[0]-a[0])*i/steps),y=Math.round(a[1]+(b[1]-a[1])*i/steps);for(let yy=y-radius;yy<=y+radius;yy++)for(let xx=x-radius;xx<=x+radius;xx++)if(xx>=0&&xx<w&&yy>=0&&yy<h)im.data.set([...color,255],(yy*w+xx)*4);}}
function fill(im,box,color){for(let y=box[1];y<box[1]+box[3];y++)for(let x=box[0];x<box[0]+box[2];x++)im.data.set([...color,255],(y*w+x)*4);}
const a=[170,390],peak=[450,250],b=[730,390],real=raster();line(real,a,peak);line(real,peak,b);line(real,a,b);fill(real,[170,393,580,12],[173,213,211]);
const profile=V.roofProfile(real,envelope);assert.ok(profile.slopes.every(Boolean));for(const [i,p]of [a,b].entries()){assert.ok(Math.abs(profile.slopes[i].eaveX-p[0])<4);assert.ok(Math.abs(profile.slopes[i].eaveY-p[1])<2);assert.equal(profile.slopes[i].eaveJunction?.method,'supported-roof-slope-terminates-at-horizontal-source-edge');}
// Secondary-volume reconstruction consumes points, not just slopes. A longer
// lower fascia line may seed base.y, but cannot replace the observed roof edge.
const fascia=raster();line(fascia,a,peak);line(fascia,peak,b);line(fascia,a,b);line(fascia,[160,402],[760,402]);const fasciaProfile=V.roofProfile(fascia,envelope);assert.equal(fasciaProfile.status,'proposed');assert.equal(fasciaProfile.base.y,401);for(const [i,slope]of fasciaProfile.slopes.entries()){assert.ok(slope.eaveJunction);assert.equal(fasciaProfile.points[i===0?0:3][1],slope.eaveY,'Secondary roof profile points retain the observed eave height.');assert.ok(Math.abs(slope.eaveY-390)<2);}
const maskOnly=raster();line(maskOnly,a,peak,[173,213,211],3);line(maskOnly,peak,b,[173,213,211],3);line(maskOnly,a,b,[173,213,211],3);const falseRoof=V.roofProfile(maskOnly,envelope);assert.ok(!falseRoof.slopes?.some(Boolean),'A pale cyan quantity mask cannot supply a roof slope.');
// A true drawing stroke remains detectable below a translucent neutral legend;
// no text or coloured mask is required to create its geometry.
const faded=raster();line(faded,a,peak,[225,225,225]);line(faded,peak,b);line(faded,a,b);const underLegend=V.roofProfile(faded,{...envelope,occlusions:[[120,180,315,230]]});assert.ok(underLegend.slopes?.[0]);assert.ok(Math.abs(underLegend.slopes[0].m+.5)<.02);
function sourceMask(im){const out=new Uint8Array(w*h);for(let i=0;i<out.length;i++)out[i]=im.data[i*4]<100?1:0;return out;}
const slopes=[{m:-.5,c:475,eaveX:170,eaveY:390},{m:.5,c:25,eaveX:750,eaveY:400}];
const clean=raster();line(clean,a,peak);line(clean,peak,b);line(clean,a,[750,390]);let junctions=V.roofEaveJunctions(sourceMask(clean),w,h,envelope,slopes);assert.equal(junctions.length,2);assert.ok(junctions.every(j=>Math.abs(j.y-390)<1));assert.equal(junctions[1].sourceStrokeEndpoint[0],750,'The former raster-group endpoint remains diagnostic provenance.');
const crossing=raster();line(crossing,[150,400],peak);line(crossing,peak,[750,400]);line(crossing,[170,380],[750,380]);assert.equal(V.roofEaveJunctions(sourceMask(crossing),w,h,envelope,slopes).length,0,'A horizontal annotation crossing a continuing slope is not an observed eave.');
const noEdge=raster();line(noEdge,a,peak);line(noEdge,peak,b);assert.equal(V.roofEaveJunctions(sourceMask(noEdge),w,h,envelope,slopes).length,0,'Sloped ink endpoints alone do not establish a horizontal roof edge.');
console.log('PASS roof eaves: observed junctions, original endpoints retained, pale masks rejected, faded genuine strokes preserved and crossing/missing-edge negatives');
