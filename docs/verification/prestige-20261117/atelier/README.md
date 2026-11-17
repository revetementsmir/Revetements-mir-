# Paire Boutique pour la revue visuelle

Format identique : 1440 × 1000 pixels, Chromium réel.

- `boutique-before.png` : copie binaire de `../before/boutique.png`, état initial avant refonte, boutique sur l’annuaire des fabricants.
- `boutique-after.png` : boutique refondue au démarrage, grille de produits désormais présentée en premier.
- `boutique-after-fabricants.png` : même présentation refondue après le bouton « Par fabricant », pour comparer les mêmes fabricants à l’état initial.

L’après est un état de travail et doit être recapturé après les derniers correctifs avec :

```sh
node docs/verification/prestige-20261117/atelier/capture-boutique.cjs
```

Le script sert les fichiers du projet sur 127.0.0.1, bloque les requêtes externes avant transfert et n’envoie aucun formulaire. Il conserve les résultats dans `boutique-pair.json`. Aucun envoi dans Atelier n’est revendiqué : ces fichiers sont prêts pour transfert uniquement. La galerie et l’aperçu TEST constituent les livrables principaux.
