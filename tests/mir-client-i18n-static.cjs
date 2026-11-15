'use strict';
/* Exact static-copy coverage on all public customer HTML pages. No network, no
 * translation heuristics, no changes to product or customer business content. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const en=require('../dist/mir-client-en-ca.js'),dist=path.resolve(__dirname,'../dist');
const pages=['index','boutique','materiaux','produit','selection','pliage','contact','realisations','plan','production','estimation','estimation-dossier','studio'];
const approvedUntranslated=new Set([
 'Les Revêtements MIR','LES REVÊTEMENTS MIR','info@revetementsmir.com',
 '1653, avenue des Affaires','Québec','RAL Classic'
]);
let total=0,translated=0;
for(const page of pages){
 const html=fs.readFileSync(path.join(dist,page+'.html'),'utf8');
 const source=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,'');
 const texts=[...source.matchAll(/>([^<>]+)</g)].map(x=>x[1].replace(/&(?:nbsp|amp|#\d+);/g,' ').replace(/\s+/g,' ').trim()).filter(x=>x.length>=4&&!/^[\d.,\s\-\/]+$/.test(x));
 const attrs=[...source.matchAll(/\b(?:placeholder|aria-label|title|alt)=['"]([^"']{4,})/g)].map(x=>x[1]);
 const unique=[...new Set([...texts,...attrs])].filter(x=>/[A-Za-zÀ-ÿ]/.test(x));
 const missing=unique.filter(x=>!Object.prototype.hasOwnProperty.call(en,x)&&!approvedUntranslated.has(x));
 assert.deepEqual(missing,[],'Untranslated static client labels '+page+': '+missing.join(' | '));
 const covered=unique.filter(x=>Object.prototype.hasOwnProperty.call(en,x));
 total+=unique.length;translated+=covered.length;
 console.log('PASS '+page+': '+covered.length+' of '+unique.length+' static labels translated; official terms preserved');
}
console.log('MIR client FR-CA/EN-CA static pages: '+pages.length+', '+translated+'/'+total+' translated or '+(total-translated)+' approved proper names / addresses');
