'use strict';const test=require('node:test'),assert=require('node:assert/strict'),cart=require('../dist/mir-field-cart.js');
const a={cartKey:'a',itemId:'one',quantity:1,name:'Article'},b={cartKey:'b',itemId:'two',quantity:4,name:'Autre'};
test('acknowledgement removes only sent lines and quantity, preserving additions',()=>{assert.deepEqual(cart.acknowledge([{...a,quantity:3},b],[a]),[{...a,quantity:2},b]);assert.deepEqual(cart.acknowledge([a,b],[a]),[b]);});
test('changed specification is never erased by previous acknowledgement',()=>{assert.deepEqual(cart.acknowledge([{...a,colorId:'blue'}],[a]),[{...a,colorId:'blue'}]);});
test('missing or non-submitted receipts cannot clear a cart',()=>{for(const r of [null,{}, {status:'submitted'},{status:'draft',orderId:'x',receiptId:'y'}])assert.equal(cart.receipt(r),false);});
