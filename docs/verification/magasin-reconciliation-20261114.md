# MIR — Réconciliation magasin et accessoires (14 novembre 2026)

## Périmètre et preuves

- **Source de demande lue intégralement :** Library `MIR-annotations-magasin.json`, export du 2026-11-07 à 02:32:18Z, `schemaVersion:1`, 8 annotations / 8 `itemId` uniques. Les notes originales ne sont ni effacées ni réécrites; l'import/export historique demeure.
- **Dépôt actuel :** `revetementsmir/Revetements-mir-`, base `cdb4d7df51ba3a52b69673d75186ba115de20114` (PR37 brouillon, intégration PR38). Branche dédiée `codex/magasin-annotations-catalogue-20261114` enfant de cette tête, sans modifier la base des PR existantes.
- **Phase9 déjà présente :** `docs/verification/phase9-catalogue/inventaire.md` : catalogue canonique 128 fiches, quatre accessoires déjà ajoutés mais non commandables faute de données exactes; unités et noms à vérifier selon chaque référence. Pas de création supplémentaire.
- **Modèle employé :** `dist/employee-store-model.js`. **Regroupement de revue (démo seulement) :** `dist/mir-store-review.js`. Panier de revue : `dist/magasin-revue.js`; interface employé : `dist/chantier-app.js`.
- **Images ouvertes et inspectées dans la source GitHub :** `prime-40713-box.webp` (boîte PRIME, 40713), `prime-40713-staples.webp` (agrafes), `mir-screws/fascia-2po.webp` (vis de profil non prouvé identique), et `deckmart-{ced9,d5,vstyle}-acadia.png` (profils distincts, fond blanc). Il ne s'agit **pas** de captures avant/après de pages navigateur.
- Les références fournisseur documentent une variante; elles ne démontrent **ni stock MIR, ni prix MIR, ni compatibilité**. Aucun SKU MIR inventé.

## Matrice — huit annotations originales

| # / `itemId` | Demande originale → preuve actuelle | État et écart réellement restant |
| --- | --- | --- |
| 1. `mir-request-soffit-staples-1in` | PRIME 40713, agrandir photo. Boîte `assets/products/mir-provided-20261111/prime-40713-box.webp` présente et identifiée; unité `boîte` / 5 000 dans modèle. | **Corrigé dans ce lot :** raccord `primaryImage`; règle CSS à 2 % de marge au lieu de 8 % pour cette fiche seulement; `object-fit:contain` conservé. Rendu navigateur encore à inspecter. |
| 2. `pending-kaycan-fascia-hex-quarter-inch` | Photo des vis 2 po, hex ¼ po, harmoniser avec noir/blanc. Une image `mir-screws/fascia-2po.webp` existe, mais la présence apparente d'un collet/rondelle ne permet pas d'affirmer qu'il s'agit de la vis **sans rondelle** demandée. | **À confirmer :** photo exacte et référence fournisseur de la variante Kaycan. Pas de remplacement par visuel ambigu. Carte de recherche distincte, explicitement `À confirmer`. |
| 3. `mir-request-fascia-screws-black-2in` | Regrouper noir, blanc et rouge/teintes réellement disponibles; noir/blanc en premier; garder IDs par ligne panier. `MIRStoreReview.present` regroupe déjà noir/blanc sans fusionner les items sources. | **Corrigé dans ce lot :** les couleurs de la *palette fabricant* sans référence de vis documentée ne sont plus offertes dans cette fiche; demande couleur historique conservée en carte de vérification distincte. Rouge non ajouté sans référence. Photos exactes noir/blanc et rendu navigateur à confirmer. |
| 4. `mir-request-adfast` | Remplacer Adfast générique par ADSEAL Lingettes nettoyantes universelles. L'ID était déjà conservé et le nom mis à jour. Source : lesideesdepoxy.com, fiche du produit, contenant de 90. | **Précisé :** `90/contenant` affiché; avertissement périmé « nombre à confirmer » supprimé; `referencePending` maintenu car photo exacte de l'emballage reste à confirmer. Aucune fiche créée ni produit ADSEAL DWS-4580 substitué. |
| 5. `canexel-joint-cedrvue-6` | Ced’R-Vue 6 po; photo et couleurs par profil comme Saint-Laurent. Le modèle existe avec son ID propre. | **Référence produit à confirmer :** la moulure aluminium 6 po n'est pas confirmée par le guide Maibec 2026 dans l'inventaire antérieur; aucune photo exacte et aucun code fournisseur de variante; garder non confirmé. Ne pas substituer un joint 9 po. |
| 6. `canexel-joint-cedrvue-9` | Ced’R-Vue 9 po, photo/fond et couleurs par profil. `storeColors` DeckMart : 15 variantes source dont 14 photos du profil déjà intégrées. | **Déjà présent, préservé :** choix et références fournisseur distinctes. **Écart :** photo exacte « Noir 2.0 » manquante et harmonisation de l'affichage à certifier sur écran. |
| 7. `canexel-joint-ridgewood-d5-12` | Ridgewood D‑5 12 po, photos/couleurs regroupées dans ce profil uniquement; 15 références et 15 photos intégrées, dont `deckmart-d5-acadia.png`. | **Déjà présent :** aucune nouvelle fiche. Vérification visuelle de cadrage et sélection de variante à effectuer en navigateur. |
| 8. `canexel-joint-vstyle-12` | VStyle 12 po : 15 références DeckMart / 15 photos du bon profil, dont `deckmart-vstyle-acadia.png`. | **Déjà présent :** aucune nouvelle fiche. Vérification visuelle de cadrage et sélection de variante à effectuer en navigateur. |

