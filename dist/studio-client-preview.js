/* One reversible transaction for existing Studio choices. Only Confirm persists. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MIRClientPreview=api;})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x));
  function create({read,replace,persist,render=()=>{}}){
    let baseline=null,target=null,saving=false;
    function cancel(repaint=true){if(saving)return false;if(baseline){const old=baseline;baseline=null;target=null;replace(copy(old));if(repaint)render();}return true;}
    function begin(next){if(saving)return false;if(target?.id===next.id&&target?.kind===next.kind)return true;cancel(false);baseline=copy(read());target={...next,scope:'single'};render();return true;}
    function scope(next){if(!baseline||saving)return;replace(copy(baseline));target={...target,scope:next};render();}
    async function confirm(){if(!baseline||saving)return false;const before=copy(baseline);saving=true;try{await persist(copy(read()),before,copy(target));baseline=null;target=null;return true;}finally{saving=false;render();}}
    return Object.freeze({begin,cancel,scope,confirm,active:()=>!!baseline,target:()=>target?copy(target):null,saving:()=>saving,baseline:()=>baseline?copy(baseline):null});
  }
  return Object.freeze({create,version:1});
});
