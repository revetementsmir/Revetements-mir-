'use strict';
// Deliberately synthetic grid next to dense roof hatching, no client raster.
const assert=require('node:assert/strict'),G=require('../dist/plan-grid-registration.js');
function image({hatch=false,rings=true,pale=false}={}){const width=800,height=600,data=new Uint8ClampedArray(width*height*4).fill(255),dot=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=width||y>=height)return;const shade=pale?175:20;data.set([shade,shade,shade,255],(y*width+x)*4);};
 if(rings)for(const [x,y] of [...[170,340,510,680].map(x=>[x,65]),[80,235],[80,485]])for(let t=0;t<360;t++)for(const delta of [-1,0,1])dot(x+Math.cos(t*Math.PI/180)*(15+delta),y+Math.sin(t*Math.PI/180)*(15+delta));
 if(hatch)for(let y=150;y<550;y++)for(let x=115;x<160;x++)if((x+y)%3<2)dot(x,y);
 return {width,height,data};}
for(const pale of [false,true]){const plain=G.bubbleRegions(image({pale})),hatched=G.bubbleRegions(image({hatch:true,pale}));assert.equal(plain.status,'proposed');assert.equal(hatched.status,'proposed');const letters=hatched.bubbles.filter(b=>b.kind==='letter');assert.equal(letters.length,2,'dense hatching must not crowd out the two physical letter rings');assert.ok(letters.every(b=>Math.abs(b.center[0]-80)<=2));assert.ok(hatched.bubbles.every(b=>b.innerInkFraction<=.35&&b.outerInkFraction<=.35));}
const noRings=G.bubbleRegions(image({hatch:true,rings:false}));assert.equal(noRings.status,'unresolved');assert.equal(noRings.bubbles.length,0,'a dense hatch is not a collection of circles');
console.log('PASS grid ring isolation: true faint/dark rings retained beside dense hatching, source annulus evidence, hatch-only refusal');
