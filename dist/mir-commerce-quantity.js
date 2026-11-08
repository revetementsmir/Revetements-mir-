/* Shared commercial quantity rules. Reads the existing coverage engine; never changes stock,
 * geometry or saved carts. A suggestion is applied only by an explicit UI action. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./material-coverage.js'):root.MIRMaterialCoverage);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MIRCommerceQuantity=api;
})(typeof window==='object'?window:null,function(C){
 'use strict';
 const positive=n=>Number.isFinite(n)&&n>0,near=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
 const number=n=>new Intl.NumberFormat('fr-CA',{maximumFractionDigits:6}).format(n);
 function policy(m={},formatId=null){
  const d=m.dimensions||{},c=m.coverage||{},p=m.packaging||{},app=m.applications||[];
  const declared=(m.formats||[]).filter(f=>f.id&&positive(f.lengthIn));
  const format=declared.find(f=>f.id===formatId);
  const missingFormat=declared.length>0&&!format;
  let area=null;
  const covering=app.includes('siding')||app.includes('soffit')||app.includes('roofing');
  if(covering&&!missingFormat&&c.verified!==false&&!c.dimensionConflict&&!c.exposureConflict){
   const spec=C.coverageSpec(m,{formatId});
   const length=format?.lengthIn||d.lengthIn||(positive(d.lengthFt)?d.lengthFt*12:null);
   if(!format){
    area=[c.perPieceSqFt,c.perPanelSqFt,
     positive(c.perBoxSqFt)&&positive(c.piecesPerBox)?c.perBoxSqFt/c.piecesPerBox:null,
     positive(c.perCartonSqFt)&&positive(c.piecesPerCarton)?c.perCartonSqFt/c.piecesPerCarton:null].find(positive)||null;
   }
   if(!area&&spec.status!=='user-specified'&&positive(length)&&positive(spec.pieceCoverageIn))area=length*spec.pieceCoverageIn/144;
   if(!area&&format?.measurementKind==='physical_piece'&&format.verified!==false&&!format.stockConfirmationRequired){
    const width=format.usefulWidthIn||format.coverageWidthIn||format.widthIn;
    const length=format.usefulLengthIn||format.coverageLengthIn||format.lengthIn;
    if(positive(width)&&positive(length))area=width*length/144;
   }
  }
  // Manufacturer package sizes do not imply permission to sell individual contents.
  const unitText=String(m.unit||'').trim().toLowerCase();
  let unit='pièces';
  if(/^bo[îi]te/.test(unitText)||p.unit==='boîte')unit='boîtes';
  else if(/^paquet/.test(unitText)||p.unit==='paquet')unit='paquets';
  else if(/^carton/.test(unitText)||p.unit==='carton')unit='cartons';
  else if(/^rouleau/.test(unitText)||p.unit==='rouleau')unit='rouleaux';
  else if(/^kit/.test(unitText)||p.unit==='kit')unit='kits';
  else if(app.includes('sealant'))unit='cartouches';
  const rules=[{unit,step:1}];
  if(unit==='pièces'&&positive(area))rules.unshift({unit:'pi²',step:area});
  // Variable-length products explicitly documented as sold by area have no fixed sheet increment.
  if(!area&&/^pi²/.test(unitText)&&!missingFormat)rules.unshift({unit:'pi²',step:1});
  const packagingCount=p.piecesPerBox||p.piecesPerCarton||p.piecesPerPack||p.containersPerCarton||c.piecesPerPack;
  const packageLabel=(p.piecesPerPack||c.piecesPerPack)?'paquet':p.piecesPerCarton?'carton':'boîte';
  const explanation=packagingCount?number(packagingCount)+' éléments par '+packageLabel+'. '+(area?number(area)+' pi² utiles par pièce. ':'')+(m.unit||'Conditionnement MIR à confirmer.'):
   area?number(area)+' pi² par pièce complète (surface utile).':
   'Quantités entières. '+(m.unit||'Conditionnement MIR à confirmer.')+'.';
  return {rules,area,missingFormat,defaultUnit:rules[0].unit,note:missingFormat?'Choisissez le format avant de saisir la quantité.':explanation};
 }
 function validate(m,item){
  const p=policy(m,item.formatId),q=Number(item.quantity),rule=p.rules.find(r=>r.unit===item.unit);
  if(p.missingFormat)return {ok:false,message:'Le format de cet article doit être choisi.',suggestion:null,policy:p};
  if(!rule)return {ok:false,message:'Unité incompatible avec le conditionnement. '+p.note,suggestion:null,policy:p};
  const count=q/rule.step;
  if(!positive(q)||q>1000000||!near(count,Math.round(count))){
   const next=Math.ceil(count-1e-9)*rule.step;
   return {ok:false,message:'Quantité attendue par multiples de '+number(rule.step)+' '+rule.unit+'. '+p.note,
    suggestion:positive(next)&&next<=1000000?next:null,policy:p};
  }
  return {ok:true,message:p.note,suggestion:null,policy:p};
 }
 return Object.freeze({policy,validate});
});
