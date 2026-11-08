# MIR — ateliers fixes Harmony

Branche : `feat/mir-unified-fixed-workspace`, basée sur `main` réel, incluant PR51 et les ajouts concurrents CanExel. **Autorisation mise à jour : le propriétaire a ensuite demandé « Autorise tout automatique ». PR55 fusionnée après CI verte et inspection Chromium ; la recette physique Safari reste à effectuer.**

La PR51 a été publiée séparément : [Pages 42482117502](https://github.com/revetementsmirweb/MIR/actions/runs/42482117502), révision `cfd7858e08dbf8224f21e9d3e1801099e4751ab5`, déploiement et comparaison des fichiers servis réussis.

## Résultat à examiner

- [Galerie avant/après](index.html) : 42 captures réelles, téléphone 390, iPad 820/1024, PC 1366/1440/1920 et 2560 px. La galerie est un document de preuve, pas un nouveau site.
- [Mesures comparées](metrics.md) et résultats bruts [avant](before.json) / [après](after.json).
- [Séquence navigateur réelle](sequence-reelle.webm), sans envoi de commande.
- [PDF réel de dix panneaux](MIR-10-panneaux.pdf) : couverture + dix fiches, une pièce par fiche, lips indépendants 2¼/0 et métadonnées conservées. Générateur PR50 inchangé.

## Architecture et dépendances

`mir-workspace.js/css` est l'unique propriétaire de disposition en mode dessin admin Pliage/panneau et Calepinage. Le module déplace les vrais éléments, avec marqueurs de restitution ; il ne clone ni champs, ni modèle, ni dossier. L'en-tête et la navigation restent dans `mir-harmony.js/css` ; leur hauteur commune est de 64 px.

Pendant le dessin, les feuilles de disposition alternatives `production-admin-v4.css`, `mir-freeform-workshop.css`, `mir-panel-admin.css` et `mir-panel-workbench.css` sont désactivées. Elles sont rétablies pour dossiers, modèles, catalogues et commandes, dont les dépendances natives sont conservées. Calepinage utilise la shell commune ; l'ancien assistant limité à 740 px n'est plus chargé par son point d'entrée. Les sources historiques sont conservées pour compatibilité et traçabilité. La feuille commune contient un seul `!important`, pour respecter l'attribut sémantique `[hidden]`, pas pour empiler des variantes de disposition.

La shell répartit l'espace entre dessin et inspecteur (environ 68/32 en paysage). L'inspecteur seul défile ; en portrait tactile il s'ouvre à la demande. Les barres principales restent dans les lignes explicites de la grille, y compris lorsque les étapes sont repliées en faible hauteur. Les outils longs et le zoom passent dans l'inspecteur en faible hauteur et restent accessibles. La hauteur et les modales suivent `visualViewport` ; les zones sûres sont prises en compte.

Les segments Pliage et les cotes A/B/C des panneaux ouvrent une saisie directe. Les modifications sont validées par `MIRProduction`, le maillage existant et `compute`/`MIRPanelLayout` pour le mur. Une erreur conserve la valeur et les verrous précédents. La caméra Pliage est cadrée sur les éléments SVG réellement rendus, sans changer leurs coordonnées métier. Les badges d'angles sont séparés des cotes lorsqu'ils se croisent.

Enregistrer révise la même pièce lors d'un nouvel enregistrement, sans doublon. Continuer prépare le vrai formulaire fournisseur depuis un panneau seul ou une pièce enregistrée. Le choix original modèle/bon existant/nouveau bon reste disponible pour un nouveau pliage. Aucun envoi automatique n'est ajouté.

## Recette exécutée

- `mir-fixed-workspace-browser.cjs` : 48 cas (3 ateliers × 16 formats), zéro défilement global et horizontal, surface utile, actions visibles, inspecteur, cotes directes, fractions, lèvres indépendantes, annuler/refaire, clavier, refus sans mutation, dix repères, double sauvegarde et reprise.
- Formats : 360×780, 390×844, 428×926, 820×1180, 834×1112, 1024×768, 1180×820, 800×1280, 1280×800, 1366×768, 1440×900, 1920×1080, 2560×1080, 844×390 et frontières 959/960×700.
- `mir-workspace-viewport-browser.cjs` : hauteur disponible réduite pendant une modale, application accessible, zoom clavier sans mutation du modèle, résolutions CSS équivalentes à 125/150/200 %, cote de mur incompatible avec un verrou refusée atomiquement.
- Régressions réelles Chrome/Chromium : atelier-v4, admin-guided, mobile-adjointe, wall-section-trace (Shift inclus), panel-individual, calepinage-metric, wall-panel-po, panel-one-sheet, continue-combinations, drawing-pan, retours-cotes, miniatures, direct-po, purchase-orders, moulure-renaming, Harmony direct/revisions et signature client (40 cas).
- L'étape statique complète du workflow Pages passe localement. Les tests devenus obsolètes vérifient maintenant les vrais contrôles de shell, inspecteur et vue 3D, en conservant les assertions métier, permissions, quantités et révisions. Aucun test n'est désactivé.

Les journaux correspondants sont dans ce dossier. La CI de PR produit à nouveau les captures sur le SHA testé ; consulter son résultat avant fusion.

## Préservé

Logo MIR original ; moteurs `production-model.js`, `production-volume.js`, géométrie architecturale et répartition ; générateurs PDF ; dossiers, quantités et historiques ; fractions et conversions ; verrous ; contours/lips indépendants ; formes/pentes ; métal/finition/perforation ; synchronisation 2D/3D ; tracé tactile/Shift ; zoom et déplacement ; sauvegardes ; accès client/employé et portail PR51. Aucun changement Supabase ou commande réelle.

## Limites et validation physique à faire

Ces preuves viennent de Chromium Linux et de formats émulés. Elles ne prouvent pas Safari/iPadOS ou Android physiques. La réduction de viewport vérifie la réaction de mise en page au clavier ; elle ne reproduit pas toutes les particularités d'un clavier iPad. Les espaces CSS équivalents au zoom ne sont pas une validation physique du raccourci de zoom navigateur.

Recette physique à compléter : sur un vrai iPad Safari en portrait/paysage, puis Android, ouvrir chaque atelier ; tracer au doigt et avec Shift sur clavier externe ; toucher A/B/C et une cote de pliage ; saisir `½`, `2¼`, `1270 mm` via l'unité choisie ; ouvrir/fermer le clavier et vérifier Appliquer ; pincer puis déplacer sans modifier les cotes ; ouvrir chaque rubrique longue de l'inspecteur ; tester texte agrandi et zoom navigateur 125/150/200 % ; enregistrer deux fois, revenir au dossier et recharger ; préparer dix pièces et contrôler le PDF sans l'envoyer. Vérifier le menu, le focus, Échap et les actions à chaque orientation. Toute anomalie réelle doit être consignée et corrigée ; ne pas assimiler ces instructions à une recette physique déjà exécutée.

SEO/GEO : outils internes `noindex` conservés ; aucune ouverture d'indexation ni changement d'accès. Les en-têtes publics voisins sont comparés par les tests de signature ; cette recette ne constitue pas une validation de commerce, de paiement ou d'authentification serveur.
