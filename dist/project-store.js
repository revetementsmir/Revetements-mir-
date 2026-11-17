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
        if(window.MIRReconstructedRoofs)for(const roof of next.reconstructedRoofs||[]){if(MIRReconstructedRoofs.issues(roof,{confirm:roof.status!=='proposed'||next.reconstruction?.status!=='automatic-proposal'}).length||roof.levelId!==levelId||roof.buildingId!==buildingId||[roof,...(roof.extensions||[])].flatMap(r=>r.sources).some(s=>!inventory.views.some(v=>v.id===s.sourceViewId&&v.buildingId===buildingId&&v.kind==='elevation')))throw new Error('Toiture ou sources invalides.');}if(window.MIRLevelModel){for(const plane of next.observedPlanes||[])if((plane.status==='confirmed'||next.reconstruction?.status==='automatic-proposal')&&MIRLevelModel.observedPlaneIssues(plane,inventory,next,{confirm:plane.status==='confirmed'}).length)throw new Error('Murs observés ou mesures invalides.');for(const contour of next.contours||[])if((contour.status==='confirmed'||next.reconstruction?.status==='automatic-proposal')&&MIRLevelModel.validateDraft(contour,inventory,next,{confirm:contour.status==='confirmed'}).length)throw new Error('Contour ou mesures invalides.');next.wallPlanes=MIRLevelModel.wallsFor(next,inventory);}
        inventory.geometryVersion=1;inventory.levelStudio||={};inventory.levelStudio[buildingId]={activeLevelId:levelId};
        entry.updatedAt=new Date().toISOString();store.put(entry);saved=entry;
      }catch(e){problem=e;tx.abort();}};
      tx.oncomplete=()=>resolve(saved);tx.onabort=tx.onerror=()=>reject(problem||tx.error||new Error('Le niveau n’a pas pu être enregistré.'));
    });
    window.dispatchEvent(new CustomEvent('mir:project-active',{detail:{id:projectId}}));return alias(record);
  }
  const reconstructionStamp=inventory=>JSON.stringify({views:inventory.views.map(v=>[v.id,v.buildingId,v.levelId,v.direction,v.frame,v.calibration,v.evidence,v.payload?.drawingReadings]),levels:inventory.levels});
  async function saveReconstruction({projectId,buildingId,expectedStamp,result}){
    if(activeId()!==projectId||result.buildingId!==buildingId)throw Error('Le projet actif a changé.');
    const connection=await db(),record=await new Promise((resolve,reject)=>{
      const tx=connection.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),read=store.get(projectId);let saved,problem;
      read.onsuccess=()=>{try{
        const entry=read.result,inventory=entry?.planData?.viewInventory;
        if(activeId()!==projectId||inventory?.activeBuildingId!==buildingId||reconstructionStamp(inventory)!==expectedStamp)throw Error('Le projet a changé pendant le traitement. Vos choix sont conservés.');
        const next=JSON.parse(JSON.stringify(result));
        if(next.version!==1||!['partial-proposal','unresolved','preserved','cancelled'].includes(next.status)||!Array.isArray(next.reports))throw Error('Résultat de conversion invalide.');
        if(new Set(next.levels.map(l=>l.id)).size!==next.levels.length)throw Error('Niveaux dupliqués.');
        const exteriorIdsFor=levels=>levels.flatMap(l=>[...(l.exteriorElements||[]),...(l.wallZones||[]),...(l.reconstructedRoofs||[]).flatMap(r=>[r,...(r.extensions||[])])].map(e=>e.id));
        const exteriorIds=exteriorIdsFor(next.levels),preservedIds=new Set(exteriorIdsFor(inventory.levels.filter(l=>!next.levels.some(n=>n.id===l.id))));if(new Set(exteriorIds).size!==exteriorIds.length||exteriorIds.some(id=>preservedIds.has(id)))throw Error('Éléments extérieurs dupliqués.');
        for(const level of next.levels){
          const index=inventory.levels.findIndex(l=>l.id===level.id),old=inventory.levels[index];
          if(level.buildingId!==buildingId||old&&MIRReconstructionPipeline.protectedLevel(old))throw Error('Un niveau modifié est conservé.');
          for(const c of level.contours||[])if(c.status!=='proposed'||MIRLevelModel.validateDraft(c,inventory,level).length)throw Error('Contour proposé invalide.');
          for(const p of level.observedPlanes||[])if(p.status!=='proposed'||MIRLevelModel.observedPlaneIssues(p,inventory,level,{confirm:false}).length)throw Error('Murs proposés invalides.');
          for(const roof of level.reconstructedRoofs||[])if(roof.status!=='proposed'||MIRReconstructedRoofs.issues(roof,{confirm:false}).length||roof.levelId!==level.id||roof.buildingId!==buildingId||[roof,...(roof.extensions||[])].flatMap(r=>r.sources).some(s=>!inventory.views.some(v=>v.id===s.sourceViewId&&v.buildingId===buildingId&&v.kind==='elevation')))throw Error('Toiture proposée invalide.');
          if((level.exteriorElements?.length||level.wallZones?.length||level.reconstructedRoofs?.some(r=>r.entryAssembly))&&(!window.MIRStudioExterior||MIRStudioExterior.proposalIssues(level,inventory).length))throw Error('Éléments extérieurs proposés ou sources invalides.');
          const walls=MIRLevelModel.wallsFor(level,inventory,{includeProposed:true});
          if(MIRLevelModel.openingIssues(level.wallOpenings||[],walls).length)throw Error('Ouvertures proposées invalides.');
          level.geometryRevision=(old?.geometryRevision||0)+1;if(index<0)inventory.levels.push(level);else inventory.levels[index]=level;
        }
        const allWalls=next.levels.flatMap(l=>MIRLevelModel.wallsFor(l,inventory,{includeProposed:true}));if(MIRLevelModel.openingIssues(next.levels.flatMap(l=>l.wallOpenings||[]),allWalls).length)throw Error('Une ouverture est affectée à plusieurs surfaces.');
        entry.planData.automaticReconstruction||={};entry.planData.automaticReconstruction[buildingId]={version:1,status:next.status,reports:next.reports,at:new Date().toISOString(),complete:false};
        delete entry.planData.reconstructionRequest;inventory.geometryVersion=1;inventory.levelStudio||={};
        const first=next.levels.find(l=>l.contours?.length)||next.levels[0];if(first)inventory.levelStudio[buildingId]={activeLevelId:first.id};
        // Sources, manual edits, finishes and every other building/project stay
        // in the transaction's current record; no stale whole-project replace.
        entry.updatedAt=new Date().toISOString();store.put(entry);saved=entry;
      }catch(e){problem=e;tx.abort();}};
      tx.oncomplete=()=>resolve(saved);tx.onabort=tx.onerror=()=>reject(problem||tx.error||Error('Le modèle n’a pas pu être enregistré.'));
    });
    window.dispatchEvent(new CustomEvent('mir:project-active',{detail:{id:projectId}}));return alias(record);
  }
  const keys = (id,scope) => ({ studio: id ? `mir-plan-study-v2:${id}${scope?':'+scope:''}` : 'mir-plan-study-v2', takeoff: id ? `mir-takeoff-v1:${id}${scope?':'+scope:''}` : 'mir-takeoff-v1' });
  window.MIRProjectStore = Object.freeze({ getActive, get, activate, saveActive, saveLevelGeometry, saveReconstruction, reconstructionStamp, clearActive, list, activeId, keys, version: 1 });
})();
