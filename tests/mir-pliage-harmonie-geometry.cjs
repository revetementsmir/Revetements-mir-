'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sourceRoot=process.env.MIR_GEOMETRY_SOURCE_ROOT?path.resolve(process.env.MIR_GEOMETRY_SOURCE_ROOT):path.join(__dirname,'../dist');
const app=fs.readFileSync(path.join(sourceRoot,'production-app.js'),'utf8'),R=require(path.join(sourceRoot,'mir-profile-recognition.js')),M=require('../dist/production-model.js');
function source(name){const start=app.indexOf('function '+name+'(');if(start<0)return '';const end=app.indexOf('\nfunction ',start+1);return app.slice(start,end<0?app.length:end);}
const radians=x=>x*Math.PI/180,angleError=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const magnet=new Function(source('magneticHeading')+'\nreturn magneticHeading;')();
const trace=tool=>new Function('draft','tool','fmt','unitValue','copy','authoring',source('toCustom')+'\nreturn toCustom;')({},tool,n=>String(Math.round(n*10000)/10000),(n,unit)=>unit==='mm'?n:n/25.4,x=>JSON.parse(JSON.stringify(x)),false);
const rotate=(points,angle,scale=1)=>points.map(([x,y])=>[scale*(x*Math.cos(angle)-y*Math.sin(angle)),scale*(x*Math.sin(angle)+y*Math.cos(angle))]);

test('accrochage 45°/90° relatif au dernier côté dans tous les quadrants',()=>{
 for(const previous of [17,63,107,161,213,257,301,343])for(const turn of [-135,-90,-45,0,45,90,135,180])for(const delta of [-1,1]){
  const target=radians(previous+turn),out=magnet(target+radians(delta),{heading:radians(previous)});
  assert.ok(angleError(out,target)<1e-10,JSON.stringify({previous,turn,delta,actual:out*180/Math.PI}));
 }
});
test('axes absolus et hystérésis conservés, aucun saut à travers ±180°',()=>{
 for(let a=-180;a<=180;a+=45){const target=radians(a),g={};assert.ok(angleError(magnet(target+radians(2),g),target)<1e-10);assert.ok(angleError(magnet(target+radians(4),g),target)<1e-10);assert.ok(angleError(magnet(target+radians(7),g),target+radians(7))<1e-10);}
});
test('retour écrasé proposé dès le petit premier rebord, peu importe orientation/échelle',()=>{
 for(const degrees of [0,45,90,135,180,225,270,315])for(const scale of [.1,1,10])for(const sign of [-1,1]){
  const points=rotate([[0,0],[20,0],[-80,sign*5]],radians(degrees),scale),before=JSON.stringify(points),spec=trace('draw')(points,{unit:'mm'});
  assert.equal(spec.bends[0].mode,'hem',JSON.stringify({degrees,scale,sign,bend:spec.bends[0]}));assert.equal(spec.segments.length,2);assert.equal(spec.bends.length,1);assert.equal(JSON.stringify(points),before);
  assert.ok(Math.abs(Number(spec.segments[0].length)-20*scale)<.0001);assert.ok(Math.abs(Number(spec.segments[1].length)-Math.hypot(100,5)*scale)<.0001);
 }
});
test('édition existante, sens du hem et deux angles distincts conservés',()=>{
 const points=[[0,0],[100,0],[20,5]],edit=trace('edit');assert.equal(edit(points,{unit:'mm',bends:[]}).bends[0].mode,'signed');
 assert.deepEqual(edit(points,{unit:'mm',bends:[{mode:'hem',angle:180,direction:'right'}]}).bends,[{mode:'hem',angle:180,direction:'right'}]);
 const two=trace('draw')([[0,0],[100,0],[100,20],[20,20]],{unit:'mm'});assert.deepEqual(two.bends,[{mode:'signed',angle:90},{mode:'signed',angle:90}]);assert.equal(R.recognize(two).code,'j-u');
});
test('la reconnaissance ne transforme pas un angle aigu valide en retour écrasé',()=>{
 for(const bend of [{mode:'signed',angle:174},{mode:'signed',angle:-174},{mode:'interior',angle:5,direction:'left'}]){
  const spec={kind:'profile',template:'custom',unit:'mm',segments:[{label:'A',length:100},{label:'B',length:40}],bends:[bend],startAngle:0},model=M.buildProfile(spec),before=JSON.stringify(model);assert.equal(model.valid,true);assert.notEqual(R.recognize(model).code,'hem');assert.equal(JSON.stringify(model),before);
 }
 for(const direction of ['left','right'])assert.equal(R.recognize({segments:[{},{}],bends:[{mode:'hem',angle:180,direction}]}).code,'hem');
});
function tapped(kind){
 const drawPoints=[[0,0],[120,120]],raw=[200,197],grid=[200,192],captured=[];
 const localPoint=(event,useGrid=true)=>useGrid?grid:raw;
 const stage={hasPointerCapture:()=>false},dollar=()=>stage;
 const event={pointerId:1,type:'pointerup',pointerType:kind==='touch'?'touch':'mouse',target:{closest:()=>null},shiftKey:false};
 const run=new Function('drawPoints','localPoint','appendTracePoint','$','event',
  'let suppressClick=false,rightAngleSnap=true,drag={type:"trace",id:1,moved:false},pointers=new Map(),snap=true,drawTransform={scale:1},draft={unit:"mm"};const traceGridStepMM=()=>1,M={formatMeasurement:n=>String(n)},finite=Number.isFinite,canDrawProfile=()=>true,drawingCanvasHit=()=>true,drawDragPreview=()=>{},build=()=>({segments:[]});'+
  ['magneticHeading','magneticTapPoint','traceAlignment','draggedSegment','appendTappedTracePoint','drawingClick','endPoint'].map(source).join('\n')+'\n'+(kind==='touch'?'endPoint(event);':'drawingClick(event);'));
 run(drawPoints,localPoint,p=>captured.push(p),dollar,event);return{raw,grid,point:captured[0],start:drawPoints.at(-1)};
}
test('clic et tap appliquent le même aimant avant l’arrondi de grille',()=>{
 const mouse=tapped('mouse'),touch=tapped('touch');for(const r of [mouse,touch])assert.ok(Math.abs((r.point[1]-r.start[1])-(r.point[0]-r.start[0]))<1e-8,JSON.stringify(r));assert.deepEqual(touch.point,mouse.point);
});
