/* MIR panneaux : calculs de pente X/12, sans deviner des cotes chantier.
 * Vue et fabrication utilisent les mêmes coordonnées réelles (mm). */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRPanelRoof=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const finite=Number.isFinite;
 function pitchFactor(value){
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const str=String(value).trim().replace(',','.').replace(/\s/g,'');
  const match=/^([0-9]+(?:\.[0-9]+)?)(?:\/12)?$/.exec(str);
  if(!match)return NaN;
  const rise=Number(match[1]);
  return finite(rise)&&rise>=0&&rise<=36?rise/12:NaN;
 }
 function riseForRun(run,value){
  const factor=pitchFactor(value);
  return finite(run)&&run>0&&finite(factor)?run*factor:null;
 }
 function slopePanel(width,height,pitch,direction='right'){
  const rise=riseForRun(width,pitch);
  if(!(finite(width)&&width>0&&finite(height)&&height>0&&rise!==null&&rise>0&&rise<height))return null;
  return direction==='right'
   ?[[0,0],[width,0],[width,height],[0,height-rise]]
   :direction==='left'
   ?[[0,0],[width,0],[width,height-rise],[0,height]]
   :null;
 }
 function visibleFace(mesh){
  if(!mesh?.valid||!Array.isArray(mesh.front)||mesh.front.length<3)return null;
  const xs=mesh.front.map(p=>p[0]),ys=mesh.front.map(p=>p[1]);
  const width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys);
  if(!(width>0&&height>0))return null;
  return {widthMM:width,heightMM:height,front:mesh.front.map(p=>p.slice())};
 }
 return Object.freeze({pitchFactor,riseForRun,slopePanel,visibleFace,version:'1.0.0'});
});
