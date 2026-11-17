# MIR Studio S1 — inventaire et import des vues

Import S1 vérifié localement et proposé dans la [PR de travail #44](https://github.com/revetementsmir/Revetements-mir-/pull/44). Base relue : `e9bd39bc5dd4c40663c56bfc21759c543ab4e8d9`, après PR43. Branche unique : `codex/mir-studio-s1-import`. Aucune fusion ni publication S1 effectuée. Les PR2/8/9/11 et les travaux employés locaux sont préservés.

## Comportement réalisé

L'import conserve un inventaire indépendant du rendu : fichier et empreinte, page, zone, rotation, matrices de repère, type de vue, bâtiment, niveau, calibration, cotes et provenance. Des élévations portant la même direction restent des vues distinctes. Plusieurs candidates dans une direction exigent un choix; le premier titre ne gagne plus silencieusement.

Le document peut proposer plusieurs bâtiments. Les vues sans association sûre restent dans un groupe explicitement à confirmer, sans être rattachées au cabanon par propagation depuis la première page. Les matériaux et retouches sont conservés par bâtiment et identifiant de vue; les quatre directions ne servent qu'à l'adaptateur du rendu actuel.

Les titres « Plan R-D-C », « PLAN D’AMÉNAGEMENT – ÉTAGE » et « Vue en plan » sont couverts. Les notes, index, tableaux et détails ne deviennent pas des plans par présence de ces mots. L'OCR reste local. Les lectures de titres à plusieurs résolutions sont réunies par leur position, sans perdre les titres qu'une passe plus fine ne relit pas. Une page tournée utilise le même repère pour le dessin, l'OCR, les cotes et le cadrage. Un plan central qui couvre deux rangées d'élévations conserve sa hauteur.

Les plages colorées restent des propositions séparées. Une confirmation explicite d'une surface visible est nécessaire avant d'en faire une zone de mur. Aucun trou dans une légende n'est automatiquement une fenêtre. Le PDF original intégral reste conservé dans IndexedDB et ouvrable localement; les pages non classées ne sont pas effacées du fichier.

Un contour inconnu reste `unknown`. La prévisualisation 3D éventuelle est indicative; les contours par niveau et la reconstruction des murs cachés appartiennent à S2. Aucune dimension du jumelé ne sert de valeur de repli à un import client.

## Contrat et migration

- Plan nouvellement importé : `version: 3`; `viewInventory.schema: mir-view-inventory`, `viewInventory.version: 1`.
- `files`, `pages`, `buildings`, `levels`, `views`, `rendererSelections`, `activeBuildingId` sont conservés. Les emplacements `contours` et `wallPlanes` restent vides tant que leur contenu n'est pas établi.
- Chaque vue possède son propre `id`, `fileId`, `page`, `zone`, `orientation`, `frame`, `kind`, `direction`, `buildingId`, `levelId`, `associations`, `calibration`, `provenance`, `evidence` et sa charge utile conservée.
- `frame.pdfToRaster` et `frame.cropToRaster` permettent les allers-retours PDF ↔ pixels locaux. La boîte du titre est exprimée dans le repère raster de la page redressée.
- Les niveaux nommés par le titre restent proposés. Une première lecture d'« étage » ne crée aucun RDC. « First floor » garde son ambiguïté régionale.
- Les cotes ne sont rapprochées qu'à l'intérieur du bâtiment sélectionné. Les plans de niveaux différents restent distincts; les contradictions restent nulles/à confirmer, sans moyenne appliquée.
- L'adaptateur `adapt` est pur. Il fournit les quatre directions actuelles et les références du seul bâtiment sélectionné.
- Une simple ouverture d'un ancien projet ne réécrit ni le plan ni ses réglages. La migration est explicite depuis « Bâtiment et vues »; elle copie les faits source, garde les champs inconnus, les faces originales et les confirmations existantes. Elle ne déduit aucun niveau absent.
- Les anciennes clés locales sont conservées et référencées dans la migration. Après migration, les espaces de stockage sont séparés par projet et bâtiment; les champs attachés à une vue sont sérialisés avec son identifiant stable. La migration utilise la source exacte de l'ancienne face, jamais une référence trouvée dans la même direction. Si les anciennes faces appartiennent à plusieurs bâtiments, les réglages globaux sans propriétaire certain restent archivés dans leur espace original et ne sont pas dupliqués entre bâtiments. Le modèle original et ses choix ne sont pas effacés.

## Recette et confidentialité

Le rapport utilisateur du 16 novembre a été lu depuis l'archive privée reçue. Les six PDF du premier paquet ont leurs empreintes vérifiées. Le septième PDF est reconstitué depuis ses trois blocs binaires, taille et SHA-256 vérifiés : 59 288 955 octets, 17 pages. Le PDF Drive de 34 pages découvert avant ce transfert est un autre document et n'est pas assimilé à l'original attendu.

Aucun original, texte OCR client, aperçu de plan privé, ZIP privé, lien temporaire ou secret n'est ajouté au dépôt ou aux artefacts publics. Le runner `tools/qa/mir-studio-originals-local.cjs` exige un manifeste et une destination hors dépôt; il ne transmet les sources à aucun service d'analyse. Ses captures et résultats détaillés restent privés. Ses requêtes externes sont bloquées pendant la recette. La CI utilise exclusivement les fixtures synthétiques.

### Matrice des sept originaux — recette réelle du 16 novembre 2026

Les comptes ci-dessous désignent des vues, pas des pans de mur. Chaque original a été chargé par le formulaire local, sauvegardé dans IndexedDB, ouvert dans le Studio, puis rechargé. Les empreintes, tailles du PDF conservé et nombres de vues à la réouverture correspondent. Les rendus source et Studio ont été ouverts pour inspection. Une importation réussie ne certifie pas ses dimensions ni ses contours.

Calibrations proposées par vue : R = lectures recoupées, U = cote unique, F = faible confiance, C = conflit, A = absente. Même R reste non confirmé (`verified: false`). Les bâtiments non nommés avec certitude gardent « Bâtiment à confirmer »; les niveaux lus restent proposés.

| Original | Pages | Base e9bd39b : vues importées | S1 : vues importées et rouvertes | Bâtiment / niveaux / orientation | Échelle et dimensions restantes |
|---|---:|---:|---:|---|---|
| Jumelé Sentier FINAL | 5 | 5 | 5 | Groupe à confirmer; 4 élévations + RDC, 0°. Aucun plan d'étage fourni. | 3R, 1C, 1F. Largeur isolée gardée en attente; dimensions globales nulles. Aucun retrait repris de l'étude. |
| 351 | 5 | 4 | 5 | Groupe à confirmer; 4 élévations + RDC, 0°. « Plan R-D-C » maintenant reconnu. | 1R, 1F, 3A. Dimensions globales manquantes. Garage intégré non séparé en bâtiment. |
| 313 | 5 | 5 | 5 | Groupe à confirmer; 4 élévations + étage seulement, 0°. Aucun RDC créé. | 2F, 3A. Dimensions globales manquantes. |
| Samuel Forest | 5 | 4 | 5 | Groupe à confirmer; 4 élévations + étage seulement, 0°. Titre d'aménagement reconnu. | 1U, 1F, 3A. Dimensions globales manquantes. Aucun RDC créé. |
| Des Tournesols | 5 | 5 | 5 | Groupe à confirmer; RDC p1 + 4 élévations, 0°. | 1R, 4A. Dimensions globales manquantes. Légendes conservées dans l'image, sans mur automatique. |
| Champs fleuris no 5 | 6 | 4 | 10 | Cabanon : 5 vues p1 redressée à 270°, dont le plan central complet. Maison : RDC p2 redressé à 270° et 4 élévations p3–6 à 0°. Deux bâtiments séparés. | 1R, 3U, 2F, 4A. Dimensions globales manquantes pour les deux bâtiments; aucune cote ou matière propagée entre eux. |
| 12 logements | 17 | 12, dont 1 faux positif | 11 | Groupe à confirmer; fondation p4, niveaux 0–3 p5–8, toiture p9, élévations p10–13, coupe p16; 0°. Index p1 écarté. | 4R, 3C, 2F, 2A. Largeur/profondeur en attente, hauteur contradictoire nulle. Proposition de hauteur de toit conservée avec provenance, non confirmée. |

Total S1 : **46 vues**, **48 pages sources conservées**, sept imports et réouvertures réussis. Pour le 12 logements, index, code, implantation, escalier, notes et détails (p1–3, p14–15, p17) restent accessibles dans le PDF original; ils ne sont pas transformés en murs ou plans de niveau.

Échecs conservés dans la comparaison : la base manque le RDC de 351, l'étage de Samuel et les vues tournées de Champs fleuris; elle prend une ligne de l'index du 12 logements pour une coupe. Les premiers candidats S1 de Champs fleuris ont donné 8 ou 9 entrées, parfois avec doublon ou plan central absent, avant correction. Ils ne sont pas comptés comme réussite. Des avertissements OCR et des lignes/cadrages illisibles persistent sur les originaux; ils expliquent les calibrations absentes ou faibles et restent dans les journaux privés. Aucun échec bloquant final du formulaire ou de réouverture n'a été observé.

La recette originale finale utilise le code d'analyse épinglé à `9036a2ad5ae27c6394440c0016e551b2ab6a09b1`, copie privée `final-source-v4` avec empreintes des scripts. Les derniers changements de livraison concernent la migration d'anciens réglages, les libellés FR/EN des badges et avertissements, leurs régressions et ce compte rendu; ils ne modifient pas l'analyse des nouveaux imports ainsi testée. Les preuves privées détaillées ne sont pas publiées.

### Contrôles synthétiques déjà exécutés

- Reproduction des deux titres refusés et de l'écrasement de deux vues avant sur la base.
- Avant/après de la même fixture raster : base 3 vues sur 8; S1 conserve huit vues et deux bâtiments, avec cinq vues de cabanon sur une page tournée à 270°.
- Titres FR/EN et contre-exemples de notes, cartouches et index; boîtes OCR qui se chevauchent; plan central entre deux colonnes d'élévations.
- Identifiants stables, conflit de dimensions, étage sans RDC, absence de mélange des cotes maison/cabanon, aller-retour des quatre rotations et cadrages.
- Import, sauvegarde/réouverture, fermeture puis relance du navigateur avec profil persistant, changement de bâtiment, retouches de matière/zone/ouverture conservées, isolation des projets, migration explicite et ouverture d'un ancien projet sans écriture. Régression de migration : une référence portant la même direction n'hérite pas des finitions de l'ancienne face; des propriétaires multiples ne reçoivent pas une copie du volume global.
- Parcours Chromium aux dimensions 390×844, 834×1112 et 1440×1000; captures synthétiques ouvertes pour inspection, distinctes d'appareils physiques.
- Ancienne suite navigateur du PDF synthétique 108 Mo / 67 pages conservée et exécutée sans modification des assertions. Suites murs détachés et terrain/interactions exécutées. Suites Node existantes pertinentes conservées.

Le workflow S1 vérifie explicitement le SHA de tête de PR et exécute les contrats, l'import raster synthétique, la persistance et les suites navigateur existantes. Les contrôles exacts de la dernière tête sont relevés dans la PR et la tâche Atelier après le push; un succès d'une tête précédente ne vaut pas certification de la suivante.

Tests non exécutés : import des sept originaux sur appareils physiques téléphone/tablette, Safari et Samsung. Les trois formats d'écran ont été testés dans Chromium avec des plans synthétiques uniquement, sans les présenter comme une recette des originaux sur ces appareils. Les cotes manuelles exhaustives, contours confirmés par niveau, retours cachés et quantités 360° ne sont pas établis par S1. Aucun accès Supabase manuel, migration backend, courriel réel, paiement, signature de release ou distribution effectué. Les workflows TEST existants restent inchangés.

## Reproduction

Public et synthétique :

```sh
node tests/mir-studio-s1.cjs
MIR_CHROMIUM_BIN=/usr/bin/chromium node tests/mir-studio-s1-browser.cjs
```

Recette privée, jamais dans la CI publique : fournir `MIR_PRIVATE_MANIFEST` (JSON avec `caseId`, chemin du PDF et SHA-256), `MIR_PRIVATE_PROOFS` et, pour une comparaison épinglée, `MIR_PRIVATE_SOURCE_SNAPSHOT`. Les trois chemins doivent rester privés et hors du dépôt. Le runner importe réellement via le formulaire, sauvegarde, ouvre les bâtiments et recharge le projet. Un rendu ou un texte extrait seul ne remplace pas ce parcours.

Prochaine action S2 : utiliser cet inventaire pour construire/confirmer des contours par niveau puis leurs pans de mur. S1 ne livre pas une reconstruction universelle en 360°.
