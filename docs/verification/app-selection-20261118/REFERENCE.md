# Référence graphique et recette — application MIR

## Périmètre

La demande initiale portait sur Commande C02, Messages M08 et Plus P10, avec la charte de l’accueil PC MIR TEST. L’utilisateur a ensuite explicitement étendu cette charte à **toutes les pages de l’application Employé et Chef d’équipe**, Accueil et Punch compris, avec le même menu inférieur partout. Cette nouvelle instruction remplace l’obligation de conserver leurs anciennes couleurs. Leur composition, leurs actions et le fonctionnement du pointage restent conservés. Le parcours de pliage reprend les quatre étapes du client dans le contexte de l’employé ou du chef d’équipe.

Le menu commun comporte exactement **Accueil · Commande · Punch · Messages · Plus**. Les pages Heures restent dans le groupe Punch, le suivi de commande dans Commande, les dossiers/documents dans Accueil, et les réglages/avis dans Plus. Les dialogs conservent leur fermeture réelle ; la navigation située derrière un dialog modal reste volontairement inerte jusqu’à sa fermeture.

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
| Titre du héros PC | Arial/Helvetica/sans-serif, graisse 400 ; à 1440px : 66,24px, interligne 1,08, approche −0,055em | Styles calculés Chromium, cascade de `mir-prestige-editorial.css` et `mir-home-desktop-locked.css` |
| Emphase « ici. » | Georgia/Times New Roman/serif, italique 400, champagne | `mir-prestige-editorial.css` |
| Liens d’entrée PC | Lignes séparées, titres 23px de graisse 400, descriptions 13px | `mir-prestige-editorial.css` |

`index.html` charge aussi `mir-home-desktop-locked.css` pour verrouiller l’accueil PC et `mir-home-approved.css` pour les compositions téléphone et tablette. Les règles responsives ne doivent pas être confondues avec les dimensions du titre PC. L’accent champagne provient du site ; les maquettes jointes par l’utilisateur servent à la composition des trois écrans.

## Ancien accueil et Punch

Les quatre images `reference-pr45-*.png` sont des captures Android déjà produites par la PR45, extraites de `MIR-PR45-android-7207c7ae.zip`, révision `7207c7ae4e31edf12d0472f62522d2dc1a188b3c`. Leurs noms d’origine sont `artifacts/phase11/phase11-proof/v130002-<rôle>-<vue>.png`. Elles montrent des comptes/chantiers de recette, notamment « QA UX 20261114 Façade A » et « 10 rue fictive QA ». Ces images restent des intermédiaires de revue hors du dépôt ; elles ne sont pas ajoutées à cette modification.

Ce sont des références antérieures à la présente modification. Elles servent désormais à contrôler la composition et les actions, sans exiger l’ancienne palette verte. Elles ne prouvent pas le rendu du nouvel APK. Le manifeste `reference-files.json` permet d’identifier les fichiers exacts conservés.

## Recette à exécuter dans Chromium

Le script `tests/mir-app-selection-browser.cjs` exécute l’application réelle avec la fixture locale existante `tests/helpers/mir-field-fixture.cjs`. Il bloque les requêtes externes et n’utilise ni session réelle ni écriture dans le backend.

Il produit les preuves suivantes dans `artifacts/app-selection/` :

- Une capture du véritable accueil PC de référence à 1440px et ses styles calculés : fond du héros, couleurs et polices, dont Arial et Georgia.
- Les captures avant/après accueil et Punch, Employé et Chef d’équipe, à 390px. Le script compare les actions, les choix de chantier et le chronomètre, vérifie l’ordre des blocs, le cadran circulaire et les commandes principales au-dessus du menu. Les nouvelles couleurs et polices sont attendues ; l’égalité des anciens pixels n’est plus le contrat.
- Les cinq vues principales aux largeurs 360, 390, 430, 834 et 1440px, pour les deux rôles.
- Commande : entrée directe dans le magasin, liste de 24 articles au plus, vignettes, recherche, quantité initialement vide et panier conservé après un aller-retour dans le parcours pliage.
- Messages : vrais filtres de conversations, recherche, choix d’un destinataire disponible dans la fixture, ouverture du fil et conservation du brouillon.
- Plus : destinations réelles et outils supplémentaires du chef d’équipe, sans débordement horizontal et avec navigation de bas d’écran accessible.
- Les destinations secondaires à 360 et 390px pour les deux rôles : heures, banque d’heures, congés, dépenses, liste des chantiers, dossier, plans, avis, réglages, suivi de commande et livraisons ; équipe pour le Chef. L’accès à la dernière action est vérifié après un véritable défilement, sans clic forcé.
- Les dialogs Photo, Bris d’outil, Compte, Centre d’aide et Rapport du chef : palette commune et fermeture par le véritable bouton. La FAQ et un document de chantier de cette recette sont explicitement fictifs et locaux.
- La palette et la police communes sur chaque vue, avec contrôle des principales surfaces secondaires. Les états d’erreur et d’avertissement gardent leur sens propre.
- L’unicité du menu inférieur, ses cinq destinations, son état actif, ses dimensions et sa typographie identiques entre pages ; les libellés doivent tenir sur une ligne, notamment à 360px.

Le résultat est enregistré dans `report.json`, avec les révisions, les vérifications, les styles, les métriques et la liste des captures. Un échec conserve sa capture et les métriques calculées avant fermeture de la page. Les captures attendent la disparition naturelle des messages temporaires du produit. La preuve détaillée des quatre étapes de pliage, du nuancier et de la réédition est fournie par `tests/mir-pliage03-field-browser.cjs` et les suites métier existantes.

Commande utilisée par la CI après installation des dépendances mobiles :

```sh
NODE_PATH=./mobile/node_modules MIR_CHROMIUM_BIN=/usr/bin/google-chrome \
MIR_APP_REFERENCE_SHA=dd5bf49701aea2c3ac5fa46712b9fc94a1acd89e \
node tests/mir-app-selection-browser.cjs
```

## Exécutions et statut du périmètre étendu

Les révisions `2a02b20b` puis `8b1ff84a` ont réellement passé 79 contrôles et produit 39 captures Chromium pour le périmètre initial C02/M08/P10, avec les anciens accueils/Punch alors inchangés. La révision `8b1ff84a` a aussi passé les cinq groupes du parcours de pliage terrain et produit sept captures. Ces résultats précèdent la nouvelle demande de thème intégral et ne valent pas validation du périmètre étendu.

Les notes et captures intermédiaires de ces exécutions sont conservées hors dépôt. Le garde ancien Aujourd’hui présente une empreinte attendue périmée pour `employee-store-model.js`, pourtant inchangé depuis la base approuvée ; il n’a pas été affaibli.

La recette étendue est intégrée au workflow Android et attend sa propre exécution réelle. La syntaxe JavaScript est contrôlée localement. Le lancement local de Chromium est indisponible sur la création de socket (`Operation not permitted`) ; aucun résultat visuel n’est déduit de cette tentative. Les captures CI sont des rendus Chromium et ne constituent pas un essai sur téléphone physique.
