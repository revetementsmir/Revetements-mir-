# MIR — Estimation 04, choix en images

## Périmètre

Branche `codex/estimation-04-images-20261118`, issue de la base TEST vérifiée `7ae54b3525dc792ba10aafa7079addeb3829a4fe`.
La nouvelle demande remplace le concept PC07 : quatre cartes Maison, Chalet, Multilogement et Rénovation, dans la composition anthracite approuvée. Le formulaire général conserve ses vrais brouillons IndexedDB, fichiers PDF, contrôles, services et mécanismes de reprise.

Le shell est réutilisé. Aucun fichier de l’accueil, de Particuliers, d’Inspiration ou des interfaces employés n’est modifié. L’ancien paginateur partagé est évité avec son marqueur existant sur ce formulaire seulement. Les dimensions et les matériaux sont facultatifs ; aucune conversion 3D ni estimation de prix automatique n’est annoncée.

## Architecture des données

La municipalité utilise `address.city`, déjà pris en charge. Le contrat version 1 reçoit un objet optionnel `projectDetails` avec `type`, `timeline`, `dimensions` et `materials`.

- Types : `house`, `chalet`, `multi_unit`, `renovation`. La rénovation est distincte et n’est pas un renommage d’une valeur « autre ».
- Échéanciers : `undecided`, `asap`, `within_3_months`, `within_6_months`, `later`. La langue change les libellés, jamais ces valeurs.
- Dimensions et matériaux : textes libres facultatifs, 2 000 caractères maximum chacun, sans unités imposées ni calcul.
- Les anciens payloads n’acquièrent aucun champ ou défaut supplémentaire. Les soumissions déjà figées et leurs empreintes de reprise restent intactes.
- Les configurations Node et Edge annoncent `projectDetailsVersion: 1`. La page refuse un envoi enrichi vers un service ancien pour éviter une perte silencieuse.
- Les résumés client et les notifications partagées présentent les nouvelles informations. Le stockage JSON existant les conserve sans migration SQL. Les interfaces employés et les moteurs PDF ne changent pas.

Les vérifications de stockage et de notification utilisent des fixtures locales injectées. Aucun service Supabase ni fournisseur de courriel réel n’a été appelé pour ces tests.

## Aperçu TEST

Le build `scripts/build-prestige-preview.cjs` conserve ses protections réseau et de formulaires. Un fichier de configuration local à l’aperçu annonce les limites importées du vrai contrat, avec `enabled: false`. Les PDF sont de vrais fichiers conservés par le brouillon IndexedDB existant ; aucun reçu, courriel ou dossier distant n’est simulé dans l’aperçu destiné à Frederick.

Les limites conservées sont cinq PDF, 20 Mio par fichier et 25 Mio cumulés. Le formulaire existant accepte les PDF, pas les fichiers photo directs. Les coordonnées, l’adresse du chantier et la note restent disponibles.

## Vérifications et preuves

- Recette source finale : **23/23 groupes réussis**, 88 captures APRÈS. Les 20 comparaisons Accueil/Particuliers sont strictement identiques, sans masque ni tolérance. Aucun trafic externe et aucune erreur JavaScript inattendue. Les réponses de succès et de panne des essais d’envoi sont des fixtures locales explicites.
- Contrats et services : **33/33 tests réussis**, dont neuf nouveaux cas ; dictionnaire et protections FR/EN : **7 groupes réussis**.
- Autres fenêtres du moteur commun : **9/9 scénarios réussis**, Panier/Pliage/Studio à trois tailles. Aucune nouvelle donnée projet ajoutée à leurs demandes historiques.
- Harmonisation : quatorze contrastes de texte réellement mesurés, de 5,43:1 à 13,66:1 ; les quatre cartes et le pied de page tiennent aux trois tailles PC. Les captures téléphone/tablette permettent de vérifier l’accès par défilement.
- `before/` : 30 captures Chromium de référence depuis Git immuable, trois pages × cinq formats × deux langues.
- `assets.md` : provenance, dimensions, poids et cadrages des quatre fichiers WebP distincts. Les originaux approuvés restent inchangés.
- `contract-service-review.md` : contrat, compatibilité historique et services simulés ; neuf nouveaux cas et les contrôles existants.
- `engine/smoke.json` : première traversée des cinq étapes, validation, PDF restauré, langue, service ancien et reprise après panne simulée.
- Les résultats indépendants, les captures finales et le reçu de publication sont consignés dans les rapports de recette du même lot.

Le scénario historique inchangé `tests/mir-estimate-browser.cjs` échoue dès l’attente de limites visibles au premier écran. Cet échec a été reproduit sur la base propre `7ae54b3`, avant toute saisie ou soumission : il est préexistant à ce lot. Aucun test historique n’a été désactivé pour obtenir les résultats ci-dessus. Voir `historical-baseline.md` et `modal-regression.md` pour les traces et les nouveaux scénarios utilisant les véritables étapes.

Reproduction (Node 24, Playwright, pngjs et Chromium) :

```sh
node --test --test-concurrency=1 tests/mir-estimate-config.cjs tests/mir-estimate-presentation.cjs tests/mir-estimate-edge.cjs tests/mir-estimate-service.cjs tests/mir-estimation-04-contract.cjs
MIR_ESTIMATION04_PHASE=before node tests/mir-estimation-04-browser.cjs
MIR_ESTIMATION04_PHASE=after node tests/mir-estimation-04-browser.cjs
node tests/mir-estimation-04-modal-browser.cjs
node scripts/build-prestige-preview.cjs
MIR_ESTIMATION04_PHASE=preview node tests/mir-estimation-04-browser.cjs
```

`MIR_CHROMIUM_BIN` choisit le navigateur ; `MIR_ESTIMATION04_OUT` place les preuves hors du dépôt. La CI dédiée reprend ces contrôles sans désactiver les tests existants. Les captures sont des rendus Chromium ; aucun appareil physique n’est présenté comme testé.

## Méthodes et limites de validation

MOON 1.3.11 vérifié sur Atelier le 18 novembre 2026 ; BOSS GOD MODE et méthodes Designer, Ergonomie, Harmonisation, Qualité, Architecture, API et SEO consultés. Mission Atelier : `141d777c-5fe2-4179-b6ec-02d12f9665b3`. Un seul intégrateur coordonne la branche et les fichiers partagés.

SEO/GEO : page TEST protégée et non indexable. Aucun changement d’accès public, aucune garantie d’indexation et aucune publication en production. Aucun backend n’est déployé ou activé dans ce lot. L’envoi réel reste une opération distincte, non exécutée. Les contrôles techniques et la comparaison visuelle ne constituent pas une approbation nouvelle de Frederick.
