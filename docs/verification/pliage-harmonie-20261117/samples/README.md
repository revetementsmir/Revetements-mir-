# Échantillons MIR — 17 novembre 2026

Les trois références auparavant affichées sur une sphère utilisent maintenant un détail rectangulaire : JDP Äkta 306, JDP Bluhouss 307 et Rialux Bosco. La couverture JDP, les cartes, les fiches, leurs quinze vignettes de couleur et les deux magasins utilisent les mêmes sources documentées. Aucun fichier image, prix, format, profil technique ou catalogue n’a été modifié dans ce lot.

## Sources et cadrages

| Référence | Original local vérifié | Cadrage SVG, en pixels source | Nature exacte |
|---|---|---|---|
| Äkta 306 | `assets/catalogue-swatches/jdp-gris-antique-c790727e.png` — 1500 × 2000 | `[0, 500, 1500, 1000]` | Détail d’une vraie photographie plane officielle Gris antique. |
| Bluhouss 307 | `assets/products/jdp-bluhouss-307.webp` — 2000 × 2000 | `[640, 760, 720, 480]` | Détail central de la texture dans l’aperçu fabricant existant, sans contour sphérique. Ce n’est pas une nouvelle photographie plane; perspective et dimensions ne sont pas représentatives. L’original reste accessible dans les sources de la fiche. |
| Bosco | `assets/products/rialux-bosco.webp` — 800 × 534 | `[0, 0, 280, 187]` | Détail de la vraie photographie de pose du profil Bosco. Le cadrage exclut le schéma superposé, les fenêtres et l’environnement. |

Les sources officielles et les autres pistes recherchées sont conservées dans [source-research-findings.md](source-research-findings.md) et son JSON. Les fichiers plans Lightbeans découverts et les photos de pose Bluhouss externes n’ont pas été intégrés : leur téléchargement n’a pas abouti. Aucun remplacement par une autre essence ou un autre profil n’a été effectué.

L’adaptateur prépare des copies des matériaux, sans modifier le catalogue partagé. Les changements de teinte utilisent le renderer MIR existant : source, grain, ombres, cadrage et masque restent fixes. Les tables de couleur seules changent; le résultat demeure une illustration de teinte à l’écran. Un masque supplémentaire borne le cadrage réel pour empêcher que des pixels extérieurs au détail apparaissent dans les marges d’une fiche.

## Vérification

- 21 captures AVANT depuis une copie immuable de `3573d90`; 21 captures APRÈS aux largeurs 1440, 834 et 390 pixels, sans débordement ni erreur JavaScript.
- Cadres de cartes mesurés : 421,3 × 280,9 px sur PC, 379 × 252,7 px sur tablette, 354 × 236 px sur téléphone. Rapport 3:2 commun.
- Régression du renderer : 22 profils exactement, dont les 19 précédents, et 375 associations de couleur. Identité des nœuds source, grain, deux masques, filtre et cadrage conservée; entrée catalogue inchangée; deuxième préparation sans nouvelle requête.
- 18 parcours de magasin : trois produits × trois largeurs × revue locale et interface terrain avec session fictive. Sélection des couleurs par les contrôles réels, même source et mêmes nœuds après sélection, aucune action de commande ou d’envoi.
- Captures inspectées : cartes JDP PC, fiches Bosco PC et Bluhouss téléphone, détail Äkta terrain téléphone et Bosco revue tablette. Le cadre de la revue magasin a ensuite été harmonisé en 3:2 par le lot magasin; les18parcours ont été recapturés et le ratio vérifié après cette correction.

Les captures magasin et chantier sont des simulations locales clairement identifiées dans `store-results.json`. Aucun Supabase, courriel ou envoi de demande réel n’a été sollicité; seuls les GET locaux sont autorisés dans les recettes navigateur.

## Reproduire

`node docs/verification/pliage-harmonie-20261117/samples/capture-samples.cjs` produit les vues APRÈS. L’option `--before` utilise `/tmp/mir-samples-before-20261117/dist`, extrait du commit de départ.

`node docs/verification/pliage-harmonie-20261117/samples/verify-store-samples.cjs` vérifie les deux magasins et produit leurs 18 captures.

`tests/mir-client-siding-previews-browser.cjs` accepte `MIR_SIDING_TEST_ORIGIN` et `MIR_SIDING_TEST_OUTPUT`. Son résultat final pour ce lot est dans `renderer/renderer-results.json`.

La galerie centrale du lot est `dist/pliage-harmonie-20261117.html`. Paires utiles : `brands-jdp-1440`, `jdp-cards-390` et `bosco-1440`.
