'use strict';
/* Géométrie du retrait MIR et raccords à la toiture. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const parts=require('../dist/studio-wall-sections.js');
const data=require('../dist/plan-data.json');
const world={window:{},console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/plan-3d.js'),'utf8'),world,{filename:'plan-3d.js'});
const engine=world.window.MIR3D;
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
const options={dimensions:data.dimensions,recess:data.recess,footprint:data.footprint,roofStyle:'duplex',foundationDrop:.8};
const mesh=engine.mesh(options);
const front=data.faces.find(f=>f.key==='front'),right=data.faces.find(f=>f.key==='right');
test('Le soubassement est tiré du polygone de maçonnerie du relevé MIR',()=>{
 const band=parts.masonryBand(front,data.dimensions);
 assert.ok(band&&band.heightMeters>.7&&band.heightMeters<1.4,JSON.stringify(band));
 assert.equal(band.sourceZoneId,'maconnerie');
 assert.ok(band.bottomMeters>.45&&band.bottomMeters<.55);
 assert.ok(band.topMeters>1.45&&band.topMeters<1.58);
 assert.match(band.status,/not-certified/);
});
test('Seuls les retours invisibles de face sont détachés',()=>{
 const sides=parts.wallSections(mesh);
 assert.equal(sides.length,2,JSON.stringify({recess:mesh.recess,wallParts:mesh.wallParts?.map(f=>f.id)}));
 assert.deepEqual(sides.map(x=>x.id),['return-left','return-right']);
 assert.deepEqual(parts.wallSections(engine.geometry(options)),sides);
 for(const part of sides){
   assert.ok(Math.abs(part.topMeters-data.dimensions.wallHeight)<.002,JSON.stringify(part));
   assert.ok(part.bottomMeters<0&&part.bottomMeters>-.9,JSON.stringify(part));
   assert.ok(part.widthMeters>.05);
 }
});
test('La hauteur des retours correspond au mur, sans translation Z',()=>{
 const side=parts.sideScale(right,data.dimensions.wallHeight),sides=parts.wallSections(mesh);
 for(const part of sides){
   const top=side.groundY-part.topMeters*side.pixelsPerMeter;
   assert.ok(Math.abs(top-side.topY)<.2);
 }
});
test('Deux sections détachées avec une brique à la même altitude',()=>{
 const vb=right.bbox;
 const original='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb.join(' ')+'" width="'+vb[2]+'" height="'+vb[3]+'"><rect x="740" y="550" width="1090" height="612"/></svg>';
 const drawn=parts.explodeSideSVG(original,{sideFace:right,dimensions:data.dimensions,mesh,brickBand:parts.masonryBand(front,data.dimensions),brickPattern:'<pattern id="mir-exploded-brick" width="20" height="10" patternUnits="userSpaceOnUse"/>',colors:{'return-left':'#667267','return-right':'#667267'}});
 assert.ok(drawn&&drawn.expandedViewBox[2]>vb[2]);
 assert.equal((drawn.svg.match(/data-mir-wall-part="/g)||[]).length,2);
 assert.equal((drawn.svg.match(/data-mir-masonry-band="/g)||[]).length,2);
 assert.equal((drawn.svg.match(/data-mir-wall-opening="/g)||[]).length,0,'Les ouvertures de face restent uniquement à l’avant');
 assert.equal(drawn.svg.includes('data-mir-three-wall-explode="true"'),true);
 assert.equal((drawn.svg.match(/data-world-top="/g)||[]).length,2);
 assert.ok(Math.abs(drawn.bandHeightMeters-parts.masonryBand(front,data.dimensions).heightMeters)<.0001);
 assert.ok(drawn.svg.includes('<rect x="740" y="550"'),'Le vrai plan latéral reste entier');
});
test('Aucune vue détachée si les retours de mur n’existent pas',()=>{
 const flat=engine.mesh({...options,recess:{enabled:false}});
 const original='<svg viewBox="590 320 1295 1010" width="1295" height="1010"></svg>';
 assert.deepEqual(parts.wallSections(flat),[]);
 assert.equal(parts.explodeSideSVG(original,{sideFace:right,dimensions:data.dimensions,mesh:flat}),null);
});
test('Les vues originales avant et arrière ne sont pas remplacées',()=>{
 const svg='<svg viewBox="0 0 100 100"></svg>';
 assert.equal(parts.explodeSideSVG(svg,{sideFace:data.faces[0],dimensions:data.dimensions,mesh}),null);
});
test('Les calculs d’affichage ne mutent ni plan, ni modèle, ni pièces',()=>{
 const before=JSON.stringify({data,mesh}),source=parts.wallSections(mesh);
 const svg='<svg viewBox="590 320 1295 1010"></svg>';
 parts.explodeSideSVG(svg,{sideFace:right,dimensions:data.dimensions,mesh,brickBand:parts.masonryBand(front,data.dimensions)});
 assert.equal(source.length,2);
 assert.equal(JSON.stringify({data,mesh}),before);
});
test('Une zone haute ou un petit accent ne crée pas un soubassement automatique',()=>{
 const fake={key:'front',textureBox:[0,0,500,400],zones:[
  {id:'haut',kind:'masonry',polygon:[[0,0],[500,0],[500,45],[0,45]]},
  {id:'accent',kind:'masonry',polygon:[[0,320],[180,320],[180,400],[0,400]]}
 ]};
 assert.equal(parts.masonryBand(fake,{width:12,wallHeight:7},{fitWall:true}),null);
});
test('Les coupes d’onglet sont communes aux rives de pignon et à leurs retours',()=>{
 const asPoints=(id)=>Array.from(mesh.faces.find(f=>f.id===id).poly,p=>Array.from(p).join(','));
 for(const prefix of ['soffit-','fascia-leg-'])for(const [a,b] of [
  ['front-0','left'],['front-1','return-left'],['front-3','return-right'],['front-4','right']
 ]){
  const joint=asPoints(prefix+a).filter(p=>asPoints(prefix+b).includes(p));
  assert.equal(joint.length,2,prefix+a+' / '+b);
 }
});
test('Corniches uniquement aux pieds des pignons et solin au joint du toit bas',()=>{
 const study=engine.studyDefaults();
 const withDetails=engine.mesh({...study,...options,gableCornices:true,waterDiverterColor:'#406853'});
 const cornices=withDetails.faces.filter(f=>f.role==='gable-cornice'&&f.id.endsWith('-top'));
 assert.equal(cornices.length,4);
 const parts=withDetails.faces.filter(f=>f.role==='water-diverter');
 assert.equal(parts.length,2);
 const back=Math.max(...withDetails.faces.find(f=>f.id==='roof-porch').poly.map(p=>p[1]));
 assert.ok(parts.every(p=>p.parentSurfaceId==='roof-porch'&&p.fillColor==='#406853'&&p.notCertifiedTakeoff));
 assert.ok(parts.flatMap(f=>Array.from(f.poly)).every(p=>p[1]<back&&back-p[1]<.126));
 for(const roofStyle of ['hip','flat'])assert.ok(!engine.mesh({...options,roofStyle,gableCornices:true}).faces.some(f=>f.role==='gable-cornice'||f.role==='water-diverter'));
});
console.log('MIR Studio murs détachés: '+checks+' scénarios vérifiés');
