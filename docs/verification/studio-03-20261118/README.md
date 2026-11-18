# Studio 03 — Matières en bas — revue TEST

## Base et périmètre

- Dépôt : `revetementsmir/Revetements-mir-`.
- Branche isolée : `codex/studio-03-matieres-bas-20261118`.
- Base réellement vérifiée : `3d0eb311fc929b35fb97b4466ede2308633e141b`.
- Route du moteur client existant : `plan.html`. `studio.html` est une ancienne démonstration distincte.
- Le lot réorganise les contrôles existants, sans remplacer le bâtiment par une image et sans modifier le moteur PDF→3D.
- Les contextes `embed`, `context=admin` et `mode=atelier` conservent leur présentation existante.
- Accueil, Particuliers, estimation, boutique et espaces employés : fichiers protégés et comparaisons avant/après.
- Publication autorisée : aperçu MIR TEST uniquement. Aucune fusion dans main, migration, soumission réelle, activation Google ou paiement.

## Coordination réellement consultée

- MOON 1.3.11, méthode obtenue d’Atelier le 2026-11-18 à 12:43:32 UTC.
- BOSS GOD MODE explicitement choisi par l’utilisateur, état du service `ready`.
- Méthodes consultées : Designer d’interface, Ergonomie/accessibilité, Harmonisation visuelle, Architecture, Qualité/tests et périmètre SEO/GEO TEST.
- Mission existante de ce lot : `06736632-6deb-43b0-86da-af0d9e4acb09`.
- Le travail concurrent PDF→3D (mission `c6521576-53a6-4ee6-b862-0c267621d7bf`) reste séparé. Son checkpoint privé en cours n’est pas intégré ni certifié par cette revue.
- Ces consultations de méthodes ne constituent pas une approbation humaine ou une certification du service Atelier.

## Réalisation

- `dist/plan.html` charge les deux fichiers de présentation dédiés avant l’ancien paginateur.
- `dist/mir-studio-03.js` déplace les vrais contrôles, conserve les IDs/délégations du moteur et synchronise le sélecteur de zone. Les fabricants et options restent issus des données natives.
- `dist/mir-studio-03.css` applique le charbon, les accents sable, la vue pleine largeur et les réglages inférieurs uniquement au client éligible.
- `dist/mir-client-workspaces.js` laisse ce client au nouvel adaptateur ; l’ancien paginateur reste disponible pour les autres contextes.
- `scripts/build-prestige-preview.cjs` fournit au Studio TEST la même configuration locale explicitement désactivée que l’Estimation 04. Le brouillon se conserve sans contacter un service distant. Les gardes réseau restent inchangés.
- Les palettes complètes sont accessibles par expansion et recherche. Les noms officiels restent identiques en FR/EN ; les contrôles génériques sont traduits.
- Les réglages avancés, documents, formats, calepinages et outils de zones restent disponibles dans les sections dépliables. Les trois exports sont regroupés sous « Exporter mes choix ».
- L’estimation utilise le mécanisme existant : capture structurée du Studio et PDF original du projet importé. Ce contrat ne crée pas automatiquement un fichier `dossier` dans le brouillon Studio ; le PDF des quatre élévations reste un export distinct.

## Vérifications visuelles

- Chromium : 1280×800, 1440×900, 1920×1080, 834×1194 et 390×844, FR/EN.
- À 1440×900, vue réelle de 1371×370 px, réglages, action d’estimation et footer visibles dans les 900 px.
- À 1920×1080, écran initial complet. À 1280×800, la page mesure 889 px de haut et reste accessible par défilement naturel.
- Aucun débordement horizontal constaté aux cinq formats.
- Fenêtres réduites : 390×460, 640×450 et 360×225. Le dernier cas a révélé un nuancier trop court ; la hauteur minimale de 120 px permet maintenant de montrer entièrement la vignette focalisée. Voir `reflow-corrected.json`.
- Il s’agit d’émulation de dimensions/reflow dans Chromium, pas d’un clavier Android physique ni d’un changement du zoom de l’interface Chrome.

## Preuves et reproduction

Le workflow `MIR — Studio 03 TEST` exécute la comparaison avec la base immutable, les tests fonctionnels et le build protégé pour le SHA poussé. Il conserve les captures et téléchargements complets comme artefact GitHub Actions.

