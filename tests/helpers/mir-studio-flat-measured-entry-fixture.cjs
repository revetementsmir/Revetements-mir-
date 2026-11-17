'use strict';
const {flatEntryFixture}=require('./mir-studio-flat-entry-fixture.cjs');
const {line}=require('./mir-studio-entry-fixture.cjs');
// Synthetic split wall/roof projection. The side strokes stop halfway to the
// attachment; a real dimension candidate supplies the complete depth.
function measuredFlatEntryFixture({chain=false,dimension=true}={}){
 const s=flatEntryFixture(),image=s.images[s.plan.id];
 for(const x of [320,540])for(let y=681;y<700;y++)image.data.set([255,255,255,255],(y*image.width+x)*4);
 const source=(from,to,value,text)=>({id:'synthetic-depth-'+from+'-'+to,sourceViewId:s.plan.id,sourceFrame:structuredClone(s.plan.frame),kind:'written',status:'proposed',axis:'y',value,referenceFt:value/.3048,scale:.02,anchors:[[400,from],[400,to]],label:text,text,textBox:[382,from+4,396,to-4],source:'pdf-text',confidence:100,corrected:false});
 s.proposal.contourDimensions=dimension?(chain?[source(680,705,.5,'500 mm'),source(705,720,.3,'300 mm')]:[source(680,720,.8,'800 mm')]):[];
 for(const d of s.proposal.contourDimensions){s.plan.payload.drawingReadings.verticalRows||=[];s.plan.payload.drawingReadings.verticalRows.push({text:d.label,box:structuredClone(d.textBox),source:'pdf-text',confidence:100});line(image,400,d.anchors[0][1],400,d.anchors[1][1]);for(const p of d.anchors)line(image,p[0]-3,p[1]-3,p[0]+3,p[1]+3);}
 return s;
}
module.exports={measuredFlatEntryFixture};
