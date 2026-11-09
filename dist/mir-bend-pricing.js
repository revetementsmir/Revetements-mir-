(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MIRBendPricing=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';

 function unitCents(tariff,metal,fixedCents,area,folds){
  const base=fixedCents??(area*tariff.area_rate*100+folds*tariff.bend_cents);
  const amount=base*(1+(metal==='aluminium'?tariff.aluminum_basis_points/10000:0));
  const cents=Math.round(amount+Number.EPSILON*amount*4);
  return cents>=1&&cents<=10000000?cents:null;
 }

 async function load(config){
  const response=await fetch(config.supabaseUrl+'/rest/v1/rpc/mir_public_bend_tariff',{
   headers:{apikey:config.publishableKey},cache:'no-store',signal:AbortSignal.timeout(7000)
  });
  if(!response.ok)throw new Error('Tarif MIR indisponible');
  const tariff=await response.json();
  if(!tariff||!Number.isFinite(tariff.area_rate)||tariff.area_rate<=0||
   !Number.isInteger(tariff.bend_cents)||tariff.bend_cents<0||
   !Number.isInteger(tariff.aluminum_basis_points)||tariff.aluminum_basis_points<0||
   !Number.isInteger(tariff.revision)||tariff.revision<0)throw new Error('Tarif MIR invalide');
  return tariff;
 }

 return Object.freeze({unitCents,load});
});
