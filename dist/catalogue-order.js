/* Catalogue organisation is independent from installation and quantity rules. */
(function(root){'use strict';
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const categories=[['fibre','Fibrociment'],['wood','Bois & ingénierie'],['metal','Revêtements métalliques'],['vinyl','Vinyle'],['finish','Soffites & finitions'],['fix','Accessoires & fixations']];
 const sections=[['lap','Clins & profils de revêtement'],['panel','Panneaux'],['shake','Bardeaux décoratifs'],['soffit','Soffites'],['fascia','Fascias'],['opening','Contours & bandeaux'],['trim','Moulures & joints'],['coil','Rouleaux & feuilles à plier'],['fastener','Vis, clous & attaches'],['sealant','Scellants'],['touchup','Retouches'],['other','Autres accessoires']];
 const brandOrder=['James Hardie','Maibec','CanExel','JDP / Juste du Pin','Kaycan','Gentek Canada','Allura','LP SmartSide','Rialux','Westlake Royal','MAC Métal architectural','Light Trim','Vicwest','ADSEAL / Adfast','St-Laurent','Quality Edge','PRIME / Premier Outils Pro','3M'];
 function section(m){const a=m.applications||[],s=norm(m.id+' '+m.name),p=m.renderPattern;
  if(a.includes('architectural-panel'))return 'panel';
  if(a.includes('siding')){if(p==='panel'||/hardiepanel|allura-panel|smartside-panel/.test(s))return 'panel';if(p==='shingle'||/shingle|shake/.test(s))return 'shake';return 'lap';}
  if(a.includes('soffit'))return 'soffit';if(a.includes('bending')||a.includes('capping'))return 'coil';
  if(a.includes('fastener'))return 'fastener';if(a.includes('sealant'))return 'sealant';if(a.includes('touch-up')||a.includes('touchup'))return 'touchup';
  if(a.includes('opening-trim')||a.includes('opening_trim')||a.includes('band'))return 'opening';if(a.includes('fascia'))return 'fascia';
  if(a.includes('trim')||a.includes('siding-joint'))return 'trim';return 'other';
 }
 function category(m){const a=m.applications||[],f=norm(m.family);if(a.includes('siding')||a.includes('architectural-panel'))return f.includes('vinyl')?'vinyl':f.includes('fibrociment')?'fibre':f.includes('bois')?'wood':'metal';
  if(['soffit','fascia','trim','bending','capping','opening-trim','opening_trim','band','siding-joint'].some(x=>a.includes(x)))return 'finish';return 'fix';}
 function matchesCategory(m,id){return category(m)===id || id==='finish'&&(m.applications||[]).includes('soffit');}
 function brandCompare(a,b){const ia=brandOrder.indexOf(a),ib=brandOrder.indexOf(b);return (ia<0?999:ia)-(ib<0?999:ib)||a.localeCompare(b,'fr');}
 function compare(a,b){const si=sections.findIndex(x=>x[0]===section(a)),sj=sections.findIndex(x=>x[0]===section(b));return brandCompare(a.brand,b.brand)||si-sj||(Number(b.mirPreferred===true)-Number(a.mirPreferred===true))||norm(a.name).localeCompare(norm(b.name),'fr',{numeric:true})||a.id.localeCompare(b.id);}
 function group(list){const brands=[...new Set(list.map(m=>m.brand))].sort(brandCompare);return brands.map(brand=>({brand,sections:sections.map(([id,label])=>({id,label,items:list.filter(m=>m.brand===brand&&section(m)===id).sort(compare)})).filter(x=>x.items.length)}));}
 const api={categories,sections,section,category,matchesCategory,brandCompare,compare,group};root.MIRCatalogueOrder=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
