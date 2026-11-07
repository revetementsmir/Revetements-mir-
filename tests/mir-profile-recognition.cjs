'use strict';
const assert=require('node:assert/strict');
const R=require('../dist/mir-profile-recognition.js');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
const spec=(segments,bends)=>({kind:'profile',template:'custom',segments:segments.map((length,i)=>({label:String.fromCharCode(65+i),length})),bends});
test('Aucune proposition avant deux côtés',()=>assert.equal(R.recognize(spec([6],[])).code,'incomplete'));
test('L : 2 côtés, 90°',()=>assert.equal(R.recognize(spec([6,1.5],[{mode:'signed',angle:-90}])).code,'l'));
test('Z : deux angles opposés',()=>assert.equal(R.recognize(spec([2,5,2],[{mode:'signed',angle:90},{mode:'signed',angle:-90}])).code,'z'));
test('J/U : deux angles même sens',()=>assert.equal(R.recognize(spec([1,5,1],[{mode:'signed',angle:90},{mode:'signed',angle:90}])).code,'j-u'));
test('Retour écrasé classé distinctement',()=>assert.equal(R.recognize(spec([1,5],[{mode:'hem',direction:'right'}])).code,'hem'));
test('Profil libre 4 côtés, 86° : ne pas imposer un modèle',()=>assert.equal(R.recognize(spec([6,1.5,1.25,.875],[{mode:'signed',angle:-90},{mode:'signed',angle:86},{mode:'signed',angle:-90}])).code,'custom'));
test('La reconnaissance ne modifie ni cotes ni angles',()=>{const input=spec([6,1.5,1.25],[{mode:'signed',angle:90},{mode:'signed',angle:-90}]),before=JSON.stringify(input);R.recognize(input);assert.equal(JSON.stringify(input),before);});
console.log('MIR reconnaissance: '+count+' tests réussis');
