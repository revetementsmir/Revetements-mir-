/* MIR — browser-local architectural panel layout. Dimensions are authoritative;
 * imported PDF pixels are references, never a substitute for a confirmed cote. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), M = window.MIRProduction, E = window.MIRPanelLayout, O = window.MIRPanelLayoutOutput, A = window.MIRArchitecturalInput, V = window.MIRArchitecturalWallView;
  const clone = v => JSON.parse(JSON.stringify(v)), finite = Number.isFinite;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => 'zone-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
  const parse = v => { const p = M.parseMeasurement(v, 'in'); return p.ok ? p.value : null; };
  const val = n => finite(n) ? String(n) : '';
  const number = n => new Intl.NumberFormat('fr-CA', {maximumFractionDigits:4}).format(n);
  const inch = n => {
    if (!finite(n)) return 'À préciser';
    const s = M.formatMeasurement(n * 25.4, 'in');
    if (Math.abs(n * 16 - Math.round(n * 16)) < 1e-7) return s.replace(/(\d+) (1\/2|1\/4|3\/4|1\/8|3\/8|5\/8|7\/8)/g, (_,w,f) => w + ({'1/2':'½','1/4':'¼','3/4':'¾','1/8':'⅛','3/8':'⅜','5/8':'⅝','7/8':'⅞'}[f]));
    if(n>=0&&Math.abs(n*64-Math.round(n*64))<1e-7){const whole=Math.floor(n);let numerator=Math.round((n-whole)*64),denominator=64;while(numerator&&numerator%2===0){numerator/=2;denominator/=2;}return (whole?whole+' ':'')+numerator+'/'+denominator+' po';}
    return (Math.abs(n * 1e4 - Math.round(n * 1e4)) > 1e-6 ? '≈ ' : '') + number(n) + ' po';
  };
  const svgLine = (x1,y1,x2,y2,attrs='') => '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" '+attrs+'/>';
  const svgText = (x,y,t,attrs='') => '<text x="'+x+'" y="'+y+'" '+attrs+'>'+esc(t)+'</text>';
  let workspace = {schema:'mir-panel-layout-workspace-1', zones:[], activeId:null}, layout, selected=null, history=[], view='zone', tool='select', zoom=1, drag=null, calibrationPoints=[], calibrationValue=null, transform=null;
  let pdfSession=null, pdfId=null, pdfSequence=0, dbPromise, saveTimer, saveChain=Promise.resolve(), saveSequence=0, toastTimer, exporting=false, ready=false;
  let outlineDraft=[], outlineCursor=null, outlineOrthogonal=false, outlineRightAngle=false, wallYaw=-24, wallPitch=12;
  const DB='mir-panel-layout-v1';
  function database() {
    if (!window.indexedDB) return Promise.reject(new Error('Le stockage local est indisponible. Sauvegardez votre dossier JSON.'));
    if (!dbPromise) dbPromise=new Promise((resolve,reject) => {
      const req=indexedDB.open(DB,1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('drafts'))db.createObjectStore('drafts');if(!db.objectStoreNames.contains('files'))db.createObjectStore('files');};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>{dbPromise=null;reject(req.error);};
      req.onblocked=()=>reject(new Error('Fermez les autres onglets du calculateur pour activer la sauvegarde.'));
    });
    return dbPromise;
  }
  async function dbRequest(store,mode,key,value) {
    const db=await database();
    return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode),s=tx.objectStore(store),r=mode==='readonly'?s.get(key):s.put(value,key);let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||r.error||new Error('Sauvegarde impossible.'));});
  }
  function blankZone(index) {
    return {id:uid(),name:'Zone '+index,revision:1,values:{width:'',height:'',lip:'',columns:4,rows:2,mode:'equal',precision:'0',clearLeft:'0',clearRight:'0',clearTop:'0',clearBottom:'0'},rules:{},source:null,dimensionSource:'manual',confirmed:false,notes:'',meta:{project:'',poNumber:'',projection:'',perforation:'',material:'',thickness:'',color:'',customColor:''}};
  }
  const zone=()=>workspace.zones.find(z=>z.id===workspace.activeId)||workspace.zones[0];
  function snapshot() { history.push(clone(workspace)); if(history.length>10)history.shift(); $('#undo').disabled=!history.length; }
  function scheduleSave() {
    if(!ready)return; clearTimeout(saveTimer);const seq=++saveSequence;
    $('#save-state').textContent='Enregistrement…';
    saveTimer=setTimeout(()=>{const data=clone(workspace);saveChain=saveChain.catch(()=>{}).then(()=>dbRequest('drafts','readwrite','workspace',data)).then(()=>{if(seq===saveSequence)$('#save-state').textContent='Enregistré sur cet appareil';}).catch(()=>{if(seq===saveSequence)$('#save-state').textContent='Sauvegarde indisponible · exportez le JSON';});},180);
  }

  // A section may be sketched before its survey dimensions are known.
  // Only dimension entry turns relative sketch proportions into authoritative inches.
  function materializeSketch(z) {
    const ratios=z.shape?.sketchRatios,d=dimensions(z);
    if(!Array.isArray(ratios)||!(d.width>0&&d.height>0))return false;
    if(ratios.length<3||ratios.length>64||ratios.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!finite(n)||n<0||n>1)))return false;
    z.shape={type:'free',pointsIn:ratios.map(p=>[p[0]*d.width,p[1]*d.height])};
    return true;
  }
  function commit(fn,options={}) {
    snapshot();fn(zone());materializeSketch(zone());zone().revision++;if(options.invalidate!==false)zone().confirmed=false;
    if(options.clearAxes){for(const axis of options.clearAxes===true?['x','y']:options.clearAxes)delete zone().rules[axis+'AxesIn'];}
    scheduleSave();render();
  }
  function toast(message) { $('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),5000); }
  function gaps(z=zone()) { return {left:parse(z.values.clearLeft),right:parse(z.values.clearRight),top:parse(z.values.clearTop),bottom:parse(z.values.clearBottom)}; }
  function dimensions(z=zone()) { const g=gaps(z),width=parse(z.values.width),height=parse(z.values.height);return {width,height,g,usableWidth:finite(width)&&finite(g.left)&&finite(g.right)?width-g.left-g.right:null,usableHeight:finite(height)&&finite(g.top)&&finite(g.bottom)?height-g.top-g.bottom:null}; }
  function wallGeometry(z=zone()) {
    const d=dimensions(z),s=z.shape||{type:'rectangle'};
    if(A)return A.prepare({widthIn:d.width,heightIn:d.height,clearances:d.g,shape:{type:s.type||'rectangle',leftHeightIn:parse(s.leftHeight),rightHeightIn:parse(s.rightHeight),peakXIn:parse(s.peakX),pointsIn:Array.isArray(s.pointsIn)?s.pointsIn:Array.isArray(s.sketchRatios)&&d.width>0&&d.height>0?s.sketchRatios.map(p=>[p[0]*d.width,p[1]*d.height]):undefined}});
    // Preserve legacy rectangular drafts when the optional outline component
    // is unavailable; never silently replace an authored contour by a rectangle.
    if(s.type&&s.type!=='rectangle')return {ok:false,errors:[{message:'Le module de contour n’a pas chargé. Rechargez la page.'}]};
    return {ok:true,type:'rectangle',measuredWidthIn:d.width,measuredHeightIn:d.height,widthIn:d.usableWidth,heightIn:d.usableHeight,measuredPointsIn:[[0,0],[d.width,0],[d.width,d.height],[0,d.height]],clearances:d.g};
  }
  function measuredPoints(z=zone()) {
    if(z.shape?.type==='free'&&Array.isArray(z.shape.pointsIn))return z.shape.pointsIn;
    const ratios=z.shape?.sketchRatios,d=dimensions(z);
    if(Array.isArray(ratios)&&d.width>0&&d.height>0)return ratios.map(p=>[p[0]*d.width,p[1]*d.height]);
    return wallGeometry(z).measuredPointsIn||[];
  }
  function compute(z=zone()) {
    const d=dimensions(z),errors=[];
    if(Object.values(d.g).some(n=>n===null||n<0))errors.push({message:'Les jeux de pose doivent être des mesures positives ou zéro.'});
    if(finite(d.width)&&d.width<=0||finite(d.height)&&d.height<=0)errors.push({message:'La largeur et la hauteur de la zone doivent être positives.'});
    if(finite(d.usableWidth)&&d.usableWidth<=0||finite(d.usableHeight)&&d.usableHeight<=0)errors.push({message:'Les jeux de pose occupent toute la zone.'});
    const cfg={...clone(z.rules),widthIn:d.usableWidth,heightIn:d.usableHeight,lipIn:parse(z.values.lip),columns:Number(z.values.columns),rows:Number(z.values.rows),mode:z.values.mode,precisionIn:Number(z.values.precision)};
    const wall=wallGeometry(z);
    delete cfg.contourIn;
    if(!wall.ok)errors.push(...wall.errors);
    else if(wall.type!=='rectangle')cfg.contourIn=wall.contourIn;
    if(errors.length)return {ok:false,errors,warnings:[],config:cfg};
    return E.build(cfg);
  }
  function configFromResult(result) {
    if(!result.ok){toast(result.errors?.map(e=>e.message).join(' ')||'Cette modification ne peut pas respecter les cotes.');renderInspector();return false;}
    commit(z=>{z.rules=clone(result.config);}, {invalidate:false});return true;
  }
  const controls={width:'zone-width',height:'zone-height',lip:'lip',columns:'columns',rows:'rows',mode:'distribution',precision:'precision',clearLeft:'clear-left',clearRight:'clear-right',clearTop:'clear-top',clearBottom:'clear-bottom'};
  const metadataControls={project:'project-name',poNumber:'po-number',projection:'projection',perforation:'perforation',material:'panel-material',thickness:'panel-thickness',color:'panel-color',customColor:'custom-color'};
  function colorOptions(z=zone()) {
    const material=z.meta.material,gauge=Number(z.meta.thickness);
    return (window.MIRUnico?.palettes||[]).filter(p=>p.materialId===material).flatMap(p=>p.colors.filter(c=>!c.publishedGauges||!gauge||material!=='acier'||c.publishedGauges.includes(gauge)).map(c=>({...c,paletteId:p.id,paletteLabel:p.label,choiceId:p.id+':'+(c.id||c.code||c.name),sourceUrl:c.sourceUrl||p.sourceUrl})));
  }
  function renderMaterial() {
    const z=zone(),type=z.meta.material,th=$('#panel-thickness');
    const choices=type==='aluminium'?[['2','2 mm'],['3.2','3,2 mm']]:type==='acier'?[['18','18 ga'],['20','20 ga'],['22','22 ga']]:type==='aluminium-extrude'?[['2','2 mm'],['3','3 mm']]:[];
    th.innerHTML='<option value="">À préciser</option>'+choices.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('');th.value=z.meta.thickness;
    const colors=colorOptions();$('#panel-color').innerHTML='<option value="">À préciser</option>'+colors.map(c=>'<option value="'+esc(c.choiceId)+'">'+esc(c.name+(c.code?' · '+c.code:''))+'</option>').join('')+'<option value="custom">Couleur personnalisée · soumission</option>';
    $('#panel-color').value=z.meta.color;$('#custom-color-field').hidden=z.meta.color!=='custom';$('#custom-color').value=z.meta.customColor;
    const c=colors.find(c=>c.choiceId===z.meta.color);
    $('#finish-note').textContent=z.meta.color==='custom'?'Couleur personnalisée : soumission obligatoire, sans prix automatique.':c?(c.uP1Compatibility?.note||c.availabilityNote||'Disponibilité sur ce profil à confirmer.')+' La référence du fabricant suit la pièce.':'Choisissez la finition ici ou complétez-la dans le dossier de production.';
  }
  function renderControls() {
    const z=zone();$('#zone-select').innerHTML=workspace.zones.map(q=>'<option value="'+esc(q.id)+'">'+esc(q.name)+'</option>').join('');$('#zone-select').value=z.id;
    $('#zone-name').value=z.name;for(const [key,id] of Object.entries(controls))$('#'+id).value=z.values[key];
    for(const [key,id] of Object.entries(metadataControls))if(!['thickness','color'].includes(key))$('#'+id).value=z.meta[key]??'';
    $('#dimensions-confirmed').checked=z.confirmed;$('#zone-notes').value=z.notes;$('#canvas-title').textContent=z.name;$('#revision-label').textContent='Révision '+z.revision;
    $('#dimension-source').textContent=z.dimensionSource==='scale'?'Dimensions relevées à l’échelle du PDF · à vérifier sur les cotes.':z.dimensionSource==='example'?'Exemple de travail · lips de 1 po à titre d’illustration.':z.dimensionSource==='pitch'?'Hauteur de pointe calculée selon la pente · à vérifier sur le chantier.':'Cotes exactes saisies · prioritaires sur le relevé du PDF.';
    $('#blank-source').hidden=!z.source;$('#pdf-options').hidden=!z.source;$('#view-plan').disabled=!z.source;
    $('#source-name').textContent=z.source?(z.source.fileName+' · page '+z.source.pageNumber):'Dessinez une zone ou entrez ses dimensions.';
    if(z.source) {
      const s=z.source;$('#pdf-page').innerHTML=Array.from({length:s.pageCount||1},(_,i)=>'<option value="'+(i+1)+'">Page '+(i+1)+'</option>').join('');$('#pdf-page').value=String(s.pageNumber);$('#pdf-page').disabled=!pdfSession||pdfId!==s.pdfId;
      $('#pdf-cote').innerHTML='<option value="">'+(s.scaleInPerPx?'Échelle actuellement retenue':'Choisir une cote repérée')+'</option>'+(s.candidates||[]).map((c,i)=>'<option value="'+i+'">'+esc(c.text||c.normalized||'Cote '+(i+1))+'</option>').join('');
      $('#scale-status').textContent=s.scaleInPerPx?(s.scaleLabel||'Échelle proposée à vérifier')+' · '+number(s.scaleInPerPx)+' po/pixel.':'Échelle inconnue. Entrez vos cotes exactes ou indiquez une distance entre deux points.';
      $('#measure-scale').disabled=!s.scaleInPerPx||!s.box;
    }
    renderMaterial();
    renderWallControls();
  }
  function renderWallControls() {
    const z=zone(),d=dimensions(z),s=z.shape||{type:'rectangle'},type=s.type||'rectangle';
    $('#total-gap-width').value=finite(d.g.left)&&finite(d.g.right)?val(d.g.left+d.g.right):'';
    $('#total-gap-height').value=finite(d.g.top)&&finite(d.g.bottom)?val(d.g.top+d.g.bottom):'';
    $('#net-dimensions').innerHTML=d.width>0&&d.height>0&&d.usableWidth>0&&d.usableHeight>0?'<div>Largeur : '+inch(d.width)+' − '+inch(d.g.left+d.g.right)+' = <strong>'+inch(d.usableWidth)+'</strong></div><div>Hauteur : '+inch(d.height)+' − '+inch(d.g.top+d.g.bottom)+' = <strong>'+inch(d.usableHeight)+'</strong></div>':'Entrez vos mesures chantier et un lousse valide.';
    $('#wall-shape').value=type;$('#wall-preset-fields').hidden=!['gable','slope'].includes(type);$('#wall-free-fields').hidden=type!=='free';$('#wall-peak-field').hidden=type!=='gable';$('#center-peak').hidden=type!=='gable';
    $('#wall-left-height').value=s.leftHeight??'';$('#wall-right-height').value=s.rightHeight??'';$('#wall-peak-x').value=s.peakX??'';
    const eave=parse(s.leftHeight), rise=d.height-eave, peakX=parse(s.peakX);
    const commonEave=type==='gable'&&peakX>0&&peakX<d.width&&finite(eave)&&finite(d.height)&&rise>0&&eave===parse(s.rightHeight);
    let pitchResult='';
    if(commonEave){
      const angle=run=>number(Math.atan2(rise,run)*180/Math.PI)+'°';
      const angles=peakX===d.width/2?angle(peakX):'gauche '+angle(peakX)+' · droite '+angle(d.width-peakX);
      pitchResult='Montée '+inch(rise)+' · hauteur de pointe '+inch(d.height)+' · '+angles+'.';
    }
    $('#roof-pitch-result').textContent=pitchResult;
    $('#wall-gap-method').hidden=type==='rectangle'||!(d.g.left+d.g.right+d.g.top+d.g.bottom>0);
    const points=measuredPoints(),old=Number($('#wall-vertex').value)||0,index=Math.min(old,Math.max(0,points.length-1));
    $('#wall-vertex').innerHTML=points.map((p,i)=>'<option value="'+i+'">Sommet '+(i+1)+'</option>').join('');$('#wall-vertex').value=String(index);
    $('#vertex-x').value=points[index]?val(points[index][0]):'';$('#vertex-height').value=points[index]?val(d.height-points[index][1]):'';
    const waiting=Array.isArray(s.sketchRatios)&&!(d.width>0&&d.height>0);
    $('#apply-vertex').disabled=!points.length||waiting;
    $('#wall-coordinate-list').innerHTML=waiting?
      '<p class="hint mir-wall-unmeasured">La forme est enregistrée sans mesure inventée. Entrez largeur et hauteur réelles avant de régler les sommets.</p>':
      points.map((p,i)=>'<div><strong>'+wallLetter(i)+'</strong><span>X '+inch(p[0])+' · H '+inch(d.height-p[1])+'</span></div>').join('');
  }
  function renderSummary() {
    const z=zone(),valid=layout.ok,d=dimensions(z),errors=layout.errors||[];
    const started=z.values.width!==''&&z.values.height!==''&&z.values.lip!=='';
    $('#calculation-errors').hidden=valid||!started;$('#calculation-errors').innerHTML='<ul>'+errors.map(e=>'<li>'+esc(e.message)+'</li>').join('')+'</ul>';
    const warnings=(layout.warnings||[]).map(w=>typeof w==='string'?w:w.message);
    if(z.source?.box&&d.width>0&&d.height>0){const b=z.source.box,ratio=b[2]*z.source.widthPx/(b[3]*z.source.heightPx),expected=d.width/d.height;if(Math.abs(ratio/expected-1)>.06)warnings.push('Le rectangle tracé et les cotes saisies ont des proportions différentes. Vérifiez les repères sur le plan; les cotes saisies restent prioritaires.');}
    $('#calculation-warnings').hidden=!warnings.length;$('#calculation-warnings').innerHTML='<ul>'+warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>';
    $('#layout-summary').innerHTML=valid?'<div><strong>'+layout.pieces.length+'</strong><span>PANNEAUX À FABRIQUER</span></div><div><strong>'+number((layout.checks.zoneAreaSqIn??layout.widthIn*layout.heightIn)/144)+'</strong><span>PI² ASSEMBLÉS</span></div><div><strong>'+inch(layout.lipIn)+'</strong><span>RECOUVREMENT PAR JOINT</span></div>':'<div><strong>—</strong><span>VOTRE ZONE</span></div><div><strong>'+z.values.columns+' × '+z.values.rows+'</strong><span>RÉPARTITION SOUHAITÉE</span></div><div><strong>—</strong><span>DIMENSIONS À RENSEIGNER</span></div>';
    $('#closure-proof').innerHTML=valid?'Largeur : '+inch(layout.columnWidthsIn.reduce((a,b)=>a+b,0))+' − '+(layout.columns-1)+' × '+inch(layout.lipIn)+' = <strong>'+inch(layout.widthIn)+'</strong><br>Hauteur : '+inch(layout.rowHeightsIn.reduce((a,b)=>a+b,0))+' − '+(layout.rows-1)+' × '+inch(layout.lipIn)+' = <strong>'+inch(layout.heightIn)+'</strong>':'Les dimensions assemblées seront vérifiées ici.';
    $('#distribution-note').textContent=valid&&z.values.mode==='equal'&&(!layout.checks.equalColumns||!layout.checks.equalRows)?'Certaines dimensions diffèrent après ajustement. La largeur et la hauteur assemblées restent exactes.':'';
    $('#piece-count').textContent=valid?layout.pieces.length+' panneaux · mêmes repères en production':'Liste des panneaux';
    $('#piece-table').innerHTML=valid?layout.pieces.map(p=>'<tr class="'+(selected?.type==='piece'&&selected.id===p.id?'selected':'')+'"><td><button data-table-piece="'+p.id+'">'+p.id+'</button></td><td>Rangée '+(p.row+1)+' · colonne '+(p.col+1)+'</td><td>'+inch(p.widthIn)+'</td><td>'+inch(p.heightIn)+'</td><td>'+inch(layout.lipIn)+'</td><td>1</td></tr>').join(''):'<tr><td colspan="6">Entrez les dimensions et la largeur du lip pour calculer les panneaux.</td></tr>';
    $('#export-site').disabled=!valid||exporting;$('#send-production').disabled=!valid||exporting;$('#undo').disabled=!history.length;
    const contour=valid?(layout.config.contourIn||[[0,0],[layout.widthIn,0],[layout.widthIn,layout.heightIn],[0,layout.heightIn]]):[];
    $('#wall-edge-list').innerHTML=valid?'<p class="hint">Contour utile après lousse · '+inch(layout.widthIn)+' × '+inch(layout.heightIn)+'. Angles mesurés dans le plan.</p><div class="table-wrap"><table><thead><tr><th>Côté du contour</th><th>Longueur réelle</th><th>Angle intérieur au départ</th></tr></thead><tbody>'+polygonMeasures(contour).map((e,i)=>'<tr><td><button type="button" data-wall-edge="'+i+'" aria-label="Modifier le sommet du côté '+wallLetter(i)+'–'+wallLetter((i+1)%contour.length)+'">'+wallLetter(i)+'–'+wallLetter((i+1)%contour.length)+'</button></td><td>'+inch(e.length)+'</td><td>'+number(e.angle)+'°</td></tr>').join('')+'</tbody></table></div>':'Entrez des mesures valides pour calculer le contour.';
  }
  function renderInspector() {
    const valid=layout.ok,p=valid&&selected?.type==='piece'?layout.pieces.find(p=>p.id===selected.id):null,j=valid&&selected?.type==='joint'?selected:null;
    $('#piece-inspector').hidden=!p;$('#joint-inspector').hidden=!j;
    if(p){const shaped=!!layout.config.contourIn;$('#selection-title').textContent=p.id;$('#selection-help').textContent='Rangée '+(p.row+1)+' · colonne '+(p.col+1)+(shaped?' · pièce découpée au contour':'');$('#piece-width-label').textContent=shaped?'Gabarit de colonne hors tout (po)':'Largeur hors tout (po)';$('#piece-height-label').textContent=shaped?'Gabarit de rangée hors tout (po)':'Hauteur hors tout (po)';$('#piece-width').value=val(shaped?layout.columnWidthsIn[p.col]:p.widthIn);$('#piece-height').value=val(shaped?layout.rowHeightsIn[p.row]:p.heightIn);$('#piece-width-lock').checked=layout.config.widthLocks?.[p.col]!=null;$('#piece-height-lock').checked=layout.config.heightLocks?.[p.row]!=null;}
    else if(j){const axes=j.axis==='x'?layout.xAxesIn:layout.yAxesIn;if(j.index>=axes.length){selected=null;return renderInspector();}$('#selection-title').textContent='Joint '+(j.axis==='x'?'vertical ':'horizontal ')+(j.index+1);$('#selection-help').textContent=j.axis==='x'?'Cote depuis la gauche de la zone utile.':'Cote depuis le haut de la zone utile.';$('#joint-position').value=val(axes[j.index]);$('#joint-lock').checked=(j.axis==='x'?layout.config.xLocks:layout.config.yLocks)?.[j.index]!=null;}
    else{$('#selection-title').textContent='Votre panneau';$('#selection-help').textContent='Cliquez sur une pièce pour régler ses dimensions.';}
    renderPieceMeasures(p);
  }
  function piecePolygon(p) { return p.polygonIn||[[p.xIn,p.yIn],[p.xIn+p.widthIn,p.yIn],[p.xIn+p.widthIn,p.yIn+p.heightIn],[p.xIn,p.yIn+p.heightIn]]; }
  function polygonMeasures(points) {
    const area2=points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-q[0]*p[1];},0),winding=Math.sign(area2)||1;
    return points.map((p,i)=>{const prev=points[(i+points.length-1)%points.length],q=points[(i+1)%points.length],a=[p[0]-prev[0],p[1]-prev[1]],b=[q[0]-p[0],q[1]-p[1]],turn=Math.atan2(a[0]*b[1]-a[1]*b[0],a[0]*b[0]+a[1]*b[1]);return {length:Math.hypot(...b),angle:180-winding*turn*180/Math.PI,inclination:Math.atan2(-b[1],b[0])*180/Math.PI};});
  }

  function wallLetter(i) {
    let n=i+1,s='';do{n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}while(n>0);return s;
  }
  function wallEdgeAnnotations(points,{closed=false,measured=false,span=1000}={}) {
    if(!Array.isArray(points)||!points.length)return '';
    const size=Math.max(1.7,Math.min(16,span/75)),end=closed?points.length:Math.max(0,points.length-1),
      bends=closed&&points.length>=3?polygonMeasures(points):[];
    let markup='<g class="mir-wall-edge-annotations">';
    for(let i=0;i<end;i++){
      const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
      if(!(len>1e-7))continue;
      const name=wallLetter(i)+'–'+wallLetter((i+1)%points.length),label=name+(measured?' '+inch(len).replace(' po',''):'');
      const x=(a[0]+b[0])/2-dy/len*size*1.65,y=(a[1]+b[1])/2+dx/len*size*1.65;
      if(len>=size*3)markup+=svgText(x,y,label,
        'data-wall-edge="'+i+'" tabindex="0" role="button" aria-label="'+esc(name+(measured?' '+inch(len):' non coté'))+'" text-anchor="middle" font-size="'+size+'" font-weight="700" class="mir-wall-edge-label"');
    }
    const r=size*.34;
    for(let i=0;i<points.length;i++){
      const p=points[i];
      markup+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+r+'" fill="#348511" stroke="#fff" stroke-width="'+r*.3+'"/>';
      markup+=svgText(p[0]+r*2,p[1]-r*1.7,wallLetter(i),'font-size="'+size+'" font-weight="700" class="mir-wall-vertex-label"');
      if(measured&&bends.length&&Number.isFinite(bends[i].angle))
        markup+=svgText(p[0]+r*2,p[1]+r*3.3,number(bends[i].angle)+'°','font-size="'+size*.78+'" class="mir-wall-angle-label"');
    }
    return markup+'</g>';
  }
  function renderPieceMeasures(p) {
    $('#piece-measurements').hidden=!p;if(!p)return;
    const points=piecePolygon(p),edges=polygonMeasures(points),mx=Math.min(...points.map(q=>q[0])),my=Math.min(...points.map(q=>q[1])),scale=Math.min(224/Math.max(p.widthIn,1),156/Math.max(p.heightIn,1));
    const ps=points.map(([x,y])=>[150+(x-mx-p.widthIn/2)*scale,110+(y-my-p.heightIn/2)*scale]);
    let svg='<polygon points="'+ps.map(q=>q.join(',')).join(' ')+'" fill="#e8eee0" stroke="#526c45" stroke-width="1.6"/>';
    ps.forEach((q,i)=>{svg+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="2.5" fill="#45613a"/>'+svgText(q[0]+(q[0]>150?9:-9),q[1]+(q[1]>110?13:-7),'S'+(i+1),'text-anchor="middle" font-size="10" fill="#3f5937"');});
    svg+=svgText(150,220,p.id+' · '+inch(p.widthIn)+' × '+inch(p.heightIn),'text-anchor="middle" font-size="11" fill="#3f5937"');$('#piece-detail-svg').innerHTML=svg;
    $('#piece-dimensions').innerHTML='<strong>Pièce réelle hors tout</strong><br>'+inch(p.widthIn)+' × '+inch(p.heightIn)+'<br>Surface : '+number(p.areaSqIn/144)+' pi² · '+points.length+' côtés<br>Projection C : '+inch(parse(zone().meta.projection));
    $('#piece-edge-table').innerHTML=edges.map((e,i)=>'<tr><td>S'+(i+1)+' → S'+((i+1)%points.length+1)+'</td><td>'+inch(e.length)+'</td><td>'+number(e.angle)+'°</td></tr>').join('');
  }
  function panelDrawing() {
    const d=dimensions(),w=layout.widthIn,h=layout.heightIn,l=layout.lipIn;
    const fs=Math.min(5.2,Math.max(1.5,Math.min(w/(layout.columns*7),h/(layout.rows*6))));
    const contour=layout.config.contourIn,shaped=Array.isArray(contour),pointsAttr=ps=>ps.map(q=>q.join(',')).join(' ');
    let out=shaped?'<defs><clipPath id="wall-grid-clip"><polygon points="'+pointsAttr(contour)+'"/></clipPath></defs><polygon points="'+pointsAttr(contour)+'" fill="#bdcdae" stroke="#78916b" stroke-width="1.3" vector-effect="non-scaling-stroke"/>':'<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="#bdcdae" stroke="#78916b" stroke-width="1.3" vector-effect="non-scaling-stroke"/>';
    for(const p of layout.pieces){
      const active=selected?.type==='piece'&&selected.id===p.id,locked=layout.config.widthLocks?.[p.col]!=null||layout.config.heightLocks?.[p.row]!=null;
      const x=p.xIn+l,y=p.yIn+l,pw=p.widthIn-2*l,ph=p.heightIn-2*l;
      out+='<g data-piece="'+p.id+'" tabindex="0" role="button" aria-label="'+p.id+', '+esc(inch(p.widthIn)+' par '+inch(p.heightIn))+'">';
      if(shaped){
        const poly=piecePolygon(p),mesh=window.MIRProductionVolume?.buildMesh({kind:'panel',shape:'polygon',pointsMM:poly.map(q=>[(q[0]-p.xIn)*25.4,-(q[1]-p.yIn)*25.4]),reliefMM:0,edges:poly.map((_,i)=>({id:String(i+1),lipMM:l*25.4}))});
        const front=p.facePolygonIn||(mesh?.valid?mesh.front.map(q=>[p.xIn+q[0]/25.4,p.yIn-q[1]/25.4]):poly);
        out+='<polygon points="'+pointsAttr(poly)+'" fill="transparent"/><polygon points="'+pointsAttr(front)+'" fill="'+(active?'#4e6c46':'#f1f4ea')+'" stroke="'+(active?'#365131':'#95a584')+'" stroke-width="1" vector-effect="non-scaling-stroke"/>';
      }else out+='<rect x="'+x+'" y="'+y+'" width="'+pw+'" height="'+ph+'" rx=".15" fill="'+(active?'#4e6c46':'#f1f4ea')+'" stroke="'+(active?'#365131':'#95a584')+'" stroke-width="1" vector-effect="non-scaling-stroke"/>';
      const center=shaped&&V?.labelPoint?V.labelPoint(piecePolygon(p)):[p.xIn+p.widthIn/2,p.yIn+p.heightIn/2];
      out+=svgText(center[0],center[1]-fs*.25,p.id,'text-anchor="middle" font-size="'+fs+'" font-weight="700" fill="'+(active?'white':'#2e4934')+'"');
      if(fs>1.8&&pw>7){const label=inch(p.widthIn).replace(' po','')+' × '+inch(p.heightIn),size=Math.min(fs*.65,Math.max(1,pw*.82/(label.length*.56)));out+=svgText(center[0],center[1]+fs*1.02,label,'text-anchor="middle" font-size="'+size+'" fill="'+(active?'#e4edda':'#52694a')+'"');}
      if(locked)out+=svgText(center[0],center[1]+fs*2,'COTE FIXÉE','text-anchor="middle" font-size="'+fs*.37+'" fill="'+(active?'#e4edda':'#6b7f61')+'"');
      out+='</g>';
    }
    if(shaped)out+='<g clip-path="url(#wall-grid-clip)">';
    for(const axis of ['x','y']){
      const axes=axis==='x'?layout.xAxesIn:layout.yAxesIn;
      axes.forEach((position,index)=>{const active=selected?.type==='joint'&&selected.axis===axis&&selected.index===index;const lock=(axis==='x'?layout.config.xLocks:layout.config.yLocks)?.[index]!=null;
        const attrs='data-joint-'+axis+'="'+index+'" tabindex="0" role="button" aria-label="Joint '+(axis==='x'?'vertical':'horizontal')+' '+(index+1)+' à '+esc(inch(position))+'"';
        out+='<g '+attrs+'>'+svgLine(axis==='x'?position:0,axis==='y'?position:0,axis==='x'?position:w,axis==='y'?position:h,'stroke="'+(active?'#bd7e3c':lock?'#2e6172':'#6e8a5e')+'" stroke-width="'+(active?2.4:1)+'" stroke-dasharray="'+(lock?'0':'5 4')+'" vector-effect="non-scaling-stroke"')+svgLine(axis==='x'?position:0,axis==='y'?position:0,axis==='x'?position:w,axis==='y'?position:h,'stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke"')+'<circle cx="'+(axis==='x'?position:0)+'" cy="'+(axis==='y'?position:0)+'" r="'+Math.max(1.2,fs*.48)+'" fill="'+(active?'#bd7e3c':lock?'#2e6172':'white')+'" stroke="#6e8a5e" stroke-width="1" vector-effect="non-scaling-stroke"/></g>';
      });
    }
    if(shaped)out+='</g>';
    return '<g transform="translate('+d.g.left+' '+d.g.top+')">'+out+'</g>';
  }
  function draw() {
    const z=zone(),s=z.source,d=dimensions(),svg=$('#layout-svg');
    document.body.classList.toggle('mir-wall-tracing',tool==='outline');
    let out='',baseWidth,baseHeight,originX=0,originY=0;
    const planView=view==='plan'&&s,valid=layout.ok;
    $('#wall-orbit-controls').hidden=view!=='3d';$('#drawing-stage').dataset.view=view;
    if(view==='3d'&&valid&&V){
      const result=V.render(layout,{projectionIn:parse(z.meta.projection),yaw:wallYaw,pitch:wallPitch,selectedId:selected?.type==='piece'?selected.id:null,format:inch});
      out=result.svg;baseWidth=1000;baseHeight=720;transform=null;
      $('#wall-3d-status').textContent=result.warnings.length?result.warnings.slice(0,3).join(' · ')+(result.warnings.length>3?'…':''):parse(z.meta.projection)===null?'Renseignez C pour afficher les retours à leur profondeur.':'Dimensions réelles, indépendantes de la rotation.';
    }else if(planView) {
      baseWidth=s.widthPx;baseHeight=s.heightPx;out='<image href="'+s.imageDataUrl+'" x="0" y="0" width="'+baseWidth+'" height="'+baseHeight+'"/>';transform=null;
      if(s.box&&d.width>0&&d.height>0){const b=s.box,bx=b[0]*baseWidth,by=b[1]*baseHeight,bw=b[2]*baseWidth,bh=b[3]*baseHeight;transform={x:bx,y:by,sx:bw/d.width,sy:bh/d.height};if(valid)out+='<g opacity=".88" transform="translate('+bx+' '+by+') scale('+(bw/d.width)+' '+(bh/d.height)+')">'+panelDrawing()+'</g>';out+='<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+bh+'" fill="none" stroke="#537340" stroke-width="2" vector-effect="non-scaling-stroke"/>';}
      else if(s.box){const b=s.box;out+='<rect x="'+b[0]*baseWidth+'" y="'+b[1]*baseHeight+'" width="'+b[2]*baseWidth+'" height="'+b[3]*baseHeight+'" fill="#bbcbac55" stroke="#537340" stroke-width="2"/>';}
      if(tool!=='outline'&&z.shape?.type==='free'&&s.box){
        const b=s.box,bx=b[0]*baseWidth,by=b[1]*baseHeight,bw=b[2]*baseWidth,bh=b[3]*baseHeight;
        const ratios=Array.isArray(z.shape.sketchRatios)?z.shape.sketchRatios:null;
        const exact=d.width>0&&d.height>0?measuredPoints(z):null;
        const points=exact?.length>=3?exact.map(p=>[bx+p[0]*bw/d.width,by+p[1]*bh/d.height]):
          ratios?.length>=3?ratios.map(p=>[bx+p[0]*bw,by+p[1]*bh]):[];
        if(points.length>=3){
          out+='<polygon points="'+points.map(p=>p.join(',')).join(' ')+'" fill="#e0edce" fill-opacity=".25" stroke="#348511" stroke-width="2.5" vector-effect="non-scaling-stroke"/>';
          out+=wallEdgeAnnotations(points,{closed:true,measured:!!exact?.length,span:baseWidth});
        }
      }
    } else if(d.width>0&&d.height>0) {
      const margin=Math.max(d.width,d.height)*.12;originX=-margin;originY=-margin;baseWidth=d.width+2*margin;baseHeight=d.height+2*margin;transform={x:0,y:0,sx:1,sy:1};
      const wall=wallGeometry(),wallPoints=wall.measuredPointsIn;
      out=wallPoints&&wall.type!=='rectangle'?'<polygon points="'+wallPoints.map(q=>q.join(',')).join(' ')+'" fill="#e8e9df" stroke="#879977" vector-effect="non-scaling-stroke"/>':'<rect x="0" y="0" width="'+d.width+'" height="'+d.height+'" fill="#e8e9df" stroke="#879977" vector-effect="non-scaling-stroke"/>';
      if(valid)out+=panelDrawing();
      if(z.shape?.type==='free'&&tool!=='outline'&&Array.isArray(wall.measuredPointsIn))
        out+=wallEdgeAnnotations(wall.measuredPointsIn,{closed:true,measured:true,span:baseWidth});
      const fs=Math.max(d.width,d.height)*.026,dim=margin*.52;
      out+=svgLine(0,-dim,d.width,-dim,'stroke="#677d5b" vector-effect="non-scaling-stroke"');
      out+=svgLine(0,-dim-fs*.45,0,-dim+fs*.45,'stroke="#677d5b" vector-effect="non-scaling-stroke"')+svgLine(d.width,-dim-fs*.45,d.width,-dim+fs*.45,'stroke="#677d5b" vector-effect="non-scaling-stroke"');
      out+=svgText(d.width/2,-dim-fs*.4,inch(d.width),'font-size="'+fs+'" text-anchor="middle" fill="#395335"');
      out+=svgLine(-dim,0,-dim,d.height,'stroke="#677d5b" vector-effect="non-scaling-stroke"');
      out+='<text transform="translate('+(-dim-fs*.35)+' '+d.height/2+') rotate(-90)" font-size="'+fs+'" text-anchor="middle" fill="#395335">'+esc(inch(d.height))+'</text>';
      if(valid)out+=svgText(d.width/2,d.height+dim+fs*.3,inch(layout.widthIn)+' × '+inch(layout.heightIn)+' utiles après lousse','font-size="'+fs*.75+'" text-anchor="middle" fill="#395335"');
      if(!valid)out+=svgText(d.width/2,d.height/2,'Renseignez le lip et la répartition','font-size="'+fs+'" text-anchor="middle" fill="#687d5e"');
    } else {
      // Enlarged trace viewport; still no fabricated chantier dimensions.
      originX=65;originY=45;baseWidth=870;baseHeight=590;transform=null;
      const waiting=Array.isArray(z.shape?.sketchRatios)&&z.shape.sketchRatios.length>=3;
      const activeDraft=tool==='outline'&&outlineDraft.length>0;
      out='<rect x="160" y="100" width="680" height="460" rx="3" fill="#eff3e8" stroke="#afbea0" stroke-dasharray="8 7"/>';
      if(waiting&&!activeDraft){
        const pts=z.shape.sketchRatios.map(p=>[160+p[0]*680,100+p[1]*460]);
        out+='<polygon data-wall-sketch="pending" points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="#e0edce" fill-opacity=".7" stroke="#348511" stroke-width="3" vector-effect="non-scaling-stroke"/>';
        out+=wallEdgeAnnotations(pts,{closed:true,span:baseWidth});
        out+=svgText(500,605,'Contour sauvegardé · entrez les dimensions chantier exactes','font-size="16" text-anchor="middle" fill="#395335"');
      }else if(!activeDraft){
        out+=svgText(500,306,z.drawn?'Zone tracée':'Tracez une section de mur ici','font-size="27" text-anchor="middle" fill="#49613d"');
        out+=svgText(500,345,'Mesurez et cotez après le tracé.','font-size="17" text-anchor="middle" fill="#748769"');
      }
    }
    if(drag?.type==='draw'){const b=drag.box;out+='<rect x="'+b[0]+'" y="'+b[1]+'" width="'+b[2]+'" height="'+b[3]+'" fill="#adc79855" stroke="#456637" stroke-width="2" vector-effect="non-scaling-stroke"/>';}
    if(tool==='calibrate')calibrationPoints.forEach(p=>{out+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+Math.max(baseWidth/150,3)+'" fill="#bc7b35" stroke="white" stroke-width="2"/>';});
    if(tool==='outline'&&outlineDraft.length&&outlineCursor){
      const start=drag?.type==='outline'&&drag.added?outlineDraft.at(-2)||outlineDraft.at(-1):outlineDraft.at(-1),
        end=outlinePoint(outlineCursor,outlineOrthogonal||outlineRightAngle,start);
      out+=svgLine(start[0],start[1],end[0],end[1],'data-outline-preview stroke="#ba7136" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" pointer-events="none"');
    }
    if(tool==='outline'&&outlineDraft.length){
      const r=baseWidth/170;
      out+='<polyline points="'+outlineDraft.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="#ba7136" stroke-width="2.5" vector-effect="non-scaling-stroke"/>';
      out+=wallEdgeAnnotations(outlineDraft,{closed:false,span:baseWidth});
      if(outlineDraft.length===1)out+='<circle cx="'+outlineDraft[0][0]+'" cy="'+outlineDraft[0][1]+'" r="'+r+'" fill="#348511" stroke="white" stroke-width="1.3"/>';
    }
    const vw=baseWidth/zoom,vh=baseHeight/zoom;
    svg.setAttribute('viewBox',[originX+(baseWidth-vw)/2,originY+(baseHeight-vh)/2,vw,vh].join(' '));svg.innerHTML=out;
    svg.setAttribute('aria-label',valid?z.name+', '+layout.pieces.length+' panneaux, '+inch(layout.widthIn)+' par '+inch(layout.heightIn):'Zone à définir');
    $('#drawing-stage').dataset.tool=tool;$('#zoom-value').textContent=Math.round(zoom*100)+' %';
    $('#view-zone').setAttribute('aria-pressed',String(view==='zone'));$('#view-plan').setAttribute('aria-pressed',String(view==='plan'));$('#view-3d').setAttribute('aria-pressed',String(view==='3d'));
    $('#select-tool').setAttribute('aria-pressed',String(tool==='select'));$('#draw-zone').setAttribute('aria-pressed',String(tool==='draw'));
    $('#draw-outline').setAttribute('aria-pressed',String(tool==='outline'));$('#outline-actions').hidden=tool!=='outline';$('#outline-close').disabled=outlineDraft.length<3;$('#outline-back').disabled=!outlineDraft.length;$('#outline-progress').textContent=outlineDraft.length+' sommet(s) · '+(outlineDraft.length<3?'cliquez ou glissez pour tracer.':'tapez le premier point ou Fermer le contour.');
    $('#outline-right-angle').setAttribute('aria-pressed',String(outlineRightAngle));
    $('#drawing-hint').textContent=tool==='outline'?'Cliquez ou glissez comme une moulure. Maj = 90°. Fermez puis cotez.':view==='3d'?'Glissez pour tourner. Cliquez une pièce pour lire ses cotes.':tool==='draw'?'Glissez entre deux coins de la zone.':tool==='calibrate'?'Cliquez les deux extrémités de votre cote.':'Cliquez une pièce ou déplacez un joint.';
  }
  function render() {
    layout=compute();if(layout.ok){zone().rules=clone(layout.config);if((!selected||selected.type==='piece'&&!layout.pieces.some(p=>p.id===selected.id))&&layout.pieces.length)selected={type:'piece',id:layout.pieces[0].id};}
    renderControls();renderSummary();renderInspector();draw();
  }
  function svgPoint(event) { const s=$('#layout-svg'),p=s.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const m=s.getScreenCTM();if(!m)return null;const q=p.matrixTransform(m.inverse());return [q.x,q.y]; }
  function jointPosition(point,axis) { const d=dimensions();return axis==='x'?(point[0]-transform.x)/transform.sx-d.g.left:(point[1]-transform.y)/transform.sy-d.g.top; }
  function picked(event) {
    const t=event.target.closest('[data-piece],[data-joint-x],[data-joint-y]');if(!t)return null;
    if(t.dataset.piece)return {type:'piece',id:t.dataset.piece};
    return {type:'joint',axis:t.hasAttribute('data-joint-x')?'x':'y',index:Number(t.getAttribute('data-joint-x')??t.getAttribute('data-joint-y'))};
  }
  function outlinePoint(point, orthogonal, last=outlineDraft.at(-1)) {
    if(!orthogonal||!last)return point;
    const [x,y]=point, [lastX,lastY]=last, [firstX,firstY]=outlineDraft[0];
    const matrix=$('#layout-svg').getScreenCTM();
    const alignFirst=outlineDraft.length>=3;
    if(Math.abs(x-lastX)>=Math.abs(y-lastY)){
      const aligned=alignFirst&&Math.abs(x-firstX)*Math.abs(matrix?.a||1)<=12;
      return [aligned?firstX:x,lastY];
    }
    const aligned=alignFirst&&Math.abs(y-firstY)*Math.abs(matrix?.d||1)<=12;
    return [lastX,aligned?firstY:y];
  }

  function nearOutlinePoint(a,b,tolerance=13) {
    if(!a||!b)return false;
    const m=$('#layout-svg').getScreenCTM();
    const sx=Math.hypot(m?.a||1,m?.b||0),sy=Math.hypot(m?.c||0,m?.d||1);
    return Math.hypot((a[0]-b[0])*sx,(a[1]-b[1])*sy)<=tolerance;
  }
  function selectWallEdge(index) {
    const pts=measuredPoints(),d=dimensions();
    if(!Number.isInteger(index)||index<0||index>=pts.length)return;
    if(!(d.width>0&&d.height>0))return toast('Entrez les cotes chantier avant de modifier les côtés.');
    const endpoint=(index+1)%pts.length;
    const controls=$('#wall-coordinate-details');
    if(controls)controls.open=true;
    $('#wall-vertex').value=String(endpoint);
    $('#wall-vertex').dispatchEvent(new Event('change'));
    $('#vertex-x').focus({preventScroll:false});
    toast('Côté '+wallLetter(index)+'–'+wallLetter(endpoint)+' : modifiez les cotes du sommet '+wallLetter(endpoint)+', puis cliquez Appliquer.');
  }
  function onPointerDown(event) {
    if(event.button!==0)return;const p=svgPoint(event);if(!p)return;
    if(tool==='outline'){
      event.preventDefault();
      const first=outlineDraft[0],last=outlineDraft.at(-1),hadBefore=outlineDraft.length>0;
      if(outlineDraft.length>=3&&nearOutlinePoint(p,first))return closeOutline();
      const onLast=last&&nearOutlinePoint(p,last,9);
      if(outlineDraft.length>=64&&!onLast)return toast('Le contour accepte jusqu’à 64 sommets.');
      let added=false;
      if(!onLast){
        const next=outlinePoint(p,event.shiftKey||outlineRightAngle);
        if(!last||Math.hypot(last[0]-next[0],last[1]-next[1])>1e-7){
          outlineDraft.push(next);added=true;
        }
      }
      drag={type:'outline',pointerId:event.pointerId,x:event.clientX,y:event.clientY,added,hadBefore};
      $('#drawing-stage').setPointerCapture(event.pointerId);
      outlineCursor=null;draw();return;
    }
    if(view==='3d'){
      drag={type:'orbit',start:[event.clientX,event.clientY],yaw:wallYaw,pitch:wallPitch,moved:false,selection:picked(event)};$('#drawing-stage').setPointerCapture(event.pointerId);event.preventDefault();return;
    }
    if(tool==='calibrate'){calibrationPoints.push(p);if(calibrationPoints.length===2)finishCalibration();else draw();return;}
    if(tool==='draw'){drag={type:'draw',start:p,box:[p[0],p[1],0,0]};$('#drawing-stage').setPointerCapture(event.pointerId);event.preventDefault();draw();return;}
    const wallSide=event.target.closest('[data-wall-edge]');
    if(wallSide&&tool==='select'){event.preventDefault();selectWallEdge(Number(wallSide.dataset.wallEdge));return;}
    const selection=picked(event);if(!selection||!layout.ok)return;selected=selection;
    if(selection.type==='joint'&&transform){drag={type:'joint',axis:selection.axis,index:selection.index,original:clone(layout.config),baseWorkspace:clone(workspace),moved:false,lastResult:layout};$('#drawing-stage').setPointerCapture(event.pointerId);event.preventDefault();}
    renderInspector();renderSummary();draw();
  }
  function onPointerMove(event) {
    if(tool==='outline'){
      outlineCursor=svgPoint(event);outlineOrthogonal=event.shiftKey;draw();return;
    }
    if(!drag)return;
    if(drag.type==='orbit'){const dx=event.clientX-drag.start[0],dy=event.clientY-drag.start[1];if(Math.hypot(dx,dy)>4)drag.moved=true;if(drag.moved){wallYaw=Math.max(-72,Math.min(72,drag.yaw+dx*.35));wallPitch=Math.max(-60,Math.min(60,drag.pitch+dy*.25));draw();}return;}
    const p=svgPoint(event);if(!p)return;
    if(drag.type==='draw'){drag.box=[Math.min(p[0],drag.start[0]),Math.min(p[1],drag.start[1]),Math.abs(p[0]-drag.start[0]),Math.abs(p[1]-drag.start[1])];draw();return;}
    if(!transform)return;const proposed=E.moveJoint(drag.original,drag.axis,drag.index,jointPosition(p,drag.axis),{snap:true});
    if(proposed.ok){drag.lastResult=proposed;drag.moved=true;zone().rules=clone(proposed.config);layout=proposed;renderInspector();renderSummary();draw();$('#drawing-hint').textContent='Position : '+inch((drag.axis==='x'?proposed.xAxesIn:proposed.yAxesIn)[drag.index]);}
    else $('#drawing-hint').textContent=proposed.errors?.[0]?.message||'Une cote verrouillée empêche ce déplacement.';
  }
  function finishPointer(event,cancelled=false) {
    if(!drag)return;const current=drag;drag=null;
    if($('#drawing-stage').hasPointerCapture(event.pointerId))$('#drawing-stage').releasePointerCapture(event.pointerId);
    if(current.type==='outline'){
      if(cancelled){if(current.added)outlineDraft.pop();outlineCursor=null;draw();return;}
      const moved=Math.hypot(event.clientX-current.x,event.clientY-current.y)>9;
      if(moved){
        const p=svgPoint(event),anchor=current.added?outlineDraft.at(-2):outlineDraft.at(-1);
        if(p){
          const next=outlinePoint(p,event.shiftKey||outlineRightAngle,anchor);
          if(!current.hadBefore&&current.added&&outlineDraft.length===1){
            if(!nearOutlinePoint(next,outlineDraft[0],8))outlineDraft.push(next);
          }else if(current.added&&outlineDraft.length){
            if(anchor&&!nearOutlinePoint(next,anchor,7))outlineDraft[outlineDraft.length-1]=next;
            else outlineDraft.pop();
          }else if(outlineDraft.length<64&&(!anchor||!nearOutlinePoint(next,anchor,7)))
            outlineDraft.push(next);
        }
      }
      outlineCursor=null;draw();return;
    }
    if(current.type==='orbit'){if(cancelled){wallYaw=current.yaw;wallPitch=current.pitch;}else if(!current.moved&&current.selection){selected=current.selection;renderInspector();renderSummary();}draw();return;}
    if(current.type==='joint'){
      if(cancelled){workspace=current.baseWorkspace;render();return;}
      if(current.moved){history.push(current.baseWorkspace);if(history.length>10)history.shift();zone().rules=clone(current.lastResult.config);zone().revision++;scheduleSave();}
      render();return;
    }
    if(cancelled){draw();return;}
    if(current.box[2]<1||current.box[3]<1){toast('Tracez une zone entre deux coins distincts.');draw();return;}
    const z=zone();
    if(view==='plan'&&z.source){const s=z.source,b=current.box,x=Math.max(0,Math.min(s.widthPx,b[0])),y=Math.max(0,Math.min(s.heightPx,b[1])),xEnd=Math.max(0,Math.min(s.widthPx,b[0]+b[2])),yEnd=Math.max(0,Math.min(s.heightPx,b[1]+b[3])),w=xEnd-x,h=yEnd-y;if(w<8||h<8){toast('La zone tracée est trop petite.');draw();return;}
      commit(q=>{q.source.box=[x/s.widthPx,y/s.heightPx,w/s.widthPx,h/s.heightPx];if((q.values.width===''||q.dimensionSource==='scale')&&q.source.scaleInPerPx){q.values.width=val(w*q.source.scaleInPerPx);q.values.height=val(h*q.source.scaleInPerPx);q.dimensionSource='scale';delete q.rules.xAxesIn;delete q.rules.yAxesIn;}});
    }else commit(q=>{q.drawn=true;});
    tool='select';draw();toast(z.source?'Zone tracée. Vérifiez ou saisissez les cotes exactes.':'Zone tracée. Indiquez sa largeur et sa hauteur.');
  }
  function dimensionsFromScale() {
    const s=zone().source;if(!s?.box||!s.scaleInPerPx)return;
    commit(z=>{z.values.width=val(s.box[2]*s.widthPx*s.scaleInPerPx);z.values.height=val(s.box[3]*s.heightPx*s.scaleInPerPx);z.dimensionSource='scale';},{clearAxes:true});
  }
  function beginOutline() {
    // Same trace-first workflow as a folded profile; do not fabricate site dimensions.
    outlineDraft=[];outlineCursor=null;if(view==='3d')view='zone';tool='outline';zoom=1;selected=null;renderInspector();draw();
  }
  function closeOutline() {
    if(outlineDraft.length<3||!A)return;
    const d=dimensions(),hasMeasures=d.width>0&&d.height>0;
    const ratios=A.normalizeSketch(outlineDraft,1,1);
    if(!ratios)return toast('Tracez au moins 3 sommets qui forment une largeur et une hauteur.');
    const points=hasMeasures?A.normalizeSketch(outlineDraft,d.width,d.height):ratios;
    if(!points)return toast('Le contour ne peut pas être coté. Vérifiez ses sommets.');
    const shape=hasMeasures?{type:'free',pointsIn:points}:{type:'free',sketchRatios:ratios};
    // Validate even an unmeasured sketch as a unit shape; this is never a real 1-inch wall.
    const net=A.prepare({widthIn:hasMeasures?d.width:1,heightIn:hasMeasures?d.height:1,
      clearances:hasMeasures?d.g:{left:0,right:0,top:0,bottom:0},shape:{type:'free',pointsIn:points}});
    const check=net.ok?E.build({widthIn:net.widthIn,heightIn:net.heightIn,lipIn:0,columns:1,rows:1,contourIn:net.contourIn}):net;
    if(!check.ok){toast(check.errors.map(e=>e.message).join(' '));return;}
    const raw=outlineDraft.slice(),fromPDF=view==='plan'&&zone().source;tool='select';outlineDraft=[];
    commit(z=>{z.shape=shape;if(fromPDF){const s=z.source,x=Math.max(0,Math.min(...raw.map(p=>p[0]))),y=Math.max(0,Math.min(...raw.map(p=>p[1]))),x2=Math.min(s.widthPx,Math.max(...raw.map(p=>p[0]))),y2=Math.min(s.heightPx,Math.max(...raw.map(p=>p[1])));if(x2>x&&y2>y)s.box=[x/s.widthPx,y/s.heightPx,(x2-x)/s.widthPx,(y2-y)/s.heightPx];}});
    toast(hasMeasures?'Contour fermé. Les dimensions chantier sont conservées. Vérifiez ses sommets.':
      'Section dessinée et sauvegardée sans cotes. Saisissez la largeur et la hauteur réelles pour calculer les panneaux.');
  }
  function applyVertex() {
    const points=clone(measuredPoints()),i=Number($('#wall-vertex').value),d=dimensions(),x=parse($('#vertex-x').value),height=parse($('#vertex-height').value);
    if(!points[i]||x===null||height===null||x<0||height<0||x>d.width||height>d.height)return toast('Entrez des cotes de sommet comprises dans les dimensions totales chantier.');
    points[i]=[x,d.height-height];commit(z=>{z.shape={type:'free',pointsIn:points};});
  }
  function finishCalibration() {
    const [a,b]=calibrationPoints,span=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(span<8){calibrationPoints=[];toast('Les deux points sont trop proches. Reprenez la cote complète.');draw();return;}
    commit(z=>{z.source.scaleInPerPx=calibrationValue/span;z.source.scaleLabel='Cote exacte de '+inch(calibrationValue)+' entre deux points';z.source.manualAnchors=[a,b];});
    calibrationPoints=[];tool='select';draw();toast('Référence enregistrée. Vos cotes saisies restent conservées.');
  }
  async function attachPDF(file) {
    if(!file)return;const token=++pdfSequence,targetZoneId=zone().id;$('#source-name').textContent='Ouverture du PDF…';$('#import-pdf').disabled=true;
    try{
      const next=await window.MIRPanelLayoutPDF.open(file);if(token!==pdfSequence||zone().id!==targetZoneId){await next.close();return;}
      const previous=pdfSession,nextId='pdf-'+uid();pdfSession=next;pdfId=nextId;if(previous)await previous.close();
      if(token!==pdfSequence||zone().id!==targetZoneId)return;
      try{await dbRequest('files','readwrite',nextId,file);}catch{toast('Le PDF ne peut pas être conservé après fermeture. Les cotes restent exportables.');}
      if(token!==pdfSequence||zone().id!==targetZoneId)return;
      await showPDFPage(1,token,targetZoneId);
    }catch(error){if(token===pdfSequence&&error.name!=='AbortError')toast(error.message||'Ce PDF ne peut pas être ouvert.');renderControls();}
    finally{if(token===pdfSequence){$('#import-pdf').disabled=false;$('#pdf-file').value='';}}
  }
  async function showPDFPage(page,existingToken,targetZoneId=zone().id) {
    if(!pdfSession)return;const token=existingToken??++pdfSequence,session=pdfSession,sourcePdfId=pdfId;$('#scale-status').textContent='Lecture de la page…';$('#pdf-page').disabled=true;
    try{
      const rendered=await session.render(page);if(token!==pdfSequence||zone().id!==targetZoneId||session!==pdfSession)return;
      const candidateScale=rendered.scale,usable=['cross_checked','single_dimension','selected_dimension','manual'].includes(candidateScale?.status)&&finite(candidateScale.feetPerPixel)&&candidateScale.feetPerPixel>0;
      commit(z=>{if(z.dimensionSource==='scale'){z.values.width='';z.values.height='';delete z.rules.xAxesIn;delete z.rules.yAxesIn;}z.source={pdfId:sourcePdfId,fileName:session.fileName,pageCount:session.pageCount,pageNumber:rendered.pageNumber,widthPx:rendered.widthPx,heightPx:rendered.heightPx,imageDataUrl:rendered.imageDataUrl,candidates:rendered.candidates||[],scaleInPerPx:usable?candidateScale.feetPerPixel*12:null,scaleLabel:usable?'Échelle repérée dans les cotes · à vérifier':'',box:null};});
      view='plan';tool='draw';zoom=1;draw();toast('Page ouverte. Tracez la zone à couvrir.');
    }catch(error){if(token===pdfSequence&&error.name!=='AbortError')toast(error.message||'La page ne peut pas être lue.');}
    finally{renderControls();}
  }
  async function restoreSession() {
    const token=++pdfSequence,s=zone().source,targetZoneId=zone().id;$('#import-pdf').disabled=false;
    if(!s?.pdfId||s.pdfId===pdfId&&pdfSession)return;
    try{const file=await dbRequest('files','readonly',s.pdfId);if(!file||token!==pdfSequence||zone().id!==targetZoneId)return;const next=await window.MIRPanelLayoutPDF.open(file);if(token!==pdfSequence||zone().id!==targetZoneId){await next.close();return;}const previous=pdfSession;pdfSession=next;pdfId=s.pdfId;if(previous)await previous.close();if(token===pdfSequence&&zone().id===targetZoneId)renderControls();}
    catch{if(token===pdfSequence)toast('Le fond de plan reste disponible. Réimportez le PDF pour changer de page.');}
  }
  function outputMeta() {
    const z=zone(),d=dimensions(),type=z.meta.material,selectedColor=colorOptions().find(c=>c.choiceId===z.meta.color);
    const material=type?{type,name:type==='aluminium-extrude'?'Aluminium extrudé sur mesure':'Unico U-P1 — '+(type==='acier'?'Acier':'Aluminium'),productRef:type==='aluminium'?'unico-up1-aluminium':type==='acier'?'unico-up1-acier':null,thicknessUnit:'mm',thickness:type==='acier'?'':z.meta.thickness,gauge:type==='acier'?z.meta.thickness:''}:{};
    const finish=z.meta.color==='custom'?{selectionType:'custom',system:'Couleur personnalisée',code:z.meta.customColor,name:z.meta.customColor,special:true}:selectedColor?{selectionType:'manufacturer',manufacturer:'Unico',system:'Nuancier Unico',name:selectedColor.name,code:selectedColor.code||'',hex:selectedColor.hex||null,special:selectedColor.uP1Compatibility?.confirmed!==true,source:selectedColor.sourceUrl,availabilityNote:selectedColor.uP1Compatibility?.note||'Disponibilité sur ce profil à confirmer.'}:{};
    const s=z.source,box=s?.box;const innerBox=box&&d.width>0&&d.height>0?[box[0]+box[2]*d.g.left/d.width,box[1]+box[3]*d.g.top/d.height,box[2]*d.usableWidth/d.width,box[3]*d.usableHeight/d.height]:null;
    return {id:z.id,name:z.name,project:z.meta.project,poNumber:z.meta.poNumber,revision:String(z.revision),sourceLabel:s?s.fileName+' · page '+s.pageNumber:'Zone cotée sans PDF',sourceImageDataUrl:innerBox?s.imageDataUrl:null,sourceWidthPx:innerBox?s.widthPx:null,sourceHeightPx:innerBox?s.heightPx:null,sourceBox:innerBox,notes:(z.confirmed?'':'Cotes et jeux de pose à vérifier. ')+z.notes,material,finish,reliefIn:parse(z.meta.projection),perforation:{enabled:z.meta.perforation===''?null:z.meta.perforation==='yes',edgeId:'bottom',details:''},clearances:d.g,dimensionsConfirmed:z.confirmed,measuredWidthIn:d.width,measuredHeightIn:d.height,measuredContourIn:measuredPoints(),totalGapWidthIn:d.g.left+d.g.right,totalGapHeightIn:d.g.top+d.g.bottom,clearanceMethod:'overall-axial'};
  }
  async function exportSite() {
    if(!layout.ok||exporting)return;exporting=true;renderSummary();$('#export-status').textContent='Préparation du plan chantier…';
    try{const meta=outputMeta(),faces=O.sitePages(layout,meta),result=await window.MIRPDF.exportPlan({faces,title:'MIR — Calepinage chantier',subtitle:(meta.project||meta.name)+' · Révision '+meta.revision,filename:'MIR-calepinage-'+zone().name.replace(/[^a-zA-Z0-9_-]/g,'-')+'-R'+meta.revision+'.pdf',onProgress:m=>$('#export-status').textContent=m});$('#export-status').textContent='PDF prêt · '+result.pages+' page(s). Les mêmes repères suivent la liste de fabrication.';}
    catch(error){$('#export-status').textContent='Export impossible : '+error.message;}
    finally{exporting=false;renderSummary();}
  }
  async function sendProduction() {
    if(!layout.ok)return;
    if(!zone().confirmed){toast('Vérifiez les cotes et les jeux de pose, puis cochez leur confirmation dans Votre zone.');$('#dimensions-confirmed').focus();return;}
    try{const payload=O.toTransfer(layout,outputMeta());clearTimeout(saveTimer);await saveChain.catch(()=>{});await dbRequest('drafts','readwrite','workspace',clone(workspace));localStorage.setItem(O.STORAGE_KEY||'mir_panel_layout_transfer_v1',JSON.stringify(payload));location.href='production.html?layout='+encodeURIComponent(payload.id);}
    catch(error){toast(error.message||'Les pièces ne peuvent pas être préparées. Sauvegardez le dossier JSON.');}
  }
  function exportJSON() {
    const data=clone(workspace),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='MIR-calepinage.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Dossier JSON préparé avec les cotes et les fonds de page.');
  }
  function applySelectedSize(axis) {
    if(!layout.ok||selected?.type!=='piece')return;const p=layout.pieces.find(p=>p.id===selected.id),input=$('#piece-'+(axis==='x'?'width':'height')),value=parse(input.value),lock=$('#piece-'+(axis==='x'?'width':'height')+'-lock').checked;
    if(value===null||value<=0){toast('Entrez une dimension positive, en pouces ou en fraction.');input.focus();return;}
    configFromResult(E.setPanelSize(layout.config,axis,axis==='x'?p.col:p.row,value,{lock}));
  }
  function applyRoofPitch() {
    const {width}=dimensions(), eave=parse($('#roof-eave-height').value);
    const parsePitch=value=>parse(value.trim().replace(/\s*\/\s*12$/, ''));
    const leftPitch=parsePitch($('#roof-pitch').value), rightInput=$('#roof-right-pitch').value.trim();
    const rightPitch=rightInput?parsePitch(rightInput):leftPitch;
    const gable=A?.gableFromPitch?.(width,eave,leftPitch,rightPitch);
    if(!gable)return toast('Entrez une largeur et des pentes positives, ainsi qu’une hauteur d’égout valide.');
    view='zone';tool='select';zoom=1;
    commit(z=>{
      z.values.height=val(gable.heightIn);
      z.shape={type:'gable',leftHeight:val(eave),rightHeight:val(eave),peakX:val(gable.peakXIn)};
      z.dimensionSource='pitch';
    },{clearAxes:['y']});
  }
  function bind() {
    $('#apply-roof-pitch').onclick=applyRoofPitch;
    for(const [id,axis,keys] of [['total-gap-width','x',['clearLeft','clearRight']],['total-gap-height','y',['clearTop','clearBottom']]])$('#'+id).onchange=()=>{
      const amount=parse($('#'+id).value),d=dimensions(),span=axis==='x'?d.width:d.height;
      if(amount===null||amount<0||(finite(span)&&amount>=span)){toast('Entrez un lousse total positif ou zéro, plus petit que la dimension chantier.');renderWallControls();return;}
      commit(z=>{z.values[keys[0]]=val(amount/2);z.values[keys[1]]=val(amount/2);},{clearAxes:[axis]});
    };
    $('#wall-shape').onchange=()=>{
      const type=$('#wall-shape').value,d=dimensions();
      if(type==='free'){beginOutline();return;}
      if(type!=='rectangle'&&!(d.width>0&&d.height>0)){toast('Entrez d’abord la largeur et la hauteur totales du mur.');renderWallControls();return;}
      const current=measuredPoints();
      commit(z=>{z.shape=type==='free'?{type,pointsIn:current.length?clone(current):[[0,0],[d.width,0],[d.width,d.height],[0,d.height]]}:type==='rectangle'?{type}:{type,leftHeight:val(type==='slope'?d.height:d.height*.75),rightHeight:val(d.height*.75),peakX:val(d.width/2)};});
      if(['gable','slope'].includes(type))toast('Forme de départ proposée. Remplacez les hauteurs par les mesures exactes du chantier.');
    };
    for(const [key,id] of [['leftHeight','wall-left-height'],['rightHeight','wall-right-height'],['peakX','wall-peak-x']])$('#'+id).onchange=()=>commit(z=>{z.shape={...z.shape,[key]:$('#'+id).value};});
    $('#center-peak').onclick=()=>{const d=dimensions();if(d.width>0)commit(z=>{z.shape={...z.shape,peakX:val(d.width/2)};});};
    $('#wall-vertex').onchange=()=>{const p=measuredPoints()[Number($('#wall-vertex').value)],d=dimensions();if(p){$('#vertex-x').value=val(p[0]);$('#vertex-height').value=val(d.height-p[1]);}};
    $('#wall-edge-list').addEventListener('click',e=>{const b=e.target.closest('[data-wall-edge]');if(b)selectWallEdge(Number(b.dataset.wallEdge));});
    $('#apply-vertex').onclick=applyVertex;
    $('#outline-right-angle').onclick=()=>{outlineRightAngle=!outlineRightAngle;draw();};
    $('#start-free-outline').onclick=beginOutline;$('#draw-outline').onclick=beginOutline;
    $('#outline-close').onclick=closeOutline;$('#outline-back').onclick=()=>{outlineDraft.pop();draw();};$('#outline-cancel').onclick=()=>{outlineDraft=[];tool='select';draw();};
    $('#view-3d').onclick=()=>{if(!layout.ok)return toast('Complétez le contour et les dimensions avant de passer en 3D.');view='3d';tool='select';outlineDraft=[];zoom=1;draw();};
    $('#orbit-left').onclick=()=>{wallYaw=Math.max(-72,wallYaw-15);draw();};$('#orbit-right').onclick=()=>{wallYaw=Math.min(72,wallYaw+15);draw();};$('#orbit-up').onclick=()=>{wallPitch=Math.min(60,wallPitch+12);draw();};$('#orbit-down').onclick=()=>{wallPitch=Math.max(-60,wallPitch-12);draw();};$('#orbit-front').onclick=()=>{wallYaw=0;wallPitch=0;draw();};
    $('#load-gable-example').onclick=()=>{
      if(workspace.zones.length>=30)return toast('Ce dossier contient déjà 30 zones. Sauvegardez-le avant de poursuivre.');
      snapshot();const z=blankZone(workspace.zones.length+1);z.name='Exemple · mur en pointe';Object.assign(z.values,{width:'120',height:'96',lip:'1',columns:4,rows:2,clearLeft:'3/16',clearRight:'3/16',clearTop:'1/8',clearBottom:'1/8'});z.shape={type:'gable',leftHeight:'60',rightHeight:'60',peakX:'60'};z.meta.projection='2';z.dimensionSource='example';workspace.zones.push(z);workspace.activeId=z.id;selected=null;view='zone';tool='select';zoom=1;outlineDraft=[];scheduleSave();render();restoreSession();toast('Exemple fictif : 120 × 96 po, lousse total ⅜ × ¼ po. Remplacez ces cotes par celles de votre chantier.');
    };
    for(const [key,id] of Object.entries(controls))$('#'+id).addEventListener('change',()=>{
      const countLocks=key==='columns'?['widthLocks','xLocks']:key==='rows'?['heightLocks','yLocks']:[];
      if(layout.ok&&countLocks.some(k=>Object.keys(layout.config[k]||{}).length)){toast('Libérez les cotes verrouillées de cet axe avant de changer le nombre de panneaux.');renderControls();return;}
      const axes=key==='precision'?[]:['width','columns','clearLeft','clearRight'].includes(key)?['x']:['height','rows','clearTop','clearBottom'].includes(key)?['y']:['x','y'];
      commit(z=>{z.values[key]=$('#'+id).value;if(key==='width'||key==='height')z.dimensionSource='manual';},{clearAxes:axes});
    });
    $('#zone-name').onchange=()=>commit(z=>{z.name=$('#zone-name').value.trim()||'Zone';},{invalidate:false});
    $('#zone-notes').onchange=()=>commit(z=>{z.notes=$('#zone-notes').value;},{invalidate:false});
    $('#dimensions-confirmed').onchange=()=>commit(z=>{z.confirmed=$('#dimensions-confirmed').checked;},{invalidate:false});
    for(const [key,id] of Object.entries(metadataControls))$('#'+id).addEventListener('change',()=>commit(z=>{z.meta[key]=$('#'+id).value;if(key==='material'){z.meta.thickness='';z.meta.color='';}else if(key==='thickness'&&z.meta.material==='acier')z.meta.color='';},{invalidate:false}));
    $('#zone-select').onchange=()=>{workspace.activeId=$('#zone-select').value;selected=null;view='zone';zoom=1;tool='select';outlineDraft=[];scheduleSave();render();restoreSession();};
    $('#new-zone').onclick=()=>{if(workspace.zones.length>=30)return toast('Ce dossier contient déjà 30 zones. Sauvegardez-le avant de poursuivre.');snapshot();const z=blankZone(workspace.zones.length+1);workspace.zones.push(z);workspace.activeId=z.id;selected=null;view='zone';zoom=1;tool='select';scheduleSave();render();restoreSession();};
    $('#new-traced-section').onclick=()=>{
      if(workspace.zones.length>=30)return toast('Le dossier accepte 30 sections. Enregistrez ou exportez avant de continuer.');
      snapshot();const z=blankZone(workspace.zones.length+1);z.name='Section de mur '+(workspace.zones.length+1);
      workspace.zones.push(z);workspace.activeId=z.id;selected=null;view='zone';zoom=1;tool='select';
      scheduleSave();render();restoreSession();beginOutline();
    };
    $('#load-example').onclick=()=>{if(workspace.zones.length>=30)return toast('Ce dossier contient déjà 30 zones. Sauvegardez-le avant de poursuivre.');snapshot();const z=blankZone(workspace.zones.length+1);z.name='Exemple · entre deux fenêtres';Object.assign(z.values,{width:'108 1/2',height:'83 3/4',lip:'1',columns:4,rows:2});z.dimensionSource='example';workspace.zones.push(z);workspace.activeId=z.id;selected=null;view='zone';zoom=1;tool='select';scheduleSave();render();restoreSession();toast('Exemple chargé. Le lip de 1 po reste modifiable.');};
    $('#undo').onclick=()=>{if(!history.length)return;const current=new Map(workspace.zones.map(z=>[z.id,z])),restored=history.pop();for(const z of restored.zones){const before=current.get(z.id);if(!before)continue;const oldContent={...before,revision:0},restoredContent={...z,revision:0};z.revision=JSON.stringify(oldContent)===JSON.stringify(restoredContent)?before.revision:Math.max(before.revision,z.revision)+1;}workspace=restored;selected=null;view='zone';zoom=1;tool='select';scheduleSave();render();restoreSession();};
    $('#redistribute').onclick=()=>commit(z=>{delete z.rules.xAxesIn;delete z.rules.yAxesIn;});
    $('#unlock-all').onclick=()=>commit(z=>{for(const k of ['widthLocks','heightLocks','xLocks','yLocks'])delete z.rules[k];},{invalidate:false});
    $('#apply-width').onclick=()=>applySelectedSize('x');$('#apply-height').onclick=()=>applySelectedSize('y');
    for(const axis of ['x','y'])$('#piece-'+(axis==='x'?'width':'height')+'-lock').onchange=()=>applySelectedSize(axis);
    $('#apply-joint').onclick=()=>{if(selected?.type!=='joint'||!layout.ok)return;const p=parse($('#joint-position').value);if(p===null)return toast('Entrez une position en pouces.');configFromResult(E.moveJoint(layout.config,selected.axis,selected.index,p));};
    $('#center-joint').onclick=()=>{if(selected?.type==='joint'&&layout.ok)configFromResult(E.centerJoint(layout.config,selected.axis,selected.index));};
    $('#joint-lock').onchange=()=>{if(selected?.type==='joint'&&layout.ok)configFromResult(E.setJointLock(layout.config,selected.axis,selected.index,$('#joint-lock').checked));};
    $('#select-tool').onclick=()=>{tool='select';calibrationPoints=[];draw();};
    $('#draw-zone').onclick=()=>{tool='draw';if(zone().source)view='plan';zoom=1;calibrationPoints=[];draw();};
    $('#view-zone').onclick=()=>{view='zone';zoom=1;tool='select';draw();};$('#view-plan').onclick=()=>{view='plan';zoom=1;tool='select';draw();};
    $('#zoom-in').onclick=()=>{zoom=Math.min(4,zoom+.25);draw();};$('#zoom-out').onclick=()=>{zoom=Math.max(.5,zoom-.25);draw();};$('#zoom-reset').onclick=()=>{zoom=1;draw();};
    const stage=$('#drawing-stage');stage.addEventListener('pointerdown',onPointerDown);stage.addEventListener('pointermove',onPointerMove);stage.addEventListener('pointerup',e=>finishPointer(e));stage.addEventListener('pointercancel',e=>finishPointer(e,true));
    stage.addEventListener('pointerleave',()=>{if(tool==='outline'&&outlineCursor){outlineCursor=null;draw();}});
    const updateOutlineModifier=e=>{
      if(tool==='outline'&&outlineCursor&&e.key==='Shift'&&outlineOrthogonal!==e.shiftKey){outlineOrthogonal=e.shiftKey;draw();}
    };
    window.addEventListener('keydown',updateOutlineModifier);
    window.addEventListener('keyup',updateOutlineModifier);
    stage.addEventListener('keydown',e=>{if(tool!=='outline')return;if(e.key==='Escape'){e.preventDefault();outlineDraft=[];tool='select';draw();}else if(e.key==='Enter'){e.preventDefault();closeOutline();}else if(e.key==='Backspace'){e.preventDefault();outlineDraft.pop();draw();}});
    stage.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.closest('[data-wall-edge]')){e.preventDefault();selectWallEdge(Number(e.target.closest('[data-wall-edge]').dataset.wallEdge));return;}const s=picked(e);if(!s||!layout.ok)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();selected=s;renderInspector();draw();}else if(s.type==='joint'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();selected=s;const pos=(s.axis==='x'?layout.xAxesIn:layout.yAxesIn)[s.index],sign=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;configFromResult(E.moveJoint(layout.config,s.axis,s.index,pos+sign*(e.shiftKey?1:1/16)));$('#layout-svg').querySelector('[data-joint-'+s.axis+'="'+s.index+'"]')?.focus();}});
    $('#piece-table').addEventListener('click',e=>{const b=e.target.closest('[data-table-piece]');if(!b)return;selected={type:'piece',id:b.dataset.tablePiece};renderInspector();renderSummary();draw();$('#selection-title').scrollIntoView({behavior:'smooth',block:'center'});});
    $('#import-pdf').onclick=()=>$('#pdf-file').click();$('#pdf-file').onchange=e=>attachPDF(e.target.files[0]);
    $('#pdf-page').onchange=()=>showPDFPage(Number($('#pdf-page').value));
    $('#blank-source').onclick=()=>{pdfSequence++;$('#import-pdf').disabled=false;commit(z=>{z.source=null;});view='zone';tool='select';zoom=1;draw();};
    $('#pdf-cote').onchange=()=>{const raw=$('#pdf-cote').value;if(raw==='')return;const c=zone().source?.candidates[Number(raw)];if(!c||!finite(c.feetPerPixel)||c.feetPerPixel<=0)return;commit(z=>{z.source.scaleInPerPx=c.feetPerPixel*12;z.source.scaleLabel='Cote choisie : '+(c.text||c.normalized);z.source.manualAnchors=c.anchors;});toast('Échelle retenue. Vos dimensions exactes sont conservées.');};
    $('#measure-scale').onclick=dimensionsFromScale;
    $('#calibrate').onclick=()=>{const p=parse($('#reference-value').value);if(p===null||p<=0)return toast('Entrez la distance exacte en pouces, par exemple 108 1/2.');calibrationValue=p;calibrationPoints=[];view='plan';tool='calibrate';zoom=1;draw();};
    $('#export-site').onclick=exportSite;$('#export-json').onclick=exportJSON;$('#send-production').onclick=sendProduction;
    window.addEventListener('beforeunload',()=>{if(saveTimer){clearTimeout(saveTimer);dbRequest('drafts','readwrite','workspace',clone(workspace)).catch(()=>{});}});
  }
  async function boot() {
    if(!M||!E||!O)throw new Error('Un outil de calcul n’a pas chargé. Rechargez la page.');
    try{const saved=await dbRequest('drafts','readonly','workspace');if(saved?.schema==='mir-panel-layout-workspace-1'&&Array.isArray(saved.zones)&&saved.zones.length&&saved.zones.length<=30&&saved.zones.every(z=>z&&z.id&&z.values&&z.rules&&z.meta))workspace=saved;}
    catch{$('#save-state').textContent='Sauvegarde indisponible · exportez le JSON';}
    if(!workspace.zones.length){const z=blankZone(1);workspace.zones.push(z);workspace.activeId=z.id;}
    if(!workspace.zones.some(z=>z.id===workspace.activeId))workspace.activeId=workspace.zones[0].id;
    let requested='';try{requested=decodeURIComponent(location.hash.slice(1));}catch{}if(workspace.zones.some(z=>z.id===requested))workspace.activeId=requested;
    ready=true;bind();render();$('#new-traced-section').disabled=false;restoreSession();
  }
  boot().catch(error=>{const el=$('#calculation-errors');el.hidden=false;el.textContent=error.message||'Le calculateur n’a pas pu démarrer.';});
})();
