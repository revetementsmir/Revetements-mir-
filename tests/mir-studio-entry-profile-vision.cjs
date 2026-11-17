'use strict';
const assert=require('node:assert/strict'),V=require('../dist/plan-reconstruction-vision.js');

// Synthetic architectural strokes only: a hatched canopy in front of a busy
// facade, with translucent markup. No client pixels or coordinates are used.
function drawing({scale=1,slopes=true,ridge=true,corners=true,base=true,annotationOnly=false,markup=true}={}){
 const width=Math.round(900*scale),height=Math.round(700*scale),image={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};
 const pixel=(x,y,color,alpha=1)=>{x=Math.round(x*scale);y=Math.round(y*scale);if(x<0||x>=width||y<0||y>=height)return;const i=(y*width+x)*4;for(let k=0;k<3;k++)image.data[i+k]=Math.round(image.data[i+k]*(1-alpha)+color[k]*alpha);};
 const line=(x0,y0,x1,y1,color=[0,0,0],thickness=1,alpha=1)=>{const count=Math.ceil(Math.hypot(x1-x0,y1-y0)*scale),painted=new Set();for(let i=0;i<=count;i++){const x=x0+(x1-x0)*i/count,y=y0+(y1-y0)*i/count;for(let dy=-Math.floor(thickness/2);dy<=Math.floor(thickness/2);dy++)for(let dx=-Math.floor(thickness/2);dx<=Math.floor(thickness/2);dx++){const key=Math.round((y+dy)*scale)*width+Math.round((x+dx)*scale);if(painted.has(key))continue;painted.add(key);pixel(x+dx,y+dy,color,alpha);}}};
 const rectangle=(x,y,w,h)=>{line(x,y,x+w,y);line(x+w,y,x+w,y+h);line(x+w,y+h,x,y+h);line(x,y+h,x,y);};
 for(let y=280;y<445;y+=13)line(150,y,710,y,[135,135,135]);
 rectangle(348,282,164,54);rectangle(354,288,70,42);rectangle(436,288,70,42);
 for(let y=345;y<=425;y++){const l=370-(y-345)*2,r=490+(y-345)*2;for(let x=l;x<=r;x++)pixel(x,y,[255,255,255]);}
 for(let y=351;y<425;y+=9){const l=370-(y-345)*2+9,r=490+(y-345)*2-9;line(l,y,(l+r)/2-14,y,[145,145,145]);line((l+r)/2+11,y,r,y,[145,145,145]);}
 if(slopes&&!annotationOnly){line(210,425,370,345);line(490,345,650,425);}
 if(ridge&&!annotationOnly)line(370,345,490,345);
 if(corners&&!annotationOnly){line(210,425,210,440);line(650,425,650,440);}
 if(base&&!annotationOnly)line(210,440,650,440);
 if(markup||annotationOnly){const color=[24,133,133];line(210,425,370,345,color,5,.34);line(370,345,490,345,color,5,.34);line(490,345,650,425,color,5,.34);}
 const envelope={status:'proposed',box:[270,444,320,225].map(n=>n*scale),sourceViewId:'synthetic-entry',sourceFrame:{rasterSize:[width,height]},occlusions:[]};
 return {image,envelope};
}
const detect=sample=>V.roofProfile(sample.image,sample.envelope,[],{entry:true});
for(const scale of [1,.75,1.2]){
 const sample=drawing({scale}),before=Buffer.from(sample.image.data),result=detect(sample);
 assert.equal(result.status,'proposed','The real source silhouette survives hatching, facade strokes and translucent markup.');
 assert.ok(Math.abs(result.slopes[0].m+.5)<.045&&Math.abs(result.slopes[1].m-.5)<.045,'Hatch aliases cannot replace the observed slopes.');
 assert.ok(Math.abs(result.points[1][0]-370*scale)<4&&Math.abs(result.points[2][0]-490*scale)<4&&Math.abs(result.points[1][1]-345*scale)<3,'Both ridge endpoints come from the roof, not the window above.');
 assert.ok(Math.abs(result.slopes[0].eaveX-210*scale)<4&&Math.abs(result.slopes[1].eaveX-650*scale)<4,'Both eaves retain their observed corner extents.');
 assert.equal(Buffer.compare(before,Buffer.from(sample.image.data)),0,'The detector never rewrites source pixels.');
}
for(const options of [{slopes:false},{ridge:false},{corners:false},{base:false},{annotationOnly:true}])assert.notEqual(detect(drawing(options)).status,'proposed','Missing source boundaries or markup alone cannot close a roof: '+JSON.stringify(options));
const masked=drawing();masked.envelope.occlusions=[[350,325,155,50]];assert.notEqual(detect(masked).status,'proposed','A masked ridge cannot supply the entrance profile.');
const {blank,line,rectangle}=require('./helpers/mir-studio-entry-fixture.cjs'),bandImage=blank(),bandOptions={left:252,right:448,nearY:420,height:220};
const pointed=blank();line(pointed,210,425,430,315);line(pointed,430,315,650,425);line(pointed,210,425,210,440);line(pointed,650,425,650,440);line(pointed,210,440,650,440);
const pointedProfile=V.roofProfile(pointed,{status:'proposed',box:[270,444,320,225]},[],{entry:true});assert.equal(pointedProfile.status,'proposed','A real pointed entrance apex does not require a fabricated horizontal ridge.');assert.ok(Math.abs(pointedProfile.points[1][0]-430)<2&&Math.abs(pointedProfile.points[1][1]-315)<2);assert.deepEqual(pointedProfile.points[1],pointedProfile.points[2]);
rectangle(bandImage,240,420,220,16);const bands=V.entryBands(bandImage,bandOptions);
assert.equal(bands.length,1,'A visible beam may end just outside the separately observed post edges.');assert.deepEqual(bands[0].box,[240,420,220,16],'The endpoints still come from the closed source face.');
const openBand=blank();line(openBand,240,420,460,420);line(openBand,240,436,460,436);line(openBand,240,420,240,436);assert.equal(V.entryBands(openBand,bandOptions).length,0,'Expanding the search cannot invent a missing end.');
const distantBand=blank();rectangle(distantBand,210,420,280,16);assert.equal(V.entryBands(distantBand,bandOptions).length,0,'An unrelated wider facade band stays outside the bounded endpoint search.');
assert.equal(V.entryBands(bandImage,{...bandOptions,occlusions:[[455,420,10,20]]}).length,0,'A masked endpoint cannot close the observed beam face.');
for(const direction of ['right','left']){
 const side=blank(),xs=direction==='right'?[40,50]:[500,510],primary={status:'proposed',box:[100,100,350,600],sourceViewId:'synthetic-side',sourceFrame:{rasterSize:[1000,800]}};
 for(const x of xs){line(side,x,410,x,690);for(let y=720;y<760;y+=12)line(side,x,y,x,y+5);}
 const post=V.canopySide(side,primary,400,{direction});assert.equal(post.status,'proposed');assert.equal(post.box[1]+post.box[3],690,'Disconnected dimension extensions below the landing cannot lengthen the post.');
}
const legendImage=blank();line(legendImage,100,500,700,500);line(legendImage,100,500,100,799);line(legendImage,700,500,700,799);
for(const x of [298,498])for(let dx=0;dx<5;dx++)for(let y=497;y<=503;y++)legendImage.data.set([0,0,210,255],(y*legendImage.width+x+dx)*4);
const legendTitle={text:'Legend',box:[350,515,440,539],source:'pdf-text',confidence:100};
const legendMasks=V.legendBoxes(legendImage,[legendTitle]);assert.equal(legendMasks.length,1,'Narrow coloured crossings do not erase an otherwise verified cropped legend frame.');
assert.ok(legendMasks[0][0]<=101&&legendMasks[0][1]<=501&&legendMasks[0][0]+legendMasks[0][2]>=699&&legendMasks[0][1]+legendMasks[0][3]===800);
assert.equal(V.legendBoxes(legendImage,[{...legendTitle,text:'Window'}]).length,0,'The border repair never replaces the required legend heading.');
console.log('PASS entry profile vision: source silhouette beside hatching/windows, translucent markup, independent ridge corners and eaves, scale variants, immutable rasters, bounded beam endpoints, missing-boundary and annotation-only refusals.');
