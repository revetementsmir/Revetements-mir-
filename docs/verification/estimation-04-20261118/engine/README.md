# Estimation04 — moteur et interface fonctionnelle

Les modifications de ce lot concernent `dist/mir-estimate.js` et le nouveau `dist/mir-estimation-04.js`. Le parcours en cinq étapes ne se monte que sur `body.mir-estimation-04[data-estimate-page="general"]`.

Le formulaire et les fonctions existantes restent responsables des brouillons IndexedDB, des fichiers PDF, de leur validation et du transport. Le nouveau module ne transmet aucune demande lui-même. `mir-client-pages.js` demeure identique à la base : le formulaire porte `data-mir-client-steps="estimation04"` avant son initialisation, ce qui utilise sa garde existante pour éviter une seconde pagination.

## Champs et données

| Interface | Champ du formulaire | Transmission |
| --- | --- | --- |
| Maison, Chalet, Multilogement, Rénovation | `projectType` | `projectDetails.type`: `house`, `chalet`, `multi_unit`, `renovation` |
| Municipalité | `city` | `address.city`, champ existant |
| Échéancier | `timeline` | `projectDetails.timeline`: `undecided`, `asap`, `within_3_months`, `within_6_months`, `later` |
| Dimensions facultatives | `dimensions` | `projectDetails.dimensions`, texte de 2000 caractères au maximum |
| Matériaux facultatifs | `materials` | `projectDetails.materials`, texte de 2000 caractères au maximum |

Maison est sélectionnée initialement sur un brouillon non figé sans choix de projet. Ce défaut n’est jamais ajouté à une ancienne soumission figée. Les informations d’un formulaire figé et son `submission` ne sont pas reconstruites. `clientStep` reste un état local du brouillon, hors payload transmis.

La configuration doit annoncer `projectDetailsVersion: 1` pour autoriser une nouvelle demande enrichie. Un service ancien bloque l’envoi avec un message explicite sans supprimer le brouillon. Une ancienne soumission sans `projectDetails` conserve son format et sa voie de reprise. `config.preview: true` ou `MIREstimateConfig.preview: true` désactive l’envoi sur cette page ; les limites locales fournies par l’aperçu restent utilisables pour préparer de vrais fichiers PDF.

## Navigation et validation

Les sections `[data-estimate-step="0..4"]` correspondent à Projet, Dimensions, Matériaux, Documents et Coordonnées. Les boutons `#estimate04-back`, `#estimate04-next` et `[data-estimate-go]` conservent les valeurs et les PDF. La progression s’enregistre dans le brouillon et se restaure au rechargement.

Continuer vérifie les étapes précédentes et place le focus sur le premier champ invalide. Les erreurs sont associées aux contrôles par `aria-describedby` et `aria-invalid`. La saisie ne provoque aucun changement d’étape. Le retour reste possible sans remplir les champs suivants. La navigation est désactivée pendant une transmission.

Le récapitulatif final contient projet, municipalité, échéancier, dimensions, matériaux, coordonnées, adresse, note et liste des PDF réellement présents. Il ne présente aucun prix ni aucune réception fictive. Les seuls reçus affichés par le moteur viennent de sa réponse de transport existante.

## Langues

Le module utilise `MIRClientLocale.getLocale()`, son événement et `html.lang`. Il ne crée aucune préférence de langue. Les noms des champs, valeurs des options et textes saisis restent stables. Les nouveaux libellés, erreurs inline, statuts de capacité/aperçu, limites PDF et actions Retirer/Remove sont localisés par le module ; les autres messages utilisent le dictionnaire existant. Les erreurs IndexedDB restent visibles.

Le texte du sélecteur de fichier natif suit la langue du navigateur/système. Ses libellés de page, limites, liste des documents et boutons de suppression suivent la langue MIR.

## Vérification ciblée

`node tests/mir-estimation-04-engine-browser.cjs` utilise un serveur de fichiers local, bloque les requêtes externes et intercepte le POST dans Chromium avec une réponse503 simulée. Aucun courriel, stockage serveur ou service Supabase n’est utilisé.

`smoke.json` consigne les résultats réussis : cinq étapes, focus de validation, choix Rénovation, champs complets, vrai PDF conservé dans IndexedDB après rechargement, FR/EN sans modification des données, blocage d’un service ancien, soumission figée après503 et restitution inchangée, conservation du message d’incompatibilité après reprise, action de suppression en anglais, zéro erreur JavaScript.

La matrice responsive, les captures finales, les cas de succès simulé et la non-régression des modales panier/Studio/pliage sont vérifiés séparément par les agents de recette ; ce contrôle ciblé ne s’y substitue pas.
