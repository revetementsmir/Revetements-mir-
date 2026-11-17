'use strict';
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js');
function sideSourceFixture({wall=true,mask=true,shortStroke=false,brokenSlope=false,continued=false,wallShift=0}={}){
 const width=420,height=320,image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)},wallX=310.5,sourceEaveX=170,eaveY=190,crestY=150;
 const pixel=(x,y,c)=>image.data.set([...c,255],(Math.round(y)*width+Math.round(x))*4);
 const line=(x1,y1,x2,y2,c=[220,220,220])=>{const n=Math.ceil(Math.hypot(x2-x1,y2-y1)*2);for(let i=0;i<=n;i++)pixel(x1+(x2-x1)*i/n,y1+(y2-y1)*i/n,c);};
 line(sourceEaveX,eaveY,wallX,crestY);line(sourceEaveX,eaveY,sourceEaveX,eaveY+5);line(sourceEaveX,eaveY+5,wallX,eaveY+5);
 if(continued)line(sourceEaveX-20,eaveY+40*20/(wallX-sourceEaveX),sourceEaveX,eaveY);
 if(brokenSlope)for(let y=150;y<190;y++)for(let x=230;x<260;x++)pixel(x,y,[255,255,255]);
 // This invented highlight is already flattened into the drawing pixels.
 // The wall line has the same channel attenuation against both yellow
 // flanks; a coloured pen on white paper has no such evidence.
 if(mask)for(let y=100;y<240;y++)for(let x=308;x<324;x++)pixel(x,y,[250,246,196]);
 if(wall)line(311,shortStroke?149:100,311,shortStroke?151:239,[170,166,116]);
 const options={wallX:wallX+wallShift,sourceEaveX,eaveY,crestY,direction:'right',tolerance:3,horizontalTolerance:3},profile=V.entrySideRoof(image,options);
 return {image,options,profile};
}
module.exports={sideSourceFixture};
if(require.main===module){
 const f=sideSourceFixture(),p=f.profile;assert.equal(p.status,'proposed');
 assert.ok(p.wallContactEvidence.recoveredPixelCount>0);assert.equal(p.wallContactEvidence.sourceX,311);assert.equal(p.wallContactEvidence.offsetPixels,.5);
 assert.ok(p.sourceSlopeEvidence.support>=.9);assert.deepEqual(V.entrySideRoofIssues(JSON.parse(JSON.stringify(p)),{sourceSize:[f.image.width,f.image.height]}),[]);
 const before=Buffer.from(f.image.data);V.entrySideRoof(f.image,f.options);assert.equal(Buffer.compare(before,Buffer.from(f.image.data)),0);
 for(const options of [{wall:false},{mask:false},{shortStroke:true},{brokenSlope:true},{continued:true},{wallShift:20}])assert.equal(sideSourceFixture(options).profile.status,'unresolved','A fill, coloured line, short mark, missing slope or different wall cannot establish the attachment: '+JSON.stringify(options));
 for(const change of [p=>delete p.wallContactEvidence,p=>delete p.sourceSlopeEvidence,p=>p.wallContactEvidence.sourcePixels.pixels.pop(),p=>p.wallContactEvidence.offsetPixels++,p=>p.wallContactEvidence.recoveredPixelCount=0,p=>p.wallContactEvidence.search.wallX++,p=>p.sourceSlopeEvidence.strokeEvidence.sourcePixels.pixels.pop(),p=>p.points[1][1]++]){
  const q=structuredClone(p);change(q);assert.notDeepEqual(V.entrySideRoofIssues(q,{sourceSize:[f.image.width,f.image.height]}),[],'All contact, flank and slope pixels remain necessary after serialization.');
 }
 console.log('PASS entry side source: faint source slope, continuous wall stroke under flattened colour, actual reference offset, immutable/replayed pixels, and refusal of fills, coloured marks and absent attachments.');
}
