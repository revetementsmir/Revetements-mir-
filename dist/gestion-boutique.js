'use strict';
const field=id=>document.getElementById(id);
const search=field('shop-admin-search'), items=field('shop-admin-items');
const status=field('shop-admin-status'), output=field('shop-admin-json'), copy=field('shop-admin-copy');
let catalogue=[], hidden=new Set();
const normalized=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function updateList(){
  output.value=JSON.stringify({hidden:[...hidden].sort()},null,2)+'\n';
  status.textContent=hidden.size+' article(s) à masquer après publication.';
}
function render(){
  const term=normalized(search.value).trim();
  const results=catalogue.filter(item=>normalized(item.brand+' '+item.name+' '+item.id).includes(term));
  items.replaceChildren();
  for(const item of results.slice(0,60)){
    const label=document.createElement('label'), input=document.createElement('input');
    label.className='check-field';input.type='checkbox';input.checked=hidden.has(item.id);
    input.addEventListener('change',()=>{
      if(input.checked)hidden.add(item.id);else hidden.delete(item.id);
      updateList();
    });
    label.append(input,document.createTextNode(item.brand+' · '+item.name));
    items.append(label);
  }
  if(!results.length)items.textContent='Aucun article trouvé.';
  if(results.length>60)items.append(document.createTextNode('Affinez la recherche pour voir les autres articles.'));
}
copy.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(output.value);status.textContent='Liste copiée. Colle-la dans le fichier GitHub.';}
  catch{output.focus();output.select();status.textContent='Sélection prête à copier.';}
});
search.addEventListener('input',render);
Promise.all(['catalogue-fd6866b49d21.json','boutique-visibilite.json'].map(async path=>{
  const response=await fetch(path,{cache:'no-cache'});
  if(!response.ok)throw new Error('Chargement impossible.');
  return response.json();
})).then(([data,visibility])=>{
  if(!Array.isArray(data.materials)||!Array.isArray(visibility.hidden))throw new Error('Configuration invalide.');
  hidden=new Set(visibility.hidden);
  catalogue=data.materials.filter(item=>item.status!=='visualization_only'&&item.commercialStatus!=='not_for_sale');
  copy.disabled=false;updateList();render();
}).catch(error=>{status.textContent=error.message;});
