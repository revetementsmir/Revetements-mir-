# Boutique MIR — miniatures, formats et nuanciers

## Ce qu’il faut faire

Correction client demandée par Frederick le 17 novembre 2026 : uniformiser les miniatures des catégories, retirer les clins fibrociment 7,25 et 5,25 po de l’offre MIR, améliorer le visuel Kaycan, rendre tous les choix de couleur accessibles et conserver le même échantillon lorsque la couleur change. Retrouver les pots de retouche CanExel existants. Source de départ : `8bf0bdf`, branche `codex/client-prestige-20261117`.

## Changements réalisés

- Six cadres de catégorie de 48 × 48 px, cinq vrais détails de matière et un accessoire entier. Couverture Kaycan remplacée par l’échantillon officiel Urbanix « Récolte de Cèdre » déjà présent localement; il ne s’agit pas d’une photo de chantier.
- Références `hardieplank-select-725` et `hardieplank-smooth-725` exclues des pages client, de la recherche et des nouveaux ajouts. Aucune référence de clin fibrociment 5,25 po n’était présente. Les largeurs de bois Maibec 5,25 po et l’épaisseur HardieTrim 5/4 ne sont pas confondues avec cette correction.
- Tous les choix sont présents dans les cartes et fiches, avec leur nom et une cible tactile. Les palettes habituelles sont ouvertes; les très grands nuanciers peuvent être repliés. Les champs, codes fabricant, quantités et valeurs d’unités restent canoniques.
- CanExel : 7 opaques et 9 deux tons pour les trois profils compatibles; Board & Batten limité aux 7 opaques. James Hardie : 19 couleurs, 5 pour Trim. St-Laurent : 24 couleurs, avec les réserves de compatibilité de finition conservées. Les nuanciers étaient déjà complets dans les données; leur accès, leur regroupement et leur rendu ont été corrigés.
- Adaptateur client pour les échantillons : base, profil, cadrage, masque et grain constants. Les tables de couleur changent seules. Les deux tons CanExel et les variations du bois St-Laurent utilisent la distribution de la vraie référence de teinte. Les illustrations d’écran restent indiquées comme telles.
- Échantillon visible pendant le choix des couleurs, y compris en téléphone portrait. Photo de l’accueil, prix et catalogue partagé conservés.
- Les 16 pots CanExel existants sont conservés et sélectionnables. Quatre anciennes teintes restent proposées pour la retouche avec une photo du contenant et une mention explicite que la couleur n’est pas représentée.
- Un article retiré reste visible dans un ancien panier avec une action de retrait. Il est exclu de l’export et bloque la préparation d’une estimation jusqu’à correction; aucune suppression silencieuse du panier.

## Vérifications

- Sources et nuanciers : `palette-sources.md`, `palette-data-validation.json`, `st-laurent-sources.md`. Dataset client indépendant : `dist/mir-client-colour-palettes.json`.
- Rendu : `../client-siding-colours-20261117/renderer-review.md`. 19 profils préparés, dont 3 références masquées; 360 associations profil/couleur testées. 282 recettes et 6 SVG du moteur partagé restent strictement identiques à la source de départ.
- Langue : `language/README.md`, 8 fiches réellement parcourues FR → EN → FR. Noms fabricant et valeurs d’unités préservés; 390 notes de couleur vérifiées. Contrats i18n et quantités existants réussis.
- Performance : `../prestige-20261117/performance/shop-cpu-before-after.json`. Sous profilage local, même contenu de 76 cartes et 1 484 options : 31,63 s avant, 6,25 s après mise en cache du tri. Ce comparatif ne mesure pas le réseau de production. Aucun changement du module i18n.
- Recette finale : **70 scénarios consolidés réussis**, voir `QA-RESULTS.md` et `results-validated.json`. PC 1440, tablette 834, téléphone 390 et contrôle des libellés à 350 px. Trois anciennes attentes de texte du test panier ont été corrigées et rejouées, sans masquer les rapports intermédiaires. Aucune erreur applicative restante.
- Captures : galerie ciblée `dist/boutique-colours-galerie.html`, 21 vues réelles. Galerie générale actualisée à 114 captures, dont 16 renouvelées. Les captures AVANT utilisent un instantané Git de la source de départ; les captures APRÈS proviennent de vrais écrans navigateur. Pour les mobiles avec échantillon fixe, les vues de viewport sont les références visuelles; les captures intégrales du navigateur peuvent déplacer l’élément sticky.

## Limites et périmètre préservé

Tous les essais navigateur bloquent les requêtes externes avant transfert et toute méthode autre que GET/HEAD. Aucun envoi réel, écriture Supabase, paiement ou activation Google. Les prix en direct ne sont pas revérifiés dans cet aperçu isolé. Responsive vérifié par émulation Chromium, sans appareil physique ni Safari.

Quatre anciennes teintes CanExel (Bois de grange, Renard roux, Rouge campagne, Yellowstone) ont une référence détaillant, mais pas de photo locale de pot ni de couleur vérifiable dans les fichiers accessibles. Les tentatives de téléchargement public ont reçu HTTP/proxy 403; aucun contournement, aucune teinte inventée. Les 16 couleurs de la gamme actuelle sont couvertes.

SEO/GEO : travail sur des pages client destinées à une future publication; aperçu TEST privé, noindex et restrictions de connexion conservés. Aucun changement d’indexation, aucune promesse de stock, de prix, de classement ou de citation.

MOON 1.3.11 vérifié sur Atelier pour cette demande. Mission existante `49b7ccb3-3458-4c2b-9360-c9522be1ffdd` réutilisée. Le helper officiel de transfert d’assets Atelier retourne encore HTTP 303 vers une connexion au 17 novembre; aucune proposition visuelle transférée n’est prétendue. Les preuves restent disponibles dans le dépôt et l’aperçu TEST.
