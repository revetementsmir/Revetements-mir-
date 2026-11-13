'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const artifact=path.resolve(process.env.MIR_PHASE10_ARTIFACT_ROOT||path.join(__dirname,'../dist'));
const P=require(path.join(artifact,'production-model.js')),B=require(path.join(artifact,'mir-bending-presets.js'));
for(const id of ['beam','ventilation_mur_fenetre'])for(const side of ['left','right']){
 const spec={...B.create(id),unit:'in',length:120,quantity:1};spec.segments.forEach((s,i)=>s.length=(id==='beam'?[1.25,7.5,6.125,7.5,1.25]:[2,1.5,1.5,1.25])[i]);spec.coloredFace={side,segmentId:id==='beam'?'B':'A'};
 const m=P.buildProfile(spec),svg=P.profileSVG(m,{width:800,height:650,legend:false});
 assert.match(svg,/profile-dimension-line/);assert.doesNotMatch(svg,/profile-painted-face-highlight/);
 const positions=Object.fromEntries([...svg.matchAll(/data-marker-label="([A-Z])"[^>]*data-anchor-x="([^"]+)" data-anchor-y="([^"]+)"[^>]*><g transform="translate\(([^,]+),([^\)]+)\) rotate\(([^\)]+)\)"/g)].map(m=>[m[1],{ax:+m[2],ay:+m[3],x:+m[4],y:+m[5],angle:+m[6]}]));
 assert.equal(Object.keys(positions).length,id==='beam'?5:4);
 for(const label of ['B',id==='beam'?'D':'C'])assert.equal(Math.abs(positions[label].angle),90,'cote verticale parallèle '+label);
 for(const label of id==='beam'?['A','C','E']:['A','D'])assert.equal(positions[label].angle,0,'cote horizontale parallèle '+label);
 assert.ok(positions.B.x<positions.B.ax,'B à gauche du montant');
 const right=positions[id==='beam'?'D':'C'];assert.ok(right.x>right.ax,'cote à droite du montant droit');
 if(id==='beam')assert.ok(positions.C.y<positions.C.ay,'C au-dessus');else for(const label of ['A','D'])assert.ok(positions[label].y<positions[label].ay,label+' au-dessus');
 for(const p of Object.values(positions))assert.ok(Math.hypot(p.x-p.ax,p.y-p.ay)<=81,'rappel court et proche');
 const star=svg.match(/class="profile-painted-star" points="([^"]+)"/)[1].split(' ').map(p=>p.split(',').map(Number)),center=star.reduce((sum,p)=>[sum[0]+p[0]/10,sum[1]+p[1]/10],[0,0]);
 const label=id==='beam'?'B':'A',marker=svg.match(new RegExp('data-marker-label="'+label+'"[^>]*data-anchor-x="([^"]+)" data-anchor-y="([^"]+)"'));
 // Independent fixtures: Beam B travels upward; Ventilation A travels right.
 // Physical left is west of Beam B, north of Ventilation A in the Y-down SVG.
 assert.ok(id==='beam'?(side==='left'?center[0]<+marker[1]:center[0]>+marker[1]):(side==='left'?center[1]<+marker[2]:center[1]>+marker[2]),id+' face physique '+side);
 console.log('PASS référence indépendante '+id+' '+side);
}
for(const side of ['left','right']){
 const spec={...B.create('fascia'),unit:'in',length:120,quantity:1,coloredFace:{side,segmentId:'A'}};spec.segments.forEach((s,i)=>s.length=[6,1.25,.75][i]);
 const svg=P.profileSVG(P.buildProfile(spec),{width:800,height:650,legend:false});
 const markers=Object.fromEntries([...svg.matchAll(/data-marker-label="([A-Z])"[^>]*data-anchor-x="([^"]+)" data-anchor-y="([^"]+)"[^>]*><g transform="translate\(([^,]+),([^\)]+)\)/g)].map(m=>[m[1],{ax:+m[2],ay:+m[3],x:+m[4],y:+m[5]}]));
 assert.ok(markers.B.y>markers.B.ay,'B sous le segment');assert.ok(markers.C.y<markers.C.ay&&markers.C.x>markers.C.ax,'C au-dessus à droite');
 const vertices=svg.match(/class="profile-painted-star" points="([^"]+)"/)[1].split(' ').map(p=>p.split(',').map(Number)),starX=vertices.reduce((sum,p)=>sum+p[0]/10,0);
 // Fascia A runs down the page: physical left of this directed segment is east.
 assert.ok(side==='left'?starX>markers.A.ax:starX<markers.A.ax,'étoile Fascia sur la face physique enregistrée');
 const pages=P.productionPages({items:[{id:'FASCIA',spec}]},{layout:'bending-sheet'});
 const pageText=[...pages[0].svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]).join(' ');
 assert.match(pageText,new RegExp('Face '+(side==='left'?1:2)+' — côté indiqué par l’étoile'));
 const lines=[...svg.matchAll(/class="profile-measure-leader"[^>]*d="M([^,]+),([^L]+)L([^,]+),([^"]+)"/g)].map(m=>[[+m[1],+m[2]],[+m[3],+m[4]]]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){const [a,b]=lines[i],[c,d]=lines[j];assert.ok(!(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0),'rappels sans croisement');}
 console.log('PASS Fascia '+side+' : B en bas, C en haut à droite, rappels distincts');
}
