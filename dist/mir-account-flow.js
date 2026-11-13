/* Guest cart stays in its original stores. This module holds only a safe return intent. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRAccountFlow=api;})(typeof window==='object'?window:null,function(){
'use strict';const KEY='mir_account_return_v1',TARGET='selection.html?checkout=1';
function remember(storage,environment='production',now=Date.now()){storage.setItem(KEY,JSON.stringify({version:1,target:TARGET,environment,createdAt:now}));}
function pending(storage,environment='production',now=Date.now()){try{const value=JSON.parse(storage.getItem(KEY)||'null');return value?.version===1&&value.target===TARGET&&value.environment===environment&&Number.isFinite(value.createdAt)&&now>=value.createdAt&&now-value.createdAt<7*86400000?TARGET:null;}catch{return null;}}
function consume(storage,environment='production'){const path=pending(storage,environment);if(path)storage.removeItem(KEY);return path;}
function cartCount(storage){let count=0;for(const [key,read]of [['mir-shopping-list-v1',d=>d.items],['mir_production_client_dossier_v1',d=>d.order?.items]])try{count+=(read(JSON.parse(storage.getItem(key)||'null'))||[]).length;}catch{}return count;}
return Object.freeze({remember,pending,consume,cartCount,TARGET});
});

(function(){
'use strict';if(typeof document==='undefined'||document.body?.dataset.commerceView!=='selection')return;
const Flow=window.MIRAccountFlow,config=window.MIRPortalConfig||{},environment=config.environment||'production';
const section=document.createElement('section');section.className='mir-account-checkout';section.setAttribute('aria-labelledby','mir-checkout-title');
section.innerHTML='<h2 id="mir-checkout-title">Vérifier mon panier</h2><p>Vous pouvez remplir votre panier sans compte. Connectez-vous au moment de préparer la suite.</p><button type="button" id="mir-checkout-start">Vérifier mon panier</button><p id="mir-checkout-status" role="status"></p><div id="mir-checkout-review" hidden></div>';
document.querySelector('.selection-page')?.append(section);
function sync(){document.querySelector('#mir-checkout-start').disabled=!Flow.cartCount(localStorage);}
sync();const count=document.querySelector('[data-list-count]');if(count)new MutationObserver(sync).observe(count,{subtree:true,childList:true,characterData:true});addEventListener('storage',sync);
async function checkout(){const status=document.querySelector('#mir-checkout-status');
 try{
  Flow.remember(localStorage,environment);
  if(!config.enabled||!window.MIRSupabase){location.href='chantier.html?return=checkout'+(environment==='test'?'&recette=1':'');return;}
  const sdk=window.MIRSupabase.createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:false,storageKey:'mir_portal_auth_'+config.projectRef}});
  const {data,error}=await sdk.auth.getUser();
  if(error||!data?.user){location.href='chantier.html?return=checkout'+(environment==='test'?'&recette=1':'');return;}
  const {data:account,error:accountError}=await sdk.rpc('mir_account_snapshot');if(accountError||account?.userId!==data.user.id)throw Error('Votre accès n’a pas pu être vérifié. Ouvrez Mon compte pour réessayer.');
  if(account.role!=='client'){status.textContent='Ce compte appartient à l’équipe MIR. Votre sélection reste conservée ; utilisez votre compte client pour la commande boutique.';return;}
  Flow.consume(localStorage,environment);
  const review=document.querySelector('#mir-checkout-review');review.hidden=false;review.replaceChildren();
  const title=document.createElement('h3');title.textContent='Votre panier est prêt à vérifier';const text=document.createElement('p');text.textContent='Connecté avec '+data.user.email+'. Aucune commande n’a été envoyée.';
  const dependency=document.createElement('p');dependency.textContent='La prise de commande et le paiement en ligne ne sont pas encore raccordés à cette sélection. Conservez votre PDF ou votre liste et faites confirmer les prix, les disponibilités et la livraison par MIR.';
  const link=document.createElement('a');link.href='chantier.html'+(environment==='test'?'?recette=1':'');link.textContent='Mes commandes et adresses dans Mon compte';review.append(title,text,dependency,link);review.scrollIntoView({block:'nearest'});status.textContent='Panier conservé. Vérification uniquement, sans envoi automatique.';
 }catch(error){status.textContent=error.message||'Impossible de vérifier le compte. Votre panier reste conservé.';}
}
document.querySelector('#mir-checkout-start').addEventListener('click',checkout);
if(new URLSearchParams(location.search).get('checkout')==='1')checkout();
})();
