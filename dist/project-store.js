/* PDF sources remain in this browser. Nothing is sent to an inference service. */
(function () {
  'use strict';
  const DB = 'mir-projects-v1', STORE = 'projects', ACTIVE = 'mir-active-project-v1';
  let opening;
  function db() {
    if (!window.indexedDB) return Promise.reject(new Error('Ce navigateur ne permet pas de conserver les projets.'));
    if (!opening) opening = new Promise((resolve, reject) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' }); r.onsuccess = () => resolve(r.result); r.onerror = () => { opening = null; reject(r.error || new Error('Le stockage des projets est indisponible.')); }; r.onblocked = () => reject(new Error('Fermez l’autre onglet du studio, puis réessayez.')); });
    return opening;
  }
  async function request(mode, operation) { const connection = await db(); return new Promise((resolve, reject) => { const tx = connection.transaction(STORE, mode), req = operation(tx.objectStore(STORE)); let result; req.onsuccess = () => { result = req.result; }; tx.oncomplete = () => resolve(result); tx.onerror = tx.onabort = () => reject(tx.error || req.error || new Error('Le projet n’a pas pu être enregistré.')); }); }
  function alias(entry) { if (!entry) return null; return { ...entry, projectData: entry.planData, takeoffData: entry.takeoffSeed }; }
  function activeId() { try { return localStorage.getItem(ACTIVE) || null; } catch (_) { return null; } }
  async function getActive() { const id = activeId(); return id ? alias(await request('readonly', store => store.get(id))) : null; }
  async function get(id) { if (!/^pdf-[a-zA-Z0-9-]{6,100}$/.test(id || '')) return null; return alias(await request('readonly', store => store.get(id))); }
  async function saveActive(entry) {
    const faces = entry?.planData?.faces, keys = Array.isArray(faces) ? faces.map(f => f?.key) : [];
    if (!entry || !/^pdf-[a-zA-Z0-9-]{6,100}$/.test(entry.id || '') || keys.length !== 4 || new Set(keys).size !== 4 || !['front', 'right', 'back', 'left'].every(key => keys.includes(key)) || !entry.takeoffSeed) throw new Error('Le dossier importé est incomplet.');
    const { projectData, takeoffData, ...record } = entry;
    await request('readwrite', store => store.put(record));
    try { localStorage.setItem(ACTIVE, entry.id); } catch (_) { throw new Error('Le PDF est conservé, mais ce navigateur bloque la sélection du projet actif.'); }
    window.dispatchEvent(new CustomEvent('mir:project-active', { detail: { id: entry.id } })); return alias(record);
  }
  async function clearActive() { try { localStorage.removeItem(ACTIVE); } catch (_) {} window.dispatchEvent(new CustomEvent('mir:project-active', { detail: { id: null } })); }
  async function list() { const rows = await request('readonly', store => store.getAll()); return rows.map(e => ({ id: e.id, title: e.planData?.title, filename: e.source?.filename, createdAt: e.createdAt })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); }
  async function activate(id) { const entry = await get(id); if (!entry) throw new Error('Ce projet n’est plus disponible sur cet appareil.'); return saveActive(entry); }
  const keys = id => ({ studio: id ? `mir-plan-study-v2:${id}` : 'mir-plan-study-v2', takeoff: id ? `mir-takeoff-v1:${id}` : 'mir-takeoff-v1' });
  window.MIRProjectStore = Object.freeze({ getActive, get, activate, saveActive, clearActive, list, activeId, keys, version: 1 });
})();
