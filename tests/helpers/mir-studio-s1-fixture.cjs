'use strict';
const fs=require('node:fs');
// Raster-only synthetic drawings. No client source or extracted client text.
async function makeRasterPDF(page,file){
  const images=await page.evaluate(()=>{
    const make=(titles,turn=false)=>{
      const c=document.createElement('canvas');c.width=1200;c.height=900;
      const g=c.getContext('2d');g.fillStyle='white';g.fillRect(0,0,c.width,c.height);g.fillStyle='black';g.strokeStyle='black';g.lineWidth=3;
      for(const [index,title] of titles.entries()){
        const staggered=titles.length===5;
        const [x,y]=staggered?[[25,45],[825,45],[25,495],[825,495],[425,200]][index]:[(index%3)*400+25,Math.floor(index/3)*450+45];
        const tall=staggered&&title.includes('FLOOR');
        g.strokeRect(x+25,y,300,tall?400:150);g.font='bold 21px Arial';g.fillText(title,x,y+(tall?445:210));
        if(title.includes('HOUSE')){g.font='18px Arial';g.fillText('Overall building width: 40 ft',x,y+260);}
        // A coloured legend is deliberately not a wall.
        g.fillStyle='#ff4050';g.fillRect(x+50,y+300,100,35);g.fillStyle='black';g.font='17px Arial';g.fillText('LEGEND',x+160,y+325);
      }
      if(!turn)return {width:1200,height:900,jpeg:c.toDataURL('image/jpeg',.95).split(',')[1]};
      const r=document.createElement('canvas');r.width=900;r.height=1200;const ctx=r.getContext('2d');ctx.translate(900,0);ctx.rotate(Math.PI/2);ctx.drawImage(c,0,0);
      return {width:900,height:1200,jpeg:r.toDataURL('image/jpeg',.95).split(',')[1]};
    };
    return [make(['FRONT ELEVATION SHED','RIGHT ELEVATION SHED','REAR ELEVATION SHED','LEFT ELEVATION SHED','FLOOR PLAN SHED'],true),
      make(['FRONT ELEVATION HOUSE','REAR ELEVATION HOUSE']),make(['UPPER FLOOR PLAN HOUSE'])];
  });
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 3 /Kids [3 0 R 6 0 R 9 0 R] >>'];
  images.forEach((image,i)=>{
    const id=3+i*3,jpeg=Buffer.from(image.jpeg,'base64'),w=image.width/2,h=image.height/2;
    const content=`q ${w} 0 0 ${h} 0 0 cm /Scan Do Q`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Scan ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`,
      Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,Buffer.from('\nendstream')]),
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  let cursor=0;const parts=[],offsets=[0],write=b=>{b=Buffer.from(b);parts.push(b);cursor+=b.length;};write('%PDF-1.4\n');
  objects.forEach((object,i)=>{offsets.push(cursor);write(`${i+1} 0 obj\n`);write(object);write('\nendobj\n');});
  const xref=cursor;write(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);offsets.slice(1).forEach(n=>write(String(n).padStart(10,'0')+' 00000 n \n'));
  write(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);fs.writeFileSync(file,Buffer.concat(parts));
}
module.exports={makeRasterPDF};
