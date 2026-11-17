# Boutique — miniatures, Kaycan et couleurs

## État initial préservé

Commit `8bf0bdf8ec17c03c79b174afb84fc637b6d89e18`, extrait dans `/tmp/mir-boutique-colours-before-20261117/dist`. Quinze captures Chromium réelles en français : fabricants, produits, carte avec couleurs ouvertes, fiche CanExel Ridgewood et zone des couleurs; PC 1440×1100, tablette 834×1112, téléphone 390×844. Les appels hors serveur local sont bloqués. Aucun formulaire n’a été envoyé.

## Miniatures de catégorie

Nouveau fichier isolé `dist/mir-prestige-category-thumbnails.css`, limité à la navigation catégorie du parcours client. Cadres 48×48, alignement constant, textures cadrées et accessoires entiers. Les marges source connues de l’accessoire sont traitées via le cadrage du catalogue existant, sans retoucher les fichiers image.

`category-thumbnail-sources.json` propose cinq détails de matière déjà présents au catalogue. Ce choix évite les bandes de studio des rendus SVG et la faible lisibilité d’un dessin complet dans une miniature. La photo de l’accessoire reste entière. Aucun changement de photo produit ni de disponibilité n’est proposé par ce mapping.

Contrôle local du CSS et du mapping injectés sur le snapshot : 18 cadres sur 18 à 48×48, aucun débordement horizontal. L’audit indépendant a corrigé la proposition initiale pour Vinyle : la miniature utilise bien `gentek-vinyl-9.jpg` (Sequoia Select) et non l’échantillon aluminium initialement proposé. Les captures finales contrôlent explicitement ce chemin. Les captures intermédiaires régénérables ont été retirées pour conserver les vrais états AVANT et APRÈS.

## Couverture Kaycan retenue pour proposition

`assets/catalogue-swatches/kaycan-urbanix-recolte-de-cedre-27d78710.webp` est un échantillon officiel Urbanix, format original 400×400. Il peut illustrer la collection Kaycan avec un cadrage matière cohérent et doit être décrit comme un échantillon, non comme une photo de pose. La provenance complète et les alternatives inspectées sont dans `kaycan-cover-review.json`.

Une photo Urbanix plus récente a été trouvée sur la page officielle, mais le téléchargement direct autorisé a reçu un refus 403 du proxy. Le fichier n’a pas été intégré ni présenté comme visuellement validé. Aucun proxy alternatif n’a été utilisé.

## Reproduire la proposition isolée

```sh
node docs/verification/boutique-colours-20261117/capture-before.cjs
node docs/verification/boutique-colours-20261117/check-category-css.cjs --mapped
```

## Livraison intégrée

La galerie `dist/boutique-colours-galerie.html` réunit 21 captures réelles : sept états sur PC, tablette et téléphone. Quinze vues complémentaires permettent d’ouvrir directement le nuancier; neuf liens renvoient aux états initiaux correspondants. Toutes les captures sont prises dans la fenêtre du navigateur; aucune capture fullPage n’est utilisée, afin de conserver le comportement réel du visuel fixe pendant le défilement.

États : fabricants avec l’échantillon Kaycan, cartes et palette complète, Ridgewood initial, Ridgewood Sierra, St-Laurent Ipé, pot CanExel Sierra et kit de retouche Hardie. Les sélections de couleur proviennent de clics sur la page réelle. Le kit Hardie conserve son action indisponible lorsque sa fiche est incomplète.

La galerie générale passe à 114 captures : seize vues Boutique / Catégorie / Recherche / Fiche produit FR/EN renouvelées, dont deux nouvelles vues Produit EN sur tablette et téléphone. Les autres pages restent celles du lot antérieur. Le contenu de la galerie ne remplace pas les rapports de recette métier des autres agents.

`boutique-colours-autonome.html` reprend les 21 vues et leurs détails, avec les images intégrées une seule fois en data URI, styles et scripts locaux. Les liens vers l’application sont retirés. Le fichier régénérable est exclu de Git par chemin exact. Le contrôle via injection HTML dans Chromium confirme 21 images décodées, aucun appel réseau, aucun lien applicatif et un agrandissement fonctionnel; la navigation directe `file://` est restreinte par la politique du navigateur de recette.

```sh
node docs/verification/boutique-colours-20261117/capture-final.cjs
node docs/verification/boutique-colours-20261117/export-gallery.cjs
node docs/verification/boutique-colours-20261117/verify-gallery.cjs
node docs/verification/boutique-colours-20261117/refresh-global-gallery.cjs
node scripts/export-prestige-gallery.cjs \
  --manifest docs/verification/prestige-20261117/captures-gallery-manifest.json --archive
```

Les deux scripts de capture acceptent `--shop-only` pour renouveler uniquement les états boutique tout en conservant les preuves produit.
