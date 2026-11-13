'use strict';
const projects=[
  {title:'Jeux de matières',image:'assets/realisations/realisations-mir-contemporain-brun-large.webp',style:'CONTEMPORAIN · CONTRASTE MINÉRAL',alt:'Maison contemporaine aux revêtements bruns, pierre claire et fenêtres noires',description:'Une composition de revêtements bruns, de surfaces minérales claires et de grandes ouvertures. Les détails de finition soulignent les volumes de cette réalisation MIR.'},
  {title:'Lignes contemporaines',image:'assets/realisations/realisations-mir-contrastes-large.webp',style:'CONTEMPORAIN · VOLUMES & CONTRASTES',alt:'Maison au toit incliné, parement pâle, panneaux noirs, pierre grise et revêtement brun',description:'Le toit incliné et les ouvertures horizontales structurent cette façade. Le parement pâle, les panneaux sombres et la pierre se répondent autour des fenêtres et du garage.'},
  {title:'Un classique réinventé',image:'assets/realisations/realisations-mir-classique-large.webp',style:'CLASSIQUE · RYTHME & LUMIÈRE',alt:'Maison à pignons revêtue de bardeaux gris, avec fenêtres et encadrements blancs',description:'Les pignons, les encadrements blancs et les grandes surfaces vitrées rythment cette résidence. Le revêtement gris et les détails clairs soulignent les proportions de la maison.'},
  {title:'Au cœur du centre-ville de Québec',image:'assets/realisations/realisations-mir-quebec-avec-voiture-large.avif',style:'PROJET URBAIN · BRIQUE ET MÉTAL',alt:'Immeuble en brique surmonté d’un revêtement métallique, photographié au crépuscule au centre-ville de Québec',description:'La brique et le revêtement métallique se rencontrent sur cette façade du centre-ville de Québec. Au crépuscule, la lumière révèle les volumes du bâtiment et les détails de finition.'}
];
const projectCards=[...document.querySelectorAll('.project[data-id]')];
let saved=new Set();try{saved=new Set(JSON.parse(localStorage.getItem('mir-inspirations')||'[]').filter(i=>Number.isInteger(i)&&projects[i]));}catch{}
let currentFilter='all',currentProject=0,visibleProjects=[],toastTimer;
const dialog=document.getElementById('project-dialog');
function toast(message){const t=document.getElementById('toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),2600);}
function renderProjects(){visibleProjects=[];projectCards.forEach(card=>{const show=currentFilter==='all'||(currentFilter==='saved'?saved.has(Number(card.dataset.id)):card.dataset.category===currentFilter);card.hidden=!show;if(show)visibleProjects.push(Number(card.dataset.id));});const visible=visibleProjects.length;document.querySelector('.project-grid').classList.toggle('filtered',currentFilter!=='all');document.getElementById('result-count').textContent=`${visible} réalisation${visible===1?'':'s'}`;document.getElementById('empty-state').hidden=visible!==0;document.getElementById('saved-count').textContent=saved.size;document.getElementById('clear-saved').hidden=saved.size===0;document.querySelectorAll('[data-save]').forEach(button=>{const id=Number(button.dataset.save),active=saved.has(id);button.setAttribute('aria-pressed',String(active));button.querySelector('span').textContent=active?'✓':'＋';button.setAttribute('aria-label',`${active?'Retirer':'Garder'} ${projects[id].title} ${active?'de':'dans'} ma sélection`);});}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{currentFilter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});renderProjects();}));
function persistSelection(){try{localStorage.setItem('mir-inspirations',JSON.stringify([...saved]));}catch{}}
document.querySelectorAll('[data-save]').forEach(button=>button.addEventListener('click',()=>{const id=Number(button.dataset.save);if(saved.has(id)){saved.delete(id);toast('Réalisation retirée de votre sélection.');}else{saved.add(id);toast('Réalisation gardée sur cet appareil.');}persistSelection();renderProjects();}));
document.getElementById('clear-saved').addEventListener('click',()=>{saved.clear();persistSelection();renderProjects();toast('Votre sélection a été vidée.');});
function showProject(id){currentProject=id;const p=projects[currentProject];for(const key of ['previous-project','next-project'])document.getElementById(key).disabled=visibleProjects.length<2;document.getElementById('dialog-title').textContent=p.title;document.getElementById('dialog-description').textContent=p.description;document.getElementById('dialog-style').textContent=p.style;const img=document.getElementById('dialog-image');img.src=p.image;img.alt=p.alt;document.getElementById('dialog-number').textContent=`${visibleProjects.indexOf(id)+1} / ${visibleProjects.length}`;if(!dialog.open){dialog.showModal();document.body.style.overflow='hidden';}dialog.scrollTop=0;}
document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>showProject(Number(button.dataset.project))));
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>document.body.style.overflow='');
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
function moveProject(step){
 const index=visibleProjects.indexOf(currentProject);
 showProject(visibleProjects[(index+step+visibleProjects.length)%visibleProjects.length]);
}
document.getElementById('previous-project').addEventListener('click',()=>moveProject(-1));
document.getElementById('next-project').addEventListener('click',()=>moveProject(1));
dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')moveProject(-1);if(event.key==='ArrowRight')moveProject(1);});
renderProjects();
