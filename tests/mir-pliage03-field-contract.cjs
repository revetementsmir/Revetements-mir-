'use strict';
// Execute the actual routing/key definitions and editing entrypoint. Browser
// geometry and controls are covered separately by mir-pliage03-field-browser.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../dist/production-app.js'),'utf8');
const scope=source.slice(source.indexOf('const catalogueChannel='),source.indexOf('const unitValue='));
const declaration=name=>{const match=source.match(new RegExp('^const '+name+'=.*$','m'));assert.ok(match,name);return match[0];};
const begin=source.indexOf('function editFieldOrderItem('),end=source.indexOf('\nfunction editPiece(',begin);assert.ok(begin>0&&end>begin);
const edit=source.slice(begin,end),copy=x=>JSON.parse(JSON.stringify(x));
function run({context=null,embedded=true,mode='client',channel='store',kind='profile',blocked=false}={}){
 const frame={};frame.self=frame;frame.top=embedded?{}:frame;frame.parent=embedded?{MIRFieldDrawingContext(){if(blocked)throw new Error('cross-origin parent');return context;}}:frame;
 const row={id:'M001',kind:'profile',spec:{quantity:2,dimensions:{A:3.5,B:2.25},finish:{name:'QA'}},history:[]};
 const box={client:mode==='client',kind,params:new URLSearchParams({mode,source:channel,kind}),window:frame,order:{items:[row]},draft:null,edits:0,renders:0,updates:0};
 box.editPiece=id=>{box.edits++;box.draft=copy(box.order.items.find(x=>x.id===id).spec);};box.renderFormMetadata=()=>box.renders++;box.updateDrawing=()=>box.updates++;
 vm.createContext(box);vm.runInContext(scope+'\n'+declaration('clientProfileWizard')+'\n'+declaration('publicPliage03')+'\n'+edit+'\nglobalThis.keys={...KEYS};globalThis.presentation=publicPliage03();',box);
 return box;
}
const personal=(ownerId='worker-a',jobId='job-a',extra={})=>({personal:true,ownerId,jobId,presentation:'pliage03',...extra});
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
check('the public client keeps its original keys and presentation',()=>{const x=run({embedded:false,channel:'client'});assert.equal(x.keys.activeProfile,'mir_client_active_profile_v1');assert.equal(x.keys.draft,'mir_production_client_dossier_v1');assert.equal(x.presentation,true);assert.equal(x.editFieldOrderItem('M001'),false);});
check('personal active drafts are distinct per actor, chantier and unassigned job',()=>{const cases=[personal(),personal('worker-b'),personal('worker-a','job-b'),personal('worker-a',''),personal('worker:a','job:b'),personal('worker','a:job:b')].map(context=>run({context}));assert.equal(new Set(cases.map(x=>x.keys.activeProfile)).size,cases.length);assert.ok(cases.every(x=>x.keys.activeProfile!=='mir_client_active_profile_v1'&&x.presentation));assert.equal(cases[0].keys.draft,'mir_production_employee_dossier_v1_worker-a_job-a');assert.ok(cases[3].keys.activeProfile.endsWith(':unassigned'));});
check('standalone, invalid-owner and nonpersonal store contexts stay excluded',()=>{for(const options of[{embedded:false},{context:personal('')},{context:personal('   ')},{context:{...personal(),personal:false}},{context:personal(),blocked:true},{context:personal(),kind:'panel'},{context:personal(),mode:'admin'}]){const x=run(options);assert.equal(x.presentation,false,JSON.stringify(options));assert.equal(x.editFieldOrderItem('M001'),false);assert.equal(x.edits,0);}});
check('legacy personal embedding retains its old presentation and isolated draft',()=>{const x=run({context:personal('worker-a','job-a',{presentation:'legacy'})});assert.equal(x.presentation,false);assert.equal(x.keys.activeProfile,'mir_production_employee_active_profile_v1_worker-a:job-a');assert.equal(x.editFieldOrderItem('M001'),false);});
check('unknown piece and invalid cart quantities do not mutate any draft or order',()=>{const x=run({context:personal()}),archive=JSON.stringify(x.order);for(const quantity of[null,'',0,-1,1.5,100001,Infinity,NaN])assert.equal(x.editFieldOrderItem('M001',{quantity}),false,String(quantity));assert.equal(x.editFieldOrderItem('M002',{quantity:2}),false);assert.equal(x.edits,0);assert.equal(x.draft,null);assert.equal(JSON.stringify(x.order),archive);});
check('reediting preserves current cart quantity without committing a revision',()=>{const x=run({context:personal()}),archive=JSON.stringify(x.order);assert.equal(x.editFieldOrderItem('M001',{quantity:6}),true);assert.equal(x.draft.quantity,6);assert.deepEqual(x.draft.dimensions,{A:3.5,B:2.25});assert.equal(JSON.stringify(x.order),archive);assert.equal(x.renders,1);assert.equal(x.updates,1);assert.equal(x.editFieldOrderItem('M001'),true);assert.equal(x.draft.quantity,2,'legacy caller can still reopen saved quantity');assert.equal(JSON.stringify(x.order),archive);});
const parent=fs.readFileSync(path.resolve(__dirname,'../dist/chantier-app.js'),'utf8');
const mountBegin=parent.indexOf('function mountFieldDrawing('),mountEnd=parent.indexOf('\n  function authorizedFieldJobs',mountBegin);assert.ok(mountBegin>0&&mountEnd>mountBegin);
function mounting({ready=true}={}){
 const appended=[],calls=[],listeners={},attributes={},overlays={};
 const message={textContent:'',setAttribute(){}},retry={hidden:true,addEventListener:(event,fn)=>{if(event==='click')retry.click=fn;}};
 const overlay={dataset:{},style:{},hidden:false,querySelector:key=>({'[data-field-drawing-message]':message,'[data-field-drawing-retry]':retry})[key]};
 const section={dataset:{},querySelector:key=>key==='[data-field-drawing-status]'?overlay:null,getBoundingClientRect:()=>({top:0,left:0})};
 const workspace={editFieldOrderItem:(id,options)=>{calls.push({id,quantity:options.quantity});return true;}};
 const win={listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},MIRProductionWorkspace:ready?workspace:null,MIRFieldChoices:null};
 const doc={location:{pathname:'/production.html'},documentElement:{dataset:{fieldDrawing:'true',mirFieldStartup:'ready',mirProductionReady:'true'}},
  createElement:tag=>({tag,sheet:tag==='link'?null:undefined}),
  head:{append:(...nodes)=>appended.push(...nodes)},
  addEventListener(){},
  querySelector:key=>key==='#production-drawing'?{}:key.includes('mir-pliage03.css')||key.includes('mir-field-trace.css')?{sheet:{}}:null,
  defaultView:win};
 const frame={dataset:{},style:{},attrs:attributes,isConnected:true,contentDocument:doc,contentWindow:win,
  closest:()=>section,
  getBoundingClientRect:()=>({top:100,left:0,height:300,width:390}),
  getAttribute:key=>key==='src'?'production.html?mode=client&source=store&kind=profile':attributes[key],
  setAttribute:(key,value)=>attributes[key]=value,removeAttribute:key=>delete attributes[key],
  addEventListener:(name,fn)=>{listeners[name]=fn;if(name==='load')frame.loaded=fn;},
  src:'production.html?mode=client&source=store&kind=profile'};
 const box={actorId:'worker-a',mode:'employee',view:'draw',job:'job-a',innerHeight:800,
  location:{href:'https://example.test/chantier.html'},
  ui:{fieldDrawingRequest:'request-a',fieldDrawingEdit:{id:'M001',quantity:6,ownerId:'worker-a',jobId:'job-a',role:'employee',requestId:'request-a'}},
  window:{addEventListener(){},removeEventListener(){}},
  MutationObserver:class{observe(){}disconnect(){}},
  requestAnimationFrame:fn=>fn(),
  clearTimeout(){},setTimeout(){return 1;},
  $:key=>key==='#portal-navigation'?{getBoundingClientRect:()=>({top:740})}:key==='#portal-content'?{}:null,
  terrainRole:()=>true,toast(){},URL,console};
 box.currentJobId=()=>box.job;
 box.canKeepFieldDrawing=()=>frame.isConnected&&box.view==='draw'&&box.actorId===frame.dataset.fieldActor&&box.job===frame.dataset.fieldJob&&box.mode===frame.dataset.fieldRole;
 vm.createContext(box);vm.runInContext(parent.slice(mountBegin,mountEnd),box);box.mountFieldDrawing(frame);
 const fireReady=()=>{
   frame.loaded();
   assert.equal(section.dataset.fieldDrawingState,'loading','first render remains masked even after document load');
   assert.equal(frame.attrs['aria-hidden'],'true');
   const stylesheet=appended.find(node=>node.tag==='link'),script=appended.find(node=>node.tag==='script');
   assert.ok(stylesheet&&script,'real controls are loaded as separate resources');
   stylesheet.sheet={};stylesheet.onload();
   win.MIRProductionWorkspace=workspace;
   win.MIRFieldChoices={upgrade(){}};
   script.onload();
   return{stylesheet,script};
 };
 return {box,frame,doc,win,section,overlay,message,retry,appended,calls,workspace,fireReady};
}
check('real mount hides the old document until both styles and controls are ready',()=>{
 const x=mounting();
 assert.equal(x.section.dataset.fieldDrawingState,'loading');
 assert.equal(x.frame.attrs['aria-hidden'],'true');
 x.fireReady();
 assert.equal(x.section.dataset.fieldDrawingState,'ready');
 assert.equal(x.frame.attrs['aria-hidden'],undefined);
 assert.equal(x.frame.inert,false);
 assert.equal(x.calls.length,1);
 assert.deepEqual(x.calls,[{id:'M001',quantity:6}]);
 assert.equal(x.box.ui.fieldDrawingEdit,undefined);
 assert.equal(x.appended.filter(n=>n.tag==='link')[0].href,'mir-field-controls.css');
 assert.equal(x.appended.filter(n=>n.tag==='script')[0].src,'mir-field-controls.js');
});
check('a delayed child cannot consume editing from a different actor, chantier, role or request',()=>{
 for(const [key,value]of[['actorId','worker-b'],['job','job-b'],['mode','chef_equipe'],['view','catalogue'],['request','request-b'],['connected',false]]){
  const x=mounting({ready:false});
  x.frame.loaded();
  if(key==='request')x.box.ui.fieldDrawingRequest=value;
  else if(key==='connected')x.frame.isConnected=value;
  else x.box[key]=value;
  const link=x.appended.find(n=>n.tag==='link'),script=x.appended.find(n=>n.tag==='script');
  link.sheet={};link.onload();
  x.win.MIRProductionWorkspace=x.workspace;x.win.MIRFieldChoices={upgrade(){}};
  script.onload();
  assert.equal(x.calls.length,0,key);
  assert.notEqual(x.section.dataset.fieldDrawingState,'ready',key);
 }
});
check('newer edit requests are never overwritten by an old iframe event',()=>{
 const x=mounting({ready:false});x.frame.loaded();
 const fresh={...x.box.ui.fieldDrawingEdit,requestId:'new-request'};
 x.box.ui.fieldDrawingEdit=fresh;x.box.ui.fieldDrawingRequest=fresh.requestId;
 x.win.MIRProductionWorkspace=x.workspace;x.win.MIRFieldChoices={upgrade(){}};
 const link=x.appended.find(n=>n.tag==='link'),script=x.appended.find(n=>n.tag==='script');
 link.sheet={};link.onload();script.onload();
 assert.equal(x.calls.length,0);
 assert.equal(x.box.ui.fieldDrawingEdit,fresh);
 assert.notEqual(x.section.dataset.fieldDrawingState,'ready');
});
check('failed field controls remain private and offer a retry instead of showing the public UI',()=>{
 const x=mounting();
 x.frame.loaded();x.appended.find(n=>n.tag==='link').onerror();
 assert.equal(x.section.dataset.fieldDrawingState,'error');
 assert.equal(x.frame.attrs['aria-hidden'],'true');
 assert.equal(x.frame.style.visibility,'hidden');
 assert.equal(x.retry.hidden,false);
});
check('a child without verified same-origin field startup never becomes visible',()=>{
 const x=mounting();x.doc.documentElement.dataset.fieldDrawing='false';x.frame.loaded();
 assert.equal(x.section.dataset.fieldDrawingState,'error');
 assert.equal(x.frame.attrs['aria-hidden'],'true');
 assert.equal(x.calls.length,0);
});
console.log(JSON.stringify({passed:true,checks,scope:'actual field context/key logic; parent loader readiness, rejection and edit isolation (simulated DOM), no browser rendering claim'}));
