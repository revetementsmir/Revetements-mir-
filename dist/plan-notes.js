/* Short facade instructions; coordinates stay tied to the calibrated source. */
(function(factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(typeof window==='object')window.MIRPlanNotes=api;})(function(){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bounds=p=>[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))];
 function inside(p,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
 function suggestions(face,plan){
  const pieces=(plan?.pieces||[]).filter(p=>p.face===face.key&&p.geometryPx?.outer?.length>=3),openings=(face.openings||[]).filter(o=>o.type==='window'&&o.polygon?.length>=3).map(o=>({...o,b:bounds(o.polygon)})).sort((a,b)=>a.b[0]-b.b[0]),out=[];
  for(let i=0;i<openings.length;i++)for(let j=i+1;j<openings.length;j++){
   const a=openings[i],b=openings[j],top=Math.max(a.b[1],b.b[1]),bottom=Math.min(a.b[3],b.b[3]);if(b.b[0]<=a.b[2]||bottom<=top)continue;
   if(openings.some((o,k)=>k!==i&&k!==j&&o.b[0]<b.b[0]&&o.b[2]>a.b[2]&&o.b[1]<bottom&&o.b[3]>top))continue;
   const point=[(a.b[2]+b.b[0])/2,(top+bottom)/2],p=pieces.find(p=>inside(point,p.geometryPx.outer)&&!(p.geometryPx.holes||[]).some(h=>inside(point,h)));if(!p)continue;
   out.push({id:'between:'+face.key+':'+a.id+':'+b.id,face:face.key,point,text:'Panneau entre fenêtres — vérifier les cotes et les joints.',source:'suggested',pieceId:p.id});
  }return out;
 }
 function collect(face,plan,state={}){
  const proposed=suggestions(face,plan).filter(n=>!state.hidden?.[n.id]),custom=(state.items||[]).filter(n=>n.face===face.key);
  return [...proposed,...custom].filter(n=>Array.isArray(n.point)&&n.point.length===2&&n.point.every(Number.isFinite)&&typeof n.text==='string'&&n.text.trim()).map((n,i)=>({...n,text:n.text.trim().slice(0,240),label:'!'+(i+1)}));
 }
 function wrap(text,max){const out=[];let line='';for(const word of text.split(/\s+/)){if(line.length+word.length+1>max&&line){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)out.push(line);return out;}
 function annotateSVG(svg,face,notes=[]){
  if(!notes.length||!Array.isArray(face.bbox)||face.bbox.length!==4)return svg;
  const [x,y,w,h]=face.bbox,font=w/72,lineHeight=font*1.45,padding=font*.65,top=y+h+font,maxChars=82;
  let body='';
  for(const note of notes){const [px,py]=note.point;body+='<g><title>'+esc(note.label+' '+note.text)+'</title><circle cx="'+px+'" cy="'+py+'" r="'+font*.68+'" fill="#b76723" stroke="#fff" stroke-width="'+font*.12+'"/><text x="'+px+'" y="'+(py+font*.23)+'" fill="#fff" text-anchor="middle" font-weight="700" font-size="'+font*.67+'">'+esc(note.label)+'</text></g>';}
  const rows=notes.map(note=>({note,lines:wrap(note.text,maxChars)})),height=rows.reduce((sum,r)=>sum+r.lines.length*lineHeight+padding,0)+font*2;
  body+='<rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+height+'" rx="'+font*.25+'" fill="#fff7ec" stroke="#e8d8c4"/>';let rowY=top+font*1.7;
  for(const row of rows){body+='<text x="'+(x+font)+'" y="'+rowY+'" font-weight="700" fill="#99501f" font-size="'+font+'">'+esc(row.note.label)+'</text>';for(const line of row.lines){body+='<text x="'+(x+font*3.1)+'" y="'+rowY+'" fill="#503e2c" font-size="'+font+'">'+esc(line)+'</text>';rowY+=lineHeight;}rowY+=padding;}
  const extended=h+font+height;
  return String(svg).replace(/viewBox="[^"]*"/,'viewBox="'+[x,y,w,extended].join(' ')+'"').replace(/height="[^"]*"/,'height="'+extended+'"').replace('</svg>','<g font-family="Arial,sans-serif" class="mir-plan-notes">'+body+'</g></svg>');
 }
 return{suggestions,collect,annotateSVG,version:'1.0.0'};
});
