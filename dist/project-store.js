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
  function alias(entry) {
    if (!entry) return null;
    const planData=entry.planData?.viewInventory&&window.MIRViewInventory&&window.MIRSheetDetection
      ?window.MIRViewInventory.adapt(entry.planData,window.MIRSheetDetection.volumeFrom):entry.planData;
    const takeoffSeed=planData?.viewInventory?{...entry.takeoffSeed,calibrations:Object.fromEntries(planData.faces.map(f=>[f.key,f.calibration||{referenceFt:null,anchors:[],verified:false}]))}:entry.takeoffSeed;
    return { ...entry, planData, takeoffSeed, projectData: planData, takeoffData: takeoffSeed };
  }
  function activeId() { try { return localStorage.getItem(ACTIVE) || null; } catch (_) { return null; } }
  async function getActive() { const id = activeId(); return id ? alias(await request('readonly', store => store.get(id))) : null; }
  async function get(id) { if (!/^pdf-[a-zA-Z0-9-]{6,100}$/.test(id || '')) return null; return alias(await request('readonly', store => store.get(id))); }
  async function saveActive(entry) {
    const faces = entry?.planData?.faces, keys = Array.isArray(faces) ? faces.map(f => f?.key) : [];
    if (!entry || !/^pdf-[a-zA-Z0-9-]{6,100}$/.test(entry.id || '') || keys.length !== 4 || new Set(keys).size !== 4 || !['front', 'right', 'back', 'left'].every(key => keys.includes(key)) || !entry.takeoffSeed) throw new Error('Le dossier importé est incomplet.');
    const inventory=entry.planData.viewInventory;
    if(inventory){
      const buildings=new Set(inventory.buildings?.map(b=>b.id)),views=inventory.views||[];
      if(inventory.schema!=='mir-view-inventory'||inventory.version!==1||!views.length||new Set(views.map(v=>v.id)).size!==views.length||views.some(v=>v.buildingId&&!buildings.has(v.buildingId))||!buildings.has(inventory.activeBuildingId))throw new Error('Confirmez le bâtiment et les vues avant l’enregistrement.');
      for(const [building,slots]of Object.entries(inventory.rendererSelections||{}))for(const [direction,id]of Object.entries(slots))if(id&&!views.some(v=>v.id===id&&v.buildingId===building&&v.direction===direction))throw new Error('Une vue doit être associée à son bâtiment et à sa direction.');
    }
    const { projectData, takeoffData, ...record } = entry;
    await request('readwrite', store => store.put(record));
    try { localStorage.setItem(ACTIVE, entry.id); } catch (_) { throw new Error('Le PDF est conservé, mais ce navigateur bloque la sélection du projet actif.'); }
    window.dispatchEvent(new CustomEvent('mir:project-active', { detail: { id: entry.id } })); return alias(record);
  }
  async function clearActive() { try { localStorage.removeItem(ACTIVE); } catch (_) {} window.dispatchEvent(new CustomEvent('mir:project-active', { detail: { id: null } })); }
  async function list() { const rows = await request('readonly', store => store.getAll()); return rows.map(e => ({ id: e.id, title: e.planData?.title, filename: e.source?.filename, createdAt: e.createdAt })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); }
  async function activate(id) { const entry = await get(id); if (!entry) throw new Error('Ce projet n’est plus disponible sur cet appareil.'); return saveActive(entry); }
  async function saveLevelGeometry({projectId,buildingId,levelId,expectedRevision,level}){
    if(activeId()!==projectId||level.id!==levelId||level.buildingId!==buildingId)throw new Error('Le projet actif a changé. Votre brouillon est conservé dans cette fenêtre.');
    const connection=await db();
    const record=await new Promise((resolve,reject)=>{
      const tx=connection.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),read=store.get(projectId);let saved,problem;
      read.onsuccess=()=>{try{
        const entry=read.result,inventory=entry?.planData?.viewInventory;
        if(!inventory||!inventory.buildings.some(b=>b.id===buildingId))throw new Error('Bâtiment introuvable.');
        const index=inventory.levels.findIndex(l=>l.id===levelId),current=inventory.levels[index];
        if((current?current.geometryRevision||0:null)!==expectedRevision)throw new Error('Ce niveau a changé dans une autre fenêtre. Rechargez avant de réappliquer votre brouillon.');
        const next=JSON.parse(JSON.stringify(level));next.geometryRevision=(expectedRevision||0)+1;
        if(index<0)inventory.levels.push(next);else inventory.levels[index]=next;
        if(window.MIRReconstructedRoofs)for(const roof of next.reconstructedRoofs||[]){if(MIRReconstructedRoofs.issues(roof).length||roof.levelId!==levelId||roof.buildingId!==buildingId||[roof,...(roof.extensions||[])].flatMap(r=>r.sources).some(s=>!inventory.views.some(v=>v.id===s.sourceViewId&&v.buildingId===buildingId&&v.kind==='elevation')))throw new Error('Toiture ou sources invalides.');}if(window.MIRLevelModel){for(const plane of next.observedPlanes||[])if(plane.status==='confirmed'&&MIRLevelModel.observedPlaneIssues(plane,inventory,next).length)throw new Error('Murs observés ou mesures invalides.');for(const contour of next.contours||[])if(contour.status==='confirmed'&&MIRLevelModel.validateDraft(contour,inventory,next,{confirm:true}).length)throw new Error('Contour ou mesures invalides.');next.wallPlanes=MIRLevelModel.wallsFor(next,inventory);}
        inventory.geometryVersion=1;inventory.levelStudio||={};inventory.levelStudio[buildingId]={activeLevelId:levelId};
        entry.updatedAt=new Date().toISOString();store.put(entry);saved=entry;
      }catch(e){problem=e;tx.abort();}};
      tx.oncomplete=()=>resolve(saved);tx.onabort=tx.onerror=()=>reject(problem||tx.error||new Error('Le niveau n’a pas pu être enregistré.'));
    });
    window.dispatchEvent(new CustomEvent('mir:project-active',{detail:{id:projectId}}));return alias(record);
  }
  const keys = (id,scope) => ({ studio: id ? `mir-plan-study-v2:${id}${scope?':'+scope:''}` : 'mir-plan-study-v2', takeoff: id ? `mir-takeoff-v1:${id}${scope?':'+scope:''}` : 'mir-takeoff-v1' });
  window.MIRProjectStore = Object.freeze({ getActive, get, activate, saveActive, saveLevelGeometry, clearActive, list, activeId, keys, version: 1 });
})();
