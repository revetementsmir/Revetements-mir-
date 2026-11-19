'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../dist/production-model.js'),surfaces=require('../dist/mir-pliage-surfaces.js');
const source=fs.readFileSync(require.resolve('../dist/production-app.js'),'utf8');
function implementation(name){
 const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+1);
 assert.ok(start>=0&&end>start,'production function '+name);
 return source.slice(start,end);
}
const copy=value=>JSON.parse(JSON.stringify(value));
function angles(field=true){
 const context=vm.createContext({fieldPliage03:field,kind:'profile',draft:null,clientModelAngles:null,fmt:n=>String(Math.round(n*1e4)/1e4)});
 vm.runInContext(['normalizeFieldBendAngles','normalizeFieldProfileAngles','clientInteriorAngle','bendAngleLabel'].map(implementation).join('\n'),context);
 return context;
}
function spec(){return{kind:'profile',template:'custom',unit:'in',startAngle:31.1234,
 segments:[{label:'A',length:'5.5'},{label:'B',length:'3'},{label:'C',length:'1.5'},{label:'D',length:'2.25'}],
 bends:[{mode:'signed',angle:62.80420001},{mode:'interior',angle:91.25,direction:'right'},{mode:'hem',angle:180,direction:'left'}]};}

test('les angles équipe deviennent des degrés entiers cohérents sans modifier longueurs, départ ou repli',()=>{
 const ctx=angles(),original=spec();ctx.draft=copy(original);ctx.clientModelAngles=copy(original.bends);
 const authoredPoints=[[40.5,15.25],[97.5,202.5],[180.125,150.75]];ctx.drawPoints=copy(authoredPoints);
 ctx.normalizeFieldProfileAngles();
 assert.deepEqual(ctx.draft.bends,[{mode:'signed',angle:63},{mode:'interior',angle:91,direction:'right'},{mode:'hem',angle:180,direction:'left'}]);
 assert.deepEqual(ctx.draft.segments,original.segments);assert.equal(ctx.draft.startAngle,original.startAngle);
 assert.deepEqual(ctx.drawPoints,authoredPoints,'le tracé saisi et son origine sont conservés');
 assert.deepEqual(original,spec(),'la définition source n’est pas réécrite');
 const model=M.buildProfile(ctx.draft);assert.equal(model.valid,true);
 assert.equal(180-Math.abs(model.bends[0].angle),117);assert.equal(model.bends[1].angle,91);
 assert.equal(ctx.clientInteriorAngle(ctx.draft.bends[0]),117);assert.equal(ctx.bendAngleLabel(ctx.draft.bends[0]),'117°');
 const first=JSON.stringify(ctx.draft);
 for(let i=0;i<100;i++)ctx.normalizeFieldProfileAngles();
 assert.equal(JSON.stringify(ctx.draft),first,'retours d’étape sans accumulation d’arrondis');
});

test('sens de pli, valeurs incomplètes et angles invalides ne sont pas transformés en replis',()=>{
 const ctx=angles(),bends=[{mode:'signed',angle:-68.6},{mode:'interior',angle:0.4},{mode:'interior',angle:''},{mode:'interior',angle:-7},{mode:'interior',angle:181}];
 ctx.normalizeFieldBendAngles(bends);
 assert.deepEqual(bends,[{mode:'signed',angle:-69},{mode:'interior',angle:1},{mode:'interior',angle:''},{mode:'interior',angle:-7},{mode:'interior',angle:181}]);
});

test('client public et atelier gardent les angles décimaux et leurs données',()=>{
 const ctx=angles(false);ctx.draft=spec();ctx.clientModelAngles=copy(ctx.draft.bends);const before=JSON.stringify(ctx.draft);
 ctx.normalizeFieldProfileAngles();assert.equal(JSON.stringify(ctx.draft),before);
 assert.equal(ctx.clientInteriorAngle({mode:'interior',angle:91.25}),91.25);
 assert.equal(ctx.bendAngleLabel({mode:'interior',angle:91.25}),'91.25°');
});

test('la grille suit toute la surface disponible et le recadrage conserve exactement la géométrie',()=>{
 const stage={clientWidth:355,clientHeight:240,innerHTML:''};
 const original={kind:'profile',template:'custom',unit:'in',startAngle:90,segments:[{label:'A',length:5.5},{label:'B',length:3},{label:'C',length:1.5}],bends:[{mode:'signed',angle:-90},{mode:'hem',angle:180,direction:'left'}]};
 const model=M.buildProfile(original),points=model.pointsMM.map(([x,y])=>[x+50.8,y+50.8]);
 assert.equal(model.valid,true);
 const context={fieldPliage03:true,drawPoints:copy(points),drawTransform:{scale:520/(14*25.4),ox:140,oy:395},drag:null,
  $:()=>stage,matchMedia:()=>({matches:true}),canDrawProfile:()=>true,build:()=>model,drawingModel:()=>({model,illustrative:false}),diagramSVG:()=>'<svg />'};
 const ctx=vm.createContext(context);
 vm.runInContext(['fieldTraceViewport','fieldTraceProjection','refreshFieldTraceCanvas'].map(implementation).join('\n'),ctx);
 const before=JSON.stringify({points:ctx.drawPoints,model});
 const normal=ctx.fieldTraceViewport();assert.ok(Math.abs(normal.width/normal.height-stage.clientWidth/stage.clientHeight)<1e-12,'le ratio SVG remplit le canevas sans étirement');
 stage.clientHeight=360;const expanded=ctx.fieldTraceViewport();assert.ok(expanded.height>normal.height*1.4,'Agrandir ajoute une zone de tracé utile');
 ctx.refreshFieldTraceCanvas();stage.clientHeight=240;ctx.refreshFieldTraceCanvas();
 const v=ctx.fieldTraceViewport(),tr=ctx.drawTransform;
 for(const [x,y]of points){const px=tr.ox+x*tr.scale,py=tr.oy-y*tr.scale;assert.ok(px>=v.x-1e-6&&px<=v.x+v.width+1e-6&&py>=v.y-1e-6&&py<=v.y+v.height+1e-6,'profil entier visible après réduction');}
 assert.equal(JSON.stringify({points:ctx.drawPoints,model}),before,'agrandir/réduire ne change ni les points ni le modèle');
 const projected=JSON.stringify(ctx.drawTransform);ctx.refreshFieldTraceCanvas();assert.equal(JSON.stringify(ctx.drawTransform),projected,'projection stable sans redimensionnement');
});

