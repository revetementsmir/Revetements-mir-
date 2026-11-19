'use strict';
// Execute the field presentation and existing job/cart selection code. No UI,
// account, transport, database or generated verification files are modified.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Store=require('../dist/employee-store-model.js'),Cart=require('../dist/mir-field-cart.js');
const app=fs.readFileSync(require.resolve('../dist/chantier-app.js'),'utf8');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function source(name){
 const match=new RegExp('^  (?:async )?function '+name+'\\(','m').exec(app);assert.ok(match,name);
 const next=/^  (?:(?:async )?function |(?:const|let) )/gm;next.lastIndex=match.index+match[0].length;
 return app.slice(match.index,next.exec(app)?.index??app.length);
}
function node(){return{innerHTML:'',textContent:'',disabled:false,dataset:{},attributes:{},classList:{toggle(){}},setAttribute(name,value){this.attributes[name]=value;}};}
function environment(extra={}){
 const nodes=new Map(['.mir-app-c02','#catalogue-count','#catalogue-grid','[data-field-page-label]','[data-field-page=previous]','[data-field-page=next]','[data-field-store-filters]','#order-cart','#mobile-cart'].map(key=>[key,node()]));
 const env={esc,icon:name=>'<svg data-icon="'+name+'"></svg>',query:'',category:'all',favoritesOnly:false,
  categoryNames:{fixations:'Clous & vis',revetements:'Revêtements',pliages:'Pliages & aluminium'},
  fieldCatalogueItems:new Map(),fieldCataloguePage:0,fieldCatalogueSize:2,fieldCatalogueSignature:'',ui:{fieldCatalogue:'material'},
  shortcutItems:()=>[],favoriteIds:()=>[],productVisual:()=>'',terrainRole:()=>true,
  $:selector=>nodes.get(selector)||null,...extra};
 vm.createContext(env);
 vm.runInContext(['fieldCatalogueMarkup','fieldCatalogueFilters','fieldCartDestinationDrafts','fieldCartDestination','setFieldCartDestination','fieldCartContext','renderFieldCatalogueGrid'].map(source).join('\n'),env);
 return {env,nodes};
}

