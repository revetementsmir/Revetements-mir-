# Avis final indépendant — PDF simplifié et option détaillée

Aucun défaut bloquant observé dans le périmètre examiné. Aucun fichier application n’a été modifié pendant cette revue.

## Preuves réellement vues

- [Page Avant simplifiée](../pdf/after/page-simple-01.png) : grande façade entière, titre et légende lisibles, trois choix affichés et mention explicite du choix supplémentaire ; les réserves d’échelle et de fabrication restent visibles.
- [Page Gauche simplifiée](final-review/page-simple-left.png) : rasterisation de la page 4 du vrai `studio-simple-fr.pdf`, examinée visuellement. La façade, ses ouvertures, le titre et la légende sont entiers, sans chevauchement ni colonne technique.
- [Option détaillée sur PC en français](final-review/checkbox-fr-1440.png) et [sur téléphone en anglais](final-review/checkbox-en-390.png) : libellé lisible, case 18×18px et contour de focus sable. L’espace clavier coche la case ; les deux fenêtres restent sans débordement horizontal. `MIR_STUDY.snapshot()` est strictement identique avant/après cette préférence de document. Aucune exportation n’a été déclenchée lors de ce contrôle de la case.

## Revue de code et conservation des données

`mir-studio-pdf.js` prépare une présentation à partir des SVG et résumés reçus, sans calculer de quantité ou modifier le modèle. Le format simple comporte quatre pages de présentation ; il indique qu’une version détaillée est disponible. L’option détaillée conserve les dessins annotés distincts et les annexes techniques. Dans le document détaillé réel examiné, les 52lignes source sont présentes à l’identique et entièrement restituées par leurs fragments de pagination, sans perte ni double quantité constatée.

La modification de `annotated-pdf.js` est conditionnée par le thème explicite, la route cliente `plan.html`, son marqueur et la reconnaissance du parcours client. Les contextes embed/admin/atelier et les documents disposant d’un autre layout suivent la branche historique. Le chargement du nouveau module est vérifié avant l’appel ; son absence déclenche une erreur explicite. Les images SVG sont lues et copiées, sans modification du SVG source conservé.

La règle CSS ajoutée pour `.mir-studio-pdf-option` reste sous le marqueur client. Elle habille seulement l’option PDF et n’altère ni les groupes du Studio, ni les contrôles des employés. Les tests réels FR 1440 et EN 390 sont consignés dans [checkbox-check.json](final-review/checkbox-check.json).

Limite de cet avis : inspection visuelle des pages Avant et Gauche et de la case aux deux formats indiqués, complétée par la vérification des 52lignes du document détaillé ; les autres états restent couverts par la recette générale du lot. Aucune certification globale du bilingue ou d’exactitude de construction n’est revendiquée ici.

## Sources examinées

- `mir-studio-pdf.js` : `8cd05c00f319b96b2c0493517a0775267c14b421d9dfd6680194bfeec2f69fdf`
- `annotated-pdf.js` : `473d7515a257e8e1c669bf3480b9d08a2a2ee7b5f172b7aa1a2a0973190b6413`
- `mir-studio-surfaces.css`, avec la nouvelle option : `0de81ca509f50e74848f940398f81af3aaf57f7f011165a7962793b246ab3b6f`
- `mir-studio-export-options.js` : `e7066c6913f896543ccf7ecdaa998ee0b550549729e2f12fcdc2b660d0e87430`
