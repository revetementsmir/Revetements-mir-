# PDF — harmonie pliage, 17 novembre 2026

Lot local sur codex/pliage-harmonie-20261117, départ 3573d90. Aucun commit ni envoi effectué par cette mission. Les rapports JSON contiennent la révision complète et les SHA-256 des fichiers réellement servis, car la branche comporte des changements non commis.

## Résultat

Huit exports réels générés avec les moteurs existants, relus et rasterisés avec PDF.js : sélection matériaux FR/EN, estimation mixte matériaux et deux pliages FR/EN, fiche employé de pliage, commande de panneau et panneau aux libellés longs FR/EN. **24 pages, 60 contrôles réussis, aucune erreur JavaScript.** Les PNG proviennent des PDF téléchargés, pas d'une maquette HTML.

Le test indépendant des en-têtes aux limites exactes ajoute **49/49 contrôles réussis**, deux exports FR/EN de huit pages. Il conserve les identifiants de 80 caractères, noms de 140 caractères, projet de 160 caractères, commande de 100 caractères et notes de 500 caractères. Voir headers-qa.md.

Le vrai bouton PDF du panier a été rejoué en français puis en anglais, téléchargement compris. La chaîne du panier en localStorage reste strictement identique. Les tests existants mir-selection-pdf.cjs (5/5) et mir-client-pdf-bilingual.cjs passent.

## Défauts reproduits puis corrigés

- Ligne Projet de la sélection hors page : répartition selon sa largeur réelle.
- Concaténation nom + référence recoupée à 600 caractères : références complètes conservées ; ligne exceptionnelle continuée sur une autre page sans répéter quantité ni unité.
- Titres de continuation pliage superposés au dossier : en-têtes replacés en conservant leur ordre ; métadonnées extrêmes dans une annexe lisible sans nouveau dessin ni nouvelle quantité.
- Sous-titre du PDF panneau raster hors page : titre, sous-titre et nom de fiche répartis.
- Couleur de panneau longue tronquée et superposée au code : cellule sur deux lignes, valeur officielle complète dans le résumé sous le dessin. Détails de perforation et notes conservés.
- Libellés anglais du retour écrasé, de la continuation et des cotes A/B complétés. Noms, projets, couleurs officielles et notes saisis en français volontairement inchangés.

Filets champagne, surfaces pierre et texte anthracite harmonisent les documents. Logo MIR officiel intact. Couleurs porteuses d'une information de fabrication (finition, repère de perforation, étoile de face) conservées.

## Intégrité de fabrication

- Quantités 2 et 3 chacune une seule fois dans chaque estimation ; test extrême vérifiant de même 13 et 17.
- Retour écrasé à 180° ; plis successifs distincts à 86° et 92°. Longueurs, épaisseurs, matière, code et couleur identiques.
- Quatre SVG de fiche employé strictement identiques, octet pour octet, avant et après.
- Modèles de fabrication comparés en entier. Contours réels des panneaux, contours intérieurs des lèvres et dessins de profil comparés exactement.
- La première face d'une estimation mixte est un tableau matériaux : ses règles horizontales se déplacent avec le projet multiligne. Ce tableau est exclu de la comparaison des contours de fabrication, pas des vérifications de textes et données. Les séparateurs des cellules de panneau sont également des éléments de mise en page ; les chemins data-mir-panel-main, data-mir-panel-wall et data-mir-lip-inner restent comparés exactement et doivent être non vides.
- Microchangement autorisé de production-model.js limité au libellé « 180° — hem » sur une route client anglaise. Aucune formule, angle, point, rayon ou règle de fabrication changé.

## Provenance des preuves

before/ contient les PDF avant changements et les assertions rouges : projet tronqué, référence perdue et titres superposés. Une première capture exploratoire avait utilisé une fixture sans identifiant catalogue et affichait une erreur de quantité. Cette fixture a été corrigée AVANT toute modification PDF, puis tout before/ a été régénéré avec l'identifiant canonique valide leiluo-oscillating-hcs-44mm. La capture exploratoire ne constitue pas la référence finale ; une galerie copiée plus tôt doit être régénérée.

panel-before/ sert les moteurs PDF du commit de départ `3573d90` par interception HTTP locale, avec exactement les données finales du scénario panel-long après (couleur longue et perforation). Quatre échecs reproduits : sous-titre hors page et fin de couleur perdue, dans les deux langues. Aucun fichier applicatif remplacé pour ce témoin.

headers-before/ sert uniquement le moteur de cadre historique, les autres dépendances restant celles de la branche. Il reproduit 20 échecs sur les mêmes 49 contrôles que le test après. Les SHA distinguent précisément ce témoin de la référence complète.

after/ et headers-after/ contiennent les résultats finaux. Les empreintes des moteurs de after/report.json correspondent encore aux fichiers applicatifs au terme de la vérification.

## Captures réellement examinées

- before/estimate-mixed-fr-CA-page3.png : collision d'en-tête.
- after/estimate-mixed-fr-CA-page3.png : continuation lisible.
- after/estimate-mixed-en-CA-page2.png : retour écrasé, cotes et quantité.
- after/selection-long-fr-CA-page1.png et page2.png : projet complet et référence continuée, quantité non répétée.
- before/bending-order-fr-CA-page1.png : fiche employé et retour.
- panel-before/panel-long-fr-CA-page2.png : couleur tronquée et chevauchement.
- after/panel-long-en-CA-page2.png : cotes anglaises, couleur complète, perforation sur deux lignes et résumé.
- headers-after/headers-en-CA-page3.png et page4.png : nom extrême et annexe, examinés par la revue indépendante.

## Rejouer

    node docs/verification/pliage-harmonie-20261117/pdf/qa-pdf.cjs after
    node docs/verification/pliage-harmonie-20261117/pdf/qa-regression.cjs after
    QA_BASELINE=1 QA_ONLY=panel-long node docs/verification/pliage-harmonie-20261117/pdf/qa-pdf.cjs panel-before
    node docs/verification/pliage-harmonie-20261117/pdf/qa-regression.cjs panel-before
    node docs/verification/pliage-harmonie-20261117/pdf/qa-headers.cjs
    node docs/verification/pliage-harmonie-20261117/pdf/qa-headers.cjs --baseline
    node docs/verification/pliage-harmonie-20261117/pdf/qa-client-export-ui.cjs

Les vérifications panel-before et --baseline sont volontairement rouges. Les tests navigateur autorisent seulement les GET du serveur local et les URL blob. Toute consultation externe, dont le service de prix, est bloquée avant son départ. Aucune estimation, commande, notification, écriture Supabase ou donnée client réelle.

Les limites de longueur et de validation du modèle métier restent inchangées. Lisibilité contrôlée à l'écran sur les rasterisations ; aucune épreuve papier physique imprimée. Moteur d'import PDF→3D et PDF sources importés inchangés.
