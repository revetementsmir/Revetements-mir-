# MIR Studio S1 — inventaire et import des vues

Lot en vérification. Base relue : `e9bd39bc5dd4c40663c56bfc21759c543ab4e8d9`, après PR43. Branche unique : `codex/mir-studio-s1-import`. Aucune fusion ni publication S1 autorisée par ce lot. Les PR2/8/9/11 et les travaux employés locaux sont préservés.

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
- Les anciennes clés locales sont conservées. Après migration, les espaces de stockage sont séparés par projet et bâtiment; les champs attachés à une vue sont sérialisés avec son identifiant stable. Le modèle original et ses choix ne sont pas effacés pour revenir en arrière.

## Recette et confidentialité

Le rapport utilisateur du 16 novembre a été lu depuis l'archive privée reçue. Les six PDF du premier paquet ont leurs empreintes vérifiées. Le septième PDF est reconstitué depuis ses trois blocs binaires, taille et SHA-256 vérifiés : 59 288 955 octets, 17 pages. Le PDF Drive de 34 pages découvert avant ce transfert est un autre document et n'est pas assimilé à l'original attendu.

Aucun original, texte OCR client, aperçu de plan privé, ZIP privé, lien temporaire ou secret n'est ajouté au dépôt ou aux artefacts publics. Le runner `tools/qa/mir-studio-originals-local.cjs` exige un manifeste et une destination hors dépôt; il ne transmet les sources à aucun service d'analyse. Ses captures et résultats détaillés restent privés. Ses requêtes externes sont bloquées pendant la recette. La CI utilise exclusivement les fixtures synthétiques.

### Matrice des originaux — état de recette

Les comptes ci-dessous désignent des vues, pas des pans de mur. Une importation réussie ne certifie pas ses dimensions ni ses contours.

| Original | Pages | Base e9bd39b : vues réellement importées | S1 | Points à vérifier/conserver |
|---|---:|---:|---|---|
| Jumelé Sentier FINAL | 5 | 5 | En cours de recette finale | Aucun plan d'étage dans ce fichier; étude existante distincte, pas de profondeur de retrait inventée. |
| 351 | 5 | 4 | En cours de recette finale | RDC refusé sur la base; garage intégré et détail ne doivent pas devenir un second bâtiment. |
| 313 | 5 | 5 | En cours de recette finale | Seul le plan de l'étage est fourni; aucun RDC confirmé. |
| Samuel Forest | 5 | 4 | En cours de recette finale | Titre d'aménagement étage refusé sur la base; doublons OCR de la même boîte à réunir. |
| Des Tournesols | 5 | 5 | En cours de recette finale | RDC en première page, légendes colorées exclues de la géométrie. |
| Champs fleuris no 5 | 6 | 4 | Corrections en recette | Base : seulement les quatre élévations de maison; cabanon et RDC tournés manqués. Candidat initial : 9 entrées, dont un doublon; cinq vues du cabanon non encore complètes. Échecs conservés. |
| 12 logements | 17 | En cours | En cours de recette finale | Implantation, notes, index, fondation, toiture, niveaux, coupe et détails distincts. |

### Contrôles synthétiques déjà exécutés

- Reproduction des deux titres refusés et de l'écrasement de deux vues avant sur la base.
- Avant/après de la même fixture raster : base 3 vues sur 8; S1 conserve huit vues et deux bâtiments, avec cinq vues de cabanon sur une page tournée à 270°.
- Titres FR/EN et contre-exemples de notes, cartouches et index; boîtes OCR qui se chevauchent; plan central entre deux colonnes d'élévations.
- Identifiants stables, conflit de dimensions, étage sans RDC, absence de mélange des cotes maison/cabanon, aller-retour des quatre rotations et cadrages.
- Import, sauvegarde/réouverture, changement de bâtiment, retouches de matière/zone/ouverture conservées, isolation des projets, migration explicite et ouverture d'un ancien projet sans écriture.
- Parcours Chromium aux dimensions 390×844, 834×1112 et 1440×1000; captures synthétiques ouvertes pour inspection, distinctes d'appareils physiques.
- Ancienne suite navigateur du PDF synthétique 108 Mo / 67 pages conservée et exécutée sans modification des assertions. Suites murs détachés et terrain/interactions exécutées. Suites Node existantes pertinentes conservées.

La CI de la tête poussée et la matrice finale restent à relever avant clôture. Aucun test sur Samsung n'est demandé. Aucun backend, Supabase production, courriel réel, paiement, Google, signature de release ou distribution n'est nécessaire à ce lot.

## Reproduction

Public et synthétique :

```sh
node tests/mir-studio-s1.cjs
MIR_CHROMIUM_BIN=/usr/bin/chromium node tests/mir-studio-s1-browser.cjs
```

Recette privée, jamais dans la CI publique : fournir `MIR_PRIVATE_MANIFEST` (JSON avec `caseId`, chemin du PDF et SHA-256), `MIR_PRIVATE_PROOFS` et, pour une comparaison épinglée, `MIR_PRIVATE_SOURCE_SNAPSHOT`. Les trois chemins doivent rester privés et hors du dépôt. Le runner importe réellement via le formulaire, sauvegarde, ouvre les bâtiments et recharge le projet. Un rendu ou un texte extrait seul ne remplace pas ce parcours.

Prochaine action S2 : utiliser cet inventaire pour construire/confirmer des contours par niveau puis leurs pans de mur. S1 ne livre pas une reconstruction universelle en 360°.
