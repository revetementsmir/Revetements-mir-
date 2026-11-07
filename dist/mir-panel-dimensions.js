/* MIR — conversion de cotes chantier et verrouillage atomique des pièces.
 * Le moteur stocke exclusivement des pouces; la sélection mm est une vue.
 * Sur une grille à joints alignés, une pièce partage largeur et hauteur
 * avec sa colonne et sa rangée — jamais de mutation silencieuse. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRPanelDimensions=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const finite=Number.isFinite;
 const MILLIMETRES=25.4;
 const clean=n=>String(Math.round(n*1e8)/1e8);
 function display(inches,unit='in'){
  if(!finite(inches))return '';
  return unit==='mm'?clean(inches*MILLIMETRES):clean(inches);
 }
 function inputInches(raw,unit,model){
  if(!['in','mm'].includes(unit)||!model?.parseMeasurement)return null;
  const val=model.parseMeasurement(raw,unit);
  return val?.ok&&finite(val.mm)&&val.mm>0?val.mm/MILLIMETRES:null;
 }
 function label(inches,unit,formatIn){
  if(!finite(inches))return 'À préciser';
  return unit==='mm'?display(inches,'mm')+' mm':formatIn(inches);
 }
 function both(inches,formatIn){
  return formatIn(inches)+' · '+display(inches,'mm')+' mm';
 }
 function setPiece(layout,piece,widthIn,heightIn,engine,{lock=true}={}){
  if(!layout?.ok||!piece||!engine?.setPanelSize)return{ok:false,errors:[{message:'Sélectionnez un panneau valide.'}]};
  if(!finite(widthIn)||widthIn<=0||!finite(heightIn)||heightIn<=0)
   return{ok:false,errors:[{message:'Les deux cotes doivent être positives en pouces ou millimètres.'}]};
  const width=engine.setPanelSize(layout.config,'x',piece.col,widthIn,{lock});
  if(!width?.ok)return{ok:false,errors:width.errors||[],step:'width'};
  const height=engine.setPanelSize(width.config,'y',piece.row,heightIn,{lock});
  if(!height?.ok)return{ok:false,errors:height.errors||[],step:'height'};
  return {...height, warnings:[...(width.warnings||[]),...(height.warnings||[])],
   affected:{column:piece.col,row:piece.row,lock}};
 }
 return Object.freeze({version:'1.0.0',display,inputInches,label,both,setPiece});
});