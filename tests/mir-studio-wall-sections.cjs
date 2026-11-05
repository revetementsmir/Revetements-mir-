'use strict';
/* Géométrie de l'entrée MIR — trois murs détachés et brique alignée aux Z. */
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
 assert.match(band.status,/not-certified/);
});
test('Le volume 3D identifie exactement le fond et les deux retours',()=>{
 const sides=parts.wallSections(mesh);
 assert.equal(sides.length,3,JSON.stringify({recess:mesh.recess,wallParts:mesh.wallParts?.map(f=>f.id)}));
 assert.deepEqual(sides.map(x=>x.id),['return-left','front','return-right']);
 for(const part of sides){
   assert.ok(Math.abs(part.topMeters-data.dimensions.wallHeight)<.002,JSON.stringify(part));
   assert.ok(part.bottomMeters<0&&part.bottomMeters>-.9,JSON.stringify(part));
   assert.ok(part.widthMeters>.05);
 }
});
test('La hauteur du fond et des retours correspond au mur, sans translation Z',()=>{
 const side=parts.sideScale(right,data.dimensions.wallHeight),sides=parts.wallSections(mesh);
 for(const part of sides){
   const top=side.groundY-part.topMeters*side.pixelsPerMeter;
   assert.ok(Math.abs(top-side.topY)<.2);
 }
});
test('Trois sections détachées avec une brique à la même altitude',()=>{
 const vb=right.bbox;
 const original='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+vb.join(' ')+'" width="'+vb[2]+'" height="'+vb[3]+'"><rect x="740" y="550" width="1090" height="612"/></svg>';
 const drawn=parts.explodeSideSVG(original,{sideFace:right,dimensions:data.dimensions,mesh,brickBand:parts.masonryBand(front,data.dimensions),frontFace:front,brickPattern:'<pattern id="mir-exploded-brick" width="20" height="10" patternUnits="userSpaceOnUse"/>',colors:{front:'#526052','return-left':'#667267','return-right':'#667267'}});
 assert.ok(drawn&&drawn.expandedViewBox[2]>vb[2]);
 assert.equal((drawn.svg.match(/data-mir-wall-part="/g)||[]).length,3);
 assert.equal((drawn.svg.match(/data-mir-masonry-band="/g)||[]).length,3);
 assert.equal((drawn.svg.match(/data-mir-wall-opening="/g)||[]).length,4,'Les 2 portes et les 2 fenêtres du centre restent visibles');
 assert.equal(drawn.svg.includes('data-mir-three-wall-explode="true"'),true);
 assert.equal((drawn.svg.match(/data-world-top="/g)||[]).length,3);
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
 assert.equal(source.length,3);
 assert.equal(JSON.stringify({data,mesh}),before);
});
console.log('MIR Studio murs détachés: '+checks+' scénarios vérifiés');
