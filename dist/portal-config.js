/* Public configuration only. Never put a Supabase secret/service key here.
 * Activation follows the real MIR database, RLS, SMTP and account checks.
 * La connexion est fermée tant que MIR Auth, RLS et les invitations ne sont pas vérifiés.
 */
window.MIRPortalConfig = Object.freeze({
  enabled: false,
  projectRef: 'gccltmaulvrnthrbnrpd',
  supabaseUrl: 'https://gccltmaulvrnthrbnrpd.supabase.co',
  publishableKey: '',
  siteOrigin: 'https://revetementsmirweb.github.io',
  callbackPath: '/MIR/chantier.html',
  emailEnabled: false,
  googleEnabled: false,
  invitationsEnabled: false,
  documentsEnabled: false
});
