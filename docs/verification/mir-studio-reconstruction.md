# Studio — conversion proposée depuis les sources, état de la PR44

Ce complément poursuit S1/S2 sur la même branche. Il ne certifie pas une conversion complète des bâtiments. Le bilan S1 à `36606f45507f2943a6e3f915d9e14221cc3156c7` reste conservé. Aucun déploiement ou fusion.

Le Studio propose le contour du niveau fourni, puis recoupe les élévations et les repères de hauteur. Les élévations reconstruites et le 360° utilisent les mêmes murs, ouvertures, finitions et identifiants. Le PDF est consultable séparément et n'est pas une texture du bâtiment. Les propositions et les contradictions demandent confirmation. Les murs bas observés dans les élévations ne créent pas un plan de RDC confirmé.

Les toitures proviennent de profils mesurés dans des vues compatibles. Les extrémités de traits interrompus par une légende ne deviennent pas des faîtages. Une différence de hauteur contradictoire reste non résolue. Un faîtage ponctuel recoupé impose une seule hauteur aux pans : les profils initiaux et la correction restent conservés, sans moyenne des cotes.

Un retour de toiture peut rejoindre le toit principal. Lorsqu'un même trait est ajusté deux fois à quelques pixels près, le pan existant sert de référence au raccord; les deux profils et leur résidu restent dans la provenance. Les faces coplanaires sont réunies pour supprimer les arêtes artificielles. Les surfaces superposées sont découpées à leur intersection, et l'ordre d'affichage dépend de leur chevauchement réel. Le retour avant du cas privé C3 est une toiture à versants, pas une paroi de revêtement. L'interprétation erronée en pignon bardé a été retirée et reste documentée dans l'historique privé/Atelier.

## Preuves et limites

Les originaux, OCR, coordonnées, captures et recettes détaillées restent hors dépôt dans `/workspace/mir-studio-private`. Aucune analyse externe. Les confirmations des recettes sont des validations QA, pas une approbation client.

| Cas privé | Dernière recette réellement exécutée | Limite de cette preuve |
|---|---|---|
| C3 | PDF original par formulaire local : 5 pages/5 vues, octets et empreinte vérifiés; contour automatique à 6 points, 15 pans après revue des murs bas et du volume secondaire; 2 toitures, retour avant conservé, aucun plateau au faîtage; finition et réouverture identiques | 4 ouvertures hautes de façade confirmées dans cette recette. Ouvertures basses/latérales, contact visuel au pied du garage, fondations et détails à compléter. Bâtiment complet non certifié. |
| C4 | PDF original par formulaire local : 5 pages/5 vues, octets et empreinte vérifiés; contour automatique à 4 points, 8 pans après revue des murs bas; 1 toiture sans plateau; finition et réouverture identiques | 2 ouvertures hautes de façade confirmées. Assemblage du porche et autres ouvertures non confirmés. Bâtiment complet non certifié. |

Les deux recettes `conversion-form-roof-review-1` enregistrent zéro erreur JavaScript et zéro requête extérieure. Leur manifeste `runtime-sha256.json` lie les preuves aux fichiers exécutés. Les essais `conversion-restored-review-*` antérieurs sont explicitement des restaurations d'inventaires déjà importés, pas de nouveaux imports. Les rendus de diagnostic ayant révélé faîtages plats, raccords artificiels ou mauvaise interprétation du retour ne deviennent pas des réussites après correction.

La matrice historique des sept originaux reste dans [le bilan S2](mir-studio-s2.md). Seuls C3/C4 ont été réimportés pour ce complément. Les cinq autres dossiers ne sont pas déclarés convertis par ces essais.

## Régressions

`tests/mir-studio-reconstruction.cjs` reproduit les causes : plusieurs retraits, couleur sans géométrie, sources et repères, étage seul, échelle/hauteur absentes, murs bas sans contour inventé, extrémité de pente cachée, hauteurs contradictoires, plateau au faîtage, arête parasite entre pans coplanaires, trous/superpositions, ordre de profondeur incorrect et élément extérieur de profondeur inconnue.

`tests/mir-studio-reconstruction-browser.cjs` utilise uniquement des dessins synthétiques. Il vérifie proposition sans retracé, choix explicite entre cotes contradictoires, dimensions physiques des SVG, absence du raster PDF, identifiants communs 2D/360°, finition aperçu/annulation/confirmation, sélection et sauvegarde de toiture, réouverture, niveau observé sans contour, FR/EN. Les captures Chromium 390/834/1440 ont été ouvertes; elles ne représentent pas des appareils physiques. Samsung demeure en attente.

Les suites S1, S2, CLIENT 360, cotation, aperçu, lecteurs, isolation PR44, titres/découpage, terrain, murs, matériaux, FR/EN et Studio public restent actives, sans assertions affaiblies. La CI doit être relevée sur le SHA complet poussé, séparément des essais locaux et des têtes précédentes. Les artefacts CI restent synthétiques.

## Suite nécessaire

Terminer les ouvertures et assemblages encore manquants, vérifier toutes les façades contre les sources et les angles 3D, puis recetter la conversion complète. Les quantités restent partielles. Aucun original client dans le dépôt, aucune opération backend supplémentaire, aucune opération production, aucun courriel, aucune fusion/publication.