Les 45 combinaisons documentées pour les trois profils DeckMart (et les 44 images réellement présentes) restent dans leur **profil d'origine**. Les 4 profils demandés demeurent distincts. Les fichiers exacts existants sont conservés, sans retouche inventée.

## Matrice — quatre accessoires à ne pas dupliquer

| Référence | Fiche/identité actuelle | Vérification et lacune |
| --- | --- | --- |
| Canac **55001518**, embouts 45° paquet 5 | `mir-caulk-nozzle-45-5` présent Phase9. | Paquet de 5 selon la demande d'origine; marque, compatibilité et image exacte à confirmer sur Canac; prix/stock MIR inconnus. Ne pas créer une autre fiche. |
| ADFAST **YELLOW NOZZLE/5**, RONA **13485024** | `mir-adfast-yellow-nozzles-5` présent; `packaging.piecesPerPack=5`. | Fiche RONA : paquet de 5, compatibilité Adseal600MG indiquée par le détaillant; photo exacte manquante au dépôt; prix/stock MIR inconnus. Ne pas confondre avec l'embout Canac 5081112. |
| Canac **5081112**, embout type saucisse | `mir-caulk-sausage-nozzle` présent Phase9. | Quantité par emballage, marque, modèle, compatibilité et photo exacte **non confirmés**. Aucun emballage « paquet de 5 » déduit. |
| Bates Choice **FPMS001B351**, ASIN **B0CQZ3HWY7**, fusil 18:1 | `mir-bates-caulk-gun` présent Phase9; identifiant fabricant préservé. | 1 fusil dans la demande; photo exacte, autres formats et compatibilités à confirmer. Aucun achat ou stock simulé comme réel. |

Les quatre références sont bloquées pour la commande dans le catalogue canonique Phase9; **aucune création ni duplication** dans ce lot. La vue de démonstration et le backend commercial ne doivent pas présenter un stock ou un prix fictif comme réel.

## Conservation / contrats

- Aucune modification de `dist/catalogue-fd6866b49d21.json`, migrations, SQL, Auth, Accueil8, Punch2, Équipes et heures, commandes, livraisons, favoris ou schémas.
- Les objets `itemId`, `colorId`, `stockKey`, `sku` et snapshots de commande restent inchangés; un regroupement `reviewVariants` sert exclusivement à l'interface de revue. Notes et retraits temporaires `Annoter / Retirer du magasin` restent disponibles en démo/revue avec import/export JSON.
- Les palettes fournisseur non spécifiques au produit ne deviennent pas des variantes de vis confirmées. Les demandes non confirmées restent consultables, non effacées.
- Images spécifiques CanExel : les photos existantes restent sans transformation de géométrie; l'outil `material-preview.js` emploie déjà des cadres par profil `ced9/d5/vstyle` sur fond blanc. La palette n'est pas une preuve de stock.
- Aucune opération en production, publication, fusion, vraie commande, envoi ou paiement.

## Recette et preuves à compléter avant toute fusion

- Contrats `node tests/mir-magasin-merge.cjs`, `node --test tests/mir-phase9-catalogue.cjs` et `node --check` pour les fichiers JS ciblés.
- CI `mir-phase9-catalogue-pr.yml` : source de vérité des contrôles navigateur multi-format (360, 390, **430** ajouté ici, 768, 834, 1366, 1440, 1920), couleurs, quantité, variantes, non-régressions Phases 6 à 8. Ne pas réduire ni désactiver ces contrôles.
- CI `mir-employee-portal-pr.yml` pour le parcours employé; confirmer la conservation du panier commun matériel/pliages, anciens paniers et favoris selon les suites réellement exécutées.
- Captures **avant / après des interfaces** à produire puis ouvrir et inspecter sur les formats demandés. L'inspection des **fichiers source produit** ne remplace pas cette preuve.
- Aucun essai Samsung physique requis; recette S25 séparée et ouverte.

**Statut de cette note :** audit du code et des images source, avec correctifs isolés sur branche/PR brouillon. Résultats CI et captures à consigner après exécution; ne pas présumer qu'ils ont réussi.
