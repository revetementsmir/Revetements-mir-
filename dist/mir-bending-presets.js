/* MIR — profils métiers dans le configurateur existant; les commandes gardent leur snapshot. */
(function(root,factory){
  const X=typeof module==='object'&&module.exports?require('./atelier-essai/mir-calepinage-extension.js'):root?.MIRCalepinageExtension;
  const M=typeof module==='object'&&module.exports?require('./production-model.js'):root?.MIRProduction;
  const api=factory(X,M);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIRBendingPresets=api;
})(typeof window==='object'?window:null,function(X,M){
  'use strict';
  if(!X?.PROFILE_TEMPLATES||!M?.parseMeasurement)throw new Error('Les moteurs de pliages MIR sont requis.');
  /* Les dix modèles nominaux suivent exactement MIR-PROMPT-2, sections
     14.1 à 14.10. Les profils historiques restent accessibles, mais ne sont
     jamais comptés dans cette banque canonique. */
  const VARIANTS=Object.freeze([
    {id:'fascia',source:'fascia',version:2},
    {id:'ailes_fenetre',source:'ailes_fenetre',version:1},
    {id:'eloignement_eaux',source:'eloignement_eaux',version:2},
    {id:'goutte_eau_8',source:'goutte_eau_8',version:2,developedTotalIn:8},
    {id:'sill_trim',source:'sill_trim',version:1},
    {id:'beam',source:'beam',version:2,optionalBeamHems:true},
    {id:'colonne',source:'colonne',version:2},
    {id:'l_transition',source:'l_transition',version:1},
    {id:'capage_climatiseur',source:'capage_climatiseur',version:1},
    {id:'ventilation_mur_fenetre',source:'ventilation_mur_fenetre',version:1}
  ]);
  const LEGACY_VARIANTS=Object.freeze([
    {id:'l_replie',source:'l_replie'},
    {id:'beam_replis',source:'beam',name:'Beam avec replis',beamHems:true,parentId:'beam'},
    {id:'solin_brique',source:'solin_brique'},
    {id:'solin_brique_goutte',source:'solin_brique',name:'Solin brique avec goutte',drip:true,parentId:'solin_brique'},
    {id:'coin_arch_90',source:'coin_arch_90'},
    {id:'coin_arch_retours',source:'coin_arch_retours'},
    {id:'coin_arch_j',source:'coin_arch_j'}
  ]);
  const ALL_VARIANTS=Object.freeze([...VARIANTS,...LEGACY_VARIANTS]);
  const BY_ID=Object.fromEntries(ALL_VARIANTS.map(v=>[v.id,v]));
  function topology(id){
    const variant=BY_ID[id];if(!variant)return null;
    const source=X.PROFILE_TEMPLATES[variant.source];
    let elements=source.segments.filter(s=>!s.optional||variant.drip);
    let startAngle=source.startHeadingDeg;
    if(variant.beamHems){
      elements=[{id:'leftHem',fieldId:'leftHem',turnDeg:0},
        {...elements[0],turnDeg:180},...elements.slice(1),
        {id:'rightHem',fieldId:'rightHem',turnDeg:-180}];
      startAngle=180;
    }
    return {variant,source,elements,startAngle};
  }
  function create(id){
    const d=topology(id);if(!d)throw new Error('Profil MIR inconnu.');
    const fields=Object.fromEntries(d.source.fields.map(f=>[f.id,f]));
    const segments=d.elements.map((s,i)=>({
      label:String.fromCharCode(65+i),
      name:fields[s.fieldId]?.label||s.id,
      mirFieldId:s.fieldId,
      length:fields[s.fieldId]?.defaultValue??''
    }));
    const bends=d.elements.slice(1).map(s=>Math.abs(s.turnDeg)===180
      ?{mode:'hem',angle:180,direction:s.turnDeg>0?'left':'right'}
      :{mode:'signed',angle:s.turnDeg});
    return {name:d.variant.name||d.source.name,template:'custom',mirProfileId:id,
      mirTemplateVersion:d.variant.version||d.source.version||1,
      mirCanonicalPhase10:VARIANTS.includes(d.variant),
      mirLockedFields:d.source.fields.filter(field=>field.locked).map(field=>field.id),
      ...(d.variant.developedTotalIn?{mirDevelopedTotalIn:d.variant.developedTotalIn}:{}),
      startAngle:d.startAngle,segments,bends};
  }
  function catalog(){return Object.fromEntries(ALL_VARIANTS.map(v=>[v.id,create(v.id)]));}
  function canonicalCatalog(){return Object.fromEntries(VARIANTS.map(v=>[v.id,create(v.id)]));}
  function icon(id){
    const d=topology(id);if(!d)return null;
    const fields=Object.fromEntries(d.source.fields.map(f=>[f.id,f]));
    let x=0,y=0,heading=d.startAngle,pts=[[0,0]];
    for(let i=0;i<d.elements.length;i++){
      const s=d.elements[i],raw=fields[s.fieldId]?.defaultValue;
      if(i)heading+=s.turnDeg;
      const len=typeof raw==='number'&&raw>0?Math.min(raw,9):2;
      x+=len*Math.cos(heading*Math.PI/180);
      y+=len*Math.sin(heading*Math.PI/180);
      pts.push([x,y]);
    }
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
    const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    const s=Math.min(55/Math.max(1,x1-x0),32/Math.max(1,y1-y0));
    const p=pts.map(([px,py])=>[12+(px-x0)*s,9+(py-y0)*s]);
    const path=p.map(([px,py],i)=>(i?'L':'M')+px.toFixed(2)+' '+py.toFixed(2)).join(' ');
    return '<svg viewBox="0 0 80 50" aria-hidden="true"><path d="'+path+'" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="miter" stroke-linecap="square"/></svg>';
  }
  function inches(value,unit){
    const p=M.parseMeasurement(value,unit||'in');
    return p.ok&&p.mm>0?p.mm/25.4:null;
  }
  function checkJ(spec){
    if(spec?.mirProfileId!=='coin_arch_j')return null;
    const t=topology('coin_arch_j'),segments=spec.segments||[];
    if(segments.length!==t.elements.length ||
      segments.some((s,i)=>s.mirFieldId!==t.elements[i].fieldId)){
      return {valid:false,pending:false,ok:false,
        message:'Le profil J a été modifié. Reprenez le modèle « Coin architectural avec J intégré » pour vérifier automatiquement le clouage.'};
    }
    const values={};
    for(let i=0;i<t.elements.length;i++){
      const s=segments[i],v=inches(s.length,spec.unit);
      if(v===null)return {valid:false,pending:true,ok:false,
        message:'Renseignez les cotes du retour du J et du clouage.'};
      values[s.mirFieldId]=v;
    }
    const result=X.checkJRule(values);
    return {...result,valid:true,pending:false,jReturnIn:values.jReturn,
      nailingIn:values.nailing,values};
  }
  function checkCanonical(spec){
    const id=spec?.mirProfileId,variant=BY_ID[id];
    if(!variant||!VARIANTS.includes(variant))return {ok:true,pending:false,errors:[]};
    const model=M.buildProfile(spec),errors=[];
    if(!model.valid)return {ok:false,pending:true,errors:model.validation.errors};
    if(id==='goutte_eau_8'){
      const total=model.finishedSegmentSumMM/25.4;
      if(Math.abs(total-8)>1e-7)errors.push({code:'DEVELOPED_TOTAL_8_REQUIRED',path:'segments',message:'La somme des quatre cotes doit être exactement 8 po.'});
    }
    if(id==='sill_trim'){
      const face=model.segments.find(s=>s.label==='A')?.lengthMM/25.4;
      const right=model.segments.find(s=>s.label==='B')?.lengthMM/25.4;
      if(Number.isFinite(face)&&Number.isFinite(right)&&right<1)
        errors.push({code:'SILL_NAILING_MINIMUM',path:'segments.1.length',message:'La zone de clouage du Sill Trim doit mesurer au moins 1 po.'});
    }
    return {ok:errors.length===0,pending:false,errors,developedTotalIn:model.finishedSegmentSumMM/25.4};
  }
  function preferredFaceSegment(spec){
    const model=M.buildProfile(spec);
    if(!model.valid||!model.segments.length)return spec?.coloredFace?.segmentId||'A';
    return model.segments.reduce((best,segment,index)=>{
      const length=segment.lengthMM||0;
      /* Le dégagement départage seulement les longueurs égales : un segment
         intérieur a deux plis voisins, une extrémité en a un seul. */
      const clearance=(index===0||index===model.segments.length-1?2:1);
      return !best||length>best.length+1e-7||Math.abs(length-best.length)<=1e-7&&clearance>best.clearance
        ?{id:segment.id,length,clearance}:best;
    },null).id;
  }
  function exceptionMatches(check,exception){
    return !!(check?.valid&&!check.ok&&exception?.accepted===true&&
      Math.abs(exception.currentIn-check.nailingIn)<1e-7&&
      Math.abs(exception.minimumIn-check.minimumIn)<1e-7&&
      String(exception.acceptedBy||'').trim());
  }
  function autoCorrectJ(spec){
    const check=checkJ(spec);if(!check?.valid)throw new Error(check?.message||'Profil J invalide.');
    const out=JSON.parse(JSON.stringify(spec));
    const index=out.segments.findIndex(s=>s.mirFieldId==='nailing');
    out.segments[index].length=String(check.minimumIn*(out.unit==='mm'?25.4:1));
    return out;
  }
  function finalizeJ(spec,exception){
    const check=checkJ(spec);
    if(!check?.valid)throw new Error(check?.message||'Profil J invalide.');
    if(!check.ok&&!exceptionMatches(check,exception))
      throw new Error('Corrigez le clouage ou acceptez explicitement une exception.');
    const model=M.buildProfile(spec);
    if(!model.valid)throw new Error('Complétez les cotes et le profil J.');
    const definition=topology('coin_arch_j');
    const angleOverrides={};
    definition.elements.slice(1).forEach((seg,i)=>{angleOverrides[seg.id]=model.bends[i].turnDeg;});
    return X.finalizeProfileOrder('coin_arch_j',check.values,
      {angleOverrides,exception:check.ok?undefined:exception,
       metadata:{source:'MIR configurateur de production',manufacturingValidationRequired:true}});
  }
  return Object.freeze({VARIANTS,LEGACY_VARIANTS,ALL_VARIANTS,create,catalog,canonicalCatalog,icon,
    checkCanonical,preferredFaceSegment,checkJ,exceptionMatches,autoCorrectJ,finalizeJ});
});
