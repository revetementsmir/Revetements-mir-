/* Missing presentation labels in three client Studio dialogs. No business data writes. */
(function () {
  'use strict';
  const query = new URLSearchParams(location.search);
  if (location.pathname.split('/').pop() !== 'plan.html' || query.has('embed') || query.get('context') === 'admin' || query.get('mode') === 'atelier') return;
  const roots = '#mir-pdf-import,#volume-dialog,#material-dialog';
  const pairs = [
    ['VOTRE MAISON, VOTRE PROJET','YOUR HOME, YOUR PROJECT'],
    ['Importez votre plan.','Import your plans.'],
    ['Le Studio repère le solage, les étages et les élévations pour préparer votre maquette.','The Studio identifies the foundation, floor plans and elevations to prepare your model.'],
    ['Fermer ×','Close ×'],['Fermer l’import du PDF','Close PDF import'],['Étapes de l’import','Import steps'],
    ['Votre PDF','Your PDF'],['Analyse automatique','Automatic analysis'],['Votre studio','Your studio'],
    ['Choisir mon PDF','Choose my PDF'],['Le PDF et son analyse restent sur cet appareil.','The PDF and its analysis stay on this device.'],
    ['Analyse du PDF','PDF analysis'],['Vues repérées','Detected views'],['Ouvrir mon projet →','Open my project →'],
    ['Choisissez le PDF de votre projet.','Choose your project PDF.'],['Les vues détectées apparaîtront ici.','Detected views will appear here.'],
    ['Vérification du fichier…','Checking the file…'],['Choisissez un fichier PDF.','Choose a PDF file.'],
    ['Ce fichier est vide ou incomplet.','This file is empty or incomplete.'],
    ['Le contenu de ce fichier ne correspond pas à un PDF.','The contents of this file do not match a PDF.'],
    ['Analyse terminée. Votre dossier est prêt.','Analysis complete. Your project file is ready.'],
    ['Analyse terminée. Aucune vue utilisable repérée.','Analysis complete. No usable views were detected.'],
    ['Le PDF doit contenir des vues dont les titres sont lisibles, par exemple « Plan des fondations », « Plan du rez-de-chaussée » ou « Élévation avant ».','The PDF must contain views with readable titles, such as “Foundation plan”, “Ground-floor plan” or “Front elevation”.'],
    ['Le PDF n’a pas été importé.','The PDF was not imported.'],
    ['Ce PDF est protégé par un mot de passe. Importez une copie déverrouillée.','This PDF is password-protected. Import an unlocked copy.'],
    ['Ce PDF semble endommagé. Essayez une nouvelle exportation.','This PDF appears to be damaged. Try exporting it again.'],
    ['L’espace disponible sur cet appareil est insuffisant pour conserver ce PDF.','There is not enough space on this device to save this PDF.'],
    ['La lecture de ce PDF n’a pas réussi. Réessayez ou importez une nouvelle exportation de votre plan.','This PDF could not be read. Try again or import a newly exported copy of your plans.'],
    ['Un outil de lecture du PDF n’a pas chargé. Rechargez la page puis réessayez.','A PDF reading tool did not load. Reload the page and try again.'],
    ['Enregistrement du dossier…','Saving the project file…'],
    ['Votre projet précédent est conservé. Réessayez l’enregistrement.','Your previous project has been kept. Try saving again.'],
    ['Cotes principales repérées. La maquette 3D s’ouvrira automatiquement.','Main dimensions detected. The 3D model will open automatically.'],
    ['Des cotes se contredisent.','Some dimensions conflict.'],
    ['Certaines dimensions sont estimées à partir du dessin.','Some dimensions are estimated from the drawing.'],
    ['Certaines feuilles n’ont pas pu être lues.','Some sheets could not be read.'],
    ['Aucune élévation orientée avant, arrière, gauche ou droite n’a été reconnue.','No front, rear, left or right elevation was recognized.'],
    ['Le volume de votre maison','Your home’s volume'],
    ['Les cotes du PDF sont utilisées lorsqu’elles sont reliées au dessin. Une élévation seule ne montre pas la profondeur : complétez uniquement les dimensions manquantes ou incertaines. Ces réglages modifient le volume 3D; ils ne changent pas l’échelle des élévations.','PDF dimensions are used when they can be linked to the drawing. An elevation alone does not show depth: complete only missing or uncertain dimensions. These settings change the 3D volume; they do not change the scale of the elevations.'],
    ['Le retrait reste identique au rez-de-chaussée et à l’étage. Le porche conserve sa hauteur propre.','The recess remains the same on the ground and upper floors. The porch keeps its own height.'],
    ['Forme de toiture','Roof shape'],['Choisir la forme','Choose a shape'],['Deux pignons avant — étude MIR','Two front gables — MIR study'],['Deux versants','Gable roof'],['Quatre versants','Hip roof'],['Toit plat / volume provisoire','Flat roof / provisional volume'],
    ['Largeur totale (pi)','Overall width (ft)'],['Profondeur totale (pi)','Overall depth (ft)'],['Hauteur du mur (pi)','Wall height (ft)'],['Montée du toit (pi)','Roof rise (ft)'],['Largeur du retrait (pi)','Recess width (ft)'],['Profondeur du retrait (pi)','Recess depth (ft)'],['Avancée du porche (pi)','Porch projection (ft)'],
    ['Afficher le balcon / plancher du porche dans la vue 3D (emplacement à vérifier sur le PDF)','Show the balcony / porch floor in the 3D view (verify its location on the PDF)'],
    ['Paysagement 3D','3D landscaping'],['Sans aménagement ajouté','No added landscaping'],['Commercial illustratif : stationnement, asphalte, trottoirs, plantations','Illustrative commercial setting: parking, asphalt, sidewalks and planting'],
    ['Afficher les marches de béton indicatives (à valider sur le PDF)','Show illustrative concrete steps (verify against the PDF)'],
    ['Nombre de marches à confirmer','Number of steps to confirm'],['Largeur des marches (pi)','Step width (ft)'],['Giron (pouces)','Tread depth (in.)'],['Décalage gauche/droite depuis le centre (pi)','Left/right offset from centre (ft)'],
    ['Dimensions visuelles provisoires.','Provisional visual dimensions.'],['La position, les contremarches et le nombre restent à confirmer sur les plans.','The position, risers and number of steps must still be confirmed against the plans.'],
    ['Appliquer au volume 3D','Apply to 3D volume'],
    ['Précisez la forme du toit, les dimensions positives du bâtiment et la montée du toit. Le retrait doit tenir dans la largeur et la profondeur du bâtiment; chaque valeur doit rester entre 0 et 1 000 pi.','Specify the roof shape, positive building dimensions and roof rise. The recess must fit within the building’s width and depth; each value must be between 0 and 1,000 ft.'],
    ['Feuilles du PDF utilisées pour le volume','PDF sheets used for the volume'],['Vue de référence','Reference view'],['Choisir une vue','Choose a view'],
    ['Fermer la fiche matériau','Close material details'],['Consulter la page officielle ↗','View the official page ↗'],
    ['Format & application','Format and application'],['Famille','Category'],['Code fabricant','Manufacturer code'],['Unité','Unit'],['Exposition indiquée','Listed exposure'],['Ventilation','Ventilation'],
    ['Diamètre (#)','Diameter (#)'],['Empreinte','Drive'],['Longueur (pi)','Length (ft)'],['Longueur (po)','Length (in.)'],['Longueur (mm)','Length (mm)'],['Longueur (m)','Length (m)'],['Largeur (po)','Width (in.)'],['Largeur (mm)','Width (mm)'],['Épaisseur (po)','Thickness (in.)'],['Épaisseur (mm)','Thickness (mm)'],['Hauteur (po)','Height (in.)'],['Longueurs (pi)','Lengths (ft)'],['Largeur nominale (po)','Nominal width (in.)'],['Largeur réelle (po)','Actual width (in.)'],['Largeur du profil (mm)','Profile width (mm)'],['Largeur utile (mm)','Coverage width (mm)'],
    ['La disponibilité, le prix, l’unité de vente MIR et les conditions du chantier restent à confirmer.','Availability, price, MIR sales unit and job-site conditions remain to be confirmed.'],
    ['Documentation du matériau','Material documentation'],['Données techniques','Technical data'],['Installation','Installation'],['Garantie','Warranty'],['Entretien','Maintenance'],['Sécurité','Safety'],['Couleurs','Colours'],['Centre de ressources','Resource centre'],['Produit','Product'],['Gamme / système','Collection / system'],
    ['Source officielle consultée.','Official source reviewed.'],['Lien officiel repéré; ouverture du document à vérifier.','Official link identified; document access still needs to be verified.'],
    ['Aucun document disponible pour cette référence. Consultez la source officielle ou demandez la fiche à MIR.','No document is available for this reference. Consult the official source or request the data sheet from MIR.'],
    ['Palette & finition','Palette and finish'],
    ['Finitions issues des ressources du fabricant. Association exacte au profil et disponibilité locale à confirmer; une image de nuancier ne constitue pas une valeur colorimétrique.','Finishes are drawn from manufacturer resources. Exact profile compatibility and local availability must be confirmed; a colour-chart image is not a colour measurement.'],
    ['Le nuancier exact de cette référence reste à associer. Le dessin conserve un aperçu neutre tant qu’aucune couleur numérique documentée n’est associée.','The exact colour chart for this reference still needs to be linked. The drawing keeps a neutral preview until a documented digital colour is linked.'],
    ['Les couleurs à l’écran ne remplacent pas un échantillon physique.','On-screen colours do not replace a physical sample.'],['Points à vérifier','Items to verify']
  ];
  const exact = new Map(pairs), reverse = new Map(pairs.map(([fr,en])=>[en,fr]));
  const values = new WeakMap();
  const dimensions = new Map([['largeur','width'],['profondeur','depth'],['hauteur des murs','wall height'],['montée du toit','roof rise'],['forme de toiture','roof shape']]);
  const allowed = [
    '#mir-pdf-import .mir-pdf-head p','#mir-pdf-title','#mir-pdf-close','#mir-pdf-import .mir-pdf-steps span','#mir-pdf-import .mir-pdf-upload strong','#mir-pdf-import .mir-pdf-upload span','#mir-pdf-import .mir-pdf-upload>p','#mir-pdf-status','#mir-pdf-error','#mir-pdf-volume-note','#mir-pdf-import .mir-pdf-bottom h3','#mir-pdf-assigned>p','#mir-pdf-final',
    '#volume-dialog .dialog-top h2','#volume-dialog .close-dialog','#volume-dialog>p','#volume-dialog label','#roof-style option','#mir-site-style option','#apply-volume','#volume-error','#volume-dialog .volume-sheets summary','#volume-sheet option[value=""]',
    '#material-dialog .close-dialog','#material-dialog .doc-intro>a','#material-dialog .doc-section>h3','#material-dialog dt','#material-dialog .doc-section>p','#material-dialog .document-badge','#material-dialog .document-link>span:last-child'
  ].join(',');
  const sourceNames = '#material-dialog #doc-brand,#material-dialog #doc-title,#material-dialog .doc-colors,#material-dialog .document-link>strong,#volume-sheet option:not([value=""]),#mir-pdf-assigned b';
  function protectNames(){document.querySelectorAll(sourceNames).forEach(el=>{if(!el.hasAttribute('data-mir-source-color'))el.setAttribute('data-mir-source-color','');});}
  function translate(source, owner) {
    const clean=source.trim();if(exact.has(clean))return source.replace(clean,exact.get(clean));
    let m;
    if(owner.closest('#mir-pdf-import')){
      if((m=/^Fichier de (\d+) Mo maximum$/.exec(clean)))return source.replace(clean,'Maximum file size: '+m[1]+' MB');
      if((m=/^Ce PDF dépasse (\d+) Mo\. Exportez une copie contenant seulement les feuilles utiles\.$/.exec(clean)))return 'This PDF exceeds '+m[1]+' MB. Export a copy containing only the sheets you need.';
      if((m=/^Analyse des feuilles · (\d+) sur (\d+)…$/.exec(clean)))return 'Analysing sheets · '+m[1]+' of '+m[2]+'…';
      if((m=/^Préparation des vues · feuille (\d+) sur (\d+)…$/.exec(clean)))return 'Preparing views · sheet '+m[1]+' of '+m[2]+'…';
    }
    if(owner.id==='mir-pdf-volume-note'){
      let result=source.replace(/À compléter dans Volume & retours : ([^.]+)\./g,(full,list)=>{const names=list.split(', ');return names.every(name=>dimensions.has(name))?'Complete in Volume & recesses: '+names.map(name=>dimensions.get(name)).join(', ')+'.':full;});
      result=result.replace(/(\d+) escalier\(s\) ou groupe\(s\) de marches repérés par pixels et cotes, à valider dans le Studio\./g,'$1 staircase(s) or group(s) of steps detected from pixels and dimensions; verify in the Studio.');
      for(const [fr,en] of pairs.filter(([fr])=>fr.endsWith('.')))result=result.split(fr).join(en);
      return result;
    }
    if(owner.closest('#volume-dialog')&&owner.matches('p.small-note')){
      let result=source.replace(/Largeur et giron mesurés sur les pixels calibrés \(feuille (\d+)\)\./g,'Width and tread depth measured from calibrated pixels (sheet $1).');
      for(const fr of ['Dimensions visuelles provisoires.','La position, les contremarches et le nombre restent à confirmer sur les plans.'])result=result.split(fr).join(exact.get(fr));return result;
    }
    if(owner.matches('.document-badge'))return source.split(' · ').map(part=>exact.get(part)||part).join(' · ');
    if(owner.matches('.document-link>span:last-child'))for(const fr of ['Source officielle consultée.','Lien officiel repéré; ouverture du document à vérifier.'])if(source.startsWith(fr))return exact.get(fr)+source.slice(fr.length);
    if(owner.matches('.doc-missing')&&(m=/^À compléter : (données techniques|installation|données techniques, installation) pour cette référence exacte\.$/.exec(clean)))return 'Still needed: '+m[1].replace('données techniques','technical data')+' for this exact reference.';
    return source;
  }
  function localize(node,owner,en,attribute){
    const now=attribute?node.getAttribute(attribute):node.nodeValue;if(!now?.trim())return;
    const original=()=>now.replace(now.trim(),reverse.get(now.trim())||now.trim());
    let saved=values.get(node);if(attribute){saved=saved||{};values.set(node,saved);saved=saved[attribute]||(saved[attribute]={source:original(),last:now});}else if(!saved){saved={source:original(),last:now};values.set(node,saved);}
    if(now!==saved.last){saved.source=now.replace(now.trim(),reverse.get(now.trim())||now.trim());saved.last=now;}
    const next=en?translate(saved.source,owner):saved.source;
    if(next!==now){saved.last=next;if(attribute)node.setAttribute(attribute,next);else node.nodeValue=next;}
  }
  let observer,queued=false;
  function observe(){observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','open']});}
  function render(){
    queued=false;observer.disconnect();
    try{
      protectNames();const en=(window.MIRClientLocale?.getLocale?.()||document.documentElement.lang)==='en-CA';
      document.querySelectorAll(allowed).forEach(el=>{
        if(!el.closest(roots)||el.closest('[data-mir-source-color],[data-mir-user-content]'))return;
        const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;
        while((node=walker.nextNode()))if(!node.parentElement.closest('input,textarea,select,[data-mir-source-color],[data-mir-user-content]')||node.parentElement===el&&el.tagName==='OPTION')localize(node,el,en);
      });
      document.querySelectorAll('#mir-pdf-import [aria-label],#volume-dialog .close-dialog,#material-dialog .close-dialog').forEach(el=>{if(el.hasAttribute('aria-label'))localize(el,el,en,'aria-label');});
    }finally{observe();}
  }
  function schedule(){if(!queued){queued=true;queueMicrotask(render);}}
  function start(){
    observer=new MutationObserver(records=>{
      if(!records.some(record=>record.target.nodeType===1?record.target.closest(roots)||[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches(roots)||node.querySelector(roots))):record.target.parentElement?.closest(roots)))return;
      protectNames();schedule();
    });
    render();window.addEventListener('mir:client-locale-changed',schedule);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
