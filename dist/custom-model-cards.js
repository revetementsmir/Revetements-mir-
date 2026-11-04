/* Shared MIR cards for parametric fabrication models. This component reads only
 * mir_production_templates_v1. It never reads an order, drawing snapshot or stock.
 * Catalogue channels are local presentation choices, not authorization controls. */
(function(root,factory){'use strict';const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MIRCustomModelCards=api;})(typeof window==='object'?window:globalThis,function(root){
 'use strict';
 const STORAGE_KEY='mir_production_templates_v1';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=value=>Number.isFinite(value)?String(Math.round(value*1000)/1000):'0';
 const searchText=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
 const instances=new Map();
 function engine(options){return options?.engine||root.MIRProduction;}
 function activeTemplate(record){if(!record||!Number.isSafeInteger(record.currentVersion)||!Array.isArray(record.versions))return null;return record.versions.find(template=>template.version===record.currentVersion&&template.id===record.id)||null;}
 function linkFor(id,{channel='client'}={}){return 'production.html?mode=client&template='+encodeURIComponent(id)+(channel==='store'?'&source=store':'');}
 function read(options={}){
  const channel=options.channel==='store'?'store':'client',M=engine(options),words=searchText(options.query).trim().split(/\s+/).filter(Boolean);
  let records=options.records,storageUnavailable=false;
  if(!records){try{const raw=(options.storage||root.localStorage).getItem(STORAGE_KEY),parsed=raw?JSON.parse(raw):null;records=parsed?.version===1&&Array.isArray(parsed.records)?parsed.records:[];}catch{records=[];storageUnavailable=true;}}
  if(!M?.templatePreview)return {items:[],total:0,channel,status:'engine_missing',storageUnavailable};
  const items=[];for(const record of Array.isArray(records)?records:[]){
   if(record?.archived!==false||record.channels?.[channel]!==true)continue;
   const template=activeTemplate(record);if(!template||!['profile','panel'].includes(template.kind)||options.kind&&template.kind!==options.kind)continue;
   let preview;try{preview=M.templatePreview(template);}catch{continue;}if(!preview.ok||!preview.model?.valid)continue;
   const kindLabel=template.kind==='profile'?'Pliage sur mesure':'Panneau métallique',text=searchText([template.name,template.description,kindLabel,'modèle atelier MIR',(template.fields||[]).map(field=>field.label).join(' ')].join(' '));
   if(!words.every(word=>text.includes(word)))continue;
   items.push({id:template.id,name:template.name,version:template.version,description:template.description||'',kind:template.kind,kindLabel,requiredMeasureCount:(template.fields||[]).filter(field=>field.required).length,template,preview:preview.model,href:linkFor(template.id,{channel})});
  }
  items.sort((a,b)=>a.name.localeCompare(b.name,'fr',{numeric:true}));return {items,total:items.length,channel,status:storageUnavailable?'storage_unavailable':'ready',storageUnavailable};
 }
 function previewSVG(value,{width=420,height=240}={}){
  const model=value?.preview||value,points=model?.pointsMM;if(!Array.isArray(points)||points.length<2||points.some(p=>!Array.isArray(p)||p.length<2||!p.every(Number.isFinite)))return '';
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1])),scale=Math.min((width-110)/Math.max(1,maxX-minX),(height-80)/Math.max(1,maxY-minY));
  const mapped=points.map(p=>[width/2+(p[0]-(minX+maxX)/2)*scale,height/2-(p[1]-(minY+maxY)/2)*scale]),shape=mapped.map(p=>p.map(n).join(',')).join(' '),panel=model.kind==='panel';
  let body=panel?`<polygon points="${shape}" fill="#dfe8d5" stroke="#617d4d" stroke-width="2.5"/>`:`<polyline points="${shape}" fill="none" stroke="#6a8557" stroke-width="7" stroke-linejoin="miter"/><polyline points="${shape}" fill="none" stroke="#cbd9bf" stroke-width="3" stroke-linejoin="miter"/>`;
  if(panel){body+=`<text x="${n(width/2)}" y="${n(height-13)}" text-anchor="middle" font-size="14" fill="#6d8659">A</text><text x="${n(width-25)}" y="${n(height/2+5)}" font-size="14" fill="#6d8659">B</text>`;}else{
   for(let i=0;i<mapped.length-1;i++){const a=mapped[i],b=mapped[i+1],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,x=(a[0]+b[0])/2-dy/length*20,y=(a[1]+b[1])/2+dx/length*20,label=model.segments?.[i]?.label||String.fromCharCode(65+i);body+=`<circle cx="${n(x)}" cy="${n(y)}" r="10" fill="#f5f8ee"/><text x="${n(x)}" y="${n(y+4)}" text-anchor="middle" font-size="12" font-weight="600" fill="#55753d">${esc(label)}</text>`;}
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(width)} ${n(height)}" role="img" aria-label="${esc((value?.name||model.name||'Modèle MIR')+' — proportions illustratives, cotes à renseigner')}" font-family="Arial,sans-serif"><title>${esc(value?.name||model.name||'Modèle MIR')} · illustration sans cotes de commande</title>${body}</svg>`;
 }
 function cardHTML(item,{channel='client',newTab=channel==='store'}={}){return `<article class="mir-custom-model-card" data-custom-model-id="${esc(item.id)}"><a class="mir-custom-model-preview" href="${esc(item.href)}"${newTab?' target="_blank" rel="noopener"':''} tabindex="-1" aria-hidden="true">${previewSVG(item)}<span class="mir-custom-model-version">MODÈLE MIR · V${item.version}</span></a><div class="mir-custom-model-body"><p class="mir-custom-model-kind">${esc(item.kindLabel)}</p><h3>${esc(item.name)}</h3>${item.description?`<p class="mir-custom-model-description">${esc(item.description)}</p>`:''}<p class="mir-custom-model-fields">${item.requiredMeasureCount} cote${item.requiredMeasureCount>1?'s':''} à renseigner · aucune mesure imposée</p><a class="mir-custom-model-action" href="${esc(item.href)}"${newTab?' target="_blank" rel="noopener"':''}>Choisir mes dimensions <span aria-hidden="true">↗</span><span class="mir-custom-sr-only"> — ${esc(item.name)}${newTab?', nouvel onglet':''}</span></a></div></article>`;}
 function renderHTML(result,options={}){
  const title=options.title||'Les modèles de l’atelier',level=[2,3,4].includes(Number(options.headingLevel))?Number(options.headingLevel):2,limit=Number.isSafeInteger(options.limit)&&options.limit>0?options.limit:result.items.length,items=result.items.slice(0,limit),compact=options.compact?' mir-custom-models-compact':'',kind='mir-custom-models'+compact;
  const empty=options.query?'Aucun modèle ne correspond à cette recherche.':'Aucun modèle n’est disponible dans ce catalogue sur cet appareil.';
  const explanation=result.channel==='store'?'Configurez vos cotes dans un dossier de fabrication distinct. Il conserve le dessin et la version du modèle; aucun article n’est ajouté automatiquement à la demande de matériel du chantier.':'Choisissez une forme de l’atelier, puis renseignez vos cotes et votre finition. Le dossier conserve le dessin et la version du modèle.';
  if(!items.length&&options.hideEmpty)return '';
  return `<section class="${kind}" aria-label="${esc(title)}"><div class="mir-custom-models-heading"><div><p class="mir-custom-models-eyebrow">À VOS MESURES</p><h${level}>${esc(title)}</h${level}></div><span>${result.total} modèle${result.total>1?'s':''}</span></div><p class="mir-custom-models-intro">${esc(explanation)}</p>${items.length?`<div class="mir-custom-model-grid">${items.map(item=>cardHTML(item,{...options,channel:result.channel})).join('')}</div>`:`<div class="mir-custom-models-empty">${esc(result.status==='engine_missing'?'L’aperçu des modèles est indisponible sur cette page. Ouvrez le configurateur pour choisir une forme.':result.status==='storage_unavailable'?'Le catalogue local ne peut pas être lu dans ce navigateur.':empty)}<a href="production.html?mode=client${result.channel==='store'?'&source=store':''}">Ouvrir le configurateur ↗</a></div>`}${result.total>items.length?`<p class="mir-custom-models-more">${result.total-items.length} autre${result.total-items.length>1?'s':''} modèle${result.total-items.length>1?'s':''} disponible${result.total-items.length>1?'s':''} dans le configurateur. <a href="production.html?mode=client${result.channel==='store'?'&source=store':''}">Tout voir ↗</a></p>`:''}<p class="mir-custom-models-local">Catalogue et dossiers locaux à ce navigateur. Aucun envoi de commande ni paiement n’est effectué.</p></section>`;
 }
 function mount(target,options={}){
  const element=typeof target==='string'?root.document?.querySelector(target):target;if(!element)return {count:0,total:0,error:'target_missing',update:()=>null,destroy:()=>{}};
  let current={...options};const controller={count:0,total:0,status:'ready',update(next={}){current={...current,...next};const result=read(current);element.innerHTML=renderHTML(result,current);element.hidden=current.hideEmpty===true&&result.total===0;controller.count=result.items.length;controller.total=result.total;controller.status=result.status;return {count:result.total,status:result.status};},destroy(){instances.delete(element);element.innerHTML='';}};instances.set(element,controller);controller.update();return controller;
 }
 function mountAll(scope=root.document){if(!scope?.querySelectorAll)return [];return [...scope.querySelectorAll('[data-custom-model-channel]')].filter(element=>!instances.has(element)).map(element=>mount(element,{channel:element.dataset.customModelChannel,title:element.dataset.customModelTitle||undefined,compact:element.dataset.customModelCompact==='true',hideEmpty:element.dataset.customModelHideEmpty==='true',headingLevel:Number(element.dataset.customModelHeading)||2}));}
 function refresh(){for(const [element,controller] of instances){if(!element.isConnected)instances.delete(element);else controller.update();}}
 const api=Object.freeze({version:'1.0.0',storageKey:STORAGE_KEY,read,linkFor,previewSVG,renderHTML,mount,mountAll,refresh});
 if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>mountAll(),{once:true});else mountAll();root.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===null)refresh();});root.addEventListener('pageshow',refresh);root.document.addEventListener('visibilitychange',()=>{if(root.document.visibilityState==='visible')refresh();});}
 return api;
});
