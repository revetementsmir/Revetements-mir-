/* MIR: lexical hints from a PDF text layer/OCR, not structural recognition or design approval. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MIRStructuralNotes=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const patterns=[
  ['column',/\b(?:poteaux?|colonnes?|piliers?|posts?|columns?)\b/g],
  ['beam',/\b(?:poutres?|beams?|linteaux?)\b/g],
  ['balcony',/\b(?:balcons?|galeries?|porches?|perrons?|terrasses?|balconies?)\b/g]
 ];
 function detect(words=[],pageText=''){
  const found=[],seen=new Set();
  function add(type,label,box,source){
   if(found.length>=60)return;
   const okay=Array.isArray(box)&&box.length===4&&box.every(Number.isFinite)&&box[2]>box[0]&&box[3]>box[1];
   const key=type+'|'+(okay?box.map(n=>Math.round(n/12)).join(':'):normal(label).slice(0,70));
   if(seen.has(key))return;seen.add(key);
   found.push({type,label:String(label).trim().slice(0,110),box:okay?box.slice():null,
    source:source==='ocr'?'ocr':source==='pdf-text'?'pdf-text':'page-text',
    status:'text-hint-location-to-confirm',needsReview:true,structuralVerification:false});
  }
  for(const w of Array.isArray(words)?words:[]){
   if(!w||typeof w.text!=='string')continue;
   const label=normal(w.text);
   for(const [type,re] of patterns){re.lastIndex=0;if(re.test(label))add(type,w.text,w.box,w.source);}
  }
  if(!found.length&&typeof pageText==='string'){
   const clean=normal(pageText).slice(0,40000);
   for(const [type,re] of patterns){
    re.lastIndex=0;let hit;
    while((hit=re.exec(clean))&&found.length<60){
     const fragment=pageText.slice(Math.max(0,hit.index-24),Math.min(pageText.length,hit.index+hit[0].length+50));
     add(type,fragment,null,'page-text');
    }
   }
  }
  return found;
 }
 function withinCrop(hints,crop){
  if(!Array.isArray(crop)||crop.length!==4)return hints||[];
  const [x,y,w,h]=crop;
  return (hints||[]).filter(note=>{
   if(!Array.isArray(note.box))return true; // no coordinates: ambiguous reference only
   const cx=(note.box[0]+note.box[2])/2,cy=(note.box[1]+note.box[3])/2;
   return cx>=x&&cx<=x+w&&cy>=y&&cy<=y+h;
  });
 }
 return Object.freeze({detect,withinCrop,version:'1.0.0'});
});