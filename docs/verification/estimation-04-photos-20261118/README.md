# Estimation — nouvelles photos Maison et Rénovation

Demande de Frederick du 18 novembre 2026 : remplacer la maison déjà utilisée sur Particuliers et refaire la photo Rénovation. Base relue et confirmée localement et sur GitHub : `febceb210936a1fbdf250ef5c874883892abcbb2`. Branche : `codex/estimation-04-photos-20261118`.

## Résultat

- Maison : nouvelle illustration originale d’une maison québécoise claire à deux étages, entrée bois, maçonnerie et garage double élargi à sa demande, différente de la maison de Particuliers.
- Rénovation : nouvelle illustration d’une maison en cours de remplacement du revêtement extérieur : partie neuve anthracite, membrane et fourrures apparentes, ancien parement, échafaudage et matériaux sur l’entrée.
- Deux WebP carrés de 1254 × 1254. Maison retouchée avec image_gen pour agrandir le garage. Les deux résultats finaux sont seulement encodés en WebP, sans recadrage ni redimensionnement local. Provenance, prompts et SHA-256 dans `assets.json`.
- Aucun HTML, CSS, JavaScript, service ou formulaire modifié. Chalet, Multilogement, Accueil, Particuliers et espaces employés restent intacts. Le workflow existant inclut la nouvelle branche, sans retrait ni modification de contrôle.

## Vérifications exécutées avant le commit

Chromium 155.0.8059.79 : 1280×800, 1440×900, 1920×1080, 834×1194 et 390×844, en FR et EN. 34 captures avant et 34 après; les principales captures françaises sont jointes ici. Les rapports complets `before/results.json` et `after/results.json` contiennent la géométrie, les empreintes des ressources et les résultats.

- 10 groupes d’interaction avant et 10 après réussis : quatre sélections, erreur de municipalité, Continuer, retour et valeurs conservées.
- 34 comparaisons : zéro pixel différent hors des rectangles des deux images volontairement remplacées. Les 20 captures Accueil/Particuliers sont strictement identiques, sans masque.
- Les 43 autres ressources chargées sont identiques octet pour octet. Seuls les deux fichiers image diffèrent parmi les 45 ressources contrôlées.
- Aucune erreur JavaScript, console ou HTTP, ni transport réel.
- Inspection réelle des captures PC et téléphone : maison et garage double identifiables, chantier de Rénovation lisible. Le `object-fit` existant recadre légèrement les carrés à 1280 px et sur tablette; les détails utiles restent visibles. Aucun changement de géométrie n’a été introduit.

Les tests et captures du build TEST exact ainsi que le reçu READY sont livrés séparément après le commit, pour conserver son SHA exact. Les résultats locaux ne sont pas présentés comme un test Chromium sur Vercel.

## Méthodes et limites

MOON 1.3.11 vérifié sur Atelier à `2026-11-18T12:20:28.811Z`, BOSS GOD MODE, Graphisme, Harmonisation et Qualité réellement consultés. Root assure l’intégration; les collaborateurs ont réalisé la création Rénovation et la vérification indépendante. Aucun accord visuel de Frederick n’est présumé.

Les images sont des illustrations, pas des réalisations MIR documentées. Responsive vérifié par émulation Chromium, pas sur appareils physiques. Publication autorisée seulement en TEST protégé, sans envoi réel, activation de backend ou production. SEO/GEO non applicable à cet aperçu privé/noindex; aucun accès ni indexation modifié. La proposition visuelle Atelier antérieure reste en préparation : son helper de transfert avait renvoyé une page de connexion; les preuves sont livrées dans le dépôt et le dossier de livraison.
