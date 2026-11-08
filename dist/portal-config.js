/* Public Auth configuration. No secret/service key. Provider flags reflect verified server settings. */
(function(){
 'use strict';
 const common={
  "enabled": true,
  "accountEnabled": true,
  "passwordEnabled": true,
  "emailEnabled": true,
  "googleEnabled": true,
  "signupEnabled": true,
  "invitationsEnabled": true,
  "manualInvitations": true,
  "documentsEnabled": false,
  "siteOrigin": "https://revetementsmirweb.github.io",
  "callbackPath": "/MIR/chantier.html"
};
 const test=typeof location==='object'&&new URLSearchParams(location.search).get('recette')==='1';
 window.MIRPortalConfig=Object.freeze({...common,...(test?{
  environment:'test',projectRef:'hxtztkmbfpmzrieccwsg',supabaseUrl:'https://hxtztkmbfpmzrieccwsg.supabase.co',
  publishableKey:"sb_publishable_jk8zsTWqQi6Borv44aaDJw_k7JSbzZh",googleEnabled:false,signupEnabled:false
 }:{
  environment:'production',projectRef:'gccltmaulvrnthrbnrpd',supabaseUrl:'https://gccltmaulvrnthrbnrpd.supabase.co',
  publishableKey:'sb_publishable_fH9gUWK6pYI0G0_oVKieCw_56UqhNWK'
 })});
})();
