/* MIR — Adapter from supplier send provider contract to an authenticated Supabase Edge Function. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRSupplierSupabaseAdapter=api;})(typeof window==='object'?window:null,function(){
'use strict';
function assert(c,m){if(!c)throw new Error(m)}
function createSupplierSendProvider(supabase,{functionName='mir-send-supplier-po'}={}){
  assert(supabase?.functions&&typeof supabase.functions.invoke==='function','Client Supabase authentifié requis.');
  assert(functionName,'Nom de fonction Supabase requis.');
  return async function supplierSendProvider(sendRequest){
    assert(sendRequest?.idempotencyKey,'Requête fournisseur sans clé d’idempotence.');
    const {data,error}=await supabase.functions.invoke(functionName,{body:sendRequest});
    if(error)throw new Error(error.message||'Échec Edge Function fournisseur.');
    if(!data||data.ok!==true)throw new Error(data?.error||'Le serveur MIR n’a pas confirmé l’envoi.');
    if(!data.messageId&&!data.providerReceipt)throw new Error('Le serveur MIR n’a retourné aucune preuve d’envoi.');
    return {ok:true,provider:data.provider||'supabase-edge',messageId:data.messageId||'',providerReceipt:data.providerReceipt||'',sentAt:data.sentAt||new Date().toISOString()};
  };
}
return {createSupplierSendProvider};
});
