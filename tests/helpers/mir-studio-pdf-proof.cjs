'use strict';
const assert=require('node:assert/strict');
const compact=value=>String(value??'').replace(/\s+/g,'');
const rowText=row=>typeof row==='string'?row:String(row?.label??row?.text??'');
async function startPaintProof(page){
 await page.evaluate(()=>{
  if(window.__mirQaPaint)throw Error('PDF recorder already active');
  const original=CanvasRenderingContext2D.prototype.fillText,ids=new WeakMap(),rows=[];let sequence=0;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){
   if(this.canvas.width===2976&&this.canvas.height===2105){if(!ids.has(this.canvas))ids.set(this.canvas,++sequence);rows.push({page:ids.get(this.canvas),text:String(text),x,y,font:this.font,align:this.textAlign});}
   return original.call(this,text,x,y,...rest);
  };
  window.__mirQaPaint={original,rows};
 });
}
async function finishPaintProof(page){return page.evaluate(()=>{const saved=window.__mirQaPaint;if(!saved)return[];CanvasRenderingContext2D.prototype.fillText=saved.original;delete window.__mirQaPaint;return saved.rows;});}
function verifyStudioPDF(diagnostics,faces,paint,{technical=true,annotated=technical,presentationFaces=null}={}){
 assert.equal(diagnostics?.renderer,'studio-client-1');
 assert.equal(diagnostics.includeTechnical,technical);
 if(!technical){assert.equal(diagnostics.pageCount,faces.length,'simple export contains only the four clean elevations');assert.equal(diagnostics.sourceRows.length,0,'technical rows are only painted on explicit opt-in');}
 assert.deepEqual(diagnostics.sourceFaces,faces.map(f=>({key:f.key,name:f.name,summary:f.summary||[]})),'all source summary rows received without reinterpretation');
 assert.deepEqual(diagnostics.pages.slice(0,faces.length).map(p=>[p.kind,p.faceKey]),faces.map(f=>['presentation',f.key]),'large presentation pages precede all appendices');
 if(annotated){const expectedKeys=presentationFaces?faces.filter(f=>{const presentation=presentationFaces.find(p=>p.key===f.key);return typeof presentation?.svg==='string'&&presentation.svg!==f.svg;}).map(f=>f.key):faces.map(f=>f.key);assert.deepEqual(diagnostics.pages.filter(p=>p.kind==='annotated').map(p=>p.faceKey),expectedKeys,'every distinct original annotated elevation is retained; identical drawings need no duplicate');}
 assert.equal(diagnostics.sourceRows.length,technical?faces.reduce((n,f)=>n+(f.summary||[]).length,0):0,'no requested source row omitted');
 for(const source of diagnostics.sourceRows){
  const face=faces.find(f=>f.key===source.faceKey),expected=rowText(face.summary[source.index]);
  assert.equal(source.sourceText,expected);
  assert.equal(compact(source.fragments.flatMap(f=>f.lines).join('')),compact(expected),'whole source row painted across annex pages');
  for(const fragment of source.fragments){
   assert.equal(diagnostics.pages[fragment.page-1].kind,'technical');assert.equal(fragment.lines.length,fragment.positions.length);
   fragment.lines.forEach((line,i)=>{const pos=fragment.positions[i];assert.ok(pos.x>=100&&pos.x+pos.width<=2877&&pos.y>350&&pos.y<1970,'annex text remains inside page body');assert.ok(paint.some(t=>t.page===fragment.page&&t.text===line&&t.x===pos.x&&t.y===pos.y),'independent canvas recorder confirms actual fillText');});
  }
 }
 for(const page of diagnostics.pages){
  const recorded=paint.filter(t=>t.page===page.number);assert.equal(recorded.length,page.text.length,'diagnostics match independently recorded canvas calls');
  assert.deepEqual(recorded.map(({text,x,y,font})=>({text,x,y,font})),page.text.map(({text,x,y,font})=>({text,x,y,font})));
  if(page.drawing){assert.ok(page.drawing.width>0&&page.drawing.height>0);assert.ok(page.drawing.x>=100&&page.drawing.x+page.drawing.width<=2877&&page.drawing.y>=300&&page.drawing.y+page.drawing.height<=1950,'complete drawing fits its page');}
 }
 return{renderer:diagnostics.renderer,locale:diagnostics.locale,pages:diagnostics.pageCount,presentationPages:diagnostics.pages.filter(p=>p.kind==='presentation').length,annotatedPages:diagnostics.pages.filter(p=>p.kind==='annotated').length,technicalPages:diagnostics.pages.filter(p=>p.kind==='technical').length,sourceRows:diagnostics.sourceRows.length,paintedSourceLines:diagnostics.sourceRows.reduce((n,r)=>n+r.fragments.reduce((m,f)=>m+f.lines.length,0),0),allRowsPreserved:true,independentCanvasCalls:paint.length};
}
module.exports={startPaintProof,finishPaintProof,verifyStudioPDF};