test('le magasin garde Magasin et Pliages, sans onglet Dessin doublon, avec recherche et panier commun',()=>{
 const {env}=environment();const html=env.fieldCatalogueMarkup();
 assert.match(html,/data-field-catalogue="material"[^>]*>Magasin/);
 assert.match(html,/data-field-catalogue="fold"[^>]*>Pliages/);
 assert.doesNotMatch(html,/data-field-draw/,'le dessin se choisit dans le parcours Pliages');
 const tabs=html.match(/<nav class="mir-app-segments"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.equal((tabs.match(/<button\b/g)||[]).length,2,'exactement deux onglets de commande');
 assert.match(html,/id="catalogue-search"/);
 assert.match(html,/data-field-store-filters[^>]*aria-haspopup="dialog"[^>]*aria-controls="portal-dialog"/);
 assert.doesNotMatch(html,/id="order-job(?:-reference)?"|mir-app-catalogue-context|id="catalogue-category"|field-store-footer|Ouvrir mon panier/);
 assert.match(html,/id="order-cart"/,'le panier reste dans le même parcours');
});

test('le bouton trois barres ouvre les vrais filtres et conserve la catégorie et les favoris choisis',async()=>{
 let opened='',upgrades=0;
 const {env}=environment({category:'revetements',favoritesOnly:true,
  window:{MIRFieldChoices:{upgrade:()=>upgrades++}},
  openDialog:html=>{opened=html;},dialogHeader:(_section,title)=>'<h2>'+title+'</h2>'});
 vm.runInContext(source('handleFieldClick'),env);
 assert.equal(await env.handleFieldClick({dataset:{},hasAttribute:key=>key==='data-field-store-filters'}),true);
 assert.match(opened,/<div id=field-filter-host>/);
 assert.match(opened,/<option value="revetements" selected>/);
 assert.match(opened,/id="favorites-filter" aria-pressed="true"/);
 assert.doesNotMatch(opened,/value="pliages"|order-job|order-job-reference/);
 assert.equal(upgrades,1);
});

test('la liste utilise les articles du catalogue, au moins cinq si disponibles, avec pagination et noms complets',()=>{
 const material=Store.createDemoState([]).catalogue.filter(item=>!item.customBending&&!(item.measureFields||[]).length);
 assert.ok(material.length>=30,'le catalogue local contient les données nécessaires au test');
 for(const count of [0,2,5,7,30]){
  const {env,nodes}=environment(),items=material.slice(0,count),before=JSON.stringify(items);
  env.renderFieldCatalogueGrid(items);
  const rows=[...nodes.get('#catalogue-grid').innerHTML.matchAll(/class="field-store-item" data-field-product="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(rows,items.slice(0,24).map(item=>item.id));
  assert.equal(nodes.get('#catalogue-count').textContent,count+' article'+(count===1?'':'s'));
  if(count>=5)assert.ok(rows.length>=5);
  for(const item of items.slice(0,24))assert.ok(nodes.get('#catalogue-grid').innerHTML.includes('title="'+esc(item.name)+'" aria-label="Choisir '+esc(item.name)+'"'));
  if(count>24){env.fieldCataloguePage=1;env.renderFieldCatalogueGrid(items);assert.equal(nodes.get('[data-field-page-label]').textContent,'25–30 sur 30');assert.equal(nodes.get('[data-field-page=next]').disabled,true);}
  assert.equal(JSON.stringify(items),before,'aucun article ajouté ou réécrit par la présentation');
 }
});

function cartEnvironment(){
 const jobs=[{id:'job-a',name:'Chantier A',address:'1 rue A',assignedMemberIds:['alice','bob']},{id:'job-b',name:'Chantier B',address:'2 rue B',assignedMemberIds:['alice']},{id:'job-private',name:'Privé',assignedMemberIds:['other']}];
 const line=(name,quantity)=>({name,quantity,unit:'pièce',cartKey:name,itemId:name});
 const snapshot={id:'M001',spec:{kind:'profile',segments:[{label:'A',length:5.5},{label:'B',length:3},{label:'C',length:1.5}],bends:[{mode:'signed',angle:90},{mode:'hem',angle:180,direction:'left'}],coloredFace:{segmentId:'A',side:'left'}}};
 const fold=(ownerId,jobId,name)=>({id:'fold:'+ownerId+':'+jobId,kind:'fold',ownerId,jobId,snapshot:JSON.parse(JSON.stringify(snapshot)),line:{...line(name,2),specification:{kind:'fold',instanceSnapshot:JSON.parse(JSON.stringify(snapshot))}}});
 const shared=[fold('alice','job-a','Pliage A'),fold('alice','job-b','Pliage B'),fold('bob','job-a','Pliage Bob')];
 const ui={fieldCatalogue:'material',jobs:{alice:'job-a',bob:'job-a'},cartDestinations:{'alice:unassigned':{jobId:'',jobReference:'No inconnu — 12 rue Test'}},carts:{'alice:job-a':[line('Article A',2)],'alice:job-b':[line('Article B',4)],'alice:unassigned':[line('Sans chantier',1)],'bob:job-a':[line('Article Bob',8)]}};
 const errors=[],messages=[],calls=[];
 const setup=environment({ui,state:{jobs},actorId:'alice',mode:'employee',jobReferenceDraft:'No inconnu — 12 rue Test',reviewingOrder:true,
  model:{listJobs:(state,owner)=>state.jobs.filter(job=>job.assignedMemberIds.includes(owner)),configureLine:(_state,spec)=>({ok:true,line:spec})},
  window:{MIRFieldCart:Cart,MIRUnifiedOrderCart:{list:()=>shared,remove:id=>{const index=shared.findIndex(row=>row.id===id);if(index>=0)shared.splice(index,1);},upsert:row=>{const index=shared.findIndex(entry=>entry.id===row.id);if(index>=0)shared[index]=row;else shared.push(row);}},MIRFieldChoices:{upgrade(){}}},
  jobById:id=>jobs.find(job=>job.id===id),itemById:()=>null,isFold:()=>false,lineDescription:()=>'',deliveryDraft:{mode:'delivery',note:'Note conservée'},isDemo:()=>false,
  orderSubmitting:false,orderFilter:'all',showFormError:message=>errors.push(message),errorMessage:error=>error.message||String(error),toast:message=>messages.push(message),setView(){},
  showOrderStep(){},renderFieldShell(){},save(){},render(){},document:{querySelector:()=>null}});
 setup.env.portalClient={config:{projectRef:'local-fixture'},submitOrder:async payload=>{calls.push(JSON.parse(JSON.stringify(payload)));return{orderId:'00000000-0000-4000-8000-000000000101',receiptId:'00000000-0000-4000-8000-000000000102',status:'submitted'};},refresh:async()=>{},getStatus:()=>({snapshot:setup.env.state})};
 const start=app.indexOf('  const cartKeyFor='),end=app.indexOf('  const isFold =',start);assert.ok(start>=0&&end>start);
 vm.runInContext(app.slice(start,end)+'\n'+['renderCart','handleChange','handleInput','acknowledgeCart'].map(source).join('\n'),setup.env);
 const submitStart=app.indexOf("    if(form.id==='create-order-form'){"),submitEnd=app.indexOf("    if(['extra-form'",submitStart);assert.ok(submitStart>=0&&submitEnd>submitStart);
 vm.runInContext('async function submitCartForTest(form,data){const event={preventDefault(){}};\n'+app.slice(submitStart,submitEnd)+'\n}',setup.env);
 setup.env.render=()=>setup.env.renderCart();
 vm.runInContext('currentCart()',setup.env);
 const choose=value=>setup.env.handleChange({target:{id:'order-job',value,dataset:{},form:{id:'create-order-form',dataset:{}},matches:()=>false,closest:()=>null}});
 const submit=(values={},valid=true)=>{const button={disabled:false,isConnected:true},form={id:'create-order-form',reportValidity:()=>valid,querySelector:()=>button};return setup.env.submitCartForTest(form,new Map(Object.entries({jobReference:'',note:'Note de livraison',deliveryMode:'pickup',...values})));};
 return {...setup,ui,shared,errors,messages,calls,choose,submit};
}

test('le choix chantier est dans le formulaire panier, sa référence est requise lorsque le chantier est à confirmer',()=>{
 const {env,nodes}=cartEnvironment();env.renderCart();
 let html=nodes.get('#order-cart').innerHTML,form=html.slice(html.indexOf('<form id="create-order-form">'));
 assert.match(form,/<div class="field-cart-context">/);
 assert.match(form,/<select id="order-job" name="jobId"/);
 assert.match(form,/<option value="job-a" selected>/);
 assert.doesNotMatch(form,/value="job-private"|id="order-job-reference"/);
 assert.equal(nodes.get('#mobile-cart').innerHTML,'','pas de barre panier secondaire dans le magasin terrain');
 env.ui.jobs.alice='__unassigned__';env.renderCart();html=nodes.get('#order-cart').innerHTML;
 form=html.slice(html.indexOf('<form id="create-order-form">'));
 assert.match(form,/<input id="order-job-reference" name="jobReference"[^>]*value="No inconnu — 12 rue Test"[^>]* required>/);
 assert.match(form,/<option value="__unassigned__" selected>/);
 assert.equal((form.match(/name="jobReference"/g)||[]).length,1,'la référence visible est celle envoyée au contrôleur existant');
});

test('choisir la destination après les articles conserve le même matériel et pliage sans changer le chantier consulté',()=>{
 const {env,nodes,ui,shared,choose}=cartEnvironment(),before=JSON.stringify(ui.carts),folds=JSON.stringify(shared);
 choose('job-b');
 assert.equal(ui.jobs.alice,'job-a','le chantier consulté et les clés du dessin ne changent pas');
 assert.equal(env.fieldCartDestination().jobId,'job-b');
 assert.match(nodes.get('#order-cart').innerHTML,/Article A/);assert.match(nodes.get('#order-cart').innerHTML,/Pliage A/);
 assert.doesNotMatch(nodes.get('#order-cart').innerHTML,/Article B<\/strong>|Pliage B<\/strong>|Article Bob/);
 assert.match(nodes.get('#order-cart').innerHTML,/<option value="job-b" selected>/);
 choose('__unassigned__');assert.match(nodes.get('#order-cart').innerHTML,/Article A/);assert.match(nodes.get('#order-cart').innerHTML,/Pliage A/);
 assert.equal(JSON.stringify(ui.carts),before);assert.equal(JSON.stringify(shared),folds,'aucun pliage déplacé ou réécrit');
 assert.equal(env.setFieldCartDestination({jobId:'job-private'}),false,'destination inaccessible refusée');
 assert.equal(env.fieldCartDestination().jobId,'');
 env.actorId='bob';assert.equal(env.fieldCartDestination().jobId,'job-a','la destination d’Alice n’est pas celle de Bob');
});

test('le reçu confirmé acquitte seulement le panier source et envoie les deux lignes au chantier destinataire',async()=>{
 const {ui,shared,calls,errors,choose,submit}=cartEnvironment();choose('job-b');
 const destinationCart=JSON.stringify(ui.carts['alice:job-b']),otherActor=JSON.stringify(ui.carts['bob:job-a']),otherFolds=JSON.stringify(shared.filter(row=>row.id!=='fold:alice:job-a'));
 await submit();
 assert.deepEqual(errors,[]);
 assert.equal(calls.length,1);assert.equal(calls[0].jobId,'job-b');assert.equal(calls[0].jobReference,'');
 assert.deepEqual(calls[0].lines.map(line=>line.name),['Article A','Pliage A']);
 assert.equal(calls[0].lines[1].specification.instanceSnapshot.spec.bends[1].angle,180);
 assert.equal(ui.carts['alice:job-a'].length,0);assert.equal(ui.jobs.alice,'job-a');
 assert.equal(JSON.stringify(ui.carts['alice:job-b']),destinationCart);assert.equal(JSON.stringify(ui.carts['bob:job-a']),otherActor);
 assert.equal(JSON.stringify(shared),otherFolds);assert.equal(ui.cartDestinations['alice:job-a'],undefined);
});

test('erreur réseau, reçu incomplet et attente hors ligne conservent lignes, pliages et destination',async()=>{
 for(const failure of ['network','receipt','offline']){
  const {env,ui,shared,calls,errors,choose,submit}=cartEnvironment();choose('job-b');
  const before=JSON.stringify(ui.carts),folds=JSON.stringify(shared),destinations=JSON.stringify(ui.cartDestinations);
  env.portalClient.submitOrder=async payload=>{calls.push(JSON.parse(JSON.stringify(payload)));if(failure==='network')throw Error('Serveur indisponible');return failure==='receipt'?{}:{offline:true,clientRequestId:'pending-receipt'};};
  await submit();
  assert.equal(calls[0].jobId,'job-b');assert.equal(JSON.stringify(ui.carts),before,failure);assert.equal(JSON.stringify(shared),folds,failure);assert.equal(JSON.stringify(ui.cartDestinations),destinations,failure);
  if(failure==='offline'){assert.equal(ui.pendingCart.key,'alice:job-a');assert.equal(ui.pendingCart.owner,'alice');assert.equal(ui.pendingCart.sent.length,2);}else assert.equal(errors.length,1);
 }
});

test('la référence d’un chantier à confirmer est obligatoire et suit la destination du panier source',async()=>{
 const {env,ui,calls,choose,submit}=cartEnvironment();choose('__unassigned__');
 const before=JSON.stringify(ui.carts);
 await submit({},false);assert.equal(calls.length,0);assert.equal(JSON.stringify(ui.carts),before);
 await submit();assert.equal(calls.length,0,'aucun envoi d’une destination et référence vides');
 env.handleInput({target:{id:'order-job-reference',value:'Projet 42, rue du Test',dataset:{},form:{id:'create-order-form',dataset:{}},matches:()=>false}});
 assert.equal(env.fieldCartDestination().jobReference,'Projet 42, rue du Test');
 await submit({jobReference:'Projet 42, rue du Test'});
 assert.equal(calls.length,1);assert.equal(calls[0].jobId,undefined);assert.equal(calls[0].jobReference,'Projet 42, rue du Test');
 assert.deepEqual(calls[0].lines.map(line=>line.name),['Article A','Pliage A']);
});

test('la destination survit à la restauration locale tout en restant limitée au propriétaire du panier',()=>{
 const {env,ui,choose}=cartEnvironment();choose('job-b');
 ui.cartDestinations['bob:job-a']={jobId:'job-private',jobReference:'Référence Bob'};
 const storage=new Map();env.localStorage={setItem:(key,value)=>storage.set(key,value)};env.uiStorageKey='fixture-alice';
 env.load=key=>JSON.parse(storage.get(key)||'{}');env.requestId=()=> 'restored-line';
 vm.runInContext(source('save')+'\n'+source('connectedUI'),env);env.save();
 const saved=JSON.parse(storage.get('fixture-alice'));
 assert.equal(saved.jobId,'job-a');assert.equal(saved.cartDestinations['alice:job-a'].jobId,'job-b');assert.equal(saved.cartDestinations['bob:job-a'],undefined);
 storage.set('mir_employee_portal_ui_connected_local-fixture_alice',storage.get('fixture-alice'));
 const restored=env.connectedUI({...env.state,actorId:'alice'});
 assert.equal(restored.jobs.alice,'job-a');assert.equal(restored.cartDestinations['alice:job-a'].jobId,'job-b');assert.equal(restored.cartDestinations['bob:job-a'],undefined);
});