```sh
MIR_STUDIO03_OUT=/tmp/mir-studio03-proof node tests/mir-studio-03-boundaries.cjs
node --test --test-concurrency=1 tests/mir-studio-interactions.cjs tests/mir-studio-grounds.cjs tests/mir-studio-wall-sections.cjs tests/mir-plan-sheet-detection.cjs
MIR_STUDIO03_OUT=/tmp/mir-studio03-proof MIR_STUDIO03_PHASE=before node tests/mir-studio-03-browser.cjs
MIR_STUDIO03_OUT=/tmp/mir-studio03-proof MIR_STUDIO03_PHASE=after node tests/mir-studio-03-browser.cjs
MIR_STUDIO03_OUT=/tmp/mir-studio03-proof node tests/mir-studio-03-picking.cjs
node scripts/build-prestige-preview.cjs
MIR_STUDIO03_OUT=/tmp/mir-studio03-proof MIR_STUDIO03_PHASE=preview node tests/mir-studio-03-browser.cjs
```

Les essais de soumission restent bloqués par le périmètre TEST. Le manifeste du build contient le SHA exact ; l’état READY et les fichiers servis sont vérifiés séparément après publication.

## Résultats locaux

- 1 651 fichiers protégés identiques à la base, dont les moteurs, l’accueil, Particuliers et les interfaces employés.
- Les quatre suites moteur existantes passent sans modification.
- Clics réels SVG et canvas 3D à 1440 et 390 px : quatre sélections par événements fiables souris/tactile, sélecteur synchronisé, caméra et géométrie conservées (`picking/results.json`).
- Matrice Chromium : 15 groupes sur 16 réussis à la passe complète. Le seul échec était une lecture trop précoce du brouillon IndexedDB dans le harnais ; après attente atomique, le scénario import/reprise 390 réussit. Les fichiers de l’application sont restés identiques. Rapports originaux et reprise ciblée conservés, sans réécriture d’un échec en succès.
- Cause finale du harnais identifiée dans Playwright : `waitForFunction` ne repolle pas la résolution d’un prédicat `async`. Les deux attentes concernées utilisent maintenant un polling asynchrone explicite et borné. Les trois imports et les deux exports/estimations source passent avec ce correctif (`browser-async-polling-followup.json`). Aucune assertion retirée.
- Les 16 groupes sont relancés ensemble en CI sur le commit final. Le résultat distant fait partie de la livraison, séparément des essais locaux.
- 12 comparaisons Accueil/Particuliers : zéro pixel différent, sans masque.
- Quatre fabricants/références de palette vérifiés, y compris une référence sans palette. Rendu du canvas réellement modifié par une couleur, avec caméra et géométrie inchangées. Les choix restent identiques après rechargement.
- Import original vérifié par SHA-256, sauvegarde/reprise et transfert du même fichier vers le brouillon local d’estimation.
- Exports JSON/SVG/PDF téléchargés en FR/EN. Les PDF A3 comportent 5 pages : Avant, continuation Avant, Droite, Arrière, Gauche. Leur présentation native n’est pas refondue dans ce lot.
- Les deux parcours export/estimation du build candidat passent après ajout de la configuration locale désactivée : endpoint même origine, réponse `enabled:false`, brouillon réellement conservé, aucun transport externe (`preview-config-followup.json`).
- Aucune erreur JavaScript, erreur console ou requête externe pendant la passe complète. Aucun envoi réel tenté.

## Limites

- Aucun véritable devis, courriel, paiement ou changement de données serveur testé ou déclenché.
- Import testé avec un PDF synthétique de 67 pages contenant deux élévations : Avant et Arrière. Droite et Gauche restent explicitement non assignées. Les quatre orientations et exports sont testés séparément sur l’étude MIR native.
- Pas de certification de nouveaux algorithmes PDF→3D ni des changements concurrentiels non intégrés.
- Les quantités de l’étude restent des estimations à valider ; la refonte ne les transforme pas en quantités de commande.
- Les couleurs numériques ne remplacent pas les échantillons physiques et ne créent aucune disponibilité commerciale.

