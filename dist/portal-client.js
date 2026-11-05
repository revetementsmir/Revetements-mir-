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
    if (config.callbackPath !== '/chantier.html') fail('CONFIGURATION', 'Le retour de connexion doit être vérifié.');
    return { ...config, enabled: true, redirectTo: `${site.origin}/chantier.html` };
  }
  function captureEntry(href) {
    const url = new URL(href), query = url.searchParams, hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const rawInvitation = query.get('invitation') || hash.get('invitation');
    const invitationToken = /^[A-Za-z0-9_-]{43}$/.test(rawInvitation || '') ? rawInvitation : null;
    const code = query.get('code');
    let authCallback = null;
    if (code && code.length <= 2048) authCallback = { kind: 'code', code };
    else if (hash.get('access_token') && hash.get('refresh_token')) {
      const accessToken = hash.get('access_token'), refreshToken = hash.get('refresh_token');
      if (accessToken.length < 16000 && refreshToken.length < 4096)
        authCallback = { kind: 'implicit', accessToken, refreshToken };
    }
    const callbackError = query.has('error') || hash.has('error') || query.has('error_code') || hash.has('error_code') ||
      (!authCallback && ['code', 'token_hash', 'access_token', 'refresh_token'].some(key => query.has(key) || hash.has(key)));
    const sensitive = ['invitation', 'code', 'token_hash', 'type', 'access_token', 'refresh_token', 'expires_at', 'expires_in', 'token_type', 'provider_token', 'provider_refresh_token', 'error', 'error_code', 'error_description'];
    sensitive.forEach(key => { query.delete(key); hash.delete(key); });
    // Le site MIR principal n'expose jamais l'ancien mode démonstration.
    query.delete('demo');
    url.hash = hash.toString() ? `#${hash.toString()}` : '';
    return { cleanURL: url.href, invitationToken, authCallback, callbackError,
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
    let generation = 0, readSequence = 0, authSubscription = null, activePromise = null, authTimer = null, disposed = false;
    const storage = options.operationStorage;
    const logoutKey = `mir_portal_signed_out_${config.projectRef || 'disabled'}`;
    let logoutRequested = false;
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
      generation++; readSequence++;
      emit({ phase, user: null, snapshot: null, pending: null, busy: false, error }, 'auth');
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
      requireEnabled();
      if (logoutRequested) { clearIdentity(); return null; }
      if (activePromise) await activePromise.catch(() => {});
      if (logoutRequested) { clearIdentity(); return null; }
      let currentGeneration = generation; const sequence = ++readSequence;
      try {
        const user = await verifiedUser();
        if (!user) return null;
        if (currentGeneration !== generation || sequence !== readSequence || disposed) return null;
        if (status.user?.id && status.user.id !== user.id) {
          generation++; currentGeneration = generation; emit({ snapshot: null, pending: null }, 'auth');
        }
        const epoch = generation;
        emit({ user: { id: user.id, email: user.email || '' }, pending: readPending(user.id) });
        const { data, error } = await sdk.rpc('mir_portal_snapshot');
        if (epoch !== generation || sequence !== readSequence || disposed) return null;
        if (error) throw errorOf(error);
        const snapshot = checkedSnapshot(data, user.id);
        emit({ phase: 'ready', snapshot, error: null }, 'refresh');
        return snapshot;
      } catch (error) {
        if (currentGeneration !== generation || sequence !== readSequence || disposed) return null;
        const mapped = errorOf(error), denied = ['ACCESS_DENIED', 'ACTOR_INACTIVE', 'MEMBER_INACTIVE', 'MEMBERSHIP_REQUIRED', 'AUTH_REQUIRED', '42501'].includes(mapped.code);
        emit({ phase: denied ? 'access_denied' : 'error', snapshot: null, error: mapped }, 'refresh');
        throw mapped;
      }
    }
    async function start() {
      if (!sdk) { emit({}, 'start'); return null; }
      if (!authSubscription) {
        const subscription = sdk.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') { clearIdentity(); return; }
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
      return refresh();
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
    async function signInGoogle() {
      requireEnabled(); if (!config.googleEnabled) fail('GOOGLE_DISABLED', 'La connexion Google est en cours d’activation.');
      const { error } = await sdk.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: config.redirectTo } });
      if (error) throw errorOf(error);
    }
    async function completeCallback(callback) {
      requireEnabled();
      let response;
      if (callback?.kind === 'code') response = await sdk.auth.exchangeCodeForSession(callback.code);
      else if (callback?.kind === 'implicit') response = await sdk.auth.setSession({ access_token: callback.accessToken, refresh_token: callback.refreshToken });
      else fail('CALLBACK_INVALID', 'Ce lien de connexion ne peut pas être utilisé.');
      if (response.error) throw new PortalError('CALLBACK_INVALID', 'Ce lien est expiré ou ne peut plus être utilisé. Demandez un nouveau lien.');
      // Only a successful, explicitly confirmed login can resume this browser tab.
      // A late token refresh cannot undo the person's choice to sign out.
      setLogoutIntent(false);
      // A token or locally stored session never supplies the portal role.
      return refresh();
    }
    async function signOut() {
      requireEnabled(); setLogoutIntent(true); clearIdentity('signed_out');
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
        if (['INVITE_EMPLOYEE', 'REVOKE_INVITATION'].includes(operation.command)) {
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
    function dispose() {
      disposed = true; generation++; authSubscription?.unsubscribe?.();
      if (authTimer !== null && typeof clearTimeout === 'function') clearTimeout(authTimer);
      listeners.clear();
    }
    return Object.freeze({ config, start, refresh, sendEmail, signInGoogle, completeCallback, signOut, command, retry,
      acceptInvitation, listInvitations, downloadPlan, dispose,
      getStatus: () => ({ ...status }), subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); }
    });
  }
  return Object.freeze({ create, validateConfig, captureEntry, checkedSnapshot, commandSpec, stockFor, PortalError });
});
