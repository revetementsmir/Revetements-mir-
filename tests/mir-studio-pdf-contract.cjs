'use strict';
// Runtime policy boundary checks. Legacy drawing is deliberately a canary here;
// real PDF generation, pagination and output are verified by browser QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../dist');
const renderer=fs.readFileSync(path.join(root,'mir-studio-pdf.js'),'utf8');
const shared=fs.readFileSync(path.join(root,'annotated-pdf.js'),'utf8');
function context({pathname='/plan.html',search='',marker=true,client=true,available=true}={}){
  let calls=0,legacy=false;
  const window={location:{pathname,search},MIRClientLocale:{isClient:()=>client,getLocale:()=> 'fr-CA',translate:value=>value}};
  const sandbox={window,location:window.location,TextEncoder,Uint8Array,Blob,URL,URLSearchParams,AbortSignal,setTimeout,clearTimeout,
    document:{body:{dataset:marker?{mirStudioLayout:'materials-bottom'}:{}}},
    DOMParser:class{parseFromString(){legacy=true;throw Error('LEGACY_RENDERER_REACHED');}}};
  vm.createContext(sandbox);vm.runInContext(renderer,sandbox,{filename:'mir-studio-pdf.js'});
  const eligible=window.MIRStudioPDF.isClient();
  if(available)window.MIRStudioPDF={make:async(options,helpers)=>{calls++;assert.equal(typeof helpers.svgImage,'function');assert.equal(typeof helpers.assemble,'function');assert.equal(options.theme,'studio-client');return{renderer:'client-stub',pages:4};}};
  else delete window.MIRStudioPDF;
  vm.runInContext(shared,sandbox,{filename:'annotated-pdf.js'});
  return{window,eligible,called:()=>calls,legacy:()=>legacy};
}
const face={key:'front',name:'Avant',svg:'<svg xmlns="http://www.w3.org/2000/svg"/>',summary:['Quantité : à confirmer']};
(async()=>{
  let count=0;
  const allowed=context();assert.equal(allowed.eligible,true);assert.equal((await allowed.window.MIRPDF.makePlan({theme:'studio-client',faces:[face]})).renderer,'client-stub');assert.equal(allowed.called(),1);count++;
  for(const args of [{pathname:'/boutique.html'},{search:'?embed'},{search:'?embed=0'},{search:'?embed=1'},{search:'?context=admin'},{search:'?mode=atelier'},{marker:false},{client:false}]){
    const c=context(args);assert.equal(c.eligible,false,JSON.stringify(args));
    await assert.rejects(c.window.MIRPDF.makePlan({theme:'studio-client',faces:[face]}),/LEGACY_RENDERER_REACHED/);
    assert.equal(c.called(),0);assert.equal(c.legacy(),true);count++;
  }
  for(const options of [{faces:[face]},{theme:'another-theme',faces:[face]},{theme:'studio-client',faces:[{...face,layout:'bending-sheet'}]},{theme:'studio-client',faces:[{...face,layout:'wide'}]}]){
    const c=context();await assert.rejects(c.window.MIRPDF.makePlan(options),/LEGACY_RENDERER_REACHED/);assert.equal(c.called(),0);count++;
  }
  const missing=context({available:false});await assert.rejects(missing.window.MIRPDF.makePlan({theme:'studio-client',faces:[face]}),/présentation PDF du Studio n’a pas chargé/);assert.equal(missing.legacy(),false);count++;
  console.log('PASS Studio PDF opt-in: '+count+' policy cases, including missing-module error and legacy routes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