test('retour au tracé : le vrai SVG et ses trois labels tiennent dès le premier rendu du petit canevas',()=>{
 for(const height of [156,240,300,360])for(const direction of ['left','right']){
  const draft={kind:'profile',template:'custom',name:'L replié',unit:'in',startAngle:-90,
   segments:[{label:'A',length:5.5},{label:'B',length:3},{label:'C',length:.75}],
   bends:[{mode:'signed',angle:90},{mode:'hem',angle:180,direction}]};
  const model=M.buildProfile(draft),origin=[50.8,50.8],points=model.pointsMM.map(([x,y])=>[x+origin[0],y+origin[1]]),before=JSON.stringify({draft,model,points});
  const dataset={clientEntry:'measures',clientStage:'2'},stage={clientWidth:377,get clientHeight(){return dataset.clientEntry==='draw'?height:100;},innerHTML:''};
  const events=[];let firstSVG;
  const context={M,draft,fieldPliage03:true,kind:'profile',client:true,clientStep:2,clientEntry:'measures',tool:'select',view:'face',drawPoints:copy(points),drawTransform:{scale:1,ox:120,oy:120},drag:null,zoom:1,viewPan:{x:0,y:0},selectedClientAngle:-1,
   traceGridDivisor:4,snap:true,innerWidth:409,innerHeight:500,editingItemId:null,authoring:false,
   document:{body:{dataset}},window:{MIRPliageSurfaces:surfaces},
   $:()=>stage,matchMedia:()=>({matches:true}),build:()=>model,drawingModel:()=>({model,illustrative:false}),clientProfileWizard:()=>true,publicPliage03:()=>true,
   fmt:n=>String(Math.round(n*1e4)/1e4),esc:n=>String(n??''),
   renderDimensions:()=>events.push('dimensions'),focusClientEntry:()=>{},
   renderClientEntry:()=>{dataset.clientEntry='draw';events.push('layout');},syncFieldTraceToolbar:()=>events.push('toolbar'),
   updateDrawing:()=>{events.push('svg');firstSVG=ctx.diagramSVG(model,{illustrative:false});}};
  const ctx=vm.createContext(context);
  vm.runInContext(['fieldTraceViewport','fieldTraceProjection','traceGridStepMM','traceGridSVG','pointOnView','bendAngleLabel','profileAnglesOverlay','publicProfileDiagramContent','diagramSVG','resumeClientTrace'].map(implementation).join('\n'),ctx);
  ctx.resumeClientTrace();
  assert.deepEqual(events,['dimensions','layout','toolbar','svg'],'le layout dessin est mesuré avant le tout premier rendu');
  assert.equal(ctx.clientStep,1);assert.equal(ctx.tool,'draw');
  assert.deepEqual([...firstSVG.matchAll(/data-marker-label="([^"]+)"/g)].map(m=>m[1]),['A','B','C']);
  const viewport=ctx.fieldTraceViewport(),tr=ctx.drawTransform;
  for(const [x,y]of ctx.drawPoints){const px=tr.ox+x*tr.scale,py=tr.oy-y*tr.scale;assert.ok(px>=viewport.x&&px<=viewport.x+viewport.width&&py>=viewport.y&&py<=viewport.y+viewport.height,JSON.stringify({height,direction,px,py,viewport}));}
  assert.equal(JSON.stringify({draft,model,points:ctx.drawPoints}),before,'retour sans changement de cotes, angle, origine ni points');
 }
});


test('les styles Pliage du personnel restent actifs sans la classe mir-prestige des rôles authentifiés',()=>{
 const pliageCss=fs.readFileSync(require.resolve('../dist/mir-pliage03.css'),'utf8');
 const traceCss=fs.readFileSync(require.resolve('../dist/mir-field-trace.css'),'utf8');
 const obsolete=/html\[data-field-pliage03=true\]\s+body\.mir-pliage03\.mir-prestige/;
 assert.doesNotMatch(pliageCss,obsolete,'les styles Pliage terrain ne doivent pas dépendre de mir-prestige');
 assert.doesNotMatch(traceCss,obsolete,'la barre de tracé terrain ne doit pas dépendre de mir-prestige');
 assert.match(traceCss,/html\[data-field-pliage03=true\] body\.mir-pliage03\[data-client-entry="draw"\] #production-preview>#field-trace-toolbar/,'la barre doit être mise en page dans le vrai mode dessin terrain');
});
