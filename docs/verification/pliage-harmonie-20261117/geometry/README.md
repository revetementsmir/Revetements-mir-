# Accrochage et retours de pliage — preuve ciblée

Branche `codex/pliage-harmonie-20261117`, référence géométrie avant correction `3573d90`. Travail local uniquement, sans publication ni écriture métier distante.

## Défauts effectivement reproduits

- Un petit premier rebord suivi d’un côté plus long presque opposé n’ouvrait pas le choix du retour écrasé. La détection exigeait que le côté précédent soit le plus long.
- Le clic arrondissait les coordonnées à la grille avant l’aimant; le tap tactile ne passait pas par cet aimant. Dans les six contextes navigateur, le même geste donnait 41,6335° au lieu de 45°.
- L’aimant connaissait les axes absolus et les quarts de tour relatifs, mais pas tous les multiples relatifs de 45° sur un côté oblique.
- La reconnaissance appelait « retour écrasé » un angle valide simplement proche de 180°, même lorsque le modèle restait un angle ordinaire.

Les deux sources de géométrie avant correction ont été extraites avec `git show 3573d90:dist/…`. Le serveur de recette les substitue aux fichiers actuels pour isoler le défaut; il ne prétend pas recréer toute l’application historique.

## Correctifs limités

`production-app.js` applique le même calcul aux taps et aux clics, avant l’arrondi de longueur. L’aimant compare les axes absolus et les multiples relatifs de 45°, avec les seuils d’acquisition et de maintien existants. Un retour presque opposé est proposé dès le premier rebord, sans condition sur l’ordre des longueurs. La confirmation explicite garde le sens du retour.

`mir-profile-recognition.js` reconnaît un retour écrasé à partir de son mode métier `hem`; un angle aigu valide n’est plus renommé à tort. Deux angles consécutifs de 90° restent deux angles.

Les deltas de parcours autorisés dans `production-app.js` rendent la quantité explicite, corrigent le lien public vers le panier et branchent les deux actions post-ajout (nouveau tracé ou banque de modèles) pour client et employé personnel. Le titre et le bouton de l’employé personnel utilisent le mot panier. Le contexte propriétaire/chantier et le routage employé sont conservés. Aucun mode d’édition admin n’est élargi.

## Résultats

| Preuve | Avant | Après |
| --- | --- | --- |
| Tests purs nouveaux | 4 échecs, 2 réussites | 6 réussites |
| Navigateur, 6 contextes client/employé | 18 cas observés | 162 cas réussis |
| Retours confirmés sur nouvelles pièces | — | 18 confirmations, 3 par contexte |
| Régressions existantes | — | 7 reconnaissance, 45 pages, 9 retours/cotes réussies |

Le navigateur teste 1440, 834 et 390 px. Les gestes sont de vrais événements Chromium souris sur PC et tactiles via CDP sur tablette/téléphone, sans événements DOM fabriqués. Les 144 cas supplémentaires couvrent huit orientations, trois échelles (6, 10, 14 po), client et employé, avec clic/tap ou glisser. Les tests purs couvrent aussi les rotations négatives et les franchissements de ±180°.

`after-browser.json` garde volontairement l’état du premier retour pendant son dialogue : la pièce n’est pas encore confirmée. Le complément `after-hem-acceptance.json` prouve l’état **après confirmation** : `spec.bends[0].mode` et `model.bends[0].mode` valent `hem`, le sens demandé est gardé, la reconnaissance vaut `hem`, et les cotes A = 12,7 mm / B = 50,8 mm correspondent aux longueurs tracées. Trois pièces neuves sont testées par contexte, avec les deux sens. Six captures `after-*-return-confirmed-*.png` montrent ce résultat; les vues client 390 et employé 1440 ont été inspectées visuellement.

La conservation ultérieure dans le récapitulatif, le panier et les données des pages PDF est vérifiée par la recette indépendante `../journey/hem-*.json` et `tests/mir-pliage-harmonie-journey-browser.cjs`. Les sorties client et employé 1440 ont aussi été relues et vérifiées par cet agent : cotes snapshot [12,7 ; 50,8] mm identiques au tracé, mode `hem`, quantité panier 3, snapshot panier identique, deux pages SVG PDF par dossier et données source inchangées. Consulter les sorties de parcours pour leur matrice responsive finale; elles ne sont pas assimilées aux seuls tests géométriques.

