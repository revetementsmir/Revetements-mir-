'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),Q=require('../dist/mir-commerce-quantity.js'),catalog=require('../dist/catalogue-fd6866b49d21.json').materials;
const hardie=catalog.find(m=>m.id==='hardieplank-select-625');assert.equal(Q.policy(hardie).area,5);assert.equal(Q.validate(hardie,{unit:'pi²',quantity:2}).ok,false);assert.equal(Q.validate(hardie,{unit:'pi²',quantity:2}).suggestion,5);assert.equal(Q.validate(hardie,{unit:'pi²',quantity:5}).ok,true);assert.equal(Q.validate(hardie,{unit:'pi²',quantity:7}).suggestion,10);assert.equal(Q.validate(hardie,{unit:'pièces',quantity:.5}).ok,false);
const panel=catalog.find(m=>m.id==='hardiepanel');assert.equal(Q.policy(panel).missingFormat,true);assert.equal(Q.policy(panel,'48x96').area,32);assert.equal(Q.policy(panel,'48x120').area,40);assert.equal(Q.validate(panel,{formatId:'48x96',unit:'pi²',quantity:40}).ok,false);
const box=catalog.find(m=>m.id==='prime-siding-2-30644');assert.deepEqual(Q.policy(box).rules,[{unit:'boîtes',step:1}]);assert.equal(Q.validate(box,{unit:'pi²',quantity:5}).ok,false);assert.equal(Q.validate(box,{unit:'boîtes',quantity:1.5}).ok,false);assert.equal(Q.validate(box,{unit:'boîtes',quantity:999999.999}).ok,false);
assert.equal(Q.policy({applications:['siding'],dimensions:{widthIn:8,lengthIn:144},coverage:{verified:false,exposureIn:7}}).area,null,'unverified coverage never inferred');assert.equal(Q.policy({applications:['siding'],dimensions:{widthIn:8,lengthIn:144},coverage:{exposureRangeIn:[5,7]}}).area,null,'no invented exposure');
const before=JSON.stringify(catalog),rows=[];for(const m of catalog){for(const f of [null,...(m.formats||[]).map(f=>f.id)]){const p=Q.policy(m,f);assert.ok(p.rules.length);for(const r of p.rules){assert.ok(r.step>0&&Number.isFinite(r.step));if(!p.missingFormat)assert.equal(Q.validate(m,{formatId:f,unit:r.unit,quantity:r.step}).ok,true,m.id);}rows.push({id:m.id,formatId:f,...p});}}assert.equal(JSON.stringify(catalog),before,'read-only audit');const dir=path.resolve(__dirname,'../docs/verification/client-boutique');fs.writeFileSync(path.join(dir,'catalogue-quantity-audit.json'),JSON.stringify(rows,null,2));console.log('PASS catalogue entier : '+catalog.length+' articles, '+rows.length+' variantes. Couverture utile, formats, conditionnements et quantités entières.');

const adseal=require('../dist/catalogue-adseal-4580.json');
assert.equal(new Set(adseal.colors.map(color=>color.code)).size,adseal.colors.length);
const ivory='adseal-4584',purple='adseal-458-264';
assert.deepEqual(Q.formats(adseal,purple).map(format=>format.id),['tube-304']);
assert.equal(Q.validate(adseal,{colorId:ivory,formatId:'tube-304',unit:'cartouches',quantity:2}).ok,true);
assert.equal(Q.validate(adseal,{colorId:ivory,formatId:'saucisse-600',unit:'saucisses',quantity:3}).ok,true);
assert.equal(Q.validate(adseal,{colorId:purple,formatId:'saucisse-600',unit:'saucisses',quantity:1}).ok,false);
assert.equal(Q.validate(adseal,{colorId:ivory,formatId:'saucisse-600',unit:'saucisses',quantity:0.5}).ok,false);
assert.equal(Q.validate(adseal,{unit:'cartouches',quantity:1}).ok,false);
console.log('PASS ADSEAL : unités entières, format et couleur compatibles, ancien panier à compléter.');
