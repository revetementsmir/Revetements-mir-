# Vérification des palettes client — 17 novembre 2026

Le fichier `dist/mir-client-colour-palettes.json` est une surcouche de présentation client. Il conserve les identifiants et les ensembles de couleurs du catalogue, les prix et les unités. Il ne modifie pas le catalogue partagé ni les interfaces internes. Les noms, groupes documentés, limites de compatibilité et références de source sont précisés pour 21 produits, soit 390 entrées de couleur.

## CanExel : offre actuelle et anciennes références

Le [nuancier officiel actuel](https://maibec.com/fr/revetement-dingenierie-canexel/couleurs-canexel/) comporte 16 couleurs :

- Deux tons : Charbon, Moka foncé, Scandinave, Bois de Santal, Acadia, Sierra, Barista, Falaise, Loup gris.
- Opaques : Toundra, Gris brume, Sable, Bleu minuit, Granit, Noir, Blanc.

La [page française des produits](https://maibec.com/fr/produits/canexel/) et la [brochure fabricant datée de juillet 2025](https://maibec.com/wp-content/uploads/2026/01/Maibec-CanExel_Brochure-07.2025_EN.pdf) confirment les ensembles suivants : VStyle, Ridgewood D-5 et Ced’R-Vue utilisent les 16 couleurs; Planche et couvre-joint reste limité aux 7 opaques. Les ensembles locaux correspondent déjà à cette offre. La surcouche ajoute `finishGroup` et les preuves, sans attribuer les deux tons au Board & Batten.

Une [brochure antérieure, avril 2025](https://maibec.com/wp-content/uploads/2025/05/Maibec-CanExel_Brochure-04.2025_FR.pdf), comporte encore 20 couleurs. Les quatre références supplémentaires sont Bois de grange, Renard roux, Rouge campagne et Yellowstone. Elles ne figurent plus dans le nuancier actuel de 16 couleurs. La page anglaise de produit conserve également un ancien compte de 18 pour VStyle; ce chiffre isolé ne suffit pas à ajouter des couleurs non identifiées au nuancier courant. L’offre actuelle retenue repose sur les noms de la page de palette, la page française et la brochure plus récente.

## Peinture de retouche CanExel existante

Les 20 choix de couleur déjà créés par `applyBoutiqueReview` sont conservés avec leurs identifiants exacts. La [page fabricant des accessoires](https://maibec.com/fr/produits/accessoires-canexel/) décrit une peinture de retouche assortie au revêtement. La [fiche détaillant de 284 ml](https://boutique.aluminiumbbouchard.ca/produit/peinture-de-retouche-pour-le-canexel-284ml/) répertorie actuellement 18 teintes, comprenant les quatre anciennes références, mais ne liste pas Charbon et Toundra. Ces deux teintes restent des choix MIR déjà présents, associés à la gamme actuelle; aucune présence en stock chez ce détaillant ou chez MIR n’est déduite.

Les 16 visuels du fichier `assets/products/mir-canexel-touchup/canexel-pots-16.webp` restent inchangés. Pour les quatre anciennes teintes, la fiche détaillant fournit des références de nuancier identifiées :

| Teinte | Source de référence de couleur |
| --- | --- |
| Bois de grange | [Swatch Barnwood](https://boutique.aluminiumbbouchard.ca/wp-content/uploads/2023/10/255_Maibec_CanExel_Barnwood_Swatch.jpg) |
| Renard roux | [Swatch Red Fox](https://boutique.aluminiumbbouchard.ca/wp-content/uploads/2023/10/255_Maibec_CanExel_RedFox_Swatch.jpg) |
| Rouge campagne | [Swatch Country Red](https://boutique.aluminiumbbouchard.ca/wp-content/uploads/2023/10/255_Maibec_CanExel_CountryRed_Swatch.jpg) |
| Yellowstone | [Swatch Yellowstone](https://boutique.aluminiumbbouchard.ca/wp-content/uploads/2023/10/255_Maibec_CanExel_Yellowstone_Swatch.jpg) |

Ces références sont des nuanciers, pas des photographies exactes des pots. Les téléchargements en lecture seule ont retourné HTTP/proxy 403 malgré l’autorisation réseau. Aucun contournement ni reconstruction de couleur n’a été effectué. La surcouche conserve donc `swatchUrl: null` et `hex: null` pour ces quatre choix, avec la provenance et `paletteStatus: legacy_touch_up_only`. Elle ne réutilise pas une couleur voisine ni un pot d’une autre teinte comme photographie exacte. Le groupe deux tons désigne le fini du revêtement auquel la retouche est assortie, pas une peinture qui recrée à elle seule le veinage.

## James Hardie : région et compatibilités

La bonne référence régionale est la [brochure fabricant Québec HS2533-QCF, juin 2025, distribuée par Gentek](https://www.gentek.ca/wp-content/uploads/sites/2/2025/06/HS2533_QC_FR_0625.pdf). Son nuancier Statement a été vérifié par son contenu indexé : 19 couleurs pour le groupe revêtement, et 5 couleurs pour le groupe HardieTrim. Les cinq Trim sont Blanc arctique, Pierre des champs, Écorce, Gris fer et Noir minuit. Les ensembles du catalogue sont identiques.

Les anciennes URL des couleurs pointaient vers le catalogue général Canada Est tout en portant une annotation Québec juin 2025. La surcouche corrige cette référence vers la brochure régionale réelle. Le téléchargement complet du PDF de 22 Mo n’a pas abouti dans l’environnement; les noms et la clé de disponibilité ont été vérifiés dans le contenu indexé du document. Les 19 fichiers de nuancier locaux existants restent conservés; ils n’ont pas été certifiés octet par octet avec un nouveau téléchargement.

Les réserves déjà présentes sur les profils lisses, les rives décalées et les formats Canada Est non listés dans le tableau Québec sont conservées. La palette régionale n’est pas présentée comme une garantie de disponibilité de toutes les combinaisons profil/fini/couleur. Aucune couleur Dream Collection américaine n’est ajoutée. Le kit ColorPlus existant n’est pas étendu automatiquement à partir du seul groupe de revêtements.

## St-Laurent

Le [rapport dédié](st-laurent-sources.md) vérifie les 24 couleurs actuelles et les cinq produits, avec la [palette fabricant](https://www.fabstlaurent.com/revetements-exterieurs/fibrociment/couleurs/). Les fichiers locaux sont présents et lisibles. Les 24 couleurs sont conservées comme palette de collection; `finishGroup` reste `null`, car les sources consultées ne classent pas chaque teinte individuellement en opaque ou deux tons.

Les pages produit ne publient pas une matrice exhaustive des 120 combinaisons couleur/profil/fini. La note client demande donc la confirmation de cette compatibilité. Le seul format de moulure local, 3½ po, figure dans les groupes opaque et deux tons; on ne transpose pas cette palette aux moulures plus larges. Le V-Groove est explicitement lisse. Aucune règle « deux tons implique texturé » n’est déduite de l’apparence des images.

## Formats client à masquer

Les seuls clins fibrociment de largeur physique 7¼ po présents sont :

- `hardieplank-select-725`;
- `hardieplank-smooth-725`.

Ils sont listés dans `clientHiddenProductIds` pour l’intégration client. Aucune référence fibrociment 5¼ po n’existe dans le catalogue. Les trois produits Maibec em+ dont la largeur réelle vaut 5¼ po sont en bois véritable et restent conservés. La mention 5/4 du HardieTrim est une épaisseur nominale; ce n’est pas une largeur de 5¼ po. Les clins Hardie et St-Laurent de 6¼ et 8¼ po restent conservés.

## Vérification du dataset

Le [rapport de validation](palette-data-validation.json) contrôle les identifiants uniques, la conservation des ensembles de couleurs par produit, la présence des fichiers locaux référencés, les 7 seules teintes opaques du Board & Batten, les 5 couleurs HardieTrim et les 20 choix de retouche existants. L’empreinte SHA-256 du catalogue partagé est inchangée. Aucun prix, stock, compte, formulaire ou service distant n’a été écrit pendant cet audit.
