/* Client presentation only: original forms, controls and event targets are kept.
 * No account, project, storage or network API is called by this module. */
(()=>{
 'use strict';
 const file=location.pathname.split('/').pop(),params=new URLSearchParams(location.search);
 if(!['chantier.html','plan.html'].includes(file))return;
 if(file==='plan.html'&&(params.has('embed')||document.body.classList.contains('embed-studio')))return;
 const $=(selector,root=document)=>root.querySelector(selector);
 const all=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
 const hiddenByApp=node=>!node?.isConnected||!!node.closest('[hidden]');
 const off='mir-workspace-off-page';
 const navs=new WeakMap();
 let frame=0,account=null,studio=null;
 const labelsEN={'Section du compte':'Account section','Commandes du studio':'Studio controls','Section précédente':'Previous section','Section suivante':'Next section','Créer mon compte':'Create my account','Mon compte':'My account','Informations':'Information','Aide et accès':'Help and access','Adresse · rue et destinataire':'Address · street and recipient','Adresse · ville et code postal':'Address · city and postal code','Ouvrir mon projet':'Open my project','Mon plan et son volume':'My plan and its volume','Vue et élévation':'View and elevation','Affichage et rotation':'Display and rotation','Fabricant et profil':'Manufacturer and profile','Format et couvrance':'Format and coverage','Couleur du fabricant':'Manufacturer colour','Référence et documents':'Reference and documents','Profil et sens de pose':'Profile and orientation','Battens et espacement':'Battens and spacing','Vérification de la pose':'Installation checks','Fenêtres et portes':'Windows and doors','Position et dimensions':'Position and dimensions','Modifier la zone':'Edit the zone','Zone sélectionnée':'Selected zone','Réglages de la partie':'Part settings','Soffite et fascia':'Soffit and fascia','Outils des zones':'Zone tools','Choisir une zone':'Choose a zone','Surfaces et quantités':'Areas and quantities','Enregistrer et exporter':'Save and export','À propos du studio':'About the studio','Repérage du plan':'Plan detection'};
 const localLabel=text=>{if(!document.documentElement.lang.startsWith('en'))return text;const match=/^(.*?)( · \d+\/\d+)?$/.exec(text);return (labelsEN[match?.[1]]||match?.[1]||text)+(match?.[2]||'');};
 function mark(node,hide){if(node&&node.classList.contains(off)!==hide)node.classList.toggle(off,hide);}
 function makeNav(id,label,onSelect){
  const nav=document.createElement('nav');nav.className='mir-workspace-pages';nav.id=id;nav.setAttribute('aria-label',label);
  const previous=document.createElement('button');previous.type='button';previous.textContent='←';previous.setAttribute('aria-label','Section précédente');
  const field=document.createElement('label');const text=document.createElement('span');text.className='mir-workspace-sr';text.textContent=label;
  const select=document.createElement('select');select.id=id+'-select';field.append(text,select);
  const next=document.createElement('button');next.type='button';next.textContent='→';next.setAttribute('aria-label','Section suivante');nav.append(previous,field,next);
  let choices=[],active='',signature='';
  select.addEventListener('change',()=>onSelect(select.value));
  previous.addEventListener('click',()=>{const i=choices.findIndex(item=>item.id===active);if(i>0)onSelect(choices[i-1].id);});
  next.addEventListener('click',()=>{const i=choices.findIndex(item=>item.id===active);if(i>=0&&i<choices.length-1)onSelect(choices[i+1].id);});
  navs.set(nav,{sync(items,id){
   choices=items;active=id;const key=document.documentElement.lang+'|'+items.map(item=>item.id+':'+item.label).join('|');
   if(key!==signature){signature=key;select.replaceChildren(...items.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=localLabel(item.label);return option;}));nav.setAttribute('aria-label',localLabel(label));text.textContent=localLabel(label);previous.setAttribute('aria-label',localLabel('Section précédente'));next.setAttribute('aria-label',localLabel('Section suivante'));}
   if(select.value!==id)select.value=id;
   const index=items.findIndex(item=>item.id===id);previous.disabled=index<=0;next.disabled=index<0||index>=items.length-1;
  }});
  return nav;
 }
 function accountEligible(){
  if(['invite','invitation','token'].some(key=>params.has(key))||$('[data-mir-invitation="true"]'))return false;
  return ['login','client','loading'].includes(document.body.dataset.portalMode||'login')&&!!$('.auth-grid');
 }
 function installAccount(){
  const eligible=accountEligible();
  if(!eligible){if(document.body.dataset.mirClientWorkspace==='account')delete document.body.dataset.mirClientWorkspace;return;}
  document.body.dataset.mirClientWorkspace='account';
  const grid=$('.auth-grid'),card=$('.auth-card',grid),intro=$('.auth-intro',grid);
  if(!card||!intro)return;
  if(!account||account.card!==card){
   const signup=$('#auth-signup-form',card),address=signup?.querySelector('details');
   account={grid,card,intro,signup,address,page:'form',choices:[{id:'form',label:signup?'Créer mon compte':'Mon compte'},{id:'info',label:'Informations'},{id:'help',label:'Aide et accès'}]};
   if(address)account.choices.splice(1,0,{id:'address-1',label:'Adresse · rue et destinataire'},{id:'address-2',label:'Adresse · ville et code postal'});
   const nav=makeNav('mir-account-workspace-pages','Section du compte',id=>{account.page=id;syncAccount();});
   account.nav=nav;intro.after(nav);
   const secondary=all(':scope > [data-auth-screen]',card);
   if(secondary.length){const row=document.createElement('div');row.className='mir-auth-secondary-actions';secondary[0].before(row);for(const node of secondary)row.append(node);account.secondary=row;}
   if(address){
    account.addressUnits=all(':scope > label,:scope > .account-two-fields',address);
    address.addEventListener('toggle',()=>{if(address.open&&account.page==='form'){account.page='address-1';syncAccount();}});
   }
   card.addEventListener('invalid',event=>{
    if(!card.contains(event.target))return;
    if(address?.contains(event.target)){const unit=account.addressUnits.find(node=>node.contains(event.target));account.page=account.addressUnits.indexOf(unit)<3?'address-1':'address-2';}
    else account.page='form';
    syncAccount();
   },true);
  }
  syncAccount();
 }
 function syncAccount(){
  if(!account?.card.isConnected)return;
  const {card,intro,address,signup,page,nav}=account,info=page==='info',help=page==='help',shipping=page.startsWith('address-');
  document.body.dataset.mirAccountPage=page;
  navs.get(nav).sync(account.choices,page);
  for(const node of Array.from(intro.children))mark(node,node.tagName!=='H1'&&!info);
  for(const node of Array.from(card.children)){
   const informational=node.matches('#auth-google,.auth-footnote,.auth-divider'),support=node.matches('.mir-prestige-account-support,.mir-help-launch');
   const persistent=node.matches('.auth-error,.auth-message');
   mark(node,persistent?false:support?!help:informational?!info:info||help);
  }
  if(signup){
   for(const node of Array.from(signup.children)){
    if(node===address)mark(node,!shipping);
    else if(node.matches('button[type="submit"]'))mark(node,false);
    else mark(node,shipping);
   }
  }
  if(address){
   if(shipping&&!address.open)address.open=true;
   for(const node of Array.from(address.children)){
    if(node.tagName==='SUMMARY'||node.tagName==='P')mark(node,true);
    else{const index=account.addressUnits.indexOf(node);mark(node,shipping&&(page==='address-1'?index>=3:index<3));}
   }
  }
  // The support launcher stays directly in its card: its existing module owns
  // that placement and its click listener. Only its current page is changed.
 }
 function wrap(parent,nodes,id){
  const valid=nodes.filter(Boolean);if(!parent||!valid.length)return null;
  const panel=document.createElement('section');panel.className='mir-workspace-studio-panel';panel.dataset.mirStudioPanel=id;
  parent.append(panel);for(const node of valid)panel.append(node);return panel;
 }
 function pairFor(id){const input=$('#'+id);if(!input)return[];const label=$('label[for="'+id+'"]');return [label,input].filter(Boolean);}
 function installStudio(){
  const main=$('body > main'),workspace=$('#workspace'),drawing=$('.drawing-column'),controls=$('#studio-controls');
  if(!main||!workspace||!drawing||!controls)return;
  document.body.dataset.mirClientWorkspace='studio';
  if(studio)return syncStudio();
  studio={main,workspace,drawing,controls,panels:[],active:'project:0',pages:[],measuredWidth:0};
  const top=document.createElement('div');top.className='mir-studio-workspace-top';main.prepend(top);studio.top=top;
  const parts=$('.part-nav');if(parts)top.append(parts);
  const nav=makeNav('mir-studio-workspace-pages','Commandes du studio',id=>{studio.active=id;applyStudioPage();});top.append(nav);studio.nav=nav;
  const add=(id,label,parent,nodes,options={})=>{const root=wrap(parent,nodes,id);if(root){studio.panels.push({id,label,root,...options});}return root;};
  const direct=(id,label,root,options={})=>{if(root){root.classList.add('mir-workspace-studio-panel');root.dataset.mirStudioPanel=id;studio.panels.push({id,label,root,...options});}return root;};
  const intro=$('.studio-intro'),start=$('.studio-start'),startNote=start?.querySelector('small');
  add('project','Ouvrir mon projet',controls,start?Array.from(start.children).filter(node=>node!==startNote):[]);
  add('project-state','Mon plan et son volume',controls,[$('.project-bar')]);
  const view=$('.view-toolbar');add('view','Vue et élévation',controls,[...(view?Array.from(view.children):[]),$('.controls-top'),$('.mir-jump-controls')]);
  const display=$('.display-toolbar');add('display','Affichage et rotation',controls,[display,$('#rotate-control'),$('.stage-bottom'),$('#mir-site-toggle'),$('#mir-stairs-toggle')]);
  const stage=$('#stage');if(stage&&stage.parentElement!==drawing)drawing.append(stage);
  // Keep the real view controls together in one reserved row. Terrain and
  // stairs remain reachable through Display; fullscreen and zoom never overlap.
  const stageActions=$('.mir-stage-actions'),zoom=$('#mir-zoom-controls');
  if(stageActions&&zoom)stageActions.append(zoom);
  const material=$('#material-controls');
  add('material','Fabricant et profil',material,[...pairFor('material-manufacturer'),...pairFor('material')]);
  add('format','Format et couvrance',material,[$('#material-format-field'),$('#coverage-input-field')]);
  const colours=$('#zone-colors'),colourLabel=colours?.previousElementSibling;
  direct('colour','Couleur du fabricant',colours,{common:colourLabel?.classList.contains('label-row')?[colourLabel]:[],grid:true});
  add('material-docs','Référence et documents',material,[$('.material-preview',material),$('#color-note'),$('#color-source')]);
  add('orientation','Profil et sens de pose',material,[$('.product-orientation'),$('#pattern-note')]);
  add('battens','Battens et espacement',material,[$('#batten-spacing-field'),$('#vertical-rule-summary')]);
  add('layout-alerts','Vérification de la pose',material,[$('#layout-alerts')]);
  const details=material?all(':scope > details',material):[];
  for(const [index,detail] of details.entries())direct('detail-'+index,detail.querySelector('summary')?.textContent.replace(/⌄/g,'').trim()||'Détail de pose',detail,{details:true});
  direct('opening','Fenêtres et portes',$('#opening-controls'));
  direct('geometry','Position et dimensions',$('#geometry-controls'),{details:true});
  add('accent','Modifier la zone',$('.zone-controls'),[$('#mir-accent-actions')]);
  add('zone-context','Zone sélectionnée',$('.zone-controls'),[$('#zone-origin')]);
  direct('part','Réglages de la partie',$('#extra-controls'));
  const finish=$('#finish-controls');direct('finish','Soffite et fascia',finish,{details:true});
  add('edit','Outils des zones',controls,[$('.edit-toolbar'),$('#mode-help')]);
  direct('zones','Choisir une zone',$('#zone-list'),{grid:true});
  const zones=$('#zone-list');if(zones)controls.append(zones);
  const zoneHeading=$('.zones-heading');if(zoneHeading){const entry=studio.panels.find(panel=>panel.id==='zones');if(entry){entry.common=[zoneHeading];zones.before(zoneHeading);}}
  add('coverage','Surfaces et quantités',controls,[$('#coverage-summary')]);
  add('export','Enregistrer et exporter',controls,[$('.drawing-footer'),$('.save-panel')]);
  add('info','À propos du studio',controls,[intro?.firstElementChild,startNote,$('.project-notes'),$('.studio-source-links'),$('.mir-studio-tools')]);
  add('detection','Repérage du plan',controls,[$('#detection-panel')]);
  // Keep the original empty structural wrappers; the engine still owns them.
  for(const node of [intro,start,view])if(node)node.classList.add('mir-workspace-shell-empty');
  all('[data-part]').forEach(button=>button.addEventListener('click',()=>{
   const group=button.dataset.part==='facade'?'material':['soffit','fascia'].includes(button.dataset.part)?'finish':'part';
   studio.active=group+':0';schedule();
  }));
  $('#mir-edit-accent')?.addEventListener('click',()=>{studio.active='geometry:0';schedule();});
  controls.addEventListener('focusin',event=>{
   const unit=event.target.closest('[data-mir-workspace-unit]');
   if(unit?.classList.contains(off)){const page=studio.pages.find(item=>item.units.includes(unit));if(page){studio.active=page.id;applyStudioPage();}}
  });
  syncStudio();
 }
 function unitsFor(panel){
  const root=panel.root;
  if(panel.grid)return Array.from(root.children).filter(node=>!node.matches('script,style'));
  const units=[];
  const visit=container=>{
   container.dataset.mirWorkspaceBranch='true';
   const nodes=Array.from(container.children).filter(node=>!node.matches('script,style'));
   for(let index=0;index<nodes.length;index++){
    const node=nodes[index];
    if(node.tagName==='SUMMARY'){units.push(node);continue;}
    if(node.matches('label[for]')&&nodes[index+1]?.id===node.htmlFor){
     const field=document.createElement('div');field.className='mir-workspace-field';node.before(field);field.append(node,nodes[++index]);units.push(field);continue;
    }
    if(node.classList.contains('mir-workspace-field')||node.matches('label,button,a,p,h1,h2,h3,summary,select,input,output,img,canvas,svg')){units.push(node);continue;}
    if(node.children.length&&node.querySelectorAll('input,select,button,a,summary,p,h1,h2,h3').length>1)visit(node);
    else units.push(node);
   }
  };
  visit(root);return units;
 }
 function measurePanel(panel,budget){
  if(hiddenByApp(panel.root))return[];
  const units=unitsFor(panel).filter(node=>!hiddenByApp(node));
  if(!units.length)return[];
  panel.units=units;for(const unit of units)unit.dataset.mirWorkspaceUnit='true';
  const style=panel.root.getAttribute('style'),wasOff=panel.root.classList.contains(off);
  const branches=all('[data-mir-workspace-branch]',panel.root);
  mark(panel.root,false);for(const branch of branches)mark(branch,false);for(const unit of units)mark(unit,false);
  panel.root.style.setProperty('position','absolute','important');panel.root.style.setProperty('visibility','hidden','important');
  const controlsCSS=getComputedStyle(studio.controls),contentWidth=studio.controls.clientWidth-(parseFloat(controlsCSS.paddingLeft)||0)-(parseFloat(controlsCSS.paddingRight)||0);
  panel.root.style.setProperty('width',Math.max(180,contentWidth)+'px','important');
  panel.root.style.setProperty('height','auto','important');panel.root.style.setProperty('max-height','none','important');
  let commonHeight=0;
  for(const node of panel.common||[]){
   if(hiddenByApp(node))continue;
   const commonOff=node.classList.contains(off);mark(node,false);
   const rect=node.getBoundingClientRect(),css=getComputedStyle(node);
   commonHeight+=rect.height+(parseFloat(css.marginTop)||0)+(parseFloat(css.marginBottom)||0);
   mark(node,commonOff);
  }
  const measured=units.map(unit=>{const rect=unit.getBoundingClientRect(),css=getComputedStyle(unit);return {unit,height:rect.height+(parseFloat(css.marginTop)||0)+(parseFloat(css.marginBottom)||0)};}).filter(item=>item.height>=1);
  const rows=[];let row=[],height=0;
  const rootCSS=getComputedStyle(panel.root),columns=panel.grid?Math.max(1,rootCSS.gridTemplateColumns.split(/\s+/).length):1;
  const gap=panel.grid?(parseFloat(rootCSS.rowGap)||0):6;
  // A grid row costs the height of its tallest card. Dividing each card by
  // three undercounts a partial or uneven row and can push the footer offscreen.
  for(let index=0;index<measured.length;index+=columns){
   const group=measured.slice(index,index+columns),cost=Math.max(...group.map(item=>item.height));
   if(row.length&&(height+gap+cost>budget-commonHeight||panel.grid&&row.length+group.length>6)){rows.push(row);row=[];height=0;}
   height+=(row.length?gap:0)+cost;row.push(...group.map(item=>item.unit));
  }
  if(row.length)rows.push(row);
  if(style===null)panel.root.removeAttribute('style');else panel.root.setAttribute('style',style);
  mark(panel.root,wasOff);
  return rows.map((members,index)=>({id:panel.id+':'+index,label:panel.label+(rows.length>1?' · '+(index+1)+'/'+rows.length:''),panel,units:members}));
 }
 function syncStudio(){
  if(!studio)return;
  for(const host of [$('#material-controls'),$('.zone-controls')])host?.classList.remove('mir-workspace-inactive-host');
  const top=studio.main.getBoundingClientRect().top,header=studio.top.getBoundingClientRect().height;
  const footer=$('body > .mir-signature-footer'),footerCSS=footer?getComputedStyle(footer):null;
  const footerHeight=footer&&footerCSS.display!=='none'?footer.getBoundingClientRect().height+(parseFloat(footerCSS.marginTop)||0)+(parseFloat(footerCSS.marginBottom)||0):0;
  const available=Math.max(280,innerHeight-top-header-footerHeight-12),wide=innerWidth>=780;
  const stageHeight=wide?available:Math.max(140,Math.min(300,available*.43));
  studio.main.style.setProperty('--mir-studio-stage-height',Math.round(stageHeight)+'px');
  const budget=Math.max(145,wide?available-55:available-stageHeight-42);
  studio.pages=studio.panels.flatMap(panel=>measurePanel(panel,budget));
  const context=!hiddenByApp($('#opening-controls'))?'opening':!hiddenByApp($('#finish-controls'))?'finish':!hiddenByApp($('#extra-controls'))?'part':'material';
  if(studio.context&&studio.context!==context&&studio.pages.some(page=>page.id.startsWith(context+':')))studio.active=context+':0';
  studio.context=context;
  if(!studio.pages.some(page=>page.id===studio.active))studio.active=studio.pages.find(page=>page.id.startsWith(studio.active.split(':')[0]+':'))?.id||studio.pages[0]?.id||'';
  applyStudioPage();
 }
 function applyStudioPage(){
  if(!studio||!studio.pages.length)return;
  const selected=studio.pages.find(page=>page.id===studio.active)||studio.pages[0];studio.active=selected.id;
  for(const panel of studio.panels){
   const active=panel===selected.panel;mark(panel.root,!active);
   for(const node of panel.common||[])mark(node,!active);
   for(const unit of panel.units||[])mark(unit,!active||!selected.units.includes(unit));
   for(const branch of all('[data-mir-workspace-branch]',panel.root).reverse())mark(branch,!active||!selected.units.some(unit=>branch.contains(unit)));
  }
  for(const root of [$('#material-controls'),$('.zone-controls')]){
   if(!root)continue;const active=studio.panels.some(panel=>root.contains(panel.root)&&panel===selected.panel);
   root.classList.toggle('mir-workspace-inactive-host',!active);
  }
  document.body.dataset.mirStudioPage=selected.panel.id;navs.get(studio.nav).sync(studio.pages,selected.id);
 }
 function sync(){frame=0;if(file==='chantier.html')installAccount();else installStudio();}
 function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
 function start(){
  sync();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','data-portal-mode']});
  addEventListener('resize',schedule);document.addEventListener('mir:client-locale-changed',schedule);
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
