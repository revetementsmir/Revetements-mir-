# Studio MIR — écrans et PDF harmonisés

## Demande et périmètre

Suite au lot Studio 03, Frederick a signalé que les PDF d’élévations restaient dans l’ancien style blanc et demandaient trop de lecture. Il a demandé l’identité anthracite MIR sur tout le parcours Studio. Sa précision suivante limite la **simplification aux pages PDF montrées**, sans retirer ou réorganiser les commandes du Studio.

- Branche isolée : `codex/studio-harmonie-pdf-20261118`.
- Base : `e0cd92d9e6dd01b3f6697dd7de972df95839c8e1`, confirmée localement, sur Git distant et sur l’aperçu Vercel READY.
- Mission Atelier complémentaire : `abecef6c-7186-44f0-b2a9-bba95b4e097a` ; précédent lot `06736632-6deb-43b0-86da-af0d9e4acb09` conservé comme historique.
- MOON 1.3.11 relu le 18 novembre 2026 à 13:43:22 UTC ; BOSS GOD MODE et méthodes Designer, Graphiste, Ergonomie, Harmonisation, Architecture, Qualité et périmètre SEO/GEO réellement consultés.
- Publication autorisée : aperçu TEST protégé uniquement. Aucune fusion, production, migration, permission, activation Google/paiement/courriel ou demande réelle.

## Surfaces concernées

| Surface | Traitement |
|---|---|
| `plan.html` | Habillage des fenêtres et sous-panneaux, scène et commandes conservées |
| Import PDF | Vide, progression, résultat, erreur et fermeture |
| Reprendre mon plan | Liste locale vide/remplie et ouverture d’un projet |
| Bibliothèque / fiche matériau | Filtres, résultats, documentation et couleurs réelles |
| Ouvertures / volume | Formulaires et aperçus techniques existants |
| Plan source | Cadre harmonisé ; contenu PDF original préservé |
| Estimation / PDF prêt | Formulaire, envoi TEST désactivé et téléchargement réel |
| `studio.html` | Ancienne démonstration conservée et identifiée, style harmonisé |
| Studio public « En construction » | Même disponibilité et liens ; identité harmonisée |
| PDF client des élévations | Quatre grandes vues par défaut ; cotes et listes complètes sur option explicite |

Les outils de revue `annoter.html` et `responsive.html`, les espaces employés, l’accueil et Particuliers restent hors de ce lot. Les fichiers PDF d’origine et les documents fabricants ne sont pas recolorés.

## Architecture et données

Le thème du PDF est demandé explicitement par l’export Studio. Le générateur partagé conserve son chemin historique pour les autres parcours et les contextes internes. Les SVG de présentation sont produits par le moteur existant avec les annotations désactivées, en copies séparées ; les faces annotées et les résumés complets restent disponibles pour les annexes. `exportFaces()` et `captureEstimation()` ne sont pas raccourcis. La case « Inclure les cotes et détails techniques », décochée par défaut, ajoute les dessins annotés nécessaires et toutes les lignes techniques. Cette préférence ne modifie pas le projet.

Le contrôle de périmètre évolue explicitement avec l’autorisation de ce lot : base Studio 03, seulement quatre fichiers `dist` préexistants autorisés. Il vérifie en plus que `plan-app.js`, une fois les ajouts de présentation isolés retirés, est strictement identique à sa base. Cela ne constitue pas une certification des travaux PDF→3D concurrents non intégrés.

## Vérification et livraison

Captures et preuves avant/après, contrôles de conservation des données PDF, vérifications des fenêtres FR/EN et routes secondaires sont conservés dans les sous-dossiers correspondants. Les résultats définitifs, le SHA et l’URL publiée sont consignés après réussite ; une capture de développement n’est pas une preuve de publication.

SEO/GEO : aperçu privé TEST et état public de construction inchangé. Aucune modification de l’indexation, de l’authentification ou des accès ; aucun référencement ou classement promis.

## Résultats locaux confirmés

- Régression Studio existante : 16 groupes, 57 captures ; quatre sélections directes 2D/3D ; quatre fichiers de tests métier passent.
- Fenêtres : sept groupes passent, 74 captures, PC 1440×900, tablette 834×1194 et téléphone 390×844 en FR/EN ; avant comparable conservé. Import PDF synthétique réel, erreurs, reprise, source et estimation désactivée vérifiés.
- PDF : quatre pages simples en FR/EN ; option détaillée avec tous les résumés source. 14 cas de routage, sept comparaisons historiques identiques en octets et deux cas de pagination longue passent.
- Traductions ciblées : cinq groupes passent ; valeurs, noms source, liens et état du modèle préservés.
- Entrées secondaires : 12 cas avant et 12 après, plus staging du template public.
- Accueil et Particuliers : 12 comparaisons de captures identiques sans masque ; 1651 fichiers protégés inchangés.

Les tests Studio bloquent toutes les destinations externes. Le test secondaire suit aussi le lien Boutique : une lecture de prix externe y est interceptée avant le réseau et signalée dans son rapport. Aucun envoi réel n’est effectué.

## Limites et suivi

Le moteur actuel reste celui du projet : aucune certification nouvelle du PDF→3D, des surfaces ou des quantités. Le PDF demeure rasterisé, sans échelle d’impression garantie. Les titres officiels de documents et certaines notes de source restent dans leur langue d’origine ; aucune annonce de bilinguisme global terminé.

La version détaillée peut avoir un nombre de pages différent selon la langue et les SVG sources. Sur la fixture de revue : 8 pages FR et 11 pages EN ; les présentations simples ont toutes deux 4 pages. Les choix qui dépassent le résumé court sont explicitement renvoyés vers cette version détaillée.

Le suivi Atelier est disponible. Le transfert de la proposition visuelle reste indisponible : le helper officiel `agent-upload.mjs` a de nouveau renvoyé une page HTML. Aucun transfert ou validation humaine n’est prétendu. Les captures et PDF restent livrés dans ce dossier et le nouvel aperçu TEST est vérifié séparément après publication.

## Fichiers de réalisation

- `dist/plan.html`, `dist/plan-app.js` : chargement des présentations et copies de façades pour le PDF, sans changement du moteur métier.
- `dist/annotated-pdf.js`, `dist/mir-studio-pdf.js` : routage client explicite et nouveau document.
- `dist/mir-studio-export-options.js`, `dist/mir-studio-surfaces.css` : option détaillée et habillage des fenêtres.
- `dist/mir-studio-dialog-i18n.js` : libellés ciblés des fenêtres.
- `dist/studio.html`, `dist/mir-studio-doors.css`, `ops/studio-public/under-construction.html` : entrées secondaires.
- Tests dédiés, contrôle de périmètre et workflow `.github/workflows/mir-studio-03.yml` ; aucune désactivation de contrôle existant.

Les preuves complètes se trouvent dans `pdf/`, `surfaces/`, `i18n/`, `secondary/`, `regression/` et `qa/`.
