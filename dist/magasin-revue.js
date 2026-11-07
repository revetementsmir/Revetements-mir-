/* MIR / Revue magasin — données fictives, aucune connexion ni commande réelle. */
(function(){
 'use strict';
 const Store=window.MIREmployeeStore,Review=window.MIRStoreReview;
 const $=s=>document.querySelector(s),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=v=>new Intl.NumberFormat('fr-CA',{maximumFractionDigits:2}).format(v);
 let materials=[],catalogue=[],display=[],notes=Review.empty(),cart=[],noteId='';
 const byId=id=>catalogue.find(i=>i.id===id);
 function imagePath(item){
   const material=materials.find(m=>m.id===item.materialId);
   const path=item.primaryImage||material?.primaryImage||null;
   return typeof path==='string'&&/^(?:\.\/)?assets\/[\w./-]+\.(?:png|webp|jpe?g|avif)$/i.test(path)?path:null;
 }
 function imageMarkup(item){
   const path=imagePath(item);
   return path?'<img src="'+safe(path)+'" loading="lazy" alt="'+safe(item.name)+'">':
     '<div class="placeholder">Photo exacte à confirmer</div>';
 }
 function options(item,type){
   if(type==='variant')return (item.reviewVariants||[]).map((v,i)=>
     '<option value="'+i+'" data-item-id="'+safe(v.itemId)+'" data-color-id="'+safe(v.colorId||'')+'">'+safe(v.label)+'</option>').join('');
   if(type==='color')return '<option value="">Choisir la couleur</option>'+
     (item.colors||[]).map(c=>'<option value="'+safe(c.id)+'"'+(item.baseColorId===c.id?' selected':'')+'>'+safe(c.name)+'</option>').join('');
   return '<option value="">Choisir la longueur</option>'+
     (item.formats||[]).map(f=>'<option value="'+safe(f.id)+'">'+safe(f.label||f.lengthIn+' po')+'</option>').join('');
 }
 function card(item){
   const grouped=item.reviewVariants?.length>1,needsColor=!grouped&&item.colorPolicy==='required'&&item.colors?.length;
   const format=!grouped&&item.formats?.length>1;
   const annotated=notes.annotations[item.id]||'',hidden=notes.hidden.includes(item.id);
   return '<article class="card'+(item.id==='mir-request-soffit-staples-1in'?' prime':'')+'" data-product="'+safe(item.id)+'">'+
     '<div class="visual" data-visual>'+imageMarkup(item)+'</div><div class="card-body"><h2>'+safe(item.name)+'</h2>'+
     (grouped?'<label>Couleur / type<select data-product-variant>'+options(item,'variant')+'</select></label>':'')+
     (format?'<label>Longueur / format<select data-product-format>'+options(item,'format')+'</select></label>':'')+
     (!format&&!grouped&&item.formats?.length===1?'<small>'+safe(item.formats[0].label||'')+'</small>':'')+
     (needsColor?'<label>Couleur<select data-product-color>'+options(item,'color')+'</select></label>':'')+
     (item.referencePending?'<small>Référence ou disponibilité à confirmer</small>':'')+
     '<strong class="secondary">'+safe(item.unit||'pièce')+
     (item.packaging?.piecesPerBox?' · '+n(item.packaging.piecesPerBox)+' / '+safe(item.unit||'emballage'):'')+'</strong>'+
     '<div class="add"><input type="number" min="1" max="10000" value="1" step="1" data-product-qty aria-label="Quantité de '+safe(item.name)+'">'+
     '<button type="button" class="primary" data-add>Ajouter</button></div>'+
     '<div class="review"><button type="button" data-note>'+ (annotated?'Modifier la note':'Annoter')+'</button>'+
     '<button type="button" data-hide>'+(hidden?'Remettre au magasin':'Retirer du magasin')+'</button>'+
     (annotated?'<p class="note">'+safe(annotated)+'</p>':'')+'</div>'+
     (item.sourceUrl?'<small><a target="_blank" rel="noopener noreferrer" href="'+safe(item.sourceUrl)+'">Fiche fournisseur</a></small>':'')+
     '</div></article>';
 }
 function render(){
   const search=$('#search').value.trim().toLocaleLowerCase('fr');
   const cat=$('#category').value,seen=display.filter(item=>(cat==='all'||item.category===cat)&&
     (notes.showHidden||!notes.hidden.includes(item.id))&&
     [item.name,item.brand,...(item.reviewVariants||[]).map(v=>v.label)].join(' ').toLocaleLowerCase('fr').includes(search));
   $('#count').textContent=seen.length+' fiche'+(seen.length!==1?'s':'')+' · revue locale, stock à confirmer';
   $('#products').innerHTML=seen.length?seen.map(card).join(''):'<p>Aucun produit trouvé.</p>';
   const button=$('#show-hidden');button.hidden=!notes.hidden.length;
   button.textContent=notes.showHidden?'Masquer les retirés':'Voir les retirés ('+notes.hidden.length+')';
   renderCart();
 }
 function renderCart(){
   $('#cart').innerHTML='<h2>Panier d’essai · '+cart.length+' ligne'+(cart.length>1?'s':'')+'</h2>'+
    (cart.length?cart.map((line,i)=>'<div class="cart-line"><strong>'+safe(line.name)+'</strong>'+
     '<small>'+safe([line.colorName,line.formatLabel,line.manufacturerReference].filter(Boolean).join(' · '))+'</small>'+
     '<small>'+n(line.quantity)+' '+safe(line.unit)+(line.reservable?'':' · À confirmer')+'</small>'+
     '<button type="button" data-cart-remove="'+i+'">Retirer du panier</button></div>').join(''):
     '<p>Ajoute des produits pour essayer les choix.</p>')+
    '<p class="subtle">Simulation locale uniquement : aucune commande ou livraison transmise.</p>';
 }
 function updateImage(card){
   const selection=Review.selection(card,byId);
   if(selection.item)card.querySelector('[data-visual]').innerHTML=imageMarkup(selection.item);
 }
 function addCard(card){
   const choice=Review.selection(card,byId),item=choice.item||byId(card.dataset.product);
   if(!item)return;
   const id=item.id,format=card.querySelector('[data-product-format]')?.value||
     (card.querySelector('[data-product-variant]')?item.formats?.[0]?.id:null)||undefined;
   const res=Store.configureLine({catalogue},{
     itemId:id,quantity:Number(card.querySelector('[data-product-qty]').value),
     colorId:choice.colorId||card.querySelector('[data-product-color]')?.value||undefined,formatId:format});
   if(!res.ok){alert(res.error?.message||'Choix incomplet.');return;}
   const existing=cart.find(x=>x.stockKey===res.line.stockKey);
   if(existing)existing.quantity+=res.line.quantity;else cart.push(res.line);
   renderCart();
 }
 function saveNotes(){if(!Review.save(localStorage,notes))alert('Stockage bloqué : exporte tes notes JSON.');}
 function download(){
   const data=Review.exportAnnotations(notes,catalogue),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='MIR-annotations-magasin.json';document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function init(){
   notes=Review.load(localStorage);
   const response=await fetch('catalogue-fd6866b49d21.json',{cache:'no-store'});if(!response.ok)throw Error('Catalogue indisponible');
   const raw=await response.json();materials=Array.isArray(raw)?raw:raw.materials||[];
   catalogue=Store.buildCatalogue(materials);display=Review.present(catalogue,{demo:true});
   const select=$('#category');for(const category of Store.CATEGORIES){
     const o=document.createElement('option');o.value=category.id;o.textContent=category.name;select.append(o);
   }
   $('#search').addEventListener('input',render);
   $('#category').addEventListener('change',render);
   $('#show-hidden').addEventListener('click',()=>{notes.showHidden=!notes.showHidden;const y=scrollY;render();scrollTo(0,y);});
   $('#export').addEventListener('click',download);
   $('#import').addEventListener('click',()=>$('#file').click());
   $('#file').addEventListener('change',async e=>{
     const file=e.target.files?.[0];if(!file)return;
     try{if(file.size>500000)throw Error('Fichier trop gros');
       const result=Review.importAnnotations(await file.text(),notes);notes=result.state;saveNotes();
       const y=scrollY;render();scrollTo(0,y);
       alert(result.count+' note(s) importée(s).');
     }catch(err){alert('Import refusé : '+err.message);}finally{e.target.value='';}
   });
   $('#products').addEventListener('change',event=>{
     if(event.target.matches('[data-product-variant]'))updateImage(event.target.closest('[data-product]'));
   });
   $('#products').addEventListener('click',event=>{
     const button=event.target.closest('button');if(!button)return;
     const card=button.closest('[data-product]');if(!card)return;
     const id=card.dataset.product;
     if(button.hasAttribute('data-add'))return addCard(card);
     if(button.hasAttribute('data-hide')){
       const hidden=new Set(notes.hidden);hidden.has(id)?hidden.delete(id):hidden.add(id);
       notes.hidden=[...hidden];saveNotes();const y=scrollY;render();scrollTo(0,y);return;
     }
     if(button.hasAttribute('data-note')){
       noteId=id;$('#note-title').textContent=byId(id)?.name||id;
       $('#note-form').elements.note.value=notes.annotations[id]||'';
       $('#annotation-dialog').showModal();return;
     }
   });
   $('#cart').addEventListener('click',event=>{
     const button=event.target.closest('[data-cart-remove]');if(!button)return;
     cart.splice(Number(button.dataset.cartRemove),1);renderCart();
   });
   $('#cancel-note').addEventListener('click',()=>$('#annotation-dialog').close());
   $('#note-form').addEventListener('submit',event=>{
     event.preventDefault();const note=event.target.elements.note.value.trim();
     if(note)notes.annotations[noteId]=note;else delete notes.annotations[noteId];
     saveNotes();$('#annotation-dialog').close();
     const card=Array.from(document.querySelectorAll('[data-product]')).find(x=>x.dataset.product===noteId);
     if(card){card.querySelector('[data-note]').textContent=note?'Modifier la note':'Annoter';
       card.querySelector('.note')?.remove();if(note){
         const p=document.createElement('p');p.className='note';p.textContent=note;card.querySelector('.review').append(p);}}
   });
   render();
 }
 init().catch(error=>{$('#count').textContent='Erreur de chargement : '+error.message;});
})();
