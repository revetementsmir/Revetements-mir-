# Hors périmètre — preuve de conservation

Recette locale exécutée le 18 novembre 2026 sur Chromium `155.0.8059.79`.

**Résultat : 1 653 fichiers protégés identiques ; quatre comparaisons visuelles à zéro pixel différent.** Les huit PNG avant/après sont également identiques octet pour octet, par paire.

## Base et méthode

- Base immuable : `e58964cd8937766d2457904d2d7d625d1bc7df5e`.
- Les 1 660 fichiers `dist` de la base sont inventoriés par `git ls-tree`. Le contenu courant de chacun est comparé à son empreinte de blob Git ; une empreinte SHA-256 de chaque fichier protégé figure également dans `file-manifest.json`.
- L’allowlist explicite autorise exactement sept fichiers existants et cinq nouveaux modules de pliage. Aucun autre ajout, retrait ou changement n’est admis.
- Le serveur local avant sert les octets par `git show <base>:dist/<fichier>`, sans utiliser un autre worktree. Le serveur après sert les fichiers du lot courant. Les 30 ressources réellement chargées ont les mêmes SHA-256 avant/après.
- La vraie route Particuliers est `maison.html`, liée par « Pour ma maison » dans `index.html`.
- Sessions neuves, français canadien, aucune donnée client, animations désactivées pour la capture, images visibles et polices attendues avant capture.
- Seuls les GET vers le serveur loopback sont autorisés par le navigateur. Aucun accès externe ni requête non-GET n’a été tenté. Aucune erreur JavaScript, console ou HTTP.

## Captures réelles

| Page | Format | Avant | Après | Différence |
| --- | --- | --- | --- | ---: |
| Accueil | 1440 × 900 | [PNG](index-1440-before.png) | [PNG](index-1440-after.png) | 0 pixel |
| Particuliers | 1440 × 900 | [PNG](maison-1440-before.png) | [PNG](maison-1440-after.png) | 0 pixel |
| Accueil | 390 × 844 | [PNG](index-390-before.png) | [PNG](index-390-after.png) | 0 pixel |
| Particuliers | 390 × 844 | [PNG](maison-390-before.png) | [PNG](maison-390-after.png) | 0 pixel |

Il s’agit de captures du viewport, sans montage ni retouche. L’accueil PC et Particuliers téléphone ont aussi été ouverts et inspectés visuellement. Cette preuve porte sur les deux portes demandées en FR et sur les fichiers hors périmètre ; elle ne prétend pas recertifier tous les parcours du site ou un appareil physique.

## Exécution reproductible

```sh
node tests/mir-pliage03-boundaries.cjs
```

Dépendances : `playwright`, `pngjs`, Chromium local. `MIR_CHROMIUM_BIN` peut remplacer `/usr/bin/chromium`. `MIR_PLIAGE03_OUT` choisit le dossier de sortie parent ; le test y ajoute `/protected`.

Exécuter avant le builder de galerie : celui-ci crée une archive ignorée par Git dans `dist`. Le premier passage a correctement refusé `prestige-captures.tar.gz`, hors allowlist ; root l’a déplacée hors du dépôt, puis la recette complète a réussi. Ce diagnostic initial est conservé dans `initial-builder-artifact.json`, sans assouplissement du test.

Preuves machine : [résultats finaux](results.json), [empreintes des fichiers](file-manifest.json). Aucun fichier applicatif n’a été modifié par cette recette.
