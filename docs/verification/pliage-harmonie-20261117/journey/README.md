# Pliage — recette des parcours

Base de comparaison : commit `3573d90`, branche `codex/pliage-harmonie-20261117`. Captures Chromium local : 1440 × 1050, 834 × 1112 et 390 × 844. Les formats tactiles sont des émulations Chromium, pas des essais sur appareils physiques.

## Résultat final

Parcours complets client et employé PASS à 1440 × 1050, 834 × 1112 et 390 × 844. Le dernier contrôle mobile passe après correction du dialogue public ; les contrôles ciblés de cette dernière CSS passent aux cinq tailles 1440 × 1050, 834 × 1112, 360 × 780, 844 × 390 et 780 × 360 : focus dans la fenêtre, défilement interne, barre mobile conservée, action panier atteignable. Preuve consolidée : `consolidated-audit.json`. Le fichier `after-audit.json` contient le dernier passage ciblé 390 px ; les deux autres formats sont attestés par leurs lignes PASS et leurs snapshots structurés.

Aucun envoi. Les lectures automatiques externes du tarif et de la météo, ainsi qu’une requête POST de lecture des prix publics, ont été bloquées par le routeur de test avant transmission.

## Obstacles constatés et corrections

- Le formulaire rapide sélectionnait sans geste quantité `1`, premier matériau et première couleur, et permettait de continuer immédiatement. Ces trois choix sont désormais explicites et bloquants ; quantité entière de 1 à 999.
- Changer de profil effaçait les cotes. Le brouillon conserve maintenant chaque profil, les fractions saisies, les unités, le matériau, la couleur, la quantité et les notes, y compris au retour et au rechargement. Les anciennes pièces restent au même emplacement de stockage.
- « Ajouter à ma liste » ouvrait en réalité une seconde vérification. Le bouton s’appelle « Vérifier cette pièce » et explique le passage suivant vers le panier.
- Une sauvegarde locale refusée pouvait ouvrir un configurateur sans sa pièce. La page conserve maintenant les mesures et affiche l’échec.
- Dans l’iframe employé, les champs de cote dépassaient du bord droit. La grille et les minimums des champs ont été corrigés uniquement dans le configurateur guidé client/employé. Aucun sélecteur actif sur l’admin ou les panneaux.
- Le bouton « Modifier le dessin » depuis le dossier rechargeait les données mais laissait le formulaire caché : `replaceState` ne mettait pas à jour la pseudo-classe CSS `:target`. Une vraie navigation de fragment vers le configurateur rend à nouveau l’édition visible.
- Sur téléphone, le dialogue public après ajout/révision était placé sous la barre inférieure et « Voir mon panier » était intercepté. Il est désormais fixé dans la zone visible avec hauteur maximale et défilement interne. Les dialogues modaux de pli fermé, employé et admin ne sont pas ciblés.
- Deltas partagés demandés à `client_tools`, réalisés dans son périmètre : étape finale annonçant matériau/couleur/quantité ; actions de nouvelle pièce et banque actives ; lien public vers `selection.html`, contexte employé conservé.

## Vérifications et preuves

`before-audit.json` et les 24 captures `before-*` proviennent du code au commit de départ, sans effets des modifications concurrentes.

`tests/mir-pliage-harmonie-journey-browser.cjs` rejoue les interactions réelles. Il bloque toute requête externe et toute méthode autre que GET. Les lignes employé utilisent exclusivement `tests/helpers/mir-field-fixture.cjs`. Aucun clic sur l’envoi d’une commande ou d’une estimation.

Couverture de base validée aux trois formats : choix explicites, quantités vide/zéro/fraction/hors limite, aller-retour entre profils, fractions et conversion pouces/mm, rechargement, retour depuis le configurateur, refus de stockage, retour d’étapes, ajout local client/employé, cohérence quantité/matière/couleur entre modèle, snapshot et panier, contexte owner/job employé.

Pour les cartes de confirmation tactiles, le harnais utilise des événements CDP natifs : contact maintenu 70 ms, séparé du geste de dessin précédent par 400 ms, puis attente de l’état coché et de la fermeture du dialogue. Cette cadence évite l’intermittence des clics synthétiques instantanés du harnais Chromium ; elle n’est pas une temporisation ajoutée au produit. La transmission du clic de carte vers son bouton radio a aussi été corrigée séparément par `client_tools`, avec tests avant/après. Aucun clic DOM forcé ni validation contournée.

La recette avancée vérifie également FR→EN→FR sans mutation des valeurs enregistrées, nouveau dessin après un ajout, deuxième pièce avec retour écrasé 180°, confirmation du côté, cotes identiques avant/après ajout, conservation du pli dans spec/snapshot/panier/données de pages PDF, modification d’une pièce existante et historique de révision. Les fichiers `hem-*.json` contiennent les preuves structurées. État final détaillé dans `consolidated-audit.json` et les journaux, sans annoncer les anciens tests obsolètes comme passants.

## Régressions existantes

- `mir-field-drawing-refresh-browser.cjs` : PASS, 12 contrôles, deux rôles. Journal `regression-field-refresh.log`. Reprise du dessin, du focus et des choix ; barrières de changement de compte/chantier/rôle conservées.
- Le bloc first-paint de `mir-client-pliage-approved-browser.cjs` échoue sur son égalité stricte de coordonnées : déplacement de 0,90625 px à 360 px et 1,203125 px à 428 px. Ces mêmes écarts sont reproduits sur `3573d90` (`regression-baseline-first-paint*.log`). La tolérance de 1 px autorisée n’a pas été étendue ; l’attente explicite des polices ne supprime pas le second écart. Cet ancien bloc n’est donc pas déclaré passant.
- Les neuf parcours fonctionnels ont été lancés séparément. La copie adaptée au shell actuel vérifie désormais un seul repère actif dans la navigation visible ; elle reste rouge sur l’ancien contrat « écran de choix sans défilement » à 360 × 780 : hauteur 876 px avec dossier existant, sans débordement horizontal. Le commit de départ dépasse déjà la hauteur du viewport, même sans dossier (832 px, `regression-baseline-choice-360.log`). La composition prestige peut défiler normalement ; aucune marge n’a été changée pour forcer cet ancien contrat. Les neuf parcours ne sont donc pas déclarés globalement PASS. Journaux et copies exactes avec patches dans `harnesses/`. La recette neuve couvre les interactions actuelles plus complètement.

## Périmètre

Les sources possédées sont `pliage.html`, `pliage.js`, `mir-client-pliage.css`, `mir-client-pliage-viewport.js`, `production.html` (ajout d’un lien CSS) et `mir-pliage-journey.css`. Les traductions neuves sont fournies dans `i18n.json`, intégrées par le propriétaire du dictionnaire central. Aucun moteur géométrique/PDF, catalogue, Supabase, courriel, paiement ou configuration Google n’a été modifié par cette sous-mission. Aucun commit ou push.
