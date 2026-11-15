/* Public Auth configuration. No secret/service key. Provider flags reflect verified server settings. */
(function(){
 'use strict';
 const common={
  "enabled": true,
  "accountEnabled": true,
  "passwordEnabled": true,
  "emailEnabled": false,
  "googleEnabled": false,
  "signupEnabled": false,
  "invitationsEnabled": false,
  "manualInvitations": false,
  "documentsEnabled": false,
  "siteOrigin": "https://revetementsmir.github.io",
  "callbackPath": "/Revetements-mir-/chantier.html"
};
 // No ?recette=1 switch on public production pages. QA is confined to /test/
 // or explicit local development, never a production visitor's query string.
 const local=typeof location==='object'&&(!location.hostname||/^(localhost|127\\.0\\.0\\.1)$/i.test(location.hostname));
 const testPath=typeof location==='object'&&/(?:^|\\/)test\\//.test(location.pathname||'');
 const test=typeof location==='object'&&(testPath||(local&&new URLSearchParams(location.search).get('recette')==='1'));
 window.MIRPortalConfig=Object.freeze({...common,...(test?{
  environment:'test',projectRef:'hxtztkmbfpmzrieccwsg',supabaseUrl:'https://hxtztkmbfpmzrieccwsg.supabase.co',
  publishableKey:"sb_publishable_jk8zsTWqQi6Borv44aaDJw_k7JSbzZh",googleEnabled:window.MIRTeamTestConfig?.googleEnabled===true,signupEnabled:false,
  teamInvitationsEnabled:window.MIRTeamTestConfig?.teamInvitationsEnabled===true,teamEnrollmentEnabled:window.MIRTeamTestConfig?.teamEnrollmentEnabled===true
 }:{
  environment:'production',projectRef:'gccltmaulvrnthrbnrpd',supabaseUrl:'https://gccltmaulvrnthrbnrpd.supabase.co',
  publishableKey:'sb_publishable_fH9gUWK6pYI0G0_oVKieCw_56UqhNWK'
 })});
})();
