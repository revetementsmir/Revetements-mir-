'use strict';
const fs=require('node:fs'),path=require('node:path'),test=require('node:test'),assert=require('node:assert/strict');
const file=process.env.MIR_DIALOG_SOURCE||path.join(__dirname,'../dist/production-app.js'),app=fs.readFileSync(file,'utf8');
function guard(){
 const listeners={},events=[],control={tagName:'INPUT',closest:()=>label},label={control},svg={tagName:'svg',closest:()=>label},button={tagName:'BUTTON',closest:()=>null};
 const modal={addEventListener:(type,fn)=>listeners[type]=fn,getBoundingClientRect:()=>({left:0,right:200,top:0,bottom:200})};let closed=0;
 const start=app.indexOf("let modalPressed=false,backdropPressed=false"),end=app.indexOf("modal.addEventListener('close'",start),stop=app.indexOf('\n',end);
 assert.ok(start>=0&&stop>start,'actual dialog guard source is found');
 new Function('modal','closeDialog',app.slice(start,stop))(modal,()=>closed++);
 const emit=(type,target=button,detail=1,coordinates={clientX:100,clientY:100})=>{const event={target,detail,...coordinates,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.stopped=true}};listeners[type]?.(event);events.push(event);return event};
 return{emit,modal,control,label,svg,button,get closed(){return closed}};
}
test('a physical click on a label permits exactly its associated forwarded radio click',()=>{const g=guard();g.emit('pointerdown',g.svg,0);assert.equal(g.emit('click',g.svg).defaultPrevented,false);assert.equal(g.emit('click',g.control).defaultPrevented,false);assert.equal(g.emit('click',g.control).defaultPrevented,true)});
test('ghost click with no new press remains blocked, including a label and its control',()=>{const g=guard();assert.equal(g.emit('click',g.svg).defaultPrevented,true);assert.equal(g.emit('click',g.control).defaultPrevented,true);assert.equal(g.emit('click',g.button).defaultPrevented,true)});
test('keyboard click remains accepted without a pointer press',()=>{const g=guard();assert.equal(g.emit('click',g.button,0).defaultPrevented,false);assert.equal(g.emit('click',g.control,0).defaultPrevented,false)});
test('direct radio and button physical clicks remain accepted',()=>{const g=guard();for(const target of [g.control,g.button]){g.emit('pointerdown',target,0);assert.equal(g.emit('click',target).defaultPrevented,false)}});
test('a pending label activation never authorizes an unrelated control',()=>{const g=guard();g.emit('pointerdown',g.svg,0);g.emit('click',g.svg);assert.equal(g.emit('click',g.button).defaultPrevented,true);assert.equal(g.emit('click',g.control).defaultPrevented,true)});
test('close resets pending activation and backdrop still requires a genuine press',()=>{const g=guard();g.emit('pointerdown',g.svg,0);g.emit('click',g.svg);g.emit('close');assert.equal(g.emit('click',g.control).defaultPrevented,true);g.emit('pointerdown',g.modal,0,{clientX:300,clientY:300});g.emit('click',g.modal,1,{clientX:300,clientY:300});assert.equal(g.closed,1)});
