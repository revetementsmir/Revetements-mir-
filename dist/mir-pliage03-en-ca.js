/* Canadian English additions for the public Pliage 03 journey only.
 * Load after mir-client-en-ca.js and before mir-client-i18n.js.
 * The shared frozen dictionary, form values and business data stay untouched. */
(function(root){
  'use strict';
  const labels={
    'Votre pliage sur mesure':'Your custom metal trim',
    'Votre pliage':'Your custom',
    'sur mesure.':'metal trim.',
    'PLIAGE SUR MESURE':'CUSTOM METAL TRIM',
    'Commencez par un modèle ou dessinez votre propre moulure.':'Start with a model or draw your own trim.',
    'Modèle':'Model',
    'Mesures':'Dimensions',
    'Finition':'Finish',
    'Vérification':'Review',
    'Les étapes de votre pliage':'Your custom trim steps',
    '1 · Modèle':'1 · Model',
    '2 · Mesures':'2 · Dimensions',
    '3 · Finition':'3 · Finish',
    '4 · Vérification':'4 · Review',
    'Choisir un modèle':'Choose a model',
    'Dessiner ma moulure':'Draw my trim',
    'Entrer mes mesures':'Enter my dimensions',
    'Mesures et angles':'Dimensions and angles',
    'Chaque angle se règle séparément.':'Each angle can be adjusted separately.',
    'Angles individuels':'Individual angles',
    'Sélectionnez un angle sur le dessin.':'Select an angle on the drawing.',
    'Côté peint':'Painted side',
    'La ligne bleue indique le côté peint.':'The blue line marks the painted side.',
    'Vérifier mon pliage':'Review my trim',
    'Vérifiez vos choix et indiquez la quantité à ajouter au panier.':'Review your choices and enter the quantity to add to the cart.',
    'Reprendre mon pliage →':'Resume my trim →',
    'Voir mon panier ↗':'View my cart ↗',
    'Voir mon panier':'View my cart',
    'Ajouter un autre pliage':'Add another trim piece',
    'Dessiner un autre pliage':'Draw another trim piece',
    'Référence du produit':'Product reference',
    'Produit :':'Product:',
    'Référence produit :':'Product reference:',
    'Référence du produit :':'Product reference:',
    'Échantillon non disponible':'Sample unavailable',
    'Modifier les mesures':'Edit dimensions',
    'Modifier la finition':'Edit finish',
    'Fabricant et produit':'Manufacturer and product',
    'Pliage ajouté':'Trim piece added',
    'Pliage modifié':'Trim piece updated',
    'Votre pliage a été ajouté au panier.':'Your custom trim has been added to the cart.',
    'Les modifications de votre pliage sont enregistrées.':'Your trim changes have been saved.',
    'Toutes les couleurs documentées restent disponibles.':'All documented colours are available to select.',
    'Couleur à confirmer':'Colour to be confirmed',
    'Couleur à confirmer.':'Colour to be confirmed.',
    'Exemple illustré d’une moulure pliée, avec repères A, B et C':'Illustrated example of bent trim, with labels A, B and C',
    'Face colorée : Face 1 — côté indiqué par le liseré bleu':'Painted face: Face 1 — side marked by the blue line',
    'Face colorée : Face 2 — côté indiqué par le liseré bleu':'Painted face: Face 2 — side marked by the blue line',
    'Face colorée : Face 1 — côté indiqué par':'Painted face: Face 1 — side marked by',
    'Face colorée : Face 2 — côté indiqué par':'Painted face: Face 2 — side marked by',
    'Face 1 — côté indiqué par le liseré bleu':'Face 1 — side marked by the blue line',
    'Face 2 — côté indiqué par le liseré bleu':'Face 2 — side marked by the blue line',
    'côté indiqué par le liseré bleu':'side marked by the blue line',
    'le liseré bleu':'the blue line',
    'Choisissez votre modèle':'Choose your model',
    'Choisissez votre moulure':'Choose your trim',
    'Sélectionnez un modèle ci-dessous ou dessinez votre propre profil.':'Select a model below or draw your own profile.',
    'Sélectionnez un modèle ou dessinez une moulure.':'Select a model or draw a trim profile.',
    'Préparez votre moulure sur mesure.':'Prepare your custom trim.',
    'Pages de modèles':'Model pages',
    'Page précédente':'Previous page',
    'Page suivante':'Next page',
    'Pliage en L':'L-shaped bend',
    'Pliage en J':'J-shaped bend',
    'Pliage en Z':'Z-shaped bend',
    'Oméga':'Omega',
    'Profil personnalisé':'Custom profile',
    'Profil dessiné':'Drawn profile',
    'Moulure dessinée':'Drawn trim',
    'J à soffite · 12 pi':'Soffit J-channel · 12 ft',
    'Ailes de fenêtre':'Window trim',
    'Écoulement des eaux':'Water-diverting flashing',
    'Goutte d’eau — développé total 8 po':'Drip edge — 8 in. total developed width',
    'Beam / cache-poutre':'Beam wrap',
    'Cache-poutre · 5 côtés':'Beam wrap · 5 sides',
    'Colonne':'Column wrap',
    'L de transition verticale pour panneau':'Vertical panel transition trim',
    'Capage d’air climatisé':'Air-conditioner capping',
    'Ventilation — haut de mur et bas de fenêtre':'Ventilation trim — wall top and window sill',
    'L replié':'Hemmed L trim',
    'Beam avec replis':'Hemmed beam wrap',
    'Moulure solin brique':'Brick flashing',
    'Solin brique avec goutte':'Brick flashing with drip edge',
    'Coin architectural 90°':'90° architectural corner',
    'Coin architectural avec retours':'Architectural corner with returns',
    'Coin architectural avec J intégré':'Architectural corner with integrated J-channel',
    'Face':'Face',
    'Bas':'Bottom',
    'Retour écrasé':'Hem',
    'Repli':'Hem',
    'Grande aile verticale':'Long vertical flange',
    'Aile inférieure vers la droite':'Lower flange to the right',
    'Retour terminal':'End return',
    'Grand segment vertical':'Long vertical side',
    'Segment inférieur vers la gauche':'Lower side to the left',
    'Petit retour descendant':'Short downward return',
    'Grande remontée verticale':'Long vertical upstand',
    'Portée vers la gauche':'Span to the left',
    'Face descendante':'Downward face',
    'Retour vers la droite':'Return to the right',
    'Retour vers la gauche':'Return to the left',
    'Retour gauche':'Left return',
    'Retour droit':'Right return',
    'Côté gauche':'Left side',
    'Côté droit':'Right side',
    'Dessous':'Underside',
    'Dessus':'Top',
    'Face verticale':'Vertical face',
    'Aile vers la droite':'Flange to the right',
    'Double pli gauche':'Left double bend',
    'Double pli droit':'Right double bend',
    'Descente':'Drop',
    'Double pli remontant':'Upward double bend',
    'Repli gauche':'Left hem',
    'Repli droit':'Right hem',
    'Remontée arrière':'Back upstand',
    'Portée / assise':'Span / seat',
    'Descente avant':'Front drop',
    'Retour / goutte (si présent)':'Return / drip edge (if present)',
    'Face extérieure A':'Outer face A',
    'Face extérieure B':'Outer face B',
    'Profondeur du J':'J-channel depth',
    'Retour du J':'J-channel return',
    'Clouage':'Nailing flange',
    'Aile A':'Flange A',
    'Aile B':'Flange B',
    'Aile C':'Flange C',
    'Retour A':'Return A',
    'Retour B':'Return B',
    'Hauteur B':'Height B',
    'Base C':'Base C',
    'Aile supérieure droite':'Upper right flange',
    'Hauteur droite':'Right height',
    'Base':'Base',
    'Hauteur gauche':'Left height',
    'Aile supérieure gauche':'Upper left flange',
    'Patte gauche':'Left flange',
    'Patte droite':'Right flange',
    'Angles de votre modèle':'Angles of your model',
    'Repli 180° conservé du modèle':'180° hem preserved from the model',
    'Enregistré sur cet appareil':'Saved on this device',
    'Moulures : vendues en longueur de 120 po (10 pi).':'Trim: sold in 120 in. (10 ft) lengths.',
    'Cotes en millimètres.':'Dimensions in millimetres.',
    'Face colorée de la moulure':'Painted side of the trim',
    'Récapitulatif de la pièce':'Piece summary',
    'Modifier les mesures ↗':'Edit dimensions ↗',
    'Modifier la finition ↗':'Edit finish ↗',
    'Voir les pièces et le PDF':'View pieces and PDF',
    'Cliquez sur la grille pour placer le premier point.':'Click the grid to place the first point.',
    'Touchez la grille pour placer le premier point.':'Tap the grid to place the first point.',
    'Essayer un L en trois points':'Try an L shape with three points',
    'Saisir les points au clavier':'Enter points using the keyboard',
    'Coordonnées absolues en po : X vers la droite, Y vers le haut.':'Absolute coordinates in inches: X to the right, Y upward.',
    'Coordonnées absolues en mm : X vers la droite, Y vers le haut.':'Absolute coordinates in millimetres: X to the right, Y upward.',
    'Annuler le point':'Undo point',
    'Placez au moins trois points pour créer deux côtés.':'Place at least three points to create two sides.',
    'Ajoutez un côté ou terminez le dessin.':'Add a side or finish the drawing.',
    'Annulez le dernier point et réessayez.':'Undo the last point and try again.',
    'Tracez au moins deux côtés, puis cliquez sur « Suivant ».':'Draw at least two sides, then select “Next”.',
    'Suivant — terminer le dessin':'Next — finish the drawing',
    'Passer aux mesures':'Continue to dimensions',
    'Entrez deux coordonnées valides.':'Enter two valid coordinates.',
    'Entrez un angle intérieur supérieur à 0° et inférieur ou égal à 180°.':'Enter an inside angle greater than 0° and no greater than 180°.',
    'Entrez le code exact de votre couleur spéciale.':'Enter the exact code for your custom colour.',
    'Choisissez le fabricant et le produit pour consulter ses teintes.':'Choose the manufacturer and product to view its colours.',
    'Disponibilité sur ce profil à confirmer.':'Confirm availability for this profile.',
    'Disponibilité sur ce profil à confirmer. Écran indicatif.':'Confirm availability for this profile. Screen colours are indicative.',
    'Demande spéciale : faisabilité, teinte et disponibilité à confirmer.':'Special request: confirm feasibility, colour and availability.',
    'Ouvrir un repli du modèle':'Open a model hem',
    'Repli à modifier':'Hem to edit',
    'Nouvel angle intérieur (°)':'New inside angle (°)',
    'Conserver le repli':'Keep the hem',
    'Appliquer l’angle ouvert':'Apply the open angle',
    'Le repli à 180° est conservé tant que vous ne choisissez pas explicitement un angle ouvert. La modification concerne cette pièce.':'The 180° hem is preserved until you explicitly choose an open angle. This change applies to this piece.',
    'Mesure verrouillée par le modèle MIR':'Dimension locked by the MIR model',
    'À choisir':'To select',
    'À définir avec l’atelier':'To confirm with the workshop',
    'Référence demandée':'Requested reference',
    'Ex. Nuancier à préciser':'E.g., colour chart to confirm',
    'ex. 2¼':'e.g., 2¼',
    'ex. 57,15':'e.g., 57.15',
    'po':'in.'
  };
  const modelNames=['Pliage en L','Pliage en J','Pliage en Z','Cache-poutre · 5 côtés','Oméga','Profil personnalisé','Profil dessiné','Moulure dessinée','J à soffite · 12 pi','Fascia','Ailes de fenêtre','Écoulement des eaux','Goutte d’eau — développé total 8 po','Sill Trim','Beam / cache-poutre','Colonne','L de transition verticale pour panneau','Capage d’air climatisé','Ventilation — haut de mur et bas de fenêtre','L replié','Beam avec replis','Moulure solin brique','Solin brique avec goutte','Coin architectural 90°','Coin architectural avec retours','Coin architectural avec J intégré'];
  for(const name of modelNames){
    const translated=labels[name]||name;
    for(const [fr,en]of [['cotes de la pièce finie','finished-piece dimensions'],['cotes de la pièce','piece dimensions'],['dimensions de la pièce finie','finished-piece dimensions'],['proportions du modèle, cotes à saisir','model proportions, dimensions to enter'],['proportions illustratives, sans cotes de fabrication','illustrative proportions, no fabrication dimensions'],['illustration du modèle','model illustration']])labels[name+' — '+fr]=translated+' — '+en;
    labels['Volume schématique de '+name]='Schematic volume of '+translated;
  }
  // Exact generated UI labels only. Letters, measurements, user notes and model
  // records stay unchanged; these are presentation keys, never business values.
  const sideNames={
    A:['Face','Grande aile verticale','Grand segment vertical','Grande remontée verticale','Face descendante','Retour gauche','Segment 1','Face verticale','Aile vers la droite','Repli gauche','Remontée arrière','Face A','Retour A','Face extérieure A','Aile A','Aile supérieure droite','Patte gauche'],
    B:['Bas','Aile inférieure vers la droite','Segment inférieur vers la gauche','Portée vers la gauche','Retour vers la droite','Côté gauche','Segment 2','Aile vers la droite','Double pli gauche','Descente','Retour gauche','Portée / assise','Face B','Face A','Face extérieure B','Aile B','Hauteur B','Hauteur droite','Hauteur gauche'],
    C:['Retour écrasé','Retour terminal','Petit retour descendant','Retour vers la gauche','Dessous','Segment 3','Côté gauche','Double pli remontant','Repli','Descente avant','Face B','Profondeur du J','Base C','Aile C','Base','Dessus'],
    D:['Côté droit','Segment 4','Dessus','Retour vers la gauche','Dessous','Retour / goutte (si présent)','Retour B','Retour du J','Hauteur gauche','Hauteur droite'],
    E:['Retour droit','Segment 5','Côté droit','Clouage','Aile supérieure gauche','Patte droite'],
    F:['Double pli droit','Retour droit'],G:['Retour droit','Repli droit']
  };
  for(let i=0;i<26;i++){
    const letter=String.fromCharCode(65+i);
    labels['Côté '+letter]='Side '+letter;
    labels['Modifier la cote '+letter]='Edit dimension '+letter;
    for(const name of ['mesure',...(sideNames[letter]||[])])for(const unit of ['po','mm']){
      labels['Côté '+letter+' — '+name+' ('+unit+')']='Side '+letter+' — '+(labels[name]||({mesure:'dimension'})[name]||name)+' ('+(unit==='po'?'in.':'mm')+')';
    }
    if(i<25){
      const pair=letter+'–'+String.fromCharCode(66+i);
      labels['Diminuer l’angle '+pair]='Decrease angle '+pair;
      labels['Augmenter l’angle '+pair]='Increase angle '+pair;
      labels['Angle intérieur '+pair+' en degrés']='Inside angle '+pair+' in degrees';
      labels['Retour écrasé '+pair+' en degrés']='Hem '+pair+' in degrees';
    }
  }
  for(const height of [6,8,10,12,14])labels[height+' po de haut']=height+' in. high';
  const dictionary=Object.freeze(labels);
  function isPublicClient(win){
    if(!win?.location)return false;
    try{
      if(win.self!==win.top)return false;
      const file=String(win.location.pathname||'').split('/').pop();
      const params=new URLSearchParams(win.location.search||'');
      if(params.get('source')==='store')return false;
      return file==='pliage.html'||file==='selection.html'||(file==='production.html'&&params.get('mode')==='client');
    }catch{return false;}
  }
  if(typeof module==='object'&&module.exports)module.exports=Object.freeze({dictionary,isPublicClient});
  if(!isPublicClient(root))return;
  const shared=root.MIRClientEnglish;
  if(!shared||typeof shared!=='object'||Array.isArray(shared))return;
  root.MIRClientEnglish=Object.freeze({...shared,...dictionary});
})(typeof window==='object'?window:null);
