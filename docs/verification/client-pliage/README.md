# Pliage client — maquettes approuvées, phase 1

**PR de révision uniquement. Ne pas fusionner ni publier avant le feu vert du propriétaire. Cette consigne remplace toute autorisation automatique antérieure pour ce mandat.**

Base réelle : `main` au SHA `d8ce6c3083c23fb0f2aa98dd993a73c9033f3b5b`. Branche : `feat/client-pliage-approved`. Références : les trois maquettes cell, tablette et PC jointes à la demande (`97179.jpg`, `97180.jpg`, `97181.jpg`). L'intégration modifie le site existant, sans nouveau site et sans nouvelle application.

## Résultat intégré

- `pliage.html` : titre Pliage sur mesure, explication courte, un seul bouton principal « Configurer ma moulure ». Exemple illustratif sous le texte sur cell, à côté dès 601 px. Formulaire rapide et liste locale conservés dans un `details` fermé par défaut ; liens spéciaux conservés à l'intérieur.
- Entrée du configurateur : deux vrais boutons de même importance, empilés jusqu'à 600 px, côte à côte ensuite. Aucun aperçu vide. « Choisir un modèle » ouvre les formes existantes du moteur et les modèles enregistrés autorisés pour le canal client, avec les boutons d'origine. Les modèles privés ou archivés conservent le filtre existant. Aucune cote de fabrication n'est préremplie sur les formes de départ.
- Modèle choisi : passage aux mesures avec l'aperçu existant. Les liens directs `template` et `profile`, notamment le J à soffite, restent fonctionnels.
- Dessin libre : moteur MIR et gestionnaires tactiles/souris d'origine ; premier point expliqué selon le pointeur disponible. Portrait possible sans plein écran ni rotation forcés. « Annuler le point » et « Terminer le dessin » sous la grille sur cell, à droite sur tablette/PC. Terminer exige trois points, deux côtés et une géométrie valide, puis ouvre les mesures avec le même profil. Revenir aux choix permet de reprendre le tracé non terminé. Sélectionner à nouveau le modèle courant rouvre ses mesures sans les effacer.
- La caméra SVG s'adapte au portrait cell ; la conversion des points reste effectuée par la matrice native du dessin. Aucun second moteur de géométrie. L'illustration du premier écran est décorative, marquée Exemple, sans mesures enregistrées.

## Recette réellement exécutée

Chromium Linux installé, version `155.0.8059.79`, émulation de viewport et pointeur. Aucun essai physique Android/iPad/Safari revendiqué. Les appels externes sont bloqués pendant les captures locales pour rendre la comparaison déterministe ; aucune commande ni écriture Supabase.

| Format | Pointeur testé | Parcours |
|---|---|---|
| 360 × 780 | Tactile | Introduction, modèles, dessin, annulation, mesures, dossier |
| 390 × 844 | Tactile | Idem |
| 428 × 926 | Tactile | Idem |
| 600 × 900 | Tactile | Frontière cell |
| 601 × 900 | Tactile | Frontière deux colonnes |
| 834 × 1112 | Tactile | Tablette portrait |
| 1024 × 768 | Tactile | Tablette paysage |
| 1348 × 926 | Souris | PC de la maquette |
| 1440 × 900 | Souris | PC |

Contrôles : CTA visible sans défilement ; disposition et poids des cartes ; modèle standard réellement sélectionné et modèle enregistré réellement sélectionné ; champs de mesure accessibles ; fraction `3½` correctement convertie ; fin bloquée à un côté et activée à deux ; annulation du dernier point ; même géométrie avant/après Terminer ; commandes >=44 px ; absence de défilement horizontal ; dossier existant inchangé, liste rapide modifiée puis retrouvée au rechargement, accès aux pièces via Mon dossier.

Accueil : captures complètes aux mêmes dimensions 390 × 844, 834 × 1112 et 1348 × 926, **identiques pixel par pixel**. Les images différées sont chargées et le défilement terminé à zéro avant capture. `unchanged-assets.json` confirme aussi l'identité des sources accueil/styles communs/logo de navigation, moteurs et PDF. Aucun fichier d'accueil ni style partagé n'est modifié.

Régressions existantes : `mir-production-signature-browser.cjs`, `mir-production-client-flow-browser.cjs`, `mir-unified-dossier-browser.cjs`, `mir-atelier-v4-browser.cjs`, ainsi que contrats pages, longueurs de vente, charte client, accueil et atelier. Exports JSON et PDF réels testés par les suites existantes ; aucune soumission à un fournisseur réel.

## Captures et rapports

[Galerie locale](gallery.html). Les fichiers `01-introduction-*`, `02-choix-*`, `03-dessin-*` représentent les trois écrans intégrés ; `04-mesures-*` montre la suite fonctionnelle. Les six captures `accueil-avant/apres-*` documentent l'absence de changement de l'accueil. Voir `results.json`, `browser.log` et les journaux de régression.

Les données visibles dans les captures sont des fixtures locales explicites : dossier et modèle de recette. Les vraies sauvegardes ne sont pas transférées dans le dépôt.

## Ajustements des tests et limites

Les tests de modèle enregistré ouvrent désormais la carte Choisir un modèle et attendent le passage direct aux mesures. Le test de navigation Panneaux utilise son URL existante plutôt que l'ancien onglet retiré de cette entrée dédiée au Pliage. Les points du test tactile restent à l'intérieur de la caméra portrait. L'assertion de version CSS suit le nouvel asset. Aucune assertion métier, PDF, sauvegarde ou droit admin n'est supprimée ; aucun test n'est désactivé.

Boutique et accueil hors périmètre. Outils admin, magasin employés, Auth et Supabase inchangés. La recette physique sur iPad/Safari et Android reste à faire avant approbation propriétaire. Le rendu reste disponible dans la branche et les captures ; aucune publication de cette refonte n'est effectuée.
