/* MIR connected portal. The server owns identity, permissions and quantities.
 * No demo reducer or connected snapshot is persisted by this module.
 * Only a user's unfinished command is retained in sessionStorage for retries.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MIRPortalClient = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const clone = value => JSON.parse(JSON.stringify(value));
  const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
  const fingerprint = value => JSON.stringify(stable(value));
  class PortalError extends Error {
    constructor(code, message, options = {}) {
      super(message); this.name = 'PortalError'; this.code = code;
      this.definitive = options.definitive !== false;
      this.needsRetry = options.needsRetry === true;
    }
  }
  const fail = (code, message, options) => { throw new PortalError(code, message, options); };
  function errorOf(error, fallback = 'Le service ne répond pas. Réessayez dans un instant.') {
    if (error instanceof PortalError) return error;
    let detail = error?.details || error?.detail;
    try { if (typeof detail === 'string' && detail.startsWith('{')) detail = JSON.parse(detail).code; } catch (_) {}
    const sqlCode = typeof error?.code === 'string' ? error.code : '';
    const code = typeof detail === 'string' && /^[A-Z][A-Z0-9_]+$/.test(detail) ? detail : sqlCode;
    const definitive = /^(?:[0-9A-Z]{5}|PGRST\d+)$/.test(sqlCode) || error?.definitive === true;
    return new PortalError(code || 'NETWORK_UNCERTAIN', definitive && error?.message ? error.message : fallback,
      { definitive, needsRetry: !definitive });
  }
  const missingRoutine = response => response?.error?.code === 'PGRST202';
  function validateConfig(config = {}, origin) {
    if (config.enabled !== true) return { enabled: false };
    if (!/^[a-z0-9]{20}$/.test(config.projectRef || '')) fail('CONFIGURATION', 'Le portail attend sa configuration MIR.');
    if (config.supabaseUrl !== `https://${config.projectRef}.supabase.co`) fail('CONFIGURATION', 'La connexion MIR doit être vérifiée.');
    // New public keys are deliberately required; service-role JWTs cannot be pasted here.
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey || '')) fail('CONFIGURATION', 'La clé publique du portail doit être configurée.');
    let site;
    try { site = new URL(config.siteOrigin); } catch (_) { fail('CONFIGURATION', 'L’adresse du portail doit être configurée.'); }
    if (site.protocol !== 'https:' || site.origin !== config.siteOrigin || site.username || site.password || site.search || site.hash || site.pathname !== '/')
      fail('CONFIGURATION', 'L’adresse du portail doit être vérifiée.');
    if (origin && origin !== site.origin) fail('ORIGIN_MISMATCH', 'Ouvrez le portail depuis son adresse MIR officielle.');
    const expectedCallback = site.origin === 'https://revetementsmir.github.io'
      ? '/Revetements-mir-/chantier.html' : '/chantier.html';
    if (config.callbackPath !== expectedCallback) fail('CONFIGURATION', 'Le retour de connexion doit être vérifié.');
    return { ...config, enabled: true, redirectTo: `${site.origin}${expectedCallback}` };
  }
  function captureEntry(href) {
    const url = new URL(href), query = url.searchParams, hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const rawInvitation = query.get('invitation') || hash.get('invitation');
    const invitationToken = /^[A-Za-z0-9_-]{43}$/.test(rawInvitation || '') ? rawInvitation : null;
    const code = query.get('code');
    const flow=query.get('flow')||hash.get('type')||query.get('type');
    const intent=['recovery','invite','signup','google'].includes(flow)?flow:'signin';
    let authCallback = null;
    if (code && code.length <= 2048) authCallback = { kind: 'code', code, intent };
    else if(/^[a-zA-Z0-9_-]{20,512}$/.test(query.get('token_hash')||'')&&['email','signup','invite','recovery'].includes(query.get('type')))
      authCallback={kind:'otp',tokenHash:query.get('token_hash'),type:query.get('type'),intent};
    else if (hash.get('access_token') && hash.get('refresh_token')) {
      const accessToken = hash.get('access_token'), refreshToken = hash.get('refresh_token');
      if (accessToken.length < 16000 && refreshToken.length < 4096)
        authCallback = { kind: 'implicit', accessToken, refreshToken, intent };
    }
    const callbackError = query.has('error') || hash.has('error') || query.has('error_code') || hash.has('error_code') ||
      (!authCallback && ['code', 'token_hash', 'access_token', 'refresh_token'].some(key => query.has(key) || hash.has(key)));
    const sensitive = ['invitation', 'code', 'token_hash', 'type', 'access_token', 'refresh_token', 'expires_at', 'expires_in', 'token_type', 'provider_token', 'provider_refresh_token', 'error', 'error_code', 'error_description'];
    sensitive.forEach(key => { query.delete(key); hash.delete(key); });
    // Le site MIR principal n'expose jamais l'ancien mode démonstration.
    query.delete('demo');
    url.hash = hash.toString() ? `#${hash.toString()}` : '';
    return { cleanURL: url.href, invitationToken, authCallback, callbackError, intent,
      invalidInvitation: !!rawInvitation && !invitationToken,
      mode: 'connected' };
  }
  function checkedSnapshot(raw, userId) {
    if (!raw || raw.mode !== 'connected' || raw.demo !== false || raw.actorId !== userId)
      fail('SNAPSHOT_INVALID', 'La réponse du portail n’a pas pu être vérifiée.', { definitive: false, needsRetry: true });
    for (const name of ['members', 'jobs', 'planVersions', 'catalogue', 'orders', 'deliveries', 'movements'])
      if (!Array.isArray(raw[name])) fail('SNAPSHOT_INVALID', 'Les données du portail sont incomplètes.', { definitive: false, needsRetry: true });
    const member = raw.members.find(row => row.id === userId);
    if (!member?.active || !['employee', 'admin'].includes(member.role)) fail('ACCESS_DENIED', 'Votre accès MIR n’est pas actif.');
    if (!raw.inventory || typeof raw.inventory !== 'object' || Array.isArray(raw.inventory) || !raw.favorites || typeof raw.favorites !== 'object')
      fail('SNAPSHOT_INVALID', 'Les quantités du portail n’ont pas pu être vérifiées.', { definitive: false, needsRetry: true });
    return { ...clone(raw), invitationDrafts: [], audit: [] };
  }
  function stockFor(snapshot, stockKey) {
    const row = snapshot?.inventory?.[stockKey];
    if (!row || !Number.isFinite(row.onHand) || !Number.isFinite(row.reserved) || !Number.isFinite(row.available))
      return { stockKey, onHand: null, reserved: null, available: null, known: false, demo: false };
    return { ...row, stockKey, known: true, demo: false };
  }
  function commandSpec(command, raw = {}) {
    const fields = {
      CREATE_ORDER: ['jobId', 'lines', 'note', 'deliveryMode'], SET_FAVORITE: ['itemId', 'favorite'],
      EXTRA_SUBMIT: ['jobId','description','photoPath','dueAt'], DELIVERY_ISSUE: ['jobId','orderId','lineId','supplierOrderId','comment','photoPath'],
      DELIVERY_RECEIVE: ['jobId','orderId','lineId','quantity','place','photoPath'], HR_SUBMIT: ['kind','start','end','note'],
      MESSAGE_SEND: ['conversationId','body','jobId','planDocumentId','attachmentPath'], MESSAGE_ACK: ['messageId','state'],NOTIFICATION_READ:['notificationId'],
      SET_INVENTORY: ['stockKey', 'variant', 'quantity', 'unit', 'note'], RESERVE_ORDER: ['orderId'],
      RECORD_DELIVERY: ['orderId', 'quantities', 'note'], CANCEL_REMAINDER: ['orderId', 'quantities', 'note'],
      ASSIGN_JOB: ['jobId', 'memberIds', 'memberId', 'assigned'], ASSIGN_MEMBER_JOBS: ['memberId', 'jobIds'], SET_MEMBER_ACTIVE: ['memberId', 'active'],
      CREATE_JOB: ['name', 'address'], INVITE_EMPLOYEE: ['email', 'jobIds'], REVOKE_INVITATION: ['invitationId']
    }[command];
    if (!fields) fail('COMMAND_UNKNOWN', 'Cette action n’est pas proposée dans le portail connecté.');
    const payload = Object.fromEntries(fields.filter(key => raw[key] !== undefined).map(key => [key, clone(raw[key])]));
    if (command === 'CREATE_ORDER' && Array.isArray(payload.lines))
      payload.lines = payload.lines.map(line => Object.fromEntries(['itemId', 'quantity', 'colorId', 'formatId', 'dimensionsIn']
        .filter(key => line[key] !== undefined && line[key] !== null).map(key => [key, line[key]])));
    if (command === 'SET_FAVORITE' && typeof payload.favorite !== 'boolean') fail('FAVORITE_REQUIRED', 'Précisez le choix du favori.');
    return payload;
  }
  function create(options = {}) {
    const config = validateConfig(options.config, options.origin);
    const listeners = new Set();
    let status = { phase: config.enabled ? 'signed_out' : 'unavailable', user: null, snapshot: null, error: null, pending: null, busy: false };
    let generation = 0, readSequence = 0, authSubscription = null, activePromise = null, authTimer = null, liveTimer = null, disposed = false, internalOrg = null;
    const storage = options.operationStorage;
    const logoutKey = `mir_portal_signed_out_${config.projectRef || 'disabled'}`;
    let logoutRequested = false;
    const passwordGateKey=`mir_account_password_gate_${config.projectRef||'disabled'}`;
    let passwordGate=null;
    try{const value=storage?.getItem(passwordGateKey);if(['recovery','invite'].includes(value))passwordGate=value;}catch(_){}
    function setPasswordGate(value){passwordGate=value;try{if(value)storage?.setItem(passwordGateKey,value);else storage?.removeItem(passwordGateKey);}catch(_){} }
    try { logoutRequested = config.enabled && storage?.getItem(logoutKey) === '1'; } catch (_) {}
    function setLogoutIntent(value) {
      logoutRequested = value;
      try { if (value) storage?.setItem(logoutKey, '1'); else storage?.removeItem(logoutKey); } catch (_) {}
    }
    const uuid = options.uuid || (() => globalThis.crypto?.randomUUID?.());
    const schedule = options.schedule || (fn => setTimeout(fn, 0));
    const sdk = config.enabled ? options.sdk?.createClient?.(config.supabaseUrl, config.publishableKey, {
      auth: { flowType: 'pkce', detectSessionInUrl: false, autoRefreshToken: true, persistSession: true,
        storageKey: `mir_portal_auth_${config.projectRef}` }
    }) : null;
    if (config.enabled && !sdk) fail('SDK_UNAVAILABLE', 'Le module de connexion n’a pas pu être chargé.');
    const emit = (change, reason = 'state') => {
      if (disposed) return;
      status = { ...status, ...change };
      for (const listener of listeners) { try { listener({ ...status, reason }); } catch (_) {} }
    };
    const operationKey = id => `mir_portal_pending_${config.projectRef}_${id}`;
    function readPending(userId) {
      try {
        const raw = storage?.getItem(operationKey(userId)); if (!raw) return null;
        const value = JSON.parse(raw);
        if (value.userId !== userId || !UUID.test(value.requestId || '') || value.fingerprint !== fingerprint({ command: value.command, payload: commandSpec(value.command, value.payload) }))
          fail('PENDING_INVALID', 'Une action sauvegardée ne peut pas être relue. Contactez le responsable avant de la recréer.');
        return value;
      } catch (error) {
        if (error instanceof PortalError) throw error;
        fail('PENDING_INVALID', 'Une action sauvegardée ne peut pas être relue. Contactez le responsable avant de la recréer.');
      }
    }
    function savePending(value) {
      const data = JSON.stringify(value);
      try {
        if (!storage) throw new Error('storage');
        storage.setItem(operationKey(value.userId), data);
        if (storage.getItem(operationKey(value.userId)) !== data) throw new Error('storage');
      } catch (_) { fail('STORAGE_REQUIRED', 'Autorisez le stockage de cette page avant d’envoyer une demande. Il protège la reprise après une coupure.'); }
      emit({ pending: value }, 'command');
    }
    function clearPending(userId) {
      try { storage?.removeItem(operationKey(userId)); } catch (_) {}
      if (status.user?.id === userId) emit({ pending: null }, 'command');
    }
    function clearIdentity(phase = 'signed_out', error = null) {
      revokeChatURLs();
      generation++; readSequence++;
      emit({ phase, user: null, snapshot: null, account:null, pending: null, busy: false, error }, 'auth');
    }
    function requireEnabled() { if (!sdk) fail('NOT_ENABLED', 'Les accès employés sont en cours d’activation.'); }
    async function verifiedUser() {
      requireEnabled();
      if (logoutRequested) return null;
      const { data, error } = await sdk.auth.getUser();
      if (error || !data?.user?.id) {
        if (!error || ['AuthSessionMissingError', 'AuthInvalidTokenResponseError'].includes(error.name) || [401, 403].includes(error.status)) {
          clearIdentity(); return null;
        }
        throw errorOf(error);
      }
      return data.user;
    }
    async function refresh() {
      revokeChatURLs();
      requireEnabled();
      if (logoutRequested) { clearIdentity(); return null; }
      if (activePromise) await activePromise.catch(() => {});
      if (logoutRequested) { clearIdentity(); return null; }
      let currentGeneration = generation; const sequence = ++readSequence;
      try {
        const user = await verifiedUser();
        if (!user) return null;
        if(passwordGate){emit({phase:'password_required',passwordIntent:passwordGate,user:{id:user.id,email:user.email||''},snapshot:null,account:null,error:null},'auth');return null;}
        if (currentGeneration !== generation || sequence !== readSequence || disposed) return null;
        if (status.user?.id && status.user.id !== user.id) {
          generation++; currentGeneration = generation; emit({ phase:'loading',user:null,account:null,snapshot:null,pending:null }, 'auth');
        }
        const epoch = generation;
        emit({ user: { id: user.id, email: user.email || '' }, pending: readPending(user.id) });
        if(config.accountEnabled){
          let {data:account,error:accountError}=await sdk.rpc('mir_account_snapshot');
          if(epoch!==generation||sequence!==readSequence||disposed)return null;
          if(accountError)throw errorOf(accountError);
          if(!account||account.userId!==user.id||!['client','employee','admin'].includes(account.role))fail('ACCESS_DENIED','Votre accès MIR n’a pas pu être vérifié.');
          internalOrg=account.organizationId||null;
          if(account.role==='client'){
            if(user.user_metadata?.mir_delivery_address){
              const imported=await sdk.rpc('mir_account_import_signup_address');
              if(epoch!==generation||sequence!==readSequence||disposed)return null;
              if(!imported.error&&imported.data){
                const updated=await sdk.rpc('mir_account_snapshot');
                if(epoch!==generation||sequence!==readSequence||disposed)return null;
                if(!updated.error&&updated.data?.userId===user.id)account=updated.data;
              }else if(imported.error)account={...account,addressImportPending:true};
            }
            emit({phase:'customer_ready',account:clone(account),snapshot:null,error:null},'refresh');return account;
          }
        }
        const { data, error } = await sdk.rpc('mir_portal_snapshot');
        if (epoch !== generation || sequence !== readSequence || disposed) return null;
        if (error) throw errorOf(error);
        const [operationsResponse,messagingResponse,punchResponse]=await Promise.all([
          sdk.rpc('mir_employee_operations_snapshot',{org:internalOrg,job:null}),sdk.rpc('mir_messaging_snapshot',{org:internalOrg}),sdk.rpc('mir_punch_snapshot',{org:internalOrg,employee:null})
        ]);
        if(operationsResponse.error)throw errorOf(operationsResponse.error);if(messagingResponse.error)throw errorOf(messagingResponse.error);
        if(punchResponse.error&&!missingRoutine(punchResponse))throw errorOf(punchResponse.error);
        const punch=punchResponse.error?{enabled:false,settings:{},activeShift:null,week:[],corrections:[],bankBalance:0,unavailable:true}:punchResponse.data;
        let lead=null,boss=null,logistics=null,management=null,boutiquePricing=null;
        if(operationsResponse.data?.role==='chef_equipe'){
          const response=await sdk.rpc('mir_lead_today_snapshot',{org:internalOrg});if(response.error)throw errorOf(response.error);lead=response.data;
        }else if(operationsResponse.data?.role==='boss'){
          const response=await sdk.rpc('mir_boss_operations_snapshot',{org:internalOrg});if(response.error)throw errorOf(response.error);boss=response.data;
        }
        if(['warehouse','chef_equipe','boss','admin'].includes(operationsResponse.data?.role)){
          const response=await sdk.rpc('mir_logistics_snapshot',{org:internalOrg});if(response.error)throw errorOf(response.error);logistics=response.data;
        }
        if(['assistant','boss','admin'].includes(operationsResponse.data?.role)){
          const response=await sdk.rpc('mir_management_snapshot',{org:internalOrg});if(response.error)throw errorOf(response.error);management=response.data;
          const prices=await sdk.rpc('mir_boutique_price_management',{org:internalOrg});if(prices.error)throw errorOf(prices.error);boutiquePricing=prices.data;
        }
        const snapshot = checkedSnapshot({...data,operations:operationsResponse.data,messaging:messagingResponse.data,lead,boss,logistics,management,boutiquePricing,punch}, user.id);
        emit({ phase: 'ready', snapshot, error: null }, 'refresh');
        return snapshot;
      } catch (error) {
        if (currentGeneration !== generation || sequence !== readSequence || disposed) return null;
        const mapped = errorOf(error), denied = ['ACCESS_DENIED', 'ACTOR_INACTIVE', 'MEMBER_INACTIVE', 'MEMBERSHIP_REQUIRED', 'AUTH_REQUIRED', '42501'].includes(mapped.code);
        emit({ phase: denied ? 'access_denied' : 'error', snapshot: null,account:null, error: mapped }, 'refresh');
        throw mapped;
      }
    }
    const onlinePunchSync=()=>{if(!disposed)syncPunchQueue().catch(()=>0).then(()=>refresh().catch(()=>{}));};
    async function start() {
      if (!sdk) { emit({}, 'start'); return null; }
      if (!authSubscription) {
        const subscription = sdk.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') { clearIdentity(); return; }
          if(event==='PASSWORD_RECOVERY'){setPasswordGate('recovery');schedule(()=>{if(!disposed)refresh().catch(()=>{});});return;}
          if (logoutRequested) return;
          if (event === 'INITIAL_SESSION') return;
          if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
            if (session?.user?.id !== status.user?.id) clearIdentity('loading');
            // Never call a Supabase method while its auth callback lock is held.
            authTimer = schedule(() => { if (!disposed) refresh().catch(() => {}); });
          }
        });
        authSubscription = subscription?.data?.subscription || null;
      }
      if (logoutRequested) { clearIdentity(); return null; }
      emit({ phase: 'loading', error: null }, 'start');
      const result=await refresh();
      globalThis.addEventListener?.('online',onlinePunchSync);
      if(liveTimer===null&&typeof setInterval==='function')liveTimer=setInterval(()=>{if(!disposed&&globalThis.navigator?.onLine!==false&&globalThis.document?.visibilityState!=='hidden'&&status.phase==='ready')refresh().catch(()=>{});},15000);
      if(globalThis.navigator?.onLine!==false)syncPunchQueue().catch(()=>{});
      return result;
    }
    async function sendEmail(email) {
      requireEnabled(); if (!config.emailEnabled) fail('EMAIL_DISABLED', 'La connexion par courriel est en cours d’activation.');
      const address = String(email || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || address.length > 254) fail('EMAIL_INVALID', 'Indiquez votre adresse courriel.');
      const { error } = await sdk.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false, emailRedirectTo: config.redirectTo } });
      if (error) {
        // Do not reveal whether an address is an invited employee.
        if (error.status === 429) fail('RATE_LIMIT', 'Patientez un peu avant de demander un nouveau lien.');
        if (!error.status || error.status >= 500) throw errorOf(error);
      }
      return { message: 'Si cette adresse possède un accès MIR, un lien de connexion lui a été envoyé.' };
    }
    function redirectFor(flow){const u=new URL(config.redirectTo);u.searchParams.set('flow',flow);if(config.environment==='test')u.searchParams.set('recette','1');return u.href;}
    function emailAddress(value){const email=String(value||'').trim();if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('EMAIL_INVALID','Indiquez une adresse courriel valide.');return email;}
    function newPassword(value){if(typeof value!=='string'||value.length<12||value.length>256)fail('PASSWORD_INVALID','Choisissez un mot de passe d’au moins 12 caractères.');return value;}
    function authFailure(error){
      const code=error?.code||'';
      if(error?.status===429)return new PortalError('RATE_LIMIT','Trop de tentatives. Patientez quelques minutes avant de réessayer.');
      if(code==='email_not_confirmed')return new PortalError('EMAIL_UNCONFIRMED','Confirmez votre adresse courriel avant de vous connecter.');
      if(['invalid_credentials','invalid_grant','user_not_found'].includes(code))return new PortalError('LOGIN_INVALID','Courriel ou mot de passe incorrect.');
      if(['otp_expired','flow_state_expired','flow_state_not_found'].includes(code))return new PortalError('LINK_EXPIRED','Ce lien est expiré ou déjà utilisé. Demandez un nouveau lien.');
      if(code==='signup_disabled')return new PortalError('SIGNUP_DISABLED','La création de compte est en cours d’activation. Votre panier est conservé.');
      return new PortalError('AUTH_FAILED','La connexion n’a pas pu être confirmée. Vérifiez vos informations et réessayez.');
    }
    async function signInPassword(email,password){
      requireEnabled();if(config.passwordEnabled===false)fail('PASSWORD_DISABLED','La connexion par mot de passe est en cours d’activation.');
      const {error}=await sdk.auth.signInWithPassword({email:emailAddress(email),password:String(password||'')});if(error)throw authFailure(error);
      setLogoutIntent(false);return refresh();
    }
    async function signUpClient(email,password,address=null){
      requireEnabled();if(!config.signupEnabled)fail('SIGNUP_DISABLED','La création de compte est en cours d’activation. Votre panier est conservé.');
      const options={emailRedirectTo:redirectFor('signup')};
      if(address){
        const fields=['recipient','line1','line2','city','province','postalCode','country'];
        const delivery=Object.fromEntries(fields.map(key=>[key,String(address[key]||'').trim()]));
        if(fields.some(key=>delivery[key].length>200||(key!=='line2'&&!delivery[key])))
          fail('ADDRESS_INVALID','Complétez l’adresse de livraison ou laissez les champs vides.');
        options.data={mir_delivery_address:delivery};
      }
      const {error}=await sdk.auth.signUp({email:emailAddress(email),password:newPassword(password),options});
      if(error)throw authFailure(error);return {message:'Vérifiez votre boîte courriel pour confirmer votre adresse. Votre panier reste conservé.'};
    }
    async function resetPassword(email){
      requireEnabled();const {error}=await sdk.auth.resetPasswordForEmail(emailAddress(email),{redirectTo:redirectFor('recovery')});
      if(error)throw authFailure(error);return {message:'Si cette adresse possède un compte MIR, un courriel de récupération lui est envoyé. Vérifiez aussi les indésirables.'};
    }
    async function resendConfirmation(email){
      requireEnabled();const {error}=await sdk.auth.resend({type:'signup',email:emailAddress(email),options:{emailRedirectTo:redirectFor('signup')}});
      if(error&&(!error.status||error.status===429||error.status>=500))throw authFailure(error);
      return {message:'Si une confirmation est attendue pour cette adresse, un nouveau courriel lui est envoyé.'};
    }
    async function setPassword(password){
      requireEnabled();if(!await verifiedUser())fail('AUTH_REQUIRED','Ouvrez le lien de récupération ou d’invitation reçu par courriel.');
      const {error}=await sdk.auth.updateUser({password:newPassword(password)});if(error)throw authFailure(error);
      setPasswordGate(null);setLogoutIntent(false);return refresh();
    }
    async function saveAddress(address,id=null){
      requireEnabled();if(status.phase!=='customer_ready')fail('ACCESS_DENIED','Connectez-vous à votre compte client.');
      if(!await verifiedUser())fail('AUTH_REQUIRED','Reconnectez-vous pour enregistrer cette adresse.');
      const {data,error}=await sdk.rpc('mir_account_save_address',{p_address:clone(address),p_id:id});if(error)throw errorOf(error);
      await refresh();return data;
    }
    async function removeAddress(id){
      requireEnabled();if(status.phase!=='customer_ready'||!UUID.test(id||''))fail('ACCESS_DENIED','Cette adresse ne peut pas être supprimée.');
      if(!await verifiedUser())fail('AUTH_REQUIRED','Reconnectez-vous.');const {error}=await sdk.rpc('mir_account_remove_address',{p_id:id});if(error)throw errorOf(error);await refresh();
    }
    async function signInGoogle() {
      requireEnabled(); if (!config.googleEnabled) fail('GOOGLE_DISABLED', 'La connexion Google est en cours d’activation.');
      const { error } = await sdk.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectFor('google') } });
      if (error) throw errorOf(error);
    }
    async function completeCallback(callback) {
      requireEnabled();
      if(['recovery','invite'].includes(callback?.intent))setPasswordGate(callback.intent);
      let response;
      if (callback?.kind === 'code') response = await sdk.auth.exchangeCodeForSession(callback.code);
      else if (callback?.kind === 'implicit') response = await sdk.auth.setSession({ access_token: callback.accessToken, refresh_token: callback.refreshToken });
      else if(callback?.kind==='otp')response=await sdk.auth.verifyOtp({token_hash:callback.tokenHash,type:callback.type});
      else fail('CALLBACK_INVALID', 'Ce lien de connexion ne peut pas être utilisé.');
      if (response.error){setPasswordGate(null);clearIdentity('signed_out');throw new PortalError('CALLBACK_INVALID', 'Ce lien est expiré ou ne peut plus être utilisé. Demandez un nouveau lien.');}
      // Only a successful, explicitly confirmed login can resume this browser tab.
      // A late token refresh cannot undo the person's choice to sign out.
      setLogoutIntent(false);
      // A token or locally stored session never supplies the portal role.
      return refresh();
    }
    async function signOut() {
      requireEnabled(); setLogoutIntent(true);setPasswordGate(null); clearIdentity('signed_out');
      const { error } = await sdk.auth.signOut({ scope: 'local' });
      if (error) throw errorOf(error, 'Les données ont été masquées. La fermeture de session reste à confirmer.');
    }
    function requireReady() {
      requireEnabled();
      if (status.phase !== 'ready' || !status.user || !status.snapshot) fail('AUTH_REQUIRED', 'Connectez-vous avec votre accès MIR.');
    }
    async function transmit(operation) {
      const epoch = generation;
      emit({ busy: true, error: null }, 'command'); readSequence++;
      try {
        let data, error;
        if(config.manualInvitations&&['INVITE_EMPLOYEE','REVOKE_INVITATION'].includes(operation.command)){
          if(!config.invitationsEnabled)fail('INVITATIONS_DISABLED','Les invitations ne sont pas disponibles.');
          const response=operation.command==='INVITE_EMPLOYEE'
           ?await sdk.rpc('mir_account_create_invitation',{p_email:operation.payload.email,p_job_ids:operation.payload.jobIds||[],p_request_id:operation.requestId})
           :await sdk.rpc('mir_account_revoke_invitation',{p_id:operation.payload.invitationId});
          error=response.error;data={ok:!error,result:response.data};
        }else if (['INVITE_EMPLOYEE', 'REVOKE_INVITATION'].includes(operation.command)) {
          if (!config.invitationsEnabled) fail('INVITATIONS_DISABLED', 'Les invitations sécurisées sont en cours d’activation.');
          const response = await sdk.functions.invoke('mir-invitations', { body: {
            action: operation.command === 'INVITE_EMPLOYEE' ? 'invite' : 'revoke', requestId: operation.requestId, ...operation.payload
          } });
          data = response.data; error = response.error;
          if (error?.context && [400, 401, 403, 404, 409, 422].includes(error.context.status)) {
            try {
              const body = await error.context.clone().json();
              error = new PortalError(body?.error?.code || 'INVITATION_DENIED', body?.error?.message || 'Cette invitation ne peut pas être enregistrée avec votre accès.');
            } catch (_) {}
          }
          if (!error && data?.ok !== true) error = new PortalError(data?.error?.code || 'INVITATION_FAILED', data?.error?.message || 'L’invitation n’a pas pu être préparée.');
        } else {
          ({ data, error } = await sdk.rpc('mir_portal_command', {
            p_request_id: operation.requestId, p_command: operation.command, p_payload: operation.payload
          }));
        }
        if (error) throw errorOf(error);
        if (epoch !== generation || status.user?.id !== operation.userId) fail('SESSION_CHANGED', 'La session a changé. Retrouvez cette action avec le même compte.', { definitive: false, needsRetry: true });
        if (!data?.result || typeof data.result !== 'object' || Array.isArray(data.result) ||
          (!['INVITE_EMPLOYEE', 'REVOKE_INVITATION'].includes(operation.command) && !data.snapshot))
          fail('RESPONSE_UNCERTAIN', 'La confirmation de cette action manque. Réessayez la même action.', { definitive: false, needsRetry: true });
        const snapshot = data.snapshot ? checkedSnapshot(data.snapshot, operation.userId) : status.snapshot;
        clearPending(operation.userId);
        emit({ snapshot, phase: 'ready', error: null }, 'command');
        return { ok: true, result: data.result, snapshot, command: operation.command, payload: operation.payload };
      } catch (error) {
        const mapped = errorOf(error);
        if (mapped.definitive) clearPending(operation.userId);
        if (epoch === generation) {
          if (['AUTH_REQUIRED', 'MEMBERSHIP_REQUIRED', 'MEMBER_INACTIVE', 'ACTOR_INACTIVE', 'ACCESS_DENIED', '42501'].includes(mapped.code))
            emit({ phase: 'access_denied', snapshot: null, error: mapped }, 'auth');
          else if (['ADMIN_REQUIRED', 'JOB_NOT_ASSIGNED'].includes(mapped.code)) {
            emit({ phase: 'error', snapshot: null, error: mapped }, 'auth');
            schedule(() => refresh().catch(() => {}));
          } else emit({ error: mapped }, 'command');
        }
        throw mapped;
      } finally { if (epoch === generation) emit({ busy: false }, 'command'); }
    }
    function command(name, raw = {}) {
      requireReady();
      if (activePromise) return Promise.reject(new PortalError('BUSY', 'Une action est déjà en cours.'));
      const payload = commandSpec(name, raw), signature = fingerprint({ command: name, payload });
      let operation = status.pending;
      if (operation && operation.fingerprint !== signature) return Promise.reject(new PortalError('PENDING_OPERATION', 'Vérifiez d’abord l’action dont la confirmation manque.'));
      if (!operation) {
        const requestId = uuid(); if (!UUID.test(requestId || '')) fail('UUID_REQUIRED', 'Le navigateur ne peut pas préparer une référence de demande sûre.');
        operation = { requestId, userId: status.user.id, command: name, payload, fingerprint: signature };
        savePending(operation);
      }
      activePromise = transmit(operation).finally(() => { activePromise = null; });
      return activePromise;
    }
    function retry() {
      requireReady();
      if (!status.pending) fail('NOT_PENDING', 'Aucune action ne reste à vérifier.');
      return command(status.pending.command, status.pending.payload);
    }
    async function acceptInvitation(token) {
      requireEnabled();
      if (!/^[A-Za-z0-9_-]{43}$/.test(token || '')) fail('INVITATION_INVALID', 'Le lien d’invitation n’est pas valide.');
      const user = await verifiedUser();
      if (!user) fail('AUTH_REQUIRED', 'Connectez-vous pour accepter votre invitation.');
      const { data, error } = await sdk.rpc('mir_portal_accept_invitation', { p_token: token });
      if (error) throw errorOf(error, 'L’invitation n’a pas pu être confirmée. Réessayez sans recréer votre accès.');
      await refresh(); return data;
    }
    async function listInvitations() {
      requireReady();
      if (status.snapshot.members.find(member => member.id === status.user.id)?.role !== 'admin' || !config.invitationsEnabled) return [];
      const epoch = generation, { data, error } = await sdk.rpc('mir_portal_list_invitations');
      if (error) throw errorOf(error);
      if (epoch !== generation) return [];
      return Array.isArray(data) ? data : [];
    }
    async function downloadPlan(documentId) {
      requireReady();
      if (!config.documentsEnabled) fail('DOCUMENTS_DISABLED', 'La publication des plans sécurisés est en cours d’activation.');
      if (!UUID.test(documentId || '')) fail('DOCUMENT_INVALID', 'Ce document n’est pas disponible.');
      const epoch = generation, { data, error } = await sdk.auth.getSession();
      if (error || !data?.session?.access_token) fail('AUTH_REQUIRED', 'Reconnectez-vous pour ouvrir ce plan.');
      const response = await (options.fetch || globalThis.fetch)(`${config.supabaseUrl}/functions/v1/mir-plans`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: config.publishableKey, Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ action: 'download', documentId })
      });
      if (!response.ok) fail('DOCUMENT_DENIED', 'Ce plan ne peut pas être ouvert avec votre accès actuel.');
      if (!response.headers.get('content-type')?.toLowerCase().includes('application/pdf')) fail('DOCUMENT_INVALID', 'Le document reçu n’est pas un PDF.');
      const blob = await response.blob();
      if (epoch !== generation) fail('SESSION_CHANGED', 'La session a changé; ouvrez le document à nouveau.');
      if (blob.size > 25 * 1024 * 1024 || !blob.size) fail('DOCUMENT_INVALID', 'Ce document ne peut pas être téléchargé.');
      return blob;
    }
    // Phase3A chat API begin. Server authorization remains authoritative.
    const chatURLs=new Set(),blobURLs=options.objectURL||globalThis.URL;let chatFileEpoch=0;
    function revokeChatURLs(){chatFileEpoch++;for(const url of chatURLs)blobURLs.revokeObjectURL(url);chatURLs.clear();}
    async function chatRPC(name,args){
      requireReady();if(!internalOrg)fail('ACCESS_DENIED','Accès interne requis.');
      const epoch=generation,user=status.user.id,{data,error}=await sdk.rpc(name,{org:internalOrg,...args});
      if(epoch!==generation||status.user?.id!==user||status.phase!=='ready')fail('SESSION_CHANGED','La session a changé; rouvrez la conversation.');
      if(error)throw errorOf(error);return data;
    }
    async function chatConversations(cursor=null,limit=20){return chatRPC('mir_chat_conversations',{page_size:Math.min(50,Math.max(1,Number(limit)||20)),page_before:cursor});}
    async function chatMessages(conversation,cursor=null,limit=20){
      if(!UUID.test(conversation||''))fail('CONVERSATION_INVALID','Conversation invalide.');
      return chatRPC('mir_chat_messages',{conversation,page_size:Math.min(50,Math.max(1,Number(limit)||20)),page_before:cursor});
    }
    async function chatSearch(query,cursor=null,limit=20){return chatRPC('mir_chat_search',{query_text:String(query||''),page_size:Math.min(50,Math.max(1,Number(limit)||20)),page_before:cursor});}
    function chatPath(path){
      const p=String(path||'').split('/'),file=p[4]?.split('.');
      if(p.length!==5||p[0]!==internalOrg||p[1]!=='message'||!UUID.test(p[2])||!UUID.test(p[3])||file?.length!==2||!UUID.test(file[0])||!['jpg','png','webp','heic','heif','pdf'].includes(file[1])||/[%\\\s?#]/.test(path))fail('DOCUMENT_INVALID','Pièce jointe invalide.');return p;
    }
    async function chatFile(action,conversation,extra){
      requireReady();if(!internalOrg||!UUID.test(conversation||''))fail('CONVERSATION_INVALID','Conversation invalide.');
      const epoch=generation,fileEpoch=chatFileEpoch,user=status.user.id,{data,error}=await sdk.auth.getSession();
      if(error||!data?.session?.access_token)fail('AUTH_REQUIRED','Reconnectez-vous pour ouvrir cette pièce jointe.');
      if(epoch!==generation||fileEpoch!==chatFileEpoch||status.user?.id!==user||status.phase!=='ready')fail('SESSION_CHANGED','La session a changé; rouvrez la pièce jointe.');
      const response=await(options.fetch||globalThis.fetch)(`${config.supabaseUrl}/functions/v1/mir-chat-files`,{
        method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json',apikey:config.publishableKey,Authorization:`Bearer ${data.session.access_token}`},
        body:JSON.stringify({action,org:internalOrg,conversation,...extra})});
      if(epoch!==generation||fileEpoch!==chatFileEpoch||status.user?.id!==user||status.phase!=='ready')fail('SESSION_CHANGED','La session a changé; rouvrez la pièce jointe.');
      if(!response.ok)fail('DOCUMENT_DENIED','Pièce jointe refusée ou service sécurisé indisponible.');
      const result=action==='download'?await response.blob():await response.json();
      if(epoch!==generation||fileEpoch!==chatFileEpoch||status.user?.id!==user||status.phase!=='ready')fail('SESSION_CHANGED','La session a changé; rouvrez la pièce jointe.');
      return result;
    }
    async function validateMessageAttachment(conversation,path){chatPath(path);await chatFile('validate',conversation,{path});return chatRPC('mir_message_attachment_validate',{conversation,object_path:path});}
    async function ackChatMessage(message,state='read'){return chatRPC('mir_message_ack',{message,state});}
    async function chatFileURL(path){
      requireReady();const parts=chatPath(path),blob=await chatFile('download',parts[2],{path});
      if(!blob.size||blob.size>10*1024*1024||!['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'].includes(blob.type))fail('DOCUMENT_INVALID','Pièce jointe invalide.');
      const url=blobURLs.createObjectURL(blob);chatURLs.add(url);return url;
    }
    const chatPhotoURL=chatFileURL;
    // Phase3A chat API end.
    async function openConversation(kind,targetId){
      requireReady();if(!internalOrg||!['private','team','job'].includes(kind)||!UUID.test(targetId||''))fail('CONVERSATION_INVALID','Cette conversation ne peut pas être ouverte.');
      const {data,error}=await sdk.rpc('mir_conversation_open',{org:internalOrg,kind,target:targetId});if(error)throw errorOf(error);return data;
    }
    async function uploadInternal(file,scope,entityId){
      requireReady();if(!internalOrg||!['message','extra','issue','receipt','material','problem','report','vehicle','delivery','inspection','signature'].includes(scope)||!UUID.test(entityId||''))fail('UPLOAD_INVALID','La destination de cette photo est invalide.');
      const mime=String(file?.type||'').toLowerCase(),extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif',...(scope==='message'?{'application/pdf':'pdf'}:{})};
      if(!extensions[mime]||!file.size||file.size>10*1024*1024)fail('UPLOAD_INVALID',scope==='message'?'Utilisez une photo ou un PDF de 10 Mo maximum.':'Utilisez une photo JPG, PNG, WebP ou HEIC de 10 Mo maximum.');
      // Phase3A chat upload begin.
      if(scope==='message'){
        const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let at=0;at<bytes.length;at+=32768)binary+=String.fromCharCode(...bytes.subarray(at,at+32768));
        const result=await chatFile('upload',entityId,{mime,base64:globalThis.btoa(binary)});const parts=chatPath(result?.path);
        if(parts[2]!==entityId||parts[3]!==status.user.id||result.mime!==mime||result.size!==file.size)fail('DOCUMENT_INVALID','La pièce jointe reçue est invalide.');return result.path;
      }
      // Phase3A chat upload end.
      const id=uuid();if(!UUID.test(id||''))fail('UUID_REQUIRED','Le navigateur ne peut pas préparer cette photo.');
      const path=`${internalOrg}/${scope}/${entityId}/${status.user.id}/${id}.${extensions[mime]}`;
      const {error}=await sdk.storage.from('mir-internal').upload(path,file,{contentType:mime,upsert:false,cacheControl:'3600'});if(error)throw errorOf(error,'La photo n’a pas pu être téléversée.');return path;
    }
    async function internalPhotoURL(path){requireReady();if(String(path).split('/')[1]==='message')return chatFileURL(path);const {data,error}=await sdk.storage.from('mir-internal').createSignedUrl(path,300);if(error||!data?.signedUrl)throw errorOf(error||{},'Cette photo ne peut pas être ouverte.');return data.signedUrl;}
    async function jobDossier(jobId,pageBefore=null,pageSize=20){
      requireReady();if(!internalOrg||!UUID.test(jobId||''))fail('JOB_INVALID','Ce chantier ne peut pas être ouvert.');
      const {data,error}=await sdk.rpc('mir_job_dossier_snapshot',{org:internalOrg,job:jobId,page_size:Math.min(50,Math.max(1,Number(pageSize)||20)),page_before:pageBefore||null});
      if(error)throw errorOf(error);if(!data?.job||data.job.id!==jobId)fail('RESPONSE_UNCERTAIN','Le dossier chantier reçu ne peut pas être vérifié.');return data;
    }
    async function jobDocumentURL(path){requireReady();if(typeof path!=='string'||path.length>600||path.includes('..'))fail('DOCUMENT_INVALID','Ce document ne peut pas être ouvert.');const {data,error}=await sdk.storage.from('mir-job-documents').createSignedUrl(path,300);if(error||!data?.signedUrl)throw errorOf(error||{},'Ce document privé ne peut pas être ouvert.');return data.signedUrl;}
    async function leadAction(action,payload={}){requireReady();if(!internalOrg||status.snapshot?.operations?.role!=='chef_equipe')fail('ACCESS_DENIED','Chef équipe requis.');const {data,error}=await sdk.rpc('mir_lead_action',{org:internalOrg,request_id:uuid(),action,payload});if(error)throw errorOf(error);await refresh();return data;}
    async function bossAction(action,entity,decision,payload={}){requireReady();if(!internalOrg||status.snapshot?.operations?.role!=='boss')fail('ACCESS_DENIED','Boss requis.');const {data,error}=await sdk.rpc('mir_boss_action',{org:internalOrg,action,entity,decision,payload});if(error)throw errorOf(error);await refresh();return data;}
    async function logisticsAction(action,entity=null,payload={}){requireReady();if(!internalOrg||!['warehouse','boss','admin'].includes(status.snapshot?.operations?.role))fail('ACCESS_DENIED','Accès entrepôt requis.');const {data,error}=await sdk.rpc('mir_logistics_action',{org:internalOrg,request_id:uuid(),action,entity,payload});if(error)throw errorOf(error);await refresh();return data;}
    async function adminLogisticsAction(action,entity=null,payload={}){requireReady();if(!internalOrg||status.snapshot?.operations?.role!=='admin')fail('ACCESS_DENIED','Admin requis.');const {data,error}=await sdk.rpc('mir_admin_logistics_action',{org:internalOrg,action,entity,payload});if(error)throw errorOf(error);await refresh();return data;}
    async function managementAction(action,entity=null,payload={}){requireReady();if(!internalOrg||!['assistant','boss','admin'].includes(status.snapshot?.operations?.role))fail('ACCESS_DENIED','Accès gestion requis.');const {data,error}=await sdk.rpc('mir_management_action',{org:internalOrg,action,entity,payload});if(error)throw errorOf(error);await refresh();return data;}
    async function boutiquePriceAction(item,format,action,newPriceCents=null,reason=null){requireReady();if(!internalOrg||!['assistant','boss','admin'].includes(status.snapshot?.operations?.role))fail('ACCESS_DENIED','Accès Prix boutique requis.');const {data,error}=await sdk.rpc('mir_boutique_price_action',{org:internalOrg,item,format:format||'',action,new_price_cents:newPriceCents,reason});if(error)throw errorOf(error);await refresh();return data;}
    async function punchAction(action,job=null,payload={}){requireReady();if(!internalOrg)fail('ACCESS_DENIED','Accès punch requis.');const id=uuid(),body={...payload,deviceId:payload.deviceId||'web'};try{const {data,error}=await sdk.rpc('mir_punch_action',{org:internalOrg,request_id:id,action,job,payload:body});if(error)throw errorOf(error);await refresh();return data;}catch(error){const settings=status.snapshot?.punch?.settings||{};if(!(settings.offlineEnabled??settings.offline_enabled)||!['in','out','switch','travel_start','travel_arrive'].includes(action))throw error;const queue=JSON.parse(localStorage.getItem('mir_punch_queue_v1')||'[]');queue.push({id,action,job,payload:{...body,source:'offline',originalAt:new Date().toISOString()}});localStorage.setItem('mir_punch_queue_v1',JSON.stringify(queue));return{ok:true,pending:true,serverAt:new Date().toISOString()};}}
    async function syncPunchQueue(){if(!internalOrg||!navigator.onLine)return 0;const queue=JSON.parse(localStorage.getItem('mir_punch_queue_v1')||'[]'),remaining=[];for(const item of queue){const {error}=await sdk.rpc('mir_punch_action',{org:internalOrg,request_id:item.id,action:item.action,job:item.job,payload:item.payload});if(error)remaining.push(item);}localStorage.setItem('mir_punch_queue_v1',JSON.stringify(remaining));if(queue.length!==remaining.length)await refresh();return queue.length-remaining.length;}
    async function punchCorrection(entity=null,payload={}){requireReady();const {data,error}=await sdk.rpc('mir_punch_correction',{org:internalOrg,correction:entity,payload});if(error)throw errorOf(error);await refresh();return data;}
    async function punchAdmin(action,payload={}){requireReady();const {data,error}=await sdk.rpc('mir_punch_admin',{org:internalOrg,action,payload});if(error)throw errorOf(error);await refresh();return data;}
    async function punchJournal(filters={},pageAfter=null,pageSize=25){requireReady();const {data,error}=await sdk.rpc('mir_punch_journal',{org:internalOrg,filters,page_size:pageSize,page_after:pageAfter});if(error)throw errorOf(error);return data;}
    async function timeBankRequest(entity=null,payload={}){requireReady();const {data,error}=await sdk.rpc('mir_time_bank_request',{org:internalOrg,request:entity,payload});if(error)throw errorOf(error);await refresh();return data;}
    // Phase3C help/support API begin.
    async function helpFAQ(){requireEnabled();const epoch=generation,{data,error}=await sdk.rpc(internalOrg?'mir_help_faq_scoped':'mir_help_faq',internalOrg?{org:internalOrg}:undefined);if(epoch!==generation)fail('SESSION_CHANGED','La session a changé.');if(error)throw errorOf(error);return Array.isArray(data)?data:[];}
    function requireSupport(){if(!status.user||!['ready','customer_ready'].includes(status.phase)||!internalOrg)fail('AUTH_REQUIRED','Connectez-vous pour ouvrir vos demandes.');return {epoch:generation,user:status.user.id};}
    async function supportSnapshot(){const guard=requireSupport(),staff=status.phase==='ready';const {data,error}=await sdk.rpc(staff?'mir_support_management_snapshot':'mir_client_center_snapshot_scoped',{org:internalOrg});if(guard.epoch!==generation||status.user?.id!==guard.user)fail('SESSION_CHANGED','La session a changé.');if(error)throw errorOf(error);return {...data,staff};}
    async function supportAction(action,entity=null,payload={}){const guard=requireSupport(),staff=status.phase==='ready',args=staff?{org:internalOrg,action,entity,payload}:{org:internalOrg,action,conversation:entity,payload};const {data,error}=await sdk.rpc(staff?'mir_support_management_action':'mir_client_support_action_scoped',args);if(guard.epoch!==generation||status.user?.id!==guard.user)fail('SESSION_CHANGED','La session a changé.');if(error)throw errorOf(error);return data;}
    async function supportUpload(file,conversation,message){const guard=requireSupport();if(status.phase!=='customer_ready'||!UUID.test(conversation||'')||!UUID.test(message||''))fail('UPLOAD_INVALID','Destination de soutien invalide.');const mime=String(file?.type||'').toLowerCase(),ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'}[mime],id=uuid();if(!ext||!file.size||file.size>15*1024*1024||!UUID.test(id||''))fail('UPLOAD_INVALID','Utilisez une photo ou un PDF de 15 Mo maximum.');const path=`${internalOrg}/${conversation}/${guard.user}/${id}.${ext}`,uploaded=await sdk.storage.from('mir-support').upload(path,file,{contentType:mime,upsert:false,cacheControl:'3600'});if(uploaded.error)throw errorOf(uploaded.error);try{await supportAction('attachment',conversation,{messageId:message,path,fileName:String(file.name||'fichier').slice(0,240),mimeType:mime,sizeBytes:file.size});}catch(error){await sdk.storage.from('mir-support').remove([path]).catch(()=>{});throw error;}return path;}
    async function supportFileURL(path){const guard=requireSupport(),parts=String(path||'').split('/');if(parts.length!==4||parts[0]!==internalOrg||!UUID.test(parts[1])||!UUID.test(parts[2])||!UUID.test(parts[3]?.split('.')[0]||''))fail('DOCUMENT_INVALID','Pièce jointe invalide.');const {data,error}=await sdk.storage.from('mir-support').download(path);if(error)throw errorOf(error);if(guard.epoch!==generation||status.user?.id!==guard.user)fail('SESSION_CHANGED','La session a changé.');if(!data?.size||data.size>15*1024*1024)fail('DOCUMENT_INVALID','Pièce jointe invalide.');return blobURLs.createObjectURL(data);}
    // Phase3C help/support API end.
    function dispose() {
      revokeChatURLs();
      disposed = true; generation++; authSubscription?.unsubscribe?.();
      globalThis.removeEventListener?.('online',onlinePunchSync);
      if (authTimer !== null && typeof clearTimeout === 'function') clearTimeout(authTimer);
      if (liveTimer !== null && typeof clearInterval === 'function') clearInterval(liveTimer);
      listeners.clear();
    }
    return Object.freeze({ config, start, refresh, sendEmail, signInGoogle, signInPassword,signUpClient,resetPassword,resendConfirmation,setPassword,saveAddress,removeAddress,completeCallback, signOut, command, retry,
      acceptInvitation, listInvitations, downloadPlan, openConversation, uploadInternal, internalPhotoURL, jobDossier, jobDocumentURL, leadAction, bossAction, logisticsAction, adminLogisticsAction, managementAction, boutiquePriceAction, punchAction, syncPunchQueue, punchCorrection, punchAdmin, punchJournal, timeBankRequest, dispose,
      chatConversations, chatMessages, chatSearch, validateMessageAttachment, ackChatMessage, chatFileURL, chatPhotoURL,
      helpFAQ, supportSnapshot, supportAction, supportUpload, supportFileURL,
      getStatus: () => ({ ...status }), subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); }
    });
  }
  return Object.freeze({ create, validateConfig, captureEntry, checkedSnapshot, commandSpec, stockFor, PortalError });
});
