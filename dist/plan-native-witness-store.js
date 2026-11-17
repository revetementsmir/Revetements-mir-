/* Native witness precision belongs to its retained source observation. A
 * matching mutable geometry snapshot cannot replace that observation. */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(()=>node?require('./plan-native-witness-measurement.js'):root.MIRNativeWitnessMeasurement,()=>node?require('./plan-import-core.js'):root.MIRPDFAnalysis);
 if(node)module.exports=api;else root.MIRNativeWitnessStore=api;
})(typeof window==='object'?window:globalThis,function(measurementModule,analysisModule){
 'use strict';
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),finite=Number.isFinite;
 const point=p=>Array.isArray(p)&&p.length===2&&p.every(finite),pair=a=>Array.isArray(a)&&a.length===2&&a.every(point);
 const span=a=>pair(a)?Math.hypot(a[1][0]-a[0][0],a[1][1]-a[0][1]):NaN,near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<=1e-8;
 const marked=o=>!!o&&typeof o==='object'&&(own(o,'measuredAnchors')||own(o,'measurementEvidence')||own(o,'originalAnchors'));
 const key=o=>o&&typeof o.id==='string'&&typeof o.sourceViewId==='string'?JSON.stringify([o.sourceViewId,o.id]):null;
 const unique=items=>[...new Set(items)];
 const proofKeys=['id','sourceViewId','sourceFileId','sourcePage','sourceFrame','text','textBox','value','confidence','sourceReading','anchors','originalAnchors','measuredAnchors','measurementEvidence','nativeSource','lineEvidence','nativeLineEvidence','datumEvidence'];
 const signature=o=>JSON.stringify(proofKeys.map(k=>[k,o?.[k]]));
 const opaque=new Set(['measurementEvidence','nativeLineEvidence','lineEvidence','sourceReading','nativeSource','sourceCandidate']);
 function carries(value){
  const pending=[value],seen=new Set();
  while(pending.length){const o=pending.pop();if(!o||typeof o!=='object'||seen.has(o))continue;seen.add(o);if(marked(o))return true;for(const [name,child]of Object.entries(o))if(!opaque.has(name)&&child&&typeof child==='object')pending.push(child);}
  return false;
 }
 function inspect(value){
  const nodes=[],records=[];let count=0;
  function walk(o,path,depth){
   if(!o||typeof o!=='object')return;
   if(depth>64||++count>100000)throw Error('Native witness evidence exceeds its bounds');
   const entry={value:o,path};nodes.push(entry);if(marked(o)){records.push(entry);return;}
   if(Array.isArray(o)){
    const seen=new Map();for(let i=0;i<o.length;i++){
     const v=o[i],id=v&&typeof v==='object'?(v.id||v.contourId||(v.from&&v.to&&v.sourceViewId?JSON.stringify([v.sourceViewId,v.from,v.to]):null)):null;
     const label=id==null?'index:'+i:'id:'+JSON.stringify(id),occurrence=seen.get(label)||0;seen.set(label,occurrence+1);
     walk(v,path+'['+label+(occurrence?':duplicate:'+occurrence:'')+']',depth+1);
    }
   }else for(const [name,v]of Object.entries(o))if(!opaque.has(name))walk(v,path+'.'+name,depth+1);
  }
  walk(value,'level',0);return {nodes,records};
 }
 const referencePath=path=>/\.(?:reference|references|writtenDimension|elevationCalibrations)(?:\[|$)/.test(path)&&!path.includes('.localReadingRetries[');

 function sourceIssues(level,inventory){
  try{
   if(!carries(level))return [];
   const tree=inspect(level);if(!tree.records.length)return [];
   const errors=[],W=measurementModule(),A=analysisModule();
   if(typeof W?.validate!=='function'||typeof A?.parseDimension!=='function')return ['NATIVE_WITNESS_MODULE_REQUIRED'];
   const views=inventory?.views||[],files=inventory?.files||[],lists=[level?.reconstruction?.proposal?.localReadingRetries,level?.reconstructionDraft?.localReadingRetries].filter(v=>v!==undefined);
   if(lists.some(rows=>!Array.isArray(rows)||rows.length>1024))return ['NATIVE_WITNESS_READINGS'];
   const retries=lists.flat();
   const validationCache=new Map(),validate=(record,context)=>{
    const identity=JSON.stringify([signature(record),record.scale,record.calibration,context.sourceObservation&&signature(context.sourceObservation)]);
    if(!validationCache.has(identity))validationCache.set(identity,W.validate(record,context));
    return validationCache.get(identity);
   };
   const retained=new Map(),viewFor=id=>views.find(v=>v.id===id&&v.buildingId===level.buildingId&&['elevation','section'].includes(v.kind));
   function add(record,fromRetry){
    if(!marked(record)||own(record,'originalAnchors'))return;
    const id=key(record),view=viewFor(record.sourceViewId);
    if(!id||!view||fromRetry&&(record.source!=='native-vertical-dimension'||record.purpose!=='source-datum-bound-vertical-dimension'||!same(record.box,record.textBox))){errors.push('NATIVE_WITNESS_SOURCE');return;}
    const file=files.find(f=>f.id===view.fileId),native=record.measurementEvidence?.nativeSource||record.nativeSource;
    if(!file?.sha256||native?.sourceSha256!==file.sha256){errors.push('NATIVE_WITNESS_SOURCE');return;}
    const row=(view.payload?.drawingReadings?.verticalRows||[]).find(r=>r.text===record.text&&r.confidence===record.confidence&&same(r.box,record.textBox));
    const parsed=A.parseDimension(record.text||'',{ocr:record.sourceReading?.source!=='pdf-text'});
    if(!row||!same(record.sourceReading,row)||!parsed||!near(parsed.valueFt*.3048,record.value)){errors.push('NATIVE_WITNESS_TRANSCRIPTION');return;}
    errors.push(...validate(record,{view,files}));
    const previous=retained.get(id);if(previous&&signature(previous)!==signature(record))errors.push('NATIVE_WITNESS_SOURCE_CONFLICT');else retained.set(id,record);
   }
   for(const view of views.filter(v=>v.buildingId===level.buildingId))for(const record of view.payload?.drawingReadings?.verticalDimensions||[])add(record,false);
   for(const record of retries)add(record,true);
   const measured=r=>{const observed=retained.get(key(r));return observed?.measurementEvidence?.status==='observed'?observed:null;};
   for(const {value:record,path}of tree.nodes){
    if(!marked(record)&&!(referencePath(path)&&measured(record)))continue;
    const view=viewFor(record.sourceViewId),sourceObservation=retained.get(key(record));
    if(!view||!sourceObservation){errors.push('NATIVE_WITNESS_SOURCE_REQUIRED');continue;}
    if(referencePath(path)&&sourceObservation.measurementEvidence?.status==='observed'&&(!own(record,'originalAnchors')||!marked(record)))errors.push('NATIVE_WITNESS_REFERENCE_EVIDENCE');
    errors.push(...validate(record,{view,files,sourceObservation}));
    if(referencePath(path)&&sourceObservation.measurementEvidence?.status==='observed'){
     const scale=record.value/span(record.anchors);
     if(record.kind!=='written'||sourceObservation.status!=='proposed'||record.sourceReading?.source!=='pdf-text'&&!(record.confidence>=70))errors.push('NATIVE_WITNESS_REFERENCE_ELIGIBILITY');
     if(!same(record.anchors,sourceObservation.measuredAnchors)||!same(record.originalAnchors,sourceObservation.anchors)||!near(record.scale,scale)||record.calibration&&!near(record.calibration.metresPerPixel,scale))errors.push('NATIVE_WITNESS_REFERENCE_SCALE');
    }
   }
   function edgeIssues(edge){
    const r=edge?.reference,view=viewFor(edge?.sourceViewId),from=edge?.datums?.from,to=edge?.datums?.to,scale=r?.value/span(r?.anchors);
    if(!view||r?.sourceViewId!==view.id||!same(edge.sourceFrame,view.frame)||from?.sourceViewId!==view.id||to?.sourceViewId!==view.id||!same(from.sourceFrame,view.frame)||!same(to.sourceFrame,view.frame)||from.levelHint!==edge.from||to.levelHint!==edge.to||from.datumType!=='floor'||to.datumType!=='floor'||!finite(from.y)||!finite(to.y)||!(scale>0)||!near(edge.scaleUsed,scale)||!near(edge.delta,(from.y-to.y)*scale)||!near(edge.tolerance,Math.max(.02,3*scale)))errors.push('NATIVE_WITNESS_DATUM_SCALE');
   }
   for(const {value:o}of tree.nodes){
    if(o?.reference&&measured(o.reference)&&o.datums)edgeIssues(o);
    if(o?.relationship==='two-visible-level-datums'){
     const r=o.writtenDimension||o.references?.[0];if(!measured(r))continue;
     const scale=r.value/span(r.anchors),pixels=o.datumEvidence?.lower?.y-o.datumEvidence?.upper?.y;
     if(o.calibrationMethod!=='independent-vertical-source'||!near(o.scaleUsed,scale)||!(pixels>10)||!near(o.datumEvidence?.differencePixels,pixels)||o.sourceViewId!==r.sourceViewId)errors.push('NATIVE_WITNESS_HEIGHT');
     if(o.kind==='written'){
      if(!o.writtenDimension||!near(o.value,r.value)||!same(o.anchors,r.anchors)||!near(o.datumProjectionScale,o.value/pixels))errors.push('NATIVE_WITNESS_HEIGHT');
     }else if(o.kind!=='estimated-calibrated'||!near(o.value,span(o.anchors)*scale)||!near(o.datumProjectionScale,scale))errors.push('NATIVE_WITNESS_HEIGHT');
    }
    if(!Array.isArray(o?.references)||!o.references.some(e=>measured(e?.reference))||!own(o,'referenceLevelId'))continue;
    const root=inventory.levels?.find(l=>l.id===o.referenceLevelId&&l.buildingId===level.buildingId);
    if(!root||root.sourceLevel!==o.referenceLevelHint||!near(root.contours?.[0]?.base?.value,0)||!Array.isArray(o.checks)||!o.checks.length){errors.push('NATIVE_WITNESS_BASE');continue;}
    let hint=root.sourceLevel,value=0;
    for(const edge of o.references){edgeIssues(edge);if(level.id===root.id)continue;if(edge.from===hint){value+=edge.delta;hint=edge.to;}else if(edge.to===hint){value-=edge.delta;hint=edge.from;}else errors.push('NATIVE_WITNESS_BASE');}
    if(!near(o.value,level.id===root.id?0:value)||level.id!==root.id&&hint!==level.sourceLevel)errors.push('NATIVE_WITNESS_BASE');
    for(const edge of o.checks){
     edgeIssues(edge);const base=label=>inventory.levels?.find(l=>l.buildingId===level.buildingId&&l.sourceLevel===label)?.contours?.[0]?.base?.value,expected=base(edge.to)-base(edge.from)-edge.delta;
     if(!near(edge.residual,expected)||Math.abs(expected)>edge.tolerance)errors.push('NATIVE_WITNESS_DATUM_CONFLICT');
    }
   }
   return unique(errors);
  }catch(_){return ['NATIVE_WITNESS_EVIDENCE'];}
 }

 function historyIssues(nextLevel,previousLevel){
  try{
   if(!carries(previousLevel))return [];
   const before=inspect(previousLevel).records;if(!before.length)return [];
   const after=new Map(inspect(nextLevel).records.map(r=>[r.path,r.value])),errors=[];
   for(const {path,value}of before){const next=after.get(path);if(!next)errors.push('NATIVE_WITNESS_EVIDENCE_LOST');else if(signature(next)!==signature(value))errors.push('NATIVE_WITNESS_EVIDENCE_CHANGED');}
   return unique(errors);
  }catch(_){return ['NATIVE_WITNESS_HISTORY'];}
 }
 return Object.freeze({version:1,sourceIssues,historyIssues});
});
