/* MIR — mesures standards pour les modèles locaux (pas une permission serveur). */
(function(root,factory){
  const M=typeof module==='object'&&module.exports?require('./production-model.js'):root?.MIRProduction;
  const api=factory(M);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIRModelDefaults=api;
})(typeof window==='object'?window:null,function(M){
  'use strict';
  const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key);
  const nonPositive=new Set(['offset']);
  const zeroAllowed=new Set(['offset','topOffset','lip','apexX','apexOffset']);
  function validate(template,source){
    if(!M?.parseMeasurement)throw new Error('Moteur de mesures MIR indisponible.');
    const fields=template?.fields;
    if(!Array.isArray(fields))return {ok:false,errors:['Modèle de fabrication invalide.'],data:null};
    const supplied=source?.values&&typeof source.values==='object'?source.values:source||{};
    const errors=[],values={};
    if(source?.unit && source.unit!=='in')errors.push('Les mesures standards doivent être enregistrées en pouces.');
    for(const field of fields){
      const key=field.key,raw=own(supplied,key)?supplied[key]:null;
      const value=typeof raw==='object'&&raw!==null?raw.value:raw;
      const text=String(value??'').trim(),locked=raw?.locked===true;
      if(text){
        const parsed=M.parseMeasurement(text,'in');
        const inRange=nonPositive.has(key)?parsed.ok:zeroAllowed.has(key)?parsed.ok&&parsed.value>=0:parsed.ok&&parsed.value>0;
        if(!inRange)errors.push('Cote standard invalide pour '+field.label+' : '+text+'.');
      }else if(locked)errors.push('La cote '+field.label+' doit avoir une valeur avant de la verrouiller.');
      values[key]={value:text,locked};
    }
    return {ok:errors.length===0,errors,data:errors.length?null:{unit:'in',templateVersion:template.version,values}};
  }
  function prepare(template,source){
    const checked=validate(template,source);
    if(!checked.ok)return {...checked,measurements:{},length:'',locks:{}};
    const measurements={},locks={};let length='';
    for(const [key,entry] of Object.entries(checked.data.values)){
      if(!entry.value)continue;
      if(key==='length')length=entry.value;else measurements[key]=entry.value;
      if(entry.locked)locks[key]=true;
    }
    return {...checked,measurements,length,locks};
  }
  return Object.freeze({validate,prepare});
});
