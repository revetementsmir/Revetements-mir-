'use strict';
function pdf(){
 const parts=['%PDF-1.4\n'];
 const offsets=[];
 const add=value=>{offsets.push(Buffer.byteLength(parts.join('')));parts.push(value)};
 add('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
 add('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
 add('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] >>\nendobj\n');
 const xref=Buffer.byteLength(parts.join(''));parts.push('xref\n0 4\n0000000000 65535 f \n');
 for(const offset of offsets)parts.push(String(offset).padStart(10,'0')+' 00000 n \n');
 parts.push('trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return Buffer.from(parts.join(''),'latin1');
}
module.exports={pdf};
