'use strict';
const assert=require('node:assert/strict');
const S=require('../dist/plan-stair-vision.js');
function sheet(w=740,h=520){
 const pixels=new Uint8ClampedArray(w*h*4);
 for(let p=0;p<pixels.length;p+=4){pixels[p]=pixels[p+1]=pixels[p+2]=255;pixels[p+3]=255;}
 return {width:w,height:h,data:pixels};
}
function line(img,x0,y0,x1,y1){
 const dx=Math.sign(x1-x0),dy=Math.sign(y1-y0);
 for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++){
  if(dx===0&&x!==x0||dy===0&&y!==y0)continue;
  const p=(y*img.width+x)*4;img.data[p]=img.data[p+1]=img.data[p+2]=34;
 }
}
function stairs(img,{left=205,top=125,width=135,pitch=28,count=6,orientation='horizontal',rails=true}={}){
 for(let i=0;i<count;i++){
  if(orientation==='horizontal')line(img,left,top+i*pitch,left+width,top+i*pitch);
  else line(img,left+i*pitch,top,left+i*pitch,top+width);
 }
 if(rails){
  if(orientation==='horizontal'){line(img,left,top,left,top+(count-1)*pitch);line(img,left+width,top,left+width,top+(count-1)*pitch);}
  else{line(img,left,top,left+(count-1)*pitch,top);line(img,left,top+width,left+(count-1)*pitch,top+width);}
 }
}
let cases=0;function test(name,f){f();cases++;console.log('PASS '+name);}
test('Escalier horizontal avec cotes en pixels → pieds',()=>{
 const im=sheet();stairs(im);
 const result=S.detect({image:im,crop:[0,0,740,520],feetPerPixel:.028,kind:'floor'});
 assert.ok(result.length>=1,'Aucun escalier détecté');
 const s=result[0];assert.equal(s.type,'stairs');
 assert.equal(s.axis,'horizontal');assert.equal(s.count,6);
 assert.ok(Math.abs(s.widthFt-3.78)<.15,JSON.stringify(s));
 assert.ok(Math.abs(s.treadFt-.784)<.1);
 assert.ok(s.confidence>.70,JSON.stringify(s));
 assert.equal(s.riserFt,null);assert.equal(s.positionVerified,false);
});
test('Dimensions changent avec la vraie échelle du plan',()=>{
 const im=sheet();stairs(im);
 const a=S.detect({image:im,crop:[0,0,740,520],feetPerPixel:.023})[0];
 const b=S.detect({image:im,crop:[0,0,740,520],feetPerPixel:.028})[0];
 assert.ok(a&&b&&b.widthFt>a.widthFt*1.15);
});
test('Escalier vertical et cadrage exprimé en pixels absolus',()=>{
 const im=sheet();stairs(im,{orientation:'vertical',left:225,top:185,width:120,pitch:26,count:6});
 const s=S.detect({image:im,crop:[150,140,390,350],feetPerPixel:.03,kind:'floor'})[0];
 assert.ok(s, 'Aucun escalier vertical');
 assert.equal(s.axis,'vertical');assert.equal(s.count,6);
 assert.ok(s.box[0]>=150&&s.box[1]>=140);assert.ok(s.cropBox[0]<s.box[0]);
});
test('Pas de cotes = pas de dimension inventée',()=>{
 const im=sheet();stairs(im);
 assert.deepEqual(S.detect({image:im,crop:[0,0,740,520],feetPerPixel:null}),[]);
 assert.deepEqual(S.detect({image:im,crop:[0,0,740,520],feetPerPixel:0}),[]);
});
test('Plans sans motif répété ne créent pas de marche',()=>{
 const im=sheet();line(im,110,140,245,140);line(im,110,260,245,260);
 assert.equal(S.detect({image:im,crop:[0,0,740,520],feetPerPixel:.028}).length,0);
});
test('Traits de grandes façades ne deviennent pas des escaliers',()=>{
 const im=sheet();for(let y=140;y<280;y+=28)line(im,80,y,710,y);
 assert.equal(S.detect({image:im,crop:[0,0,740,520],feetPerPixel:.028}).length,0);
});
test('Une mention escalier améliore la confiance sans inventer la hauteur',()=>{
 const im=sheet();stairs(im,{rails:false});
 const unlabelled=S.detect({image:im,crop:[0,0,740,520],feetPerPixel:.028})[0];
 const labelled=S.detect({image:im,crop:[0,0,740,520],feetPerPixel:.028,textHints:[{type:'stairs',box:[250,115,330,140]}]})[0];
 assert.ok(unlabelled&&labelled);
 assert.ok(labelled.confidence>=unlabelled.confidence);
 assert.equal(labelled.riserFt,null);
});
console.log('MIR Stair Vision '+cases+'/'+cases+' cas réussis');