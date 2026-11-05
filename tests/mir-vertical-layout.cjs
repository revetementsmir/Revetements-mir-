'use strict';
const assert=require('node:assert/strict'),V=require('../dist/mir-vertical-layout.js');
const board=(max,spacings=[])=>({verticalLayout:{maxRunIn:max,preferWindowHead:true,battenSpacingOptionsIn:spacings},formats:[{id:'48x96',lengthIn:96},{id:'48x120',lengthIn:120}]});
const rect=(w,h)=>[[0,0],[w,0],[w,h],[0,h]];
const scale=.01; // 0.01 pied/pixel
let checks=0;function check(name,f){f();checks++;console.log('PASS '+name);}
check('12 pi max pour VStyle sur zone de 26 pi',()=>{
 const m=board(144),r=V.breaks({polygon:rect(300,2600),feetPerPixel:scale,material:m,choice:{orientation:'vertical'}});
 assert.ok(r.complete&&r.items.length>=2);
 const cuts=[0,...r.items.map(j=>j.y).sort((a,b)=>a-b),2600];
 for(let i=1;i<cuts.length;i++)assert.ok((cuts[i]-cuts[i-1])*scale*12<=144.01);
});
check('Transition privilégiée au-dessus des châssis',()=>{
 const r=V.breaks({polygon:rect(400,2300),feetPerPixel:scale,material:board(144),choice:{orientation:'vertical'},
  openings:[{id:'window-level',polygon:[[170,890],[270,890],[270,1120],[170,1120]]}]});
 assert.ok(r.items.some(j=>j.source==='top-of-window'&&j.windowId==='window-level'),JSON.stringify(r.items));
});
check('Joints manuels pris en compte sans les déplacer',()=>{
 const r=V.breaks({polygon:rect(200,2400),feetPerPixel:scale,material:board(144),choice:{orientation:'vertical'},
  manualTransitions:[{orientation:'horizontal',position:.5}]});
 assert.equal(r.items.length,0);
});
check('Sans échelle, jamais de transition fabriquée',()=>{
 const r=V.breaks({polygon:rect(200,2400),feetPerPixel:0,material:board(144),choice:{orientation:'vertical'}});
 assert.equal(r.complete,false);assert.equal(r.items.length,0);
});
check('Hardie 10 pi ou 8 pi si panneau 4×8 sélectionné',()=>{
 const m={...board(120,[8,12,16]),id:'hardie-board-batten'};
 assert.equal(V.verticalRule(m,{orientation:'vertical',formatId:'48x120'}).maxRunIn,120);
 assert.equal(V.verticalRule(m,{orientation:'vertical',formatId:'48x96'}).maxRunIn,96);
});
check('Battens 8, 12 et 16 po c/c aux mesures réelles',()=>{
 const m=board(120,[8,12,16]);
 for(const spacing of [8,12,16]){
  const r=V.battens({polygon:rect(800,2000),feetPerPixel:scale,material:m,choice:{orientation:'vertical',battenSpacingIn:spacing}});
  assert.equal(r.spacingIn,spacing);assert.ok(r.lines.length>3);
  const delta=(r.lines[1].x-r.lines[0].x)*scale*12;
  assert.ok(Math.abs(delta-spacing)<.05,JSON.stringify({spacing,delta}));
 }
});
check('Pignon 5 points : règle symétrique sur la pointe',()=>{
 const m=board(120,[8,12,16]),polygon=[[0,300],[180,0],[360,300],[360,1600],[0,1600]];
 const r=V.battens({polygon,feetPerPixel:scale,material:m,choice:{orientation:'vertical',battenSpacingIn:12}});
 assert.equal(r.alignment,'gable-apex');assert.equal(r.gableApexX,180);
 assert.ok(r.lines.some(line=>Math.abs(line.x-180)<.0001));
});
check('Sans pignon, phase optimisée sur jambages de fenêtres',()=>{
 const m=board(120,[8,12,16]),polygon=rect(800,1600);
 const r=V.battens({polygon,feetPerPixel:scale,material:m,choice:{orientation:'vertical',battenSpacingIn:16},
  openings:[{polygon:[[100,300],[220,300],[220,600],[100,600]]},{polygon:[[460,330],[580,330],[580,670],[460,670]]}]});
 assert.equal(r.alignment,'window-jambs');assert.ok(r.lines.length>4);
});
check('Horizontal : aucune règle verticale appliquée',()=>{
 const r=V.breaks({polygon:rect(200,2000),feetPerPixel:scale,material:board(144),choice:{orientation:'horizontal'}});
 assert.equal(r.items.length,0);
});
console.log('MIR vertical layout '+checks+' contrôles réussis');