/* MIR — Reconnaissance indicative d'un profil dessiné, jamais un modèle imposé.
 * Aucune correction de mesure, de géométrie ou de catégorie de fabrication ici. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIRProfileRecognition=api;
})(typeof globalThis==='object'?globalThis:null,function(){
  'use strict';
  const numeric=value=>typeof value==='number'?value:Number(value);
  const close=(value,target,tolerance=7)=>Number.isFinite(value)&&Math.abs(Math.abs(value)-target)<=tolerance;
  function turn(bend){
    if(!bend)return NaN;
    if(Number.isFinite(bend.turnDeg))return bend.turnDeg;
    if(bend.mode==='hem')return bend.direction==='left'?180:-180;
    if(bend.mode==='signed')return numeric(bend.angle);
    if(bend.mode==='interior'){
      const angle=numeric(bend.angle);
      return Number.isFinite(angle)?(180-angle)*(bend.direction==='left'?1:-1):NaN;
    }
    return NaN;
  }
  function recognize(input){
    const profile=input?.model||input||{};
    const segments=Array.isArray(profile.segments)?profile.segments:Array.isArray(profile.spec?.segments)?profile.spec.segments:[];
    const bends=Array.isArray(profile.bends)?profile.bends:Array.isArray(profile.spec?.bends)?profile.spec.bends:[];
    const sides=segments.length,angles=bends.map(turn);
    if(sides<2)return {code:'incomplete',label:'Tracé en cours',suggestedName:'Moulure dessinée',sides,certainty:'none'};
    const right=angles.length===sides-1&&angles.every(value=>close(value,90));
    const signs=angles.map(value=>Math.sign(value));
    let code='custom',label='Profil sur mesure',certainty='low';
    if(angles.some(value=>close(value,180))){code='hem';label='Profil avec retour écrasé';certainty='medium';}
    else if(right&&sides===2){code='l';label='Profil en L';certainty='high';}
    else if(right&&sides===3&&signs[0]!==signs[1]){code='z';label='Profil en Z';certainty='high';}
    else if(right&&sides===3&&signs[0]===signs[1]){code='j-u';label='Profil en J / U';certainty='medium';}
    return {code,label,sides,certainty,suggestedName:code==='custom'?'Moulure sur mesure · '+sides+' côtés':'Moulure '+label.replace(/^Profil /,'')};
  }
  return Object.freeze({recognize,version:'1.0.0'});
});
