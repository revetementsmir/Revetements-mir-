# Recette locale des trois références — 17 novembre 2026

Périmètre : PRIME 20031, kit de retouche Hardie ColorPlus, vis pour revêtement MAC. Cette recette ne modifie aucune application, aucun catalogue serveur et aucune interface employé. Les seuls fichiers produits par l’audit sont les scripts, rapports et captures de ce dossier.

## Résultat

- 14 captures AVANT depuis le snapshot figé `/tmp/mir-items-before-20261117/dist` ; 24 captures APRÈS depuis `dist`, à 1440 × 1100 et 390 × 844. Les captures de livraison utilisent le viewport réel, sans capture intégrale.
- 30 contrôles navigateur APRÈS : recherche publique de « 20031 », « Blackwater » et « vis MAC », présence des trois fiches, disponibilité des actions, ajout local et absence de débordement horizontal.
- PRIME : ajout de deux boîtes autorisé. Un panier public préexistant de trois boîtes est conservé ; l’ajout forme une seconde ligne de deux boîtes, soit cinq boîtes au total. Cette séparation reproduit le comportement existant lorsqu’une ancienne ligne n’a pas de `colorId`.
- Hardie et MAC : ajout public désactivé ; la revue magasin et le véritable écran chantier refusent également l’ajout avec le message métier prévu. Aucun prix, quantité de stock ni validation de disponibilité n’est déduit de la photo.
- Hardie : le catalogue canonique contient Noir minuit / Midnight Black, code 4960831, alias Blackwater 4100703. L’ancienne teinte Étain vieilli reste disponible dans la présentation client. La photo est un visuel de gamme ; le changement de teinte conserve la photo du contenant.
- MAC : fiche en attente, visuel manquant explicitement signalé, aucun ajout possible. La photo originale n’est pas un fichier disponible dans le dépôt.
- Contrôles purs : `node tests/mir-boutique-mir-nouveautes.cjs` passe (7 fiches) ; `node tests/mir-phase9-catalogue.cjs` passe (8 tests).

Les huit captures finales ciblées après ajustement de la légende Hardie et des traductions sont consignées dans `qa-final-captures.json`. Ce rapport remplace les relevés de texte anglais correspondants de la première passe `qa-browser-audit.json`. Les boutons, valeurs d’option et le panier sont contrôlés sans modifier leur logique.

## Boutique, revue magasin et véritable magasin connecté

La boutique publique consomme le catalogue statique, puis applique des compléments client dans `commerce.js`. La visibilité publique tient compte de la liste des articles cachés ; l’ajout dépend aussi de l’identité, de la photo disponible et de `orderable`.

`magasin-revue.html` est une revue locale du même catalogue, via `employee-store-model.js`. Son panier d’essai est une simulation locale ; le regroupement et les annotations ne publient pas d’articles au serveur.

Le véritable magasin employé se trouve dans `chantier.html` / `chantier-app.js`. Les rôles employés et chefs d’équipe utilisent une liste paginée puis une fiche modale avec photo et options. L’interface est conservée. En connexion réelle, ce magasin reçoit le snapshot de `mir_portal_snapshot` : articles du bon organisme, canal `store`, publiés et non archivés. Une modification de JSON local ne publie donc pas un article absent du snapshot serveur. De plus, une image déjà portée par l’article du snapshot peut primer sur le complément statique.

Le paramètre `?demo=1` est volontairement supprimé par `portal-client.js` et ne débloque pas la connexion. Les captures `avant-chantier-demo-refuse-*` vérifient ce refus réel. Les captures `*-chantier-fixture-*` affichent le véritable écran chantier alimenté uniquement par le fixture de test existant `tests/helpers/mir-field-fixture.cjs` et le catalogue local : **snapshot simulé, aucune session employé réelle**. Elles ne certifient ni les droits, ni la publication, ni les stocks du magasin connecté.

## Sécurité et limites

Chaque contexte navigateur bloque tout hôte autre que son serveur local et toute méthode autre que GET. Les appels automatiques de prix ou de météo ont été interrompus avant transmission. Aucune requête externe transmise, aucune écriture Supabase, aucun courriel, aucun paiement et aucune commande réelle. Le fixture ne reçoit aucun appel d’envoi de commande.

Les visuels sont ceux déjà présents au dépôt, avec un emplacement explicite pour MAC ; ils ne sont pas de nouvelles photos originales fournies. Le contrôle anglais porte sur ces trois fiches seulement et ne vaut pas certification bilingue du site entier. Aucun moteur PDF→3D ni rendu général des revêtements n’est recertifié dans ce lot.

## Reproduction

- `node docs/verification/items-20261117/qa-browser-audit.cjs`
- `node docs/verification/items-20261117/qa-final-captures.cjs`

Les scripts lancent un serveur HTTP local et Chromium, bloquent le réseau extérieur, génèrent les captures et ne soumettent que des ajouts dans des paniers locaux. Les données fixture sont explicitement séparées du magasin connecté.
