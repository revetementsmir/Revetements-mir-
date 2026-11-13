/* MIR — longueurs de vente; préserver sans conversion les dossiers historiques. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.MIRBendingLengths=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const STANDARD_IN=120,SOFFIT_J_IN=144,EPS=.002;
 const id=value=>typeof value==='string'?value:String(value?.mirProfileId||value?.stockProfileType||value?.profile||'');
 function requiredLengthIn(profile){return id(profile)==='j_soffite'?SOFFIT_J_IN:STANDARD_IN;}
 function label(profile){return requiredLengthIn(profile)===SOFFIT_J_IN?'J à soffite : vendu en longueur de 144 po (12 pi).':'Moulures : vendues en longueur de 120 po (10 pi).';}
 function check({lengthIn,profileId,previousLengthIn=null}={}){
  const expectedIn=requiredLengthIn(profileId);
  if(Number.isFinite(lengthIn)&&Math.abs(lengthIn-expectedIn)<=EPS)return {ok:true,legacy:false,expectedIn,message:label(profileId)};
  if(Number.isFinite(lengthIn)&&lengthIn>0&&Number.isFinite(previousLengthIn)&&previousLengthIn>0&&Math.abs(lengthIn-previousLengthIn)<=EPS)
   return {ok:true,legacy:true,expectedIn,message:'Longueur historique conservée. Toute nouvelle pièce doit suivre la longueur de vente MIR.'};
  return {ok:false,legacy:false,expectedIn,message:label(profileId)+' Les autres longueurs ne peuvent pas être ajoutées à un nouveau bon.'};
 }
 return Object.freeze({STANDARD_IN,SOFFIT_J_IN,requiredLengthIn,label,check});
});
