/* Curated Canadian English UI strings. Business IDs, personal inputs and original
 * manufacturer colours are intentionally not altered. Exact source matches only. */
(function(root){
'use strict';
const entries = [
["Vis MAC Métal — 1½ po · boîte de 500","MAC Métal screws — 1½ in. · box of 500"],
["Vis de 1½ po pour revêtement MAC Métal architectural, boîte de 500. Longueur confirmée par MIR. Référence détaillant 1790291; prix et disponibilité MIR sur demande.","1½ in. screws for MAC Métal architectural siding, box of 500. Length confirmed by MIR. Retailer reference 1790291; MIR pricing and availability on request."],
["1½ po — confirmée par MIR","1½ in. — confirmed by MIR"],
["Calibre et protection à confirmer avec le fournisseur.","Gauge and coating to be confirmed with the supplier."],
["Longueur confirmée par MIR : 1½ po. La différence de titre du détaillant est conservée uniquement dans le dossier de vérification.","Length confirmed by MIR: 1½ in. The retailer title discrepancy is retained only in the verification record."],
["Vis pour revêtement MAC — boîte de 500","Screws for MAC siding — box of 500"],
["Vis pour revêtement MAC Métal architectural, boîte de 500. Référence détaillant 1790291. La longueur publiée est de 1½ po; une version du titre indique 1⅛ po. Longueur exacte à confirmer avec MIR.","Screws for MAC Métal architectural siding, box of 500. Retailer reference 1790291. The published length is 1½ in.; one version of the title states 1⅛ in. Confirm the exact length with MIR."],
["Longueur exacte et photo de cette référence à confirmer avant sélection.","Confirm the exact length and photo for this reference before selection."],
["boîte de 500 vis","box of 500 screws"],
["500 vis par boîte","500 screws per box"],
["Référence détaillant","Retailer reference"],
["Longueur publiée","Published length"],
["1½ po dans les spécifications; 1⅛ po dans une version du titre — à confirmer","1½ in. in the specifications; 1⅛ in. in one version of the title — to be confirmed"],
["Référence fournie par MIR chez Aluminium B. Bouchard. Le code 1790291 est une référence détaillant, pas un SKU MIR.","Reference supplied by MIR at Aluminium B. Bouchard. Code 1790291 is a retailer reference, not a MIR SKU."],
["Le prix et le stock du détaillant ne constituent pas le prix ou le stock MIR.","The retailer's pricing and stock do not represent MIR pricing or stock."],
["Longueur exacte, calibre et protection à confirmer.","Exact length, gauge and coating to be confirmed."],
["Photo originale du produit à intégrer.","Original product photo to be added."],
["Ajout indisponible · fiche à compléter","Unavailable to add · details pending"],
["Référence exacte à confirmer avant sélection","Confirm the exact reference before selecting"],
["Photo non disponible · visuel de remplacement","Photo unavailable · placeholder image"],
["Quantités entières. kit — référence Canada, teinte et unité MIR à confirmer.","Whole quantities only. Kit — Canadian reference, colour and MIR sales unit to be confirmed."],
["Quantités entières. À confirmer.","Whole quantities only. To be confirmed."],
["boîtes","boxes"],
["À confirmer →","To confirm →"],
["Visuel de gamme. La couleur choisie est représentée dans le nuancier.","Product range image. The selected colour is shown in the colour chart."],
["Visuel de gamme · couleur au nuancier","Product range image · colour in the chart"],
["Échantillon de couleur du nuancier; le contenant photographié ne change pas de couleur.","Colour chart sample; the photographed container does not change colour."],
["Kit de retouche pour parements et moulures James Hardie ColorPlus. Boîte documentée : Midnight Black 4960831 / Blackwater 4100703. Prix et disponibilité MIR à confirmer.","Touch-up kit for James Hardie ColorPlus siding and trim. Documented box: Midnight Black 4960831 / Blackwater 4100703. MIR pricing and availability to be confirmed."],
["Étiquette fournie : Midnight Black 4960831 / Blackwater 4100703. Même kit de retouche; prix et disponibilité MIR à confirmer. Échantillon de couleur du nuancier; le contenant photographié ne change pas de couleur.","Supplied label: Midnight Black 4960831 / Blackwater 4100703. The same touch-up kit; MIR pricing and availability to be confirmed. Colour chart sample; the photographed container does not change colour."],
["Vis pour revêtement MAC — référence à préciser","Screws for MAC siding — reference to be confirmed"],
["Vis pour revêtement MAC, selon la demande MIR. La photo montre une tête à empreinte carrée. Longueur, calibre, protection et quantité par emballage restent à préciser.","Screws for MAC siding, as requested by MIR. The photo shows a square-drive head. Length, gauge, coating and package quantity still need to be confirmed."],
["Longueur, calibre, référence fournisseur et conditionnement à préciser avant sélection.","Confirm the length, gauge, supplier reference and packaging before selection."],
["Utilisation indiquée par MIR : « vis pour mac ». Le fabricant de la vis et la compatibilité exacte ne sont pas encore documentés.","Use identified by MIR: “screws for MAC.” The screw manufacturer and exact compatibility have not yet been documented."],
["Ne pas substituer une vis Light Trim Phillips/Torx ni attribuer une référence Kaycan à partir de cette photo.","Do not substitute a Light Trim Phillips/Torx screw or assign a Kaycan reference based on this photo."],
["Longueur, calibre, protection, fournisseur et quantité par emballage à préciser.","Length, gauge, coating, supplier and package quantity need to be confirmed."],
["Prix et stock MIR à confirmer.","MIR pricing and stock to be confirmed."],
["Photo originale transmise dans le message à intégrer.","The original photo provided in the message still needs to be added."],
["Étiquette fournie : Midnight Black 4960831 / Blackwater 4100703. Même kit de retouche; prix et disponibilité MIR à confirmer.","Supplied label: Midnight Black 4960831 / Blackwater 4100703. The same touch-up kit; MIR pricing and availability to be confirmed."],
["Photo transmise par MIR le 17 novembre 2026 : Midnight Black 4960831 et Blackwater 4100703 figurent sur le même kit LLA0531, UPC 856296003436. Ces codes ne sont pas un SKU MIR.","Photo provided by MIR on November 17, 2026: Midnight Black 4960831 and Blackwater 4100703 appear on the same kit, LLA0531, UPC 856296003436. These codes are not a MIR SKU."],
["Teinte documentée","Documented colour"],
["Midnight Black 4960831 / Blackwater 4100703 — même kit","Midnight Black 4960831 / Blackwater 4100703 — same kit"],
["Code sur la boîte","Code on the box"],
["UPC de la boîte","Box UPC"],
["Prix, disponibilité et conditionnement de vente MIR à confirmer.","MIR pricing, availability and sales packaging to be confirmed."],
["Photo originale de la boîte à intégrer; le visuel actuel représente la gamme.","The original box photo still needs to be added; the current image represents the product range."],
["Prix, disponibilité et conditionnement de vente MIR à confirmer; photo de cette référence à intégrer.","MIR pricing, availability and sales packaging to be confirmed; the photo for this reference still needs to be added."],
['Accueil','Home'],['Boutique','Shop'],['Revêtements','Siding'],['Réalisations','Projects'],
['Pliage','Custom bending'],['Pliage sur mesure','Custom metal bending'],['Studio','Studio'],
['Studio 3D','3D Studio'],['Nous joindre','Contact us'],['Contact','Contact'],['Compte','Account'],
['Mon compte','My account'],['Connexion','Sign in'],['Connexion / Mon compte','Sign in / My account'],
['Estimation','Estimate'],['Demander une estimation','Request an estimate'],['Panier','Cart'],
['Commandes','Orders'],['Aide','Help'],['Accueil MIR','MIR home'],
['Navigation principale','Main navigation'],['Navigation mobile principale','Main mobile navigation'],
['Ouvrir les liens utiles','Open more links'],['Fermer les liens utiles','Close more links'],
['Plus','More'],['Aller au contenu','Skip to content'],['Aller au formulaire','Skip to form'],
['Aller au configurateur','Skip to configurator'],['Aller au dossier','Skip to project file'],
['Les Revêtements MIR, accueil','Les Revêtements MIR, home'],['Les Revêtements MIR — accueil','Les Revêtements MIR — home'],
['Revêtements extérieurs · Québec','Exterior siding · Québec City'],
['Des façades qui ont','Exteriors with'],['du',''],['caractère.','character.'],
['Revêtements extérieurs, moulures sur mesure et finitions soignées pour vos projets, des premières idées jusqu’aux derniers détails.','Exterior siding, custom metal trim and carefully crafted finishing touches, from your first ideas to the final details.'],
["Revêtements extérieurs, moulures sur mesure et finitions soignées pour vos projets, des premières idées jusqu'aux derniers détails.",'Exterior siding, custom metal trim and carefully crafted finishing touches, from your first ideas to the final details.'],
['Voir nos réalisations','See our projects'],['Voir notre boutique','Explore our shop'],
['Revêtements extérieurs','Exterior siding'],['Un large choix de matériaux, de styles et de couleurs pour votre projet.','A wide selection of materials, styles and colours for your project.'],
['Découvrir','Explore'],['Moulures et pliage sur mesure','Custom metal trim and bending'],
['Fascias, solins, coins, colonnes et détails architecturaux adaptés à vos dimensions.','Fascia, flashing, corners, columns and architectural details made to your dimensions.'],
['En savoir plus','Learn more'],['Imaginez votre façade en 3D','Picture your exterior in 3D'],
['Visualisez différents revêtements et travaillez avec votre propre plan PDF.','Explore different siding options using your own PDF plans.'],
['Accéder au studio 3D','Open the 3D Studio'],['Découvrez nos expertises','Explore our expertise'],
['Votre maison. Les bons matériaux. Les bons détails.','Your home. The right materials. The right details.'],
['Prix et disponibilité confirmés par MIR avant commande.','MIR confirms pricing and availability before any order.'],
['La boutique des matériaux — MIR','Materials shop — MIR'],['Boutique de','Siding'],['revêtements.','shop.'],
['Trouvez un matériau par produit, fabricant ou couleur.','Find materials by product, manufacturer or colour.'],
['Rechercher un produit','Search for a product'],['Explorer par catégorie','Browse by category'],
['Collections par fabricant','Collections by manufacturer'],['Filtres','Filters'],
['Fabricant','Manufacturer'],['Tous les fabricants','All manufacturers'],
['Famille','Family'],['Toutes les matières','All materials'],['Type de produit','Product type'],
['Tous les types','All types'],['Réinitialiser','Reset'],
['Prix et disponibilité sur demande','Pricing and availability on request'],
['Voir toutes les références, classées par fabricant','See all references, organized by manufacturer'],
['Aucun résultat pour cette sélection. Essayez un autre fabricant ou retirez un filtre.','No matches for these filters. Try another manufacturer or remove a filter.'],
['BESOIN DE SUR MESURE?','NEED CUSTOM WORK?'],['Une pièce.','One piece.'],
['Vos dimensions.','Your dimensions.'],
['Choisissez un panneau architectural ou un profil de pliage; votre dessin accompagne la demande.','Choose an architectural panel or custom bent profile. Your drawing stays with your request.'],
['PANNEAUX ARCHITECTURAUX','ARCHITECTURAL PANELS'],['Forme, dimensions','Shape, dimensions'],
['et couleur sur mesure.','and custom colour.'],['Configurer un panneau ↗','Configure a panel ↗'],
['PROFILS DE PLIAGE','BENT METAL PROFILES'],['Chaque côté.','Every side.'],['Chaque angle.','Every angle.'],
['Configurer un profil ↗','Configure a profile ↗'],
['Les matériaux par fabricant — MIR','Materials by manufacturer — MIR'],
['Le bon profil.','The right profile.'],['La bonne','The right'],['couleur.','colour.'],
['Partez d’un fabricant. Comparez ses gammes, leurs dimensions et leurs finis, puis retrouvez les couleurs et les documents associés à chaque référence.','Start with a manufacturer. Compare product lines, sizes and finishes, then view the colours and documents for each reference.'],
['Les fabricants','Manufacturers'],['Un pliage à vos mesures','Custom bending to your measurements'],
['LES GAMMES','PRODUCT LINES'],['Chargement…','Loading…'],['Chargement...','Loading...'],
['Rechercher dans ce fabricant','Search this manufacturer'],['Usage','Application'],
['Tous les usages','All applications'],['Soffites','Soffit'],['Fascias','Fascia'],
['Contours et bandeaux','Trims and bands'],['Pliage et aluminium','Metal bending and aluminum'],
['Fixations et accessoires','Fasteners and accessories'],
['Aucune référence ne correspond à cette recherche. Essayez un autre mot ou un autre usage.','No references match your search. Try another term or application.'],
['UN CHOIX BIEN DOCUMENTÉ','WELL-DOCUMENTED OPTIONS'],['Une référence, ses détails.','Each reference, its details.'],
['Les couleurs portent le nom du fabricant. L’affichage à l’écran reste indicatif : un échantillon physique confirme le rendu. Les disponibilités, finis, prix et unités de vente MIR seront confirmés avant la commande.','Colour names come from the manufacturer. Screen colours are only indicative; confirm the finish with a physical sample. MIR will confirm availability, finishes, prices and sales units before ordering.'],
['Passer au studio','Open the Studio'],['← Accueil','← Home'],['Pliage sur mesure ↗','Custom bending ↗'],
['Voir notre boutique ↗','Explore our shop ↗'],['Fermer ×','Close ×'],['Fermer la fiche matériau','Close material details'],
['Fiche matériau — MIR','Material details — MIR'],['← Retour aux résultats','← Back to results'],
['Chargement de la référence…','Loading the reference…'],
['Détails techniques et documents','Technical details and documents'],
['À DÉCOUVRIR AUSSI','MORE TO EXPLORE'],['Dans le même univers.','Explore similar options.'],
['Panier de matériaux — MIR','Materials cart — MIR'],
['← Continuer dans la boutique','← Continue shopping'],
['VOTRE SÉLECTION BOUTIQUE','YOUR SHOP SELECTION'],['Mon','My'],['panier.','cart.'],
['Votre sélection reste accessible sans compte.','Your selection remains available without an account.'],
['Faire confirmer ma sélection','Request confirmation of my selection'],
['MIR confirme le prix, la disponibilité et la livraison avant toute commande.','MIR confirms pricing, availability and delivery before any order.'],
['Télécharger ma sélection en PDF','Download my selection as a PDF'],
['Joignez le PDF à votre demande. Aucune commande ni paiement en ligne à cette étape.','Attach the PDF to your request. No online order or payment is made at this stage.'],
['Ouvrir mon Dossier de projet →','Open my project file →'],
['Dossier de projet · pièces sur mesure et exports','Project file · custom pieces and exports'],
['Nom du projet','Project name'],['Continuer à explorer ↗','Keep exploring ↗'],
['VOTRE PROJET · PIÈCES SUR MESURE','YOUR PROJECT · CUSTOM PIECES'],
['Matériaux et pliages, dans le même dossier.','Materials and custom bends in one project file.'],
['Vos moulures et panneaux dessinés dans le configurateur apparaissent ici avec leur quantité et leur couleur. Les cotes et dessins restent dans leur version enregistrée.','Your configured trims and panels appear here with their quantities and colours. Measurements and drawings remain in their saved versions.'],
['0 pièce sur mesure','0 custom pieces'],['Lecture du dossier…','Reading project file…'],
['Associer au projet','Link to project'],
['PDF complet : matériaux + pliages ↓','Complete PDF: materials + custom bends ↓'],
['Sauvegarder le dossier complet JSON','Save the full project file as JSON'],
['Voir ou modifier mes pièces ↗','View or edit my pieces ↗'],
["Aucune nouvelle sauvegarde n'est créée ici : ce dossier rassemble les matériaux et les pièces déjà conservés dans ce navigateur. Sans compte connecté, il n'est pas synchronisé entre appareils. Une préparation n'est pas une commande.",'No new backup is created here: this file brings together materials and pieces already saved in this browser. Without signing in, it does not sync across devices. Preparing a file is not placing an order.'],
['Sauvegarder JSON','Save JSON'],['Ajouter des pliages au projet ↗','Add custom bends to the project ↗'],
['Les quantités indiquées sont vos besoins à confirmer. Cette sélection est conservée sur cet appareil; elle ne constitue pas une commande et aucun paiement n’est prélevé.','Quantities are your requirements to be confirmed. This selection is saved on this device; it is not an order and no payment is charged.'],
['Pliage sur mesure — L’atelier MIR','Custom metal bending — MIR workshop'],
['L’ATELIER MIR','MIR WORKSHOP'],['Pliage','Metal bending'],['sur mesure.','to your dimensions.'],
['Choisissez une forme de départ ou dessinez la vôtre. Ajoutez vos mesures et votre couleur.','Start with a profile or draw your own. Add your dimensions and colour.'],
['Pliage personnalisé','Custom bend'],['Dessin coté pour votre dossier.','Dimensioned drawing for your project file.'],
['PROFIL DE MOULURE','TRIM PROFILE'],['EXEMPLE','EXAMPLE'],['Aluminium plié','Bent aluminum'],
['3 côtés · vue 3D','3 sides · 3D view'],['Formulaire rapide · option avancée','Quick form · advanced option'],
['Profils spéciaux :','Special profiles:'],['Solin brique','Brick flashing'],
['Coin avec J intégré','Corner with integrated J-channel'],['VOTRE PIÈCE','YOUR PIECE'],
['Pliage en L','L-shaped bend'],['Volume','Volume'],['Section cotée','Dimensioned section'],
['Aluminium · Finition à choisir','Aluminum · finish to select'],
['COTES EXTÉRIEURES / ANGLES À 90°','OUTSIDE DIMENSIONS / 90° ANGLES'],
['Le dessin suit vos proportions. La longueur L est indiquée séparément.','The drawing follows your proportions. Length L is shown separately.'],
['Les dimensions','Dimensions'],['Unité de mesure','Unit of measure'],['Pouces','Inches'],
['Millimètres','Millimetres'],['L — Longueur de la pièce','L — Piece length'],
['Quantité','Quantity'],['Longueur fixe de vente : 120 po (10 pi); J à soffite : 144 po (12 pi).','Fixed selling length: 120 in. (10 ft); soffit J-channel: 144 in. (12 ft).'],
['Le métal et la couleur','Metal and colour'],['Fabricant / produit','Manufacturer / product'],
['Chargement du catalogue…','Loading catalogue…'],['Rechercher une couleur','Search for a colour'],
['Face peinte','Painted face'],['Extérieur du profil','Outside of profile'],
['Intérieur du profil','Inside of profile'],['Épaisseur souhaitée','Requested thickness'],
['Le fini, l’épaisseur, le rayon et les retours de sécurité seront confirmés par l’atelier avant fabrication.','The workshop will confirm the finish, thickness, radius and safety hems before fabrication.'],
['Repère ou note pour cette pièce','Reference or note for this piece'],
['Ajouter à ma liste','Add to my list'],['VOTRE PROJET','YOUR PROJECT'],
['Ma liste de pliages','My custom bending list'],
['Votre liste est prête à recevoir sa première pièce.','Your list is ready for its first piece.'],
['0 pièce · 0 pi linéaire','0 pieces · 0 linear ft'],['Liste JSON ↓','JSON list ↓'],
['Dossier PDF coté ↓','Dimensioned PDF file ↓'],
['Votre liste est conservée sur cet appareil. Le dossier téléchargé permet de préparer une demande à l’atelier; aucune commande n’est transmise automatiquement.','Your list is saved on this device. Downloading the file helps prepare a workshop request; no order is sent automatically.'],
['Les matériaux ↗','Materials ↗'],['Studio de façade ↗','Exterior Studio ↗'],
['Nous joindre | Les Revêtements MIR','Contact us | Les Revêtements MIR'],
['PARLONS DE VOTRE PROJET',"LET'S TALK ABOUT YOUR PROJECT"],
['Installation de revêtements extérieurs, choix de matériaux et pliages en acier ou en aluminium. L’équipe MIR vous accompagne à Québec.','Exterior siding installation, material selection and steel or aluminum bending. The MIR team works with you in Québec City.'],
['Demander une estimation ↗','Request an estimate ↗'],
['Appeler MIR · 418 842-9859','Call MIR · 418 842-9859'],
['Coordonnées publiées par MIR ↗','Contact details published by MIR ↗'],
['Nos réalisations | Les Revêtements MIR','Our projects | Les Revêtements MIR'],
['RÉALISATIONS · LES REVÊTEMENTS MIR','PROJECTS · LES REVÊTEMENTS MIR'],
['Des façades','Exteriors'],['qui durent.','built to last.'],
['Résidences, multilogements et détails architecturaux réalisés avec soin au Québec.','Homes, multi-unit buildings and architectural details carefully completed in Québec.'],
['Explorer les projets','Explore projects'],['PROJETS SÉLECTIONNÉS','FEATURED PROJECTS'],
['Notre savoir-faire,','Our work,'],['en images.','in pictures.'],
['Parcourez les projets en plein format. Touchez une photo pour l’agrandir et voir les détails du revêtement.','Browse full-size project photos. Tap a photo to enlarge it and see the siding details.'],
['Toutes','All'],['Résidentielles','Residential'],['Multilogements','Multi-unit buildings'],
['Contemporaines','Contemporary'],['Intemporelles','Timeless'],
['Mes inspirations','My inspiration board'],
['Aucune réalisation dans cette sélection.','No projects match this selection.'],
['Agrandir','Enlarge'],['Rythme architectural','Architectural rhythm'],
['Refuge en forêt','Forest retreat'],['Nature habitée','Living with nature'],
['Deuxième angle','Second view'],['Ouverte sur le paysage','Open to the landscape'],
['Contrastes maîtrisés','Balanced contrasts'],['Géométrie pure','Clean geometry'],
['Jeux de matières','Material interplay'],['Lignes contemporaines','Contemporary lines'],
['Un classique réinventé','A classic reimagined'],['Au cœur de Québec','In the heart of Québec City'],
['Les photographies de certains projets ont été retouchées pour harmoniser la présentation et compléter visuellement les aménagements. Les revêtements et l’architecture présentés demeurent représentatifs des réalisations MIR.','Some project photographs have been retouched to standardize the presentation and visually complete the landscaping. The siding and architecture shown remain representative of MIR projects.'],
['UN PROJET EN TÊTE ?','HAVE A PROJECT IN MIND?'],
['Donnez du caractère','Bring character'],['à votre façade.','to your exterior.'],
['Découvrez les matières et les couleurs de MIR, puis contactez-nous pour préparer la suite.','Discover MIR materials and colours, then contact us to plan the next steps.'],
['Découvrir nos revêtements','Explore our siding'],['LES RÉALISATIONS MIR','MIR PROJECTS'],
['Réalisation MIR','MIR project'],['Fermer','Close'],['Précédente','Previous'],
['Suivante','Next'],['Filtrer les réalisations','Filter projects'],
['Demander une estimation | Les Revêtements MIR','Request an estimate | Les Revêtements MIR'],
['VOTRE PROJET, BIEN PRÉPARÉ','A WELL-PREPARED PROJECT'],
['Votre demande','Your estimate'],['d’estimation.','request.'],
['Décrivez votre chantier. Les plans PDF sont facultatifs ; ils nous aideront à préparer votre estimation.','Describe your project. PDF plans are optional and will help us prepare an estimate.'],
['Reprendre mon formulaire','Resume my form'],
['Fiche privée d’estimation | Les Revêtements MIR','Private estimate record | Les Revêtements MIR'],
['ESPACE PRIVÉ MIR','MIR PRIVATE AREA'],
['La demande','The request'],['reçue.','received.'],
['Version figée lors de la soumission. Accès réservé à l’équipe autorisée.','Version saved at submission. Access is restricted to authorized staff.'],
['Vérification de votre accès…','Checking your access…'],
['Ouvrir Mon compte','Open My account'],['Vérifier mon accès','Check my access']
];

entries.push(
 ['Profil de moulure','Trim profile'],['La quantité doit être un nombre entier entre 1 et 999.','Quantity must be a whole number from 1 to 999.'],
 ['Chaque côté doit avoir une mesure supérieure à zéro.','Each side must have a measurement greater than zero.'],
 ['Couleur à confirmer','Colour to be confirmed'],['Produit à confirmer','Product to be confirmed'],['À confirmer','To confirm'],
 ['Le volume suit les cotes de section; la longueur L est représentée séparément. Teinte d’écran indicative.','Volume follows the section dimensions; length L is shown separately. Screen colour is indicative.'],
 ['Aucune couleur non vérifiée n’est proposée pour cette référence. La teinte sera confirmée sur le nuancier du fabricant.','No unverified colours are offered for this reference. Confirm the finish using the manufacturer’s colour chart.'],
 ['Pièce retirée de votre liste.','Piece removed from your list.'],['Préparation du dossier PDF…','Preparing PDF file…'],
 ['Formulaire général','General form'],['Brouillon conservé sur cet appareil.','Draft saved on this device.'],
 ['Brouillon conservé sur cet appareil. L’envoi n’est pas encore raccordé.','Draft saved on this device. Submission is not connected yet.'],
 ['À estimer','To estimate'],['Aperçu seulement','Preview only'],
 ['Préparation de votre demande…','Preparing your request…'],
 ['Aucune demande envoyée.','No request submitted.'],
 ['Vérifier mon panier','Review my cart'],
 ['Vous pouvez remplir votre panier sans compte. Connectez-vous au moment de préparer la suite.','You can fill your cart without an account. Sign in when you are ready to continue.'],
 ['Votre panier est prêt à vérifier','Your cart is ready to review'],
 ['Impossible de vérifier le compte. Votre panier reste conservé.','Unable to verify the account. Your cart remains saved.'],
 ['La sauvegarde locale est indisponible. Téléchargez votre liste pour la conserver.','Local saving is unavailable. Download your list to keep it.'],
 ['MIR — Sélection de matériaux','MIR — Materials selection'],
 ['Les Revêtements MIR — Revêtements extérieurs et pliage sur mesure à Québec','Les Revêtements MIR — Exterior siding and custom metal bending in Québec City'],
 ['Illustration d’une maison contemporaine entourée d’arbres, avec revêtements foncés, pierre claire et touches de bois','Illustration of a contemporary house surrounded by trees, with dark siding, light stone and wood accents'],
 ['Illustration d’un revêtement extérieur noir texturé à clins horizontaux','Illustration of dark textured horizontal lap siding'],
 ['Illustration d’une moulure métallique noire sur une toiture contemporaine avec parement de bois','Illustration of black metal trim on a contemporary roof with wood siding'],
 ['Illustration d’une façade 3D qui passe d’un plan filaire à une maison avec revêtements','Illustration of a 3D house transitioning from wireframe to finished siding'],
 ['Illustration d’une façade 3D qui passe d’un plan filaire à une maison avec revêtements','Illustration of a 3D house transitioning from a wireframe to finished siding'],
 ['LE STUDIO MIR','MIR STUDIO'],['Imaginez votre','Imagine your'],['façade.','exterior.'],
 ['Importer mon PDF','Import my PDF'],['Essayer l’exemple','Try the example'],['Reprendre mon plan','Resume my plan'],
 ['Plans conservés sur cet appareil uniquement.','Plans are stored only on this device.'],
 ['Ouverture de votre projet…','Opening your project…'],['Lecture des cotes du plan','Reading plan dimensions'],
 ['Voir mon plan','View my plan'],['Volume & retours','Volume and returns'],['Façades','Elevations'],
 ['Toiture','Roof'],['Soffite','Soffit'],['Fascia','Fascia'],['Poutres & colonnes','Beams and columns'],
 ['Coins de métal','Metal corners'],['Avant','Front'],['Droite','Right'],['Arrière','Rear'],['Gauche','Left'],
 ['Plan 2D','2D plan'],['Vue 3D','3D view'],['Affichage','Display'],['Client','Customer'],
 ['Atelier · cotes','Workshop · dimensions'],
 ['Une vue claire des matières et des finitions.','A clear view of materials and finishes.'],
 ['Cliquez sur une matière pour la modifier','Select a material to change it'],
 ['Terrain commercial','Commercial site'],['Marches du balcon','Porch steps'],
 ['Plein écran ⛶','Full screen ⛶'],['Chargement de votre studio…','Loading your Studio…'],
 ['Le volume est à compléter','Building volume needs completion'],
 ['Voir les dimensions disponibles','View available dimensions'],
 ['Continuer sur le plan 2D','Continue on the 2D plan'],
 ['Fenêtres et portes protégées','Windows and doors protected'],['Tracé neutre','Neutral outline'],
 ['Modifier la sélection','Edit selection'],['Glissez pour tourner à 360° · haut / bas pour incliner','Drag to rotate 360° · up/down to tilt'],
 ['Vue au niveau du sol','Ground-level view'],['Recentrer','Recenter'],
 ['Ajouter un accent','Add an accent'],['Tracer une zone','Draw an area'],['Dupliquer la zone','Duplicate area'],
 ['Fenêtres & portes','Windows and doors'],['Aligner sur la fenêtre','Align to window'],['↶ Annuler','↶ Undo'],
 ['Voir le repérage','View reference markers'],['LES ZONES DE CETTE FAÇADE','AREAS OF THIS ELEVATION'],
 ['Du repérage au tracé vérifié','From reference markers to verified outlines'],
 ['À calibrer :','To calibrate:'],['les échelles, les contours masqués et les dimensions. Vérifiez les rendements et les quantités avec l’équipe MIR avant toute commande. Importez votre propre PDF avec le bouton « Importer mon PDF ». Les cotes lisibles et leurs lignes d’attache servent à proposer automatiquement l’échelle.','scales, hidden outlines and dimensions. Check yields and quantities with MIR before ordering. Import your own PDF with “Import my PDF”. Legible dimensions and extension lines help estimate the scale.'],
 ['Les dimensions seront lues dans votre plan.','Dimensions will be read from your plan.'],
 ['Vue SVG ↗','SVG view ↗'],['PDF des 4 élévations ↗','PDF of four elevations ↗'],
 ['FAÇADE','ELEVATION'],['Voir le résultat ↑','View result ↑'],['LA ZONE SÉLECTIONNÉE','SELECTED AREA'],
 ['Sélectionnez une zone','Select an area'],['Position et dimensions','Position and dimensions'],
 ['Supprimer cet accent','Remove this accent'],['Fabricant','Manufacturer'],['Gamme et profil','Product line and profile'],
 ['Format du panneau','Panel size'],['Couvrance de pose retenue (po)','Selected exposure (in.)'],
 ['Fiche & documents','Product details and documents'],['Fini du fabricant','Manufacturer finish'],
 ['Nuancier officiel ↗','Official colour chart ↗'],['Profil','Profile'],['Sens de pose','Installation direction'],
 ['Couleur des battens / couvre-joints','Batten / joint cover colour'],
 ['Calepinage des panneaux','Panel layout'],['＋ Joint vertical','＋ Vertical joint'],
 ['＋ Joint horizontal','＋ Horizontal joint'],['Repartir au format réel','Reset to actual panel size'],
 ['Bandeau de haut de mur','Top-of-wall trim'],['Ajouter une moulure de haut de mur','Add top-of-wall trim'],
 ['LA ZONE SÉLECTIONNÉE','SELECTED AREA'],['Gamme / système','Product line / system'],
 ['Cote de référence','Reference dimension'],['Cotes','Dimensions'],['Largeur','Width'],['Hauteur','Height'],
 ['Nom de la moulure','Trim name'],['Mesures','Measurements'],['Longueur','Length'],['Face colorée','Coloured side'],
 ['Matériau et couleur','Material and colour'],['À vos mesures','Made to your dimensions'],
 ['Retour à la page','Return to page'],['Zoomer','Zoom in'],['Dézoomer','Zoom out'],['Vue complète','Fit view'],
 ['Continuer','Continue'],['← Retour','← Back'],['Chargement du configurateur…','Loading configurator…'],
 ['Choisir la forme','Choose a shape'],['Entrer les mesures','Enter measurements'],
 ['Choisir le métal et la couleur','Choose metal and colour'],['Ajouter au dossier','Add to project file'],
 ['Comment voulez-vous commencer?','How would you like to start?'],
 ['Vous pourrez ajuster les mesures dans les deux cas.','You can adjust the measurements either way.'],
 ['Consulter nos modèles','Browse our templates'],['Choisissez une forme et entrez vos mesures.','Choose a shape and enter your measurements.'],
 ['Dessiner votre moulure personnalisée','Draw a custom trim profile'],['Tracez vos côtés sur la grille.','Draw each side on the grid.'],
 ['Réessayer','Try again'],['Aluminium','Aluminum'],['Acier','Steel'],['Acier inoxydable','Stainless steel'],
 ['Autre métal à préciser','Other metal (specify)'],['Épaisseur de tôle','Sheet-metal thickness'],
 ['Gage (si connu)','Gauge (if known)'],['Référence couleur','Colour reference'],
 ['Nuancier du fabricant','Manufacturer colour chart'],['Couleur spéciale / autre code','Special colour / other code'],
 ['Options de la pièce','Piece options'],['Quantité','Quantity'],['Repère de pose','Installation reference'],
 ['Note pour cette pièce','Note for this piece'],['ÉTAPE 1 SUR 4 · FORME','STEP 1 OF 4 · SHAPE'],
 ['Cotes de la pièce finie','Finished-piece dimensions'],
 ['Le dessin suit vos cotes. Le développé de tôle sera validé par l’atelier.','The drawing follows your dimensions. The workshop will confirm the developed sheet length.'],
 ['Le fini, l’épaisseur, le rayon et les retours de sécurité seront confirmés par l’atelier avant fabrication.','The workshop will confirm the finish, thickness, radius and safety hems before fabrication.'],
 ['Studio matières — MIR','Materials Studio — MIR'],
 ['Ouvrir mon Studio 3D','Open my 3D Studio'],['Mon dossier de projet','My project file'],
 ['Retour au concept','Back to concept'],['Donnez matière à votre projet.','Bring materials into your project.'],
 ['Imaginer avant de choisir','Explore before choosing'],['Une maison, plusieurs façons de l’habiter. Composez ses façades avec des matières et des teintes génériques, puis explorez votre combinaison sous tous les angles.','One home, many ways to make it yours. Combine generic materials and tones on its elevations, then view the result from every angle.'],
 ['MAISON 01','HOUSE 01'],['Volume principal · modèle hypothétique','Main volume · demonstration model'],
 ['Vue avant','Front view'],['Trois quarts','Three-quarter view'],['Vue arrière','Rear view'],
 ['Votre composition','Your composition'],['Choisir une zone','Choose an area'],
 ['Façade avant','Front elevation'],['Côtés et façade arrière','Sides and rear elevation'],['Pignons','Gable ends'],
 ['Explorer les matières','Explore materials'],['Clin horizontal','Horizontal lap siding'],
 ['Bois vertical','Vertical wood siding'],['Métal','Metal'],['Brique','Brick'],
 ['Trouver une teinte','Find a colour'],['Ivoire','Ivory'],['Sauge','Sage'],['Graphite','Graphite'],
 ['Sable','Sand'],['Terre cuite','Terracotta'],['Réinitialiser','Reset'],['Exporter mes choix ↗','Export my choices ↗'],
 ['Un fichier .json sur votre appareil. Aucun envoi.','A .json file on your device. Nothing is sent.'],
 ['Et pour votre vraie maison ?','What about your actual home?'],['plans cotés et vos élévations','dimensioned plans and elevations'],
 ['Couleur à confirmer avec l’atelier','Colour to be confirmed by the workshop']
);


entries.push(
  ["Matériaux, finitions et pliages sur mesure","Materials, finishes and custom metal bending"],
  ["LES REVÊTEMENTS MIR","LES REVÊTEMENTS MIR"],
  ["Réalisation du portfolio MIR","MIR project"],
  ["Ex. HardiePlank, Rialux, noir…","E.g., HardiePlank, Rialux, black…"],
  ["Façade contemporaine du portfolio MIR, revêtement sombre et maçonnerie claire","Contemporary MIR project with dark siding and light masonry"],
  ["Explorer par famille de matériaux","Browse by material category"],
  ["Liens de pied de page","Footer links"],
  ["/ LES MATÉRIAUX","/ MATERIALS"],
  ["Choisir un fabricant","Choose a manufacturer"],
  ["Clin, panneau, soffite, moulure…","Lap siding, panels, soffit, trim…"],
  ["Continuer le projet","Continue your project"],
  ["Fil d’Ariane","Breadcrumb trail"],
  ["Fiche du matériau","Material details"],
  ["Autres espaces du projet","Other project areas"],
  ["Ex. Revêtement de ma maison","E.g., My home's siding"],
  ["Pièces sur mesure enregistrées","Saved custom pieces"],
  ["Les modèles de l’atelier","Workshop templates"],
  ["Choisir un profil de pliage","Choose a bent-metal profile"],
  ["Vue du pliage","Bend preview"],
  ["Configurer les mesures","Enter measurements"],
  ["Nom ou code de couleur","Colour name or code"],
  ["Couleurs du produit","Product colours"],
  ["Ex. Fenêtre façade avant · côté gauche","E.g., Front window · left side"],
  ["Mon projet MIR","My MIR project"],
  ["01 · MULTILOGEMENTS","01 · MULTI-UNIT BUILDINGS"],
  ["Des volumes répétés, animés par un jeu précis de parements verticaux et horizontaux.","Repeating building forms with a carefully balanced mix of vertical and horizontal siding."],
  ["02 · RÉSIDENTIEL","02 · RESIDENTIAL"],
  ["03 · BOIS & PIERRE · 2 PHOTOS","03 · WOOD & STONE · 2 PHOTOS"],
  ["04 · CONTEMPORAIN","04 · CONTEMPORARY"],
  ["05 · BRIQUE & ALUMINIUM","05 · BRICK & ALUMINUM"],
  ["06 · MÉTAL ARCHITECTURAL","06 · ARCHITECTURAL METAL"],
  ["07 · MATIÈRES","07 · MATERIALS"],
  ["08 · FINITIONS","08 · FINISHES"],
  ["09 · INTEMPOREL","09 · TIMELESS"],
  ["10 · URBAIN","10 · URBAN"],
  ["1 sur 11","1 of 11"],
  ["Voir le projet multilogements contemporain en grand","Enlarge the contemporary multi-unit building project"],
  ["Ensemble de multilogements contemporains aux parements orange, taupe et noir","Contemporary multi-unit buildings with orange, taupe and black siding"],
  ["Voir la résidence forestière en grand","Enlarge the forest home"],
  ["Résidence forestière en hiver avec parement brun, pierre et grandes fenêtres","Forest home in winter with brown siding, stone and large windows"],
  ["Voir la résidence bois et pierre avec terrasse en grand","Enlarge the wood-and-stone home with a terrace"],
  ["Résidence bois et pierre avec terrasse et garde-corps noirs","Wood-and-stone home with terrace and black railings"],
  ["Voir le deuxième angle de la résidence Nature habitée","View the second angle of the Living with nature home"],
  ["Voir la résidence aux fenêtres panoramiques en grand","Enlarge the home with panoramic windows"],
  ["Grande résidence contemporaine avec fenêtres panoramiques et galerie noire","Large contemporary home with panoramic windows and black porch"],
  ["Voir la résidence de brique grise en grand","Enlarge the grey brick home"],
  ["Résidence contemporaine de brique grise, pierre claire et détails noirs","Contemporary home with grey brick, light stone and black details"],
  ["Voir la résidence métallique contemporaine en grand","Enlarge the contemporary metal-clad home"],
  ["Résidence contemporaine en revêtement métallique gris avec accents de bois","Contemporary home with grey metal siding and wood accents"],
  ["Voir Jeux de matières en grand","Enlarge Material interplay"],
  ["Maison contemporaine à parement brun et maçonnerie claire","Contemporary home with brown siding and light masonry"],
  ["Voir Lignes contemporaines en grand","Enlarge Contemporary lines"],
  ["Résidence contemporaine avec panneaux noirs, clins pâles et pierre grise","Contemporary home with black panels, light-coloured lap siding and grey stone"],
  ["Voir Un classique réinventé en grand","Enlarge A classic reimagined"],
  ["Maison à grands pignons avec revêtement gris et encadrements blancs","Home with tall gables, grey siding and white trim"],
  ["Voir Au cœur du centre-ville de Québec en grand","Enlarge In downtown Québec City"],
  ["Immeuble urbain en brique et revêtement métallique au centre-ville de Québec","Urban building with brick and metal siding in downtown Québec City"],
  ["Fermer la photographie","Close photograph"],
  ["MIR — Votre projet, matière par matière","MIR — Your project, material by material"],
  ["Choisir les matériaux du studio","Choose Studio materials"],
  ["Importez votre plan. Choisissez une partie de la maison. Essayez vos matières.","Import your plan. Choose an area of the home. Try different materials."],
  ["01 / ÉLÉVATION AVANT","01 / FRONT ELEVATION"],
  ["Voir les retours →","View returns →"],
  ["Le plan doit donner la largeur, la profondeur et les hauteurs pour reconstruire un volume fiable.","The plan must include width, depth and heights to reconstruct a reliable 3D volume."],
  ["Les couleurs du PDF ont servi à détecter des surfaces. Les fenêtres, portes et zones éditables ont ensuite été revues sur les dessins. Le hachurage signale les endroits où une légende masque la source. En 3D, le retrait du RDC et ses retours suivent les réglages du dossier de métrés. La hauteur, l’étage, le terrain et le porche complet restent à confirmer.","Colours in the PDF were used to detect surfaces. Windows, doors and editable areas were then reviewed on the drawings. Hatching indicates areas where a legend obscures the original. In 3D, the ground-floor setback and its returns follow the measurements file settings. Height, upper floor, terrain and full porch still need to be confirmed."],
  ["Sur le plan 2D, glissez l’accent pour le déplacer ou utilisez les quatre cotes ci-dessous.","On the 2D plan, drag the accent to move it, or use the four dimensions below."],
  ["Valeur saisie pour ce projet. Elle ne remplace pas la fiche du fabricant.","Value entered for this project. It does not replace the manufacturer's specifications."],
  ["Espacement des battens (po, centre à centre)","Batten spacing (in., centre to centre)"],
  ["8 po c/c","8 in. o.c."],
  ["12 po c/c","12 in. o.c."],
  ["16 po c/c","16 in. o.c."],
  ["Couleur personnalisée de visualisation; la référence fabricant reste à confirmer.","Custom display colour; manufacturer reference remains to be confirmed."],
  ["Pignon : battens centrés sur la pointe. Sinon, alignement optimisé près des jambages des fenêtres. Cotes de pose et fixation à vérifier.","Gable: battens centred on the peak. Otherwise, spacing is optimized near window jambs. Verify installation dimensions and fastening."],
  ["Le format réel part du bas et de la gauche; les coupes restent aux bords. Déplacez un joint pour créer un calepinage personnalisé. Les cotes s’affichent en mode Atelier.","Actual panel sizes start at the bottom and left, with cuts along the edges. Move a joint for a custom layout. Dimensions appear in Workshop mode."],
  ["Rotation de découpe autorisée dans le format du stock. Sens du fini et de pose à respecter. Les pièces percées ou en pente demandent un plan de coupe.","Cut rotation is permitted within stock dimensions. Respect the finish and installation direction. Perforated or sloped pieces need a cutting plan."],
  ["Au haut de cette zone, vers l’intérieur. Dans un pignon, le bandeau horizontal se place au départ des rampants uniquement lorsque vous l’activez.","At the top of this area, facing inward. On a gable, the horizontal trim is placed where the roof slopes begin only when you enable it."],
  ["Hauteur apparente (po)","Visible height (in.)"],
  ["Moulure / bandeau","Trim / band"],
  ["Fini","Finish"],
  ["Documents du bandeau ↗","Band trim documents ↗"],
  ["Joints & transitions H / V","H / V joints and transitions"],
  ["Une ligne de raccord limitée à la matière visible. Les ouvertures et accents sont exclus. Le profil constructif reste à valider.","A joint line limited to the visible material. Openings and accents are excluded. The construction profile still requires approval."],
  ["＋ Horizontal","＋ Horizontal"],
  ["＋ Vertical","＋ Vertical"],
  ["Proposer les joints de longueur","Suggest length joints"],
  ["Modifier les joints proposés","Edit suggested joints"],
  ["Rétablir les joints automatiques","Restore automatic joints"],
  ["Fenêtre ou porte · finition","Window or door · finish"],
  ["Couleur du cadre / battant de fenêtre","Window frame / sash colour"],
  ["Batten / moulure décorative autour de la fenêtre","Batten / decorative trim around the window"],
  ["Couleur de ce batten de fenêtre","Colour of this window batten"],
  ["Couleur de la porte","Door colour"],
  ["Type de porte (visuel)","Door type (visual only)"],
  ["Porte vitrée moderne","Modern glazed door"],
  ["Porte pleine contemporaine","Contemporary solid door"],
  ["Porte-patio double","Double patio door"],
  ["Couleurs et vitrage illustratifs. Les cotes du PDF restent intactes.","Colours and glazing are illustrative. PDF dimensions remain unchanged."],
  ["Contour de l’ouverture","Opening trim"],
  ["Sans contour ajouté","No added trim"],
  ["Métal / capage","Metal / capping"],
  ["Moulure d’un fabricant","Manufacturer trim"],
  ["Largeur apparente (po)","Visible width (in.)"],
  ["Produit de contour","Trim product"],
  ["Documents du contour ↗","Trim documents ↗"],
  ["Position et dimensions de la zone","Area position and dimensions"],
  ["Position dans la façade (%)","Position on elevation (%)"],
  ["Haut","Top"],
  ["Supprimer cette zone ajoutée","Remove this added area"],
  ["Soffite & fascia","Soffit & fascia"],
  ["Fabricant du soffite","Soffit manufacturer"],
  ["Profil et type de soffite","Soffit profile and type"],
  ["Fini du soffite","Soffit finish"],
  ["Documents du soffite ↗","Soffit documents ↗"],
  ["Fabricant du fascia","Fascia manufacturer"],
  ["Profil du fascia","Fascia profile"],
  ["Fini du fascia","Fascia finish"],
  ["Documents du fascia ↗","Fascia documents ↗"],
  ["Nuanciers officiels lorsqu’ils sont associés. Les teintes moyennes du rendu 3D sont indicatives ; à défaut de nuancier, l’aperçu reste neutre. Ventilation et compatibilités à confirmer.","Official colour charts are linked when available. Average colours in the 3D render are indicative; without a chart, the preview remains neutral. Ventilation and compatibility must be confirmed."],
  ["Exporter mes choix","Export my selections"],
  ["Enregistrement sur cet appareil","Saving on this device"],
  ["Réinitialiser les choix de ce plan","Reset choices for this plan"],
  ["UNE BASE CONCRÈTE","A PRACTICAL STARTING POINT"],
  ["Le bon matériau.","The right material."],
  ["Les bons documents.","The right documents."],
  ["Votre plan et vos choix sont conservés sur cet appareil. L’étude associe les zones dessinées à une sélection de références fournisseurs. Chaque fiche distingue les guides de pose, les données techniques et les ressources restant à confirmer. Les briques sont proposées pour la visualisation.","Your plan and selections are saved on this device. The study links drawn areas to selected supplier references. Each product sheet distinguishes installation guides, technical data and resources still to be confirmed. Brick options are provided for visualization only."],
  ["Explorer les fiches fabricants","Explore manufacturer product sheets"],
  ["← Retour aux réalisations","← Back to projects"],
  ["STUDIO MIR · ÉTUDE PRIVÉE · NOVEMBRE 2026","MIR STUDIO · PRIVATE STUDY · NOVEMBER 2026"],
  ["Tracés neutres en PDF ↗","Neutral outlines PDF ↗"],
  ["Copie PDF anonymisée ↗","Anonymized PDF copy ↗"],
  ["RESSOURCES OFFICIELLES","OFFICIAL RESOURCES"],
  ["La matériauthèque MIR","MIR materials library"],
  ["Rechercher","Search"],
  ["Application","Application"],
  ["Maçonnerie","Masonry"],
  ["Moulures","Trim"],
  ["Fixations","Fasteners"],
  ["Scellants","Sealants"],
  ["Références documentées pour l’étude. Prix, stocks, unités de vente et disponibilité MIR à établir. Les liens vers des centres de ressources sont identifiés comme tels.","References documented for this study. MIR pricing, inventory, sales units and availability are still to be established. Links to resource centres are identified as such."],
  ["DES OUVERTURES PROTÉGÉES","PROTECTED OPENINGS"],
  ["Les symboles ont été revus sur le PDF. Choisissez une ouverture pour corriger sa position ou ses dimensions dans l’étude. Les parties cachées par une légende demandent une validation.","Symbols were reviewed against the PDF. Select an opening to adjust its position or dimensions in the study. Parts obscured by a legend require verification."],
  ["Ajouter une fenêtre manquante ＋","Add a missing window ＋"],
  ["Configurer les matières du projet","Configure project materials"],
  ["Partie de la maison","Part of the home"],
  ["Choisir une élévation","Choose an elevation"],
  ["Mode de visualisation","Display mode"],
  ["Détails du dessin","Drawing details"],
  ["Marches schématiques : nombre et dimensions à vérifier","Schematic steps: verify count and dimensions"],
  ["Agrandir la vue 3D","Enlarge 3D view"],
  ["Dessin interactif de la façade","Interactive elevation drawing"],
  ["Vue 3D éditable : cliquez sur un mur ou une ouverture; glissez pour tourner. Les flèches gauche et droite font tourner le volume. Utilisez aussi la liste des zones.","Editable 3D view: select a wall or opening; drag to rotate. Left and right arrow keys rotate the model. You can also use the list of areas."],
  ["Tourner à gauche","Rotate left"],
  ["Tourner à droite","Rotate right"],
  ["Angle de rotation","Rotation angle"],
  ["Annuler la dernière modification","Undo last change"],
  ["Sélectionner une zone","Select an area"],
  ["Choisir les matériaux","Choose materials"],
  ["Fini de la zone","Area finish"],
  ["Couleur visuelle des battens","Display colour of battens"],
  ["Documents du studio","Studio documents"],
  ["Fermer la matériauthèque","Close materials library"]
);

entries.push(
  ["Pièces sur mesure — L’atelier MIR","Custom pieces — MIR workshop"],
  ["Un dessin précis. Une finition à votre mesure.","A precise drawing. A finish to your specifications."],
  ["Dossier local · validation par l’atelier","Local project file · workshop approval required"],
  ["Atelier","Workshop"],
  ["Calepinage","Layout"],
  ["Bons de commande","Purchase orders"],
  ["Fournisseurs","Suppliers"],
  ["Voir le parcours client","View the customer journey"],
  ["L’ATELIER MIR / PRÉPARATION DE PRODUCTION","MIR WORKSHOP / PRODUCTION PREPARATION"],
  ["Du dessin à","From drawing to"],
  ["fabrication.","fabrication."],
  ["Un profil, des cotes, une couleur. Préparez vos pièces avec les repères dont l’atelier a besoin.","One profile, its dimensions and a colour. Prepare pieces with the references the workshop needs."],
  ["Mon dossier","My project file"],
  ["Type de moulure","Trim type"],
  ["Votre dossier est préparé sur cet appareil. MIR confirme les détails avant fabrication.","Your project file is prepared on this device. MIR confirms the details before fabrication."],
  ["Vente","Sales"],
  ["Mes moulures","My trim pieces"],
  ["Modèles et catalogue","Templates and catalogue"],
  ["Bon de commande","Purchase order"],
  ["Ouvrir Studio Capture","Open Studio Capture"],
  ["Pliages sur mesure","Custom bent-metal pieces"],
  ["Panneaux métalliques","Metal panels"],
  ["Dessiner un mur complet","Draw a full wall"],
  ["Pièces métalliques fabriquées · dossier distinct du débit fibrociment","Fabricated metal pieces · separate from fibre-cement cutting plans"],
  ["Un point de départ pour votre pièce.","A starting point for your piece."],
  ["✎ Dessiner un panneau libre comme une moulure","✎ Draw a free-form panel like a trim profile"],
  ["Profils disponibles ici :","Profiles available here:"],
  ["Moulure solin brique","Brick flashing trim"],
  [". Cotes éditables et transfert dans le dossier de production actuel.",". Editable dimensions; add to the existing production file."],
  ["← Retour au pliage","← Back to bending"],
  ["← Retour aux choix","← Back to selections"],
  ["Choisissez une forme, puis entrez vos mesures.","Choose a shape, then enter your measurements."],
  ["Vue cotée","Dimensioned view"],
  ["Ce nom sera affiché dans ton dossier et sur le PDF.","This name will appear in your file and on the PDF."],
  ["Pour dessiner en paysage, active la rotation automatique puis tourne ton téléphone.","To draw in landscape, turn on auto-rotate and rotate your phone."],
  ["Revenir à la page","Return to the page"],
  ["Glisse pour tracer un côté","Drag to draw a side"],
  ["Molette ou pincement pour zoomer","Use the mouse wheel or pinch to zoom"],
  ["Finition à sélectionner","Select a finish"],
  ["Fractions acceptées : 3 1/2 ou 3½.","Fractions accepted: 3 1/2 or 3½."],
  ["Métal et couleur","Metal and colour"],
  ["Type de métal","Metal type"],
  ["Épaisseur de tôle dans l’unité choisie. Le gage reste la valeur saisie.","Sheet-metal thickness in the selected unit. The entered gauge remains unchanged."],
  ["Référence : Unico U-P1","Reference: Unico U-P1"],
  ["Panneau architectural plié, en acier ou en aluminium. Les dimensions finales dépendent du projet.","Bent architectural panel in steel or aluminum. Final dimensions depend on the project."],
  ["Produit et couleurs ↗","Product and colours ↗"],
  ["Fiche technique ↗","Technical datasheet ↗"],
  ["Couleur personnalisée · soumission obligatoire","Custom colour · quote required"],
  ["MIR établira le prix après validation de votre couleur. Aucun prix automatique ni tarif au pouce carré n’est appliqué à cette pièce.","MIR will determine the price after approving your colour. No automatic price or per-square-inch rate applies to this piece."],
  ["＋ Ajouter à un bon de commande","＋ Add to a purchase order"],
  ["Annuler la modification","Cancel changes"],
  ["La pièce reste dans ce dossier sur cet appareil. Pour proposer un modèle au magasin ou à la boutique, ouvre Mes modèles.","The piece remains in this file on this device. To propose a template for the store or shop, open My templates."],
  ["VOTRE DOSSIER","YOUR PROJECT FILE"],
  ["Les pièces,","The pieces,"],
  ["bien préparées.","properly prepared."],
  ["Brouillon à valider","Draft for approval"],
  ["Bons en cours · Ouvrir ou créer","Open purchase orders · Open or create"],
  ["Chantier, bon de commande et date","Jobsite, purchase order and date"],
  ["Projet","Project"],
  ["Numéro du bon de commande (PO)","Purchase order number (PO)"],
  ["Contremaître","Foreman"],
  ["Date souhaitée","Requested date"],
  ["Révision","Revision"],
  ["Note du bon de commande","Purchase order note"],
  ["Ces informations paraissent sur la fiche. La référence du bon est saisie manuellement.","This information appears on the sheet. The purchase order reference is entered manually."],
  ["Votre dossier attend sa première pièce.","Your project file is ready for its first piece."],
  ["Autre export","Other export"],
  ["Télécharger les données ↓","Download data ↓"],
  ["Bon de commande PDF ↓","Purchase order PDF ↓"],
  ["Mes matériaux et mes pliages, ensemble","My materials and custom bends together"],
  ["Le dossier complet réunit les pièces que tu viens de configurer et ta sélection de matériaux. Il reste à faire valider par MIR.","The complete file combines your configured pieces and materials selection. MIR still needs to review it."],
  ["Voir mon dossier complet ↗","View my complete project file ↗"],
  ["MIR · L’atelier du détail.","MIR · Crafting the details."],
  ["Les cotes décrivent la pièce finie. Rayons, jeux, épaisseur et corrections de pliage restent à valider avant fabrication.","Dimensions describe the finished piece. Bend radii, clearances, thickness and bending allowances must be confirmed before fabrication."],
  ["Navigation du site","Site navigation"],
  ["Navigation principale client","Main customer navigation"],
  ["Les étapes du configurateur client","Customer configurator steps"],
  ["Destinations MIR","MIR destinations"],
  ["Type de pièce","Piece type"],
  ["Vue du dessin","Drawing view"],
  ["Ex. Solin fenêtre avant","E.g., Front window flashing"],
  ["Dessin de la pièce","Piece drawing"],
  ["Aperçu simultané 3D du même panneau","Simultaneous 3D preview of the same panel"],
  ["Cotes du profil","Profile dimensions"],
  ["Zoom du dessin","Drawing zoom"],
  ["Niveau de zoom","Zoom level"],
  ["À préciser","To be specified"],
  ["Ex. Façade avant","E.g., Front elevation"],
  ["Détail utile à la fabrication…","Useful fabrication details…"],
  ["Ex. PO-2026-084","E.g., PO-2026-084"],
  ["Nom du responsable","Name of person in charge"],
  ["Livraison, regroupement ou précision pour l’atelier…","Delivery, grouping or workshop details…"],
  ["Fermer la fenêtre","Close window"],
  ["Ancienne démonstration de matières génériques. Pour votre projet et vos plans :","Previous generic-materials demonstration. For your project and plans:"],
  [". Vos données locales ne sont pas déplacées automatiquement.",". Your locally stored data is not moved automatically."],
  ["matières","materials"],
  ["Étude de façade · 01","Exterior study · 01"],
  ["Sélectionnez une zone dans le panneau","Select an area in the panel"],
  ["ou cliquez directement sur une façade.","or select an elevation directly."],
  ["Profondeur","Depth"],
  ["Hauteur au faîte","Ridge height"],
  ["Faites tourner votre point de vue","Rotate your viewpoint"],
  ["Modèle de démonstration — aucun plan client importé.","Demonstration model — no customer plans imported."],
  ["Façade avant · Clin horizontal · Ivoire","Front elevation · Horizontal lap siding · Ivory"],
  ["Clin générique · pas de 190 mm dans le modèle.","Generic lap siding · no 190 mm product in the model."],
  ["Maçonnerie : visualisation seulement.","Masonry: visualization only."],
  ["Teintes de démonstration, sans correspondance avec un nuancier fabricant.","Demonstration colours; they do not correspond to manufacturer colour charts."],
  ["L’ensemble de votre maison","Your entire home"],
  ["La prochaine étape nécessitera vos","The next step will require your"],
  [", puis la validation des profils et teintes disponibles.",", followed by confirmation of available profiles and colours."],
  ["Les dimensions et motifs appartiennent à cette maison hypothétique. Les joints et les stries sont construits dans les unités du modèle, puis projetés selon la vue. Ce rendu schématique ne fournit ni quantité commandable, ni devis, ni validation de pose. Les couleurs à l’écran ne remplacent pas un échantillon réel.","The dimensions and patterns belong to this hypothetical house. Joints and grooves are built in the model's units, then projected into the view. This schematic rendering provides no orderable quantities, estimate or installation approval. Screen colours do not replace physical samples."],
  ["Les Revêtements MIR · Studio matières","Les Revêtements MIR · Materials Studio"],
  ["Concept exploratoire · Maison hypothétique","Concept study · Hypothetical house"],
  ["MIR, retour au concept","MIR, back to concept"],
  ["Vue de la maison hypothétique","View of the hypothetical house"],
  ["Maison hypothétique en trois dimensions. Utilisez les contrôles de zone, de matière, de teinte et de rotation pour la personnaliser.","Three-dimensional hypothetical house. Use the area, material, colour and rotation controls to customize it."],
  ["Dimensions hypothétiques du volume principal, hors débords de toit","Hypothetical main-volume dimensions, excluding roof overhangs"],
  ["Tourner la vue de 15 degrés vers la gauche","Rotate view 15 degrees left"],
  ["Tourner la vue de 15 degrés vers la droite","Rotate view 15 degrees right"],
  ["Points de vue prédéfinis","Preset viewpoints"],
  ["Personnaliser les matières","Customize materials"],
  ["Récapitulatif des trois zones","Summary of the three areas"]
);

entries.push(
  ["Une marque, un profil…","A brand, a profile…"],
  ["Fermer les ouvertures","Close openings"],
  ["Lecture locale refusée. Vérifiez les paramètres du navigateur.","Local reading was denied. Check your browser settings."],
  ["Format de sélection de matériaux inconnu.","Unknown materials selection format."],
  ["Une ligne de matériaux est invalide. Corrigez-la dans Mon panier.","A materials item is invalid. Correct it in My cart."],
  ["Une pièce n’a pas de dessin ou de version compatible. Ouvrez le configurateur avant export.","A piece has no drawing or compatible version. Open the configurator before exporting."],
  ["Le dossier commun nécessite un projet cohérent et des sauvegardes valides.","The combined project file requires matching project details and valid saved items."],
  ["Dossier de préparation uniquement. Aucun paiement, commande ou envoi.","Preparation file only. No payment, order or submission."],
  ["Prix, stock, couleurs, dimensions et règles de fabrication à confirmer par MIR.","MIR must confirm pricing, stock, colours, dimensions and fabrication requirements."],
  ["Vérifiez les noms de projet et les éléments enregistrés avant export.","Check project names and saved items before exporting."],
  ["Moteur de PDF des matériaux indisponible.","Materials PDF engine unavailable."],
  ["Moteur de fiches cotées indisponible.","Dimensioned-sheet engine unavailable."],
  ["Aucune pièce ou aucun matériau à exporter.","No pieces or materials to export."],
  ["MIR — Dossier matériaux et pièces sur mesure","MIR — Materials and custom-pieces file"],
  ["Aucune pièce sur mesure dans le configurateur de ce navigateur.","No custom pieces in this browser's configurator."],
  ["Ajoutez un matériau ou une moulure pour préparer votre dossier.","Add a material or trim piece to prepare your project file."],
  ["Même projet pour les matériaux et les pièces. Aucun nouvel espace de sauvegarde ni envoi automatique.","Materials and pieces belong to the same project. No new storage area or automatic submission."],
  ["Le dossier a changé : vérifiez-le puis réessayez.","The project file changed. Review it and try again."],
  ["Les pièces ont été associées sans modifier les dessins ni leurs versions.","Pieces were linked without changing their drawings or versions."],
  ["Nom du projet appliqué à la sélection existante.","Project name applied to the existing selection."],
  ["Sauvegarde JSON complète prête. Aucun envoi.","Complete JSON backup ready. Nothing was sent."],
  ["Sauvegarde impossible : ","Unable to save: "],
  ["Préparation des pages matériaux et des croquis cotés…","Preparing material pages and dimensioned sketches…"],
  ["Dossier complet prêt · ","Complete project file ready · "],
  ["PDF non préparé : ","PDF not prepared: "],
  [". Utilisez Télécharger dans le panneau.",". Use Download in the panel."],
  [". Le JSON et les dossiers originaux restent disponibles.",". The JSON and original files remain available."],
  [" · repère "," · reference "],
  ["Métré préliminaire à valider. Les ouvertures sont conservées pour le métré.","Preliminary measurements require verification. Openings are retained for takeoff."],
  ["Décrivez votre projet dans la note et ajoutez vos plans si vous en avez.","Describe your project in the notes and attach plans if you have them."],
  ["Vérifier le PDF du dossier","Review the project PDF"],
  ["Envoi non raccordé : les limites seront affichées dès que le service sera configuré. Vous pouvez conserver votre brouillon sur cet appareil.","Submission is not connected yet. Limits will be shown once the service is configured. You can keep your draft on this device."],
  ["L’adresse du service d’estimation doit être sécurisée.","The estimate service URL must be secure."],
  ["Le service d’estimation est indisponible. Votre brouillon reste conservé.","The estimate service is unavailable. Your draft is saved."],
  ["Les limites d’envoi n’ont pas pu être vérifiées.","Unable to verify submission limits."],
  ["configuration du serveur à compléter","server configuration incomplete"],
  [". Brouillon conservé sur cet appareil.",". Draft saved on this device."],
  ["Le service doit confirmer ses limites avant l’envoi.","The service must confirm its limits before submission."],
  ["Le moteur PDF n’est pas disponible. Rechargez cette page.","The PDF engine is unavailable. Reload this page."],
  ["Attendez la fin du chargement du Studio avant de préparer votre demande.","Let the Studio finish loading before preparing your request."],
  ["Ajoutez une pièce à votre dossier avant de demander une estimation.","Add a piece to your project file before requesting an estimate."],
  ["MIR — Demande de pliage","MIR — Custom bending request"],
  ["Projet à confirmer","Project to confirm"],
  ["Le dossier de votre panier n’a pas chargé.","Your cart project file did not load."],
  ["Reprenez vos anciens pliages dans le configurateur.","Reopen your older bends in the configurator."],
  ["Associez les noms de projet dans le dossier commun.","Match the project names in the combined file."],
  ["Vérifiez votre panier et les pièces avant l’envoi.","Review your cart and pieces before submitting."],
  ["Demande reçue · ","Request received · "],
  ["Une tentative précédente attend confirmation. Réessayez la même demande pour éviter un doublon.","A previous attempt is awaiting confirmation. Retry the same request to avoid a duplicate."],
  ["Brouillon retrouvé sur cet appareil. Vérifiez votre demande.","Draft recovered on this device. Review your request."],
  ["Votre demande est prête à vérifier. Aucun envoi effectué.","Your request is ready to review. Nothing was sent."],
  ["Les vues du projet dépassent la taille acceptée par le service. Le brouillon reste conservé.","The project views exceed the service size limit. Your draft remains saved."],
  ["Enregistrement et envoi de votre demande…","Saving and submitting your request…"],
  ["La réponse du serveur a été interrompue. Réessayez cette même demande.","The server response was interrupted. Retry this same request."],
  ["La réception n’est pas confirmée. Votre brouillon est conservé ; réessayez.","Receipt has not been confirmed. Your draft is saved; try again."],
  ["Votre demande est reçue. Notez son numéro : le navigateur n’a pas pu le conserver.","Your request was received. Note its number: the browser could not save it."],
  [". L’équipe MIR a été avisée.",". The MIR team was notified."],
  ["La connexion a été interrompue. Réessayez la même demande.","The connection was interrupted. Retry the same request."],
  ["Brouillon conservé. Aucune réception confirmée.","Draft saved. No confirmed receipt."],
  ["← Voir la maison","← View the house"],
  ["Cliquez pour choisir · glissez pour tourner et incliner","Select to choose · drag to rotate and tilt"],
  ["Déplacez les joints · cotes en pouces","Move joints · dimensions in inches"],
  ["Matières et finitions · vue interactive","Materials and finishes · interactive view"],
  ["Masquer les marches","Hide steps"],
  ["Masquer le terrain","Hide terrain"],
  ["Volume incomplet · vos élévations 2D restent accessibles","Incomplete 3D model · your 2D elevations remain available"],
  ["Une texture n’a pas chargé · revenez à l’élévation","A texture did not load · return to the elevation"],
  ["Volume et élévation à recaler · les matériaux gardent leur taille réelle","3D model and elevation need alignment · materials retain their actual dimensions"],
  ["Certaines élévations restent à cadrer · ouvrez le plan 2D","Some elevations need alignment · open the 2D plan"],
  ["Détails des élévations projetés sur le volume","Elevation details projected onto the 3D model"],
  ["Marches détectées par pixels et cotes du PDF · position et hauteur à confirmer","Steps detected using pixels and PDF dimensions · confirm position and height"],
  ["Géométrie à corriger dans Super admin · Métrés","Geometry must be corrected in Super admin · Measurements"],
  ["Rendu 3D indisponible · réessayez","3D rendering unavailable · try again"],
  ["Le rendu n’a pas pu être calculé.","Unable to calculate the rendering."],
  ["Trois côtés, sans seuil.","Three sides, no sill."],
  ["Quatre côtés.","Four sides."],
  ["Référence commerciale de contour à compléter.","Opening-trim commercial reference needs completing."],
  ["Source officielle consultée.","Official source consulted."],
  ["Lien officiel repéré; ouverture du document à vérifier.","Official link found; document opening needs verification."],
  ["Dimensions à confirmer","Dimensions to confirm"],
  ["ouverture sélectionnée","selected opening"],
  ["zone sélectionnée","selected area"],
  ["Fini à choisir","Select a finish"],
  ["Vue SVG exportée · échelles et contours à calibrer.","SVG exported · scales and outlines still need calibration."],
  ["L’export PDF n’a pas chargé. Rechargez la page.","The PDF exporter did not load. Reload the page."],
  ["Préparation du PDF…","Preparing PDF…"],
  ["MIR · étude des quatre élévations","MIR · Four-elevation study"],
  ["Choix fabricants, calepinage et estimations à calibrer — sans valeur de construction","Manufacturer selections, layouts and estimates need calibration — not suitable for construction"],
  ["PDF des quatre élévations préparé avec les choix et annotations actuels.","Four-elevation PDF prepared using your current selections and notes."],
  ["Le PDF n’a pas pu être créé : ","Could not create PDF: "],
  ["MIR · étude","MIR · Study"],
  ["Choix d’étude et estimations à calibrer. Finitions documentées quand une référence fabricant est indiquée. Maçonneries génériques et teintes numériques utilisées pour la visualisation. Quantités à valider avant commande.","Study choices and estimates need calibration. Finishes are documented when a manufacturer reference is specified. Generic masonry and digital colours are used for visualization. Quantities must be verified before ordering."],
  ["Choix, joints, contours et géométrie exportés.","Selections, joints, trims and geometry exported."],
  ["Les retours A et E se rejoignent : réduisez-les pour conserver une enveloppe ouverte.","Returns A and E meet. Shorten them to keep an open profile."],
  [" Cotes des côtés modifiables (fractions acceptées)."," Editable side dimensions (fractions accepted)."],
  ["Nuancier du fabricant. Confirmer l’offre pour cette bobine et ce fini avant fabrication.","Manufacturer colour chart. Confirm availability for this coil and finish before fabrication."],
  ["Aperçu métal neutre. Le nom et l’échantillon du fabricant ci-contre définissent la couleur choisie.","Neutral metal preview. The adjacent manufacturer name and sample identify the selected colour."],
  ["Quantité entière entre 1 et 999.","Whole-number quantity from 1 to 999."],
  ["MIR — Pliages sur mesure","MIR — Custom metal bends"],
  ["Liste de préparation pour l’atelier","Workshop preparation list"],
  ["Cotes extérieures. Angles de 90°.","Outside dimensions. 90° angles."],
  ["Rayon, développé réel et minimums de pliage à valider par l’atelier.","The workshop must confirm bend radii, actual developed length and minimum bends."],
  ["Aucun repère ajouté.","No reference added."]
);

entries.push(
  ["Votre cote","Your dimension"],
  ["illustration du modèle","template illustration"],
  ["cotes de la pièce finie","finished-piece dimensions"],
  ["À saisir","To enter"],
  ["Placez au moins trois points pour créer deux côtés.","Place at least three points to draw two sides."],
  ["Ajoutez un côté ou terminez le dessin.","Add a side or finish the drawing."],
  ["Annulez le dernier point et réessayez.","Undo the last point and try again."],
  ["la mesure","the measurement"],
  ["Corrige la mesure avant de choisir sa fraction.","Correct the measurement before choosing its fraction."],
  ["Les 10 modèles MIR","The 10 MIR templates"],
  ["Créer une moulure","Create a trim piece"],
  ["ATELIER MIR","MIR WORKSHOP"],
  ["Trace librement ta moulure, puis choisis si elle doit rejoindre la boutique.","Draw your trim piece, then decide whether to include it in the shop."],
  ["Tracez et configurez vos panneaux architecturaux sur mesure.","Draw and configure your custom architectural panels."],
  ["PANNEAU MÉTALLIQUE","METAL PANEL"],
  ["Magasin employés","Employee store"],
  ["Ce modèle est invalide.","This template is invalid."],
  ["Ce modèle n’est pas proposé dans ce catalogue.","This template is not offered in this catalogue."],
  ["Le choix de couleur du magasin est indisponible.","The store's colour options are unavailable."],
  ["La couleur fixée ne correspond pas au métal du fabricant. Demande une correction du modèle à l’admin.","The locked colour does not match the manufacturer's metal. Ask MIR to correct this template."],
  ["Profil dessiné","Drawn profile"],
  ["Profil personnalisé","Custom profile"],
  ["Mon modèle MIR","My MIR template"],
  ["Moulure dessinée","Drawn trim piece"],
  ["la couleur choisie au dessin","the colour selected in the drawing"],
  ["Nouvelle version de la moulure","New trim-piece version"],
  ["Enregistrer cette moulure","Save this trim piece"],
  ["La forme dessinée est conservée avec ses angles. La boutique est facultative; aucune vente ni publication serveur automatique.","Your drawing and angles are preserved. Adding it to the shop is optional; no sale or server publication is automatic."],
  ["DEMANDE LOCALE","LOCAL REQUEST"],
  ["Projet à nommer","Project needs a name"],
  ["Couleur personnalisée : aucun prix automatique. ","Custom colour: no automatic pricing. "],
  ["Corrigez la géométrie des panneaux signalés avant de préparer la demande.","Correct the geometry of flagged panels before preparing the request."],
  ["Cette version de la demande est déjà préparée sur cet appareil.","This version of the request is already prepared on this device."],
  ["Votre demande de soumission est préparée.","Your quote request is ready."],
  ["Votre demande est préparée.","Your request is ready."],
  ["Les pièces et les dessins sont conservés ensemble. Dans cet aperçu, la demande est disponible uniquement sur ce navigateur.","Pieces and drawings are saved together. In this preview, the request is available only in this browser."],
  ["Demande locale","Local request"],
  ["Reprendre cette demande ?","Resume this request?"],
  ["Le dossier actuel sera conservé dans Bons en cours. La demande s’ouvrira dans un dossier séparé.","The current file will remain under Open orders. This request will open in a separate file."],
  ["Référence du client : ","Customer reference: "],
  ["Demande ouverte. Tes autres bons sont conservés.","Request opened. Your other orders are preserved."],
  ["Corrigez les lips des panneaux signalés avant de produire le PDF. Le dossier JSON reste disponible.","Correct the lips on flagged panels before exporting PDF. The JSON file remains available."],
  ["Préparation du dossier de soumission…","Preparing the quote request file…"],
  ["MIR — Demande de soumission","MIR — Quote request"],
  ["MIR — Dossier de fabrication","MIR — Fabrication file"],
  ["Pièces sur mesure · validation par MIR","Custom pieces · MIR approval required"],
  ["Pièces sur mesure · dossier à valider","Custom pieces · file to review"],
  ["Export impossible : ","Unable to export: "],
  ["Sens du retour","Hem direction"],
  ["la gauche","the left"],
  ["la droite","the right"],
  [" vers la gauche"," to the left"],
  [" vers la droite"," to the right"],
  ["De quel côté replier le bord ?","Which direction should the edge fold?"],
  ["Le trait vert indique le retour sur la moulure.","The green line indicates the hem on the trim piece."],
  ["Sauvegarde de modèles indisponible.","Unable to save templates."],
  ["Fichier de modèles invalide.","Invalid template file."],
  ["Import impossible : ","Unable to import: "],
  ["Complète les cotes avant d’ajouter un retour écrasé.","Complete the dimensions before adding a flattened hem."],
  ["Le profil contient déjà 26 côtés.","This profile already has 26 sides."],
  ["Ajouter un retour écrasé","Add a flattened hem"],
  ["Choisis l’extrémité et la longueur, puis compare les deux aperçus 3D du métal replié.","Choose the edge and length, then compare both 3D previews of the folded metal."],
  ["Maximum 26 côtés.","Maximum 26 sides."],
  ["Dessin mis à jour. Enregistrez pour réviser la pièce du dossier.","Drawing updated. Save it to revise the piece in your project file."],
  ["Cette cote est verrouillée par le modèle.","This dimension is locked by the template."],
  ["Le moteur MIR conserve les angles et les autres longueurs. La pièce enregistrée reste inchangée tant que vous ne l’enregistrez pas.","The MIR engine preserves angles and other lengths. The saved piece stays unchanged until you save."],
  ["Cette cote est verrouillée.","This dimension is locked."],
  ["Entrez une cote positive. La valeur précédente est conservée.","Enter a positive dimension. The previous value is preserved."],
  ["Cette cote est impossible. La valeur précédente est conservée.","This dimension is invalid. The previous value is preserved."],
  ["Carré : cette cote ajuste ensemble A et B. Les lips sont inclus dans le hors tout.","Square: this dimension adjusts A and B together. Lips are included in the overall size."],
  ["Les autres cotes restent conservées. Les lips sont inclus dans A et B.","Other dimensions are preserved. Lips are included in A and B."],
  ["Les lèvres sont verrouillées par le modèle.","Lips are locked by the template."],
  ["Le lip de ce côté est indépendant des autres.","This side's lip is independent of the others."],
  ["Entrez une cote positive. La mesure précédente est conservée.","Enter a positive dimension. The previous measurement is preserved."],
  ["La perforation concerne le côté du bas. Choisissez ce côté comme bas.","Perforation applies to the bottom edge. Select that edge as the bottom."],
  ["Cette cote ne permet pas de construire les lèvres. La mesure précédente est conservée.","This dimension does not allow the lips to be fabricated. The previous measurement is preserved."],
  ["Cote appliquée au dessin. Enregistrez la pièce pour mettre à jour le dossier.","Dimension applied to the drawing. Save the piece to update the project file."],
  ["Ce brouillon ne peut pas être repris avec cet accès.","You cannot resume this draft with this access."],
  ["Ce brouillon contient déjà une autre version. Créez une nouvelle demande.","This draft already contains another version. Create a new request."],
  ["Cette demande est déjà en cours. Réessayez le même brouillon.","This request is already being processed. Retry the same draft."],
  ["Les fichiers de cette tentative ont été refusés. Créez une nouvelle demande.","The files in this attempt were rejected. Create a new request."],
  ["MIR doit vérifier la transmission précédente avant tout nouvel envoi.","MIR must verify the previous submission before another attempt."],
  ["L’espace gratuit réservé aux estimations est atteint. Votre brouillon reste sur cet appareil.","The available estimate storage limit has been reached. Your draft remains on this device."],
  ["Le stockage des estimations doit être vérifié par MIR. Brouillon conservé.","MIR must check estimate storage. Your draft is saved."],
  ["La limite de consultation gratuite est atteinte. Réessayez plus tard.","The viewing limit has been reached. Try again later."],
  ["La limite quotidienne du service est atteinte. Reprenez votre brouillon plus tard.","The daily service limit has been reached. Resume your draft later."],
  ["La limite mensuelle du service est atteinte. Votre brouillon est conservé.","The monthly service limit has been reached. Your draft is saved."],
  ["Demande introuvable.","Request not found."],
  ["Le résumé transmis dépasse la taille permise.","The submitted summary exceeds the permitted size."],
  ["La demande transmise est illisible.","The submitted request could not be read."],
  ["Le bloc de fichier est vide.","The file upload block is empty."],
  ["Le bloc de téléversement dépasse 6 Mio.","The upload block exceeds 6 MiB."],
  ["La clé de reprise du brouillon est manquante.","The draft resume key is missing."]
);

entries.push(
  ["Mon compte — Les Revêtements MIR","My account — Les Revêtements MIR"],
  ["Mon compte MIR","My MIR account"],
  ["MON COMPTE MIR","MY MIR ACCOUNT"],
  ["Mon compte client","My customer account"],
  ["Activer mon compte","Activate my account"],
  ["Vos commandes, leur suivi et vos adresses. Le catalogue et le panier restent accessibles sans compte.","Track your orders and manage your addresses. The catalogue and cart are available without an account."],
  ["Choisir mon nouveau mot de passe","Choose my new password"],
  ["Nouveau mot de passe","New password"],
  ["Mot de passe","Password"],
  ["Afficher le mot de passe","Show password"],
  ["Au moins 12 caractères. Utilisez une phrase facile à retenir.","At least 12 characters. Use an easy-to-remember passphrase."],
  ["Définissez votre mot de passe avant d’ouvrir votre compte. Votre panier est conservé.","Set your password before opening your account. Your cart will be preserved."],
  ["Enregistrer mon mot de passe","Save my password"],
  ["Annuler et me déconnecter","Cancel and sign out"],
  ["Vérification du lien","Verifying link"],
  ["Nous vérifions ce lien avant d’ouvrir votre compte.","We are verifying this link before opening your account."],
  ["Vérification…","Verifying…"],
  ["Valider mon lien","Confirm my link"],
  ["Cette invitation donne accès uniquement aux chantiers attribués par MIR.","This invitation grants access only to jobsites assigned by MIR."],
  ["Connecté avec","Signed in as"],
  ["Définir mon mot de passe","Set my password"],
  ["Utiliser un autre compte","Use another account"],
  ["Retour à Mon compte","Back to My account"],
  ["Vérification de votre compte…","Checking your account…"],
  ["Connexion en attente","Sign-in not yet available"],
  ["L’espace équipe n’est pas encore ouvert. Votre panier reste conservé.","The team portal is not yet available. Your cart is preserved."],
  ["Votre accès reste à confirmer","Access requires confirmation"],
  ["Votre identité est reconnue. MIR doit confirmer les accès internes ; l’inscription publique ne donne jamais de droit employé, Boss ou entrepôt.","Your identity was recognized. MIR must confirm internal access; public registration never grants Employee, Boss or Warehouse permissions."],
  ["Réessayer","Try again"],
  ["Déconnexion","Sign out"],
  ["Vous êtes invité à rejoindre Les Revêtements MIR","You have been invited to join Les Revêtements MIR"],
  ["Utilisez exactement le courriel invité. Aucun rôle ni chantier à choisir : vos accès sont validés par le serveur.","Use the invited email address. No roles or jobsites to select: your access is validated by the server."],
  ["Courriel invité","Invited email"],
  ["Créer et activer mon accès invité","Create and activate my invited access"],
  ["J’ai déjà un compte MIR","I already have a MIR account"],
  ["Mot de passe oublié","Forgot password"],
  ["Recevez un lien pour choisir un nouveau mot de passe.","Receive a link to choose a new password."],
  ["Courriel","Email"],
  ["Envoyer le lien de récupération","Send recovery link"],
  ["Retour à la connexion","Back to sign in"],
  ["Créer un compte client","Create a customer account"],
  ["Confirmez votre adresse courriel pour retrouver votre commande. Les accès de l’équipe sont attribués par MIR.","Confirm your email to access your order. Team permissions are granted by MIR."],
  ["Ajouter mon adresse de livraison au Québec","Add my Québec delivery address"],
  ["La rue, la ville et le code postal servent à calculer la livraison avec Adresses Québec.","Street, city and postal code are used to calculate delivery with Adresses Québec."],
  ["Destinataire","Recipient"],
  ["Numéro civique et rue","Street number and name"],
  ["Appartement ou suite","Apartment or suite"],
  ["Ville","City"],
  ["Code postal","Postal code"],
  ["Les nouveaux comptes sont en cours d’activation. Votre panier est conservé. Communiquez avec MIR pour obtenir de l’aide.","New accounts are being activated. Your cart is preserved. Contact MIR for assistance."],
  ["J’ai déjà un compte","I already have an account"],
  ["Vérifiez votre courriel","Check your email"],
  ["Ouvrez le lien de confirmation reçu. Revenez ensuite à votre commande, sans l’envoyer automatiquement.","Open the confirmation link you received. Then return to your order without submitting it automatically."],
  ["Renvoyer la confirmation","Resend confirmation"],
  ["Connectez-vous avec l’adresse qui a reçu l’invitation MIR. Vous pourrez ensuite activer votre accès.","Sign in with the email address that received the MIR invitation. You can then activate your access."],
  ["Continuer avec Google","Continue with Google"],
  ["Google est en cours de configuration. Utilisez votre courriel et votre mot de passe.","Google sign-in is being configured. Use your email and password."],
  ["Créer mon accès invité avec un mot de passe","Create my invited access with a password"],
  ["ou avec votre courriel","or with your email"],
  ["Connexion…","Signing in…"],
  ["Me connecter","Sign in"],
  ["Retour à mon panier","Back to my cart"],
  ["Client","Customer"],
  ["Mon compte","My account"],
  ["Brouillon","Draft"],
  ["Validée","Validated"],
  ["À confirmer","To confirm"],
  ["Envoyée","Sent"],
  ["Expédiée","Shipped"],
  ["Livrée","Delivered"],
  ["Annulée","Cancelled"],
  ["Statut mis à jour","Status updated"],
  ["Aucune commande enregistrée","No orders recorded"],
  ["Votre panier est conservé. Une sélection n’est pas encore une commande.","Your cart is preserved. A selection is not yet an order."],
  ["Revoir mon panier","Review my cart"],
  ["Adresse de livraison","Delivery address"],
  ["Supprimer cette adresse","Delete this address"],
  ["Aucune adresse enregistrée.","No addresses saved."],
  ["Ajouter une adresse de livraison","Add a delivery address"],
  ["Nom de l’adresse","Address label"],
  ["Maison, chantier…","Home, jobsite…"],
  ["Adresse","Address"],
  ["Province","Province"],
  ["Pays","Country"],
  ["Enregistrer l’adresse","Save address"],
  ["Mes commandes","My orders"],
  ["Voir mes commandes","View my orders"],
  ["Mes adresses","My addresses"],
  ["Gérer mes adresses","Manage my addresses"],
  ["Adresses de livraison","Delivery addresses"],
  ["Vérifiez l’adresse ajoutée lors de votre inscription.","Check the address you added when registering."],
  ["Ajouter une adresse","Add an address"],
  ["Suivez vos commandes simplement.","Easily track your orders."],
  ["Retrouvez vos coordonnées et vos adresses de livraison.","Review your contact details and delivery addresses."],
  ["Aperçu","Overview"],
  ["Besoin de finaliser une sélection? Reprenez votre panier ou demandez de l’aide à MIR.","Need to finish a selection? Resume your cart or ask MIR for help."],
  ["Reprendre mon panier","Resume my cart"],
  ["Votre accès MIR est activé.","Your MIR access has been activated."],
  ["Adresse supprimée.","Address deleted."],
  ["Supprimer cette adresse de votre compte ?","Delete this address from your account?"],
  ["Mes commandes et adresses dans Mon compte","My orders and addresses in My account"],
  ["La prise de commande et le paiement en ligne ne sont pas encore raccordés à cette sélection. Conservez votre PDF ou votre liste et faites confirmer les prix, les disponibilités et la livraison par MIR.","Checkout and online payment are not yet connected to this selection. Keep your PDF or list and ask MIR to confirm pricing, availability and delivery."],
  ["Panier conservé. Vérification uniquement, sans envoi automatique.","Cart preserved. Review only, with no automatic submission."],
  ["Votre accès n’a pas pu être vérifié. Ouvrez Mon compte pour réessayer.","Your access could not be verified. Open My account and try again."],
  ["Ce compte appartient à l’équipe MIR. Votre sélection reste conservée ; utilisez votre compte client pour la commande boutique.","This is a MIR team account. Your selection is preserved. Use your customer account for the shop order."],
  ["Votre panier est prêt à vérifier","Your cart is ready to review"],
  ["Impossible de vérifier le compte. Votre panier reste conservé.","Unable to verify your account. Your cart is preserved."],
  ["Votre quotidien","Your daily work"]
);

entries.push(
["Revêtements extérieurs, réalisations et moulures sur mesure à Québec. Découvrez les matériaux et préparez vos idées de façade avec Les Revêtements MIR.","Exterior siding, completed projects and custom metal trim in Québec City. Explore materials and prepare exterior ideas with Les Revêtements MIR."],
["Explorez les revêtements et les matériaux documentés chez Les Revêtements MIR, comparez les fabricants et préparez votre sélection.","Explore documented siding and building materials from Les Revêtements MIR, compare manufacturers and prepare your selection."],
["Explorez les profils, les finis, les couleurs et les documents des fabricants de revêtement.","Explore siding profiles, finishes, colours and manufacturer documents."],
["Consultez les dimensions, finis et références des matériaux présentés par Les Revêtements MIR. Prix et disponibilité à confirmer.","Review dimensions, finishes and material references from Les Revêtements MIR. Prices and availability subject to confirmation."],
["Retrouvez votre sélection de matériaux MIR, ajustez les quantités et préparez une liste pour votre projet. Il ne s'agit pas d'une commande.","Review your MIR materials selection, adjust quantities and prepare a project list. This is not an order."],
["Retrouvez votre sélection de matériaux MIR, ajustez les quantités et préparez une liste pour votre projet. Il ne s&#39;agit pas d&#39;une commande.","Review your MIR materials selection, adjust quantities and prepare a project list. This is not an order."],
["Configurez les dimensions de vos J, L, fascias, cache-poutres et enveloppes de colonnes.","Configure J-channels, L-shaped trim, fascia, beam covers and column wraps to your dimensions."],
["Communiquez avec Les Revêtements MIR à Québec pour une estimation, des revêtements extérieurs ou du pliage sur mesure.","Contact Les Revêtements MIR in Québec City for an estimate, exterior siding or custom metal bending."],
["Découvrez les réalisations des Revêtements MIR, dont un projet au cœur du centre-ville de Québec : brique traditionnelle, revêtement métallique et détails architecturaux.","Explore projects by Les Revêtements MIR, including a downtown Québec City building with traditional brick, metal siding and architectural details."],
["Dessinez vos pliages et configurez vos panneaux métalliques, avec cotes, couleur et dossier de préparation pour l’atelier MIR.","Draw custom bent-metal profiles and configure metal panels with dimensions, colours and a workshop preparation file."],
["Préparez votre demande d’estimation MIR avec vos coordonnées, votre adresse de chantier et vos plans PDF facultatifs.","Prepare a MIR estimate request with your contact information, project address and optional PDF plans."],
["Explorez des matières et des teintes génériques sur une maison de démonstration en trois dimensions.","Explore generic materials and colours on a three-dimensional demonstration home."],
["Pièces sur mesure — L’atelier MIR","Custom pieces — MIR workshop"],
["MIR — Votre projet, matière par matière","MIR — Your project, material by material"],
["Mon compte — Les Revêtements MIR","My account — Les Revêtements MIR"]
);

entries.push(
["Choisir le format","Choose a size"],
["Visuel fabricant à compléter","Manufacturer image to be added"],
["Photo MIR de cette couleur à venir · consulter le nuancier.","MIR photo of this colour to come · consult the colour chart."],
["Aperçu indisponible","Preview unavailable"],
["Choisir ce matériau","Select this material"],
["Photo à venir","Photo coming soon"],
["Rétablir la dernière","Restore previous"],
["Enregistrer","Save"],
["Cette référence est introuvable.","This reference could not be found."],
["Revenir à la boutique →","Back to the shop →"],
["Échantillon choisi","Selected sample"],
["Quantité souhaitée","Requested quantity"],
["Unité du besoin","Required unit"],
["La matière, en détail.","Material details."],
["Dimensions physiques et exposition utile sont distinctes. Les besoins saisis ne sont pas convertis automatiquement en boîtes ou en pièces livrables.","Physical dimensions and coverage are different. Entered needs are not automatically converted into boxes or deliverable units."],
["Les documents qui comptent.","Key documents."],
["Les documents exacts de cette référence restent à compléter.","The exact documents for this reference are still to be added."],
["Préparer la fiche MIR ↓","Prepare MIR product sheet ↓"],
["La fiche MIR rassemble les renseignements référencés. Les documents originaux du fabricant demeurent la référence pour la pose et les garanties.","The MIR product sheet collects documented information. Original manufacturer documents remain the authority for installation and warranties."],
["Échantillon et sources","Sample and sources"],
["Ajouté au panier","Added to cart"],
["Choisir la couleur","Choose a colour"],
["Votre panier est vide.","Your cart is empty."],
["Découvrir les matériaux →","Discover materials →"],
["Les quantités exprimées en pi², en pieds linéaires ou en pièces restent séparées. L’équipe MIR pourra préciser le conditionnement et les accessoires compatibles.","Square-foot, linear-foot and piece quantities remain separate. MIR can confirm packaging and compatible accessories."],
["Nom vérifié · aperçu à venir","Verified name · preview coming soon"],
["Teintes du nuancier documenté; la disponibilité du fini et de la couleur pour cette référence reste à confirmer. L’écran ne remplace pas l’échantillon physique.","Colours from the documented chart; availability of the finish and colour for this reference still needs confirmation. A screen cannot replace a physical sample."],
["Aucune teinte non vérifiée n’est ajoutée à cette référence. Consultez le nuancier officiel ci-dessous.","No unverified colours are added to this reference. Consult the official colour chart below."],
["Documents propres à cette référence à compléter.","Documents for this exact reference still need to be added."],
["À savoir sur cette référence","About this reference"],
["Indiquez les mesures de chaque côté.","Enter the measurements for each side."],
["Produit et épaisseur à confirmer","Product and thickness to confirm"],
["linéaires","linear ft"],
["Solage repéré sur le PDF","Foundation detected on PDF"],
["composantes détectées","detected components"],
["Référence à compléter","Reference to complete"],
["Aucun produit vérifié associé","No verified product linked"],
["Finition à confirmer","Finish to confirm"],
["Format fournisseur à confirmer","Supplier size to confirm"],
["Format physique fournisseur à confirmer. Aucun contrôle de découpe dans un panneau supposé n’est validé.","Supplier stock dimensions need confirmation. No cutting on an assumed panel has been approved."],
["Joint de longueur à prévoir","Length joint to plan"],
["Aspect non spécifié","Appearance not specified"],
["Pose à confirmer","Installation direction to confirm"],
["Aucune fiche ne correspond à cette recherche.","No product sheets match this search."],
["Unité","Unit"],
["Exposition indiquée","Stated exposure"],
["La disponibilité, le prix, l’unité de vente MIR et les conditions du chantier restent à confirmer.","MIR availability, price, selling unit and jobsite conditions still need confirmation."],
["Documentation du matériau","Material documents"],
["Aucun document disponible pour cette référence. Consultez la source officielle ou demandez la fiche à MIR.","No documents available for this reference. Consult the official source or ask MIR for a datasheet."],
["Finitions issues des ressources du fabricant. Association exacte au profil et disponibilité locale à confirmer; une image de nuancier ne constitue pas une valeur colorimétrique.","Finishes come from manufacturer resources. Their suitability for this profile and local availability still need confirmation; a colour chart image is not a measured colour value."],
["Le nuancier exact de cette référence reste à associer. Le dessin conserve un aperçu neutre tant qu’aucune couleur numérique documentée n’est associée.","The exact colour chart for this reference still needs linking. The drawing retains a neutral preview until a documented digital colour is assigned."],
["Les couleurs à l’écran ne remplacent pas un échantillon physique.","On-screen colours do not replace a physical sample."],
["Points à vérifier","Items to verify"],
["Vos coordonnées et votre chantier","Your contact details and jobsite"],
["Téléphone (facultatif)","Phone (optional)"],
["Note pour l’équipe (facultatif)","Note for the MIR team (optional)"],
["Ajouter des plans PDF (facultatifs)","Add PDF plans (optional)"],
["Vérifiez votre demande","Review your request"],
["Vos plans et la version soumise du projet sont réservés à l’équipe MIR. La copie enregistrée ne suivra pas vos modifications ultérieures dans le Studio.","Your plans and the submitted project version are accessible only to the MIR team. The saved copy will not reflect later changes in your Studio."],
["PRIX CALCULÉ SUR 10 PI","PRICE CALCULATED PER 10 FT"],
["Avant taxes et livraison. Ajustez la quantité dans votre dossier.","Before taxes and delivery. Adjust the quantity in your project file."],
["Surface de la forme hors tout, lips inclus. Projection C non ajoutée. Taxes et livraison non calculées; fini et fabrication à confirmer.","Overall shape area, including lips. Projection C is not added. Taxes and delivery are not calculated; finish and fabrication need confirmation."],
["Mes modèles","My templates"],
["Préparer ma demande ↗","Prepare my request ↗"],
["Ajouter deux angles","Add two bends"],
["Modifier les angles et les côtés","Edit angles and sides"],
["Montée du haut","Top rise"],
["Montée = portée horizontale × X/12. Les mesures exactes restent visibles.","Rise = horizontal run × X/12. Exact dimensions remain visible."],
["A est la largeur hors tout. Le décalage reste distinct de la longueur de base.","A is the overall width. The offset is separate from the base length."],
["Côté terminé en pointe","Pointed end"],
["Ajouter un double pli (retour écrasé)","Add a flattened double bend"],
["Ajouter deux angles consécutifs","Add two consecutive bends"],
["Pièce plate · projection C = 0","Flat piece · projection C = 0"],
["Cote fixe du modèle MIR","Fixed MIR template dimension"],
["Mesure fixe du magasin MIR","Fixed MIR store measurement"],
["Angle intérieur","Interior angle"],
["Rotation signée","Signed rotation"],
["Retour écrasé 180°","180° flattened hem"],
["Le liseré indique la face colorée. Suivez A, puis B, C… pour définir le sens.","The outline identifies the coloured face. Follow A, B, C… to determine direction."],
["Coin J intégré : entrez toutes les cotes pour vérifier le clouage minimum.","Integrated J-corner: enter all dimensions to verify minimum fastening allowance."],
["Garder quand même","Keep anyway"],
["Choisir le côté","Choose a side"],
["À gauche du tracé","To the left of the outline"],
["À droite du tracé","To the right of the outline"],
["Repère sur le côté","Reference on the side"],
["Les cotes A/B sont HORS TOUT de fabrication. Les lèvres restent à l'intérieur du hors tout; elles ne sont jamais ajoutées deux fois.","A/B are the overall fabrication dimensions. Lips are included in the overall dimensions and are never added twice."],
["Sans repli · tous les lips à 0","No folds · all lips set to 0"],
["Lip commun à tous les côtés","Same lip on every side"],
["Lip de chaque côté, y compris sans lip (0)","Individual lips by side, including none (0)"],
["Fermez d’abord le dessin pour identifier les côtés.","Close the drawing first to identify its sides."],
["Quel côté est en bas après pose ?","Which edge is on the bottom after installation?"],
["Choisir le bas","Choose the bottom"],
["Le côté choisi est repéré en bleu sur le dessin.","The selected edge is marked in blue on the drawing."],
["Détail ou référence de perforation","Perforation details or reference"],
["Le motif exact doit être confirmé par l’atelier.","The exact pattern must be confirmed by the workshop."],
["Choisir le fabricant et le produit","Choose manufacturer and product"],
["Rechercher une teinte du fabricant","Search manufacturer colours"],
["Rechercher un code RAL Classic","Search RAL Classic codes"],
["Choisir un code RAL","Choose a RAL code"],
["Cette référence est une demande spéciale à faire confirmer. Aucun équivalent fabricant ni teinte numérique n’est inventé.","This is a special request that requires confirmation. No manufacturer equivalent or digital colour is invented."],
["Aucune teinte documentée pour cette référence. Choisissez une référence spéciale à confirmer.","No documented colours for this reference. Choose a special reference requiring confirmation."],
["Choisissez d’abord le matériau pour consulter son nuancier.","Choose a material first to view its colour chart."],
["La teinte reste à choisir.","A colour still needs to be selected."],
["Choisissez une référence précise pour votre pièce.","Choose an exact reference for your piece."],
["MODÈLE ILLUSTRATIF · LES COTES RESTENT À SAISIR","ILLUSTRATIVE TEMPLATE · DIMENSIONS STILL REQUIRED"],
["VOLUME SCHÉMATIQUE · GLISSEZ POUR TOURNER","SCHEMATIC VOLUME · DRAG TO ROTATE"],
["Clique ou glisse pour les sommets · Maj = 90° · cote après le dessin.","Click or drag to place vertices · Shift = 90° · set dimensions after drawing."],
["Comme une moulure · 2D/3D synchronisés · sans lip possible.","Like a trim profile · synchronized 2D/3D · optional lips."],
["Ajouter ce point","Add this point"],
["Nouveau tracé","New outline"],
["Échelle de la grille","Grid scale"],
["Plein écran","Full screen"],
["Réglages du tracé","Drawing settings"],
["Supprimer le tracé","Delete outline"],
["Désactivée","Disabled"],
["Clique-glisse et relâche pour ajouter un côté. Shift verrouille à 90°. Pour un double pli, reviens presque sur le trait précédent.","Click, drag and release to add a side. Hold Shift to lock 90°. For a double bend, return close to the previous segment."],
["Ajouter un double pli","Add a double bend"],
["Supprimer la pièce en cours","Remove current piece"],
["Reprendre le tracé","Resume drawing"],
["FORME GÉNÉRIQUE · HORS DES 10 MODÈLES","GENERIC SHAPE · NOT ONE OF THE 10 TEMPLATES"],
["Votre pièce.","Your piece."],
["À vos","Made to your"],
["Modifier les cotes et les lèvres","Edit dimensions and lips"],
["même géométrie","same geometry"],
["Face nette hors lèvres","Net face excluding lips"],
["Les lèvres sont comprises dans le hors tout, jamais ajoutées au calcul. Pour les rampants, la face nette est la boîte englobante du contour avant.","Lips are included in the overall size, never added again. On sloped pieces, the net face uses the bounding box of the front outline."],
["Enregistrer la révision","Save revision"],
["Ajouter à ma soumission","Add to my quote request"],
["Ajouter au dossier","Add to project file"],
["Enregistrer dans mon dossier","Save in my project file"],
["Modèle paramétrique sans cotes de commande.","Parametric template without order dimensions."],
["Les proportions de ce croquis servent à reconnaître la pièce. Les dimensions seront obligatoires à la commande.","This sketch illustrates the piece. Dimensions are required when ordering."],
["Le dessin est prêt, la fiche reste à compléter.","The drawing is ready, but the product sheet is incomplete."],
["Voir les précisions à confirmer","View details to confirm"],
["À vérifier avec l’atelier","To verify with the workshop"],
["Les cotes et les options sont renseignées.","Dimensions and options have been entered."],
["La validation de fabrication reste à faire par l’atelier.","The workshop still needs to approve fabrication."],
["Votre cote","Your dimension"],
["Mesure fixe","Fixed measurement"]
);

// Customer-facing FAQ and support copy. Staff-only views remain outside the locale runtime.
entries.push(
["Centre d’aide MIR","MIR Help Centre"],
["Aide et soutien","Help and support"],
["Commande","Order"],
["Produit","Product"],
["Autre","Other"],
["Tous les sujets","All topics"],
["Comment demander une estimation?","How do I request an estimate?"],
["Ouvrez Demander une estimation, décrivez votre projet et joignez vos photos ou documents. Vous pourrez vérifier le résumé avant l’envoi.","Open Request an estimate, describe your project and attach photos or documents. You can review the summary before submitting."],
["Où voir mes commandes?","Where can I see my orders?"],
["Connectez-vous à Mon compte, puis ouvrez Commandes. Vous y verrez le statut et les mises à jour disponibles.","Sign in to My account and open Orders to view available status and updates."],
["Comment retrouver mon panier?","How do I find my cart?"],
["Le bouton Mon panier dans l’en-tête ouvre votre sélection conservée sur cet appareil.","The My cart button in the header opens your selection saved on this device."],
["Je n’arrive pas à me connecter. Que faire?","I cannot sign in. What should I do?"],
["Utilisez Mot de passe oublié sur la page Mon compte. Si le problème continue, communiquez avec MIR depuis la page Nous joindre.","Use Forgot password on the My account page. If the issue continues, contact MIR using the Contact us page."],
["Résolue","Resolved"],
["Réponse reçue","Reply received"],
["En attente","Pending"],
["Aucune demande","No requests"],
["Vos demandes et leur suivi apparaîtront ici.","Your requests and their status will appear here."],
["← Toutes les demandes","← All requests"],
["Note interne · invisible au client","Internal note · hidden from customers"],
["Répondre au client","Reply to customer"],
["Ajouter un message","Add a message"],
["Note interne — invisible au client","Internal note — hidden from customers"],
["Ajouter une photo ou un PDF","Add a photo or PDF"],
["Envoyer","Send"],
["Centre d’aide","Help Centre"],
["Hors ligne · les réponses déjà affichées restent lisibles. L’envoi est désactivé; la pièce jointe devra être choisie de nouveau.","Offline · previously displayed answers are still available. Sending is disabled; select your attachment again when online."],
["Rechercher une réponse","Search for an answer"],
["Rechercher","Search"],
["Chercher","Search"],
["Tout","All"],
["Impossible de charger","Unable to load"],
["Chargement","Loading"],
["Ouverture du Centre d’aide…","Opening the Help Centre…"],
["Procédure","Procedure"],
["FAQ","FAQ"],
["Aucun résultat","No results"],
["Essayez un autre mot ou une autre catégorie.","Try another search term or category."],
["Soutien client","Customer support"],
["Demander de l’aide","Request help"],
["Demandes autorisées et notes internes.","Authorized requests and internal notes."],
["Décrivez simplement votre besoin; l’équipe MIR vous répondra.","Describe your needs and the MIR team will respond."],
["Choisir une catégorie","Choose a category"],
["Sujet","Subject"],
["Que pouvons-nous faire pour vous?","How can we help you?"],
["Photo ou PDF (facultatif)","Photo or PDF (optional)"],
["Envoyer ma demande","Send my request"],
["Demandes reçues","Received requests"],
["Mes demandes","My requests"],
["Besoin d’aide personnalisée?","Need personalized help?"],
["Connectez-vous pour écrire à MIR et suivre votre demande. La FAQ reste accessible sans compte.","Sign in to contact MIR and track your request. The FAQ remains available without an account."],
["Me connecter","Sign in"],
["Les réponses essentielles sont disponibles. Le contenu détaillé sera chargé dès que le service répondra.","Essential answers are available. Detailed content will load when the service responds."],
["Le service est momentanément indisponible. Les réponses essentielles restent accessibles.","The service is temporarily unavailable. Essential answers remain available."],
["L’envoi a échoué; votre texte reste dans le formulaire.","Sending failed; your text remains in the form."],
["Réessayer","Try again"],
["Statut mis à jour","Status updated"],
["Fermer","Close"],
["Ouvrir mon panier","Open my cart"],
["Mon panier","My cart"],
["Demander une estimation","Request an estimate"]
);

entries.push(
["Image temporairement indisponible.","Image temporarily unavailable."],
["Voir la collection","View collection"],
["Explorer","Explore"],
["LA COLLECTION","THE COLLECTION"],
["Exporter JSON","Export JSON"],
["Quitter","Exit"],
["Annotation","Annotation"],
["Note","Note"],
["Annuler","Cancel"],
["Supprimer","Delete"],
["Configurer mon panneau","Configure my panel"],
["Configuration indisponible","Configuration unavailable"],
["Ajouter au panier","Add to cart"],
["Configurer ce produit →","Configure this product →"],
["Essayer ce profil dans le studio →","Try this profile in the Studio →"],
["Configurer un pliage →","Configure a custom bend →"],
["Photo du profil","Profile photo"],
["Nuancier fabricant →","Manufacturer colour chart →"],
["Sur le plan →","On the plan →"],
["Couleurs et documents","Colours and documents"],
["Ouvrir la fiche produit ↗","Open product details ↗"],
["Hors boutique · documentation","Not for sale · documentation only"],
["Dimensions et pose","Dimensions and installation"],
["Documentation","Documentation"],
["Consulter le fabricant ↗","Visit manufacturer ↗"],
["Documentation fabricant","Manufacturer documentation"],
["Centre de documentation · sélectionner la référence","Documentation centre · select the exact reference"],
["Document de gamme / système","Product-line / system document"],
["Document fabricant","Manufacturer document"],
["Consulter la page officielle ↗","View official page ↗"],
["Format & application","Size and application"],
["Code fabricant","Manufacturer code"],
["Ventilation","Ventilation"],
["Ventilé","Vented"],
["Plein","Solid"],
["Ventilation dissimulée","Concealed ventilation"],
["Référence spéciale","Special reference"],
["Code à confirmer","Code to confirm"],
["Contenu à confirmer","Content to confirm"],
["Nom du produit","Product name"],
["Consultez les dimensions et les documents de cette référence.","View dimensions and documentation for this reference."],
["Sélection documentée. Les options varient selon le profil, le fini et la région.","Documented selection. Options vary by profile, finish and region."],
["Rechargez la page pour réessayer.","Reload the page and try again."],
["Épaisseur","Thickness"],
["Ajouter à ma sélection","Add to my selection"],
["Choisir un fini","Choose a finish"],
["J à soffite · 12 pi","Soffit J-channel · 12 ft"],
["Retour inférieur","Bottom return"],
["Aile supérieure","Upper flange"],
["Aile inférieure","Lower flange"],
["Côté gauche","Left side"],
["Côté droit","Right side"],
["Le développé doit être validé par l’atelier; ces cotes dépassent la largeur publiée avant correction des plis.","The workshop must approve the developed length. These dimensions exceed the stated stock width before bend adjustments."],
["Le développé final dépend du rayon et des corrections de pliage.","Final developed length depends on bend radii and allowances."],
["intérieure","inside"],
["extérieure","outside"],
["Reprendre et valider dans mon dossier","Resume and verify in my project file"],
["Nom complet","Full name"],
["Adresse du chantier","Jobsite address"],
["Site web","Website"],
["Nouvelle demande","New request"],
["Matériau à confirmer","Material to confirm"],
["Format de dossier de fabrication inconnu.","Unknown fabrication-file format."],
["Pièce","Piece"],
["Ajoutez un matériau ou une moulure pour préparer votre dossier.","Add a material or trim piece to prepare your file."],
["Centre de ressources","Resource centre"],
["Gamme / système","Product line / system"],
["Dimension fabricant","Manufacturer dimension"],
["Dimension du fabricant","Manufacturer dimension"],
["candidats d’ouverture","opening candidates"],
["ouvertures revues","reviewed openings"],
["Finitions des fabricants","Manufacturer finishes"],
["Choisissez un fini","Choose a finish"],
["dimensions de pose","installation dimensions"],
["à l’échelle du plan","at plan scale"],
["Dimensions du fabricant ↗","Manufacturer dimensions ↗"],
["Les joints horizontaux sont les moulures de transition; modifiez-les dans « Joints & transitions ».","Horizontal joints are transition trims; edit them under Joints & transitions."],
["Aucun joint intérieur dans cette zone.","No interior joints in this area."],
["Format à confirmer. Vous pouvez placer des joints personnalisés.","Size to confirm. You can add custom joints."],
["autorisée","allowed"],
["désactivée","disabled"],
["Centre de documentation","Documentation centre"],
["Voir la fiche & les documents ↗","View product details and documents ↗"],
["Cette référence est indisponible.","This reference is unavailable."],
["Nuancier indisponible","Colour chart unavailable"],
["Source officielle","Official source"],
["échantillon physique","physical sample"],
["PRIX CALCULÉ SUR 10 PI","PRICE CALCULATED PER 10 FT"],
["par moulure","per trim piece"],
["par panneau","per panel"],
["Chargement du tarif MIR…","Loading MIR pricing…"],
["Prix à confirmer par MIR.","Price to be confirmed by MIR."],
["Tarif MIR temporairement indisponible.","MIR pricing temporarily unavailable."],
["Montant calculé du dossier","Calculated project amount"],
["Sous-total des pièces chiffrées","Subtotal of priced pieces"],
["Taxes et livraison non calculées.","Taxes and delivery not calculated."],
["Les pièces de couleur personnalisée restent sur soumission; aucun total global n’est calculé.","Custom-colour pieces require a quote; no overall total is calculated."],
["Certaines pièces restent à chiffrer; aucun total global n’est calculé.","Some pieces still need pricing; no overall total is calculated."],
["Demandes clients","Customer requests"],
["Le prix sera calculé lorsque la géométrie sera valide.","The price will be calculated when the geometry is valid."],
["Complétez votre panneau pour voir son prix.","Complete your panel to see its price."],
["Choisissez les dimensions et une couleur du fabricant.","Choose dimensions and a manufacturer colour."],
["Corrigez les dimensions des lips.","Correct the lip dimensions."],
["Proportion du segment","Segment proportion"],
["Longueur du côté","Side length"],
["Longueur de vente","Selling length"],
["Sommet depuis la gauche","Peak from the left"],
["Pente de toiture X/12","Roof slope X/12"],
["Vers la droite","To the right"],
["Vers la gauche","To the left"],
["Angle droit","Right angle"],
["↔ Miroir gauche / droite","↔ Mirror left / right"],
["Vue inversée","Mirrored view"],
["Vue d’origine","Original view"],
["Largeur du haut","Top width"],
["Décalage du haut à gauche","Top offset from left"],
["Décalage du haut (+ droite / − gauche)","Top offset (+ right / − left)"],
["Profondeur de la pointe","Tip depth"],
["Position du sommet sur ce côté","Peak position along this side"],
["Le signe de l’angle indique le sens de la rotation.","The angle sign indicates the direction of rotation."],
["Type du pli","Bend type"],
["Angle (°)","Angle (°)"],
["★ indique la face peinte.","★ indicates the painted side."],
["Clouage J insuffisant","Insufficient J-channel fastening allowance"],
["Corriger automatiquement","Correct automatically"],
["Choix textuel de la face","Painted-side text selection"],
["Sans lip","No lip"],
["Lips et face visible","Lips and visible face"],
["Entrez vos cotes pour voir la face nette, sans les lips.","Enter dimensions to view the net face without the lips."],
["Demander la perforation du bas","Request bottom-edge perforation"],
["Code de la couleur","Colour code"],
["Nuancier ou fabricant","Colour chart or manufacturer"],
["Code exact","Exact code"],
["Nom de la couleur","Colour name"],
["Références Unico publiées. La disponibilité du fini sur le calibre choisi reste à confirmer.","Published Unico references. Finish availability for the selected gauge remains to be confirmed."],
["Chaque échantillon appartient au nuancier de ce produit. L’offre sur votre pièce doit être confirmée.","Each swatch belongs to this product's colour chart. Confirm availability for your piece."],
["Aperçu écran indicatif. Valider la teinte demandée sur un nuancier physique avant fabrication.","Screen preview is indicative. Verify the requested colour using a physical chart before fabrication."],
["Source du fabricant ↗","Manufacturer source ↗"],
["MODÈLE MIR","MIR TEMPLATE"],
["Sommets","Vertices"],
["Le modèle MIR conserve ses dimensions et ses angles.","The MIR template preserves its dimensions and angles."],
["VOLUME 3D","3D VOLUME"],
["Vue 2D cotée","Dimensioned 2D view"],
["Volume 3D","3D volume"],
["Fini à confirmer","Finish to confirm"]
);

entries.push(
["DOSSIER DE PLIAGE","CUSTOM BENDING FILE"],
["Demande de soumission","Quote request"],
["Récapitulatif de pliage","Bending summary"],
["MATÉRIAU / FINI","MATERIAL / FINISH"],
["QUANTITÉ / LONGUEUR","QUANTITY / LENGTH"],
["COTES FINIES ET POINTS À VALIDER","FINISHED DIMENSIONS AND ITEMS TO VERIFY"],
["Soumission obligatoire","Quote required"],
["Disponibilité à confirmer","Availability to confirm"],
["Face 1 — côté indiqué par l’étoile","Face 1 — side marked by the star"],
["Face 2 — côté indiqué par l’étoile","Face 2 — side marked by the star"],
["La référence spéciale doit être confirmée par l’atelier et le fournisseur.","The special reference must be confirmed by the workshop and supplier."]
);
entries.push(
 ["Réglages","Settings"],
 ["Adresse enregistrée dans votre compte.","Address saved to your account."],
 ["Les Revêtements MIR · Mon compte","Les Revêtements MIR · My account"],
 ["Actualiser","Refresh"],
 ["Réglages du compte","Account settings"]
);
// Prestige client copy, 2026-11-17. Display labels only; source records are unchanged.
entries.push(...[
  [
    "Les matériaux",
    "Materials"
  ],
  [
    "Par fabricant",
    "By manufacturer"
  ],
  [
    "Tous les produits",
    "All products"
  ],
  [
    "Pliages sur mesure",
    "Custom metal bending"
  ],
  [
    "Mes demandes",
    "My requests"
  ],
  [
    "Pliages",
    "Metal bending"
  ],
  [
    "Demandes",
    "Requests"
  ],
  [
    "Navigation mobile principale",
    "Main mobile navigation"
  ],
  [
    "Navigation principale",
    "Main navigation"
  ],
  [
    "HardiePlank Select Cedarmill — 8¼ po",
    "HardiePlank Select Cedarmill — 8¼ in"
  ],
  [
    "Fibrociment",
    "Fibre cement"
  ],
  [
    "Clin de fibrociment texturé de 12 pi. Largeur physique 8¼ po; exposition 7 po.",
    "12 ft textured fibre cement lap siding. Physical width: 8¼ in; exposure: 7 in."
  ],
  [
    "Catalogue Canada Est — dimensions et gammes",
    "Eastern Canada catalogue — dimensions and product lines"
  ],
  [
    "Catalogue Canada Est consulté; la brochure Québec 06/2025 précise une offre régionale plus restreinte.",
    "Eastern Canada catalogue reviewed; the Québec 06/2025 brochure lists a more limited regional range."
  ],
  [
    "Centre de documentation — instructions de pose James Hardie",
    "Documentation centre — James Hardie installation instructions"
  ],
  [
    "Choisir le produit et la région; ce lien n’est pas un guide exact déjà sélectionné.",
    "Select the product and region; this link does not open a preselected product-specific guide."
  ],
  [
    "Produits et couleurs disponibles au Québec — James Hardie 06/2025",
    "Products and colours available in Québec — James Hardie 06/2025"
  ],
  [
    "Catalogue officiel James Hardie Canada Est; palette et formats à vérifier pour le Québec.",
    "Official James Hardie Eastern Canada catalogue; verify the palette and sizes for Québec."
  ],
  [
    "Référence fabricant; disponibilité, délai et offre MIR à confirmer. Affichage écran indicatif.",
    "Manufacturer reference; confirm availability, lead time and the MIR offering. Screen colours are indicative."
  ],
  [
    "Échantillon couleur de la brochure; son grain ne certifie pas la texture du profil sélectionné. Les finis lisse et Cedarmill restent distincts.",
    "Colour sample from the brochure; its grain does not confirm the texture of the selected profile. Smooth and Cedarmill finishes remain distinct."
  ],
  [
    "planche — unité de vente MIR à confirmer",
    "board — confirm MIR selling unit"
  ],
  [
    "Rotation de débit selon la règle de projet; ne valide ni pose, ni grain, ni assemblage.",
    "Cutting rotation follows the project rule; it does not validate installation, grain direction or assembly."
  ],
  [
    "Stock, prix et délai MIR non vérifiés.",
    "MIR stock, pricing and lead time have not been verified."
  ],
  [
    "Select Cedarmill — grain de cèdre",
    "Select Cedarmill — cedar grain"
  ],
  [
    "Visuel officiel du profil; teinte et longueur photographiées ne certifient pas la variante commandée.",
    "Official profile image; the colour and length shown do not confirm the ordered variant."
  ],
  [
    "HardiePanel Lisse",
    "HardiePanel Smooth"
  ],
  [
    "Panneau de fibrociment lisse. Choisissez le format 4 × 8 pi ou 4 × 10 pi et la couleur dans la fiche.",
    "Smooth fibre cement panel. Choose a 4 × 8 ft or 4 × 10 ft size and a colour on the product page."
  ],
  [
    "ESR-1844 — orientation des panneaux, §4.2.2 (IBC/IRC)",
    "ESR-1844 — panel orientation, §4.2.2 (IBC/IRC)"
  ],
  [
    "Rapport réémis en novembre 2025. Les deux orientations sont admises sous conditions de fixation/appuis/joints. Le supplément CA signifie Californie, pas Canada.",
    "Report reissued in November 2025. Both orientations are permitted subject to fastening, support and joint requirements. The CA supplement refers to California, not Canada."
  ],
  [
    "panneau — format et unité MIR à confirmer",
    "panel — MIR size and sales unit to be confirmed"
  ],
  [
    "Le contrôle d’encombrement ne valide pas les joints ni les appuis.",
    "The fit check does not validate joints or supports."
  ],
  [
    "Lisse",
    "Smooth"
  ],
  [
    "4 × 8 pi",
    "4 × 8 ft"
  ],
  [
    "4 × 10 pi",
    "4 × 10 ft"
  ],
  [
    "Allura Lap Siding — Cèdre traditionnel 8¼ po",
    "Allura Lap Siding — Traditional Cedar 8¼ in"
  ],
  [
    "Clin de fibrociment proposé en textures Smooth ou Traditional Cedar. La texture et la finition constituent des choix distincts.",
    "Fibre cement lap siding offered in Smooth or Traditional Cedar textures. Texture and finish are separate choices."
  ],
  [
    "Devis technique Allura — section 07 46 46, révision 260303-A",
    "Allura technical specification — section 07 46 46, revision 260303-A"
  ],
  [
    "Manuel de pose Allura — octobre 2025",
    "Allura installation manual — October 2025"
  ],
  [
    "Inclut une section Lap Siding et les exigences générales du système.",
    "Includes a Lap Siding section and general system requirements."
  ],
  [
    "Palette Spectrum; combinaison format/fini et offre au Québec à confirmer.",
    "Spectrum palette; confirm size/finish combinations and availability in Québec."
  ],
  [
    "planche — unité MIR à confirmer",
    "board — MIR sales unit to be confirmed"
  ],
  [
    "Contrôle d’encombrement du débit; pose et grain à valider séparément.",
    "Cutting fit check; installation and grain direction must be verified separately."
  ],
  [
    "Disponibilité Spectrum variable selon marché; offre MIR inconnue.",
    "Spectrum availability varies by market; MIR offering is unknown."
  ],
  [
    "Images de palettes complémentaires non utilisées comme couleur unie.",
    "Supplementary palette images are not used as solid colours."
  ],
  [
    "Texture monochrome officielle du profil. La couleur de vente se choisit séparément dans le nuancier du fabricant.",
    "Official monochrome profile texture. The purchase colour is selected separately from the manufacturer’s colour chart."
  ],
  [
    "Exemple de réalisation de la gamme; dimensions et variante exactes non établies.",
    "Example project from the product line; exact dimensions and variant have not been established."
  ],
  [
    "SmartSide série 38 Cedar Texture — apprêté",
    "SmartSide 38 Series Cedar Texture — primed"
  ],
  [
    "Bois d’ingénierie",
    "Engineered wood"
  ],
  [
    "Clin apprêté à texture cèdre, référence de format 25797. Les instructions de pose ci-dessous concernent les séries apprêtées 38 et 76.",
    "Primed cedar-textured lap siding, size reference 25797. The installation instructions below cover the primed 38 and 76 Series."
  ],
  [
    "Spécifications produit LP SmartSide",
    "LP SmartSide product specifications"
  ],
  [
    "Tableau dynamique; dimensions de la référence également repérées dans l’index officiel turn25search5.",
    "Dynamic table; dimensions for this reference were also identified in the official index turn25search5."
  ],
  [
    "Instructions — clin apprêté Cedar Texture / Brushed Smooth, séries 38 et 76",
    "Instructions — primed Cedar Texture / Brushed Smooth lap siding, 38 and 76 Series"
  ],
  [
    "SKU apprêté; aucun nuancier ExpertFinish attribué.",
    "Primed SKU; no ExpertFinish colour chart assigned."
  ],
  [
    "Apprêté — grain de cèdre",
    "Primed — cedar grain"
  ],
  [
    "Image originale du catalogue LP 2026, page PDF 22 / imprimées 42–43, section Lap Cedar 38. Le groupe illustre plusieurs largeurs primées 6/8/12 po; aucune largeur exacte du PID 25797 n’est déduite du visuel. Résolution originale limitée à 198 × 125 px.",
    "Original image from the LP 2026 catalogue, PDF page 22 / printed pages 42–43, Lap Cedar 38 section. The group illustrates several primed 6/8/12 in widths; the exact width of PID 25797 cannot be determined from this image. Original resolution limited to 198 × 125 px."
  ],
  [
    "Moderne 6 po em+ — texturé",
    "Moderne 6 in em+ — textured"
  ],
  [
    "Bois véritable",
    "Real wood"
  ],
  [
    "Lambris de bois véritable, profil Moderne à emboîtement em+. Le profil régulier possède d’autres dimensions.",
    "Real wood siding with the interlocking Moderne em+ profile. The regular profile has different dimensions."
  ],
  [
    "Fiche technique — Moderne",
    "Technical data sheet — Moderne"
  ],
  [
    "Guide de pose Maibec em+ — 2026",
    "Maibec em+ installation guide — 2026"
  ],
  [
    "Guide em+; ne pas substituer aux instructions d’un lambris régulier.",
    "em+ guide; do not substitute it for regular siding installation instructions."
  ],
  [
    "Calcul des quantités — lambris et moulures",
    "Quantity calculations — siding and trim"
  ],
  [
    "Disponibilité MIR non vérifiée; valider sur échantillon.",
    "MIR availability has not been verified; confirm with a physical sample."
  ],
  [
    "pi² de surface couverte selon Maibec — modalités MIR à confirmer",
    "sq. ft. of covered area according to Maibec — MIR terms to be confirmed"
  ],
  [
    "Texturé — em+",
    "Textured — em+"
  ],
  [
    "Clin double à gorge D-5 en bois d’ingénierie. Pose horizontale; largeur physique 11⅞ po, longueur 12 pi, couverture publiée 11 pi² par pièce.",
    "D-5 double-cove engineered wood lap siding. Horizontal installation; physical width: 11⅞ in, length: 12 ft, published coverage: 11 sq. ft. per piece."
  ],
  [
    "Fiche technique — Ridgewood D-5, mai 2025",
    "Technical data sheet — Ridgewood D-5, May 2025"
  ],
  [
    "Guide CanExel — Québec, Maritimes et Colombie-Britannique, septembre 2026",
    "CanExel guide — Québec, the Maritimes and British Columbia, September 2026"
  ],
  [
    "paquet de 4 planches — unité MIR à confirmer",
    "pack of 4 boards — confirm MIR selling unit"
  ],
  [
    "Ridgewood D-5 — aspect bois",
    "Ridgewood D-5 — wood appearance"
  ],
  [
    "Äkta 306 — Noueux Antiqué",
    "Äkta 306 — Knotty Antique"
  ],
  [
    "Parement de pin noueux au fini AntiquÉ, profil 306. Référence concrète pour distinguer le profil, le grade et le fini.",
    "Knotty pine siding with an AntiquÉ finish, profile 306. A specific reference that distinguishes the profile, grade and finish."
  ],
  [
    "Dessin du profil 306",
    "Profile 306 drawing"
  ],
  [
    "PDF lié au produit; cotes de cette fiche reprises de la page produit, pas d’une lecture automatique du dessin.",
    "PDF linked to the product; dimensions on this sheet come from the product page, not an automated reading of the drawing."
  ],
  [
    "Guide CECO — installation du parement de bois, juillet 2019",
    "CECO guide — wood siding installation, July 2019"
  ],
  [
    "Guide de système lié par JDP; édition 2019, pas une notice spécifique au seul profil 306.",
    "System guide linked by JDP; 2019 edition, not instructions specific to profile 306 alone."
  ],
  [
    "1 × 6 po",
    "1 × 6 in"
  ],
  [
    "unité de vente MIR à confirmer",
    "MIR sales unit to be confirmed"
  ],
  [
    "Sens de pose exact306 non confirmé dans la page consultée; validation du guide requise.",
    "The exact installation direction for profile 306 is not confirmed on the reviewed page; the guide must be checked."
  ],
  [
    "Largeur physique non confirmée :6 po nominal,4¾po couvrant.",
    "Physical width not confirmed: 6 in nominal, 4¾ in coverage."
  ],
  [
    "Noueux — antiqué",
    "Knotty — antique finish"
  ],
  [
    "SP-600 16 po — ventilé / perforé",
    "SP-600 16 in — vented / perforated"
  ],
  [
    "Soffite SP-600 en aluminium. La référence 0605 correspond au type ventilé / perforé; le choix de couleur reste indépendant du parement.",
    "SP-600 aluminium soffit. Reference 0605 is the vented / perforated type; its colour is selected independently of the siding."
  ],
  [
    "Brochure aluminium — soffites, parements, moulures et fascias",
    "Aluminium brochure — soffits, siding, trim and fascias"
  ],
  [
    "Soffit & Fascia System — guide de pose",
    "Soffit & Fascia System — installation guide"
  ],
  [
    "Guide en anglais ©2014 encore lié par le centre professionnel. Les dimensions de la fiche produit actuelle priment pour identifier le format commercial.",
    "English-language ©2014 guide still linked from the professional centre. Current product-sheet dimensions take precedence when identifying the commercial size."
  ],
  [
    "Nom et image officiels; combinaison couleur/profil à confirmer dans la matrice fabricant.",
    "Official name and image; confirm the colour/profile combination in the manufacturer’s matrix."
  ],
  [
    "panneau ou carton de 12 — unité MIR à confirmer",
    "panel or carton of 12 — MIR sales unit to be confirmed"
  ],
  [
    "Contrôle d’encombrement du débit; pose et grain restent à valider.",
    "Cutting fit check; installation and grain direction still need to be verified."
  ],
  [
    "Largeur physique non confirmée : 16 po est un format nominal ou exposé, pas une dimension de stock validée.",
    "Physical width not confirmed: 16 in is a nominal or exposed size, not a validated stock dimension."
  ],
  [
    "Image originale associée au libellé « Panneau Perforé SP-600 16” » dans la brochure ©2003 encore liée depuis la page officielle du soffite. Définition originale 178 × 103 px, conservée sans agrandissement raster. La teinte illustrée ne certifie aucun code couleur actuel.",
    "Original image labelled “Panneau Perforé SP-600 16”” in the ©2003 brochure still linked from the official soffit page. Original 178 × 103 px resolution preserved without raster enlargement. The illustrated shade does not confirm any current colour code."
  ],
  [
    "La photo illustre la gamme de soffites aluminium Kaycan; le code SP600 perforé 0605 ne peut pas être établi à partir de cette photo.",
    "This photo shows the Kaycan aluminium soffit range; the perforated SP600 code 0605 cannot be established from this photo."
  ],
  [
    "SP-600 16 po — uni / plein",
    "SP-600 16 in — plain / solid"
  ],
  [
    "Soffite SP-600 en aluminium. La référence 0606 correspond au type uni / plein; le choix de couleur reste indépendant du parement.",
    "SP-600 aluminium soffit. Reference 0606 is the plain / solid type; its colour is selected independently of the siding."
  ],
  [
    "Image originale associée au libellé « Panneau Uni SP-600 16” » dans la brochure ©2003 encore liée depuis la page officielle du soffite. Définition originale 178 × 103 px, conservée sans agrandissement raster. La teinte illustrée ne certifie aucun code couleur actuel.",
    "Original image labelled “Panneau Uni SP-600 16”” in the ©2003 brochure still linked from the official soffit page. Original 178 × 103 px resolution preserved without raster enlargement. The illustrated shade does not confirm any current colour code."
  ],
  [
    "Fascia aluminium 6 po — 0480",
    "Aluminium fascia 6 in — 0480"
  ],
  [
    "Bordure de toit en aluminium. La couleur du fascia se choisit séparément du soffite et du revêtement.",
    "Aluminium roof-edge fascia. Fascia colour is selected separately from the soffit and siding."
  ],
  [
    "pièce de 9 pi 10 po — unité MIR à confirmer",
    "9 ft 10 in piece — MIR sales unit to be confirmed"
  ],
  [
    "Palette générale aluminium; disponibilité du fascia et de sa jauge à confirmer.",
    "General aluminium palette; fascia availability and gauge to be confirmed."
  ],
  [
    "Parement horizontal d’aluminium à texture bois, code 1003. Le répertoire Canada distingue l’exposition de la profondeur du profil.",
    "Horizontal wood-textured aluminium siding, code 1003. The Canadian directory distinguishes exposure from profile depth."
  ],
  [
    "Répertoire des produits — édition affichée juin 2026",
    "Product directory — edition displayed as June 2026"
  ],
  [
    "La couverture indique juin 2026 malgré le nom de fichier Mars2026; vérifié dans la recherche précédente.",
    "The cover says June 2026 despite the Mars2026 filename; checked in the previous research."
  ],
  [
    "Centre de documentation — pose du revêtement aluminium Gentek",
    "Documentation centre — Gentek aluminium siding installation"
  ],
  [
    "Centre officiel repéré; aucun guide exact de ce profil sélectionné.",
    "Official centre located; no exact guide selected for this profile."
  ],
  [
    "panneau — unité MIR à confirmer",
    "panel — MIR sales unit to be confirmed"
  ],
  [
    "8 po est l’exposition; largeur physique totale non confirmée.",
    "8 in is the exposure; total physical width is not confirmed."
  ],
  [
    "Couleurs du code 1003 à valider dans la matricep56.",
    "Confirm colours for code 1003 in the matrix on page 56."
  ],
  [
    "Aspect bois",
    "Wood appearance"
  ],
  [
    "Soffite 16 po à 2 panneaux — ventilé",
    "16 in 2-panel soffit — vented"
  ],
  [
    "Soffite aluminium à deux panneaux et texture lisse. Le modèle ventilé est décrit séparément sur la page officielle.",
    "Two-panel aluminium soffit with a smooth texture. The vented model is described separately on the official page."
  ],
  [
    "Guide de pose aluminium — soffite, fascia et gouttière",
    "Aluminium installation guide — soffit, fascia and eavestrough"
  ],
  [
    "PDF officiel repéré dans l’index; ouverture du PDF non effectuée pendant cette passe.",
    "Official PDF located in the index; the PDF was not opened during this review."
  ],
  [
    "Valeur commerciale publiée; aucun calcul de surface par pièce effectué.",
    "Published commercial value; no area-per-piece calculation performed."
  ],
  [
    "panneau ou boîte de 18 — unité MIR à confirmer",
    "panel or box of 18 — MIR sales unit to be confirmed"
  ],
  [
    "Soffite 16 po à 2 panneaux — plein",
    "16 in 2-panel soffit — solid"
  ],
  [
    "Soffite aluminium à deux panneaux et texture lisse. Le modèle plein est décrit séparément sur la page officielle.",
    "Two-panel aluminium soffit with a smooth texture. The solid model is described separately on the official page."
  ],
  [
    "Fascia aluminium 6 po — nervuré",
    "Aluminium fascia 6 in — ribbed"
  ],
  [
    "Bordure de toit nervurée en aluminium. Le fabricant propose aussi une version lisse; elles doivent rester des options distinctes.",
    "Ribbed aluminium roof-edge fascia. The manufacturer also offers a smooth version; these must remain separate options."
  ],
  [
    "Profil d’acier à fixation dissimulée, annoncé pour murs et soffites. La version perforée de soffite doit être précisée auprès du fabricant.",
    "Concealed-fastener steel profile listed for walls and soffits. Confirm the perforated soffit version with the manufacturer."
  ],
  [
    "Fiche technique Bellara Plank 90 / 135 / 200",
    "Bellara Plank 90 / 135 / 200 technical data sheet"
  ],
  [
    "Guide de pose Plank 90 / 135 / 200",
    "Plank 90 / 135 / 200 installation guide"
  ],
  [
    "Le guide mentionne des options de soffite perforé sur demande, page 5 du PDF; ne fournit pas une sélection commerciale complète de soffites.",
    "The guide mentions perforated soffit options on request on PDF page 5; it does not provide a complete commercial selection of soffits."
  ],
  [
    "Teinte référencée par Vicwest; son offre précise sur Bellara Plank 135 n'est pas confirmée dans le guide par produit.",
    "Shade referenced by Vicwest; its specific availability for Bellara Plank 135 is not confirmed in the product guide."
  ],
  [
    "Palette Bellara; jauge et offre régionale à confirmer.",
    "Bellara palette; gauge and regional availability to be confirmed."
  ],
  [
    "Code page 18-0191, nom de fichier18-3271 : correspondance à confirmer.",
    "Page code 18-0191, filename 18-3271: match to be confirmed."
  ],
  [
    "Bellara Plank 135 · 26 ga · commande spéciale; prix et disponibilité MIR à confirmer.",
    "Bellara Plank 135 · 26 ga · special order; MIR pricing and availability to be confirmed."
  ],
  [
    "Bellara Plank 135 · 26 ga · commande spéciale et quantité minimale; prix et disponibilité MIR à confirmer.",
    "Bellara Plank 135 · 26 ga · special order and minimum quantity; MIR pricing and availability to be confirmed."
  ],
  [
    "Les deux valeurs nominales sont celles du fabricant; ne pas les traiter comme des mesures de précision équivalentes.",
    "Both nominal values are published by the manufacturer; do not treat them as equivalent precision measurements."
  ],
  [
    "5,34 po est la largeur couverte; largeur physique totale non confirmée.",
    "5.34 in is the covered width; total physical width is not confirmed."
  ],
  [
    "WarmRosewood : code de page et nom de fichier différents.",
    "WarmRosewood: page code and filename differ."
  ],
  [
    "La teinte Amber Birch ne figure pas dans le tableau Bellara Plank de ce guide; conserver le choix existant avec disponibilité à confirmer.",
    "Amber Birch is not listed in this guide’s Bellara Plank table; retain the existing choice with availability to be confirmed."
  ],
  [
    "Acier prépeint — fini selon couleur",
    "Prepainted steel — finish varies by colour"
  ],
  [
    "Visuel fabricant regroupant trois largeurs Bellara, dont le profil 135 au centre. Cette illustration n’est pas une photo de pose et ne certifie pas une variante de couleur ni une pièce de commande.",
    "Manufacturer image showing three Bellara widths, with profile 135 in the centre. This illustration is not an installation photo and does not confirm a colour variant or an ordered piece."
  ],
  [
    "Parement d’aluminium de la collection Bosco. Les couleurs ci-dessous sont celles de cette collection dans les fiches 2025.",
    "Aluminium siding from the Bosco collection. The colours below are listed for this collection in the 2025 data sheets."
  ],
  [
    "Fiches techniques Rialux — édition 2025",
    "Rialux technical data sheets — 2025 edition"
  ],
  [
    "Guide d’installation Rialux — édition 2024",
    "Rialux installation guide — 2024 edition"
  ],
  [
    "Guide de système; sélectionner les détails de la collection et de l’application concernées.",
    "System guide; select the details for the relevant collection and application."
  ],
  [
    "Sens de pose du profil Bosco à confirmer; le guide 2024 ne nomme pas Bosco.",
    "Bosco profile installation direction to be confirmed; the 2024 guide does not name Bosco."
  ],
  [
    "5,45 po est une hauteur couverte; largeur physique non confirmée.",
    "5.45 in is a covered height; physical width is not confirmed."
  ],
  [
    "Rendu matière officiel présenté sur une sphère de démonstration; cette forme ne représente pas une pièce vendue ni la géométrie de coupe. Aucune modification du rendu ou de la teinte.",
    "Official material rendering shown on a demonstration sphere; this shape does not represent a sold piece or cutting geometry. The rendering and shade have not been altered."
  ],
  [
    "Visuel fabricant associant une façade et un dessin de profil; couleur, largeur et variante exactes non certifiées par cette illustration.",
    "Manufacturer image combining a façade and profile drawing; the exact colour, width and variant are not confirmed by this illustration."
  ],
  [
    "Soffite Timberland",
    "Timberland soffit"
  ],
  [
    "Soffite Timberland identifié séparément dans les fiches Rialux 2025. Son type de ventilation n’est pas précisé dans la documentation consultée.",
    "Timberland soffit identified separately in the Rialux 2025 data sheets. Its ventilation type is not specified in the reviewed documentation."
  ],
  [
    "Nuancier du soffite exact et type de ventilation non confirmés; aucune transposition automatique du parement Timberland.",
    "The exact soffit palette and ventilation type are not confirmed; the Timberland siding selection is not automatically applied."
  ],
  [
    "Photo officielle de la famille intégrée; la référence, le coloris et le format exacts de la variante photographiée ne sont pas établis.",
    "Official product-family photo included; the exact reference, colour and size of the photographed variant have not been established."
  ],
  [
    "Image native extraite de la fiche officielle ACCESSOIRES, page imprimée 13 : Soffite Tiago–Timberland–Bolton. Masque de transparence original conservé; aucune recoloration ni agrandissement. Résolution source limitée à 173 × 168 px. La teinte photographiée ne représente pas toutes les couleurs.",
    "Native image extracted from the official ACCESSOIRES data sheet, printed page 13: Tiago–Timberland–Bolton soffit. Original transparency mask preserved; no recolouring or enlargement. Source resolution limited to 173 × 168 px. The photographed shade does not represent every colour."
  ],
  [
    "Profil d’acier prépeint pour pose horizontale, verticale ou diagonale. Le modèle de cette fiche est le parement Norwood standard.",
    "Prepainted steel profile for horizontal, vertical or diagonal installation. This sheet covers standard Norwood siding."
  ],
  [
    "Fiche technique Norwood",
    "Norwood technical data sheet"
  ],
  [
    "Guide d’installation Norwood et Norwood Mini",
    "Norwood and Norwood Mini installation guide"
  ],
  [
    "planche ou boîte de 12 — unité MIR à confirmer",
    "board or box of 12 — MIR sales unit to be confirmed"
  ],
  [
    "5,38 po est une largeur couverte; largeur physique non confirmée.",
    "5.38 in is a covered width; physical width is not confirmed."
  ],
  [
    "Pose diagonale documentée par MAC, non proposée par cette interface.",
    "Diagonal installation is documented by MAC but is not offered in this interface."
  ],
  [
    "Harrywood Ventilé",
    "Harrywood Ventilated"
  ],
  [
    "Soffite d’acier Harrywood en version ventilée. La ventilation est documentée; son aspect caché ou apparent n’est pas qualifié ici.",
    "Vented version of Harrywood steel soffit. Ventilation is documented; whether the vents are concealed or visible is not specified here."
  ],
  [
    "Dessin technique Harrywood Ventilated",
    "Harrywood Ventilated technical drawing"
  ],
  [
    "Ventilation des soffites MAC — 2025",
    "MAC soffit ventilation — 2025"
  ],
  [
    "Document officiel indexé; valeurs repérées sans ouverture complète pendant cette passe.",
    "Official document indexed; values identified without opening the full document during this review."
  ],
  [
    "Guide d’installation du système Harrywood",
    "Harrywood system installation guide"
  ],
  [
    "Guide du système Harrywood; faire valider les détails propres au soffite ventilé.",
    "Harrywood system guide; have the details specific to vented soffit verified."
  ],
  [
    "Palette exacte du profil ventilé non reprise automatiquement de Norwood.",
    "The vented profile’s exact palette is not automatically copied from Norwood."
  ],
  [
    "Cedar Renditions — soffite ventilé 6 po",
    "Cedar Renditions — 6 in vented soffit"
  ],
  [
    "Royal Aluminium — soffite ventilé Cedar Renditions 6 po. Référence Westlake Royal 13061.",
    "Royal Aluminium — Cedar Renditions 6 in vented soffit. Westlake Royal reference 13061."
  ],
  [
    "Fiche aluminium Cedar Renditions — Canada / États-Unis, 2023",
    "Cedar Renditions aluminium data sheet — Canada / United States, 2023"
  ],
  [
    "Lien officiel indexé; ouverture refusée. Les dimensions du parement Design Series ne sont pas attribuées au soffite.",
    "Official link indexed; access denied. Design Series siding dimensions are not assigned to the soffit."
  ],
  [
    "Guide Cedar Renditions — Canada, 2023",
    "Cedar Renditions guide — Canada, 2023"
  ],
  [
    "PDF officiel indexé; ouverture directe en échec.",
    "Official PDF indexed; direct opening failed."
  ],
  [
    "Brochure Cedar Renditions Canada — 2023, profil soffite page 13",
    "Cedar Renditions Canada brochure — 2023, soffit profile on page 13"
  ],
  [
    "Guide canadien Royal 2026 — soffite 13061 et palette Cedar Renditions",
    "Royal 2026 Canadian guide — soffit 13061 and Cedar Renditions palette"
  ],
  [
    "Couleur de la gamme Cedar Renditions. Disponibilité pour le soffite 13061 et chez MIR à confirmer.",
    "Colour from the Cedar Renditions range. Confirm availability for soffit 13061 and from MIR."
  ],
  [
    "Échantillon physique, stock et prix à confirmer avec MIR.",
    "Confirm the physical sample, stock and pricing with MIR."
  ],
  [
    "unité MIR à confirmer",
    "MIR sales unit to be confirmed"
  ],
  [
    "Le guide canadien présente la palette de la gamme. Compatibilité de chaque teinte avec le soffite 13061 et disponibilité au Québec à confirmer.",
    "The Canadian guide presents the range’s palette. Confirm each shade’s compatibility with soffit 13061 and availability in Québec."
  ],
  [
    "Image originale de faible résolution, identifiée « 6 in Soffit Timberline » dans la brochure. Offre actuelle MIR et identité du fournisseur Royal à confirmer.",
    "Original low-resolution image identified as “6 in Soffit Timberline” in the brochure. Current MIR offering and Royal supplier identity to be confirmed."
  ],
  [
    "AlumiPro — Rouleau aluminium régulier 132419",
    "AlumiPro — Regular aluminium coil 132419"
  ],
  [
    "Royal Aluminium · AlumiPro — régulier. Rouleau de recouvrement et de pliage de 24 po. Peint sur un côté.",
    "Royal Aluminium · AlumiPro — regular. 24 in trim and bending coil. Painted on one side."
  ],
  [
    "Guide canadien Royal 2026 — spécifications",
    "Royal 2026 Canadian guide — specifications"
  ],
  [
    "Guide canadien Royal 2026 — matrice de couleurs",
    "Royal 2026 Canadian guide — colour matrix"
  ],
  [
    "rouleau",
    "coil"
  ],
  [
    "Échantillons à valider sur le nuancier physique. Stock, prix et approvisionnement MIR à confirmer.",
    "Check samples against the physical colour chart. MIR stock, pricing and supply to be confirmed."
  ],
  [
    "AlumiPro — Rouleau aluminium robuste 132423",
    "AlumiPro — Heavy-duty aluminium coil 132423"
  ],
  [
    "Royal Aluminium · AlumiPro — robuste lisse. Rouleau de recouvrement et de pliage de 24 po. Peint sur un ou deux côtés selon le code.",
    "Royal Aluminium · AlumiPro — smooth heavy-duty. 24 in trim and bending coil. Painted on one or both sides, depending on the code."
  ],
  [
    "Envers documenté : Blanc 701. Échantillon physique, stock et prix à confirmer avec MIR.",
    "Documented reverse side: Blanc 701. Physical sample, stock and pricing to be confirmed with MIR."
  ],
  [
    "Envers documenté : Blanc 801. Commande spéciale selon le guide Royal. Échantillon physique, stock et prix à confirmer avec MIR.",
    "Documented reverse side: Blanc 801. Special order according to the Royal guide. Physical sample, stock and pricing to be confirmed with MIR."
  ],
  [
    "Envers documenté : Noir 30. Échantillon physique, stock et prix à confirmer avec MIR.",
    "Documented reverse side: Noir 30. Physical sample, stock and pricing to be confirmed with MIR."
  ],
  [
    "Commande spéciale selon le guide Royal. Échantillon physique, stock et prix à confirmer avec MIR.",
    "Special order according to the Royal guide. Physical sample, stock and pricing to be confirmed with MIR."
  ],
  [
    "AlumiPro — Rouleau aluminium robuste gaufré 132423 E",
    "AlumiPro — Heavy-duty embossed aluminium coil 132423 E"
  ],
  [
    "Royal Aluminium · AlumiPro — robuste gaufré. Rouleau de recouvrement et de pliage de 24 po. Peint sur un ou deux côtés selon le code. Le suffixe E désigne le rouleau gaufré.",
    "Royal Aluminium · AlumiPro — heavy-duty embossed. 24 in trim and bending coil. Painted on one or both sides, depending on the code. The E suffix identifies the embossed coil."
  ],
  [
    "Cedar Renditions — Rouleau aluminium 132423",
    "Cedar Renditions — Aluminium coil 132423"
  ],
  [
    "Royal Aluminium · Cedar Renditions — rouleau. Rouleau de recouvrement et de pliage de 24 po. Aluzinc 901 est peint sur un seul côté.",
    "Royal Aluminium · Cedar Renditions — coil. 24 in trim and bending coil. Aluzinc 901 is painted on one side only."
  ],
  [
    "ADSEAL 4580 — scellant silicone",
    "ADSEAL 4580 — silicone sealant"
  ],
  [
    "Scellant",
    "Sealant"
  ],
  [
    "Scellant silicone à polymérisation neutre pour joints d’étanchéité. Le support, la préparation et la compatibilité doivent être vérifiés pour chaque système.",
    "Neutral-cure silicone sealant for sealing joints. Substrate, preparation and compatibility must be checked for each system."
  ],
  [
    "Fiche technique ADSEAL DWS 4580 Series",
    "ADSEAL DWS 4580 Series technical data sheet"
  ],
  [
    "Source officielle indexée; ouverture en échec.",
    "Official source indexed; opening failed."
  ],
  [
    "Préparation des surfaces et mode d’emploi — fiche ADSEAL 4580",
    "Surface preparation and instructions for use — ADSEAL 4580 data sheet"
  ],
  [
    "Sections repérées dans l’index; même fiche technique, pas un guide de pose indépendant.",
    "Sections identified in the index; this is the same technical data sheet, not a separate installation guide."
  ],
  [
    "Catalogue construction Adfast — conditionnements DWS 4580",
    "Adfast construction catalogue — DWS 4580 packaging"
  ],
  [
    "cartouche 304 ml — code couleur et unité MIR à confirmer",
    "304 ml cartridge — colour code and MIR sales unit to be confirmed"
  ],
  [
    "Ancienne charte 4580/4600 indexée mais redirigée : palette actuelle et codes à confirmer.",
    "Older 4580/4600 chart indexed but redirected: current palette and codes to be confirmed."
  ],
  [
    "Photo originale du catalogue Adfast : cartouche et saucisse DWS 4580. Le conditionnement à vendre et la couleur restent à sélectionner.",
    "Original Adfast catalogue photo: DWS 4580 cartridge and sausage pack. The package size and colour still need to be selected."
  ],
  [
    "V299XL SHADOW XL — moulure verticale",
    "V299XL SHADOW XL — vertical trim"
  ],
  [
    "Moulure",
    "Trim"
  ],
  [
    "Moulure verticale en deux pièces annoncée pour HardiePanel de 5/16 à 1/2 po d’épaisseur. L’assemblage exact reste à valider au projet.",
    "Two-piece vertical trim listed for HardiePanel from 5/16 to 1/2 in thick. The exact assembly must be validated for the project."
  ],
  [
    "Fiche produit et dimensions — V299XL SHADOW XL",
    "Product data sheet and dimensions — V299XL SHADOW XL"
  ],
  [
    "Catalogue technique Light Trim",
    "Light Trim technical catalogue"
  ],
  [
    "Lien officiel; outil de lecture bloqué par la taille du fichier.",
    "Official link; the reading tool was blocked by the file size."
  ],
  [
    "Centre de documentation — schémas de positionnement Light Trim",
    "Documentation centre — Light Trim positioning diagrams"
  ],
  [
    "Page de schémas; ne constitue pas un guide exact V299XL déjà sélectionné.",
    "Diagram page; this is not a preselected V299XL-specific guide."
  ],
  [
    "Nuancier LightTrim; offre du profil à confirmer.",
    "LightTrim colour chart; profile availability to be confirmed."
  ],
  [
    "moulure de 10 pi — unité MIR à confirmer",
    "10 ft trim — MIR sales unit to be confirmed"
  ],
  [
    "Vis HardiePlank — #8 × 1¼ po, latte de bois",
    "HardiePlank screws — #8 × 1¼ in, wood furring"
  ],
  [
    "Fixation",
    "Fastener"
  ],
  [
    "Vis de fixation pour clins HardiePlank, proposées par Light Trim. Support : latte de bois.",
    "Fastening screws for HardiePlank lap siding, offered by Light Trim. Substrate: wood furring."
  ],
  [
    "Calibre",
    "Gauge"
  ],
  [
    "Empreinte",
    "Drive"
  ],
  [
    "Matière / protection",
    "Material / coating"
  ],
  [
    "Acier avec revêtement Ruspro®",
    "Ruspro®-coated steel"
  ],
  [
    "Support prévu",
    "Intended substrate"
  ],
  [
    "Latte de bois",
    "Wood furring"
  ],
  [
    "Usage annoncé par Light Trim",
    "Use stated by Light Trim"
  ],
  [
    "Clins HardiePlank",
    "HardiePlank lap siding"
  ],
  [
    "boîte",
    "box"
  ],
  [
    "boîte de 250 vis — unité MIR à confirmer",
    "box of 250 screws — MIR sales unit to be confirmed"
  ],
  [
    "Option publiée par Light Trim; combinaison couleur × longueur et offre MIR à confirmer. Écran indicatif.",
    "Option published by Light Trim; colour × length combination and MIR availability to be confirmed. On-screen appearance is indicative."
  ],
  [
    "Prix, stock MIR et combinaisons couleur × longueur non confirmés.",
    "MIR pricing, stock and colour × length combinations are not confirmed."
  ],
  [
    "Aucun guide de pose exact VFCLS8114/VFCLTEK8114 n’est identifié dans les deux PDF généraux liés par la page; lire les instructions de HardiePlank.",
    "No exact VFCLS8114/VFCLTEK8114 installation guide is identified in the two general PDFs linked from the page; read the HardiePlank instructions."
  ],
  [
    "1¼ po — VFCLS8114",
    "1¼ in — VFCLS8114"
  ],
  [
    "Fiche produit — VFCLS8",
    "Product data sheet — VFCLS8"
  ],
  [
    "Tableau de sélection — clins HardiePlank",
    "Selection chart — HardiePlank lap siding"
  ],
  [
    "Tableau de sélection; ce document n’est pas un guide de pose du parement.",
    "Selection chart; this document is not a siding installation guide."
  ],
  [
    "Fiche générale Light Trim — autres références de vis",
    "General Light Trim data sheet — other screw references"
  ],
  [
    "VFCLS8114 et VFCLTEK8114 ne sont pas présents dans ce tableau; ne pas reprendre leurs performances depuis les autres vis.",
    "VFCLS8114 and VFCLTEK8114 are not in this chart; do not assign performance values from other screws to them."
  ],
  [
    "Photo officielle de la famille affichée par Light Trim. La couleur et la longueur photographiées ne certifient pas toutes les variantes. Aucun recadrage ni recoloration.",
    "Official product-family photo shown by Light Trim. The photographed colour and length do not confirm all variants. No cropping or recolouring."
  ],
  [
    "Brique classique",
    "Classic brick"
  ],
  [
    "Briques rectangulaires et joints décalés. Aperçu illustratif du Studio. Aucun fabricant ni produit commercial associé.",
    "Rectangular bricks with staggered joints. Illustrative Studio preview. No manufacturer or commercial product is associated with this option."
  ],
  [
    "Motif illustratif. Ne définit ni dimensions du produit, ni joints de pose, ni rendement.",
    "Illustrative pattern. It does not define product dimensions, installation joints or coverage."
  ],
  [
    "Brique allongée",
    "Long-format brick"
  ],
  [
    "Briques minces et longues, posées en rangées décalées. Aperçu illustratif du Studio. Aucun fabricant ni produit commercial associé.",
    "Long, slim bricks laid in staggered rows. Illustrative Studio preview. No manufacturer or commercial product is associated with this option."
  ],
  [
    "Brique à joints alignés",
    "Stack-bond brick"
  ],
  [
    "Briques en rangées à joints verticaux alignés. Aperçu illustratif du Studio. Aucun fabricant ni produit commercial associé.",
    "Brick rows with aligned vertical joints. Illustrative Studio preview. No manufacturer or commercial product is associated with this option."
  ],
  [
    "Pierre de taille",
    "Cut stone"
  ],
  [
    "Blocs rectangulaires de tailles variées et joints réguliers. Aperçu illustratif du Studio. Aucun fabricant ni produit commercial associé.",
    "Rectangular blocks of varying sizes with regular joints. Illustrative Studio preview. No manufacturer or commercial product is associated with this option."
  ],
  [
    "Pierre empilée",
    "Stacked stone"
  ],
  [
    "Petites pierres allongées en couches fines et irrégulières. Aperçu illustratif du Studio. Aucun fabricant ni produit commercial associé.",
    "Small, elongated stones in thin, irregular layers. Illustrative Studio preview. No manufacturer or commercial product is associated with this option."
  ],
  [
    "Pierres de formes et tailles irrégulières avec joints apparents. Aperçu illustratif du Studio. Aucun fabricant ni produit commercial associé.",
    "Stones with irregular shapes and sizes and visible joints. Illustrative Studio preview. No manufacturer or commercial product is associated with this option."
  ],
  [
    "HardiePlank Select Cedarmill — 6,25 po",
    "HardiePlank Select Cedarmill — 6.25 in"
  ],
  [
    "Clin texturé : largeur physique 6.25 po; exposition 5 po.",
    "Textured lap siding: physical width: 6.25 in; exposure: 5 in."
  ],
  [
    "Illustration MIR créée à partir du même échantillon. Teinte écran indicative; valider avec un échantillon physique.",
    "MIR illustration created from the same sample. On-screen colour is indicative; verify with a physical sample."
  ],
  [
    "Le même échantillon, le même fond et le même grain sont conservés pour chaque couleur.",
    "The same sample, background and grain are preserved for every colour."
  ],
  [
    "Échantillons MIR à cadrage fixe. Seule la teinte change; rendu écran indicatif.",
    "MIR samples with fixed framing. Only the colour changes; on-screen appearance is indicative."
  ],
  [
    "HardiePlank Select Cedarmill — 7,25 po",
    "HardiePlank Select Cedarmill — 7.25 in"
  ],
  [
    "Clin texturé : largeur physique 7.25 po; exposition 6 po.",
    "Textured lap siding: physical width: 7.25 in; exposure: 6 in."
  ],
  [
    "Format Canada Est non listé au tableau Québec 06/2025; combinaison profil/couleur à confirmer.",
    "Eastern Canada size not listed in the Québec 06/2025 chart; profile/colour combination to be confirmed."
  ],
  [
    "HardiePlank Lisse — 6,25 po",
    "HardiePlank Smooth — 6.25 in"
  ],
  [
    "Clin lisse : largeur physique 6.25 po; exposition 5 po.",
    "Smooth lap siding: physical width: 6.25 in; exposure: 5 in."
  ],
  [
    "Clin lisse documenté Canada Est; profil et couleur à confirmer au Québec.",
    "Smooth lap siding documented for Eastern Canada; profile and colour to be confirmed for Québec."
  ],
  [
    "HardiePlank Lisse — 7,25 po",
    "HardiePlank Smooth — 7.25 in"
  ],
  [
    "Clin lisse : largeur physique 7.25 po; exposition 6 po.",
    "Smooth lap siding: physical width: 7.25 in; exposure: 6 in."
  ],
  [
    "HardiePlank Lisse — 8,25 po",
    "HardiePlank Smooth — 8.25 in"
  ],
  [
    "Clin lisse : largeur physique 8.25 po; exposition 7 po.",
    "Smooth lap siding: physical width: 8.25 in; exposure: 7 in."
  ],
  [
    "Panneau de fibrociment à grain de cèdre. Choisissez le format 4 × 8 pi ou 4 × 10 pi et la couleur dans la fiche.",
    "Cedar-grain fibre cement panel. Choose a 4 × 8 ft or 4 × 10 ft size and a colour on the product page."
  ],
  [
    "HardieShingle — Rives droites",
    "HardieShingle — Straight Edge"
  ],
  [
    "Panneau de bardeaux de fibrociment à rives droites, exposition 7 po.",
    "Straight-edge fibre cement shingle panel, 7 in exposure."
  ],
  [
    "Aspect bardeau de cèdre",
    "Cedar shingle appearance"
  ],
  [
    "HardieShingle — Rives décalées",
    "HardieShingle — Staggered Edge"
  ],
  [
    "Panneau de bardeaux de fibrociment à rives décalées, exposition 6 po.",
    "Staggered-edge fibre cement shingle panel, 6 in exposure."
  ],
  [
    "Canada Est : les rives décalées ne sont pas listées au tableau Québec 06/2025.",
    "Eastern Canada: staggered-edge shingles are not listed in the Québec 06/2025 chart."
  ],
  [
    "HardieTrim 5/4 Lisse — 3½ po",
    "HardieTrim 5/4 Smooth — 3½ in"
  ],
  [
    "Moulure en fibrociment",
    "Fibre cement trim"
  ],
  [
    "Planche pour encadrements, frises et accents. Section 1×3½ po, longueur 12 pi.",
    "Board for casings, friezes and accents. Section: 1 × 3½ in; length: 12 ft."
  ],
  [
    "Profil lisse illustré dans la brochure, largeur exacte non identifiée par cette image. Image originale de faible résolution.",
    "Smooth profile illustrated in the brochure; this image does not identify the exact width. Original low-resolution image."
  ],
  [
    "pièce — unité de vente MIR à confirmer",
    "piece — MIR sales unit to be confirmed"
  ],
  [
    "Centre de documentation — St-Laurent",
    "Documentation centre — St-Laurent"
  ],
  [
    "Guide lié par St-Laurent — document HardiePlank HZ5",
    "Guide linked by St-Laurent — HardiePlank HZ5 document"
  ],
  [
    "Le PDF lié est intitulé HardiePlank HZ5; aucun guide exact confirmé pour les autres profils.",
    "The linked PDF is titled HardiePlank HZ5; no exact guide is confirmed for the other profiles."
  ],
  [
    "St-Laurent — Bardage à clin 6,25 po",
    "St-Laurent — 6.25 in lap siding"
  ],
  [
    "Clin horizontal fini en usine. Largeur physique 6.25 po; largeur utile 5 po.",
    "Factory-finished horizontal lap siding. Physical width: 6.25 in; coverage width: 5 in."
  ],
  [
    "Finition St-Laurent",
    "St-Laurent finish"
  ],
  [
    "St-Laurent — Bardage à clin 8,25 po",
    "St-Laurent — 8.25 in lap siding"
  ],
  [
    "Clin horizontal fini en usine. Largeur physique 8.25 po; largeur utile 7 po.",
    "Factory-finished horizontal lap siding. Physical width: 8.25 in; coverage width: 7 in."
  ],
  [
    "Guide propre au V-Groove non confirmé; téléchargement actuel HardiePlank.",
    "A V-Groove-specific guide is not confirmed; the current download is HardiePlank."
  ],
  [
    "Planche de fibrociment lisse à rainure en V; pose verticale ou horizontale.",
    "Smooth fibre cement board with a V-groove; vertical or horizontal installation."
  ],
  [
    "Lisse — rainure en V",
    "Smooth — V-groove"
  ],
  [
    "Guide propre aux moulures non confirmé; téléchargement actuel HardiePlank.",
    "A trim-specific guide is not confirmed; the current download is HardiePlank."
  ],
  [
    "St-Laurent — Moulure 3½ po",
    "St-Laurent — 3½ in trim"
  ],
  [
    "Moulure de fibrociment pour encadrements, bandeaux et fascias. Section 1×3½ po, longueur 12 pi.",
    "Fibre cement trim for casings, bands and fascias. Section: 1 × 3½ in; length: 12 ft."
  ],
  [
    "Urbanix 6 po Lisse — 9920",
    "Urbanix 6 in Smooth — 9920"
  ],
  [
    "Planche d’aluminium de12 pi; pose horizontale et verticale décrite dans le guide.",
    "12 ft aluminium board; horizontal and vertical installation are described in the guide."
  ],
  [
    "Urbanix — formats et accessoires",
    "Urbanix — sizes and accessories"
  ],
  [
    "Guide d’installation Urbanix",
    "Urbanix installation guide"
  ],
  [
    "Guide ©2018 lié par Kaycan; valider la révision applicable.",
    "©2018 guide linked by Kaycan; verify the applicable revision."
  ],
  [
    "panneau ou carton de 16 — unité MIR à confirmer",
    "panel or carton of 16 — MIR sales unit to be confirmed"
  ],
  [
    "Combinaison couleur/profil à confirmer.",
    "Colour/profile combination to be confirmed."
  ],
  [
    "Urbanix — Rouleau aluminium 0747",
    "Urbanix — Aluminium coil 0747"
  ],
  [
    "Aluminium à plier",
    "Aluminium for bending"
  ],
  [
    "Rouleau assorti au système Urbanix pour pliage; largeur 23¾ po, épaisseur 0,023 po.",
    "Matching Urbanix system coil for bending; width: 23¾ in, thickness: 0.023 in."
  ],
  [
    "rouleau — conditionnement MIR à confirmer",
    "coil — MIR packaging to be confirmed"
  ],
  [
    "La page indique que0747 n’existe pas dans toutes les couleurs Urbanix.",
    "The page states that 0747 is not available in all Urbanix colours."
  ],
  [
    "Photo officielle affichée dans la ligne 0747 Urbanix. Coloris illustrés seulement; gamme et disponibilité du rouleau à confirmer.",
    "Official photo shown in the 0747 Urbanix row. Illustrated colours only; coil range and availability to be confirmed."
  ],
  [
    "Gentek — Feuille peinte aluminium 3037, 24 po × 98,5 pi",
    "Gentek — Painted aluminium sheet 3037, 24 in × 98.5 ft"
  ],
  [
    "Rouleau peint des deux côtés, couleur sur Blanc pur. Format publié24 po×98,5 pi.",
    "Coil painted on both sides, colour over Blanc pur. Published size: 24 in × 98.5 ft."
  ],
  [
    "Répertoire Gentek —3037 p46; matrice p60–62",
    "Gentek directory — 3037 p. 46; matrix pp. 60–62"
  ],
  [
    "Gentek Canada — matrice aluminium 3037, mars 2026",
    "Gentek Canada — 3037 aluminium matrix, March 2026"
  ],
  [
    "Teinte indiquée pour le rouleau 3037 dans le guide Gentek 2026. Stock et fini à confirmer avec MIR.",
    "Shade listed for coil 3037 in the Gentek 2026 guide. Confirm stock and finish with MIR."
  ],
  [
    "rouleau de 98,5 pi annoncé — conditionnement MIR à confirmer",
    "listed as a 98.5 ft coil — MIR packaging to be confirmed"
  ],
  [
    "Épaisseur du3037 non confirmée; ne pas copier celle du PerformanceG8.",
    "3037 thickness is not confirmed; do not copy the Performance G8 thickness."
  ],
  [
    "Rayon et tolérances de pliage à confirmer.",
    "Bend radius and tolerances to be confirmed."
  ],
  [
    "Correspondances James Hardie de la page 63 à vérifier séparément avec Gentek : le code 431 est libellé différemment dans les deux matrices.",
    "James Hardie matches on page 63 must be checked separately with Gentek: code 431 has different labels in the two matrices."
  ],
  [
    "Visuel de la famille feuille peinte affiché par Gentek; le code 3037, la teinte et le format exacts ne sont pas identifiés dans la photo. Photo du rouleau en atelier, avec son environnement original.",
    "Painted-sheet family image shown by Gentek; code 3037, the exact colour and the size are not identified in the photo. Photo of the coil in a workshop, with its original surroundings."
  ],
  [
    "Aluminium peint deux côtés; revers Blanc pur",
    "Aluminium painted on both sides; Blanc pur reverse side"
  ],
  [
    "Vicwest Bellara — Feuille acier pour pliage",
    "Vicwest Bellara — Steel sheet for bending"
  ],
  [
    "Acier à plier",
    "Steel for bending"
  ],
  [
    "Feuilles planes et moulures personnalisées proposées dans le guide Bellara; format à préciser au devis.",
    "Flat sheets and custom trim offered in the Bellara guide; specify the size in the quote."
  ],
  [
    "Guide Bellara — moulures et feuilles planes p8 PDF",
    "Bellara guide — trim and flat sheets, PDF p. 8"
  ],
  [
    "Le guide confirme les feuilles planes sans dimensions ni palette propres.",
    "The guide confirms flat sheets without specific dimensions or a palette."
  ],
  [
    "Couleur Bellara; offre sur feuille plane de pliage à confirmer.",
    "Bellara colour; availability on flat sheet for bending to be confirmed."
  ],
  [
    "Nuancier Vicwest · Dark Rosewood (26 ga Bellara, sur commande spéciale); feuille plane/pliage à valider.",
    "Vicwest colour chart · Dark Rosewood (26 ga Bellara, special order); flat sheet/bending availability to be verified."
  ],
  [
    "Nuancier Vicwest · Charred Circle Sawn (26 ga Bellara, sur commande spéciale et minimum de commande); feuille plane/pliage à valider.",
    "Vicwest colour chart · Charred Circle Sawn (26 ga Bellara, special order and minimum order); flat sheet/bending availability to be verified."
  ],
  [
    "Nuancier Vicwest · Whitewashed Circle Sawn (26 ga Bellara, sur commande spéciale et minimum de commande); feuille plane/pliage à valider.",
    "Vicwest colour chart · Whitewashed Circle Sawn (26 ga Bellara, special order and minimum order); flat sheet/bending availability to be verified."
  ],
  [
    "Nuancier Vicwest · Smoked Barnboard (26 ga Bellara, sur commande spéciale); feuille plane/pliage à valider.",
    "Vicwest colour chart · Smoked Barnboard (26 ga Bellara, special order); flat sheet/bending availability to be verified."
  ],
  [
    "Nuancier Vicwest · Brindle Barnboard (26 ga Bellara, sur commande spéciale); feuille plane/pliage à valider.",
    "Vicwest colour chart · Brindle Barnboard (26 ga Bellara, special order); flat sheet/bending availability to be verified."
  ],
  [
    "Nuancier Vicwest · Obsidian Barnboard (26 ga Bellara, sur commande spéciale et minimum de commande); feuille plane/pliage à valider.",
    "Vicwest colour chart · Obsidian Barnboard (26 ga Bellara, special order and minimum order); flat sheet/bending availability to be verified."
  ],
  [
    "Nuancier officiel Vicwest, référence de couleur seulement. Disponibilité en feuille plane pour pliage et calibre à confirmer; aperçu écran non contractuel.",
    "Official Vicwest colour chart, for colour reference only. Confirm availability and gauge for flat sheet used in bending; on-screen preview is not binding."
  ],
  [
    "feuille — format à confirmer",
    "sheet — size to be confirmed"
  ],
  [
    "Format de feuille, jauge et couleur non confirmés.",
    "Sheet size, gauge and colour are not confirmed."
  ],
  [
    "Faisabilité et capacité de pliage MIR non documentées.",
    "MIR bending feasibility and capacity are not documented."
  ],
  [
    "Photo du produit exact non identifiée; aucune photo de bobine, tôle ou profil voisin ne lui est attribuée.",
    "No photo of the exact product has been identified; no photo of a similar coil, sheet or profile is assigned to it."
  ],
  [
    "Certains codes Vicwest sont documentés pour des produits autres que Bellara et peuvent ne pas être disponibles en feuille plane.",
    "Some Vicwest codes are documented for products other than Bellara and may not be available in flat sheets."
  ],
  [
    "J002 SHADOW — Contour de portes et fenêtres",
    "J002 SHADOW — Door and window trim"
  ],
  [
    "MoulureJ d’aluminium pour contours d’ouvertures, dans le système LightTrim panneau5/16 po.",
    "Aluminium J-trim for openings in the LightTrim 5/16 in panel system."
  ],
  [
    "J002 SHADOW — page produit",
    "J002 SHADOW — product page"
  ],
  [
    "Catalogue technique LightTrim",
    "LightTrim technical catalogue"
  ],
  [
    "Catalogue système; correspondance exacte à vérifier.",
    "System catalogue; exact match to be verified."
  ],
  [
    "Centre de schémas de positionnement LightTrim",
    "LightTrim positioning diagram centre"
  ],
  [
    "Choisir le système; pas un guide exact déjà sélectionné.",
    "Select the system; no exact guide is preselected."
  ],
  [
    "Largeur de face et géométrie complète non confirmées.",
    "Face width and complete geometry are not confirmed."
  ],
  [
    "J201 — Contour de portes et fenêtres",
    "J201 — Door and window trim"
  ],
  [
    "MoulureJ d’aluminium pour contours d’ouvertures, dans le système LightTrim clin.",
    "Aluminium J-trim for openings in the LightTrim lap siding system."
  ],
  [
    "J201 — page produit",
    "J201 — product page"
  ],
  [
    "CanExel VStyle — 12 po",
    "CanExel VStyle — 12 in"
  ],
  [
    "Revêtement HDF texturé de 12 pi; profil et sens de pose documentés par Maibec.",
    "12 ft textured HDF siding; profile and installation direction documented by Maibec."
  ],
  [
    "Fiche technique — CanExel VStyle — 12 po, mai 2025",
    "Technical data sheet — CanExel VStyle — 12 in, May 2025"
  ],
  [
    "Contrôle géométrique du débit seulement; orientation de pose, texture et assemblage à valider séparément.",
    "Geometric cutting check only; installation orientation, texture and assembly must be verified separately."
  ],
  [
    "CanExel Ced’R-Vue — 9 po",
    "CanExel Ced’R-Vue — 9 in"
  ],
  [
    "Fiche technique — CanExel Ced’R-Vue — 9 po, mai 2025",
    "Technical data sheet — CanExel Ced’R-Vue — 9 in, May 2025"
  ],
  [
    "CanExel Planche et couvre-joint — 12 po",
    "CanExel Board and Batten — 12 in"
  ],
  [
    "Fiche technique — CanExel Planche et couvre-joint — 12 po, mai 2025",
    "Technical data sheet — CanExel Board and Batten — 12 in, May 2025"
  ],
  [
    "Maibec Clin rainuré em+ — 6 po texturé",
    "Maibec Rabbeted Bevel em+ — 6 in textured"
  ],
  [
    "Lambris de sapin-épinette noueux, fini texturé. Dimensions réelles et largeur utile consignées séparément.",
    "Knotty spruce-fir siding with a textured finish. Actual dimensions and coverage width are recorded separately."
  ],
  [
    "Fiche technique — Maibec Clin rainuré em+ — 6 po texturé",
    "Technical data sheet — Maibec Rabbeted Bevel em+ — 6 in textured"
  ],
  [
    "Palette représentative; offre MIR et longueurs livrées à confirmer.",
    "Representative palette; MIR offering and delivered lengths to be confirmed."
  ],
  [
    "Maibec Contemporain em+ — 6 po texturé",
    "Maibec Contemporary em+ — 6 in textured"
  ],
  [
    "Fiche technique — Maibec Contemporain em+ — 6 po texturé",
    "Technical data sheet — Maibec Contemporary em+ — 6 in textured"
  ],
  [
    "Maibec Planche et couvre-joint — 10 po texturé",
    "Maibec Board and Batten — 10 in textured"
  ],
  [
    "Fiche technique — Maibec Planche et couvre-joint — 10 po texturé",
    "Technical data sheet — Maibec Board and Batten — 10 in textured"
  ],
  [
    "Documentation depuis la page Maibec — guide du lambris régulier",
    "Documentation from the Maibec page — regular siding guide"
  ],
  [
    "Ouvrir Documentation et sélectionner le guide du système régulier; ne pas utiliser automatiquement le guide em+.",
    "Open Documentation and select the regular system guide; do not automatically use the em+ guide."
  ],
  [
    "Panneau de fibrociment lisse, version apprêtée. Formats proposés : 4 × 8 pi et 4 × 10 pi; dimensions nominales et offre canadienne à confirmer.",
    "Smooth fibre cement panel, primed version. Offered sizes: 4 × 8 ft and 4 × 10 ft; nominal dimensions and Canadian availability to be confirmed."
  ],
  [
    "Gamme Allura Panels — formats et finis",
    "Allura Panels range — sizes and finishes"
  ],
  [
    "Manuel système; consulter la section Panel Siding et les instructions correspondant au support et aux fixations.",
    "System manual; consult the Panel Siding section and the instructions for the substrate and fasteners used."
  ],
  [
    "Dimensions nominales du tableau fabricant; largeur réelle, tolérance et offre locale à confirmer avant débit.",
    "Nominal dimensions from the manufacturer’s chart; confirm actual width, tolerances and local availability before cutting."
  ],
  [
    "Cette fiche vise la version apprêtée; aucune couleur Spectrum n’est implicitement appliquée.",
    "This sheet covers the primed version; no Spectrum colour is applied by default."
  ],
  [
    "4 × 8 pi — nominal",
    "4 × 8 ft — nominal"
  ],
  [
    "4 × 10 pi — nominal",
    "4 × 10 ft — nominal"
  ],
  [
    "Panneau de fibrociment à texture traditionnelle, version apprêtée. Formats proposés : 4 × 8 pi et 4 × 10 pi; dimensions nominales et offre canadienne à confirmer.",
    "Fibre cement panel with a traditional texture, primed version. Offered sizes: 4 × 8 ft and 4 × 10 ft; nominal dimensions and Canadian availability to be confirmed."
  ],
  [
    "Allura Trim — 5/4 × 4, réversible",
    "Allura Trim — 5/4 × 4, reversible"
  ],
  [
    "Moulure réversible avec face lisse et face texturée. Version apprêtée; dimensions nominales 5/4 × 4.",
    "Reversible trim with one smooth face and one textured face. Primed version; nominal dimensions: 5/4 × 4."
  ],
  [
    "Gamme Allura Trim — tailles nominales et finis",
    "Allura Trim range — nominal sizes and finishes"
  ],
  [
    "Dimensions réelles et longueur du format exact à confirmer; ne pas déduire une épaisseur réelle de 1¼ po du nom 5/4.",
    "Actual dimensions and length of the exact size must be confirmed; do not infer an actual thickness of 1¼ in from the 5/4 name."
  ],
  [
    "Orientation du contour dépend de la conception; guide du système à suivre.",
    "Trim orientation depends on the design; follow the system guide."
  ],
  [
    "Vue officielle de plusieurs moulures de la gamme Allura. Le fini et la couleur de la référence choisie sont à confirmer.",
    "Official image of several trim products from the Allura range. Confirm the finish and colour of the selected reference."
  ],
  [
    "LP SmartSide 38 — panneau Cedar sans rainure",
    "LP SmartSide 38 — Cedar panel, no groove"
  ],
  [
    "Panneau apprêté à texture de cèdre et bords à feuillure. Choisissez la longueur 8, 9 ou 10 pi; chaque format possède son propre PID fabricant.",
    "Primed cedar-textured panel with shiplap edges. Choose an 8, 9 or 10 ft length; each size has its own manufacturer PID."
  ],
  [
    "Spécifications LP SmartSide — PID 25855, 29189 et 25825",
    "LP SmartSide specifications — PID 25855, 29189 and 25825"
  ],
  [
    "Centre de documentation LP — choisir le guide du profil",
    "LP documentation centre — select the profile guide"
  ],
  [
    "Le centre contient plusieurs systèmes; aucun guide exact n’est présélectionné.",
    "The centre contains several systems; no exact guide is preselected."
  ],
  [
    "Disponibilité régionale et édition de fabrication du PID à confirmer.",
    "Regional availability and the manufacturing edition for this PID must be confirmed."
  ],
  [
    "La réalisation photographiée est un exemple de gamme; son fini ne correspond pas nécessairement à la pièce apprêtée.",
    "The photographed project is an example from the range; its finish does not necessarily match the primed piece."
  ],
  [
    "Image originale du catalogue LP 2026, page PDF 33 / imprimées 64–65, section Panel Cedar 38 contenant les modèles à rainure et sans rainure. L’image montre la surface Cedar; elle ne prouve ni le chant NGSL ni la longueur 10 pi du PID 25825. Résolution originale limitée à 111 × 219 px.",
    "Original image from the LP 2026 catalogue, PDF page 33 / printed pages 64–65, Panel Cedar 38 section containing grooved and ungrooved models. The image shows the Cedar surface; it does not establish the NGSL edge or the 10 ft length of PID 25825. Original resolution limited to 111 × 219 px."
  ],
  [
    "8 pi — largeur réelle 48,56 po — PID 25855",
    "8 ft — actual width 48.56 in — PID 25855"
  ],
  [
    "Article indiqué sur commande spéciale par LP; offre et délai MIR non confirmés.",
    "LP lists this item as a special order; MIR offering and lead time are not confirmed."
  ],
  [
    "9 pi — largeur réelle 48,56 po — PID 29189",
    "9 ft — actual width 48.56 in — PID 29189"
  ],
  [
    "10 pi — largeur réelle 48,56 po — PID 25825",
    "10 ft — actual width 48.56 in — PID 25825"
  ],
  [
    "LP SmartSide 38 — Shake Cedar, 12 po nominal",
    "LP SmartSide 38 — Cedar Shake, 12 in nominal"
  ],
  [
    "Version apprêtée, texture de cèdre. Référence PID 42092; dimensions réelles issues des spécifications LP.",
    "Primed version with a cedar texture. Reference PID 42092; actual dimensions from LP specifications."
  ],
  [
    "Spécifications LP SmartSide — PID 42092",
    "LP SmartSide specifications — PID 42092"
  ],
  [
    "Pureau variable : la page actuelle indique 7 à 10 po; le tableau de couvrance de juillet 2021 indique 6 7/8 à 9 7/8 po. Valeur de pose du projet à confirmer, sans défaut automatique.",
    "Variable exposure: the current page states 7 to 10 in; the July 2021 coverage chart states 6 7/8 to 9 7/8 in. Confirm the project’s installation exposure; no default is applied automatically."
  ],
  [
    "Image originale du catalogue LP 2026, page PDF 26 / imprimées 50–51, section Shake Cedar 38 où apparaît le PID 42092. La forme réversible du profil est illustrée; la photographie ne sert pas de mesure. Résolution originale limitée à 239 × 107 px.",
    "Original image from the LP 2026 catalogue, PDF page 26 / printed pages 50–51, Shake Cedar 38 section listing PID 42092. The reversible profile shape is illustrated; the photograph is not used for measurements. Original resolution limited to 239 × 107 px."
  ],
  [
    "LP SmartSide 440 — moulure Brushed Smooth 3½ po",
    "LP SmartSide 440 — Brushed Smooth trim 3½ in"
  ],
  [
    "Moulure apprêtée de 16 pi; PID 46000 dans la fiche LP de juillet 2023. Offre actuelle à confirmer.",
    "16 ft primed trim; PID 46000 in the July 2023 LP sheet. Current availability to be confirmed."
  ],
  [
    "Fiche Brushed Smooth Trim — juillet 2023",
    "Brushed Smooth Trim data sheet — July 2023"
  ],
  [
    "Centre de documentation LP — guide Trim & Fascia",
    "LP documentation centre — Trim & Fascia guide"
  ],
  [
    "Image originale du catalogue LP 2026, page PDF 43 / imprimées 84–85, section Trim Brushed Smooth 440. Le groupe représente plusieurs largeurs; ne certifie pas le format 3½ po du PID 46000. Résolution originale limitée à 191 × 142 px.",
    "Original image from the LP 2026 catalogue, PDF page 43 / printed pages 84–85, Trim Brushed Smooth 440 section. The group represents several widths; it does not confirm the 3½ in size of PID 46000. Original resolution limited to 191 × 142 px."
  ],
  [
    "Vinyle",
    "Vinyl"
  ],
  [
    "Revêtement de vinyle horizontal, double 4 po. Longueur 12 pi 6 po; 24 panneaux par carton de 200 pi².",
    "Horizontal double 4 in vinyl siding. Length: 12 ft 6 in; 24 panels per 200 sq. ft. carton."
  ],
  [
    "Spécifications DaVinci — avril 2022",
    "DaVinci specifications — April 2022"
  ],
  [
    "Guide d’estimation et de pose vinyle — août 2026",
    "Vinyl estimating and installation guide — August 2026"
  ],
  [
    "Lien officiel présent dans la page produit; contenu complet non revalidé dans cette itération.",
    "Official link provided on the product page; the full content was not rechecked in this review."
  ],
  [
    "Couleur de la page DaVinci; profil, région et disponibilité MIR à confirmer. Cobalt et Nordic Blue non offerts aux États-Unis.",
    "Colour from the DaVinci page; profile, region and MIR availability to be confirmed. Cobalt and Nordic Blue are not available in the United States."
  ],
  [
    "carton de 24 panneaux — unité MIR à confirmer",
    "carton of 24 panels — MIR sales unit to be confirmed"
  ],
  [
    "Largeur physique du panneau non vérifiée; le double 4 po décrit sa surface exposée.",
    "Physical panel width not verified; double 4 in describes its exposure."
  ],
  [
    "Palette de page représentative; aucune extension aux D4½ réservés à certaines provinces de l’Ouest.",
    "Representative page palette; not extended to D4½ profiles restricted to certain western provinces."
  ],
  [
    "Sequoia Select — Double 4 po, 64496",
    "Sequoia Select — Double 4 in, 64496"
  ],
  [
    "Revêtement horizontal de vinyle à texture simili-cèdre, longueur 12 pi 6 po. Profil double 4 po.",
    "Horizontal cedar-textured vinyl siding, 12 ft 6 in long. Double 4 in profile."
  ],
  [
    "Répertoire Gentek — juin 2026, page 5 et matrice 52–53",
    "Gentek directory — June 2026, page 5 and matrix on pages 52–53"
  ],
  [
    "Guide de pose vinyle — centre de ressources Sequoia",
    "Vinyl installation guide — Sequoia resource centre"
  ],
  [
    "Lien « Gentek Vinyl Products Installation Guide » sur la page; ne pas présenter cette page comme PDF exact.",
    "The page contains a “Gentek Vinyl Products Installation Guide” link; do not present this page as the actual PDF."
  ],
  [
    "Répertoire Gentek, profil Double 4 po. Échantillon écran indicatif; disponibilité MIR et lot à confirmer.",
    "Gentek directory, Double 4 in profile. Screen sample is illustrative; MIR availability and batch to be confirmed."
  ],
  [
    "Largeur physique hors surface exposée non vérifiée; maxPiece ne contient que la longueur.",
    "Physical width beyond the exposed surface not verified; maxPiece contains only the length."
  ],
  [
    "Harrywood — acier, 12 pi",
    "Harrywood — steel, 12 ft"
  ],
  [
    "Profil en acier galvanisé prépeint, déclinaison pleine. Largeur annoncée 6 1/16 po, profondeur 3/8 po.",
    "Prepainted galvanized steel profile, solid version. Stated width: 6 1/16 in; depth: 3/8 in."
  ],
  [
    "Fiche technique Harrywood",
    "Harrywood technical data sheet"
  ],
  [
    "Lien relevé dans la page produit, lecture du PDF à compléter.",
    "Link found on the product page; the PDF still needs to be reviewed."
  ],
  [
    "Fiche et documents techniques Harrywood",
    "Harrywood technical data sheet and documents"
  ],
  [
    "Guide d’installation Harrywood",
    "Harrywood installation guide"
  ],
  [
    "Palette Harrywood affichée par MAC; nuance, jauge et disponibilité MIR à confirmer.",
    "Harrywood palette displayed by MAC; shade, gauge and MIR availability to be confirmed."
  ],
  [
    "Tiago — aluminium, 150 po",
    "Tiago — aluminum, 150 in"
  ],
  [
    "Profil plat en aluminium, longueur 150 po.",
    "Flat aluminum profile, 150 in long."
  ],
  [
    "Fiche technique Tiago",
    "Tiago technical data sheet"
  ],
  [
    "Guide de pose Rialux — 2024",
    "Rialux installation guide — 2024"
  ],
  [
    "Échantillon officiel du profil; représentation écran indicative, disponibilité MIR à confirmer.",
    "Official profile sample; screen representation is illustrative, and MIR availability is to be confirmed."
  ],
  [
    "La largeur annoncée est distincte de la largeur physique hors emboîtement; cette dernière reste non renseignée dans maxPiece.",
    "The stated width differs from the physical width excluding the interlock; the latter is not entered in maxPiece."
  ],
  [
    "Échantillon officiel du profil et de la teinte Écorce; ne certifie pas la longueur, le stock MIR ou une mesure de pose. Fichier haute définition d’origine, sans recoloration.",
    "Official sample of the profile in Écorce; it does not certify length, MIR stock or an installation measurement. Original high-resolution file, with no recolouring."
  ],
  [
    "Bolton — aluminium, 150 po",
    "Bolton — aluminum, 150 in"
  ],
  [
    "Profil vertical Board & Batten en aluminium, longueur 150 po.",
    "Vertical aluminum Board & Batten profile, 150 in long."
  ],
  [
    "Fiche technique Bolton",
    "Bolton technical data sheet"
  ],
  [
    "panneau ou boîte de 10 — unité MIR à confirmer",
    "panel or box of 10 — MIR sales unit to be confirmed"
  ],
  [
    "Bluhouss — profil 307, cèdre blanc Ecobleach",
    "Bluhouss — profile 307, Ecobleach white cedar"
  ],
  [
    "Cèdre blanc au fini antiqué, embouveté quatre faces, sans clous apparents. Nominal 1 × 5 po.",
    "Antiqued white cedar, tongue-and-groove on all four sides, with no exposed nails. Nominal size: 1 × 5 in."
  ],
  [
    "Dessin du profil 307",
    "Profile 307 drawing"
  ],
  [
    "Guide de bonnes pratiques bois massif — lien JDP",
    "Solid wood best practices guide — JDP link"
  ],
  [
    "Guide général du bois massif; ne certifie pas seul les orientations du profil 307.",
    "General solid wood guide; it does not by itself certify installation orientations for profile 307."
  ],
  [
    "Aspect vieilli naturellement variable; échantillon réel et offre MIR à confirmer.",
    "Naturally variable weathered appearance; a physical sample and MIR offering are to be confirmed."
  ],
  [
    "Orientation du profil 307 non confirmée par un guide spécifique; rendu de pose neutralisé.",
    "No profile-specific guide confirms the installation orientation of profile 307; the layout rendering is neutralized."
  ],
  [
    "Largeur physique réelle non renseignée; 5 po est une largeur nominale.",
    "Actual physical width not provided; 5 in is a nominal width."
  ],
  [
    "St-Laurent Board & Batten — planche 12 po",
    "St-Laurent Board & Batten — 12 in board"
  ],
  [
    "Planche de fibrociment verticale avec couvre-joints distincts. La page annonce une surface de 36 pi² par paquet de 3 planches.",
    "Vertical fibre cement board with separate battens. The page states coverage of 36 sq. ft. per pack of 3 boards."
  ],
  [
    "Page technique — Board & Batten",
    "Technical page — Board & Batten"
  ],
  [
    "Guide lié par St-Laurent — portée à vérifier",
    "Guide linked by St-Laurent — scope to be verified"
  ],
  [
    "Le PDF consulté vise HardiePlank HZ5; il ne constitue pas un guide exact du système Board & Batten.",
    "The reviewed PDF covers HardiePlank HZ5; it is not the exact guide for the Board & Batten system."
  ],
  [
    "Nuancier fibrociment St-Laurent, association au profil et offre MIR à confirmer.",
    "St-Laurent fibre cement colour chart; profile compatibility and MIR offering to be confirmed."
  ],
  [
    "Longueur de la planche non explicitement publiée; aucune longueur ni maxPiece déduite du rendement.",
    "Board length is not explicitly published; neither length nor maxPiece is inferred from coverage."
  ],
  [
    "Palette du système non entièrement confirmée pour chaque combinaison; aucun stock MIR.",
    "The system palette is not fully confirmed for every combination; no MIR stock information."
  ],
  [
    "PRIME 30724 — Clous annelés en bobine 2 po · galvanisés à chaud",
    "PRIME 30724 — 2 in ring-shank coil nails · hot-dip galvanized"
  ],
  [
    "Mini clous annelés en bobine à 15°, reliure basse, longueur 2 po. Catalogue « Revêtement extérieur • clôture • lattage »; fini galvanisé à chaud (hdg).",
    "15° mini ring-shank coil nails, low collation, 2 in long. “Exterior siding • fencing • strapping” catalogue; hot-dip galvanized (HDG) finish."
  ],
  [
    "PRIME — Catalogue clous attachés 2025",
    "PRIME — Collated nails catalogue 2025"
  ],
  [
    "Page PDF 7 (pages imprimées 12–13), ligne 30724. Vérifier le parement, le support et la cloueuse avant de sélectionner la fixation.",
    "PDF page 7 (printed pages 12–13), row 30724. Check the siding, substrate and nailer before selecting the fastener."
  ],
  [
    "Galvanisé à chaud (HDG)",
    "Hot-dip galvanized (HDG)"
  ],
  [
    "Calibre / diamètre publié",
    "Published gauge / diameter"
  ],
  [
    "0.092 po",
    "0.092 in"
  ],
  [
    "Tige",
    "Shank"
  ],
  [
    "Annelée",
    "Ring-shank"
  ],
  [
    "Reliure",
    "Collation"
  ],
  [
    "basse",
    "low"
  ],
  [
    "Clous par boîte",
    "Nails per box"
  ],
  [
    "Boîtes par palette",
    "Boxes per pallet"
  ],
  [
    "boîte de 4 500 clous",
    "box of 4,500 nails"
  ],
  [
    "Prix, stock MIR et compatibilité de chantier à confirmer.",
    "Pricing, MIR stock and job-site compatibility to be confirmed."
  ],
  [
    "PRIME 34733 — Clous à revêtement 2 po, galvanisé à chaud (hdg)",
    "PRIME 34733 — 2 in siding nails, hot-dip galvanized (HDG)"
  ],
  [
    "Page PDF 7 (pages imprimées 12–13), ligne 34733. Vérifier le parement, le support et la cloueuse avant de sélectionner la fixation.",
    "PDF page 7 (printed pages 12–13), row 34733. Check the siding, substrate and nailer before selecting the fastener."
  ],
  [
    "0.090 po",
    "0.090 in"
  ],
  [
    "Origine indiquée au catalogue",
    "Origin stated in the catalogue"
  ],
  [
    "Fabriqué au Canada",
    "Made in Canada"
  ],
  [
    "boîte de 5400 clous — prix et offre MIR à confirmer",
    "box of 5,400 nails — MIR pricing and offering to be confirmed"
  ],
  [
    "Illustration de la famille de clous; la longueur exacte de la référence est donnée dans le tableau fabricant.",
    "Illustration of the nail family; the exact length of this reference is provided in the manufacturer’s table."
  ],
  [
    "PRIME 34833 — Clous à revêtement 2 po, acier inoxydable",
    "PRIME 34833 — 2 in siding nails, stainless steel"
  ],
  [
    "Mini clous annelés en bobine à 15°, reliure basse, longueur 2 po. Catalogue « Revêtement extérieur • clôture • lattage »; fini acier inoxydable.",
    "15° mini ring-shank coil nails, low collation, 2 in long. “Exterior siding • fencing • strapping” catalogue; stainless steel finish."
  ],
  [
    "Page PDF 8 (pages imprimées 14–15), ligne 34833. Vérifier le parement, le support et la cloueuse avant de sélectionner la fixation.",
    "PDF page 8 (printed pages 14–15), row 34833. Check the siding, substrate and nailer before selecting the fastener."
  ],
  [
    "boîte de 3600 clous — prix et offre MIR à confirmer",
    "box of 3,600 nails — MIR pricing and offering to be confirmed"
  ],
  [
    "PRIME 34793 — Clous à revêtement 2 po, galvanisé à chaud (hdg)",
    "PRIME 34793 — 2 in siding nails, hot-dip galvanized (HDG)"
  ],
  [
    "Mini clous annelés en bobine à 15°, reliure haute, conique, longueur 2 po. Catalogue « Revêtement extérieur • clôture • lattage »; fini galvanisé à chaud (hdg).",
    "15° mini ring-shank coil nails, high conical collation, 2 in long. “Exterior siding • fencing • strapping” catalogue; hot-dip galvanized (HDG) finish."
  ],
  [
    "Page PDF 8 (pages imprimées 14–15), ligne 34793. Vérifier le parement, le support et la cloueuse avant de sélectionner la fixation.",
    "PDF page 8 (printed pages 14–15), row 34793. Check the siding, substrate and nailer before selecting the fastener."
  ],
  [
    "haute, conique",
    "high, conical"
  ],
  [
    "PRIME — Clous à revêtement 2 po · 5 400/boîte",
    "PRIME — 2 in siding nails · 5,400/box"
  ],
  [
    "PRIME 30644 : mini clous de 2 po en bobine à 15°, tige annelée de 0,090 po, reliure basse et fini brillant. Boîte de 5 400 clous.",
    "PRIME 30644: 2 in mini nails in 15° coils, 0.090 in ring shank, low collation and bright finish. Box of 5,400 nails."
  ],
  [
    "Page PDF 7 (pages imprimées 12–13), ligne 30644. Vérifier le parement, le support et la cloueuse avant de sélectionner la fixation.",
    "PDF page 7 (printed pages 12–13), row 30644. Check the siding, substrate and nailer before selecting the fastener."
  ],
  [
    "Brillant",
    "Bright"
  ],
  [
    "boîte de 5 400 clous",
    "box of 5,400 nails"
  ],
  [
    "Clous à revêtement 2 po — référence expressément désignée par MIR",
    "2 in siding nails — reference specifically selected by MIR"
  ],
  [
    "PRIME 34631 — Clous à revêtement 2 po, brillant",
    "PRIME 34631 — 2 in siding nails, bright"
  ],
  [
    "Mini clous annelés en bobine à 15°, reliure basse, longueur 2 po. Catalogue « Revêtement extérieur • clôture • lattage »; fini brillant.",
    "15° mini ring-shank coil nails, low collation, 2 in long. “Exterior siding • fencing • strapping” catalogue; bright finish."
  ],
  [
    "Page PDF 7 (pages imprimées 12–13), ligne 34631. Vérifier le parement, le support et la cloueuse avant de sélectionner la fixation.",
    "PDF page 7 (printed pages 12–13), row 34631. Check the siding, substrate and nailer before selecting the fastener."
  ],
  [
    "0.083 po",
    "0.083 in"
  ],
  [
    "boîte de 6300 clous — prix et offre MIR à confirmer",
    "box of 6,300 nails — MIR pricing and offering to be confirmed"
  ],
  [
    "Maibec CanExel — Peinture de retouche 284 ml",
    "Maibec CanExel — Touch-up paint, 284 ml"
  ],
  [
    "Référence de commande/couleur, prix et offre MIR à valider; aucune donnée inventée.",
    "Order/colour reference, MIR pricing and offering to be verified; no invented data."
  ],
  [
    "contenant",
    "container"
  ],
  [
    "Faire correspondre la teinte au revêtement CanExel réellement posé; ne pas substituer une retouche d’une autre marque.",
    "Match the shade to the installed CanExel siding; do not substitute another brand’s touch-up product."
  ],
  [
    "CanExel — calcul des quantités et conditionnements",
    "CanExel — quantity calculations and packaging"
  ],
  [
    "Page ou document de système; ne constitue pas une validation universelle du chantier.",
    "System page or document; it does not constitute universal job-site approval."
  ],
  [
    "CanExel — guide de retouche",
    "CanExel — touch-up guide"
  ],
  [
    "Peinture de retouche",
    "Touch-up paint"
  ],
  [
    "Référence de commande, couleur, disponibilité, prix et unité de vente MIR à confirmer.",
    "Order reference, colour, availability, pricing and MIR sales unit to be confirmed."
  ],
  [
    "Contenance publiée",
    "Published volume"
  ],
  [
    "Conditionnement fabricant",
    "Manufacturer packaging"
  ],
  [
    "12 contenants/boîte",
    "12 containers/box"
  ],
  [
    "Teinte",
    "Colour"
  ],
  [
    "À faire correspondre au CanExel posé; code de commande à confirmer",
    "Match to the installed CanExel; order code to be confirmed"
  ],
  [
    "Peinture de retouche Maibec CanExel en contenant de 284 ml, destinée aux coupes et petites reprises selon le guide fabricant. La couleur doit correspondre au revêtement installé.",
    "Maibec CanExel touch-up paint in a 284 ml container, for cut edges and minor touch-ups as directed by the manufacturer’s guide. The colour must match the installed siding."
  ],
  [
    "contenant de 284 ml ou boîte de 12 — vente MIR à confirmer",
    "284 ml container or box of 12 — MIR sales format to be confirmed"
  ],
  [
    "Photo fabricant d’un contenant Acadia. Ne certifie pas une disponibilité actuelle de cette teinte ni un kit avec pinceau.",
    "Manufacturer photo of an Acadia container. It does not certify current availability of this colour or a kit with a brush."
  ],
  [
    "ColorPlus — Kit de retouche",
    "ColorPlus — Touch-up kit"
  ],
  [
    "1 pint de peinture (libellé fabricant; volume commercial local à confirmer)",
    "1 pint of paint (manufacturer’s wording; local sales volume to be confirmed)"
  ],
  [
    "Même teinte ColorPlus que le produit à retoucher; aucune compatibilité universelle ni substitution à une finition appliquée sur chantier.",
    "Use the same ColorPlus colour as the product being touched up; no universal compatibility or substitution for a site-applied finish."
  ],
  [
    "La page officielle limite la disponibilité selon le lieu; conditionnement et référence Canada/Québec à confirmer.",
    "The official page limits availability by location; packaging and the Canada/Québec reference are to be confirmed."
  ],
  [
    "Page produit officielle — caractéristiques",
    "Official product page — specifications"
  ],
  [
    "Contenu publié",
    "Published contents"
  ],
  [
    "1 pint de peinture, Nail Concealer, Edge Sealer",
    "1 pint of paint, Nail Concealer, Edge Sealer"
  ],
  [
    "Finition visée",
    "Intended finish"
  ],
  [
    "Région",
    "Region"
  ],
  [
    "Référence Canada/Québec et volume commercial local à confirmer",
    "Canada/Québec reference and local sales volume to be confirmed"
  ],
  [
    "Kit de retouche officiel pour parements et moulures James Hardie avec finition ColorPlus. Le contenu et la disponibilité de la référence locale doivent être confirmés pour le Canada.",
    "Official touch-up kit for James Hardie siding and trim with a ColorPlus finish. The contents and availability of the local reference must be confirmed for Canada."
  ],
  [
    "kit — référence Canada, teinte et unité MIR à confirmer",
    "kit — Canadian reference, colour and MIR sales unit to be confirmed"
  ],
  [
    "Photo officielle de la gamme; couleur et référence locale du kit non confirmées.",
    "Official product-line photo; kit colour and local reference not confirmed."
  ],
  [
    "CanExel — Moulure de joint Ridgewood D-5, 12 po",
    "CanExel — Ridgewood D-5 joint trim, 12 in"
  ],
  [
    "pièce",
    "piece"
  ],
  [
    "Jonction du revêtement selon le profil fabricant; vérifier le détail de pose régional.",
    "Siding joint according to the manufacturer’s profile; check the regional installation detail."
  ],
  [
    "CanExel — conditionnements et détail de moulure de joint",
    "CanExel — packaging and joint trim detail"
  ],
  [
    "CanExel — conseils et tutoriels de pose",
    "CanExel — installation tips and tutorials"
  ],
  [
    "Moulure de joint",
    "Joint trim"
  ],
  [
    "Aucune photo isolée de cette référence confirmée; schéma de mise en œuvre fabricant dans le document de calcul, page 2.",
    "No standalone photo of this reference confirmed; manufacturer’s installation diagram is on page 2 of the calculation document."
  ],
  [
    "Profil de revêtement visé",
    "Intended siding profile"
  ],
  [
    "Format publié",
    "Published size"
  ],
  [
    "12 po",
    "12 in"
  ],
  [
    "Matériau",
    "Material"
  ],
  [
    "120 pièces/boîte",
    "120 pieces/box"
  ],
  [
    "Moulure de joint en aluminium pour le profil CanExel Ridgewood D-5, format publié 12 po. Correspondance proposée au terme « joint mécanique »; détail de pose et couleur à valider.",
    "Aluminum joint trim for the CanExel Ridgewood D-5 profile, published size 12 in. Proposed match for the term “mechanical joint”; installation detail and colour to be verified."
  ],
  [
    "pièce ou boîte de 120 — vente MIR à confirmer",
    "piece or box of 120 — MIR sales format to be confirmed"
  ],
  [
    "CanExel — Moulure de joint VStyle, 12 po",
    "CanExel — VStyle joint trim, 12 in"
  ],
  [
    "Moulure de joint en aluminium pour le profil CanExel VStyle, format publié 12 po. Correspondance proposée au terme « joint mécanique »; détail de pose et couleur à valider.",
    "Aluminum joint trim for the CanExel VStyle profile, published size 12 in. Proposed match for the term “mechanical joint”; installation detail and colour to be verified."
  ],
  [
    "CanExel — Moulure de joint Ced’R Vue, 9 po",
    "CanExel — Ced’R Vue joint trim, 9 in"
  ],
  [
    "Ced’R Vue 9 po",
    "Ced’R Vue 9 in"
  ],
  [
    "9 po",
    "9 in"
  ],
  [
    "Moulure de joint en aluminium pour le profil CanExel Ced’R Vue 9 po, format publié 9 po. Correspondance proposée au terme « joint mécanique »; détail de pose et couleur à valider.",
    "Aluminum joint trim for the CanExel Ced’R Vue 9 in profile, published size 9 in. Proposed match for the term “mechanical joint”; installation detail and colour to be verified."
  ],
  [
    "CanExel — Moulure de joint Ced’R Vue, 6 po",
    "CanExel — Ced’R Vue joint trim, 6 in"
  ],
  [
    "Format 6 po présent dans le calculateur 2024, mais absent de la liste de joints du guide de pose 2026 consulté; maintien au catalogue actuel à confirmer.",
    "The 6 in size appears in the 2024 calculator but is absent from the joint list in the reviewed 2026 installation guide; continued inclusion in the current catalogue is to be confirmed."
  ],
  [
    "Ced’R Vue 6 po",
    "Ced’R Vue 6 in"
  ],
  [
    "6 po",
    "6 in"
  ],
  [
    "Moulure de joint en aluminium pour le profil CanExel Ced’R Vue 6 po, format publié 6 po. Correspondance proposée au terme « joint mécanique »; détail de pose et couleur à valider.",
    "Aluminum joint trim for the CanExel Ced’R Vue 6 in profile, published size 6 in. Proposed match for the term “mechanical joint”; installation detail and colour to be verified."
  ],
  [
    "Kaycan — Rouleau aluminium 0721, 24 po × 30 m",
    "Kaycan — Aluminum coil 0721, 24 in × 30 m"
  ],
  [
    "30 m (environ 98,43 pi)",
    "30 m (approximately 98.43 ft)"
  ],
  [
    "La source fabricant publie 30 m; ne pas renommer 100 pi.",
    "The manufacturer’s source states 30 m; do not rename it 100 ft."
  ],
  [
    "Kaycan indique que toutes les couleurs ne sont pas offertes; validation auprès de la succursale nécessaire.",
    "Kaycan states that not all colours are available; confirmation from the branch is required."
  ],
  [
    "Catalogue Kaycan — lien complémentaire non inspecté intégralement",
    "Kaycan catalogue — supplementary link not fully reviewed"
  ],
  [
    "Lien officiel et extrait indexé identifiés; document complet non inspecté. La page produit actuelle confirme les codes et dimensions retenus.",
    "Official link and indexed excerpt identified; full document not reviewed. The current product page confirms the selected codes and dimensions."
  ],
  [
    "Largeur du rouleau uniquement; épaisseur, longueur livrée et possibilités de pliage à confirmer.",
    "Coil width only; thickness, delivered length and bending options to be confirmed."
  ],
  [
    "Aucune photo isolée spécifique au 0721 confirmée.",
    "No standalone photo specific to 0721 confirmed."
  ],
  [
    "Code de base",
    "Base code"
  ],
  [
    "Format fabricant",
    "Manufacturer size"
  ],
  [
    "24 po × 30 m",
    "24 in × 30 m"
  ],
  [
    "Conversion de longueur",
    "Length conversion"
  ],
  [
    "30 m ≈ 98,43 pi; ne pas assimiler à 100 pi",
    "30 m ≈ 98.43 ft; do not treat it as 100 ft"
  ],
  [
    "Non confirmée pour cette référence",
    "Not confirmed for this reference"
  ],
  [
    "Rouleau d’aluminium Kaycan 0721, largeur de 24 po et longueur publiée de 30 m. Cette longueur équivaut à environ 98,43 pi et ne constitue pas un rouleau exact de 100 pi.",
    "Kaycan aluminum coil 0721, 24 in wide with a published length of 30 m. This equals approximately 98.43 ft and is not an exact 100 ft coil."
  ],
  [
    "rouleau de 30 m — couleur et unité MIR à confirmer",
    "30 m coil — colour and MIR sales unit to be confirmed"
  ],
  [
    "Membrane blanche 3 po — référence à confirmer",
    "White 3 in membrane — reference to be confirmed"
  ],
  [
    "Membrane à identifier",
    "Membrane to be identified"
  ],
  [
    "Produit recherché : membrane blanche de 3 po pour les travaux de revêtement extérieur. La référence et son usage exact doivent être confirmés. Le ruban industriel 4411W+ est un candidat documenté, sans être présenté comme une membrane de solin équivalente.",
    "Requested product: white 3 in membrane for exterior siding work. The reference and exact use must be confirmed. Industrial tape 4411W+ is a documented candidate, not presented as an equivalent flashing membrane."
  ],
  [
    "3M Extreme Sealing Tape 4411W+ — candidat distinct, demande non identifiée",
    "3M Extreme Sealing Tape 4411W+ — separate candidate, requested product unidentified"
  ],
  [
    "Source du candidat consulté. Ce produit ne confirme pas l’identité de la demande et n’est pas attribué à cette fiche.",
    "Source for the candidate reviewed. This product does not establish the identity of the requested item and is not assigned to this listing."
  ],
  [
    "Fiche technique du candidat 4411W+ — usage industriel à distinguer",
    "Candidate 4411W+ technical data sheet — distinguish its industrial use"
  ],
  [
    "Cette documentation ne confirme pas un usage de membrane de solin pour la demande de Fred.",
    "This documentation does not confirm flashing membrane use for Fred’s request."
  ],
  [
    "format et conditionnement à confirmer",
    "size and packaging to be confirmed"
  ],
  [
    "Produit exact non identifié; code fabricant ou étiquette requis avant toute sélection commerciale.",
    "Exact product unidentified; manufacturer code or label required before any commercial selection."
  ],
  [
    "Code fabricant ou étiquette du produit à obtenir.",
    "Manufacturer code or product label to be obtained."
  ],
  [
    "Identité, dimensions, couleur, conditionnement, prix et disponibilité MIR non confirmés.",
    "Identity, dimensions, colour, packaging, pricing and MIR availability not confirmed."
  ],
  [
    "Demande utilisateur",
    "User request"
  ],
  [
    "Membrane blanche, largeur 3 po",
    "White membrane, 3 in wide"
  ],
  [
    "Référence exacte",
    "Exact reference"
  ],
  [
    "À identifier; ne pas assimiler automatiquement au ruban industriel 4411W+",
    "To be identified; do not automatically equate it with industrial tape 4411W+"
  ],
  [
    "Vis de fascia — tête hexagonale 1/4 po, couleurs Kaycan — référence à confirmer",
    "Fascia screws — 1/4 in hex head, Kaycan colours — reference to be confirmed"
  ],
  [
    "Fixation à identifier",
    "Fastener to be identified"
  ],
  [
    "Modèle recherché : vis de fascia à tête hexagonale de 1/4 po, avec une finition assortie aux couleurs Kaycan. Le code produit, la longueur, le calibre et les couleurs offertes restent à confirmer. Le 1/4 po désigne la tête ou l’outil.",
    "Requested model: fascia screws with a 1/4 in hex head, finished to match Kaycan colours. Product code, length, gauge and available colours remain to be confirmed. The 1/4 in dimension refers to the head or tool."
  ],
  [
    "Vis Robertson Kaycan #8 × 1 1/4 po — candidat distinct, demande non identifiée",
    "Kaycan Robertson screws #8 × 1 1/4 in — separate candidate, requested product unidentified"
  ],
  [
    "Vis de fascia, tête hexagonale 1/4 po, couleurs Kaycan",
    "Fascia screws, 1/4 in hex head, Kaycan colours"
  ],
  [
    "Dimension de 1/4 po",
    "1/4 in dimension"
  ],
  [
    "Tête ou outil demandé; ce n’est pas une longueur de vis",
    "Requested head or tool size; this is not a screw length"
  ],
  [
    "À identifier; la 1435 Robertson ne correspond pas à la tête demandée",
    "To be identified; the 1435 Robertson does not match the requested head"
  ],
  [
    "Embouts 45° pour pistolet à calfeutrer — paquet de 5",
    "45° caulking gun nozzles — pack of 5"
  ],
  [
    "Accessoire de calfeutrage",
    "Caulking accessory"
  ],
  [
    "Embouts à 45° vendus en paquet de 5 sous la référence détaillant CANAC 55001518. La marque et la compatibilité exacte restent à confirmer.",
    "45° nozzles sold in packs of 5 under retailer reference CANAC 55001518. Brand and exact compatibility remain to be confirmed."
  ],
  [
    "paquet",
    "pack"
  ],
  [
    "paquet de 5",
    "pack of 5"
  ],
  [
    "Marque, compatibilité, prix, stock et image exacte à confirmer.",
    "Brand, compatibility, price, stock and exact image to be confirmed."
  ],
  [
    "Marque et compatibilité exactes à confirmer.",
    "Exact brand and compatibility to be confirmed."
  ],
  [
    "Prix et stock MIR non confirmés.",
    "MIR price and stock not confirmed."
  ],
  [
    "Embouts coniques jaunes YELLOW NOZZLE/5 — paquet de 5",
    "YELLOW NOZZLE/5 yellow tapered nozzles — pack of 5"
  ],
  [
    "Embouts de remplacement jaunes ADFAST, modèle YELLOW NOZZLE/5, paquet de 5. Le détaillant indique une compatibilité avec Adseal600MG.",
    "ADFAST yellow replacement nozzles, model YELLOW NOZZLE/5, pack of 5. The retailer indicates compatibility with Adseal600MG."
  ],
  [
    "Image exacte, prix et stock MIR à confirmer avant commande.",
    "Exact image, MIR price and stock to be confirmed before ordering."
  ],
  [
    "Image exacte autorisée, prix et stock MIR à confirmer.",
    "Approved exact image, MIR price and stock to be confirmed."
  ],
  [
    "Embout pour fusil à calfeutrer, type saucisse",
    "Nozzle for sausage caulking gun"
  ],
  [
    "Embout pour fusil à calfeutrer de type saucisse, référence détaillant CANAC 5081112. La marque, le conditionnement et la compatibilité restent à confirmer.",
    "Nozzle for a sausage caulking gun, retailer reference CANAC 5081112. Brand, packaging and compatibility remain to be confirmed."
  ],
  [
    "à confirmer",
    "to be confirmed"
  ],
  [
    "Marque, conditionnement, compatibilité, prix, stock et image exacte à confirmer.",
    "Brand, packaging, compatibility, price, stock and exact image to be confirmed."
  ],
  [
    "Quantité par emballage, marque et compatibilité à confirmer.",
    "Quantity per package, brand and compatibility to be confirmed."
  ],
  [
    "Pistolet à calfeutrer renforcé noir — rapport 18:1",
    "Black heavy-duty caulking gun — 18:1 ratio"
  ],
  [
    "Outil de calfeutrage",
    "Caulking tool"
  ],
  [
    "Pistolet à calfeutrer renforcé Bates Choice, modèle FPMS001B351, rapport de poussée 18:1, vendu à l’unité.",
    "Bates Choice heavy-duty caulking gun, model FPMS001B351, 18:1 thrust ratio, sold individually."
  ],
  [
    "TruVent® — soffite à ventilation cachée",
    "TruVent® — hidden-vent soffit"
  ],
  [
    "Soffite en aluminium à ventilation dissimulée dans les rainures. Profil de 12 po, longueur de 12 pi et épaisseur publiée de 0,019 po. Choix de couleurs unies et de finis similibois.",
    "Aluminium soffit with ventilation concealed in the grooves. 12 in profile, 12 ft length and published thickness of 0.019 in. Choice of solid colours and wood-look finishes."
  ],
  [
    "Dépliant TruVent — français, mars 2025",
    "TruVent brochure — French, March 2025"
  ],
  [
    "Palette actuelle de 29 teintes recoupée avec les variantes du fabricant.",
    "Current palette of 29 colours cross-checked against the manufacturer's variants."
  ],
  [
    "TruVent HVS — dimensions et conditionnement",
    "TruVent HVS — dimensions and packaging"
  ],
  [
    "Fiche utilisée pour les dimensions. Sa palette historique ne remplace pas le dépliant actuel.",
    "Data sheet used for dimensions. Its historical palette does not replace the current brochure."
  ],
  [
    "Guide de pose TruVent — français",
    "TruVent installation guide — French"
  ],
  [
    "Garantie TruVent — document officiel",
    "TruVent warranty — official document"
  ],
  [
    "Teinte documentée pour TruVent; référence de commande, disponibilité et prix MIR à confirmer.",
    "Documented TruVent colour; ordering reference, availability and MIR price to be confirmed."
  ],
  [
    "Largeur de profil publiée : 12 po. Largeur de tôle développée non établie.",
    "Published profile width: 12 in. Developed sheet width has not been established."
  ],
  [
    "Conditionnement fabricant publié. L’unité de vente MIR reste à confirmer.",
    "Published manufacturer packaging. MIR sales unit remains to be confirmed."
  ],
  [
    "panneau de 12 pi ou carton de 16 — unité MIR à confirmer",
    "12 ft panel or carton of 16 — MIR unit to be confirmed"
  ],
  [
    "Le distributeur publie NFA 11 et environ 8 %. Aucune conversion en débit ou conformité de ventilation n’est appliquée.",
    "The distributor publishes NFA 11 and approximately 8%. No conversion to airflow or assessment of ventilation compliance is applied."
  ],
  [
    "Longueur de stock documentée. La largeur nominale du profil n’est pas la largeur de tôle développée.",
    "Documented stock length. Nominal profile width is not the developed sheet width."
  ],
  [
    "Prix, disponibilité régionale par variante et unité de vente MIR non confirmés.",
    "Price, regional availability by variant and MIR sales unit not confirmed."
  ],
  [
    "Les images écran ne constituent pas un étalon colorimétrique.",
    "Screen images are not a colour measurement standard."
  ],
  [
    "Uni ou similibois, selon la teinte",
    "Solid colour or wood-look, depending on the colour"
  ],
  [
    "Photo originale du profil en Black 518. La teinte choisie se consulte dans son échantillon officiel.",
    "Original photo of the profile in Black 518. Refer to the official sample for your selected colour."
  ],
  [
    "Mystique — bardeau, visualisation de toiture",
    "Mystique — shingle, roof visualization"
  ],
  [
    "Bardeau d’asphalte",
    "Asphalt shingle"
  ],
  [
    "Palette officielle Mystique pour l’Est du Canada : neuf teintes de bardeau stratifié. Ce choix sert à harmoniser la toiture dans le studio et ne constitue pas une offre de vente MIR.",
    "Official Mystique palette for Eastern Canada: nine laminated shingle colours. This selection helps coordinate the roof in the studio and does not constitute a MIR sales offer."
  ],
  [
    "Mystique Est — dépliant français 2026",
    "Mystique East — French brochure 2026"
  ],
  [
    "Palette et dimensions actuelles; échantillons originaux de la page 2.",
    "Current palette and dimensions; original samples from page 2."
  ],
  [
    "Mystique RL621 — fiche technique",
    "Mystique RL621 — technical data sheet"
  ],
  [
    "Fiche datée de 2019. La brochure 2026 prévaut pour les données courantes affichées.",
    "Data sheet dated 2019. The 2026 brochure takes precedence for the current data displayed."
  ],
  [
    "Mode de pose complet des bardeaux BP — Est",
    "Complete BP shingle installation instructions — East"
  ],
  [
    "Guide de gamme, pas un calcul de toiture pour le projet.",
    "Product line guide, not a roof calculation for this project."
  ],
  [
    "Choix de visualisation de toiture seulement; produit non proposé à la vente par MIR dans ce catalogue.",
    "Roof visualization only; this product is not offered for sale by MIR in this catalogue."
  ],
  [
    "Données fabricant documentées; exclues du quantitatif et de la vente MIR.",
    "Documented manufacturer data; excluded from MIR quantities and sales."
  ],
  [
    "visualisation seulement",
    "visualization only"
  ],
  [
    "Visuel indicatif à vérifier avec un échantillon physique avant une décision de chantier.",
    "Illustrative image to be checked against a physical sample before a construction decision."
  ],
  [
    "Granules de bardeau stratifié",
    "Laminated shingle granules"
  ],
  [
    "Image originale extraite du dépliant 2026, page 2; association couleur vérifiée sur la page rendue. Visualisation de toiture uniquement.",
    "Original image extracted from the 2026 brochure, page 2; colour association verified on the rendered page. Roof visualization only."
  ],
  [
    "Nuancier Mystique Est publié par BP Canada. Disponibilité locale à confirmer.",
    "Mystique East colour chart published by BP Canada. Local availability to be confirmed."
  ],
  [
    "Cambridge — bardeau, visualisation de toiture",
    "Cambridge — shingle, roof visualization"
  ],
  [
    "Cambridge : 8 teintes de bardeaux indiquées pour le Québec dans le sélecteur officiel IKO. Choix visuel pour harmoniser la toiture avec la façade; aucun ajout à une commande MIR.",
    "Cambridge: 8 shingle colours listed for Quebec in IKO's official selector. A visual choice to coordinate the roof with the facade; not added to a MIR order."
  ],
  [
    "Cambridge — couleurs et disponibilité régionale IKO",
    "Cambridge — IKO colours and regional availability"
  ],
  [
    "Couleurs filtrées avec le code QC des données publiques du sélecteur fabricant.",
    "Colours filtered using the QC code in the manufacturer's public selector data."
  ],
  [
    "Cambridge — fiche technique française (10/2026)",
    "Cambridge — French technical data sheet (10/2026)"
  ],
  [
    "Dimensions nominales et numéro de stock Canada; aucune toiture du projet n’est quantifiée.",
    "Nominal dimensions and Canadian stock number; no project roof quantities are calculated."
  ],
  [
    "Cambridge — directives de pose IKO en français",
    "Cambridge — IKO installation instructions in French"
  ],
  [
    "Document de pose fourni par le fabricant; vérifier sa version au moment du chantier.",
    "Manufacturer installation document; verify its version when construction begins."
  ],
  [
    "Teinte associée au Québec (QC) dans le sélecteur officiel IKO; disponibilité et lot à confirmer auprès du distributeur.",
    "Colour associated with Quebec (QC) in IKO's official selector; confirm availability and batch with the distributor."
  ],
  [
    "Valeurs nominales documentées, exclues du quantitatif et de la vente MIR.",
    "Documented nominal values, excluded from MIR quantities and sales."
  ],
  [
    "Teintes publiées pour le Québec par IKO. Disponibilité locale à confirmer auprès du distributeur.",
    "Colours published by IKO for Quebec. Confirm local availability with the distributor."
  ],
  [
    "L’écran ne remplace pas l’échantillon physique de bardeau.",
    "A screen does not replace a physical shingle sample."
  ],
  [
    "Disponibilité, lots et commandes auprès du distributeur non vérifiés.",
    "Availability, batches and distributor orders have not been verified."
  ],
  [
    "Échantillon officiel associé au produit et à son identifiant couleur; fichier original du sélecteur fabricant, sans retouche.",
    "Official sample associated with the product and its colour ID; original file from the manufacturer's selector, without retouching."
  ],
  [
    "Dynasty — bardeau, visualisation de toiture",
    "Dynasty — shingle, roof visualization"
  ],
  [
    "Dynasty : 14 teintes de bardeaux indiquées pour le Québec dans le sélecteur officiel IKO. Choix visuel pour harmoniser la toiture avec la façade; aucun ajout à une commande MIR.",
    "Dynasty: 14 shingle colours listed for Quebec in IKO's official selector. A visual choice to coordinate the roof with the facade; not added to a MIR order."
  ],
  [
    "Dynasty — couleurs et disponibilité régionale IKO",
    "Dynasty — IKO colours and regional availability"
  ],
  [
    "Dynasty — fiche technique française (10/2026)",
    "Dynasty — French technical data sheet (10/2026)"
  ],
  [
    "Dynasty — directives de pose IKO en français",
    "Dynasty — IKO installation instructions in French"
  ],
  [
    "Nordic — bardeau, visualisation de toiture",
    "Nordic — shingle, roof visualization"
  ],
  [
    "Nordic : 6 teintes de bardeaux indiquées pour le Québec dans le sélecteur officiel IKO. Choix visuel pour harmoniser la toiture avec la façade; aucun ajout à une commande MIR.",
    "Nordic: 6 shingle colours listed for Quebec in IKO's official selector. A visual choice to coordinate the roof with the facade; not added to a MIR order."
  ],
  [
    "Nordic — couleurs et disponibilité régionale IKO",
    "Nordic — IKO colours and regional availability"
  ],
  [
    "Nordic — fiche technique française (04/2026)",
    "Nordic — French technical data sheet (04/2026)"
  ],
  [
    "Nordic — directives de pose IKO en français",
    "Nordic — IKO installation instructions in French"
  ],
  [
    "Landmark — bardeau, visualisation de toiture",
    "Landmark — shingle, roof visualization"
  ],
  [
    "Bardeau laminé à deux couches; palette régionale officielle Québec / Canada atlantique. Choix destiné à harmoniser le toit avec les revêtements dans le studio client.",
    "Dual-layer laminated shingle; official regional palette for Quebec / Atlantic Canada. This selection coordinates the roof with the cladding in the client studio."
  ],
  [
    "Guide de sélection de toitures — Québec / Canada atlantique, français 04/2026",
    "Roofing selection guide — Quebec / Atlantic Canada, French 04/2026"
  ],
  [
    "Palette Landmark, page 20.",
    "Landmark palette, page 20."
  ],
  [
    "Landmark — fiche technique française",
    "Landmark — French technical data sheet"
  ],
  [
    "Fiche 08/2024 pour les dimensions nominales; consulter la documentation et la garantie actuelles avant un chantier.",
    "08/2024 data sheet for nominal dimensions; consult current documentation and warranty before construction."
  ],
  [
    "Série Landmark — guide de pose français, chapitre 13 (2026)",
    "Landmark series — French installation guide, chapter 13 (2026)"
  ],
  [
    "Guide de pose du fabricant; aucun calcul de toiture dans le studio MIR.",
    "Manufacturer installation guide; no roof calculations in the MIR studio."
  ],
  [
    "Palette publiée pour le Québec. Stock local à confirmer; visualisation client seulement, hors commande MIR.",
    "Palette published for Quebec. Local stock to be confirmed; client visualization only, excluded from MIR orders."
  ],
  [
    "Visualisation indicative à valider avec un échantillon physique; disponibilité commerciale locale non vérifiée.",
    "Illustrative visualization to be verified against a physical sample; local commercial availability has not been verified."
  ],
  [
    "La scène MIR harmonise les couleurs; elle ne simule pas exactement le calepinage ou le relief du bardeau.",
    "The MIR scene coordinates colours; it does not precisely simulate the shingle layout or relief."
  ],
  [
    "Granules de bardeau laminé",
    "Laminated shingle granules"
  ],
  [
    "Échantillon officiel à proportion native, sans recoloration; visualisation client seulement.",
    "Official sample at its original proportions, without recolouring; client visualization only."
  ],
  [
    "Nuancier Québec / Atlantique de CertainTeed. Disponibilité locale à confirmer.",
    "CertainTeed Quebec / Atlantic colour chart. Local availability to be confirmed."
  ],
  [
    "Landmark PRO — bardeau, visualisation de toiture",
    "Landmark PRO — shingle, roof visualization"
  ],
  [
    "Bardeau laminé à deux couches; palette régionale Max Def Québec / Canada atlantique. Choix destiné à harmoniser le toit avec les revêtements dans le studio client.",
    "Dual-layer laminated shingle; regional Max Def palette for Quebec / Atlantic Canada. This selection coordinates the roof with the cladding in the client studio."
  ],
  [
    "Palette Landmark PRO, page 19. La variante Max Def Birchwood est documentée séparément par la page produit actuelle.",
    "Landmark PRO palette, page 19. The Max Def Birchwood variant is documented separately on the current product page."
  ],
  [
    "Landmark PRO — fiche technique française",
    "Landmark PRO — French technical data sheet"
  ],
  [
    "Fiche 03/2023 pour les dimensions nominales; consulter la documentation et la garantie actuelles avant un chantier.",
    "03/2023 data sheet for nominal dimensions; consult current documentation and warranty before construction."
  ],
  [
    "La page produit actuelle associe Max Def Birchwood au Québec. Cette teinte supplémentaire n’apparaît pas dans le guide français 04/2026; nom anglais officiel conservé.",
    "The current product page associates Max Def Birchwood with Quebec. This additional colour does not appear in the French 04/2026 guide; the official English name is retained."
  ],
  [
    "Vis HardiePanel — inox #8 Phillips, latte de bois",
    "HardiePanel screws — stainless steel #8 Phillips, wood furring"
  ],
  [
    "Vis de fixation pour panneaux HardiePanel, proposées par Light Trim. Choisissez la longueur et la finition correspondant au support.",
    "HardiePanel panel fasteners offered by Light Trim. Choose the length and finish suited to the substrate."
  ],
  [
    "Acier inoxydable type 305",
    "Type 305 stainless steel"
  ],
  [
    "Panneaux HardiePanel",
    "HardiePanel panels"
  ],
  [
    "Référence de couleur originale du fabricant; ne représente ni la texture de la vis ni une photo de sa finition. Aucune valeur hex de fabricant n’est inventée.",
    "Original manufacturer colour reference; it represents neither the screw texture nor a photograph of its finish. No manufacturer hex value is invented."
  ],
  [
    "Couleur personnalisée proposée par Light Trim : nom ou code à préciser dans la demande, avant confirmation de fabrication.",
    "Custom colour offered by Light Trim: specify the name or code in the request before manufacturing is confirmed."
  ],
  [
    "La ligne regroupant VFCSSS8158/8178/8212 dans la fiche technique affiche une seule longueur; les longueurs séparées sont reprises du guide de sélection, sans extrapoler les résistances mécaniques.",
    "The row grouping VFCSSS8158/8178/8212 in the technical data sheet shows only one length; individual lengths are taken from the selection guide, without extrapolating mechanical strength."
  ],
  [
    "1¼ po — VFCSSS8114",
    "1¼ in — VFCSSS8114"
  ],
  [
    "1⅝ po — VFCSSS8158",
    "1⅝ in — VFCSSS8158"
  ],
  [
    "1⅞ po — VFCSSS8178",
    "1⅞ in — VFCSSS8178"
  ],
  [
    "2½ po — VFCSSS8212",
    "2½ in — VFCSSS8212"
  ],
  [
    "Fiche produit — VFCSSS",
    "Product data sheet — VFCSSS"
  ],
  [
    "Tableau de sélection — vis pour panneaux et moulures",
    "Selection chart — panel and trim screws"
  ],
  [
    "Données techniques — vis Light Trim",
    "Technical data — Light Trim screws"
  ],
  [
    "Les lignes de cette fiche ne couvrent pas nécessairement toutes les longueurs du tableau de sélection.",
    "The rows in this data sheet do not necessarily cover every length in the selection chart."
  ],
  [
    "Vis HardiePanel — inox #8 Phillips, latte d’acier",
    "HardiePanel screws — stainless steel #8 Phillips, steel furring"
  ],
  [
    "Acier inoxydable type 410",
    "Type 410 stainless steel"
  ],
  [
    "Latte de métal",
    "Metal furring"
  ],
  [
    "1¼ po — VFCSSTEK8114",
    "1¼ in — VFCSSTEK8114"
  ],
  [
    "1⅞ po — VFCSSTEK8178",
    "1⅞ in — VFCSSTEK8178"
  ],
  [
    "2½ po — VFCSSTEK8212",
    "2½ in — VFCSSTEK8212"
  ],
  [
    "Fiche produit — VFCSSTEK",
    "Product data sheet — VFCSSTEK"
  ],
  [
    "Vis HardiePanel — nickelées #8 Phillips, latte de bois",
    "HardiePanel screws — nickel-plated #8 Phillips, wood furring"
  ],
  [
    "Vis de fixation pour panneaux HardiePanel, proposées par Light Trim. Support : latte de bois.",
    "HardiePanel panel fasteners offered by Light Trim. Substrate: wood furring."
  ],
  [
    "Acier nickelé",
    "Nickel-plated steel"
  ],
  [
    "1¼ po — VFCS8114",
    "1¼ in — VFCS8114"
  ],
  [
    "Fiche produit — VFCS",
    "Product data sheet — VFCS"
  ],
  [
    "Vis HardiePanel — nickelées #8 Phillips, latte d’acier",
    "HardiePanel screws — nickel-plated #8 Phillips, steel furring"
  ],
  [
    "Vis de fixation pour panneaux HardiePanel, proposées par Light Trim. Support : latte de métal.",
    "HardiePanel panel fasteners offered by Light Trim. Substrate: metal furring."
  ],
  [
    "1¼ po — VFCTEK8114",
    "1¼ in — VFCTEK8114"
  ],
  [
    "Fiche produit — VFCTEK",
    "Product data sheet — VFCTEK"
  ],
  [
    "Vis HardiePanel — inox #10 Torx, latte de bois",
    "HardiePanel screws — stainless steel #10 Torx, wood furring"
  ],
  [
    "Acier inoxydable type 304",
    "Type 304 stainless steel"
  ],
  [
    "boîte de 200 vis — unité MIR à confirmer",
    "box of 200 screws — MIR unit to be confirmed"
  ],
  [
    "1½ po — VTSSS10112",
    "1½ in — VTSSS10112"
  ],
  [
    "Fiche produit — VTSSS10",
    "Product data sheet — VTSSS10"
  ],
  [
    "Vis HardiePanel — inox #10 Torx, latte d’acier",
    "HardiePanel screws — stainless steel #10 Torx, steel furring"
  ],
  [
    "1½ po — VTSSTEK10112",
    "1½ in — VTSSTEK10112"
  ],
  [
    "Fiche produit — VTSSTEK10",
    "Product data sheet — VTSSTEK10"
  ],
  [
    "Photo originale explicitement liée par le fabricant à cette option de couleur et à la longueur 1½ po. Le SKU commercial est vide dans les données publiées; ne pas le déduire du nom de fichier. Écran indicatif; aucune retouche.",
    "Original photo explicitly linked by the manufacturer to this colour option and the 1½ in length. The commercial SKU is blank in the published data; do not infer it from the filename. Screen image is illustrative; no retouching."
  ],
  [
    "Vis HardiePanel SFS — inox #10 Torx, latte de bois",
    "HardiePanel SFS screws — stainless steel #10 Torx, wood furring"
  ],
  [
    "1 po — VFCSSS101T",
    "1 in — VFCSSS101T"
  ],
  [
    "1 3/16 po — VFCSSS101316T",
    "1 3/16 in — VFCSSS101316T"
  ],
  [
    "1½ po — VFCSSS10112T",
    "1½ in — VFCSSS10112T"
  ],
  [
    "1¾ po — VFCSSS10134T",
    "1¾ in — VFCSSS10134T"
  ],
  [
    "2⅜ po — VFCSSS10238T",
    "2⅜ in — VFCSSS10238T"
  ],
  [
    "3 po — VFCSSS103T",
    "3 in — VFCSSS103T"
  ],
  [
    "Fiche produit — VFCSSS10",
    "Product data sheet — VFCSSS10"
  ],
  [
    "SFS TW-S-D12 — données et instructions",
    "SFS TW-S-D12 — data and instructions"
  ],
  [
    "Conditionnements du fabricant SFS distincts des boîtes vendues par Light Trim.",
    "SFS manufacturer packaging differs from the boxes sold by Light Trim."
  ],
  [
    "Vis HardiePanel SFS Bi-Met — #10 Torx, latte d’acier",
    "HardiePanel SFS Bi-Met screws — #10 Torx, steel furring"
  ],
  [
    "Acier inoxydable type 304, vis bimétallique",
    "Type 304 stainless steel, bimetal screw"
  ],
  [
    "1⅛ po — VFCSSTEK10118T",
    "1⅛ in — VFCSSTEK10118T"
  ],
  [
    "Fiche produit — VFCSSTEK10118T",
    "Product data sheet — VFCSSTEK10118T"
  ],
  [
    "SFS #10-12 Bi-Met 300 — données et instructions",
    "SFS #10-12 Bi-Met 300 — data and instructions"
  ],
  [
    "Vis HardiePlank — #8 × 1¼ po, latte d’acier",
    "HardiePlank screws — #8 × 1¼ in, steel furring"
  ],
  [
    "Vis de fixation pour clins HardiePlank, proposées par Light Trim. Support : latte de métal.",
    "HardiePlank lap siding fasteners offered by Light Trim. Substrate: metal furring."
  ],
  [
    "1¼ po — VFCLTEK8114",
    "1¼ in — VFCLTEK8114"
  ],
  [
    "Fiche produit — VFCLTEK8",
    "Product data sheet — VFCLTEK8"
  ],
  [
    "Vis pour moulures Light Trim — #8 × ¾ po, latte d’acier",
    "Light Trim moulding screws — #8 × ¾ in, steel furring"
  ],
  [
    "Vis de fixation des moulures Light Trim sur latte d’acier. Support : latte de métal.",
    "Screws for fastening Light Trim mouldings to steel furring. Substrate: metal furring."
  ],
  [
    "Moulures Light Trim",
    "Light Trim mouldings"
  ],
  [
    "conditionnement à confirmer — sources fabricant divergentes",
    "packaging to be confirmed — conflicting manufacturer sources"
  ],
  [
    "Conditionnement contradictoire : 250 sur la page produit, 500 sur le guide de sélection et la fiche technique. À confirmer avant commande.",
    "Conflicting packaging: 250 on the product page, 500 in the selection guide and technical data sheet. Confirm before ordering."
  ],
  [
    "¾ po — VFCTEK834",
    "¾ in — VFCTEK834"
  ],
  [
    "Fiche produit — VFCTEK834",
    "Product data sheet — VFCTEK834"
  ],
  [
    "T001 — Gabarit d’installation pour panneaux",
    "T001 — Panel installation jig"
  ],
  [
    "Outillage",
    "Tools"
  ],
  [
    "Gabarit réutilisable pour positionner les panneaux sur les moulures horizontales Light Trim compatibles. Paquet de 7 gabarits; dégagement de ¼ po indiqué par le fabricant.",
    "Reusable jig for positioning panels on compatible Light Trim horizontal mouldings. Pack of 7 jigs; the manufacturer specifies a ¼ in clearance."
  ],
  [
    "Dégagement guidé",
    "Guided clearance"
  ],
  [
    "¼ po entre panneau et moulure horizontale",
    "¼ in between the panel and horizontal moulding"
  ],
  [
    "Moulures horizontales citées par la page produit",
    "Horizontal mouldings listed on the product page"
  ],
  [
    "H001, H002, H100, H760 et S002",
    "H001, H002, H100, H760 and S002"
  ],
  [
    "paquet de 7 gabarits — unité MIR à confirmer",
    "pack of 7 jigs — MIR unit to be confirmed"
  ],
  [
    "T001 — fiche produit et compatibilités",
    "T001 — product data sheet and compatibility"
  ],
  [
    "T001 — guide d’utilisation",
    "T001 — user guide"
  ],
  [
    "Le PDF cite H001, H002 et S002; la page produit plus récente cite aussi H100 et H760. Vérifier la moulure exacte avant utilisation.",
    "The PDF lists H001, H002 and S002; the more recent product page also lists H100 and H760. Verify the exact moulding before use."
  ],
  [
    "U-P1 — Panneau architectural en acier",
    "U-P1 — Architectural steel panel"
  ],
  [
    "Panneau architectural plié en acier prépeint, offert en calibres 18, 20 et 22 ga. Forme et dimensions sur mesure à configurer. Le choix du fini et du calibre est confirmé avec le fabricant.",
    "Custom-bent architectural panel in prepainted steel, available in 18, 20 and 22 gauge. Configure the custom shape and dimensions. Finish and gauge are confirmed with the manufacturer."
  ],
  [
    "U-P1 — Fiche technique",
    "U-P1 — Technical data sheet"
  ],
  [
    "Inclut les détails de pose. Certaines cotes pouces/mm sont incohérentes : dimensions à confirmer auprès du fabricant.",
    "Includes installation details. Some inch/mm dimensions are inconsistent: confirm dimensions with the manufacturer."
  ],
  [
    "U-P1 — Attestation d’ingénierie",
    "U-P1 — Engineering certification"
  ],
  [
    "Applicabilité au projet et version à confirmer.",
    "Applicability to the project and document version to be confirmed."
  ],
  [
    "U-P1 — Bon de commande",
    "U-P1 — Order form"
  ],
  [
    "Centre de ressources Unico",
    "Unico resource centre"
  ],
  [
    "Sélection de couleurs et finis Unico",
    "Unico colour and finish selection"
  ],
  [
    "Sélection partielle du nuancier; disponibilité par calibre et épaisseur à confirmer.",
    "Partial colour chart selection; availability by gauge and thickness to be confirmed."
  ],
  [
    "Le calibre de cet échantillon n’est pas précisé dans cette sélection publiée.",
    "The gauge of this sample is not specified in this published selection."
  ],
  [
    "Le calibre de cet échantillon n’est pas précisé dans cette sélection publiée. Teinte et combinaison sur U-P1 à confirmer; rendu écran indicatif.",
    "The gauge of this sample is not specified in this published selection. Colour and U-P1 combination to be confirmed; screen rendering is illustrative."
  ],
  [
    "Un calibre publié correspond au U-P1; la combinaison produit, fini et disponibilité reste à confirmer.",
    "A published gauge matches U-P1; the product and finish combination and availability remain to be confirmed."
  ],
  [
    "Un calibre publié correspond au U-P1; la combinaison produit, fini et disponibilité reste à confirmer. Teinte et combinaison sur U-P1 à confirmer; rendu écran indicatif.",
    "A published gauge matches U-P1; the product and finish combination and availability remain to be confirmed. Colour and U-P1 combination to be confirmed; screen rendering is illustrative."
  ],
  [
    "panneau sur mesure — dimensions et unité MIR à confirmer",
    "custom panel — dimensions and MIR unit to be confirmed"
  ],
  [
    "Prépeint — fini à confirmer",
    "Prepainted — finish to be confirmed"
  ],
  [
    "Panneau plié sur mesure",
    "Custom-bent panel"
  ],
  [
    "Dimensions de la pièce",
    "Piece dimensions"
  ],
  [
    "À configurer; limites de fabrication à confirmer auprès d’Unico.",
    "To be configured; confirm manufacturing limits with Unico."
  ],
  [
    "Couleurs",
    "Colours"
  ],
  [
    "6 références Standard (calibre à confirmer) et 3 références Signature mentionnant 22 ga; combinaison avec U-P1 à confirmer.",
    "6 Standard references (gauge to be confirmed) and 3 Signature references indicating 22 gauge; compatibility with U-P1 to be confirmed."
  ],
  [
    "Nuancier",
    "Colour chart"
  ],
  [
    "Sélection partielle de références officielles; disponibilité non confirmée.",
    "Partial selection of official references; availability not confirmed."
  ],
  [
    "Prix, stock, disponibilité et conditionnement MIR à confirmer.",
    "MIR price, stock, availability and packaging to be confirmed."
  ],
  [
    "Dimensions, détail de joint, compatibilité du fini et prescription de pose à confirmer pour le projet.",
    "Dimensions, joint detail, finish compatibility and installation requirements to be confirmed for the project."
  ],
  [
    "Rendu officiel du profil U-P1; ce visuel ne certifie pas la matière, l’épaisseur ou la couleur de la variante choisie.",
    "Official rendering of the U-P1 profile; this image does not confirm the material, thickness or colour of the selected variant."
  ],
  [
    "U-P1 — Panneau architectural en aluminium",
    "U-P1 — Architectural aluminium panel"
  ],
  [
    "Panneau architectural plié en aluminium, offert en épaisseur de 2 ou 3,2 mm. Forme et dimensions sur mesure à configurer. Les teintes Vitalium affichées sont des demandes de fini à confirmer pour ces épaisseurs.",
    "Custom-bent architectural aluminium panel, available in 2 or 3.2 mm thickness. Configure the custom shape and dimensions. Displayed Vitalium colours are requested finishes to be confirmed for these thicknesses."
  ],
  [
    "Échantillon publié sur aluminium de 1 mm; disponibilité sur U-P1 de 2 ou 3,2 mm à confirmer.",
    "Sample published on 1 mm aluminium; availability on 2 or 3.2 mm U-P1 to be confirmed."
  ],
  [
    "Échantillon publié sur aluminium de 1 mm; disponibilité sur U-P1 de 2 ou 3,2 mm à confirmer. Teinte et combinaison sur U-P1 à confirmer; rendu écran indicatif.",
    "Sample published on 1 mm aluminium; availability on 2 or 3.2 mm U-P1 to be confirmed. Colour and U-P1 combination to be confirmed; screen rendering is illustrative."
  ],
  [
    "panneau sur mesure — tarif au pouce carré (po²)",
    "custom panel — price per square inch (in²)"
  ],
  [
    "Tarif MIR confirmé à 3 $ CA par pouce carré. Surface en projection de la forme hors tout, lips compris; la projection C et les lèvres ne sont pas ajoutées une seconde fois. Toute couleur personnalisée ou RAL exige une soumission sans prix automatique. Disponibilité du fini à confirmer. Taxes et livraison non calculées.",
    "MIR rate confirmed at CA$3 per square inch. Projected area of the overall shape, including lips; projection C and the lips are not added a second time. Any custom or RAL colour requires a quote without automatic pricing. Finish availability to be confirmed. Taxes and delivery are not calculated."
  ],
  [
    "Épaisseurs publiées",
    "Published thicknesses"
  ],
  [
    "2 mm / 3,2 mm",
    "2 mm / 3.2 mm"
  ],
  [
    "6 références Vitalium publiées sur 1 mm; fini sur U-P1 2/3,2 mm à confirmer.",
    "6 Vitalium references published on 1 mm; finish on 2/3.2 mm U-P1 to be confirmed."
  ],
  [
    "Stock, disponibilité du fini et conditionnement MIR à confirmer. Taxes et livraison non calculées.",
    "MIR stock, finish availability and packaging to be confirmed. Taxes and delivery are not calculated."
  ],
  [
    "Système de panneaux HardiePanel à pose verticale, avec couvre-joints HardieTrim. Espacement MIR des battens : 8, 12 ou 16 po centre-à-centre. Maximum de 10 pi entre transitions (8 pi si panneau 4×8 retenu).",
    "Vertically installed HardiePanel system with HardieTrim battens. MIR batten spacing: 8, 12 or 16 in on centre. Maximum 10 ft between transitions (8 ft when 4×8 panels are selected)."
  ],
  [
    "HardieTrim Batten Boards — présentation officielle",
    "HardieTrim Batten Boards — official presentation"
  ],
  [
    "L’offre et les longueurs du batten par région sont à confirmer.",
    "Regional batten availability and lengths to be confirmed."
  ],
  [
    "Largeur exacte/hauteur de la baguette et quantités de tasseaux : à confirmer avant la commande.",
    "Exact batten width/height and furring quantities: confirm before ordering."
  ],
  [
    "HardiePanel lisse + battens HardieTrim (système composé)",
    "Smooth HardiePanel + HardieTrim battens (combined system)"
  ],
  [
    "Espacements 8/12/16 po demandés par MIR, non présentés comme entraxes de fixation approuvés.",
    "8/12/16 in spacing requested by MIR, not presented as approved fastener spacing."
  ],
  [
    "Acier architectural",
    "Architectural steel"
  ],
  [
    "Profilé d’acier pour revêtement mural et toiture, finition et couleurs au choix selon fournisseur.",
    "Steel profile for wall cladding and roofing, with finish and colours selected according to the supplier."
  ],
  [
    "Présentation et accès aux fiches techniques Profilec",
    "Profilec overview and access to technical data sheets"
  ],
  [
    "Consulter la fiche technique applicable au profil exact; mesures et couleurs à confirmer.",
    "Consult the technical data sheet for the exact profile; dimensions and colours to be confirmed."
  ],
  [
    "Guides et catalogues Profilec",
    "Profilec guides and catalogues"
  ],
  [
    "Guide de pose à sélectionner selon profil et toiture/mur.",
    "Select the installation guide for the profile and roof/wall application."
  ],
  [
    "Charte de couleurs Profilec",
    "Profilec colour chart"
  ],
  [
    "Couleur et fini exacts à confirmer auprès de Profilec.",
    "Confirm the exact colour and finish with Profilec."
  ],
  [
    "référence Profilec — unité et prix MIR à confirmer",
    "Profilec reference — MIR unit and price to be confirmed"
  ],
  [
    "Formats et longueurs exacts à confirmer avant débit et commande.",
    "Confirm exact sizes and lengths before cutting and ordering."
  ],
  [
    "Variante documentée de La Renommée, incluse dans le centre technique Profilec; portée, largeur utile et longueur à confirmer.",
    "Documented variant of La Renommée, included in Profilec's technical centre; span, coverage width and length to be confirmed."
  ],
  [
    "La Multi-R — 13¾ po",
    "La Multi-R — 13¾ in"
  ],
  [
    "Profilé Multi-R à attaches dissimulées, panneaux pré-perforés, format annoncé de 13¾ po.",
    "Multi-R profile with concealed fasteners and pre-punched panels, advertised size 13¾ in."
  ],
  [
    "La Multi-R — 17¾ po",
    "La Multi-R — 17¾ in"
  ],
  [
    "Profilé Multi-R à attaches dissimulées, panneaux pré-perforés, format annoncé de 17¾ po.",
    "Multi-R profile with concealed fasteners and pre-punched panels, advertised size 17¾ in."
  ],
  [
    "La Multi-R — 21¾ po",
    "La Multi-R — 21¾ in"
  ],
  [
    "Profilé Multi-R à attaches dissimulées, panneaux pré-perforés, format annoncé de 21¾ po.",
    "Multi-R profile with concealed fasteners and pre-punched panels, advertised size 21¾ in."
  ],
  [
    "Panneau mural en acier peint à attaches dissimulées, calibre 22, pose verticale ou horizontale.",
    "Painted steel wall panel with concealed fasteners, 22 gauge, for vertical or horizontal installation."
  ],
  [
    "La Muralys — Soffite",
    "La Muralys — Soffit"
  ],
  [
    "Soffite métallique",
    "Metal soffit"
  ],
  [
    "Variante de soffite indiquée dans les ressources techniques Profilec; ventilation et dimensions à confirmer par fiche fabricant.",
    "Soffit variant listed in Profilec's technical resources; confirm ventilation and dimensions against the manufacturer's data sheet."
  ],
  [
    "Panneau mural géométrique acier peint à fixations dissimulées. Pose verticale, horizontale, diagonale ou décalée documentée; seules les deux premières sont visualisées dans MIR.",
    "Geometric painted steel wall panel with concealed fasteners. Vertical, horizontal, diagonal or staggered installation is documented; MIR visualizes only the first two."
  ],
  [
    "Profilé d’acier avec attaches apparentes et nervures, toiture et mur. Pente toiture minimale indiquée par le fabricant de 3/12, calibre 29.",
    "Ribbed steel profile with exposed fasteners for roofing and walls. Manufacturer-specified minimum roof slope of 3/12, 29 gauge."
  ],
  [
    "Code de la charte Profilec; correspondance et disponibilité au format choisi à confirmer.",
    "Profilec colour chart code; match and availability in the selected size to be confirmed."
  ],
  [
    "Profilé métallique à joints debout et attaches dissimulées, couverture de toiture sur support avec membrane prévue par le fabricant.",
    "Standing-seam metal profile with concealed fasteners, for roofing over a substrate with the membrane specified by the manufacturer."
  ],
  [
    "BECK PANELFAST AGS-100 — Clous 1½ po pour panneaux sur acier",
    "BECK PANELFAST AGS-100 — 1½ in nails for panels on steel"
  ],
  [
    "Clous BECK PANELFAST AGS-100 de 1½ po (38 mm), tige moletée de 0,100 po et tête plate de 5/16 po, en bobines pour fixation de panneaux compatibles sur ossature d’acier. MIR offre uniquement ce format, en boîte de 12 bobines (3 000 clous).",
    "BECK PANELFAST AGS-100 1½ in (38 mm) nails, with a 0.100 in knurled shank and a 5/16 in flat head, in coils for fastening compatible panels to steel framing. MIR offers only this size, in boxes of 12 coils (3,000 nails)."
  ],
  [
    "Page officielle du produit. Confirmer la longueur, le support, l’épaisseur de l’acier et la cloueuse avant la commande.",
    "Official product page. Confirm length, substrate, steel thickness and nailer before ordering."
  ],
  [
    "Longueur vendue par MIR",
    "Length sold by MIR"
  ],
  [
    "1½ po (38 mm)",
    "1½ in (38 mm)"
  ],
  [
    "Prix MIR",
    "MIR price"
  ],
  [
    "515,99 $ CA / boîte avant taxes",
    "CA$515.99 / box before taxes"
  ],
  [
    "Tête",
    "Head"
  ],
  [
    "Plate · diamètre nominal 5/16 po",
    "Flat · nominal diameter 5/16 in"
  ],
  [
    "Moletée · diamètre 0,100 po (2,54 mm)",
    "Knurled · diameter 0.100 in (2.54 mm)"
  ],
  [
    "Pointe",
    "Point"
  ],
  [
    "Balistique / pointue",
    "Ballistic / pointed"
  ],
  [
    "Assemblage",
    "Collation"
  ],
  [
    "Bobine plastique conique RBC · 21°",
    "Conical RBC plastic coil · 21°"
  ],
  [
    "Matière",
    "Material"
  ],
  [
    "Acier à haute teneur en carbone",
    "High-carbon steel"
  ],
  [
    "Protection anticorrosion",
    "Corrosion protection"
  ],
  [
    "Aericote 1000 · essai au brouillard salin de 1 000 h annoncé par BECK",
    "Aericote 1000 · 1,000-hour salt spray test reported by BECK"
  ],
  [
    "Cloueuse compatible publiée",
    "Documented compatible nailer"
  ],
  [
    "Conditionnement",
    "Packaging"
  ],
  [
    "250 clous par bobine · 12 bobines par boîte · 3 000 clous",
    "250 nails per coil · 12 coils per box · 3,000 nails"
  ],
  [
    "boîte de 12 bobines (3 000 clous)",
    "box of 12 coils (3,000 nails)"
  ],
  [
    "Stock et disponibilité à confirmer avec MIR.",
    "Confirm stock and availability with MIR."
  ],
  [
    "1 1/2 po (38 mm) — AGS1000150-NA",
    "1 1/2 in (38 mm) — AGS1000150-NA"
  ],
  [
    "Visuel fourni par MIR du modèle PANELFAST AGS-100.",
    "PANELFAST AGS-100 model image supplied by MIR."
  ],
  [
    "Présentation MIR d’une boîte de 12 bobines.",
    "MIR presentation of a box of 12 coils."
  ],
  [
    "Stock et prix de vente MIR à confirmer.",
    "MIR stock and sale price to be confirmed."
  ],
  [
    "PRIME 40869 — Agrafes inox 2 po · calibre 16",
    "PRIME 40869 — 2 in stainless steel staples · 16 gauge"
  ],
  [
    "Agrafes en acier inoxydable, fil fort (Heavy Wire), longueur 2 po, couronne de 7/16 po et calibre 16. Boîte de 5 000 agrafes. Les dimensions sont indiquées sur l’emballage Prime.",
    "Stainless steel Heavy Wire staples, 2 in long, 7/16 in crown and 16 gauge. Box of 5,000 staples. Dimensions are shown on the Prime packaging."
  ],
  [
    "boîte de 5 000 agrafes",
    "box of 5,000 staples"
  ],
  [
    "2 po",
    "2 in"
  ],
  [
    "Couronne",
    "Crown"
  ],
  [
    "7/16 po",
    "7/16 in"
  ],
  [
    "5 000 agrafes par boîte",
    "5,000 staples per box"
  ],
  [
    "PRIME 20031 — Clous communs en bandes 3¼ po · 34°",
    "PRIME 20031 — 3¼ in strip common nails · 34°"
  ],
  [
    "Clous communs lisses en bandes de papier, fini brillant. Longueur 3¼ po, diamètre 0,120 po, assemblage à 34°. Boîte de 2 000 clous, selon l’étiquette Prime.",
    "Paper-collated smooth-shank common nails, bright finish. Length 3¼ in, diameter 0.120 in, 34° collation. Box of 2,000 nails, according to the Prime label."
  ],
  [
    "boîte de 2 000 clous",
    "box of 2,000 nails"
  ],
  [
    "3¼ po",
    "3¼ in"
  ],
  [
    "Diamètre",
    "Diameter"
  ],
  [
    "0,120 po",
    "0.120 in"
  ],
  [
    "Lisse / commune",
    "Smooth / common"
  ],
  [
    "Bandes de papier",
    "Paper collation"
  ],
  [
    "2 000 clous par boîte",
    "2,000 nails per box"
  ],
  [
    "PRIME GSI 40713 — Agrafes électrogalvanisées 1 po · calibre 18",
    "PRIME GSI 40713 — 1 in electrogalvanized staples · 18 gauge"
  ],
  [
    "Agrafes Prime série GSI à fil moyen, électrogalvanisées, longueur 1 po, couronne 3/8 po et calibre 18. Boîte de 5 000 agrafes selon l’emballage.",
    "Prime GSI series medium-wire electrogalvanized staples, 1 in long, 3/8 in crown and 18 gauge. Box of 5,000 staples according to the packaging."
  ],
  [
    "Électrogalvanisé",
    "Electrogalvanized"
  ],
  [
    "1 po",
    "1 in"
  ],
  [
    "3/8 po",
    "3/8 in"
  ],
  [
    "Finition",
    "Finish"
  ],
  [
    "Électrogalvanisée",
    "Electrogalvanized"
  ],
  [
    "Série",
    "Series"
  ],
  [
    "Joint fibro MIR — 6 po",
    "MIR fibre cement joint accessory — 6 in"
  ],
  [
    "Accessoire de fibrociment",
    "Fibre cement accessory"
  ],
  [
    "Joint fibro de 6 po proposé par Les Revêtements MIR, destiné à la finition de joints de revêtement en fibrociment. Le format représente la longueur annoncée par MIR; vérifier la compatibilité avec le profil et le système de pose avant de commander.",
    "6 in fibre cement joint accessory offered by Les Revêtements MIR, for finishing joints in fibre cement cladding. The size represents the length stated by MIR; verify compatibility with the profile and installation system before ordering."
  ],
  [
    "Format",
    "Size"
  ],
  [
    "Joint fibro",
    "Fibre cement joint accessory"
  ],
  [
    "Coloris",
    "Colour"
  ],
  [
    "Conditionnement, prix, compatibilité fabricant et stock à confirmer.",
    "Packaging, price, manufacturer compatibility and stock to be confirmed."
  ],
  [
    "pièce — conditionnement à confirmer avec MIR",
    "piece — confirm packaging with MIR"
  ],
  [
    "Joint fibro MIR — 8 po",
    "MIR fibre cement joint accessory — 8 in"
  ],
  [
    "Joint fibro de 8 po proposé par Les Revêtements MIR, destiné à la finition de joints de revêtement en fibrociment. Le format représente la longueur annoncée par MIR; vérifier la compatibilité avec le profil et le système de pose avant de commander.",
    "8 in fibre cement joint accessory offered by Les Revêtements MIR, for finishing joints in fibre cement cladding. The size represents the length stated by MIR; verify compatibility with the profile and installation system before ordering."
  ],
  [
    "8 po",
    "8 in"
  ],
  [
    "Vis de fascia 2 po — tête hexagonale ¼ po, teintes aluminium Kaycan",
    "2 in fascia screws — ¼ in hex head, Kaycan aluminium colours"
  ],
  [
    "Fixations",
    "Fasteners"
  ],
  [
    "Vis de fascia de 2 po, tête hexagonale ¼ po. Teintes aluminium Kaycan offertes selon MIR. Prix et conditionnement sur demande.",
    "2 in fascia screws with a ¼ in hex head. Kaycan aluminium colours offered according to MIR. Pricing and packaging on request."
  ],
  [
    "Pièces souhaitées (conditionnement MIR à confirmer)",
    "Required pieces (MIR packaging to be confirmed)"
  ],
  [
    "Référence fournisseur et conditionnement à confirmer avec MIR.",
    "Supplier reference and packaging to be confirmed with MIR."
  ],
  [
    "Tête hexagonale",
    "Hex head"
  ],
  [
    "¼ po",
    "¼ in"
  ],
  [
    "Teinte offerte selon MIR. Aperçu à l’écran. Prix et conditionnement sur demande.",
    "Colour offered according to MIR. On-screen preview. Pricing and packaging on request."
  ],
  [
    "Illustration de la vis de fascia 2 po",
    "Illustration of the 2 in fascia screw"
  ],
  [
    "Illustration de référence fournie par MIR.",
    "Reference illustration provided by MIR."
  ],
  [
    "James Hardie — kit de retouche ColorPlus",
    "James Hardie — ColorPlus touch-up kit"
  ],
  [
    "Teinte de référence. Disponibilité du kit dans cette teinte à confirmer avec MIR.",
    "Reference colour. Kit availability in this colour to be confirmed with MIR."
  ],
  [
    "Aluminium B. Bouchard — couleurs et format 284 ml",
    "Aluminium B. Bouchard — colours and 284 ml size"
  ],
  [
    "Teinte répertoriée par le détaillant. Disponibilité MIR à confirmer.",
    "Colour listed by the retailer. MIR availability to be confirmed."
  ],
  [
    "Échantillon MIR Ridgewood D-5 à cadrage fixe. Seule la teinte change; rendu écran indicatif.",
    "MIR Ridgewood D-5 sample with fixed framing. Only the colour changes; on-screen appearance is indicative."
  ],
  [
    "Le même échantillon, le même profil, les mêmes ombres et le même grain sont conservés pour chaque couleur.",
    "The same sample, profile, shadows and grain are preserved for every colour."
  ],
  [
    "Les Revêtements MIR — illustration de couleur",
    "Les Revêtements MIR — colour illustration"
  ],
  [
    "Même échantillon Ridgewood D-5; teinte écran indicative.",
    "Same Ridgewood D-5 sample; on-screen colour is indicative."
  ],
  [
    "Format répertorié par Adfast. Stock et minimums à confirmer avec MIR.",
    "Size listed by Adfast. Stock and minimum quantities to be confirmed with MIR."
  ],
  [
    "Teinte du nuancier sur demande. Le format reste à confirmer.",
    "Colour-chart shade available on request. Size remains to be confirmed."
  ],
  [
    "cartouches ou saucisses, par unité",
    "cartridges or sausage packs, per unit"
  ],
  [
    "Tube (cartouche) · 304 ml",
    "Tube (cartridge) · 304 ml"
  ],
  [
    "Saucisse · 600 ml",
    "Sausage pack · 600 ml"
  ],
  [
    "cartouches",
    "cartridges"
  ],
  [
    "saucisses",
    "sausage packs"
  ],
  [
    "Le nuancier numérique est indicatif. Faites valider la teinte sur un échantillon.",
    "The digital colour chart is indicative. Have the colour confirmed with a physical sample."
  ],
  [
    "Les teintes sans format publié sont sur demande. Prix, disponibilité et minimums à confirmer avec MIR.",
    "Colours without a published size are available on request. Pricing, availability and minimum quantities to be confirmed with MIR."
  ],
  [
    "Teinte du fabricant; disponibilité à confirmer.",
    "Manufacturer colour; availability to be confirmed."
  ],
  [
    "Le fini lisse reste lisse; la photo originale du profil est accessible à gauche.",
    "The smooth finish remains smooth; the original profile photo is available on the left."
  ],
  [
    "Le visuel présente le profil; la teinte choisie est indiquée séparément.",
    "The image shows the profile; the selected colour is indicated separately."
  ],
  [
    "Visuel à compléter",
    "Image to be added"
  ],
  [
    "Échantillon MIR",
    "MIR sample"
  ],
  [
    "Dessin fabricant",
    "Manufacturer drawing"
  ],
  [
    "Exemple de pose",
    "Installation example"
  ],
  [
    "Détail de la matière",
    "Material detail"
  ],
  [
    "Vue du profil",
    "Profile view"
  ],
  [
    "Visuel de la gamme",
    "Product range image"
  ],
  [
    "Photo fabricant",
    "Manufacturer photo"
  ],
  [
    "Visuel fabricant",
    "Manufacturer image"
  ],
  [
    "Référence fabricant; disponibilité, délai et offre MIR à confirmer. Affichage écran indicatif. Échantillon couleur de la brochure; son grain ne certifie pas la texture du profil sélectionné. Les finis lisse et Cedarmill restent distincts.",
    "Manufacturer reference; availability, lead time and MIR offering to be confirmed. On-screen appearance is indicative. Colour sample from the brochure; its grain does not confirm the texture of the selected profile. Smooth and Cedarmill finishes remain distinct."
  ],
  [
    "Détail de la matière · James Hardie. Visuel officiel du profil; teinte et longueur photographiées ne certifient pas la variante commandée.",
    "Material detail · James Hardie. Official profile image; the colour and length shown do not confirm the ordered variant."
  ],
  [
    "Stock, prix et délai MIR non vérifiés. Le contrôle d’encombrement ne valide pas les joints ni les appuis.",
    "MIR stock, pricing and lead time have not been verified. The fit check does not validate joints or supports."
  ],
  [
    "Référence fabricant; disponibilité, délai et offre MIR à confirmer. Affichage écran indicatif. Le fini lisse reste lisse; la photo originale du profil est accessible à gauche.",
    "Manufacturer reference; availability, lead time and MIR offering to be confirmed. On-screen appearance is indicative. The smooth finish remains smooth; the original profile photo is available on the left."
  ],
  [
    "Disponibilité Spectrum variable selon marché; offre MIR inconnue. Images de palettes complémentaires non utilisées comme couleur unie.",
    "Spectrum availability varies by market; MIR offering is unknown. Supplementary palette images are not used as solid colours."
  ],
  [
    "Détail de la matière · Allura. Texture monochrome officielle du profil. La couleur de vente se choisit séparément dans le nuancier du fabricant.",
    "Material detail · Allura. Official monochrome profile texture. The purchase colour is selected separately from the manufacturer’s colour chart."
  ],
  [
    "Exemple de pose · Allura. Exemple de réalisation de la gamme; dimensions et variante exactes non établies.",
    "Installation example · Allura. Example project from the product line; exact dimensions and variant have not been established."
  ],
  [
    "Vue du profil · LP SmartSide. Image originale du catalogue LP 2026, page PDF 22 / imprimées 42–43, section Lap Cedar 38. Le groupe illustre plusieurs largeurs primées 6/8/12 po; aucune largeur exacte du PID 25797 n’est déduite du visuel. Résolution originale limitée à 198 × 125 px.",
    "Profile view · LP SmartSide. Original image from the LP 2026 catalogue, PDF page 22 / printed pages 42–43, Lap Cedar 38 section. The group illustrates several primed 6/8/12 in widths; the exact width of PID 25797 cannot be determined from this image. Original resolution limited to 198 × 125 px."
  ],
  [
    "Exemple de pose · LP SmartSide. Exemple de réalisation de la gamme; dimensions et variante exactes non établies.",
    "Installation example · LP SmartSide. Example project from the product line; exact dimensions and variant have not been established."
  ],
  [
    "Détail de la matière · Maibec. Visuel officiel du profil; teinte et longueur photographiées ne certifient pas la variante commandée.",
    "Material detail · Maibec. Official profile image; the colour and length shown do not confirm the ordered variant."
  ],
  [
    "Détail de la matière · CanExel. Visuel officiel du profil; teinte et longueur photographiées ne certifient pas la variante commandée.",
    "Material detail · CanExel. Official profile image; the colour and length shown do not confirm the ordered variant."
  ],
  [
    "Sens de pose exact306 non confirmé dans la page consultée; validation du guide requise. Largeur physique non confirmée :6 po nominal,4¾po couvrant.",
    "The exact installation direction for profile 306 is not confirmed on the reviewed page; the guide must be checked. Physical width not confirmed: 6 in nominal, 4¾ in coverage."
  ],
  [
    "Détail de la matière · JDP / Juste du Pin. Visuel officiel du profil; teinte et longueur photographiées ne certifient pas la variante commandée.",
    "Material detail · JDP / Juste du Pin. Official profile image; the colour and length shown do not confirm the ordered variant."
  ],
  [
    "Détail de la matière · Kaycan. Image originale associée au libellé « Panneau Perforé SP-600 16” » dans la brochure ©2003 encore liée depuis la page officielle du soffite. Définition originale 178 × 103 px, conservée sans agrandissement raster. La teinte illustrée ne certifie aucun code couleur actuel.",
    "Material detail · Kaycan. Original image labelled “Panneau Perforé SP-600 16”” in the ©2003 brochure still linked from the official soffit page. Original 178 × 103 px resolution preserved without raster enlargement. The illustrated shade does not confirm any current colour code."
  ],
  [
    "Exemple de pose · Kaycan. La photo illustre la gamme de soffites aluminium Kaycan; le code SP600 perforé 0605 ne peut pas être établi à partir de cette photo.",
    "Installation example · Kaycan. This photo shows the Kaycan aluminium soffit range; the perforated SP600 code 0605 cannot be established from this photo."
  ],
  [
    "Détail de la matière · Kaycan. Image originale associée au libellé « Panneau Uni SP-600 16” » dans la brochure ©2003 encore liée depuis la page officielle du soffite. Définition originale 178 × 103 px, conservée sans agrandissement raster. La teinte illustrée ne certifie aucun code couleur actuel.",
    "Material detail · Kaycan. Original image labelled “Panneau Uni SP-600 16”” in the ©2003 brochure still linked from the official soffit page. Original 178 × 103 px resolution preserved without raster enlargement. The illustrated shade does not confirm any current colour code."
  ],
  [
    "Dessin fabricant · Kaycan. Visuel officiel du profil; teinte et longueur photographiées ne certifient pas la variante commandée.",
    "Manufacturer drawing · Kaycan. Official profile image; the colour and length shown do not confirm the ordered variant."
  ],
  [
    "8 po est l’exposition; largeur physique totale non confirmée. Couleurs du code 1003 à valider dans la matricep56.",
    "8 in is the exposure; total physical width is not confirmed. Confirm colours for code 1003 in the matrix on page 56."
  ],
  [
    "Vue du profil · Gentek Canada. Visuel officiel du profil; teinte et longueur photographiées ne certifient pas la variante commandée.",
    "Profile view · Gentek Canada. Official profile image; the colour and length shown do not confirm the ordered variant."
  ],
  [
    "5,34 po est la largeur couverte; largeur physique totale non confirmée. WarmRosewood : code de page et nom de fichier différents. La teinte Amber Birch ne figure pas dans le tableau Bellara Plank de ce guide; conserver le choix existant avec disponibilité à confirmer.",
    "5.34 in is the covered width; total physical width is not confirmed. WarmRosewood: page code and filename differ. Amber Birch is not listed in this guide’s Bellara Plank table; retain the existing choice with availability to be confirmed."
  ],
  [
    "Vue du profil · Vicwest. Visuel fabricant regroupant trois largeurs Bellara, dont le profil 135 au centre. Cette illustration n’est pas une photo de pose et ne certifie pas une variante de couleur ni une pièce de commande.",
    "Profile view · Vicwest. Manufacturer image showing three Bellara widths, with profile 135 in the centre. This illustration is not an installation photo and does not confirm a colour variant or an ordered piece."
  ],
  [
    "Sens de pose du profil Bosco à confirmer; le guide 2024 ne nomme pas Bosco. 5,45 po est une hauteur couverte; largeur physique non confirmée.",
    "Bosco profile installation direction to be confirmed; the 2024 guide does not name Bosco. 5.45 in is a covered height; physical width is not confirmed."
  ],
  [
    "Détail de la matière · Rialux. Rendu matière officiel présenté sur une sphère de démonstration; cette forme ne représente pas une pièce vendue ni la géométrie de coupe. Aucune modification du rendu ou de la teinte.",
    "Material detail · Rialux. Official material rendering shown on a demonstration sphere; this shape does not represent a sold piece or cutting geometry. The rendering and shade have not been altered."
  ],
  [
    "Dessin fabricant · Rialux. Visuel fabricant associant une façade et un dessin de profil; couleur, largeur et variante exactes non certifiées par cette illustration.",
    "Manufacturer drawing · Rialux. Manufacturer image combining a façade and profile drawing; the exact colour, width and variant are not confirmed by this illustration."
  ],
  [
    "Nuancier du soffite exact et type de ventilation non confirmés; aucune transposition automatique du parement Timberland. Photo officielle de la famille intégrée; la référence, le coloris et le format exacts de la variante photographiée ne sont pas établis.",
    "The exact soffit palette and ventilation type are not confirmed; the Timberland siding selection is not automatically applied. Official product-family photo included; the exact reference, colour and size of the photographed variant have not been established."
  ],
  [
    "Photo fabricant · Rialux. Image native extraite de la fiche officielle ACCESSOIRES, page imprimée 13 : Soffite Tiago–Timberland–Bolton. Masque de transparence original conservé; aucune recoloration ni agrandissement. Résolution source limitée à 173 × 168 px. La teinte photographiée ne représente pas toutes les couleurs.",
    "Manufacturer photo · Rialux. Native image extracted from the official ACCESSOIRES data sheet, printed page 13: Tiago–Timberland–Bolton soffit. Original transparency mask preserved; no recolouring or enlargement. Source resolution limited to 173 × 168 px. The photographed shade does not represent every colour."
  ],
  [
    "5,38 po est une largeur couverte; largeur physique non confirmée. Pose diagonale documentée par MAC, non proposée par cette interface.",
    "5.38 in is a covered width; physical width is not confirmed. Diagonal installation is documented by MAC but is not offered in this interface."
  ],
  [
    "Vue du profil · MAC Métal architectural. Visuel officiel du profil; teinte et longueur photographiées ne certifient pas la variante commandée.",
    "Profile view · MAC Métal architectural. Official profile image; the colour and length shown do not confirm the ordered variant."
  ],
  [
    "Vue du profil · Westlake Royal. Image originale de faible résolution, identifiée « 6 in Soffit Timberline » dans la brochure. Offre actuelle MIR et identité du fournisseur Royal à confirmer.",
    "Profile view · Westlake Royal. Original low-resolution image identified as “6 in Soffit Timberline” in the brochure. Current MIR offering and Royal supplier identity to be confirmed."
  ],
  [
    "Visuel de la gamme · ADSEAL / Adfast. Photo originale du catalogue Adfast : cartouche et saucisse DWS 4580. Le conditionnement à vendre et la couleur restent à sélectionner.",
    "Product range image · ADSEAL / Adfast. Original Adfast catalogue photo: DWS 4580 cartridge and sausage pack. The package size and colour still need to be selected."
  ],
  [
    "Vue du profil · Light Trim. Visuel officiel du profil; teinte et longueur photographiées ne certifient pas la variante commandée.",
    "Profile view · Light Trim. Official profile image; the colour and length shown do not confirm the ordered variant."
  ],
  [
    "Prix, stock MIR et combinaisons couleur × longueur non confirmés. Aucun guide de pose exact VFCLS8114/VFCLTEK8114 n’est identifié dans les deux PDF généraux liés par la page; lire les instructions de HardiePlank.",
    "MIR pricing, stock and colour × length combinations are not confirmed. No exact VFCLS8114/VFCLTEK8114 installation guide is identified in the two general PDFs linked from the page; read the HardiePlank instructions."
  ],
  [
    "Photo fabricant · Light Trim. Photo officielle de la famille affichée par Light Trim. La couleur et la longueur photographiées ne certifient pas toutes les variantes. Aucun recadrage ni recoloration.",
    "Manufacturer photo · Light Trim. Official product-family photo shown by Light Trim. The photographed colour and length do not confirm all variants. No cropping or recolouring."
  ],
  [
    "Échantillon MIR · Les Revêtements MIR — illustration de couleur. Illustration MIR créée à partir du même échantillon. Teinte écran indicative; valider avec un échantillon physique.",
    "MIR sample · Les Revêtements MIR — colour illustration. MIR illustration created from the same sample. On-screen colour is indicative; verify with a physical sample."
  ],
  [
    "Stock, prix et délai MIR non vérifiés. Format Canada Est non listé au tableau Québec 06/2025; combinaison profil/couleur à confirmer.",
    "MIR stock, pricing and lead time have not been verified. Eastern Canada size not listed in the Québec 06/2025 chart; profile/colour combination to be confirmed."
  ],
  [
    "Format Canada Est non listé au tableau Québec 06/2025; combinaison profil/couleur à confirmer. Échantillon couleur de la brochure; son grain ne certifie pas la texture du profil sélectionné. Les finis lisse et Cedarmill restent distincts.",
    "Eastern Canada size not listed in the Québec 06/2025 chart; profile/colour combination to be confirmed. Colour sample from the brochure; its grain does not confirm the texture of the selected profile. Smooth and Cedarmill finishes remain distinct."
  ],
  [
    "Stock, prix et délai MIR non vérifiés. Clin lisse documenté Canada Est; profil et couleur à confirmer au Québec.",
    "MIR stock, pricing and lead time have not been verified. Smooth lap siding documented for Eastern Canada; profile and colour to be confirmed for Québec."
  ],
  [
    "Clin lisse documenté Canada Est; profil et couleur à confirmer au Québec. Le fini lisse reste lisse; la photo originale du profil est accessible à gauche.",
    "Smooth lap siding documented for Eastern Canada; profile and colour to be confirmed for Québec. The smooth finish remains smooth; the original profile photo is available on the left."
  ],
  [
    "Stock, prix et délai MIR non vérifiés. Canada Est : les rives décalées ne sont pas listées au tableau Québec 06/2025.",
    "MIR stock, pricing and lead time have not been verified. Eastern Canada: staggered-edge shingles are not listed in the Québec 06/2025 chart."
  ],
  [
    "Canada Est : les rives décalées ne sont pas listées au tableau Québec 06/2025. Échantillon couleur de la brochure; son grain ne certifie pas la texture du profil sélectionné. Les finis lisse et Cedarmill restent distincts.",
    "Eastern Canada: staggered-edge shingles are not listed in the Québec 06/2025 chart. Colour sample from the brochure; its grain does not confirm the texture of the selected profile. Smooth and Cedarmill finishes remain distinct."
  ],
  [
    "Vue du profil · James Hardie. Profil lisse illustré dans la brochure, largeur exacte non identifiée par cette image. Image originale de faible résolution.",
    "Profile view · James Hardie. Smooth profile illustrated in the brochure; this image does not identify the exact width. Original low-resolution image."
  ],
  [
    "Exemple de pose · St-Laurent. Exemple de réalisation de la gamme; dimensions et variante exactes non établies.",
    "Installation example · St-Laurent. Example project from the product line; exact dimensions and variant have not been established."
  ],
  [
    "Photo fabricant · Kaycan. Photo officielle affichée dans la ligne 0747 Urbanix. Coloris illustrés seulement; gamme et disponibilité du rouleau à confirmer.",
    "Manufacturer photo · Kaycan. Official photo shown in the 0747 Urbanix row. Illustrated colours only; coil range and availability to be confirmed."
  ],
  [
    "Épaisseur du3037 non confirmée; ne pas copier celle du PerformanceG8. Rayon et tolérances de pliage à confirmer. Photo officielle de la famille intégrée; la référence, le coloris et le format exacts de la variante photographiée ne sont pas établis. Correspondances James Hardie de la page 63 à vérifier séparément avec Gentek : le code 431 est libellé différemment dans les deux matrices.",
    "3037 thickness is not confirmed; do not copy the Performance G8 thickness. Bend radius and tolerances to be confirmed. Official product-family photo included; the exact reference, colour and size of the photographed variant have not been established. James Hardie matches on page 63 must be checked separately with Gentek: code 431 has different labels in the two matrices."
  ],
  [
    "Exemple de pose · Gentek Canada. Visuel de la famille feuille peinte affiché par Gentek; le code 3037, la teinte et le format exacts ne sont pas identifiés dans la photo. Photo du rouleau en atelier, avec son environnement original.",
    "Installation example · Gentek Canada. Painted-sheet family image shown by Gentek; code 3037, the exact colour and the size are not identified in the photo. Photo of the coil in a workshop, with its original surroundings."
  ],
  [
    "Format de feuille, jauge et couleur non confirmés. Faisabilité et capacité de pliage MIR non documentées. Photo du produit exact non identifiée; aucune photo de bobine, tôle ou profil voisin ne lui est attribuée. Certains codes Vicwest sont documentés pour des produits autres que Bellara et peuvent ne pas être disponibles en feuille plane.",
    "Sheet size, gauge and colour are not confirmed. MIR bending feasibility and capacity are not documented. No photo of the exact product has been identified; no photo of a similar coil, sheet or profile is assigned to it. Some Vicwest codes are documented for products other than Bellara and may not be available in flat sheets."
  ],
  [
    "Dimensions nominales du tableau fabricant; largeur réelle, tolérance et offre locale à confirmer avant débit. Cette fiche vise la version apprêtée; aucune couleur Spectrum n’est implicitement appliquée.",
    "Nominal dimensions from the manufacturer’s chart; confirm actual width, tolerances and local availability before cutting. This sheet covers the primed version; no Spectrum colour is applied by default."
  ],
  [
    "Dimensions réelles et longueur du format exact à confirmer; ne pas déduire une épaisseur réelle de 1¼ po du nom 5/4. Orientation du contour dépend de la conception; guide du système à suivre.",
    "Actual dimensions and length of the exact size must be confirmed; do not infer an actual thickness of 1¼ in from the 5/4 name. Trim orientation depends on the design; follow the system guide."
  ],
  [
    "Vue du profil · Allura. Vue officielle de plusieurs moulures de la gamme Allura. Le fini et la couleur de la référence choisie sont à confirmer.",
    "Profile view · Allura. Official image of several trim products from the Allura range. Confirm the finish and colour of the selected reference."
  ],
  [
    "Disponibilité régionale et édition de fabrication du PID à confirmer. La réalisation photographiée est un exemple de gamme; son fini ne correspond pas nécessairement à la pièce apprêtée.",
    "Regional availability and the manufacturing edition for this PID must be confirmed. The photographed project is an example from the range; its finish does not necessarily match the primed piece."
  ],
  [
    "Détail de la matière · LP SmartSide. Image originale du catalogue LP 2026, page PDF 33 / imprimées 64–65, section Panel Cedar 38 contenant les modèles à rainure et sans rainure. L’image montre la surface Cedar; elle ne prouve ni le chant NGSL ni la longueur 10 pi du PID 25825. Résolution originale limitée à 111 × 219 px.",
    "Material detail · LP SmartSide. Original image from the LP 2026 catalogue, PDF page 33 / printed pages 64–65, Panel Cedar 38 section containing grooved and ungrooved models. The image shows the Cedar surface; it does not establish the NGSL edge or the 10 ft length of PID 25825. Original resolution limited to 111 × 219 px."
  ],
  [
    "Vue du profil · LP SmartSide. Image originale du catalogue LP 2026, page PDF 26 / imprimées 50–51, section Shake Cedar 38 où apparaît le PID 42092. La forme réversible du profil est illustrée; la photographie ne sert pas de mesure. Résolution originale limitée à 239 × 107 px.",
    "Profile view · LP SmartSide. Original image from the LP 2026 catalogue, PDF page 26 / printed pages 50–51, Shake Cedar 38 section listing PID 42092. The reversible profile shape is illustrated; the photograph is not used for measurements. Original resolution limited to 239 × 107 px."
  ],
  [
    "Vue du profil · LP SmartSide. Image originale du catalogue LP 2026, page PDF 43 / imprimées 84–85, section Trim Brushed Smooth 440. Le groupe représente plusieurs largeurs; ne certifie pas le format 3½ po du PID 46000. Résolution originale limitée à 191 × 142 px.",
    "Profile view · LP SmartSide. Original image from the LP 2026 catalogue, PDF page 43 / printed pages 84–85, Trim Brushed Smooth 440 section. The group represents several widths; it does not confirm the 3½ in size of PID 46000. Original resolution limited to 191 × 142 px."
  ],
  [
    "Largeur physique du panneau non vérifiée; le double 4 po décrit sa surface exposée. Palette de page représentative; aucune extension aux D4½ réservés à certaines provinces de l’Ouest.",
    "Physical panel width not verified; double 4 in describes its exposure. Representative page palette; not extended to D4½ profiles restricted to certain western provinces."
  ],
  [
    "Détail de la matière · Rialux. Échantillon officiel du profil et de la teinte Écorce; ne certifie pas la longueur, le stock MIR ou une mesure de pose. Fichier haute définition d’origine, sans recoloration.",
    "Material detail · Rialux. Official sample of the profile in Écorce; it does not certify length, MIR stock or an installation measurement. Original high-resolution file, with no recolouring."
  ],
  [
    "Orientation du profil 307 non confirmée par un guide spécifique; rendu de pose neutralisé. Largeur physique réelle non renseignée; 5 po est une largeur nominale.",
    "No profile-specific guide confirms the installation orientation of profile 307; the layout rendering is neutralized. Actual physical width not provided; 5 in is a nominal width."
  ],
  [
    "Longueur de la planche non explicitement publiée; aucune longueur ni maxPiece déduite du rendement. Palette du système non entièrement confirmée pour chaque combinaison; aucun stock MIR.",
    "Board length is not explicitly published; neither length nor maxPiece is inferred from coverage. The system palette is not fully confirmed for every combination; no MIR stock information."
  ],
  [
    "Visuel fabricant · Les Revêtements MIR. Le visuel présente le profil; la teinte choisie est indiquée séparément.",
    "Manufacturer image · Les Revêtements MIR. The image shows the profile; the selected colour is indicated separately."
  ],
  [
    "Visuel de la gamme · PRIME / Premier Outils Pro — catalogue 2025. Illustration de la famille de clous; la longueur exacte de la référence est donnée dans le tableau fabricant.",
    "Product range image · PRIME / Premier Outils Pro — catalogue 2025. Illustration of the nail family; the exact length of this reference is provided in the manufacturer’s table."
  ],
  [
    "Visuel de la gamme · CanExel. Photo fabricant d’un contenant Acadia. Ne certifie pas une disponibilité actuelle de cette teinte ni un kit avec pinceau.",
    "Product range image · CanExel. Manufacturer photo of an Acadia container. It does not certify current availability of this colour or a kit with a brush."
  ],
  [
    "1 pint de peinture (libellé fabricant; volume commercial local à confirmer) · Nail Concealer · Edge Sealer",
    "1 pint of paint (manufacturer’s wording; local sales volume to be confirmed) · Nail Concealer · Edge Sealer"
  ],
  [
    "Visuel de la gamme · James Hardie. Photo officielle de la gamme; couleur et référence locale du kit non confirmées.",
    "Product range image · James Hardie. Official product-line photo; kit colour and local reference not confirmed."
  ],
  [
    "Référence de commande, couleur, disponibilité, prix et unité de vente MIR à confirmer. Aucune photo isolée de cette référence confirmée; schéma de mise en œuvre fabricant dans le document de calcul, page 2.",
    "Order reference, colour, availability, pricing and MIR sales unit to be confirmed. No standalone photo of this reference confirmed; manufacturer’s installation diagram is on page 2 of the calculation document."
  ],
  [
    "Référence de commande, couleur, disponibilité, prix et unité de vente MIR à confirmer. Aucune photo isolée de cette référence confirmée; schéma de mise en œuvre fabricant dans le document de calcul, page 2. Format 6 po présent dans le calculateur 2024, mais absent de la liste de joints du guide de pose 2026 consulté; maintien au catalogue actuel à confirmer.",
    "Order reference, colour, availability, pricing and MIR sales unit to be confirmed. No standalone photo of this reference confirmed; manufacturer’s installation diagram is on page 2 of the calculation document. The 6 in size appears in the 2024 calculator but is absent from the joint list in the reviewed 2026 installation guide; continued inclusion in the current catalogue is to be confirmed."
  ],
  [
    "Référence de commande, couleur, disponibilité, prix et unité de vente MIR à confirmer. Aucune photo isolée spécifique au 0721 confirmée.",
    "Order reference, colour, availability, pricing and MIR sales unit to be confirmed. No standalone photo specific to 0721 confirmed."
  ],
  [
    "Code fabricant ou étiquette du produit à obtenir. Identité, dimensions, couleur, conditionnement, prix et disponibilité MIR non confirmés.",
    "Manufacturer code or product label to be obtained. Identity, dimensions, colour, packaging, pricing and MIR availability not confirmed."
  ],
  [
    "Marque et compatibilité exactes à confirmer. Prix et stock MIR non confirmés.",
    "Exact brand and compatibility to be confirmed. MIR price and stock not confirmed."
  ],
  [
    "Quantité par emballage, marque et compatibilité à confirmer. Prix et stock MIR non confirmés.",
    "Quantity per package, brand and compatibility to be confirmed. MIR price and stock not confirmed."
  ],
  [
    "Prix, disponibilité régionale par variante et unité de vente MIR non confirmés. Les images écran ne constituent pas un étalon colorimétrique.",
    "Price, regional availability by variant and MIR sales unit not confirmed. Screen images are not a colour measurement standard."
  ],
  [
    "Détail de la matière · Quality Edge. Photo originale du profil en Black 518. La teinte choisie se consulte dans son échantillon officiel.",
    "Material detail · Quality Edge. Original photo of the profile in Black 518. Refer to the official sample for your selected colour."
  ],
  [
    "Détail de la matière · BP Canada. Image originale extraite du dépliant 2026, page 2; association couleur vérifiée sur la page rendue. Visualisation de toiture uniquement.",
    "Material detail · BP Canada. Original image extracted from the 2026 brochure, page 2; colour association verified on the rendered page. Roof visualization only."
  ],
  [
    "L’écran ne remplace pas l’échantillon physique de bardeau. Disponibilité, lots et commandes auprès du distributeur non vérifiés.",
    "A screen does not replace a physical shingle sample. Availability, batches and distributor orders have not been verified."
  ],
  [
    "Détail de la matière · IKO Industries. Échantillon officiel associé au produit et à son identifiant couleur; fichier original du sélecteur fabricant, sans retouche.",
    "Material detail · IKO Industries. Official sample associated with the product and its colour ID; original file from the manufacturer's selector, without retouching."
  ],
  [
    "Visualisation indicative à valider avec un échantillon physique; disponibilité commerciale locale non vérifiée. La scène MIR harmonise les couleurs; elle ne simule pas exactement le calepinage ou le relief du bardeau.",
    "Illustrative visualization to be verified against a physical sample; local commercial availability has not been verified. The MIR scene coordinates colours; it does not precisely simulate the shingle layout or relief."
  ],
  [
    "Détail de la matière · CertainTeed. Échantillon officiel à proportion native, sans recoloration; visualisation client seulement.",
    "Material detail · CertainTeed. Official sample at its original proportions, without recolouring; client visualization only."
  ],
  [
    "Prix, stock MIR et combinaisons couleur × longueur non confirmés. La ligne regroupant VFCSSS8158/8178/8212 dans la fiche technique affiche une seule longueur; les longueurs séparées sont reprises du guide de sélection, sans extrapoler les résistances mécaniques.",
    "MIR pricing, stock and colour × length combinations are not confirmed. The row grouping VFCSSS8158/8178/8212 in the technical data sheet shows only one length; individual lengths are taken from the selection guide, without extrapolating mechanical strength."
  ],
  [
    "Option publiée par Light Trim; combinaison couleur × longueur et offre MIR à confirmer. Écran indicatif. Référence de couleur originale du fabricant; ne représente ni la texture de la vis ni une photo de sa finition. Aucune valeur hex de fabricant n’est inventée.",
    "Option published by Light Trim; colour × length combination and MIR availability to be confirmed. On-screen appearance is indicative. Original manufacturer colour reference; it represents neither the screw texture nor a photograph of its finish. No manufacturer hex value is invented."
  ],
  [
    "Photo fabricant · Light Trim. Photo originale explicitement liée par le fabricant à cette option de couleur et à la longueur 1½ po. Le SKU commercial est vide dans les données publiées; ne pas le déduire du nom de fichier. Écran indicatif; aucune retouche.",
    "Manufacturer photo · Light Trim. Original photo explicitly linked by the manufacturer to this colour option and the 1½ in length. The commercial SKU is blank in the published data; do not infer it from the filename. Screen image is illustrative; no retouching."
  ],
  [
    "Prix, stock MIR et combinaisons couleur × longueur non confirmés. Conditionnement contradictoire : 250 sur la page produit, 500 sur le guide de sélection et la fiche technique. À confirmer avant commande.",
    "MIR pricing, stock and colour × length combinations are not confirmed. Conflicting packaging: 250 on the product page, 500 in the selection guide and technical data sheet. Confirm before ordering."
  ],
  [
    "Prix, stock, disponibilité et conditionnement MIR à confirmer. Dimensions, détail de joint, compatibilité du fini et prescription de pose à confirmer pour le projet.",
    "MIR price, stock, availability and packaging to be confirmed. Dimensions, joint detail, finish compatibility and installation requirements to be confirmed for the project."
  ],
  [
    "Vue du profil · UNICO. Rendu officiel du profil U-P1; ce visuel ne certifie pas la matière, l’épaisseur ou la couleur de la variante choisie.",
    "Profile view · UNICO. Official rendering of the U-P1 profile; this image does not confirm the material, thickness or colour of the selected variant."
  ],
  [
    "Stock, disponibilité du fini et conditionnement MIR à confirmer. Taxes et livraison non calculées. Dimensions, détail de joint, compatibilité du fini et prescription de pose à confirmer pour le projet.",
    "MIR stock, finish availability and packaging to be confirmed. Taxes and delivery are not calculated. Dimensions, joint detail, finish compatibility and installation requirements to be confirmed for the project."
  ],
  [
    "Stock, prix et délai MIR non vérifiés. Le contrôle d’encombrement ne valide pas les joints ni les appuis. Largeur exacte/hauteur de la baguette et quantités de tasseaux : à confirmer avant la commande.",
    "MIR stock, pricing and lead time have not been verified. The fit check does not validate joints or supports. Exact batten width/height and furring quantities: confirm before ordering."
  ],
  [
    "Visuel fabricant · Les Revêtements MIR. Visuel fourni par MIR du modèle PANELFAST AGS-100.",
    "Manufacturer image · Les Revêtements MIR. PANELFAST AGS-100 model image supplied by MIR."
  ],
  [
    "Visuel fabricant · Les Revêtements MIR. Présentation MIR d’une boîte de 12 bobines.",
    "Manufacturer image · Les Revêtements MIR. MIR presentation of a box of 12 coils."
  ],
  [
    "Le nuancier numérique est indicatif. Faites valider la teinte sur un échantillon. Les teintes sans format publié sont sur demande. Prix, disponibilité et minimums à confirmer avec MIR.",
    "The digital colour chart is indicative. Have the colour confirmed with a physical sample. Colours without a published size are available on request. Pricing, availability and minimum quantities to be confirmed with MIR."
  ],
  [
    "Gros plan officiel HardiePlank Select Cedarmill",
    "Official close-up of HardiePlank Select Cedarmill"
  ],
  [
    "Texture officielle HardiePanel Smooth",
    "Official HardiePanel Smooth texture"
  ],
  [
    "Texture officielle du profil Allura Traditional Lap",
    "Official Allura Traditional Lap profile texture"
  ],
  [
    "Exemple de réalisation de la gamme — Allura Lap Siding — Cèdre traditionnel 8¼ po",
    "Example project from the range — Allura Lap Siding — Traditional Cedar 8¼ in"
  ],
  [
    "LP SmartSide série 38 Cedar — vues de clins apprêtés",
    "LP SmartSide 38 Series Cedar — views of primed lap siding"
  ],
  [
    "Exemple de réalisation de la gamme — SmartSide série 38 Cedar Texture — apprêté",
    "Example project from the range — SmartSide 38 Series Cedar Texture — primed"
  ],
  [
    "Gros plan officiel — Moderne 6 po em+ — texturé",
    "Official close-up — Moderne 6 in em+ — textured"
  ],
  [
    "Gros plan officiel — Ridgewood D-5",
    "Official close-up — Ridgewood D-5"
  ],
  [
    "Échantillon original JDP Äkta profil 306, Portobello",
    "Original JDP Äkta profile 306 sample, Portobello"
  ],
  [
    "Gros plan officiel Kaycan SP-600 16 po perforé — brochure aluminium",
    "Official close-up of perforated Kaycan SP-600 16 in — aluminium brochure"
  ],
  [
    "Exemple de soffite aluminium Kaycan installé",
    "Example of installed Kaycan aluminium soffit"
  ],
  [
    "Gros plan officiel Kaycan SP-600 16 po uni — brochure aluminium",
    "Official close-up of solid Kaycan SP-600 16 in — aluminium brochure"
  ],
  [
    "Dessin officiel — SP-600 16 po — uni / plein",
    "Official drawing — SP-600 16 in — plain / solid"
  ],
  [
    "Dessin officiel — Fascia aluminium 6 po — 0480",
    "Official drawing — Aluminium fascia 6 in — 0480"
  ],
  [
    "Visuel officiel — Woodgrain 2000 — Horizontal 8",
    "Official image — Woodgrain 2000 — Horizontal 8"
  ],
  [
    "Visuel officiel — Soffite 16 po à 2 panneaux — ventilé",
    "Official image — 16 in 2-panel soffit — vented"
  ],
  [
    "Visuel officiel — Soffite 16 po à 2 panneaux — plein",
    "Official image — 16 in 2-panel soffit — solid"
  ],
  [
    "Visuel officiel — Fascia aluminium 6 po — nervuré",
    "Official image — Aluminium fascia 6 in — ribbed"
  ],
  [
    "Rendu officiel comparant les profils Bellara Plank 90, 135 et 200",
    "Official rendering comparing Bellara Plank 90, 135 and 200 profiles"
  ],
  [
    "Échantillon matière officiel Rialux Bosco, Beige dune, présenté sur une sphère",
    "Official Rialux Bosco material sample, Beige dune, displayed on a sphere"
  ],
  [
    "Présentation officielle du profil Bosco",
    "Official Bosco profile presentation"
  ],
  [
    "Soffite Rialux perforé — visuel officiel de la fiche accessoires Tiago, Timberland et Bolton",
    "Perforated Rialux soffit — official image from the Tiago, Timberland and Bolton accessories sheet"
  ],
  [
    "Visuel officiel — Norwood",
    "Official image — Norwood"
  ],
  [
    "Visuel officiel — Harrywood Ventilé",
    "Official image — Harrywood Ventilated"
  ],
  [
    "Cedar Renditions 6 po, soffite perforé Timberline — brochure Canada 2023",
    "Cedar Renditions 6 in perforated Timberline soffit — Canada 2023 brochure"
  ],
  [
    "Conditionnements ADSEAL DWS 4580 — photo du catalogue Adfast",
    "ADSEAL DWS 4580 packaging — Adfast catalogue photo"
  ],
  [
    "Visuel officiel — V299XL SHADOW XL — moulure verticale",
    "Official image — V299XL SHADOW XL — vertical trim"
  ],
  [
    "Visuel officiel Light Trim — VFCLS8114",
    "Official Light Trim image — VFCLS8114"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Blanc arctique",
    "James Hardie sample 6 ¼ in — Blanc arctique"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Pierre des champs",
    "James Hardie sample 6 ¼ in — Pierre des champs"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Beige Navajo",
    "James Hardie sample 6 ¼ in — Beige Navajo"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Brun kaki",
    "James Hardie sample 6 ¼ in — Brun kaki"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Taupe Monterey",
    "James Hardie sample 6 ¼ in — Taupe Monterey"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Écorce",
    "James Hardie sample 6 ¼ in — Écorce"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Espresso",
    "James Hardie sample 6 ¼ in — Espresso"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Sauge",
    "James Hardie sample 6 ¼ in — Sauge"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Gris ardoise",
    "James Hardie sample 6 ¼ in — Gris ardoise"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Bleu acier",
    "James Hardie sample 6 ¼ in — Bleu acier"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Brume légère",
    "James Hardie sample 6 ¼ in — Brume légère"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Gris perle",
    "James Hardie sample 6 ¼ in — Gris perle"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Étain vieilli",
    "James Hardie sample 6 ¼ in — Étain vieilli"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Gris nocturne",
    "James Hardie sample 6 ¼ in — Gris nocturne"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Bleu de soirée",
    "James Hardie sample 6 ¼ in — Bleu de soirée"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Bleu océan",
    "James Hardie sample 6 ¼ in — Bleu océan"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Gris fer",
    "James Hardie sample 6 ¼ in — Gris fer"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Rouge campagnard",
    "James Hardie sample 6 ¼ in — Rouge campagnard"
  ],
  [
    "Échantillon James Hardie 6 ¼ po — Noir minuit",
    "James Hardie sample 6 ¼ in — Noir minuit"
  ],
  [
    "Gros plan officiel HardiePlank Smooth",
    "Official close-up of HardiePlank Smooth"
  ],
  [
    "Texture officielle HardiePanel Select Cedarmill",
    "Official HardiePanel Select Cedarmill texture"
  ],
  [
    "Aspect officiel HardieShingle à rives droites",
    "Official appearance of HardieShingle Straight Edge"
  ],
  [
    "Aspect officiel HardieShingle à rives décalées",
    "Official appearance of HardieShingle Staggered Edge"
  ],
  [
    "Moulure HardieTrim Smooth — image originale de la brochure Québec",
    "HardieTrim Smooth trim — original image from the Québec brochure"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Lin",
    "St-Laurent sample 6 ¼ in — Lin"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Blanc",
    "St-Laurent sample 6 ¼ in — Blanc"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Argent",
    "St-Laurent sample 6 ¼ in — Argent"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Aspen",
    "St-Laurent sample 6 ¼ in — Aspen"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Bouleau",
    "St-Laurent sample 6 ¼ in — Bouleau"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Eucalyptus",
    "St-Laurent sample 6 ¼ in — Eucalyptus"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Gris cendre",
    "St-Laurent sample 6 ¼ in — Gris cendre"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Saule argenté",
    "St-Laurent sample 6 ¼ in — Saule argenté"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Frêne",
    "St-Laurent sample 6 ¼ in — Frêne"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Bois de grève",
    "St-Laurent sample 6 ¼ in — Bois de grève"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Bois d’érable",
    "St-Laurent sample 6 ¼ in — Bois d’érable"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Miel naturel",
    "St-Laurent sample 6 ¼ in — Miel naturel"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Ipé",
    "St-Laurent sample 6 ¼ in — Ipé"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Bois de chêne",
    "St-Laurent sample 6 ¼ in — Bois de chêne"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Peuplier",
    "St-Laurent sample 6 ¼ in — Peuplier"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Noisetier",
    "St-Laurent sample 6 ¼ in — Noisetier"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Pruche vieillie",
    "St-Laurent sample 6 ¼ in — Pruche vieillie"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Écorce",
    "St-Laurent sample 6 ¼ in — Écorce"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Torréfié",
    "St-Laurent sample 6 ¼ in — Torréfié"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Espresso",
    "St-Laurent sample 6 ¼ in — Espresso"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Kingwood",
    "St-Laurent sample 6 ¼ in — Kingwood"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Charbon de bois",
    "St-Laurent sample 6 ¼ in — Charbon de bois"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Ébène",
    "St-Laurent sample 6 ¼ in — Ébène"
  ],
  [
    "Échantillon St-Laurent 6 ¼ po — Noir",
    "St-Laurent sample 6 ¼ in — Noir"
  ],
  [
    "Réalisation officielle — St-Laurent — Bardage à clin 8,25 po",
    "Official project — St-Laurent — 8.25 in lap siding"
  ],
  [
    "Réalisation officielle — St-Laurent — V-Groove Architectural",
    "Official project — St-Laurent — V-Groove Architectural"
  ],
  [
    "Réalisation officielle — St-Laurent — Moulure 3½ po",
    "Official project — St-Laurent — 3½ in trim"
  ],
  [
    "Dessin officiel — Urbanix 6 po Lisse — 9920",
    "Official drawing — Urbanix 6 in Smooth — 9920"
  ],
  [
    "Visuel officiel — Urbanix — Rouleau aluminium 0747",
    "Official image — Urbanix — Aluminium coil 0747"
  ],
  [
    "Visuel officiel — Gentek — Feuille peinte aluminium 3037, 24 po × 98,5 pi",
    "Official image — Gentek — Painted aluminium sheet 3037, 24 in × 98.5 ft"
  ],
  [
    "Visuel officiel — J002 SHADOW — Contour de portes et fenêtres",
    "Official image — J002 SHADOW — Door and window trim"
  ],
  [
    "Visuel officiel — J201 — Contour de portes et fenêtres",
    "Official image — J201 — Door and window trim"
  ],
  [
    "Gros plan officiel — CanExel VStyle — 12 po",
    "Official close-up — CanExel VStyle — 12 in"
  ],
  [
    "Gros plan officiel — CanExel Ced’R-Vue — 9 po",
    "Official close-up — CanExel Ced’R-Vue — 9 in"
  ],
  [
    "Gros plan officiel — CanExel Planche et couvre-joint — 12 po",
    "Official close-up — CanExel Board and Batten — 12 in"
  ],
  [
    "Gros plan officiel — Maibec Clin rainuré em+ — 6 po texturé",
    "Official close-up — Maibec Rabbeted Bevel em+ — 6 in textured"
  ],
  [
    "Gros plan officiel — Maibec Contemporain em+ — 6 po texturé",
    "Official close-up — Maibec Contemporary em+ — 6 in textured"
  ],
  [
    "Gros plan officiel — Maibec Planche et couvre-joint — 10 po texturé",
    "Official close-up — Maibec Board and Batten — 10 in textured"
  ],
  [
    "Texture officielle du panneau Allura Smooth",
    "Official Allura Smooth panel texture"
  ],
  [
    "Exemple de réalisation de la gamme — Allura Panel Smooth — format 4 × 10 pi",
    "Example project from the range — Allura Panel Smooth — size 4 × 10 ft"
  ],
  [
    "Texture officielle du panneau Allura Traditional sans rainure",
    "Official ungrooved Allura Traditional panel texture"
  ],
  [
    "Exemple de réalisation de la gamme — Allura Panel Traditional — format 4 × 10 pi",
    "Example project from the range — Allura Panel Traditional — size 4 × 10 ft"
  ],
  [
    "Présentation officielle de plusieurs moulures Allura réversibles",
    "Official presentation of several reversible Allura trim products"
  ],
  [
    "Exemple de réalisation de la gamme — Allura Trim — 5/4 × 4, réversible",
    "Example project from the range — Allura Trim — 5/4 × 4, reversible"
  ],
  [
    "LP SmartSide série 38 — échantillon de panneau Cedar apprêté",
    "LP SmartSide 38 Series — primed Cedar panel sample"
  ],
  [
    "Exemple de réalisation de la gamme — LP SmartSide 38 — panneau Cedar sans rainure, 10 pi",
    "Example project from the range — LP SmartSide 38 — Cedar panel, no groove, 10 ft"
  ],
  [
    "LP SmartSide série 38 Cedar — élément Shake apprêté",
    "LP SmartSide 38 Series Cedar — primed Shake piece"
  ],
  [
    "Exemple de réalisation de la gamme — LP SmartSide 38 — Shake Cedar, 12 po nominal",
    "Example project from the range — LP SmartSide 38 — Cedar Shake, 12 in nominal"
  ],
  [
    "LP SmartSide série 440 Brushed Smooth — moulures apprêtées",
    "LP SmartSide 440 Series Brushed Smooth — primed trim"
  ],
  [
    "Exemple de réalisation de la gamme — LP SmartSide 440 — moulure Brushed Smooth 3½ po",
    "Example project from the range — LP SmartSide 440 — Brushed Smooth trim 3½ in"
  ],
  [
    "Dessin officiel — DaVinci D4 — 0061",
    "Official drawing — DaVinci D4 — 0061"
  ],
  [
    "Dessin officiel — DaVinci D4D Dutch Lap — 0062",
    "Official drawing — DaVinci D4D Dutch Lap — 0062"
  ],
  [
    "Visuel officiel — Sequoia Select — Double 4 po, 64496",
    "Official image — Sequoia Select — Double 4 in, 64496"
  ],
  [
    "Visuel officiel — Harrywood — acier, 12 pi",
    "Official image — Harrywood — steel, 12 ft"
  ],
  [
    "Échantillon officiel du profil Rialux Tiago, Écorce",
    "Official Rialux Tiago profile sample, Écorce"
  ],
  [
    "Présentation officielle du profil Tiago — aluminium, 150 po",
    "Official Tiago profile presentation — aluminium, 150 in"
  ],
  [
    "Échantillon officiel du profil Rialux Bolton, Écorce",
    "Official Rialux Bolton profile sample, Écorce"
  ],
  [
    "Présentation officielle du profil Bolton — aluminium, 150 po",
    "Official Bolton profile presentation — aluminium, 150 in"
  ],
  [
    "Échantillon original JDP Bluhouss profil 307, Ecobleach",
    "Original JDP Bluhouss profile 307 sample, Ecobleach"
  ],
  [
    "Réalisation officielle — St-Laurent Board & Batten — planche 12 po",
    "Official project — St-Laurent Board & Batten — 12 in board"
  ],
  [
    "Bobine de clous annelés PRIME 30724 galvanisés à chaud",
    "Coil of hot-dip galvanized PRIME 30724 ring-shank nails"
  ],
  [
    "Boîte PRIME 30724, 2 po et calibre 0,092",
    "PRIME 30724 box, 2 in and 0.092 gauge"
  ],
  [
    "Illustration officielle PRIME : clous en bobine, basse, galvanisé à chaud (hdg)",
    "Official PRIME illustration: low-wire coil nails, hot-dip galvanized (hdg)"
  ],
  [
    "Illustration officielle PRIME : clous en bobine, basse, acier inoxydable",
    "Official PRIME illustration: low-wire coil nails, stainless steel"
  ],
  [
    "Illustration officielle PRIME : clous en bobine, haute, conique, galvanisé à chaud (hdg)",
    "Official PRIME illustration: high-wire conical coil nails, hot-dip galvanized (hdg)"
  ],
  [
    "Illustration officielle PRIME : clous en bobine, basse, brillant",
    "Official PRIME illustration: low-wire coil nails, bright finish"
  ],
  [
    "Maibec CanExel — Peinture de retouche 284 ml — visuel officiel de gamme",
    "Maibec CanExel — 284 ml touch-up paint — official product range image"
  ],
  [
    "ColorPlus — Kit de retouche — visuel officiel de gamme",
    "ColorPlus — Touch-up kit — official product range image"
  ],
  [
    "TruVent HVS — profil à ventilation cachée, Black 518",
    "TruVent HVS — concealed-vent profile, Black 518"
  ],
  [
    "Échantillon officiel Mystique Est — Noir 2 tons",
    "Official sample Mystique Est — Noir 2 tons"
  ],
  [
    "Échantillon officiel IKO Cambridge — Noir double",
    "Official sample IKO Cambridge — Noir double"
  ],
  [
    "Échantillon officiel IKO Dynasty — Noir granite",
    "Official sample IKO Dynasty — Noir granite"
  ],
  [
    "Échantillon officiel IKO Nordic — Noir granite",
    "Official sample IKO Nordic — Noir granite"
  ],
  [
    "Échantillon officiel CertainTeed Landmark — Noir moiré",
    "Official sample CertainTeed Landmark — Noir moiré"
  ],
  [
    "Échantillon officiel CertainTeed Landmark PRO — Noir moiré - déf max",
    "Official sample CertainTeed Landmark PRO — Noir moiré - déf max"
  ],
  [
    "Visuel officiel Light Trim — VFCSSS",
    "Official Light Trim image — VFCSSS"
  ],
  [
    "Visuel officiel Light Trim — VFCSSTEK",
    "Official Light Trim image — VFCSSTEK"
  ],
  [
    "Visuel officiel Light Trim — VFCS",
    "Official Light Trim image — VFCS"
  ],
  [
    "Visuel officiel Light Trim — VFCTEK8",
    "Official Light Trim image — VFCTEK8"
  ],
  [
    "Visuel officiel Light Trim — VTSSS10",
    "Official Light Trim image — VTSSS10"
  ],
  [
    "Visuel officiel Light Trim — VTSSTEK10",
    "Official Light Trim image — VTSSTEK10"
  ],
  [
    "Visuel officiel Light Trim — VFCSSS10",
    "Official Light Trim image — VFCSSS10"
  ],
  [
    "Visuel officiel Light Trim — VFCSSTEK10118T",
    "Official Light Trim image — VFCSSTEK10118T"
  ],
  [
    "Visuel officiel Light Trim — VFCLTEK8114",
    "Official Light Trim image — VFCLTEK8114"
  ],
  [
    "Visuel officiel Light Trim — VFCTEK834",
    "Official Light Trim image — VFCTEK834"
  ],
  [
    "Visuel officiel Light Trim — T001",
    "Official Light Trim image — T001"
  ],
  [
    "Rendu officiel du profil U-P1",
    "Official U-P1 profile rendering"
  ],
  [
    "Bobine de clous BECK PANELFAST AGS-100 sur fond clair",
    "Coil of BECK PANELFAST AGS-100 nails on a light background"
  ],
  [
    "Boîte ouverte contenant douze bobines de clous BECK PANELFAST AGS-100",
    "Open box containing twelve coils of BECK PANELFAST AGS-100 nails"
  ],
  [
    "Agrafes PRIME 40869 en barrettes",
    "PRIME 40869 staple strips"
  ],
  [
    "Emballage PRIME 40869 avec calibre et longueur",
    "PRIME 40869 packaging showing gauge and length"
  ],
  [
    "Clous en bandes de papier PRIME 20031",
    "PRIME 20031 paper-collated strip nails"
  ],
  [
    "Emballage de clous PRIME 20031, 3¼ po",
    "PRIME 20031 nail packaging, 3¼ in"
  ],
  [
    "Agrafes PRIME GSI 40713 en barrettes",
    "PRIME GSI 40713 staple strips"
  ],
  [
    "Boîte PRIME GSI 40713, largeur 3/8 po",
    "PRIME GSI 40713 box, 3/8 in width"
  ],
  [
    "Joints fibro MIR 6 po sur fond neutre",
    "MIR 6 in fibre cement joint accessories on a neutral background"
  ],
  [
    "Joints fibro MIR 8 po sur fond neutre",
    "MIR 8 in fibre cement joint accessories on a neutral background"
  ],
  [
    "Votre projet",
    "Your project"
  ],
  [
    "commence",
    "starts"
  ],
  [
    "ici.",
    "here."
  ],
  [
    "Votre projet commence ici.",
    "Your project starts here."
  ],
  [
    "Une maison à rénover?",
    "Renovating your home?"
  ],
  [
    "Un chantier à préparer?",
    "Planning a job?"
  ],
  [
    "Pour ma maison",
    "For my home"
  ],
  [
    "Pour mes chantiers",
    "For my jobs"
  ],
  [
    "Inspiration et matériaux.",
    "Inspiration and materials."
  ],
  [
    "Pliages et préparation de commande.",
    "Custom bending and order preparation."
  ],
  [
    "Découvrir tout MIR",
    "Explore MIR"
  ],
  [
    "Choisir votre parcours",
    "Choose your path"
  ],
  [
    "Découvrez le Studio et les outils actuellement disponibles.",
    "Explore the Studio and the tools currently available."
  ],
  [
    "BOUTIQUE",
    "SHOP"
  ],
  [
    "/ GUIDE DES MATÉRIAUX",
    "/ MATERIALS GUIDE"
  ],
  [
    "Les bons conseils.",
    "The right advice."
  ],
  [
    "Le bon",
    "The right"
  ],
  [
    "départ.",
    "start."
  ],
  [
    "TÉLÉPHONE",
    "PHONE"
  ],
  [
    "COURRIEL",
    "EMAIL"
  ],
  [
    "NOUS TROUVER",
    "FIND US"
  ],
  [
    "UNE QUESTION AVANT DE COMMENCER?",
    "A QUESTION BEFORE YOU START?"
  ],
  [
    "On vous aide à choisir.",
    "We can help you choose."
  ],
  [
    "Consultez l’aide pour préparer vos matériaux, vos mesures et votre demande.",
    "Find help with your materials, measurements and request."
  ],
  [
    "Consulter l’aide",
    "Visit the help centre"
  ],
  [
    "VOTRE MAISON, VOTRE PROJET",
    "YOUR HOME, YOUR PROJECT"
  ],
  [
    "ressemble.",
    "you."
  ],
  [
    "Inspirez-vous de nos réalisations, comparez les matériaux et préparez votre panier. MIR vous accompagne pour la suite.",
    "Find inspiration in our projects, compare materials and build your cart. MIR will help you take the next step."
  ],
  [
    "Découvrir les revêtements",
    "Explore siding"
  ],
  [
    "Préparer votre projet",
    "Plan your project"
  ],
  [
    "Trouver votre inspiration",
    "Find your inspiration"
  ],
  [
    "Des projets MIR pour imaginer les matières, les couleurs et les détails de votre maison.",
    "Explore MIR projects to imagine the materials, colours and details of your home."
  ],
  [
    "Voir les réalisations",
    "View our projects"
  ],
  [
    "Choisir vos matériaux",
    "Choose your materials"
  ],
  [
    "Explorez les produits et leurs couleurs. Chaque fiche réunit les options et les informations disponibles.",
    "Explore products and colours. Each product page brings together the available options and details."
  ],
  [
    "Explorer la boutique",
    "Browse the shop"
  ],
  [
    "Préparer votre estimation",
    "Prepare your quote request"
  ],
  [
    "Retrouvez votre sélection dans un même panier, puis transmettez les détails de votre projet.",
    "Review your selection in one cart, then share the details of your project."
  ],
  [
    "Voir mon panier",
    "View my cart"
  ],
  [
    "LES MATÉRIAUX. LES MESURES. LE BON DÉTAIL.",
    "MATERIALS. MEASUREMENTS. THE RIGHT DETAIL."
  ],
  [
    "chantier.",
    "job."
  ],
  [
    "Revêtements, accessoires et pliages sur mesure. Rassemblez vos besoins dans un même panier pour votre demande d’estimation.",
    "Siding, accessories and custom bends. Gather everything you need in one cart for your quote request."
  ],
  [
    "Configurer mes pliages",
    "Configure my bends"
  ],
  [
    "Des pliages à vos mesures",
    "Bends made to your measurements"
  ],
  [
    "Choisissez un profil, indiquez vos dimensions et ajoutez plusieurs pièces à votre panier.",
    "Choose a profile, enter your measurements and add multiple pieces to your cart."
  ],
  [
    "Préparer mes pliages",
    "Prepare my bends"
  ],
  [
    "Tout pour vos finitions",
    "Everything for your finishes"
  ],
  [
    "Retrouvez les matériaux et les accessoires du catalogue, avec les références et les options disponibles.",
    "Find materials and accessories in the catalogue, with the available product references and options."
  ],
  [
    "Trouver mes matériaux",
    "Find my materials"
  ],
  [
    "Votre projet, au même endroit",
    "Your project in one place"
  ],
  [
    "Revoyez les articles, les quantités et les détails avant de demander une estimation.",
    "Review your items, quantities and details before requesting a quote."
  ],
  [
    "Vérifier mon panier",
    "Review my cart"
  ],
  [
    "BESOIN D’UN CONSEIL?",
    "NEED SOME ADVICE?"
  ],
  [
    "Parlons de votre projet.",
    "Let’s talk about your project."
  ],
  [
    "Contacter MIR",
    "Contact MIR"
  ],
  [
    "Une façade qui vous",
    "An exterior that reflects"
  ],
  [
    "Préparez votre",
    "Plan your"
  ],
  [
    "Bois & ingénierie",
    "Wood & engineered wood"
  ],
  [
    "Revêtements métalliques",
    "Metal siding"
  ],
  [
    "Soffites & finitions",
    "Soffit & finishing"
  ],
  [
    "Accessoires & fixations",
    "Accessories & fasteners"
  ],
  [
    "Clins & profils de revêtement",
    "Lap siding & profiles"
  ],
  [
    "Panneaux",
    "Panels"
  ],
  [
    "Bardeaux décoratifs",
    "Decorative shingles"
  ],
  [
    "Contours & bandeaux",
    "Trim & bands"
  ],
  [
    "Retouches",
    "Touch-up products"
  ],
  [
    "Prix sur demande",
    "Price on request"
  ],
  [
    "Prix selon le format",
    "Price varies by size"
  ],
  [
    "Finition :",
    "Finish:"
  ],
  [
    "pièces",
    "pieces"
  ],
  [
    "pi²",
    "sq. ft."
  ],
  [
    "pi lin.",
    "linear ft"
  ],
  [
    "pi linéaires",
    "linear ft"
  ],
  [
    "Revêtement",
    "Siding"
  ],
  [
    "Pose documentée",
    "Documented installation"
  ],
  [
    "Largeur réelle",
    "Actual width"
  ],
  [
    "Largeur physique",
    "Physical width"
  ],
  [
    "Longueur physique",
    "Physical length"
  ],
  [
    "Longueurs référencées",
    "Documented lengths"
  ],
  [
    "Pièces par boîte",
    "Pieces per box"
  ],
  [
    "Unité documentée",
    "Documented unit"
  ],
  [
    "Nuancier à documenter",
    "Colour chart pending"
  ],
  [
    "Sur mesure · à configurer",
    "Custom · configuration required"
  ],
  [
    "Échantillon MIR · rendu écran indicatif",
    "MIR sample · screen colours are indicative"
  ],
  [
    "Visuel fourni par MIR · longueur à sélectionner",
    "Image supplied by MIR · select a length"
  ],
  [
    "Prix MIR publié avant taxes. La disponibilité sera confirmée avec MIR.",
    "Published MIR price before tax. Availability will be confirmed with MIR."
  ],
  [
    "Votre sélection est conservée sur cet appareil. Les quantités, le conditionnement et la couleur seront confirmés avec MIR.",
    "Your selection is saved on this device. Quantities, packaging and colour will be confirmed with MIR."
  ],
  [
    "Le fini est défini par la référence; aucun nuancier de couleur ne s’applique.",
    "The finish is defined by the product reference; no colour chart applies."
  ],
  [
    "Illustration de la couleur choisie. Rendu écran indicatif.",
    "Illustration of the selected colour. Screen colours are indicative."
  ],
  [
    "Essayer ce profil sur le plan ↗",
    "Try this profile on the plan ↗"
  ],
  [
    "Côtés et arrière",
    "Sides and rear"
  ],
  [
    "Bois vertical · Sable",
    "Vertical wood · Sand"
  ],
  [
    "Métal · Sauge",
    "Metal · Sage"
  ],
  [
    "Choisissez la forme. Entrez vos cotes, votre métal et votre couleur. Votre dessin suit vos choix.",
    "Choose a shape. Enter your measurements, metal and colour. Your drawing follows your choices."
  ],
  [
    "Carré",
    "Square"
  ],
  [
    "Triangle à sommet",
    "Peaked triangle"
  ],
  [
    "Trapèze",
    "Trapezoid"
  ],
  [
    "Parallélogramme",
    "Parallelogram"
  ],
  [
    "Côté en pointe",
    "Pointed side"
  ],
  [
    "Modèle sans cotes de fabrication",
    "Model without fabrication dimensions"
  ],
  [
    "A et B comprennent les lips. C est la projection. Les coins sont schématiques; les détails de fabrication seront validés par l’atelier.",
    "A and B include the lips. C is the projection. Corners are schematic; fabrication details will be confirmed by the shop."
  ],
  [
    "Renseignez vos cotes pour voir la pièce.",
    "Enter your measurements to see the piece."
  ],
  [
    "Cote à préciser.",
    "Measurement required."
  ],
  [
    "A et B incluent les lips. Fractions acceptées : 3 1/2 ou 3½.",
    "A and B include the lips. Fractions are accepted: 3 1/2 or 3½."
  ],
  [
    "Projection de la pièce finie",
    "Finished piece projection"
  ],
  [
    "Renseignez les cotes réelles A/B et les lèvres pour connaître la face nette, sans compter les lips.",
    "Enter the actual A/B dimensions and lips to calculate the clear face excluding the lips."
  ],
  [
    "U-P1 : acier 18, 20 ou 22 ga. Choisissez le calibre à confirmer pour votre pièce.",
    "U-P1: 18, 20 or 22 ga steel. Choose the gauge to be confirmed for your piece."
  ],
  [
    "Fabricant / produit de référence",
    "Manufacturer / product reference"
  ],
  [
    "À compléter :",
    "To complete:"
  ],
  [
    "Ma demande sur mesure",
    "My custom request"
  ],
  [
    "Demande à faire valider par MIR",
    "Request to be reviewed by MIR"
  ],
  [
    "Projet et date souhaitée",
    "Project and preferred date"
  ],
  [
    "Référence du projet (facultative)",
    "Project reference (optional)"
  ],
  [
    "Précisions pour MIR",
    "Details for MIR"
  ],
  [
    "La bonne pièce commence ici.",
    "The right piece starts here."
  ],
  [
    "Ajoutez une pièce pour préparer votre demande.",
    "Add a piece to prepare your request."
  ],
  [
    "Préparer ma demande ici",
    "Prepare my request here"
  ],
  [
    "boîte de 12 bobines",
    "box of 12 coils"
  ],
  [
    "Les matériaux par fabricant — MIR",
    "Materials by manufacturer — MIR"
  ],
  [
    "Pour ma maison | Les Revêtements MIR",
    "For my home | Les Revêtements MIR"
  ],
  [
    "Pour mes chantiers | Les Revêtements MIR",
    "For my jobs | Les Revêtements MIR"
  ],
  [
    "Moulures : vendues en longueur de 120 po (10 pi). Cotes des côtés modifiables (fractions acceptées).",
    "Trim: sold in 120 in. (10 ft) lengths. Side measurements can be changed (fractions accepted)."
  ],
  [
    "boîte avant taxes",
    "box before tax"
  ],
  [
    "po²",
    "sq. in."
  ],
  [
    "Nuance à choisir",
    "Select a colour"
  ],
  [
    "Choisir la couleur",
    "Choose a colour"
  ],
  [
    "Fini de la référence",
    "Product finish"
  ],
  [
    "Finition à préciser",
    "Finish to confirm"
  ],
  [
    "Référence à identifier",
    "Product reference to identify"
  ],
  [
    "Commencez par un fabricant. Ses gammes, formats et couleurs restent ensemble.",
    "Start with a manufacturer. Its product lines, sizes and colours stay together."
  ],
  [
    "Aucun filtre actif. Essayez un nom de produit, un fabricant ou un code couleur, par exemple « panneau Hardie » ou « 458-264 ».",
    "No filters selected. Try a product name, manufacturer or colour code, such as “Hardie panel” or “458-264”."
  ],
  [
    "Ne pas associer Dream Collection américaine à une offre canadienne sans validation.",
    "Do not treat the U.S. Dream Collection as a Canadian offering without confirmation."
  ],
  [
    "Aide — Les Revêtements MIR",
    "Help — Les Revêtements MIR"
  ],
  [
    "Retrouvez les réponses sur votre panier, les estimations, les pliages et votre compte MIR. L’aide est accessible sans connexion.",
    "Find answers about your cart, estimates, custom bending and MIR account. No sign-in is required to get help."
  ],
  [
    "Besoin d’aide pour votre compte?",
    "Need help with your account?"
  ],
  [
    "À VOS CÔTÉS",
    "HERE TO HELP"
  ],
  [
    "Des réponses.",
    "Answers."
  ],
  [
    "Tout simplement.",
    "Made simple."
  ],
  [
    "Panier, estimation ou pliage : trouvez les repères utiles pour avancer dans votre projet.",
    "Your cart, estimate or custom bends: find the information you need to move your project forward."
  ],
  [
    "Rechercher dans l’aide",
    "Search help"
  ],
  [
    "Ex. panier, estimation, compte…",
    "E.g. cart, estimate, account…"
  ],
  [
    "Une question précise sur un matériau ou vos dimensions? Les coordonnées de MIR sont à votre disposition.",
    "Have a question about a material or your measurements? Get in touch with MIR."
  ],
  [
    "Questions fréquentes",
    "Frequently asked questions"
  ],
  [
    "Comment demander une estimation?",
    "How do I request an estimate?"
  ],
  [
    "Ouvrez",
    "Open"
  ],
  [
    ", décrivez votre projet et joignez vos photos ou documents. Vous pourrez vérifier le résumé avant l’envoi.",
    ", describe your project and attach your photos or documents. You can review the summary before sending."
  ],
  [
    "Comment retrouver mon panier?",
    "Where can I find my cart?"
  ],
  [
    "Le bouton",
    "The"
  ],
  [
    "dans l’en-tête ouvre votre sélection conservée sur cet appareil. Vous pouvez la consulter sans compte.",
    "button in the header opens the selection saved on this device. You can view it without an account."
  ],
  [
    "Où voir mes commandes?",
    "Where can I see my orders?"
  ],
  [
    "Connectez-vous à",
    "Sign in to"
  ],
  [
    ", puis ouvrez Commandes. Vous y verrez le statut et les mises à jour disponibles.",
    ", then open Orders to view available status updates."
  ],
  [
    "Je n’arrive pas à me connecter. Que faire?",
    "What should I do if I can’t sign in?"
  ],
  [
    "Utilisez Mot de passe oublié sur la page",
    "Select Forgot password in"
  ],
  [
    ". Si le problème continue, communiquez avec MIR depuis la page",
    ". If the problem continues, select"
  ],
  [
    "Comment préparer plusieurs pliages?",
    "How do I prepare several custom bends?"
  ],
  [
    "Dans",
    "In"
  ],
  [
    ", choisissez un profil et renseignez ses mesures, sa finition et sa quantité. Ajoutez vos pièces au panier, puis préparez le pliage suivant. Les dessins cotés restent associés à vos pièces.",
    ", choose a profile and enter its measurements, finish and quantity. Add your pieces to the cart, then prepare the next bend. Dimensioned drawings stay with your pieces."
  ],
  [
    "Le panier confirme-t-il ma commande?",
    "Does my cart confirm an order?"
  ],
  [
    "Votre panier prépare votre demande. MIR confirme les prix, la disponibilité et les modalités avant toute commande. Aucun paiement en ligne n’est demandé à cette étape.",
    "Your cart prepares your request. MIR confirms pricing, availability and terms before any order. No online payment is requested at this stage."
  ],
  [
    "Aucune réponse trouvée. Essayez un autre mot ou communiquez avec MIR.",
    "No answers found. Try another word or contact MIR."
  ],
  [
    "Créer mon compte client",
    "Create my customer account"
  ],
  [
    "← Retour au panier",
    "← Back to cart"
  ],
  [
    "MATÉRIAUX ET PIÈCES SUR MESURE",
    "MATERIALS AND CUSTOM PIECES"
  ],
  [
    "Vérifiez vos articles, vos options et vos quantités.",
    "Review your items, options and quantities."
  ],
  [
    "LA PROCHAINE ÉTAPE",
    "THE NEXT STEP"
  ],
  [
    "Votre projet prend forme.",
    "Your project is taking shape."
  ],
  [
    "Votre sélection accompagne la demande. Aucun paiement à cette étape.",
    "Your selection is included in the request. No payment is taken at this stage."
  ],
  [
    "Nommer le projet et exporter →",
    "Name your project and export →"
  ],
  [
    "Nom du projet et sauvegardes",
    "Project name and backups"
  ],
  [
    "PLIAGES ET PANNEAUX",
    "CUSTOM BENDS AND PANELS"
  ],
  [
    "Vos pièces sur mesure.",
    "Your custom pieces."
  ],
  [
    "Retrouvez vos profils, leurs dimensions et leurs finitions. Vos dessins cotés accompagnent votre demande.",
    "Review your profiles, dimensions and finishes. Your dimensioned drawings are included in your request."
  ],
  [
    "Vos matériaux et pièces sont conservés sur cet appareil. Sans compte connecté, ils ne sont pas synchronisés entre appareils. Une préparation n’est pas une commande.",
    "Your materials and pieces are saved on this device. Without a signed-in account, they are not synced across devices. A prepared selection is not an order."
  ],
  [
    "Envoyer la demande",
    "Send request"
  ],
  [
    "Documents des pièces sur mesure",
    "Custom piece documents"
  ],
  [
    "Les étapes de votre pliage",
    "Your custom bending steps"
  ],
  [
    "Choisissez votre profil",
    "Choose your profile"
  ],
  [
    "Un modèle existant ou votre propre dessin.",
    "An existing model or your own drawing."
  ],
  [
    "Précisez les détails",
    "Specify the details"
  ],
  [
    "Mesures, métal, couleur et quantité.",
    "Measurements, metal, colour and quantity."
  ],
  [
    "Ajoutez au panier",
    "Add to cart"
  ],
  [
    "Réunissez vos pièces pour une estimation.",
    "Bring your pieces together for a quote."
  ],
  [
    "mesures.",
    "measurements."
  ],
  [
    "L’ATELIER MIR",
    "THE MIR WORKSHOP"
  ],
  [
    "L’ATELIER MIR / VOS PIÈCES SUR MESURE",
    "THE MIR WORKSHOP / YOUR CUSTOM PIECES"
  ],
  [
    "Triangle rectangle",
    "Right triangle"
  ],
  [
    "Panneau haut rampant X/12",
    "Sloping-top panel X/12"
  ],
  [
    "✎ Dessiner un panneau libre",
    "✎ Draw a custom panel"
  ],
  [
    "Comme une moulure · 2D/3D synchronisés · sans lip possible.",
    "Like a profile · synchronized 2D/3D · lips are optional."
  ],
  [
    "Aperçu · cotes à saisir",
    "Preview · enter measurements"
  ],
  [
    "Vue de face · lèvres incluses dans A et B",
    "Front view · lips included in A and B"
  ],
  [
    "PROPORTIONS DU MODÈLE · COTES À SAISIR",
    "MODEL PROPORTIONS · ENTER MEASUREMENTS"
  ],
  [
    "A · LARGEUR HORS TOUT",
    "A · OVERALL WIDTH"
  ],
  [
    "B · HAUTEUR HORS TOUT",
    "B · OVERALL HEIGHT"
  ],
  [
    "Largeur hors tout",
    "Overall width"
  ],
  [
    "Hauteur hors tout",
    "Overall height"
  ],
  [
    "Côté du carré",
    "Square side"
  ],
  [
    "Sommet depuis la gauche",
    "Peak position from the left"
  ],
  [
    "Largeur du haut",
    "Top width"
  ],
  [
    "Décalage du haut à gauche",
    "Top offset from the left"
  ],
  [
    "Décalage du haut (+ droite / − gauche)",
    "Top offset (+ right / − left)"
  ],
  [
    "Profondeur de la pointe",
    "Point depth"
  ],
  [
    "Position du sommet sur ce côté",
    "Peak position on this side"
  ],
  [
    "0 · Sans fraction",
    "0 · No fraction"
  ],
  [
    "0 = sans lip",
    "0 = no lip"
  ],
  [
    "Commun · 0 = sans lip",
    "Common · 0 = no lip"
  ],
  [
    "Aucune pente imposée. Les cotes sont prises au chantier.",
    "No preset slope. Measurements are taken on site."
  ],
  [
    "Pente invalide. Entrez 6 ou 6/12.",
    "Invalid pitch. Enter 6 or 6/12."
  ],
  [
    "Entrez la portée horizontale pour calculer la montée.",
    "Enter the horizontal run to calculate the rise."
  ],
  [
    "En bas à gauche",
    "Bottom left"
  ],
  [
    "En bas à droite",
    "Bottom right"
  ],
  [
    "En haut à gauche",
    "Top left"
  ],
  [
    "En haut à droite",
    "Top right"
  ],
  [
    "Ex. 6/12",
    "e.g. 6/12"
  ],
  [
    "Couleur",
    "Colour"
  ],
  [
    "Aller au champ",
    "Go to field"
  ],
  [
    "Personne responsable (facultative)",
    "Contact person (optional)"
  ],
  [
    "Ces renseignements sont repris dans le PDF de votre demande.",
    "These details are included in your request PDF."
  ],
  [
    "PDF de ma demande ↓",
    "My request PDF ↓"
  ],
  [
    "Votre référence",
    "Your reference"
  ],
  [
    "Aluminium extrudé · sur mesure",
    "Custom extruded aluminum"
  ],
  [
    "Aluminium plié · Unico U-P1",
    "Bent aluminum · Unico U-P1"
  ],
  [
    "Acier · Unico U-P1",
    "Steel · Unico U-P1"
  ],
  [
    "A et B incluent les lips. Cotes en millimètres.",
    "A and B include the lips. Measurements in millimetres."
  ],
  [
    "par panneau",
    "per panel"
  ],
  [
    "Corrigez les dimensions des lips.",
    "Correct the lip dimensions."
  ],
  [
    "Complétez votre panneau pour voir son prix.",
    "Complete your panel to see its price."
  ],
  [
    "Le prix sera calculé lorsque la géométrie sera valide.",
    "The price will be calculated once the geometry is valid."
  ],
  [
    "Choisissez les dimensions et une couleur du fabricant.",
    "Choose dimensions and a manufacturer colour."
  ],
  [
    "Surface de la forme hors tout, lips inclus. Projection C non ajoutée. Taxes et livraison non calculées; fini et fabrication à confirmer.",
    "Area of the overall shape, including lips. Projection C is not added. Taxes and delivery are not calculated; finish and fabrication must be confirmed."
  ],
  [
    "Couleurs Unico",
    "Unico colours"
  ],
  [
    "Prêt à ajouter :",
    "Ready to add:"
  ],
  [
    "Géométrie à corriger",
    "Geometry needs correction"
  ],
  [
    "Précisions à compléter",
    "Details to complete"
  ],
  [
    "Renseignée · validation atelier",
    "Completed · shop review required"
  ],
  [
    "Soumission obligatoire · couleur personnalisée",
    "Quote required · custom colour"
  ],
  [
    "Vérifiez les mesures et les angles",
    "Check measurements and angles"
  ],
  [
    "Vérifiez chaque côté et son angle sur le dessin.",
    "Check each side and its angle on the drawing."
  ],
  [
    "Choisissez la face colorée",
    "Choose the painted face"
  ],
  [
    "Suivez le tracé de A vers le dernier côté. Choisissez de quel côté du trait se trouve la face à peindre.",
    "Follow the outline from A to the last side. Choose which side of the line will be painted."
  ],
  [
    "Choisissez le matériau et la couleur",
    "Choose material and colour"
  ],
  [
    "Sélectionnez le matériau, puis la teinte. Vous pourrez ensuite ajouter la pièce à votre dossier.",
    "Select the material, then the colour. You can then add the piece to your request."
  ],
  [
    "Modifier le tracé",
    "Edit outline"
  ],
  [
    "Longueur de vente MIR",
    "MIR stock length"
  ],
  [
    "LONGUEUR À VÉRIFIER",
    "CHECK THE LENGTH"
  ],
  [
    "Longueur fixe : 10 pi pour les moulures; 12 pi uniquement pour le J à soffite. Les cotes des côtés restent personnalisables.",
    "Fixed length: 10 ft for profiles; 12 ft for soffit J-channel only. Side measurements remain customizable."
  ],
  [
    "Bas",
    "Bottom"
  ],
  [
    "1 · Bas",
    "1 · Bottom"
  ],
  [
    "2 · Bas",
    "2 · Bottom"
  ],
  [
    "3 · Bas",
    "3 · Bottom"
  ],
  [
    "4 · Bas",
    "4 · Bottom"
  ],
  [
    "5 · Bas",
    "5 · Bottom"
  ],
  [
    "Lip du côté Bas",
    "Bottom lip"
  ],
  [
    "Supprimer le lip du côté Bas",
    "Remove bottom lip"
  ],
  [
    "Modifier Bas",
    "Edit bottom"
  ],
  [
    "Choisir la fraction pour Lip du côté Bas",
    "Select fraction for bottom lip"
  ],
  [
    "Base",
    "Base"
  ],
  [
    "1 · Base",
    "1 · Base"
  ],
  [
    "2 · Base",
    "2 · Base"
  ],
  [
    "3 · Base",
    "3 · Base"
  ],
  [
    "4 · Base",
    "4 · Base"
  ],
  [
    "5 · Base",
    "5 · Base"
  ],
  [
    "Lip du côté Base",
    "Base lip"
  ],
  [
    "Supprimer le lip du côté Base",
    "Remove base lip"
  ],
  [
    "Modifier Base",
    "Edit base"
  ],
  [
    "Choisir la fraction pour Lip du côté Base",
    "Select fraction for base lip"
  ],
  [
    "Droite",
    "Right"
  ],
  [
    "1 · Droite",
    "1 · Right"
  ],
  [
    "2 · Droite",
    "2 · Right"
  ],
  [
    "3 · Droite",
    "3 · Right"
  ],
  [
    "4 · Droite",
    "4 · Right"
  ],
  [
    "5 · Droite",
    "5 · Right"
  ],
  [
    "Lip du côté Droite",
    "Right lip"
  ],
  [
    "Supprimer le lip du côté Droite",
    "Remove right lip"
  ],
  [
    "Modifier Droite",
    "Edit right"
  ],
  [
    "Choisir la fraction pour Lip du côté Droite",
    "Select fraction for right lip"
  ],
  [
    "Haut",
    "Top"
  ],
  [
    "1 · Haut",
    "1 · Top"
  ],
  [
    "2 · Haut",
    "2 · Top"
  ],
  [
    "3 · Haut",
    "3 · Top"
  ],
  [
    "4 · Haut",
    "4 · Top"
  ],
  [
    "5 · Haut",
    "5 · Top"
  ],
  [
    "Lip du côté Haut",
    "Top lip"
  ],
  [
    "Supprimer le lip du côté Haut",
    "Remove top lip"
  ],
  [
    "Modifier Haut",
    "Edit top"
  ],
  [
    "Choisir la fraction pour Lip du côté Haut",
    "Select fraction for top lip"
  ],
  [
    "Gauche",
    "Left"
  ],
  [
    "1 · Gauche",
    "1 · Left"
  ],
  [
    "2 · Gauche",
    "2 · Left"
  ],
  [
    "3 · Gauche",
    "3 · Left"
  ],
  [
    "4 · Gauche",
    "4 · Left"
  ],
  [
    "5 · Gauche",
    "5 · Left"
  ],
  [
    "Lip du côté Gauche",
    "Left lip"
  ],
  [
    "Supprimer le lip du côté Gauche",
    "Remove left lip"
  ],
  [
    "Modifier Gauche",
    "Edit left"
  ],
  [
    "Choisir la fraction pour Lip du côté Gauche",
    "Select fraction for left lip"
  ],
  [
    "Côté droit",
    "Right side"
  ],
  [
    "1 · Côté droit",
    "1 · Right side"
  ],
  [
    "2 · Côté droit",
    "2 · Right side"
  ],
  [
    "3 · Côté droit",
    "3 · Right side"
  ],
  [
    "4 · Côté droit",
    "4 · Right side"
  ],
  [
    "5 · Côté droit",
    "5 · Right side"
  ],
  [
    "Lip du côté Côté droit",
    "Right side lip"
  ],
  [
    "Supprimer le lip du côté Côté droit",
    "Remove right side lip"
  ],
  [
    "Modifier Côté droit",
    "Edit right side"
  ],
  [
    "Choisir la fraction pour Lip du côté Côté droit",
    "Select fraction for right side lip"
  ],
  [
    "Côté gauche",
    "Left side"
  ],
  [
    "1 · Côté gauche",
    "1 · Left side"
  ],
  [
    "2 · Côté gauche",
    "2 · Left side"
  ],
  [
    "3 · Côté gauche",
    "3 · Left side"
  ],
  [
    "4 · Côté gauche",
    "4 · Left side"
  ],
  [
    "5 · Côté gauche",
    "5 · Left side"
  ],
  [
    "Lip du côté Côté gauche",
    "Left side lip"
  ],
  [
    "Supprimer le lip du côté Côté gauche",
    "Remove left side lip"
  ],
  [
    "Modifier Côté gauche",
    "Edit left side"
  ],
  [
    "Choisir la fraction pour Lip du côté Côté gauche",
    "Select fraction for left side lip"
  ],
  [
    "Pente",
    "Slope"
  ],
  [
    "1 · Pente",
    "1 · Slope"
  ],
  [
    "2 · Pente",
    "2 · Slope"
  ],
  [
    "3 · Pente",
    "3 · Slope"
  ],
  [
    "4 · Pente",
    "4 · Slope"
  ],
  [
    "5 · Pente",
    "5 · Slope"
  ],
  [
    "Lip du côté Pente",
    "Slope lip"
  ],
  [
    "Supprimer le lip du côté Pente",
    "Remove slope lip"
  ],
  [
    "Modifier Pente",
    "Edit slope"
  ],
  [
    "Choisir la fraction pour Lip du côté Pente",
    "Select fraction for slope lip"
  ],
  [
    "Pente droite",
    "Right slope"
  ],
  [
    "1 · Pente droite",
    "1 · Right slope"
  ],
  [
    "2 · Pente droite",
    "2 · Right slope"
  ],
  [
    "3 · Pente droite",
    "3 · Right slope"
  ],
  [
    "4 · Pente droite",
    "4 · Right slope"
  ],
  [
    "5 · Pente droite",
    "5 · Right slope"
  ],
  [
    "Lip du côté Pente droite",
    "Right slope lip"
  ],
  [
    "Supprimer le lip du côté Pente droite",
    "Remove right slope lip"
  ],
  [
    "Modifier Pente droite",
    "Edit right slope"
  ],
  [
    "Choisir la fraction pour Lip du côté Pente droite",
    "Select fraction for right slope lip"
  ],
  [
    "Pente gauche",
    "Left slope"
  ],
  [
    "1 · Pente gauche",
    "1 · Left slope"
  ],
  [
    "2 · Pente gauche",
    "2 · Left slope"
  ],
  [
    "3 · Pente gauche",
    "3 · Left slope"
  ],
  [
    "4 · Pente gauche",
    "4 · Left slope"
  ],
  [
    "5 · Pente gauche",
    "5 · Left slope"
  ],
  [
    "Lip du côté Pente gauche",
    "Left slope lip"
  ],
  [
    "Supprimer le lip du côté Pente gauche",
    "Remove left slope lip"
  ],
  [
    "Modifier Pente gauche",
    "Edit left slope"
  ],
  [
    "Choisir la fraction pour Lip du côté Pente gauche",
    "Select fraction for left slope lip"
  ],
  [
    "Pente du toit",
    "Roof slope"
  ],
  [
    "1 · Pente du toit",
    "1 · Roof slope"
  ],
  [
    "2 · Pente du toit",
    "2 · Roof slope"
  ],
  [
    "3 · Pente du toit",
    "3 · Roof slope"
  ],
  [
    "4 · Pente du toit",
    "4 · Roof slope"
  ],
  [
    "5 · Pente du toit",
    "5 · Roof slope"
  ],
  [
    "Lip du côté Pente du toit",
    "Roof slope lip"
  ],
  [
    "Supprimer le lip du côté Pente du toit",
    "Remove roof slope lip"
  ],
  [
    "Modifier Pente du toit",
    "Edit roof slope"
  ],
  [
    "Choisir la fraction pour Lip du côté Pente du toit",
    "Select fraction for roof slope lip"
  ],
  [
    "A — Largeur hors tout",
    "A — Overall width"
  ],
  [
    "Modifier A — Largeur hors tout",
    "Edit A — Overall width"
  ],
  [
    "Choisir la fraction pour A — Largeur hors tout",
    "Select fraction for A — Overall width"
  ],
  [
    "B — Hauteur hors tout",
    "B — Overall height"
  ],
  [
    "Modifier B — Hauteur hors tout",
    "Edit B — Overall height"
  ],
  [
    "Choisir la fraction pour B — Hauteur hors tout",
    "Select fraction for B — Overall height"
  ],
  [
    "C — Projection",
    "C — Projection"
  ],
  [
    "Modifier C — Projection",
    "Edit C — Projection"
  ],
  [
    "Choisir la fraction pour C — Projection",
    "Select fraction for C — Projection"
  ],
  [
    "C — Projection de la pièce finie",
    "C — Finished piece projection"
  ],
  [
    "Modifier C — Projection de la pièce finie",
    "Edit C — Finished piece projection"
  ],
  [
    "Choisir la fraction pour C — Projection de la pièce finie",
    "Select fraction for C — Finished piece projection"
  ],
  [
    "A — Côté du carré",
    "A — Square side"
  ],
  [
    "Modifier A — Côté du carré",
    "Edit A — Square side"
  ],
  [
    "Choisir la fraction pour A — Côté du carré",
    "Select fraction for A — Square side"
  ],
  [
    "S — Sommet depuis la gauche",
    "S — Peak position from the left"
  ],
  [
    "Modifier S — Sommet depuis la gauche",
    "Edit S — Peak position from the left"
  ],
  [
    "Choisir la fraction pour S — Sommet depuis la gauche",
    "Select fraction for S — Peak position from the left"
  ],
  [
    "D — Largeur du haut",
    "D — Top width"
  ],
  [
    "Modifier D — Largeur du haut",
    "Edit D — Top width"
  ],
  [
    "Choisir la fraction pour D — Largeur du haut",
    "Select fraction for D — Top width"
  ],
  [
    "E — Décalage du haut à gauche",
    "E — Top offset from the left"
  ],
  [
    "Modifier E — Décalage du haut à gauche",
    "Edit E — Top offset from the left"
  ],
  [
    "Choisir la fraction pour E — Décalage du haut à gauche",
    "Select fraction for E — Top offset from the left"
  ],
  [
    "D — Décalage du haut (+ droite / − gauche)",
    "D — Top offset (+ right / − left)"
  ],
  [
    "Modifier D — Décalage du haut (+ droite / − gauche)",
    "Edit D — Top offset (+ right / − left)"
  ],
  [
    "Choisir la fraction pour D — Décalage du haut (+ droite / − gauche)",
    "Select fraction for D — Top offset (+ right / − left)"
  ],
  [
    "D — Profondeur de la pointe",
    "D — Point depth"
  ],
  [
    "Modifier D — Profondeur de la pointe",
    "Edit D — Point depth"
  ],
  [
    "Choisir la fraction pour D — Profondeur de la pointe",
    "Select fraction for D — Point depth"
  ],
  [
    "E — Position du sommet sur ce côté",
    "E — Peak position on this side"
  ],
  [
    "Modifier E — Position du sommet sur ce côté",
    "Edit E — Peak position on this side"
  ],
  [
    "Choisir la fraction pour E — Position du sommet sur ce côté",
    "Select fraction for E — Peak position on this side"
  ],
  [
    "Lip commun à tous les côtés",
    "Common lip for all sides"
  ],
  [
    "Modifier Lip commun à tous les côtés",
    "Edit Common lip for all sides"
  ],
  [
    "Choisir la fraction pour Lip commun à tous les côtés",
    "Select fraction for Common lip for all sides"
  ],
  [
    "A · À saisir",
    "A · Enter value"
  ],
  [
    "B · À saisir",
    "B · Enter value"
  ],
  [
    "C · À saisir",
    "C · Enter value"
  ],
  [
    "Rectangle — vue cotée, lips compris",
    "Rectangle — dimensioned view, including lips"
  ],
  [
    "Rectangle — volume opaque; lips inclus dans le hors tout",
    "Rectangle — opaque volume; lips included in overall dimensions"
  ],
  [
    "Rectangle — dimensions hors tout avec lèvres",
    "Rectangle — overall dimensions including lips"
  ],
  [
    "Carré — vue cotée, lips compris",
    "Square — dimensioned view, including lips"
  ],
  [
    "Carré — volume opaque; lips inclus dans le hors tout",
    "Square — opaque volume; lips included in overall dimensions"
  ],
  [
    "Carré — dimensions hors tout avec lèvres",
    "Square — overall dimensions including lips"
  ],
  [
    "Triangle rectangle — vue cotée, lips compris",
    "Right triangle — dimensioned view, including lips"
  ],
  [
    "Triangle rectangle — volume opaque; lips inclus dans le hors tout",
    "Right triangle — opaque volume; lips included in overall dimensions"
  ],
  [
    "Triangle rectangle — dimensions hors tout avec lèvres",
    "Right triangle — overall dimensions including lips"
  ],
  [
    "Triangle à sommet — vue cotée, lips compris",
    "Peaked triangle — dimensioned view, including lips"
  ],
  [
    "Triangle à sommet — volume opaque; lips inclus dans le hors tout",
    "Peaked triangle — opaque volume; lips included in overall dimensions"
  ],
  [
    "Triangle à sommet — dimensions hors tout avec lèvres",
    "Peaked triangle — overall dimensions including lips"
  ],
  [
    "Panneau haut rampant X/12 — vue cotée, lips compris",
    "Sloping-top panel X/12 — dimensioned view, including lips"
  ],
  [
    "Panneau haut rampant X/12 — volume opaque; lips inclus dans le hors tout",
    "Sloping-top panel X/12 — opaque volume; lips included in overall dimensions"
  ],
  [
    "Panneau haut rampant X/12 — dimensions hors tout avec lèvres",
    "Sloping-top panel X/12 — overall dimensions including lips"
  ],
  [
    "Trapèze — vue cotée, lips compris",
    "Trapezoid — dimensioned view, including lips"
  ],
  [
    "Trapèze — volume opaque; lips inclus dans le hors tout",
    "Trapezoid — opaque volume; lips included in overall dimensions"
  ],
  [
    "Trapèze — dimensions hors tout avec lèvres",
    "Trapezoid — overall dimensions including lips"
  ],
  [
    "Parallélogramme — vue cotée, lips compris",
    "Parallelogram — dimensioned view, including lips"
  ],
  [
    "Parallélogramme — volume opaque; lips inclus dans le hors tout",
    "Parallelogram — opaque volume; lips included in overall dimensions"
  ],
  [
    "Parallélogramme — dimensions hors tout avec lèvres",
    "Parallelogram — overall dimensions including lips"
  ],
  [
    "Côté en pointe — vue cotée, lips compris",
    "Pointed side — dimensioned view, including lips"
  ],
  [
    "Côté en pointe — volume opaque; lips inclus dans le hors tout",
    "Pointed side — opaque volume; lips included in overall dimensions"
  ],
  [
    "Côté en pointe — dimensions hors tout avec lèvres",
    "Pointed side — overall dimensions including lips"
  ],
  [
    "GLISSEZ POUR TOURNER LA PIÈCE",
    "DRAG TO ROTATE THE PIECE"
  ],
  [
    "Hors tout, lèvres comprises",
    "Overall, including lips"
  ],
  [
    "Hors tout de fabrication",
    "Overall fabrication dimensions"
  ],
  [
    "Quantité entière à préciser.",
    "Enter a whole-number quantity."
  ],
  [
    "Tracé enregistré sur cet appareil",
    "Outline saved on this device"
  ],
  [
    "Dossier enregistré sur cet appareil",
    "Request saved on this device"
  ],
  [
    "Choisir le matériau",
    "Choose material"
  ],
  [
    "Choisissez un matériau.",
    "Choose a material."
  ],
  [
    "Marque",
    "Brand"
  ],
  [
    "Suivant",
    "Next"
  ],
  [
    "Retour",
    "Back"
  ],
  [
    "Angle (°)",
    "Angle (°)"
  ],
  [
    "Orange = côté replié",
    "Orange = folded side"
  ],
  [
    "Choix 1 · Gauche",
    "Choice 1 · Left"
  ],
  [
    "Choix 2 · Droite",
    "Choice 2 · Right"
  ],
  [
    "Indiquez le côté coloré, gauche ou droit en suivant A vers les segments suivants.",
    "Indicate the painted side, left or right, following A towards the next segments."
  ],
  [
    "ÉTAPE 1 SUR 4",
    "STEP 1 OF 4"
  ],
  [
    "ÉTAPE 2 SUR 4",
    "STEP 2 OF 4"
  ],
  [
    "ÉTAPE 3 SUR 4",
    "STEP 3 OF 4"
  ],
  [
    "ÉTAPE 4 SUR 4",
    "STEP 4 OF 4"
  ],
  [
    "Vérifiez chaque côté et son angle sur le dessin. Longueur vendue : 10 pi.",
    "Check each side and its angle on the drawing. Stock length: 10 ft."
  ],
  [
    "Vérifiez chaque côté et son angle sur le dessin. Longueur vendue : 12 pi.",
    "Check each side and its angle on the drawing. Stock length: 12 ft."
  ],
  [
    "Détail utile à la fabrication...",
    "Useful fabrication detail..."
  ]
]);
entries.push(['Aperçu de teinte','Colour preview'],['Couleur choisie','Selected colour'],['Pot de retouche MIR · teinte indicative','MIR touch-up paint · indicative colour']);
// Customer colour selection and catalogue availability messages. These labels
// translate presentation only; manufacturer names, IDs and stored units stay intact.
entries.push(
  ['Couleurs opaques','Solid colours'],
  ['Couleurs deux tons','Two-tone colours'],
  ['Anciennes couleurs de retouche','Legacy touch-up colours'],
  ['Photo du contenant · teinte non représentée','Container photo · selected colour not shown'],
  ['Consulter la teinte chez le fabricant','View this colour on the manufacturer’s website'],
  ['Article retiré du catalogue · à retirer du panier.','Item removed from the catalogue · remove it from your cart.'],
  ['Un article a été retiré du catalogue. Retirez-le du panier avant de demander une estimation.','An item has been removed from the catalogue. Remove it from your cart before requesting an estimate.'],
  ['Retirer du panier','Remove from cart'],
  ['La disponibilité des articles ne peut pas être vérifiée. Réessayez dans un instant.','Item availability could not be verified. Please try again in a moment.'],
  ['La disponibilité des articles est invalide.','Item availability information is invalid.'],
  ['Le catalogue ne peut pas être chargé. Réessayez dans un instant.','The catalogue could not be loaded. Please try again in a moment.'],
  ['Le nuancier ne peut pas être chargé. Réessayez dans un instant.','The colour chart could not be loaded. Please try again in a moment.']
);
const clientPreviewNotes = [
  ['Détail du bardage à clin St-Laurent, recadré dans la photo de pose fabricant. Dimensions non représentées.','Detail of St-Laurent lap siding, cropped from the manufacturer’s installation photo. Dimensions are not shown.'],
  ['Détail du profil V-Groove St-Laurent, recadré dans la photo de pose fabricant. Dimensions non représentées.','Detail of the St-Laurent V-Groove profile, cropped from the manufacturer’s installation photo. Dimensions are not shown.'],
  ['Détail Board & Batten St-Laurent, recadré dans la photo de pose fabricant. Dimensions non représentées.','St-Laurent Board & Batten detail, cropped from the manufacturer’s installation photo. Dimensions are not shown.'],
  ['Échantillon du composant HardiePanel lisse. Les couvre-joints et l’assemblage Board & Batten ne sont pas représentés.','Sample of the smooth HardiePanel component. Battens and the assembled Board & Batten system are not shown.'],
  ['Le même échantillon, le même cadrage, le même grain et les mêmes ombres sont conservés pour chaque couleur. Teinte écran indicative.','The same sample, framing, grain and shadows are retained for every colour. Screen colours are indicative.'],
  ['Le même échantillon, le même fond et le même grain sont conservés pour chaque couleur.','The same sample, background and grain are retained for every colour.']
];
for (const [source,target] of clientPreviewNotes) {
  entries.push([source,target]);
  entries.push(['Illustration de la couleur choisie. Rendu écran indicatif. '+source,'Illustration of the selected colour. Screen colours are indicative. '+target]);
}
const clientAvailabilityNotes = [
  ['Format Canada Est non listé au tableau Québec 06/2025; combinaison profil/couleur à confirmer.','Eastern Canada size not listed in the Québec June 2025 chart; confirm the profile and colour combination.'],
  ['Clin lisse documenté Canada Est; profil et couleur à confirmer au Québec.','Smooth lap siding documented for Eastern Canada; confirm the profile and colour in Québec.'],
  ['Canada Est : les rives décalées ne sont pas listées au tableau Québec 06/2025.','Eastern Canada: staggered-edge shingles are not listed in the Québec June 2025 chart.'],
  ['Teinte du nuancier fibrociment St-Laurent. Compatibilité avec le profil et le fini, disponibilité et délai à confirmer avec MIR.','Colour from the St-Laurent fibre cement chart. Confirm compatibility with the profile and finish, availability and lead time with MIR.'],
  ['Retouche assortie à une teinte CanExel actuelle. Format et disponibilité MIR à confirmer.','Touch-up paint matching a current CanExel colour. Confirm size and availability with MIR.'],
  ['Ancienne teinte CanExel répertoriée pour la retouche. Correspondance et disponibilité MIR à confirmer.','Legacy CanExel colour listed for touch-ups. Confirm the colour match and availability with MIR.'],
  ['Aperçu de la teinte indisponible. Faites confirmer la correspondance avec un échantillon.','Colour preview unavailable. Confirm the match with a physical sample.']
];
entries.push(...clientAvailabilityNotes);
const clientTextureNote=['Échantillon couleur de la brochure; son grain ne certifie pas la texture du profil sélectionné. Les finis lisse et Cedarmill restent distincts.','Colour sample from the brochure; its grain does not establish the selected profile’s texture. Smooth and Cedarmill finishes remain distinct.'];
entries.push(clientTextureNote);
// The colour note is emitted as one text node. Cover its exact known combinations
// instead of translating colour names or rewriting arbitrary catalogue content.
for (const [source,target] of clientAvailabilityNotes.slice(0,3)) {
  entries.push([source+' '+clientTextureNote[0],target+' '+clientTextureNote[1]]);
  entries.push([source+' Le fini lisse reste lisse; la photo originale du profil est accessible à gauche.',target+' The smooth finish stays smooth; the original profile photo is available on the left.']);
}
entries.push([
  clientAvailabilityNotes[5][0]+' '+clientAvailabilityNotes[6][0],
  clientAvailabilityNotes[5][1]+' '+clientAvailabilityNotes[6][1]
]);
entries.push(
  ['Rechercher une couleur par nom ou code','Search colours by name or code'],
  ['Couleur :','Colour:'],
  ['paquets','packs'],
  ['Contenants par boîte','Containers per box'],
  ['Retouche','Touch-up'],
  ['Horizontale','Horizontal'],
  ['Verticale','Vertical'],
  ['Photo du profil et sources','Profile photo and sources'],
  ['Page fabricant →','Manufacturer page →'],
  ['Consultez les prescriptions et la version du fabricant.','Check the manufacturer’s requirements and document version.'],
  ['16 teintes actuelles et 4 anciennes références de retouche. Compatibilité et disponibilité à confirmer avec MIR.','16 current colours and 4 legacy touch-up references. Confirm compatibility and availability with MIR.'],
  ['Collection Statement documentée pour le Québec. Le fini du profil et la disponibilité MIR restent à confirmer.','Statement Collection documented for Québec. Confirm the profile finish and availability with MIR.'],
  ['Nuancier fabricant actuel. Disponibilité, délai et offre MIR à confirmer.','Current manufacturer colour palette. Confirm availability, lead time and the MIR offering.'],
  ['Nuancier fibrociment St-Laurent. Compatibilité de la teinte avec le profil et le fini à confirmer.','St-Laurent fibre cement colour palette. Confirm colour compatibility with the profile and finish.'],
  ['CanExel — Anciennes teintes de retouche','CanExel — Legacy touch-up colours'],
  ['Pot CanExel · tache de peinture sèche, teinte indicative','CanExel container · dried paint sample, indicative colour'],
  ['Photo du produit · teinte au nuancier','Product photo · colour shown in the chart'],
  ['Photo du produit. L’échantillon de teinte est dans le nuancier.','Product photo. The colour sample is in the colour chart.']
);
for (const name of ['Acadia','Barista','Blanc','Bleu minuit','Bois de grange','Bois de Santal','Charbon','Falaise','Granit','Gris brume','Loup gris','Moka foncé','Noir','Renard roux','Rouge campagne','Sable','Scandinave','Sierra','Toundra','Yellowstone']) {
  entries.push(['Photo de retouche MIR · '+name+' · touche de peinture sèche sur le couvercle. Rendu écran indicatif.','MIR touch-up paint photo · '+name+' · dried paint sample on the lid. Screen colours are indicative.']);
  entries.push(['Pot CanExel · '+name+' · couleur du couvercle indicative.','CanExel container · '+name+' · lid colour is indicative.']);
}
// Cutting tools: display translations do not mutate variant IDs or stored units.
entries.push(...[
  [
    "Outil de coupe",
    "Cutting tool"
  ],
  [
    "Outil de coupe, Accessoire",
    "Cutting tool, Accessory"
  ],
  [
    "DEWALT ELITE — Scie-cloche bimétal",
    "DEWALT ELITE — Bi-metal hole saw"
  ],
  [
    "Choisissez parmi 15 diamètres documentés de 2 à 5 po. Scie-cloche DEWALT ELITE bimétal pour bois et métal mince. Prix et disponibilité au Canada à confirmer avec MIR.",
    "Choose from 15 documented diameters from 2 to 5 in. DEWALT ELITE bi-metal hole saw for wood and thin metal. Confirm Canadian availability and pricing with MIR."
  ],
  [
    "LEILUO — Lame oscillante HCS bois et plastique · 44 mm",
    "LEILUO — HCS oscillating blade for wood and plastic · 44 mm"
  ],
  [
    "Lame pour outil oscillant en acier HCS, largeur de coupe de 44 mm, pour bois et plastique. Fixation et compatibilité avec votre outil à confirmer avant utilisation.",
    "HCS steel oscillating-tool blade with a 44 mm cutting width, for wood and plastic. Confirm the mount and compatibility with your tool before use."
  ],
  [
    "Diamètre",
    "Diameter"
  ],
  [
    "Choisir le diamètre",
    "Choose a diameter"
  ],
  [
    "Diamètres proposés",
    "Available diameters"
  ],
  [
    "Diamètre à confirmer",
    "Diameter to confirm"
  ],
  [
    "Diamètres : 2 à 5 po",
    "Diameters: 2 to 5 in."
  ],
  [
    "Choisissez le diamètre avant de saisir la quantité.",
    "Choose a diameter before entering a quantity."
  ],
  [
    "Le diamètre de cet article doit être choisi.",
    "Choose a diameter for this item."
  ],
  [
    "Porte-scie",
    "Arbor"
  ],
  [
    "Porte-scie compatible requis. Inclusion et compatibilité à confirmer selon le diamètre.",
    "A compatible arbor is required. Confirm inclusion and compatibility for the selected diameter."
  ],
  [
    "Références fabricant documentées; offre et délai MIR à confirmer.",
    "Documented manufacturer references; confirm MIR availability and lead time."
  ],
  [
    "Acier",
    "Steel"
  ],
  [
    "HCS — acier à haute teneur en carbone",
    "HCS — high-carbon steel"
  ],
  [
    "Matériaux à couper",
    "Cutting materials"
  ],
  [
    "Bois et plastique",
    "Wood and plastic"
  ],
  [
    "Compatibilité à confirmer avec votre outil oscillant.",
    "Confirm compatibility with your oscillating tool."
  ],
  [
    "Photo originale du produit à intégrer.",
    "Original product photo to be added."
  ],
  [
    "Prix, stock MIR et conditionnement à confirmer.",
    "Confirm MIR pricing, stock and packaging."
  ],
  [
    "Référence unitaire, fixation et conditionnement à confirmer.",
    "Confirm the individual reference, mount and packaging."
  ],
  [
    "Diamètre pour DEWALT ELITE — Scie-cloche bimétal",
    "Diameter for DEWALT ELITE — Bi-metal hole saw"
  ],
  [
    "Quantité pour DEWALT ELITE — Scie-cloche bimétal",
    "Quantity for DEWALT ELITE — Bi-metal hole saw"
  ],
  [
    "Retirer DEWALT ELITE — Scie-cloche bimétal",
    "Remove DEWALT ELITE — Bi-metal hole saw"
  ],
  [
    "Diamètre pour LEILUO — Lame oscillante HCS bois et plastique · 44 mm",
    "Diameter for LEILUO — HCS oscillating blade for wood and plastic · 44 mm"
  ],
  [
    "Quantité pour LEILUO — Lame oscillante HCS bois et plastique · 44 mm",
    "Quantity for LEILUO — HCS oscillating blade for wood and plastic · 44 mm"
  ],
  [
    "Retirer LEILUO — Lame oscillante HCS bois et plastique · 44 mm",
    "Remove LEILUO — HCS oscillating blade for wood and plastic · 44 mm"
  ]
]);
entries.push(...[
  [
    "Quantités entières. 2 po (51 mm).",
    "Whole quantities. 2 in. (51 mm)."
  ],
  [
    "Quantités entières. 2 1/8 po (54 mm).",
    "Whole quantities. 2 1/8 in. (54 mm)."
  ],
  [
    "Quantités entières. 2 1/4 po (57 mm).",
    "Whole quantities. 2 1/4 in. (57 mm)."
  ],
  [
    "Quantités entières. 2 1/2 po (64 mm).",
    "Whole quantities. 2 1/2 in. (64 mm)."
  ],
  [
    "Quantités entières. 2 5/8 po (67 mm).",
    "Whole quantities. 2 5/8 in. (67 mm)."
  ],
  [
    "Quantités entières. 2 3/4 po (70 mm).",
    "Whole quantities. 2 3/4 in. (70 mm)."
  ],
  [
    "Quantités entières. 3 po (76 mm).",
    "Whole quantities. 3 in. (76 mm)."
  ],
  [
    "Quantités entières. 3 1/4 po (83 mm).",
    "Whole quantities. 3 1/4 in. (83 mm)."
  ],
  [
    "Quantités entières. 3 1/2 po (89 mm).",
    "Whole quantities. 3 1/2 in. (89 mm)."
  ],
  [
    "Quantités entières. 3 5/8 po (92 mm).",
    "Whole quantities. 3 5/8 in. (92 mm)."
  ],
  [
    "Quantités entières. 4 po (102 mm).",
    "Whole quantities. 4 in. (102 mm)."
  ],
  [
    "Quantités entières. 4 1/8 po (105 mm).",
    "Whole quantities. 4 1/8 in. (105 mm)."
  ],
  [
    "Quantités entières. 4 1/4 po (108 mm).",
    "Whole quantities. 4 1/4 in. (108 mm)."
  ],
  [
    "Quantités entières. 4 1/2 po (114 mm).",
    "Whole quantities. 4 1/2 in. (114 mm)."
  ],
  [
    "Quantités entières. 5 po (127 mm).",
    "Whole quantities. 5 in. (127 mm)."
  ],
  [
    "Quantités entières. pièce.",
    "Whole quantities. piece."
  ]
]);
entries.push(['Sans option de couleur','No colour option']);

// Pliage and specimen review — 2026-11-17.
entries.push(...[
  [
    "Nombre de pièces",
    "Number of pieces"
  ],
  [
    "Choisissez un matériau",
    "Choose a material"
  ],
  [
    "Choisissez une couleur.",
    "Choose a colour."
  ],
  [
    "Choisissez d’abord le matériau.",
    "Choose the material first."
  ],
  [
    "Les couleurs disponibles s’afficheront après le choix du matériau.",
    "Available colours will appear after you choose a material."
  ],
  [
    "Aucune couleur vérifiée n’est disponible pour cette référence. Consultez MIR avant de continuer.",
    "No verified colour is available for this product. Contact MIR before continuing."
  ],
  [
    "Vérifier cette pièce",
    "Review this piece"
  ],
  [
    "Vous pourrez vérifier la pièce, puis l’ajouter au panier.",
    "You can review the piece, then add it to your cart."
  ],
  [
    "La sauvegarde locale est indisponible. Gardez cette page ouverte pour conserver vos mesures.",
    "Local saving is unavailable. Keep this page open to retain your measurements."
  ],
  [
    "Détail du bois Äkta antiqué, issu de la photo plane officielle Gris antique. Même grain et même cadrage pour chaque teinte. Dimensions non représentées.",
    "Detail of antique-finish Äkta wood from the official flat Gris antique photograph. The same grain and framing are retained for every colour. Dimensions are not represented."
  ],
  [
    "Détail du bardage Bosco, recadré dans la photo de pose officielle Rialux, sans le dessin superposé. Même grain et même cadrage pour chaque teinte. Dimensions non représentées.",
    "Detail of Bosco siding cropped from the official Rialux installation photograph, excluding the overlaid drawing. The same grain and framing are retained for every colour. Dimensions are not represented."
  ],
  [
    "Détail de la texture fabricant Bluhouss 307, recadré dans son aperçu. Perspective et dimensions non représentatives.",
    "Detail of the manufacturer’s Bluhouss 307 texture, cropped from its preview. Perspective and dimensions are not representative."
  ],
  [
    "Aperçu fabricant original",
    "Original manufacturer preview"
  ],
  [
    "Matériau, couleur et quantité",
    "Material, colour and quantity"
  ],
  [
    "Choisis le matériau, la couleur et la quantité de pièces.",
    "Choose the material, colour and number of pieces."
  ],
  [
    "Voir mon panier",
    "View my cart"
  ]
]);
entries.push(...[
  [
    "Choisissez le matériau, la couleur et la quantité",
    "Choose the material, colour and quantity"
  ],
  [
    "Renseignez ces trois choix avant d’ajouter la pièce au panier.",
    "Complete these three choices before adding the piece to your cart."
  ],
  [
    "Il reste dans votre panier pendant la suite du parcours.",
    "It stays in your cart as you continue."
  ],
  [
    "ajouté au panier.",
    "added to your cart."
  ]
]);
entries.push(["Voir l’aperçu fabricant original","View the original manufacturer preview"]);
// Complete touch-up palettes and shared fibre-cement colour specimens.
const touchUpPaletteNotes = [
  ['Échantillon de teinte','Colour sample'],
  ['Photo du contenant','Container photo'],
  ['Teinte non représentée','Selected colour not shown'],
  ['Teinte ColorPlus du nuancier Québec. Référence du kit et disponibilité MIR à confirmer.','ColorPlus colour from the Québec palette. Confirm the kit reference and availability with MIR.'],
  ['19 teintes Statement Québec pour la retouche. Référence locale du kit et disponibilité MIR à confirmer.','19 Québec Statement colours for touch-ups. Confirm the local kit reference and availability with MIR.'],
  ['James Hardie — couleurs Statement Québec 06/2025','James Hardie — Québec Statement colours 06/2025']
];
entries.push(...touchUpPaletteNotes);
entries.push([
  touchUpPaletteNotes[3][0]+' Échantillon de couleur du nuancier; le contenant photographié ne change pas de couleur.',
  touchUpPaletteNotes[3][1]+' Colour chart sample; the photographed container does not change colour.'
]);
for(const note of [
  ['Échantillon de teinte St-Laurent sur le gabarit de fibrociment James Hardie. Le profil, le grain et les dimensions exacts du produit ne sont pas représentés.','St-Laurent colour sample on the James Hardie fibre-cement template. The product’s exact profile, grain and dimensions are not represented.'],
  ['Échantillon de teinte St-Laurent sur le même gabarit de fibrociment James Hardie. Le profil, le grain et les dimensions exacts du produit ne sont pas représentés.','St-Laurent colour sample on the same James Hardie fibre-cement template. The product’s exact profile, grain and dimensions are not represented.']
]){
  entries.push(note);
  entries.push(['Illustration de la couleur choisie. Rendu écran indicatif. '+note[0],'Illustration of the selected colour. Screen colours are indicative. '+note[1]]);
}
entries.push(...[["Toutes vos mesures et vos angles", "All your dimensions and angles"], ["Les lettres correspondent au dessin. Les angles du modèle sont conservés et modifiables.", "The letters match the drawing. The model angles are preserved and can be adjusted."], ["Choisissez le métal, sa couleur et la face à peindre.", "Choose the material, colour and painted side."], ["Quantité et récapitulatif", "Quantity and review"], ["Indiquez le nombre de pièces et vérifiez vos choix avant l’ajout au panier.", "Enter the number of pieces and review your choices before adding to the cart."], ["Angles du modèle", "Model angles"], ["Rétablir les angles", "Restore model angles"], ["Options des replis", "Hem options"], ["Choisir le matériau", "Choose a material"], ["Repli", "Hem"], ["Matériau", "Material"], ["Ouvrir le menu", "Open menu"], ["Fermer le menu", "Close menu"], ["Menu", "Menu"], ["Mesures et angles", "Dimensions and angles"]]);
const dictionary=Object.freeze(Object.fromEntries(entries));
if(typeof module==='object'&&module.exports)module.exports=dictionary;
if(root)root.MIRClientEnglish=dictionary;
})(typeof window==='object'?window:null);
