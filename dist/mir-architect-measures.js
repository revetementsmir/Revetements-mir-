/* MIR — mesures par panneau selon les plans, sources canoniques en pouces.
 * Compatible avec le moteur existant : largeur par colonne, hauteur par rangée.
 * Aucune mutation avant la confirmation explicite de l'utilisateur. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRArchitectMeasures=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const EPS=1e-7,finite=Number.isFinite;
 function parseDimension(value,unit,model){
  if(!['in','mm'].includes(unit)||!model?.parseMeasurement)return null;
  const parsed=model.parseMeasurement(value,unit);
  return parsed.ok&&finite(parsed.mm)&&parsed.mm>0?parsed.mm/25.4:null;
 }
 function display(valueIn,unit,model){
  if(!finite(valueIn))return '';
  if(unit==='mm')return String(Math.round(valueIn*25.4*1000)/1000);
  if(!model?.formatMeasurement)return String(valueIn);
  return String(model.formatMeasurement(valueIn*25.4,'in')).replace(/\s*po$/,'');
 }
 function propose(layout,piece,{width,height,unit='in',lockWidth=true,lockHeight=true},engine,model){
  if(!layout?.ok||!piece||!engine?.setPanelSize||!model)return {ok:false,error:'Le plan doit être calculé avant la cotation.'};
  const w=parseDimension(width,unit,model),h=parseDimension(height,unit,model);
  if(w===null||h===null)return {ok:false,error:'Entre les deux cotes du plan en '+(unit==='mm'?'millimètres':'pouces ou fractions')+'.'};
  let result=engine.setPanelSize(layout.config,'x',piece.col,w,{lock:lockWidth});
  if(!result.ok)return {ok:false,error:(result.errors||[]).map(x=>x.message).join(' ')};
  result=engine.setPanelSize(result.config,'y',piece.row,h,{lock:lockHeight});
  if(!result.ok)return {ok:false,error:(result.errors||[]).map(x=>x.message).join(' ')};
  const changed=result.pieces.filter(p=>{
    const prior=layout.pieces.find(old=>old.id===p.id);
    return prior&&(Math.abs(prior.widthIn-p.widthIn)>EPS||Math.abs(prior.heightIn-p.heightIn)>EPS);
  }).map(p=>p.id);
  return {ok:true,config:result.config,layout:result,changed,others:changed.filter(id=>id!==piece.id),requested:{widthIn:w,heightIn:h},column:piece.col+1,row:piece.row+1};
 }
 return Object.freeze({version:'1.0.0',parseDimension,display,propose});
});
