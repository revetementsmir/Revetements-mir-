/* MIR fibrociment cutting — integration candidate.
 * Conservative packing: real polygon area for material metrics, bounding boxes for safe placement.
 * Does NOT claim globally optimal nesting.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.MIRFibroCutting=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const EPS=1e-9;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const deepFreeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const c of Object.values(v))deepFreeze(c);}return v;};
  const SHEETS=Object.freeze({
    '4x8':{id:'4x8',label:'4 × 8 pi',widthIn:48,heightIn:96},
    '4x10':{id:'4x10',label:'4 × 10 pi',widthIn:48,heightIn:120}
  });
  const FRACTIONS=Object.freeze({'½':'1/2','¼':'1/4','¾':'3/4','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8'});
  function parseIn(v){
    if(Number.isFinite(v)) return v;
    let s=String(v??'').trim().toLowerCase().replace(/\b(po|pouces?|in|inch(?:es)?)\b/g,'').replace(/["″”]/g,'').trim();
    s=s.replace(/([0-9])([½¼¾⅛⅜⅝⅞])/g,(_,d,g)=>`${d} ${FRACTIONS[g]}`).replace(/[½¼¾⅛⅜⅝⅞]/g,g=>FRACTIONS[g]);
    if(/^[+-]?\d+(?:[.,]\d+)?$/.test(s)) return Number(s.replace(',','.'));
    let m=s.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/); if(m){const w=+m[1],n=+m[2],d=+m[3];return d?w+(w<0?-1:1)*n/d:null;}
    m=s.match(/^([+-]?)(\d+)\s*\/\s*(\d+)$/); if(m){const d=+m[3];return d?(m[1]==='-'?-1:1)*(+m[2]/d):null;}
    return null;
  }
  function reqText(v,label){const s=String(v??'').trim();if(!s)throw new Error(`${label} requis`);return s;}
  function normalizeSheet(format){
    if(typeof format==='object'&&Number(format?.widthIn)>0&&Number(format?.heightIn)>0) return {id:String(format.id||'custom'),label:String(format.label||'Format personnalisé'),widthIn:Number(format.widthIn),heightIn:Number(format.heightIn)};
    const key=String(format||'4x10').toLowerCase().replace('×','x').replace(/\s/g,'');
    if(!SHEETS[key]) throw new Error('Format de feuille invalide');
    return clone(SHEETS[key]);
  }
  function polygonArea(points){
    if(!Array.isArray(points)||points.length<3)return 0;
    let a=0; for(let i=0;i<points.length;i++){const [x1,y1]=points[i],[x2,y2]=points[(i+1)%points.length];a+=x1*y2-x2*y1;} return Math.abs(a)/2;
  }
  function bbox(points){
    const xs=points.map(p=>Number(p[0])),ys=points.map(p=>Number(p[1]));
    return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys),widthIn:Math.max(...xs)-Math.min(...xs),heightIn:Math.max(...ys)-Math.min(...ys)};
  }
  function rectPoints(w,h){return [[0,0],[w,0],[w,h],[0,h]];}
  function normalizePiece(raw,index){
    const quantity=Math.max(1,Math.trunc(Number(raw?.quantity||1)));
    let points;
    if(Array.isArray(raw?.points)&&raw.points.length>=3){
      points=raw.points.map(p=>[Number(p[0]),Number(p[1])]);
      if(points.some(p=>!Number.isFinite(p[0])||!Number.isFinite(p[1]))) throw new Error(`Pièce ${index+1}: points invalides`);
      const b=bbox(points); points=points.map(([x,y])=>[x-b.minX,y-b.minY]);
    } else {
      const w=parseIn(raw?.widthIn),h=parseIn(raw?.heightIn);
      if(!(w>0&&h>0)) throw new Error(`Pièce ${index+1}: largeur/hauteur invalides`);
      points=rectPoints(w,h);
    }
    const b=bbox(points), area=polygonArea(points);
    if(!(area>EPS)) throw new Error(`Pièce ${index+1}: surface invalide`);
    const grainAxis=['vertical','horizontal','none'].includes(raw?.grainAxis)?raw.grainAxis:'none';
    const factoryBottomRequired=raw?.factoryBottomRequired===true;
    const rotationPolicy=raw?.rotationPolicy||null;
    let rotations;
    if(Array.isArray(raw?.allowedRotationsDeg)&&raw.allowedRotationsDeg.length){
      rotations=[...new Set(raw.allowedRotationsDeg.map(Number).filter(n=>[0,90,180,270].includes(n)))];
    } else if(factoryBottomRequired){rotations=[0];}
    else if(rotationPolicy==='fixed'){rotations=[0];}
    else if(grainAxis==='none'){rotations=[0,90];}
    else {rotations=[0,180];}
    if(!rotations.length) rotations=[0];
    return {
      sourceRef:String(raw?.sourceRef||raw?.id||`source-${index+1}`),
      label:String(raw?.label||raw?.name||`Pièce ${index+1}`),
      elevationId:raw?.elevationId?String(raw.elevationId):null,
      quantity, points, widthIn:b.widthIn,heightIn:b.heightIn,areaIn2:area,
      factoryBottomRequired,grainAxis,rotations,
      mirror:raw?.mirror===true,
      installationBottom:raw?.installationBottom?String(raw.installationBottom):'bottom',
      metadata:clone(raw?.metadata||{})
    };
  }
  function expandPieces(rawPieces){
    const normalized=(rawPieces||[]).map(normalizePiece);
    const out=[]; let seq=1;
    for(const p of normalized){
      for(let i=0;i<p.quantity;i++) out.push({...clone(p),quantity:1,pieceId:`P${String(seq++).padStart(3,'0')}`,instanceIndex:i+1});
    }
    return out;
  }
  function dimsForRotation(piece,deg){const q=((deg%180)+180)%180;return q===90?{widthIn:piece.heightIn,heightIn:piece.widthIn}:{widthIn:piece.widthIn,heightIn:piece.heightIn};}
  function overlapWithGap(a,b,gap){
    return !(a.x+a.widthIn+gap<=b.x+EPS || b.x+b.widthIn+gap<=a.x+EPS || a.y+a.heightIn+gap<=b.y+EPS || b.y+b.heightIn+gap<=a.y+EPS);
  }
  function candidatePositions(sheet,gap){
    const pts=[[0,0]];
    for(const p of sheet.placements){pts.push([p.x+p.widthIn+gap,p.y],[p.x,p.y+p.heightIn+gap]);}
    return pts.filter(([x,y],i,arr)=>x>=-EPS&&y>=-EPS&&arr.findIndex(q=>Math.abs(q[0]-x)<EPS&&Math.abs(q[1]-y)<EPS)===i).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
  }
  function canPlace(sheet,cand,gap){
    if(cand.x<-EPS||cand.y<-EPS||cand.x+cand.widthIn>sheet.widthIn+EPS||cand.y+cand.heightIn>sheet.heightIn+EPS)return false;
    return !sheet.placements.some(p=>overlapWithGap(cand,p,gap));
  }
  function makeSheet(index,format){return {sheetId:`F${String(index).padStart(3,'0')}`,formatId:format.id,widthIn:format.widthIn,heightIn:format.heightIn,placements:[]};}
  function tryPlace(sheet,piece,gap){
    for(const pos of candidatePositions(sheet,gap)){
      for(const rotationDeg of piece.rotations){
        const d=dimsForRotation(piece,rotationDeg); const cand={pieceId:piece.pieceId,sourceRef:piece.sourceRef,label:piece.label,elevationId:piece.elevationId,x:pos[0],y:pos[1],widthIn:d.widthIn,heightIn:d.heightIn,rotationDeg,areaIn2:piece.areaIn2,factoryBottomRequired:piece.factoryBottomRequired,grainAxis:piece.grainAxis,mirror:piece.mirror,installationBottom:piece.installationBottom,metadata:clone(piece.metadata)};
        if(canPlace(sheet,cand,gap)) return cand;
      }
    }
    return null;
  }
  function sortInstances(pieces,strategy){
    const arr=pieces.slice();
    if(strategy==='source-order') return arr;
    if(strategy==='height-desc') return arr.sort((a,b)=>Math.max(b.widthIn,b.heightIn)-Math.max(a.widthIn,a.heightIn)||b.areaIn2-a.areaIn2||a.pieceId.localeCompare(b.pieceId));
    return arr.sort((a,b)=>b.areaIn2-a.areaIn2||Math.max(b.widthIn,b.heightIn)-Math.max(a.widthIn,a.heightIn)||a.pieceId.localeCompare(b.pieceId));
  }
  function validateInputs(input){
    const minGapIn=parseIn(input?.minGapIn??0.75);
    if(!(minGapIn>=0)) throw new Error('Écart minimal invalide');
    if(input?.sourceValidated===false) throw new Error('Dimensions/source non validées : débit bloqué');
    const format=normalizeSheet(input?.sheetFormat||'4x10');
    const pieces=expandPieces(input?.pieces||[]);
    if(!pieces.length) throw new Error('Au moins une pièce requise');
    return {minGapIn,format,pieces};
  }
  function buildCutPlan(input={}){
    const {minGapIn,format,pieces}=validateInputs(input); const strategy=input.strategy||'area-desc';
    const ordered=sortInstances(pieces,strategy); const sheets=[]; const unplaced=[];
    for(const piece of ordered){
      const canEver=piece.rotations.some(r=>{const d=dimsForRotation(piece,r);return d.widthIn<=format.widthIn+EPS&&d.heightIn<=format.heightIn+EPS;});
      if(!canEver){unplaced.push({pieceId:piece.pieceId,sourceRef:piece.sourceRef,reason:'La pièce ne tient pas sur le format choisi avec les rotations permises.'});continue;}
      let placed=null,sheet=null;
      for(const s of sheets){const p=tryPlace(s,piece,minGapIn);if(p){placed=p;sheet=s;break;}}
      if(!placed){sheet=makeSheet(sheets.length+1,format);placed=tryPlace(sheet,piece,minGapIn);if(placed)sheets.push(sheet);}
      if(!placed){unplaced.push({pieceId:piece.pieceId,sourceRef:piece.sourceRef,reason:'Aucun placement valide trouvé par la stratégie candidate.'});continue;}
      sheet.placements.push(placed);
    }
    const placedIds=new Set(sheets.flatMap(s=>s.placements.map(p=>p.pieceId)));
    const totalPieceArea=pieces.filter(p=>placedIds.has(p.pieceId)).reduce((a,p)=>a+p.areaIn2,0);
    const totalSheetArea=sheets.length*format.widthIn*format.heightIn;
    const wasteArea=Math.max(0,totalSheetArea-totalPieceArea);
    const plan={
      schemaVersion:1,kind:'mir-fibro-cut-plan',strategy,packingModel:'conservative-bounding-box',optimizationClaim:'candidate-comparison-only',
      sourceValidated:input?.sourceValidated!==false,material:clone(input?.material||{}),sheetFormat:format,minGapIn,
      sheets,unplaced,totalPieces:pieces.length,placedPieces:placedIds.size,unplacedPieces:unplaced.length,
      totalPieceAreaIn2:totalPieceArea,totalSheetAreaIn2:totalSheetArea,wasteAreaIn2:wasteArea,wastePct:totalSheetArea?100*wasteArea/totalSheetArea:0,
      pieceIndex:pieces.map(p=>({pieceId:p.pieceId,sourceRef:p.sourceRef,label:p.label,elevationId:p.elevationId,areaIn2:p.areaIn2,factoryBottomRequired:p.factoryBottomRequired,grainAxis:p.grainAxis,rotations:p.rotations,mirror:p.mirror,installationBottom:p.installationBottom}))
    };
    const check=validateCutPlan(plan); plan.validation=check; return plan;
  }
  function validateCutPlan(plan){
    const errors=[],warnings=[]; const ids=new Set();
    for(const s of plan?.sheets||[]){
      if(!/^F\d{3,}$/.test(s.sheetId)) errors.push(`Identifiant feuille invalide: ${s.sheetId}`);
      for(const p of s.placements||[]){
        if(ids.has(p.pieceId)) errors.push(`Pièce dupliquée: ${p.pieceId}`); ids.add(p.pieceId);
        if(p.x<-EPS||p.y<-EPS||p.x+p.widthIn>s.widthIn+EPS||p.y+p.heightIn>s.heightIn+EPS) errors.push(`${p.pieceId} dépasse ${s.sheetId}`);
        if(p.factoryBottomRequired&&p.rotationDeg!==0) errors.push(`${p.pieceId}: bas d’usine perdu par rotation`);
      }
      for(let i=0;i<s.placements.length;i++)for(let j=i+1;j<s.placements.length;j++)if(overlapWithGap(s.placements[i],s.placements[j],plan.minGapIn))errors.push(`${s.placements[i].pieceId}/${s.placements[j].pieceId}: écart inférieur à ${plan.minGapIn} po`);
    }
    if(plan?.unplaced?.length) warnings.push(`${plan.unplaced.length} pièce(s) non placée(s)`);
    return {ok:errors.length===0,errors,warnings};
  }
  function compareStrategies(input={}){
    const strategies=input.strategies||['area-desc','height-desc','source-order'];
    const candidates=strategies.map(strategy=>buildCutPlan({...input,strategy}));
    const ranked=candidates.slice().sort((a,b)=>a.unplacedPieces-b.unplacedPieces||a.sheets.length-b.sheets.length||a.wastePct-b.wastePct||a.strategy.localeCompare(b.strategy));
    return {candidates,bestCandidateStrategy:ranked[0]?.strategy||null,rankingRule:'moins de pièces non placées, puis moins de feuilles, puis moins de perte calculée',universalOptimalityClaim:false};
  }
  function compareFormats(input={}){
    const formats=input.sheetFormats||['4x8','4x10'];
    const formatCandidates=formats.map(sheetFormat=>{
      const comparison=compareStrategies({...input,sheetFormat});
      const best=comparison.candidates.find(c=>c.strategy===comparison.bestCandidateStrategy)||comparison.candidates[0];
      return {sheetFormat:best.sheetFormat,comparison,best};
    });
    const ranked=formatCandidates.slice().sort((a,b)=>a.best.unplacedPieces-b.best.unplacedPieces||a.best.sheets.length-b.best.sheets.length||a.best.totalSheetAreaIn2-b.best.totalSheetAreaIn2||a.best.wastePct-b.best.wastePct);
    return {formatCandidates,recommendedFormatId:ranked[0]?.sheetFormat?.id||null,recommendedStrategy:ranked[0]?.best?.strategy||null,rankingRule:'moins de pièces non placées, puis moins de feuilles, puis moins de surface feuille totale, puis moins de perte',universalOptimalityClaim:false};
  }

  function createCutPlanSnapshot(plan,{jobId,revision=1,actor='MIR admin',now=new Date()}={}){
    if(!plan?.validation?.ok) throw new Error('Plan de débit invalide');
    if(plan.unplacedPieces) throw new Error('Toutes les pièces doivent être placées avant libération');
    const snapshot={schemaVersion:1,id:reqText(jobId,'Job'),revision:Number(revision)||1,createdAt:new Date(now).toISOString(),createdBy:reqText(actor,'Auteur'),immutable:true,plan:clone(plan)};
    return deepFreeze(snapshot);
  }
  function buildCutDocuments(snapshot){
    if(!snapshot?.plan) throw new Error('Snapshot débit requis');
    const plan=snapshot.plan;
    const full={kind:'fibro-cut-full',jobId:snapshot.id,revision:snapshot.revision,sheets:clone(plan.sheets),pieceIndex:clone(plan.pieceIndex),material:clone(plan.material),sheetFormat:clone(plan.sheetFormat),minGapIn:plan.minGapIn};
    const chantier={kind:'fibro-cut-chantier',jobId:snapshot.id,revision:snapshot.revision,pieces:plan.sheets.flatMap(s=>s.placements.map(p=>({pieceId:p.pieceId,sourceRef:p.sourceRef,elevationId:p.elevationId,sheetId:s.sheetId,label:p.label,mirror:p.mirror,installationBottom:p.installationBottom}))),sheetCount:plan.sheets.length};
    return {full,chantier};
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function buildCutPrintHtml(snapshot,{mode='full'}={}){
    const docs=buildCutDocuments(snapshot); const plan=snapshot.plan; const title=mode==='chantier'?'Débit fibrociment — chantier':'Débit fibrociment — atelier';
    const css='body{font-family:Arial,sans-serif;color:#111;margin:24px}h1{font-size:22px}h2{font-size:17px;margin-top:24px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #bbb;padding:6px;text-align:left}.meta{font-size:12px;color:#555}.sheet{page-break-inside:avoid;margin:16px 0}.tag{display:inline-block;border:1px solid #999;border-radius:999px;padding:2px 7px;margin-right:6px}';
    let body=`<h1>${escapeHtml(title)}</h1><div class="meta">Job ${escapeHtml(snapshot.id)} · Révision ${escapeHtml(snapshot.revision)} · ${escapeHtml(plan.sheetFormat.label)} · écart ${escapeHtml(plan.minGapIn)} po</div>`;
    if(mode==='chantier'){
      body+='<h2>Repères chantier</h2><table><thead><tr><th>Pièce</th><th>Élévation</th><th>Feuille</th><th>Description</th><th>Bas</th></tr></thead><tbody>';
      body+=docs.chantier.pieces.map(p=>`<tr><td>${escapeHtml(p.pieceId)}</td><td>${escapeHtml(p.elevationId||'—')}</td><td>${escapeHtml(p.sheetId)}</td><td>${escapeHtml(p.label)}</td><td>${escapeHtml(p.installationBottom||'bottom')}</td></tr>`).join('');
      body+='</tbody></table>';
    }else{
      for(const s of docs.full.sheets){body+=`<section class="sheet"><h2>${escapeHtml(s.sheetId)} · ${escapeHtml(s.widthIn)} × ${escapeHtml(s.heightIn)} po</h2><table><thead><tr><th>Pièce</th><th>Source</th><th>Position</th><th>Enveloppe</th><th>Rotation</th><th>Bas usine</th></tr></thead><tbody>${s.placements.map(p=>`<tr><td>${escapeHtml(p.pieceId)}</td><td>${escapeHtml(p.sourceRef)}</td><td>${escapeHtml(p.x.toFixed(2))}, ${escapeHtml(p.y.toFixed(2))}</td><td>${escapeHtml(p.widthIn)} × ${escapeHtml(p.heightIn)}</td><td>${escapeHtml(p.rotationDeg)}°</td><td>${p.factoryBottomRequired?'Oui':'Non'}</td></tr>`).join('')}</tbody></table></section>`;}
      body+=`<p class="meta">Placement conservateur par enveloppes; aucune optimalité universelle revendiquée. Perte surface calculée: ${escapeHtml(plan.wastePct.toFixed(1))}%.</p>`;
    }
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
  }
  return {SHEETS,parseIn,polygonArea,normalizePiece,expandPieces,buildCutPlan,validateCutPlan,compareStrategies,compareFormats,createCutPlanSnapshot,buildCutDocuments,buildCutPrintHtml};
});
