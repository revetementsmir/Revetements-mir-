# Boutique MIR — cadrage des images, 17 novembre 2026

## Aperçu TEST livré

- [Boutique corrigée](https://mir-studio-test-pj2roqzh6-desk17.vercel.app/test/boutique.html?view=brands)
- [Comparatif avant/après, PC, tablette et téléphone](https://mir-studio-test-pj2roqzh6-desk17.vercel.app/test/boutique-images-comparaison.html)
- [Galerie complète du parcours client](https://mir-studio-test-pj2roqzh6-desk17.vercel.app/test/prestige-captures.html)

Déploiement Vercel Preview protégé, état READY, source `68bb0cdaa8c96c3b6a1c3be957686c1ba5e8ecb9`. Les quatre chemins vérifiés répondent HTTP 200 et portent les protections CSP et noindex; voir `hosted-preview.json`. Les tests navigateur et captures correspondent à cette source locale. Aucun déploiement en production.

## État initial vérifié

Source figée depuis le commit indiqué dans `before-revision.txt`, copiée sous `/tmp/mir-boutique-images-before-20261117/dist` avant les corrections. Aucun changement applicatif dans cette capture. Les deux vues réelles ont été ouvertes : `boutique.html?view=brands` et `boutique.html?view=all`.

Douze captures : vue au sommet et vue centrée sur la grille, pour PC 1440×1100, téléphone 390×844 et tablette 834×1112. `before-audit.json` conserve les dimensions réelles DOM, sources d’image et dimensions intrinsèques des 20 cartes fabricants / 78 cartes produits. Les appels externes sont bloqués avant transfert; aucune demande ni mutation réelle.

## Défauts observés avant correction

1. **Cadres au ratio variable.** Sur PC, le cadre fabricant mesure 421×270 px et le cadre produit 421×300 px malgré un `aspect-ratio: 4/3`. Sur tablette, ils mesurent 379×270 / 379×290. Seul le téléphone respecte ici 354×265,5. Des hauteurs fixes contredisent le ratio annoncé.
2. **Boîtes d’image plus hautes que leur cadre.** Hardie et JDP mesurent réellement 421×421 px dans un cadre fabricant haut de 270 px; Kaycan 421×443. Le débordement est masqué, ce qui coupe le contenu. Le `object-fit` indiqué ne corrige pas une boîte d’image dimensionnée hors du cadre.
3. **Échelles de matière hétérogènes.** Maibec (source 1030×350) et CanExel (1069×313) restent de fines bandes horizontales au milieu du cadre; Hardie occupe toute la surface. L’inspection des fichiers par l’audit assets confirme que ces trois sources sont pleines : leurs bandes vides viennent du `contain` et du cadre CSS, pas de blancs incorporés à ces fichiers.
4. **Types de visuels mélangés.** Texture Hardie, échantillon sphérique JDP, dont le fond clair appartient au fichier, coupé en bas, photo de soffite installé Kaycan, produit détouré Gentek et photo de maison LP SmartSide apparaissent côte à côte sans cadrage adapté à leur rôle.
5. **Pièces et emballages à préserver.** La carte produit HardieTrim, source 54×245, mesure 421×1643 px dans son cadre haut de 300 px : elle est lourdement rognée. Une règle de remplissage destinée aux textures ne doit pas couper ces objets, profils ou accessoires.

L’alignement des textes, prix et actions de la première rangée est déjà cohérent; le problème prioritaire concerne le cadrage et la classification des médias. Les styles applicatifs sont corrigés séparément par l’intégrateur. Les propriétés source des produits et les prix ne doivent pas être changés pour uniformiser ces vues.

## Reproduire les captures

```sh
node docs/verification/boutique-images-20261117/capture-browser.cjs \
  --phase before --source /tmp/mir-boutique-images-before-20261117/dist
# Après correction : même navigateur, mêmes tailles et mêmes vues
node docs/verification/boutique-images-20261117/capture-browser.cjs --phase after
```

Le script sert uniquement les fichiers locaux sur 127.0.0.1. Il vérifie l’absence d’erreur JavaScript et de débordement horizontal global.

## Résultat après correction

- Les 20 cartes fabricants et les 78 cartes produits ont un cadre commun 3:2 aux trois largeurs. Les textures remplissent leur cadre; les pièces, accessoires et échantillons sphériques restent entiers. Les photos proviennent du catalogue existant.
- Audit détaillé `image-qa-results.json` : **303 cartes** contrôlées (294 cartes boutique et 9 produits associés), **24 changements de couleur**, trois comparaisons du média principal BECK avec l’état initial; aucune anomalie restante. Le dernier cas de nuance JDP Äkta conserve désormais la sphère complète.
- Navigation `navigation-results.json` : **6/6 parcours réussis**, français et anglais canadien sur PC 1440, tablette 834 et téléphone 390. Vérifications : fabricant → produit → retour à la collection, recherche CanExel (5 résultats), catégorie Fibrociment, filtre James Hardie, couleur, unité, quantité 2, ajout au panier, compteur, rechargement et langue conservée. Aucune erreur JavaScript ni débordement horizontal détecté.
- Galerie ciblée : `dist/boutique-images-comparaison.html`, **12 comparaisons / 24 captures** de la boutique réelle (fabricants et produits, sommet et grille, trois formats). `comparaison-autonome.html` est régénérable et reste hors Git. Les vues anglaises et les étapes du parcours figurent également dans ce dossier.
- Galerie générale : dix captures Boutique, Recherche et Catégorie actualisées; l’ensemble reste à **112 captures**. Les autres pages n’ont pas été recapturées pour ce correctif ciblé.

Les requêtes externes et toute méthode autre que GET/HEAD ont été bloquées avant transfert. Les prix en direct n’ont donc pas été vérifiés; les écrans montrent les informations et états de repli disponibles localement. Aucune estimation, commande serveur, écriture Supabase, connexion ou paiement réel n’a été effectué. Le panier testé est local.

```sh
node docs/verification/boutique-images-20261117/verify-navigation.cjs
node docs/verification/boutique-images-20261117/create-comparison.cjs
node docs/verification/boutique-images-20261117/verify-comparison.cjs
node docs/verification/boutique-images-20261117/refresh-global-gallery.cjs
node scripts/export-prestige-gallery.cjs \
  --manifest docs/verification/prestige-20261117/captures-gallery-manifest.json --archive
```
