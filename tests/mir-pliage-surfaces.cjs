'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(process.env.MIR_PLIAGE03_ROOT||path.join(__dirname,'..'));
const S=require(path.join(root,'dist/mir-pliage-surfaces.js'));
const M=require(path.join(root,'dist/production-model.js'));
let checks=0;
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-7,message||`${actual} ≈ ${expected}`);
const point=(actual,expected)=>actual.forEach((n,i)=>near(n,expected[i]));
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function continuous(parts){for(let i=1;i<parts.length;i++)point(parts[i-1].to,parts[i].from);for(const p of parts){for(const q of [p.from,p.to])assert.ok(q.every(Number.isFinite));if(p.type==='arc'){near(Math.hypot(p.from[0]-p.center[0],p.from[1]-p.center[1]),p.radius);near(Math.hypot(p.to[0]-p.center[0],p.to[1]-p.center[1]),p.radius);}}}
check('physical left/right use the same Y-down projection, without mirroring the profile',()=>{
 const points=[[10,20],[110,20],[110,-80]],before=JSON.stringify(points),r=S.surfacePaths(points,{offset:6});
 point(r.geometry.left[0].from,[10,14]);point(r.geometry.right[0].from,[10,26]);
 point(r.geometry.left[0].to,[104,14]);point(r.geometry.left.at(-1).to,[104,-80]);
 assert.equal(r.centerline,'M10 20 L110 20 L110 -80');assert.equal(JSON.stringify(points),before);
 continuous(r.geometry.left);continuous(r.geometry.right);
});
check('45°, 90°, obtuse, shallow and zigzag joins remain continuous and finite',()=>{
 for(const points of [[[0,0],[80,0],[130,50]],[[0,0],[80,0],[80,80]],[[0,0],[80,0],[30,70]],[[0,0],[80,0],[150,1]],[[0,0],[80,0],[80,60],[150,60],[115,110]]]){
  const r=S.surfacePaths(points,{offset:4,handedness:1});continuous(r.geometry.left);continuous(r.geometry.right);
  for(const side of ['left','right'])assert.equal((r[side].match(/M/g)||[]).length,1);
  assert.equal(r.geometry.centerline.filter(p=>p.type==='line').length,points.length-1);
 }
});
check('the normal distance is exact along each untrimmed directed side, at all quadrants',()=>{
 for(const angle of [0,45,90,135,180,225,270,315,17.25])for(const scale of [.25,1,10]){
  const a=angle*Math.PI/180,points=[[37,49],[37+100*scale*Math.cos(a),49+100*scale*Math.sin(a)]];
  const r=S.surfacePaths(points,{offset:3,handedness:1});
  for(const [side,sign] of [['left',1],['right',-1]]){const p=r.geometry[side][0];point(p.from,[37-3*sign*Math.sin(a),49+3*sign*Math.cos(a)]);point(p.to,[points[1][0]-3*sign*Math.sin(a),points[1][1]+3*sign*Math.cos(a)]);}
 }
});
check('opposite collinear sides have no unbounded miter and explicitly report unresolved thickness',()=>{
 const r=S.surfacePaths([[0,0],[100,0],[20,0]],{offset:6});
 continuous(r.geometry.left);continuous(r.geometry.right);assert.ok(r.diagnostics.warnings.includes('UNRESOLVED_RETURN_GEOMETRY'));
 for(const side of ['left','right'])assert.equal(r.geometry[side].filter(p=>p.type==='arc').length,1);
});
check('real existing hem section supplies both continuous curved surfaces without changing source cotes',()=>{
 for(const direction of ['left','right']){
  const points=[[0,0],[100,0],[20,0],[20,60]],bends=[{mode:'hem',direction},{mode:'signed',angle:90}];
  const section=M.profileSectionPath(points,bends,8),before=JSON.stringify({points,bends,section});
  const r=S.surfacePaths(points,{offset:3,section,bends});
  continuous(r.geometry.left);continuous(r.geometry.right);
  const radii=['left','right'].map(side=>r.geometry[side].find(p=>p.sourceBend===0&&p.type==='arc').radius).sort((a,b)=>a-b);
  assert.deepEqual(radii,[5,11]);assert.equal(r.diagnostics.resolvedReturns,1);assert.equal(r.diagnostics.warnings.includes('UNRESOLVED_RETURN_GEOMETRY'),false);
  assert.equal(JSON.stringify({points,bends,section}),before);
 }
});
check('tight hems reduce the common display offset explicitly, never create a negative radius',()=>{
 const points=[[0,0],[100,0],[20,0]],bends=[{mode:'hem',direction:'left'}],section=M.profileSectionPath(points,bends,2);
 const r=S.surfacePaths(points,{offset:6,section,bends});
 near(r.diagnostics.appliedOffset,1.6);assert.ok(r.diagnostics.warnings.includes('OFFSET_REDUCED_FOR_RETURN'));
 continuous(r.geometry.left);continuous(r.geometry.right);
});
check('near-opposite acute joins cannot grow spikes beyond the declared miter limit',()=>{
 const r=S.surfacePaths([[0,0],[100,0],[1,.001]],{offset:4,miterLimit:3});
 assert.ok(r.diagnostics.warnings.includes('MITER_LIMIT_REACHED'));
 for(const side of ['left','right']){continuous(r.geometry[side]);for(const p of r.geometry[side])assert.ok([...p.from,...p.to].every(n=>Math.abs(n)<120));}
});
check('very short sides retain their forward direction by reducing the common offset',()=>{
 const points=[[0,0],[1,0],[1,1],[2,1]],r=S.surfacePaths(points,{offset:6});
 assert.ok(r.diagnostics.warnings.includes('OFFSET_REDUCED_FOR_SHORT_SEGMENT'));assert.ok(r.diagnostics.appliedOffset<6);
 for(const side of ['left','right']){continuous(r.geometry[side]);for(const p of r.geometry[side])if(p.sourceSegment!==undefined&&p.sourceSegment!==null){const a=points[p.sourceSegment],b=points[p.sourceSegment+1];assert.ok((p.to[0]-p.from[0])*(b[0]-a[0])+(p.to[1]-p.from[1])*(b[1]-a[1])>0);}}
});
check('all ten existing canonical profiles keep their cotes and hems through a surface projection',()=>{
 const B=require(path.join(root,'dist/mir-bending-presets.js'));
 for(const {id} of B.VARIANTS){
  const spec=B.create(id),fallback=id==='goutte_eau_8'?[5.5,2,.5]:spec.segments.map((s,i)=>s.length||[6,2,.75,1,3,4,1.25][i]||1);
  spec.segments.forEach((s,i)=>s.length=fallback[i]);
  const model=M.buildProfile(spec);assert.equal(model.valid,true,id);assert.equal(B.checkCanonical(spec).ok,true,id);
  const before=JSON.stringify(model),points=model.pointsMM.map(([x,y])=>[300+x*2,300-y*2]),section=M.profileSectionPath(points,model.bends);
  const result=S.surfacePaths(points,{offset:6,section,bends:model.bends});
  continuous(result.geometry.left);continuous(result.geometry.right);assert.equal(JSON.stringify(model),before);
  assert.equal(result.diagnostics.resolvedReturns,model.bends.filter(b=>b.mode==='hem').length);
 }
});
check('invalid and degenerate geometry is rejected rather than emitting NaN SVG',()=>{
 for(const points of [[],[[0,0]],[[0,0],[0,0]],[[0,0],[Infinity,0]],[[0,0],[1]]])assert.throws(()=>S.surfacePaths(points));
 for(const offset of [0,-1,NaN,Infinity])assert.throws(()=>S.surfacePaths([[0,0],[10,0]],{offset}));
 assert.throws(()=>S.surfacePaths([[0,0],[10,0],[10,10]],{section:{segments:[[[0,0],[10,0]],[[10,1],[10,11]]]}}));
});
check('blue marks are annotations only: no finish, colour, template or snapshot is inferred',()=>{
 const r=S.surfacePaths([[0,0],[100,0]],{offset:3}),before=JSON.stringify(r);
 assert.match(S.markerSVG(r,{side:'left'}),/stroke="#175b94"/);assert.match(S.markerSVG(r,{side:'right'}),/data-painted-side="right"/);
 assert.equal(S.markerSVG(r,{side:null}),'');assert.equal(JSON.stringify(r),before);
 assert.doesNotMatch(S.markerSVG(r,{side:'left'}),/#[0-9a-f]{6}.*#[0-9a-f]{6}/i);
});
console.log(JSON.stringify({passed:true,checks,scope:'Pure projected surface geometry; original fabrication model and staff renderers unchanged'}));
