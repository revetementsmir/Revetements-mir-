# PDF client réellement téléchargé — recette locale

**PASS : deux pages exportées par le vrai bouton client, puis ouvertes et inspectées avec PyMuPDF 1.26.6.** Le PDF final fait 57 909 octets. Les deux pages sont vectorielles avec texte extractible ; elles ne sont pas des montages de captures.

## Fichiers à examiner

- [PDF réellement téléchargé](MIR-QA-local-deux-faces.pdf)
- [Page 1 rendue depuis le PDF](page-1.png)
- [Page 2 rendue depuis le PDF](page-2.png)
- [Écran du bouton de téléchargement natif](native-download-ready.png)
- [Résultats navigateur](browser-results.json)
- [Texte et contrôles du PDF](pdf-inspection.json)

Le nom proposé par l’application est `MIR-demande-pliage-QA-LOCAL-2-FACES.pdf`. Le fichier de preuve a été sauvegardé sous un nom explicitement QA.

## Données de recette

Les deux pièces sont des **fixtures fictives**, créées localement par `MIRProduction.createTemplate()` puis `instantiateTemplate()`. Elles sont placées dans un contexte navigateur neuf via le stockage local. Aucun dossier utilisateur n’est utilisé et aucun ajout commercial n’est effectué.

| Contrôle | Page 1 | Page 2 |
| --- | --- | --- |
| Face | Face 1, liseré d’un côté physique | Face 2, liseré du côté opposé |
| Angles enregistrés | Rotations −30° et 90° | Rotations 45,5° et −67,25° |
| Angles intérieurs imprimés | 150° et 90° | 134,5° et 112,75° |
| Quantité | 2 | 3 |
| Cotes / longueur | A 5 po, B 3 po, C 2 po / 120 po | Identiques |
| Fabricant / teinte | Gentek Canada / Blanc Pur 30 | Gentek Canada / Amande |
| Référence de teinte | 431 | 432 |
| Produit imprimé | Gentek — Feuille peinte aluminium 3037, 24 po × 98,5 pi | Identique |
| Référence produit imprimée | `gentek-coil-3037` | Identique |

Les noms et références proviennent du catalogue local ; leur emploi dans la fixture ne confirme aucun stock ni prix MIR. La référence produit est identifiée comme telle, sans être présentée comme un code fabricant.

## Chaîne réellement exécutée

1. Ouverture de `production.html?mode=client&kind=profile#production-order` dans Chromium 155.0.8059.79.
2. Vérification que le vrai contrôleur charge les deux instantanés sans réinterprétation.
3. Clic sur le vrai bouton `#production-pdf`.
4. Attente du panneau natif `#mir-pdf-ready`, puis clic sur son lien `a[download]`.
5. Sauvegarde du téléchargement navigateur ; signature `%PDF-` et empreinte vérifiées.
6. Vérification que les instantanés du dossier restent identiques octet pour octet après export.
7. Lecture du texte PDF avec PyMuPDF, puis rendu des deux pages à échelle 2 et inspection visuelle.

PyMuPDF détecte exactement un chemin bleu continu par pièce. Ses primitives sont jointives, sans rupture. Sur le premier segment horizontal, le chemin bleu se trouve à −3,888 points de la ligne centrale pour la face 1 et +3,888 points pour la face 2 : le choix inverse bien le côté physique. Les lettres, cotes, angles intérieurs, quantités, références, notes et réserves sont lisibles. Les noms longs et références plus longues sont également testés séparément dans les détails paginés, sans troncature.

Seuls les GET locaux sont autorisés. La lecture externe habituelle du tarif public est bloquée avant transport ; aucun tarif fictif n’est substitué. Cette requête bloquée et son message console attendu sont consignés. Aucun autre transport externe, aucune demande, écriture Supabase, commande, paiement ou courriel.

## Reproduction

```sh
node tests/mir-pliage03-pdf-browser.cjs
python3 tests/mir-pliage03-pdf-inspect.py
```

Le navigateur requiert `playwright` et Chromium local (`MIR_CHROMIUM_BIN` configurable). L’inspection requiert PyMuPDF. `MIR_PLIAGE03_OUT` choisit le dossier parent des preuves. La recette PDF réelle ci-dessus est en français ; les labels produit/référence et leurs valeurs source sont aussi vérifiés en anglais par la recette i18n distincte.
