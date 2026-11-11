// Bounded binary inspection. PNG: chunks/CRC/structure/IDAT inflation/filter bytes.
// Other existing image formats: signatures only, NOT a complete decoder/antivirus.
import { inflateSync } from 'node:zlib';
export const MAX_FILE_BYTES=10*1024*1024, MAX_DECODED_BYTES=64*1024*1024;
export class FileError extends Error { constructor(code,status=422){super(code);this.code=code;this.status=status;} }
const fail=code=>{throw new FileError(code);};
const crcTable=Uint32Array.from({length:256},(_,i)=>{let n=i;for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
const text=b=>String.fromCharCode(...b), u32=(b,i)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(i);
export function inspectPng(bytes){
 if(bytes.length<45||text(bytes.subarray(0,8))!=='\x89PNG\r\n\x1a\n')fail('PNG_SIGNATURE');
 let at=8,header=null,palette=false,idat=false,endedIdat=false,end=false,count=0,total=0;const compressed=[];
 while(at<bytes.length){
  if(++count>4096||at+12>bytes.length)fail('PNG_CHUNK_LIMIT');
  const size=u32(bytes,at),type=text(bytes.subarray(at+4,at+8)),next=at+12+size;
  if(!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type)||next>bytes.length)fail('PNG_CHUNK');
  if(crc32(bytes.subarray(at+4,at+8+size))!==u32(bytes,at+8+size))fail('PNG_CRC');
  const data=bytes.subarray(at+8,at+8+size);
  if(!header&&type!=='IHDR')fail('PNG_HEADER');
  if(type==='IHDR'){
   if(header||size!==13)fail('PNG_HEADER');
   const width=u32(data,0),height=u32(data,4),depth=data[8],color=data[9],channels=({0:1,2:3,3:1,4:2,6:4})[color];
   const depths=({0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]})[color];
   if(!width||!height||width>16384||height>16384||width*height>16777216||!depths?.includes(depth)||data[10]!==0||data[11]!==0||data[12]>1)fail('PNG_DIMENSIONS_OR_HEADER');
   header={width,height,depth,color,channels,interlace:data[12]};
  }else if(type==='PLTE'){
   if(palette||idat||!size||size%3||size>768||header.color===0||header.color===4||header.color===3&&size/3>2**header.depth)fail('PNG_PALETTE');
   palette=true;
  }else if(type==='IDAT'){
   if(endedIdat||header.color===3&&!palette)fail('PNG_IDAT_ORDER');idat=true;compressed.push(data);total+=data.length;
  }else if(type==='IEND'){
   if(size||!idat||next!==bytes.length)fail('PNG_END');end=true;at=next;break;
  }else{
   if(idat)endedIdat=true;
   if(type[0]===type[0].toUpperCase())fail('PNG_CRITICAL_CHUNK');
   // Do not pretend to inspect unparsed APNG frames.
   if(['acTL','fcTL','fdAT'].includes(type))fail('PNG_ANIMATION_UNSUPPORTED');
  }
  at=next;
 }
 if(!end||!total)fail('PNG_END');
 const passes=header.interlace?[[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]]:[[0,0,1,1]];
 const rows=[];let expected=0;
 for(const [x,y,dx,dy]of passes){const w=Math.max(0,Math.ceil((header.width-x)/dx)),h=Math.max(0,Math.ceil((header.height-y)/dy));if(!w||!h)continue;
  const stride=1+Math.ceil(w*header.channels*header.depth/8);expected+=h*stride;rows.push([h,stride]);}
 if(expected>MAX_DECODED_BYTES)fail('PNG_DECODE_LIMIT');
 const input=new Uint8Array(total);let pos=0;for(const part of compressed){input.set(part,pos);pos+=part.length;}
 let decoded;try{decoded=inflateSync(input,{maxOutputLength:expected+1});}catch{fail('PNG_DEFLATE');}
 if(decoded.length!==expected)fail('PNG_DECODE_LENGTH');
 pos=0;for(const [height,stride]of rows)for(let y=0;y<height;y++){if(decoded[pos]>4)fail('PNG_FILTER');pos+=stride;}
 return{inspector:'png-crc-inflate-v1',width:header.width,height:header.height,decodedBytes:expected};
}
export function inspectImage(bytes,mime){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>MAX_FILE_BYTES)throw new FileError('FILE_SIZE',413);
 if(mime==='image/png')return inspectPng(bytes);
 if(mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217)return{inspector:'jpeg-signature-v1'};
 if(mime==='image/webp'&&bytes.length>=20&&text(bytes.subarray(0,4))==='RIFF'&&text(bytes.subarray(8,12))==='WEBP'
  &&new DataView(bytes.buffer,bytes.byteOffset).getUint32(4,true)+8===bytes.length)return{inspector:'webp-signature-v1'};
 if(['image/heic','image/heif'].includes(mime)&&bytes.length>=16&&text(bytes.subarray(4,8))==='ftyp'&&u32(bytes,0)>=16&&u32(bytes,0)<=bytes.length){
  const brands=[];for(let at=8;at<u32(bytes,0);at+=4)if(at!==12)brands.push(text(bytes.subarray(at,at+4)));
  if(brands.some(b=>['heic','heix','hevc','hevx','mif1','msf1'].includes(b)))return{inspector:'heif-signature-v1'};
 }
 fail('FILE_CONTENT_TYPE');
}
