# Référence graphique et recette — application MIR

## Périmètre

La demande porte sur Commande C02, Messages M08 et Plus P10, avec la charte de l’accueil PC MIR TEST. L’accueil de l’application et son Punch conservent leur présentation approuvée. Le parcours de pliage doit reprendre les quatre étapes du client dans le contexte de l’employé ou du chef d’équipe.

Référence de départ : `dd5bf49701aea2c3ac5fa46712b9fc94a1acd89e`. Son arbre est identique à la base locale `c4f6b608b7d9229c65dc478e4e1aabfd0f63152d`. Cette base contient le parcours client approuvé `74d94d4f4eaeb8ad88e50399ab17e5ea1270bf68` et les accueils/Punch de la PR45. Les fichiers publics ci-dessous sont identiques à la base de référence au moment de la préparation de la recette.

## Charte vérifiée dans les sources

| Élément | Valeur | Source dans `dist/` |
| --- | --- | --- |
| Anthracite du héros et de l’en-tête | `#242522` | `mir-prestige.css`, `mir-prestige-editorial.css` |
| Texte clair | `#f4f1ea` | `mir-prestige-editorial.css` |
| Accent champagne | `#bda889` | `mir-prestige.css`, `mir-prestige-editorial.css` |
| Texte secondaire | `#c8c5bd` | `mir-prestige-editorial.css` |
| Séparateurs sur fond sombre | `#55554d` | `mir-prestige-editorial.css` |
| Police courante et navigation | DM Sans, repli Arial/Helvetica/sans-serif | `mir-prestige.css`, fichier local `assets/fonts/dm-sans-variable.ttf` |
| Titre du héros PC | Arial/Helvetica/sans-serif, graisse 400, `clamp(46px,4.6vw,74px)`, interligne 1,03, approche −3px | `mir-prestige-editorial.css` |
| Emphase « ici. » | Georgia/Times New Roman/serif, italique 400, champagne | `mir-prestige-editorial.css` |
| Liens d’entrée PC | Lignes séparées, titres 23px de graisse 400, descriptions 13px | `mir-prestige-editorial.css` |

`index.html` charge aussi `mir-home-desktop-locked.css` pour verrouiller l’accueil PC et `mir-home-approved.css` pour les compositions téléphone et tablette. Les règles responsives ne doivent pas être confondues avec les dimensions du titre PC. L’accent champagne provient du site ; les maquettes jointes par l’utilisateur servent à la composition des trois écrans.

## Ancien accueil et Punch

Les quatre images `reference-pr45-*.png` sont des captures Android déjà produites par la PR45, extraites de `MIR-PR45-android-7207c7ae.zip`, révision `7207c7ae4e31edf12d0472f62522d2dc1a188b3c`. Leurs noms d’origine sont `artifacts/phase11/phase11-proof/v130002-<rôle>-<vue>.png`. Elles montrent des comptes/chantiers de recette, notamment « QA UX 20261114 Façade A » et « 10 rue fictive QA ». Ces images restent des intermédiaires de revue hors du dépôt ; elles ne sont pas ajoutées à cette modification.

Ce sont des références antérieures à la présente modification. Elles ne prouvent pas le rendu du nouvel APK. Le manifeste `reference-files.json` permet d’identifier les fichiers exacts conservés.

## Recette à exécuter dans Chromium

Le script `tests/mir-app-selection-browser.cjs` exécute l’application réelle avec la fixture locale existante `tests/helpers/mir-field-fixture.cjs`. Il bloque les requêtes externes et n’utilise ni session réelle ni écriture dans le backend.

Il produit les preuves suivantes dans `artifacts/app-selection/` :

- Une capture du véritable accueil PC de référence à 1440px et ses styles calculés : fond du héros, couleurs et polices, dont Arial et Georgia.
- Les captures avant/après accueil et Punch, Employé et Chef d’équipe, à 390px. Les dimensions, positions, couleurs et polices des éléments principaux sont comparées à la révision de référence.
- Les trois nouveaux écrans aux largeurs 360, 390, 430, 834 et 1440px, pour les deux rôles.
- Commande : entrée directe dans le magasin, liste de 24 articles au plus, vignettes, recherche, quantité initialement vide et panier conservé après un aller-retour dans le parcours pliage.
- Messages : vrais filtres de conversations, recherche, choix d’un destinataire disponible dans la fixture, ouverture du fil et conservation du brouillon.
- Plus : destinations réelles et outils supplémentaires du chef d’équipe, sans débordement horizontal et avec navigation de bas d’écran accessible.

Le résultat est enregistré dans `report.json`, avec les révisions, les vérifications, les styles, les métriques et la liste des captures. La preuve détaillée des quatre étapes de pliage est fournie par `tests/mir-pliage03-field-browser.cjs`.

Commande utilisée par la CI après installation des dépendances mobiles :

```sh
NODE_PATH=./mobile/node_modules MIR_CHROMIUM_BIN=/usr/bin/google-chrome \
MIR_APP_REFERENCE_SHA=dd5bf49701aea2c3ac5fa46712b9fc94a1acd89e \
node tests/mir-app-selection-browser.cjs
```

## Statut de préparation

La syntaxe JavaScript du script a été validée localement. Le lancement de Chromium dans l’environnement de préparation a échoué sur la création de socket du navigateur (`Operation not permitted`). Aucune capture de la refonte ni aucun résultat de rendu local n’est déduit de cette tentative. Le script est intégré au workflow Android pour obtenir des captures et résultats réellement exécutés en CI. Il ne constitue pas un essai sur téléphone physique.
