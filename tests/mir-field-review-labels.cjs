'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../dist/production-model.js'),surfaces=require('../dist/mir-pliage-surfaces.js');
const source=fs.readFileSync(process.env.MIR_FIELD_REVIEW_APP_SOURCE||require.resolve('../dist/production-app.js'),'utf8');
function implementation(name){
 const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+1);
 assert.ok(start>=0&&end>start,'actual production function '+name);
 return source.slice(start,end);
}
function profile(lengths=[3.5,2.25],bends=[{mode:'interior',angle:113,direction:'left'}]){
 return M.buildProfile({kind:'profile',template:'custom',name:'Pièce à vérifier',unit:'in',startAngle:0,
  segments:lengths.map((length,index)=>({label:String.fromCharCode(65+index),length})),bends,
  coloredFace:{segmentId:'A',side:'left'}});
}
function controller(model,{width=358,height=300,step=4,field=true,indices=[0,1,2]}={}){
 const stage={clientWidth:width,clientHeight:height};
 const ctx=vm.createContext({M,fieldPliage03:field,clientStep:step,kind:'profile',tool:'select',view:'face',
  client:true,authoring:false,editingItemId:null,drag:null,zoom:1,viewPan:{x:0,y:0},drawPoints:[],drawTransform:null,
  innerWidth:width+32,innerHeight:796,selectedClientAngle:-1,draft:model.spec,
  window:{MIRPliageSurfaces:surfaces,MIRPliage03:{measurementIndices:()=>indices}},
  clientProfileWizard:()=>true,publicPliage03:()=>true,matchMedia:query=>({matches:/959/.test(query)?width<960:width<600}),
  $:selector=>selector==='#production-drawing'?stage:null,profileMeasureInput:()=>null,
  fmt:value=>String(Math.round(value*1e4)/1e4),esc:value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))});
 vm.runInContext(['pointOnView','fitModel','bendAngleLabel','profileAnglesOverlay','publicProfileDiagramContent','fieldProfileDiagramSVG','diagramSVG'].map(implementation).join('\n'),ctx);
 return{ctx,render:()=>ctx.diagramSVG(model,{illustrative:false}),width,height};
}
function geometry(svg,width,height){
 const box=svg.match(/viewBox="([^"]+)"/)[1].trim().split(/\s+/).map(Number);
 return{box,scale:Math.min(width/box[2],height/box[3])};
}
function captions(svg){
 return [...svg.matchAll(/<g class="profile-side-marker"([^>]*)><g transform="translate\(([^)]*)\) rotate\(([^)]*)\)"><rect [^>]*\/><text ([^>]*)>([^<]*)<\/text>/g)].map(match=>({
  index:Number(match[1].match(/data-segment-index="(\d+)"/)[1]),rotation:Number(match[3]),
  font:Number(match[4].match(/font-size="([^"]+)"/)[1]),text:match[5]
 }));
}

test('Vérification mobile garde les cotes et degrés lisibles à taille réelle, sans modifier la pièce',()=>{
 const model=profile(),before=JSON.stringify(model);
 for(const width of [320,355,390,834]){
  const {render,height}=controller(model,{width}),svg=render(),{scale}=geometry(svg,width,height),labels=captions(svg);
  assert.deepEqual(labels.map(label=>label.index),[0,1]);
  for(const label of labels){
   assert.equal(label.text,model.segments[label.index].label+' · '+M.formatMeasurement(model.segments[label.index].lengthMM,model.unit));
   assert.equal(label.rotation,0,'cotes horizontales au récapitulatif');
   assert.ok(label.font*scale>=14,'cote lisible à 100 %, sans devoir zoomer : '+label.font*scale+' px');
  }
  const angle=[...svg.matchAll(/<text ([^>]*)>(\d+(?:[.,]\d+)?°)<\/text>/g)];
  assert.equal(angle.length,1,'angle non masqué au récapitulatif');
  assert.equal(angle[0][2],'113°');
  assert.ok(Number(angle[0][1].match(/font-size="([^"]+)"/)[1])*scale>=14,'degré lisible à 100 %');
 }
 assert.equal(JSON.stringify(model),before,'géométrie, longueurs et finition restent identiques');
});

test('Vérification montre tous les côtés même après la dernière page de mesures et conserve les replis',()=>{
 const cases=[
  profile([5.5,3,.75],[{mode:'interior',angle:90,direction:'left'},{mode:'hem',direction:'left'}]),
  profile([5.5,3,1.5,2,1.25,2,.75],Array.from({length:6},(_,i)=>({mode:'interior',angle:90,direction:i%2?'right':'left'}))),
  profile([3,1,.5,.5,2.25,.5],[{mode:'signed',angle:-90},{mode:'interior',angle:117,direction:'left'},{mode:'hem',direction:'left'},{mode:'signed',angle:-63},{mode:'hem',direction:'left'}])
 ];
 for(const model of cases)for(const width of [320,390,834]){
  const before=JSON.stringify(model),{render}=controller(model,{width,indices:[model.segments.length-2,model.segments.length-1]});
  const labels=captions(render());
  assert.deepEqual(labels.map(label=>label.index),model.segments.map((_,i)=>i),'aucune cote omise parce que sa page de saisie était cachée');
  assert.equal(JSON.stringify(model),before,'les retours et leurs dimensions physiques sont conservés');
 }
});

test('zoom, déplacement et Vue complète restent opérants sur le récapitulatif',()=>{
 const model=profile(),before=JSON.stringify(model),{ctx,render}=controller(model);
 const initial=render(),tr={...ctx.drawTransform};
 ctx.zoom=1.5;ctx.viewPan={x:11,y:-8};const enlarged=render(),zoomed=ctx.drawTransform;
 assert.notEqual(enlarged,initial,'les contrôles agissent réellement sur le SVG');
 assert.ok(Math.abs(zoomed.scale/tr.scale-1.5)<1e-10,'le facteur choisi est appliqué à la projection');
 const point=model.pointsMM[0],base=ctx.pointOnView(point,tr),moved=ctx.pointOnView(point,zoomed);
 assert.ok(Math.abs(moved[0]-(179+(base[0]-179)*1.5+11))<1e-7);
 assert.ok(Math.abs(moved[1]-(150+(base[1]-150)*1.5-8))<1e-7);
 ctx.zoom=1;ctx.viewPan={x:0,y:0};assert.equal(render(),initial,'Vue complète retrouve exactement le cadrage lisible');
 assert.equal(JSON.stringify(model),before);
});

test('pagination des mesures et aperçu du client public conservent leur propre portée',()=>{
 const model=profile([3,1,.75],[{mode:'interior',angle:90,direction:'left'},{mode:'hem',direction:'left'}]);
 const measure=controller(model,{step:2,indices:[1,2]}).render();
 assert.deepEqual(captions(measure).map(label=>label.index),[1,2],'étape2 reste liée aux champs visibles');
 const publicSVG=controller(model,{field:false}).render();
 assert.deepEqual(geometry(publicSVG,358,300).box,[0,0,800,520],'aucun changement de projection pour le client public');
 assert.ok(!publicSVG.includes('mir-field-measured-profile'),'le nouveau rendu reste opt-in équipe');
});
