/* Public configuration only. Never put a Supabase secret/service key here.
 * Activation follows the real MIR database, RLS, SMTP and account checks.
 * A disabled connection does not silently open the demonstration.
 */
window.MIRPortalConfig = Object.freeze({
  enabled: false,
  projectRef: 'gccltmaulvrnthrbnrpd',
  supabaseUrl: 'https://gccltmaulvrnthrbnrpd.supabase.co',
  publishableKey: '',
  siteOrigin: 'https://mir-realisations-studio.frederickmessely.chatgpt.site',
  callbackPath: '/chantier.html',
  emailEnabled: false,
  googleEnabled: false,
  invitationsEnabled: false,
  documentsEnabled: false
});
