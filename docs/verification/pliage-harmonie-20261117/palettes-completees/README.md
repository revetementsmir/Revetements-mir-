# Palettes de retouche et échantillons fibrociment — 17 novembre 2026

## Périmètre livré

Reprise de `bb39e142e646022a20eb804dacd8001321c7ee19`, branche `codex/pliage-harmonie-20261117`.
Ce sous-lot concerne les couleurs et leur présentation. Le détourage a été annulé pendant la reprise; aucun fichier image n’a été créé ou retouché par ce sous-lot. La photo de maison de l’accueil et les photographies originales des produits sont conservées.

| Référence | Avant | Après |
|---|---|---|
| Kit ColorPlus James Hardie | 1 couleur canonique; le client ajoutait uniquement Étain vieilli, donc 2 choix | 19 références régionales dans le catalogue commun et l’overlay client |
| Retouche CanExel 284 ml | 0 couleur canonique; 20 dans l’overlay client | 20 références explicites dans les deux sources : 16 actuelles et 4 anciennes |
| Fibrociment St-Laurent | 24 couleurs déjà présentes, tous les assets disponibles | 24 couleurs conservées sur les cinq produits; clins sur le même gabarit de couleur que les clins Hardie correspondants |

Les 131 identifiants produits sont conservés. Les 129 produits sans rapport avec les deux retouches sont strictement identiques au catalogue de départ. Les champs métier, prix, formats, photos, références fournisseur et conditions de commande des deux kits sont conservés; seuls les palettes, leurs preuves et le choix de préserver la photo lors du changement de couleur sont ajoutés.

## Choix de présentation

- Le kit Hardie conserve sa photographie pour les 19 choix. Les puces du nuancier présentent la couleur extraite de leur échantillon de référence; la couleur du contenant n’est pas modifiée.
- Le magasin de revue et l’écran chantier conservent aussi la photo de chaque kit/contenant. Le choix apparaît dans un échantillon distinct, avec son nom fabricant. Le nœud porte `data-touch-up-swatch` et `data-color-id`; les puces Hardie renseignent également `data-display-color` après chargement.
- Les 16 couleurs actuelles CanExel gardent leurs vrais swatches. Les quatre anciennes références — Bois de grange, Renard roux, Rouge campagne, Yellowstone — restent sélectionnables et signalent que la teinte n’est pas représentée; aucun swatch de remplacement n’est inventé.
- Les clins St-Laurent 6,25 et 8,25 po utilisent les mêmes géométries d’illustration que les modèles Hardie correspondants, avec les **24 références de couleur St-Laurent**. Les notes précisent qu’il s’agit d’un gabarit de couleur, pas de la photographie du profil exact. Les profils V-Groove et Board & Batten gardent leurs géométries distinctes. La photo fabricant du clin 8,25 reste accessible dans les sources.

Les noms de couleur restent les noms source en FR et EN. Les nouveaux libellés, les notes de disponibilité et les notes de gabarit ont des équivalents EN. Les noms du nuancier sont protégés par `data-mir-source-color` dans les nouvelles légendes.

## Sources vérifiées

1. [James Hardie — brochure Québec 06/2025](https://www.gentek.ca/wp-content/uploads/sites/2/2025/06/HS2533_QC_FR_0625.pdf) : 19 références Statement. Document fabricant distribué par Gentek; le nuancier indexé a été relu. L’ouverture web intégrale dépassait la limite de taille du service (environ 22 Mo).
2. [James Hardie — kit ColorPlus](https://www.jameshardie.com/product-catalog/accessories-siding-products/hardie-colorplus-touch-up-kits/touch-up-kit/) : correspondance avec les finitions ColorPlus. Cette page ne certifie pas le stock MIR ni tous les SKU régionaux.
3. [St-Laurent — palette fibrociment](https://www.fabstlaurent.com/revetements-exterieurs/fibrociment/couleurs/) et [demande d’échantillons](https://www.fabstlaurent.com/ressources/echantillons/) : 24 couleurs, incluant Lin et Eucalyptus. L’ouverture directe a corrigé les anciens résultats indexés qui n’en montraient que 22.
4. CanExel : preuves existantes conservées dans `paletteEvidence`, notamment [couleurs actuelles Maibec](https://maibec.com/fr/revetement-dingenierie-canexel/couleurs-canexel/), [accessoires Maibec](https://maibec.com/fr/produits/accessoires-canexel/), [brochure antérieure 04/2025](https://maibec.com/wp-content/uploads/2025/05/Maibec-CanExel_Brochure-04.2025_FR.pdf) et [références de retouche B. Bouchard](https://boutique.aluminiumbbouchard.ca/produit/peinture-de-retouche-pour-le-canexel-284ml/). Ce sous-lot synchronise les références déjà documentées dans l’overlay, sans élargir la compatibilité des revêtements actuels aux anciennes teintes.

## Compatibilité et revue finale

`hardie-noir-minuit` conserve son nom historique, le code `4960831`, l’alias Blackwater `4100703`, les références de boîte et la preuve d’origine. `hardie-etain-vieilli` conserve l’ID et le nom client antérieurs « Étain vieilli (Aged Pewter) ». Aucun alias n’est créé comme deuxième couleur et aucun panier existant n’est migré ou réécrit.

Les deux kits conservent `orderable:false`. Le vrai modèle `employee-store-model.js` refuse toujours `configureLine` avec `ITEM_NOT_ORDERABLE`, même pour une quantité et une nouvelle couleur valides. La palette ne constitue pas une confirmation de stock, de prix ou de SKU.

Revue asynchrone : les nouveaux swatches utilisent la garde existante `element.isConnected` dans `paintChip`, ce qui empêche un chargement précédent de peindre un nœud remplacé. Dans la revue magasin, le lien fournisseur est mis à jour **avant** le chargement asynchrone; un ancien choix ne peut pas réécrire ce lien après résolution. Les chemins de photo ne dépendent pas de la couleur choisie dans ces branches.

## Vérification

Commande reproductible depuis la racine du dépôt :

```sh
node docs/verification/pliage-harmonie-20261117/palettes-completees/verify-palettes.cjs
```

`data-results.json` consigne **14 contrôles réussis**, couvrant les listes exactes 19/20/24, les 129 produits inchangés, les métadonnées Noir minuit, les 59 assets actuels de swatch, la concordance client/magasin, la garde de commande, les géométries des gabarits, la traduction par le vrai module de langue et la syntaxe JavaScript.

Le test navigateur historique `tests/mir-client-colours-browser.cjs` attend maintenant la palette Hardie complète; ses autres assertions restent conservées. La recette navigateur finale et les captures sont coordonnées séparément par l’agent QA/root. Ce rapport ne prétend pas que Chromium, Safari ou un appareil physique ont été certifiés par les contrôles statiques.

Aucune écriture backend, commande, demande, courriel, fusion, publication ou opération de déploiement effectuée par ce sous-lot.
