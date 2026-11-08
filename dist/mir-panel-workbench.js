/* MIR — module de présentation Panneaux, sans calcul parallèle ni mutation de pièce.
 * Une adjointe choisit une action, voit son mur, vérifie une pièce, prépare le bon. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRPanelWorkbench=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const step=(number,title,current)=>'<span class="mir-wb-step'+(number===current?' is-current':'')+'" '+(number===current?'aria-current="step"':'')+'><strong>'+number+'</strong>'+title+'</span>';
 const panelKind=i=>(i?.spec?.kind||i?.kind)==='panel';
 const getId=i=>String(i?.id||'');
 const sourceId=i=>String(i?.sourceLayout?.sourcePieceId||i?.id||'Pièce');
 function panelsOf(dossier){return (dossier?.items||[]).filter(panelKind);}
 function coverage(dossier,excluded){
  const panels=panelsOf(dossier),all=new Set(excluded||[]);
  return {panels,included:panels.filter(i=>!all.has(getId(i))),excluded:all};
 }
 function summaryModel(item,api){
  try{
   const m=api.buildPanel(item.spec);
   if(!m.valid)return {model:m,ready:false,error:m.validation?.errors?.[0]?.message||'Forme à corriger'};
   return {model:m,ready:!!m.complete,error:m.validation?.pending?.[0]?.message||''};
  }catch(e){return {model:null,ready:false,error:'Dessin à vérifier'};}
 }
 function repereWall(panels,activeId,excluded){
  const ordered=panels.map((p,index)=>({item:p,index,col:Number.isInteger(p?.sourceLayout?.col)?p.sourceLayout.col:index%5,
   row:Number.isInteger(p?.sourceLayout?.row)?p.sourceLayout.row:Math.floor(index/5)}));
  const maxCol=Math.max(0,...ordered.map(p=>p.col));
  // Mettre en grille uniquement les repères, pas dix fiches gigantesques.
  const cols=Math.max(1,Math.min(8,maxCol+1));
  return '<div class="mir-wb-wall-grid" role="group" aria-label="Choisir un panneau dans le mur" style="--mir-wb-cols:'+cols+'">'+ordered.map(({item,index,col,row})=>{
   const id=getId(item),label=sourceId(item),no=excluded.has(id),selected=id===activeId;
   return '<button type="button" class="mir-wb-wall-tile'+(no?' is-out':'')+(selected?' is-selected':'')+
    '" data-mir-wb-pick="'+esc(id)+'" aria-pressed="'+selected+'" aria-label="Voir le panneau '+esc(label)+(no?', exclu du bon':'')+
    '" style="grid-column:'+((col%cols)+1)+';grid-row:'+(row+Math.floor(col/cols)+1)+'">'+
    '<span>'+esc(label)+'</span></button>';
  }).join('')+'</div>';
 }
 function render(args={}){
  const {dossier,api,volume,activeId,excludedIds=[]}=args;
  const {panels,included,excluded}=coverage(dossier,excludedIds);
  const active=panels.find(p=>p.id===activeId)||panels[0]||null;
  const at=active?panels.indexOf(active):0;
  const count=included.length,all=panels.length;
  const models=panels.map(p=>summaryModel(p,api));
  const incomplete=models.filter(p=>!p.ready).length;
  const stage=all?2:1;
  let html='<section class="mir-wb" data-mir-wb-root>'+
   '<header class="mir-wb-heading"><div><p class="mir-wb-eyebrow">L’ATELIER MIR · PANNEAUX</p>'+
   '<h2>'+(!all?'Créer mes panneaux':'Vérifier mes panneaux')+'</h2><p>'+
   (!all?'Choisis ce que tu veux dessiner. MIR calculera les pièces ensuite.':'Ton mur et ses pièces sont déjà dans le dossier. Tu peux vérifier chaque panneau et préparer le bon.')+
   '</p></div><div class="mir-wb-heading-links"><button type="button" data-mir-panel-history>Bons enregistrés</button><button type="button" data-mir-tab="draw" class="mir-wb-exit">Retour à l’atelier</button></div></header>'+
   '<nav class="mir-wb-progress" aria-label="Les trois étapes de la commande">'+
   step(1,'Dessiner',stage)+step(2,'Vérifier',stage)+step(3,'Commander',stage)+'</nav>';
  if(!all){
   html+='<section class="mir-wb-start"><h3>Qu’est-ce qu’on prépare ?</h3>'+
    '<div class="mir-wb-choices"><a href="calepinage.html" class="mir-wb-start-primary"><strong>Un mur complet</strong><span>Dessiner le mur, choisir combien de panneaux, calculer les pièces.</span><b>Commencer le mur →</b></a>'+
    '<button type="button" data-mir-panel-new><strong>Un panneau seul</strong><span>Une pièce spéciale, avec ses cotes, angles et lèvres.</span><b>Dessiner le panneau →</b></button></div>'+
    '<p class="mir-wb-note">Tu peux reprendre un dossier existant. Aucune commande n’est envoyée automatiquement.</p></section>';
  }else{
   const z=active?.sourceLayout?.zoneName||'Panneaux sur mesure';
   html+='<section class="mir-wb-overview"><div class="mir-wb-summary"><div><p class="mir-wb-eyebrow">'+esc(z)+'</p>'+
    '<h3>'+all+' panneaux dans le dossier</h3><p><strong data-mir-panel-count>'+count+'</strong> à commander'+(incomplete?' · '+incomplete+' à vérifier avant fabrication':' · cotes renseignées')+'</p></div>'+
    '<a href="calepinage.html" class="mir-wb-secondary-link">Revoir le mur</a></div>'+
    '<p class="mir-wb-instruction">Appuie sur un repère pour voir sa pièce. Le dessin et les dimensions changent ensemble.</p>'+
    repereWall(panels,active?.id,excluded)+
    '<p class="mir-wb-scale">Schéma de repérage seulement — pas une échelle de coupe.</p></section>';
   const result=summaryModel(active,api),m=result.model;
   const ready=result.ready,valid=!!m?.valid;
   let visual='',v3d='',size='À mesurer',project='À préciser',metal='À préciser',color='À préciser',edges='';
   if(valid){
    try{visual=api.panelSVG(active.spec,{width:620,height:400,legend:false,header:false,notes:false});}catch{}
    try{v3d=volume?.render?.(m,{yaw:-24,pitch:12,zoom:1,width:620,height:410,formatMeasurement:api.formatMeasurement})||'';}catch{}
    size=api.formatMeasurement(m.widthMM,m.unit)+' × '+api.formatMeasurement(m.heightMM,m.unit);
    if(Number.isFinite(m.reliefMM))project=api.formatMeasurement(m.reliefMM,m.unit);
    metal=m.material?.name||m.material?.type||'À préciser';
    color=m.finish?.name||m.finish?.code||'À préciser';
    edges=(m.edges||[]).map((e,n)=>(n+1)+'. '+e.name+' : '+api.formatMeasurement(e.lengthMM,m.unit)+' · lip '+api.formatMeasurement(e.lipMM,m.unit)+' · '+(Math.round(e.interiorAngleDeg*100)/100)+'°').join(' / ');
   }
   const selected=!excluded.has(active.id),qty=Number(active.spec?.quantity||1);
   html+='<section class="mir-wb-focus" data-mir-wb-focus><header class="mir-wb-focus-head"><div><p class="mir-wb-eyebrow">PANNEAU '+(at+1)+' SUR '+all+'</p>'+
     '<h3>'+esc(sourceId(active))+' <small>'+(ready?'Prêt à vérifier':'À compléter')+'</small></h3></div>'+
     '<div class="mir-wb-switch"><button type="button" data-mir-wb-prev'+(at===0?' disabled':'')+' aria-label="Panneau précédent">←</button>'+
     '<button type="button" data-mir-wb-next'+(at===all-1?' disabled':'')+' aria-label="Panneau suivant">→</button></div></header>'+
     (visual?'<div class="mir-wb-drawing">'+visual+'</div>':'<div class="mir-wb-drawing mir-wb-drawing-empty">Dessin à corriger avant la commande.</div>')+
     '<div class="mir-wb-measures"><div><span>Dimensions hors tout</span><strong>'+esc(size)+'</strong><small>Lips inclus</small></div>'+
     '<div><span>Projection C</span><strong>'+esc(project)+'</strong><small>Profondeur de la pièce</small></div></div>'+
     '<p class="mir-wb-spec">'+esc(metal)+' · '+esc(color)+'</p>'+
     (result.error?'<p class="mir-wb-issue" role="status">À vérifier : '+esc(result.error)+'</p>':'')+
     (v3d?'<details class="mir-wb-extra"><summary>Voir cette pièce en 3D</summary><div class="mir-wb-three-d">'+v3d+'</div></details>':'')+
     '<details class="mir-wb-extra"><summary>Voir les lèvres et angles</summary><p>'+esc(edges||'Cotes à compléter dans le dessin')+'</p></details>'+
     '<div class="mir-wb-controls"><label>Quantité<input data-mir-panel-qty="'+esc(active.id)+'" type="number" inputmode="numeric" step="1" min="1" max="100000" value="'+(Number.isInteger(qty)&&qty>0?qty:1)+'"></label>'+
     '<label class="mir-wb-check"><input data-mir-panel-include="'+esc(active.id)+'" type="checkbox" '+(selected?'checked':'')+'><span>Inclure au bon</span></label></div>'+
     '<button type="button" class="mir-wb-edit" data-mir-panel-edit="'+esc(active.id)+'">Modifier les mesures de '+esc(sourceId(active))+'</button>'+
     '<details class="mir-wb-extra mir-wb-options"><summary>Autres actions sur ce panneau</summary>'+
     '<button type="button" data-mir-panel-duplicate="'+esc(active.id)+'">Dupliquer volontairement</button>'+
     '<a href="calepinage.html'+(active.sourceLayout?.zoneId?'#'+encodeURIComponent(active.sourceLayout.zoneId):'')+'">Modifier le mur d’origine</a></details></section>'+
     '<details class="mir-wb-manage"><summary>Choisir plusieurs panneaux à la fois</summary>'+
     '<p>Ces choix ne suppriment rien du mur ni du dossier original.</p>'+
     '<div><button type="button" data-mir-panel-all="true">Inclure tous les panneaux</button>'+
     '<button type="button" data-mir-panel-all="false">Ne retenir aucun panneau</button></div></details>'+
     '<section class="mir-wb-next-action"><div><strong><span data-mir-panel-count>'+count+'</span> panneau(x) sélectionné(s)</strong>'+
     '<p>Étape suivante : fournisseur, chantier et livraison.</p></div>'+
     '<button type="button" data-mir-panel-to-po class="mir-panel-primary"'+(!count?' disabled':'')+'>Continuer vers le bon →</button></section>';
  }
  return html+'</section>';
 }
 function orderRows(items=[],api){
  return '<div class="mir-wb-po-summary"><h3>'+items.length+' pièce(s) sur ce bon</h3>'+
   '<p>Un repère par ligne. Les dessins cotés apparaîtront une seule fois dans le PDF fournisseur.</p>'+
   '<div class="mir-wb-po-list" role="list">'+items.map(item=>{
    const id=getId(item),panel=panelKind(item);
    const m=panel?summaryModel(item,api).model:null;
    const dimensions=m?.valid?api.formatMeasurement(m.widthMM,m.unit)+' × '+api.formatMeasurement(m.heightMM,m.unit):'Cotes de la moulure';
    return '<div class="mir-wb-po-row" role="listitem" data-mir-po-piece="'+esc(id)+'"><strong>'+esc(sourceId(item))+'</strong>'+
     '<span>'+esc(dimensions)+'</span><span>Qté '+esc(item.spec?.quantity||1)+'</span></div>';
   }).join('')+'</div></div>';
 }
 return Object.freeze({version:'2.0.0',render,orderRows,coverage});
});