## Complément — confirmation tactile de la carte radio

La recette complète a trouvé un autre défaut réel du dialogue : un tap sur le dessin SVG de la carte génère un clic sur le label puis un clic natif transmis à son radio. La protection contre le clic résiduel du tracé remettait son autorisation à zéro entre ces deux clics et bloquait le radio. `dialog-label-native-before.log` contient la reproduction; `tests/mir-pliage-dialog-pointer-guard.cjs` passe de 1 échec / 5 réussites avant à 6 réussites après.

Le garde-clic accepte désormais **une seule activation du contrôle associé à un label qui a reçu une nouvelle pression réelle**. Un clic sans pression reste refusé; clavier, clic direct, cible étrangère, fermeture et arrière-plan sont vérifiés. Les validations du pli restent inchangées.

La recette tactile a également isolé un comportement de Chromium : juste après le geste qui ouvre le dialogue, certains taps émettent pointerdown/up et touchstart/end mais aucun clic, même avec une cible connectée, des positions stables et `defaultPrevented=false`. Modifier `touch-action` sur le label n’a pas résolu ce phénomène. Les journaux `dialog-immediate-native.log` et `dialog-separated-native.log` consignent la comparaison. La cause précise dans Chromium n’est pas affirmée comme prouvée.

Le protocole final sépare donc le nouveau geste de sélection de **400 ms**, puis maintient le contact natif **70 ms**, sans clic forcé ni événement DOM artificiel. Il attend ensuite le radio effectivement coché, confirme avec un tap natif et attend la fermeture du dialogue. Les **18 confirmations finales réussissent** ainsi : trois nouvelles pièces, les deux sens de retour, client/employé et 1440/834/390. Le fichier `after-hem-acceptance.json` et les six captures de retour confirmé ont été régénérés avec ce protocole. Cela ne prétend pas certifier les taps instantanés de l’émulateur ni les appareils physiques.

## Audit indépendant des couleurs magasin

Lecture du module `mir-store-siding-previews.js`, de ses appels dans `chantier-app.js`/`magasin-revue.js` et du rendu stable dans `material-preview.js` : aucune modification de ces fichiers par cet agent. Les jetons par élément bloquent les anciennes préparations, la remise à zéro annule le choix précédent et les fiches retirées ne reçoivent pas de rendu différé.

`audit-store-preview-races.cjs` exécute le vrai adaptateur avec préparation différée contrôlée; six cas passent (`store-preview-races.json`) : A puis B, réinitialisation, fiche retirée, deux fiches indépendantes, produit non pris en charge et source indisponible. Le DOM et le calcul de teinte sont simulés dans ce contrôle de concurrence, sans réseau. Il complète les vrais essais navigateur de `../samples/store-results.json`, il ne les remplace pas. Aucun défaut bloquant trouvé dans le périmètre lu.

## Rejouer

- `node tests/mir-pliage-harmonie-geometry.cjs`
- `MIR_GEOMETRY_SOURCE_ROOT=/tmp/mir-geometry-before node tests/mir-pliage-harmonie-geometry.cjs` (les quatre échecs attendus exigent les deux sources extraites de `3573d90`).
- `node tests/mir-pliage-harmonie-geometry-browser.cjs`
- `MIR_GEOMETRY_DETAIL=hem node tests/mir-pliage-harmonie-geometry-browser.cjs`
- `node docs/verification/pliage-harmonie-20261117/geometry/audit-store-preview-races.cjs`

Les serveurs sont locaux et n’acceptent que GET. Chaque contexte bloque les requêtes externes et les méthodes non GET; les appels d’envoi de la fixture employé restent vides. Ce sont des simulations navigateur, pas des essais d’appareils physiques ni d’authentification réelle. Le modèle `production-model.js` a été modifié par le lot PDF coordonné, pas par cet agent; les empreintes rendent cette dépendance visible. Aucun moteur Studio PDF→3D n’a été modifié ou recertifié ici.
