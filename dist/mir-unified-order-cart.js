(function(global){
  'use strict';
  const KEY='mir_unified_order_cart_v1';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const read=()=>{try{const value=JSON.parse(localStorage.getItem(KEY));return value?.version===1&&Array.isArray(value.lines)?value:{version:1,lines:[],updatedAt:null};}catch{return {version:1,lines:[],updatedAt:null};}};
  const write=lines=>{const value={version:1,lines:copy(lines),updatedAt:new Date().toISOString()};localStorage.setItem(KEY,JSON.stringify(value));global.dispatchEvent(new CustomEvent('mir:order-cart-changed',{detail:{count:lines.length}}));return value;};
  const validQuantity=value=>Number.isSafeInteger(Number(value))&&Number(value)>0;
  const normalize=line=>{
    if(!line||!['material','fold'].includes(line.kind)||!validQuantity(line.quantity))throw new TypeError('Une quantité entière supérieure à zéro est requise.');
    return {...copy(line),id:String(line.id||global.crypto?.randomUUID?.()||Date.now()),quantity:Number(line.quantity),updatedAt:new Date().toISOString()};
  };
  const api={
    KEY,
    list:()=>copy(read().lines),
    replace:lines=>write(lines.map(normalize)).lines,
    upsert:line=>{const next=normalize(line),lines=read().lines,index=lines.findIndex(item=>item.id===next.id);if(index<0)lines.push(next);else lines[index]=next;write(lines);return copy(next);},
    remove:id=>write(read().lines.filter(line=>line.id!==id)).lines,
    duplicate:id=>{const source=read().lines.find(line=>line.id===id);if(!source)return null;delete source.createdAt;source.id=global.crypto?.randomUUID?.()||Date.now().toString(36);return api.upsert(source);},
    clear:()=>write([]),
    counts:()=>read().lines.reduce((out,line)=>{out[line.kind==='fold'?'folds':'materials']+=1;return out;},{materials:0,folds:0})
  };
  global.MIRUnifiedOrderCart=Object.freeze(api);
})(window);
