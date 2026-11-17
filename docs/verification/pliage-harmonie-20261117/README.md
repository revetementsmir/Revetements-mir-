# MIR — pliages, échantillons et PDF

Travail TEST du 17 novembre 2026, branche `codex/pliage-harmonie-20261117`, base `3573d90`.

## Périmètre autorisé

- Parcours de pliage client et employé : gestes à 45°/90°, retour écrasé à 180° et deux angles consécutifs distincts; quantité, matériau, couleur avant panier.
- Échantillons rectangulaires de revêtement dans la boutique et le magasin, notamment Juste du Pin, avec les sources réelles disponibles.
- Lisibilité et intégrité des PDF de commande, pliage et estimation.
- Aperçu TEST protégé, captures réelles PC/tablette/téléphone et documents de recette fictifs.

La photo de maison, les prix, les profils métier et le moteur Studio PDF→3D sont conservés. Aucune écriture Supabase, demande réelle, commande, courriel ou production. Les vues employé utilisent une fixture locale, sans authentification réelle ni changement de permissions.

## Coordination

MOON 1.3.11 vérifié; BOSS GOD MODE choisi explicitement. Méthodes métier, ergonomie, harmonisation, qualité et périmètre SEO consultés dans Atelier. Quatre agents de collaboration locaux travaillent réellement en parallèle; aucune exécution autonome de dispatch Atelier n'est revendiquée. Un seul intégrateur conserve la responsabilité de la branche et de l'aperçu.

| Lot | Agent local | Fichiers réservés |
| --- | --- | --- |
| Géométrie | client_tools | production-app.js, mir-profile-recognition.js |
| Parcours | cart_estimate | pliage.html/js, mir-client-pliage.css, mir-client-pliage-viewport.js, production.html, mir-pliage-journey.css |
| Échantillons | palette_preview | rendu commerce.js, material-preview.js, mir-client-siding-previews.js |
| PDF | public_pages | mir-selection-pdf.js, mir-dossier-pdf.js, mir-panel-po-pdf.js, annotated-pdf.js; libellé anglais hem seulement dans production-model.js |
| Intégration | root | catalogue, magasin, traductions communes, galerie, livraison; production-model.js après coordination |

Les autres missions Atelier et les autres worktrees sont préservés. Les captures et résultats avant/après sont rangés dans `geometry/`, `journey/`, `samples/` et `pdf/`.

## Critères de recette

Reproduire les défauts avant correction; vérifier les gestes et la distinction des plis après correction. Vérifier les choix requis, retours, modification et conservation du panier. Contrôler visuellement les PDF rasterisés, les textes longs et la pagination. Contrôler les formats Chromium 1440, 834 et 390 pixels; ces contrôles ne valent pas essai sur appareils physiques. Bloquer les requêtes externes et les écritures réseau pendant les tests.

## Résultats intégrés

- Accrochage : le calcul angulaire précède l'arrondi de grille pour les clics et taps comme pour les glissés. Pas de 45° relatifs au côté précédent, hystérésis conservée. Le retour écrasé est proposé aussi lorsque le petit rebord est tracé en premier. La reconnaissance exige un vrai `mode: hem`, sans confondre un angle signé de 174° ou deux angles de 90°.
- Confirmation tactile : le clic natif transmis par une carte au bouton radio qu'elle contient est accepté après un vrai appui. Il était auparavant bloqué par la protection contre les clics résiduels du dessin; la protection reste active pour un clic sans nouvel appui. Le test a reproduit le défaut en touchant le dessin de la carte plutôt que le petit bouton radio.
- Parcours : quantité vide et obligatoire dans le formulaire rapide, matériau et couleur explicitement choisis, mesures/brouillons conservés par profil. Les commandes de navigation après ajout ouvrent réellement le panier, un nouveau dessin ou les modèles. L'édition revient au dessin visible. Les champs de mesure tiennent dans l'iframe employé et sur téléphone.
- Échantillons : Äkta utilise sa vraie photo plate, Bosco un détail de sa photo de pose et Bluhouss 307 un détail de son aperçu fabricant original. Aucune nouvelle photographie prétendue. Les sources d'origine restent accessibles. Un même grain et un même cadrage sont conservés au changement de couleur; le magasin utilise le même adaptateur sans modifier le catalogue métier. Les cadres de cartes sont mesurés à 3:2.
- PDF : en-têtes et références longs conservés, pages de suite lisibles, quantités non répétées comme nouveaux articles, palette anthracite/champagne autour du logo officiel. Les dessins et données de fabrication restent distincts des retouches de mise en page.

Preuves détaillées : [géométrie](geometry/README.md), [échantillons](samples/README.md), scénarios et captures dans `journey/`, exports et assertions dans `pdf/`.

## Limites

- Recette Chromium avec souris et émulation tactile; aucun appareil physique, compte employé réel, RLS ou envoi distant testé dans ce lot.
- L'aide et les autres pages de la refonte antérieure sont conservées; ce lot n'est pas une nouvelle certification exhaustive du bilinguisme du site.
- La photo jaune de scie-cloche est visible dans la conversation, mais aucun fichier original, identifiant téléchargeable ou chemin n'est exposé dans l'environnement. Elle n'a donc pas été intégrée; aucune image recréée n'est présentée comme cet original. Les références produit et les diamètres existants sont conservés.
- La copie des captures dans Atelier est bloquée par le helper officiel : HTTP 403, confirmé le 17 novembre dans `atelier-upload-helper.json`. Les méthodes et missions Atelier sont accessibles; aucun transfert d'images réussi n'est revendiqué. Les preuves sont livrées dans la branche et la galerie TEST protégée.
