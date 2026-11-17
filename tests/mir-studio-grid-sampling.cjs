'use strict';
const assert=require('node:assert/strict'),Grid=require('../dist/plan-grid-registration.js');
function fixture({color=false,open=false}={}){
 const width=1300,height=950,image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)},radius=9.4;
 for(const [x,y]of [[220,70],[410,70],[600,70],[790,70],[135,250],[135,700]]){
  const cx=x+.5,cy=y+.5;
  for(let y=Math.floor(cy-radius-2);y<=Math.ceil(cy+radius+2);y++)for(let x=Math.floor(cx-radius-2);x<=Math.ceil(cx+radius+2);x++){
   if(open&&x>cx+2)continue;
   const intensity=Math.round(255*Math.min(1,Math.max(0,Math.abs(Math.hypot(x-cx,y-cy)-radius)-.15)));
   image.data.set(color?[intensity,255,255,255]:[intensity,intensity,intensity,255],(y*width+x)*4);
  }
 }
 return image;
}
const proposed=Grid.bubbleRegions(fixture());assert.equal(proposed.status,'proposed','subpixel thin circles between the coarse search phases must reach precise validation');assert.equal(proposed.bubbles.filter(b=>b.kind==='number').length,4);assert.equal(proposed.bubbles.filter(b=>b.kind==='letter').length,2);assert.ok(proposed.bubbles.every(b=>b.ringSupport>=.9),'coarse-search tolerance cannot bypass strict final circle support');assert.equal(Grid.bubbleRegions(fixture({color:true})).status,'unresolved','coloured masks are not grid axes');assert.equal(Grid.bubbleRegions(fixture({open:true})).status,'unresolved','incomplete circles cannot pass precise validation');console.log('PASS grid circle sampling: subpixel thin raster rings, strict final support, coloured and incomplete ring refusals');
