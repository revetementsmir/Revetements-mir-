# Conservation du Studio et des pages approuvées

Sur les fichiers finaux de l’application, Chromium a exécuté 16 groupes de régression et produit 57 captures : commandes 2D/3D, façades, plein écran, palettes réelles, choix et caméra après rechargement, import d’un PDF synthétique de 67 pages et reprise sur trois formats, exports SVG/PDF/JSON, brouillon d’estimation sans transport, contextes exclus et clavier à 360×225.

L’accueil et Particuliers ont été comparés sans masque en FR/EN sur 1440×900, 834×1194 et 390×844 : zéro pixel modifié dans les 12 comparaisons. Les 1651 autres fichiers protégés sont identiques à la base du lot. Hors helper et options PDF isolés, le code du moteur plan-app est strictement identique.

Les quatre sélections directes 2D/3D sur PC et téléphone passent aussi ; les quatre fichiers de tests métier existants passent. Résultats : `results.json`, `picking.json`, `protected-files.json`. Les captures complètes sont produites par la même commande dans l’artefact GitHub Actions.

```sh
MIR_STUDIO03_PHASE=before node tests/mir-studio-03-browser.cjs
MIR_STUDIO03_PHASE=after node tests/mir-studio-03-browser.cjs
node tests/mir-studio-03-picking.cjs
node tests/mir-studio-03-boundaries.cjs
node --test --test-concurrency=1 tests/mir-studio-interactions.cjs tests/mir-studio-grounds.cjs tests/mir-studio-wall-sections.cjs tests/mir-plan-sheet-detection.cjs
```

Toutes les requêtes de cette recette sont des GET locaux ; aucun transport réel n’est permis. Ces tests ne certifient pas la justesse géométrique de tout PDF utilisateur ni les travaux concurrents non intégrés.
