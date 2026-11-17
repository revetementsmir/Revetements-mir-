# Copies de recette reproductibles

Les originaux dans `tests/` restent inchangés. Les `.patch` explicitent chaque différence. Tous les harnais bloquent les requêtes externes et les méthodes autres que GET.

- `legacy-original-guarded.cjs` : même scénario/assertions, seulement chemins et blocage réseau.
- `legacy-first-paint-one-pixel.cjs` : tolérance maximale 1 px sur les deux comparaisons de coordonnées uniquement. Cet essai reste rouge à 428 px.
- `baseline-first-paint-360.cjs` et `baseline-first-paint-428.cjs` : fichiers HTML/JS/CSS servis depuis le commit 3573d90, assertions strictes conservées, premier écran uniquement.
- `legacy-functional-current-shell.cjs` : neuf parcours fonctionnels, bloc first-paint isolé ; remplace uniquement l’ancien repère de menu mobile par l’unique repère actif de la navigation actuelle. Assertions de données inchangées. Consulter le journal de résultat, sans déduire un PASS de la présence de la copie.
- `field-refresh-guarded.cjs` : régression employé originale, chemins et blocage réseau seulement.

Depuis la racine du dépôt :

```sh
MIR_CLIENT_PLIAGE_PROOF_DIR="$PWD/docs/verification/pliage-harmonie-20261117/journey/regression-client" node docs/verification/pliage-harmonie-20261117/journey/harnesses/legacy-functional-current-shell.cjs
node docs/verification/pliage-harmonie-20261117/journey/harnesses/field-refresh-guarded.cjs
node tests/mir-pliage-harmonie-journey-browser.cjs
```

Chromium `/usr/bin/chromium`, module Playwright et permission d’écoute localhost nécessaires. Aucun service externe nécessaire.
