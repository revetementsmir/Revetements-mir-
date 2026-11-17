# Échantillons de revêtement fixes — 17 novembre 2026

Implémentation gelée : `mir-client-siding-previews.js` expose `await MIRClientSidingPreviews.prepare(materials)`. L’appel retourne un nouveau tableau avec les seuls matériaux client compatibles préparés; le catalogue partagé, les dimensions, les prix et les données d’origine restent intacts.

Couverture du moteur de préparation : **19 profils / 360 associations profil-couleur**, y compris les deux références Hardie 7,25 po retirées de l’offre client et Hardie Board & Batten, déjà masqué. L’offre publique comprend **16 profils visibles**. Les règles de visibilité et de compatibilité restent celles du catalogue; cette préparation ne rend aucun produit caché disponible.

Une base locale est choisie une seule fois par profil. Les changements de couleur conservent exactement le SVG, les deux images, leur source, le masque, le filtre, le cadrage et le grain; seules les tables de couleur changent. Les nuances opaques conservent les reliefs du spécimen. Les nuances CanExel deux tons et les distributions de couleur St-Laurent conservent leurs variations mesurées dans les nuanciers locaux. Aucun groupe commercial « deux tons » n’est inventé pour St-Laurent. Le centre des pastilles est échantillonné pour exclure les badges et légendes fabricant.

Les profils Hardie utilisent leur texture locale correspondante : aucune planche 6,25 po n’est réétiquetée 8,25 po. Les bases 6,25 po déjà approuvées et Ridgewood D-5 sont réutilisées. Pour trois profils St-Laurent sans photo isolée, le rendu utilise un détail fixe du revêtement dans la photo de pose correspondante. Le système composé Hardie Board & Batten montre son composant HardiePanel lisse; l’absence des couvre-joints dans cet échantillon est indiquée dans sa note de source.

Vérifications : `tests/mir-client-siding-previews-browser.cjs` passe sur les 360 associations; identité DOM et géométrie inchangées, tables distinctes par nuance, grain non aplati, entrée d’origine inchangée. Aucune requête externe. La deuxième préparation utilise le cache sans nouvelle requête. Première préparation de l’ensemble local : environ 2,4–2,7 secondes dans Chromium. Les caches ne gardent que de petites statistiques et tables, pas les images ni les tableaux de pixels décodés.

Régression du rendu interne : les 282 recettes et 6 rendus SVG applicables aux 128 matériaux partagés ont été comparés à `8bf0bdf8ec17c03c79b174afb84fc637b6d89e18` et restent identiques. Preuve : `internal-render-regression.json`. Rendus réellement capturés et inspectés : `fixed-siding-specimens.png`; résultats détaillés : `renderer-results.json`.

Limites : couleurs d’écran indicatives, avec les variations et l’éclairage des sources fabricant disponibles. La photo de détail ne représente pas les dimensions commandées. Aucun fichier image source n’a été retouché, aucun moteur métier ni écran interne n’a été modifié, aucun envoi réel n’a été effectué.
