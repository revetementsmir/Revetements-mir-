/* MIR — choix de couleur des modèles du Magasin. Aucun color-match intermarques implicite. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRStoreColorPolicy=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const str=value=>String(value==null?'':value).trim();
 function create({channelStore=false,mode='employee',colorSystem='manufacturer',material=null,color=null,metalType=''}={}){
  if(!channelStore||mode!=='fixed')return {ok:true,policy:{mode:'employee'}};
  if(colorSystem!=='manufacturer')return {ok:false,error:'Pour conserver une couleur au Magasin, choisis une teinte exacte dans un nuancier fabricant.'};
  const code=str(color?.code||color?.name);
  if(!str(material?.id)||!str(material?.brand)||!str(color?.id)||!code||!str(metalType))
   return {ok:false,error:'Choisis d’abord le métal, le fabricant et une couleur précise avant de la conserver pour le Magasin.'};
  return {ok:true,policy:{
   mode:'fixed',
   materialId:str(material.id),
   manufacturer:str(material.brand),
   metalType:str(metalType),
   colorId:str(color.id),
   colorCode:code,
   colorName:str(color.name||code)
  }};
 }
 function resolve(policy,materials){
  if(!policy||policy.mode!=='fixed')return {ok:true,locked:false};
  if(!Array.isArray(materials))return {ok:false,error:'Nuancier fabricant indisponible; couleur imposée non modifiée.'};
  const material=materials.find(item=>str(item.id)===str(policy.materialId));
  if(!material||str(material.brand)!==str(policy.manufacturer))
   return {ok:false,error:'Le fabricant de la couleur conservée est introuvable. Demande à l’admin de vérifier le modèle.'};
  const color=(material.colors||[]).find(item=>str(item.id)===str(policy.colorId));
  if(!color||str(color.code||color.name)!==str(policy.colorCode))
   return {ok:false,error:'La référence de couleur a changé ou est introuvable. Aucune correspondance automatique n’a été appliquée.'};
  return {ok:true,locked:true,materialId:str(material.id),manufacturer:str(material.brand),
   metalType:str(policy.metalType),colorId:str(color.id),colorName:str(color.name||policy.colorName),
   colorCode:str(policy.colorCode)};
 }
 return Object.freeze({version:'1.0.0',create,resolve});
});
