'use strict';
// Independent contract audit: actual store adapter, controlled preparation timing.
// No app edit, browser/network, catalogue or cart write.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const repo=path.resolve(__dirname,'../../../..'),source=fs.readFileSync(path.join(repo,'dist/mir-store-siding-previews.js'),'utf8');
function setup(){
 const jobs=[],paints=[];
 const root={MIRClientSidingPreviews:{baseFor:m=>m.supported?{baseImage:'./assets/test.webp',width:100,height:60,viewBox:[0,0,100,60]}:null,prepare:rows=>new Promise((resolve,reject)=>jobs.push({resolve,reject,rows}))},MIRMaterialPreview:{cancel:el=>{el.cancelled=(el.cancelled||0)+1},render:async(el,m,c)=>{el.innerHTML='selected:'+c.id;paints.push(c.id)}}};
 vm.runInNewContext(source,{window:root});return{api:root.MIRStoreSidingPreviews,jobs,paints};
}
const material=()=>({id:'test',name:'Actual controlled fixture',supported:true,colors:[{id:'a',name:'A'},{id:'b',name:'B'}]}),element=()=>({isConnected:true,innerHTML:'original'}),prepare=job=>job.resolve([{...job.rows[0],stableSidingPreview:{clientPrepared:true}}]);
(async()=>{
 const cases=[];
 {
  const {api,jobs,paints}=setup(),m=material(),before=JSON.stringify(m),el=element(),caption={textContent:''},a=api.render(el,caption,m,m.colors[0]),b=api.render(el,caption,m,m.colors[1]);assert.equal(jobs.length,1);prepare(jobs[0]);await Promise.all([a,b]);assert.deepEqual(paints,['b']);assert.equal(el.innerHTML,'selected:b');assert.ok(caption.textContent.includes('B'));assert.equal(JSON.stringify(m),before);cases.push('A puis B pendant préparation : seul B est peint, catalogue inchangé, préparation mutualisée');
 }
 {
  const {api,jobs,paints}=setup(),m=material(),el=element(),caption={textContent:''},a=api.render(el,caption,m,m.colors[0]);await api.render(el,caption,m,null);const cleared=el.innerHTML;prepare(jobs[0]);await a;assert.deepEqual(paints,[]);assert.equal(el.innerHTML,cleared);assert.ok(caption.textContent.includes('teinte à choisir'));cases.push('Réinitialisation pendant préparation : aucun ancien choix ne revient');
 }
 {
  const {api,jobs,paints}=setup(),m=material(),el=element(),a=api.render(el,null,m,m.colors[0]);el.isConnected=false;prepare(jobs[0]);await a;assert.deepEqual(paints,[]);cases.push('Fiche retirée : aucun rendu différé sur le nœud déconnecté');
 }
 {
  const {api,jobs,paints}=setup(),m=material(),a=element(),b=element(),one=api.render(a,null,m,m.colors[0]),two=api.render(b,null,m,m.colors[1]);assert.equal(jobs.length,1);prepare(jobs[0]);await Promise.all([one,two]);assert.equal(a.innerHTML,'selected:a');assert.equal(b.innerHTML,'selected:b');assert.deepEqual(paints,['a','b']);cases.push('Deux fiches : sélections indépendantes malgré cache partagé');
 }
 {
  const {api,jobs}=setup(),el=element();assert.equal(await api.render(el,null,{supported:false},{id:'a'}),false);assert.equal(el.innerHTML,'original');assert.equal(jobs.length,0);cases.push('Produit non pris en charge : rendu historique laissé au consommateur');
 }
 {
  const {api,jobs}=setup(),m=material(),el=element(),result=api.render(el,null,m,m.colors[0]);jobs[0].reject(Error('local source unavailable'));assert.equal(await result,false);assert.equal(el.innerHTML,'original');cases.push('Préparation indisponible : retour explicite au consommateur, sans exception non gérée');
 }
 const report={passed:true,cases,method:'Module réel exécuté en VM Node; préparation différée contrôlée, DOM et moteur de teinte simulés. Complément à la recette navigateur magasin/chantier réalisée par root.',applicationEdits:0,networkRequests:0,cartWrites:0};fs.writeFileSync(path.join(__dirname,'store-preview-races.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
