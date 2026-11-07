/* Les Revêtements MIR — outils de revue et présentation du magasin.
 * Réutilise le catalogue original et les IDs existants: aucun SKU ou stock inventé.
 * Les annotations ne modifient jamais les lignes de panier ni les bons historiques.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MIRStoreReview=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const STORAGE_KEY='mir_employee_store_annotations_v1';
  const FASCIA_IDS=[
    'mir-request-fascia-screws-black-2in',
    'mir-request-fascia-screws-white-2in',
    'pending-kaycan-fascia-hex-quarter-inch'
  ];
  const CANEXEL_IDS=[
    'canexel-joint-cedrvue-6','canexel-joint-cedrvue-9',
    'canexel-joint-ridgewood-d5-12','canexel-joint-vstyle-12'
  ];
  const empty=()=>({annotations:{},hidden:[],showHidden:false});
  const safeId=id=>typeof id==='string'&&/^[\w-]{1,160}$/.test(id);
  function normalize(raw){
    const state=empty();
    if(raw&&typeof raw==='object'){
      if(raw.annotations&&typeof raw.annotations==='object'&&!Array.isArray(raw.annotations)){
        for(const [id,note] of Object.entries(raw.annotations)){
          if(safeId(id)&&typeof note==='string'&&note.length<=2000)state.annotations[id]=note;
        }
      }
      if(Array.isArray(raw.hidden))state.hidden=[...new Set(raw.hidden.filter(safeId))];
    }
    return state;
  }
  function load(storage){
    try{return normalize(JSON.parse(storage?.getItem(STORAGE_KEY)||'null'));}
    catch(_){return empty();}
  }
  function save(storage,state){
    try{storage?.setItem(STORAGE_KEY,JSON.stringify({schemaVersion:1,
      annotations:normalize(state).annotations,hidden:normalize(state).hidden}));return !!storage;}
    catch(_){return false;}
  }
  function importAnnotations(raw,current){
    const parsed=typeof raw==='string'?JSON.parse(raw):raw;
    if(parsed?.schemaVersion!==1||!Array.isArray(parsed.annotations))throw Error('Format JSON incompatible');
    if(parsed.annotations.length>3000)throw Error('Trop de fiches');
    const next=normalize(current);
    let count=0;
    for(const item of parsed.annotations){
      if(!safeId(item?.itemId)||typeof item.note!=='string'||item.note.length>2000)continue;
      next.annotations[item.itemId]=item.note;count++;
    }
    return {state:next,count};
  }
  function exportAnnotations(state,catalogue=[],at=new Date().toISOString()){
    const src=normalize(state),byId=new Map(catalogue.map(x=>[x.id,x]));
    return {schemaVersion:1,exportedAt:at,
      annotations:Object.entries(src.annotations).map(([itemId,note])=>({
        itemId,title:byId.get(itemId)?.name||itemId,
        brand:byId.get(itemId)?.brand||null,
        reference:byId.get(itemId)?.manufacturerReference||null,note
      }))};
  }
  function present(items,{demo=false}={}){
    if(!Array.isArray(items))return [];
    if(!demo)return items;
    const byId=new Map(items.map(item=>[item.id,item]));
    const mapping=new Map();
    function group(members,title,variants){
      const present=members.filter(x=>byId.has(x));
      if(present.length<2)return;
      const first=byId.get(present[0]);
      const visible=variants.filter(v=>byId.has(v.itemId));
      if(visible.length<2)return;
      const grouped={...first,name:title,reviewVariants:visible,reviewGroup:true};
      present.forEach(id=>mapping.set(id,grouped));
    }
    const variants=[{itemId:FASCIA_IDS[0],colorId:'',label:'Noir'},
      {itemId:FASCIA_IDS[1],colorId:'',label:'Blanc'}];
    const kaycan=byId.get(FASCIA_IDS[2]);
    if(kaycan){
      if(kaycan.colors?.length)for(const c of kaycan.colors)
        variants.push({itemId:kaycan.id,colorId:c.id,label:c.name+' · Kaycan'});
      else variants.push({itemId:kaycan.id,colorId:'',label:'Couleur Kaycan · à confirmer'});
    }
    group(FASCIA_IDS,'Vis à fascia — 2 po · hex ¼ po',variants);
    // Une seule fiche par modèle et largeur, jamais une fusion inter-profils.
    for(const base of CANEXEL_IDS){
      const matches=items.filter(x=>x.id===base||x.id.startsWith(base+'-'));
      group(matches.map(x=>x.id),matches[0]?.name||base,matches.map(x=>({
        itemId:x.id,colorId:x.colors?.length===1?x.colors[0].id:'',
        label:x.baseColorName||x.colors?.[0]?.name||x.name
      })));
    }
    // Panneaux Hardie uniquement : chaque type conserve son ID et son format.
    const hardie=items.filter(x=>x.category==='fixations'&&
      (/hardiepanel/i.test(x.name||'')||
      /^lighttrim-/.test(x.id)&&/panneau|panel/i.test(x.name||'')));
    if(hardie.length>1)group(hardie.map(x=>x.id),'Vis pour panneaux James Hardie — type de vis',
      hardie.map(x=>({itemId:x.id,colorId:x.baseColorId||'',label:x.name})));
    const seen=new Set(),out=[];
    for(const item of items){
      const row=mapping.get(item.id)||item;
      if(seen.has(row.id))continue;seen.add(row.id);out.push(row);
    }
    return out;
  }
  function selection(card,find){
    const option=card?.querySelector?.('[data-product-variant]')?.selectedOptions?.[0];
    const id=option?.dataset?.itemId||card?.dataset?.product;
    return {item:find(id),colorId:option?.dataset?.colorId||null};
  }
  return Object.freeze({STORAGE_KEY,FASCIA_IDS,CANEXEL_IDS,empty,normalize,load,save,
    importAnnotations,exportAnnotations,present,selection});
});
