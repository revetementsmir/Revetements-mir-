# Conventions de reconstruction et d'évaluation

Lire ce document pour modifier l'extraction, la résolution multivue ou les critères de validation. Adapter les représentations au code existant ; les conventions ci-dessous ne prescrivent aucune bibliothèque.

## Traçabilité minimale

Conserver pour chaque observation : document et version, page, vue, type de dessin, bâtiment/niveau, coordonnées sources, transformation vers la vue et provenance (texte vectoriel, tracé, OCR, annotation autorisée). Pour chaque mesure, conserver valeur, unité, ancrages, élément mesuré, statut et observations utilisées.

Séparer explicitement :

- **Mesuré** : valeur établie par une cote ou référence vérifiable.
- **Déduit** : valeur calculée depuis des observations et hypothèses explicites.
- **Inconnu** : valeur non déterminée ; ne pas l'encoder comme zéro valide.
- **Contradictoire** : observations incompatibles non résolues.

Conserver une incertitude ou un résidu significatif ; ne pas convertir automatiquement une confiance de modèle en probabilité de justesse sans calibration.

## Échelle et transformations

Dans une même vue à échelle uniforme, une longueur peut être déduite par :

L_cible = L_reference × distance_cible / distance_reference.

Les deux distances doivent être mesurées dans le même repère corrigé. Vérifier les ancrages et la direction concernée. Une feuille commune ne garantit ni la même échelle ni la même projection. Les cotes écrites priment sur une estimation issue d'objets supposés standard.

Pour un scan déformé, plusieurs références dans des directions et positions distinctes peuvent révéler que le modèle à échelle unique est insuffisant. Ne pas corriger arbitrairement une perspective avec une seule cote. Ne pas appliquer une dimension horizontale en plan à une longueur inclinée réelle sans projection justifiée.

Définir une unité canonique interne et convertir explicitement pieds, pouces, fractions et mètres à l'entrée et à la sortie. Conserver l'expression originale pour la traçabilité. Définir l'origine, les axes et l'altitude de référence ; ne pas confondre le terrain, le bas des murs et un plancher.

## Représentation architecturale

Organiser les données autour des relations bâtiment → niveau → élément → surface de finition. Relier les ouvertures au mur et aux observations correspondantes. Séparer les observations 2D de l'identité de l'élément 3D : plusieurs vues peuvent décrire une seule fenêtre.

Conserver les paramètres et contraintes en plus du maillage. Une régénération doit permettre d'expliquer le déplacement d'une ouverture, un raccord ou une modification de toit. Ne pas se limiter à plaquer une image de façade sur une boîte si le produit attend une géométrie extérieure modifiable.

Contrôler notamment :

- contact et altitude des volumes maison/garage/porche;
- ouvertures traversantes, dimensions et positions cohérentes entre vues;
- continuité des pans, faîtages et noues établis par les sources;
- distinction entre pignon de mur et versant de toiture;
- absence de faces doublées, de surfaces dégénérées ou de traits parasites coplanaires;
- vraies sous-faces de soffites et distinction avec les fascias;
- attribution correcte des zones malgré les volumes masqués;
- sauvegarde des choix et correspondance des zones après les régénérations couvertes.

## Évaluation indépendante

Définir un domaine de prise en charge explicite avant de revendiquer la réussite : types de documents, vues nécessaires, qualité minimale, familles de bâtiments et toitures. Tester aussi des documents qui sortent de ce domaine pour vérifier qu'ils produisent un état honnête.

Préparer des références indépendantes et versionnées. Conserver séparément le corpus de développement et celui de validation. Comparer la même révision du moteur sans ajustement particulier au dossier évalué. Lorsqu'un cas réservé sert à corriger le moteur, documenter cette contamination et utiliser un autre cas pour la preuve indépendante suivante.

Rapporter au minimum, selon les objectifs du produit :

| Dimension | Mesure utile |
| --- | --- |
| Géométrie | Écarts de longueurs, altitudes, angles et positions dans des unités réelles. |
| Éléments | Ouvertures/murs/toits manquants, doublés, inventés ou mal associés. |
| Fidélité multivue | Contours reprojetés et correspondances avec les vues sources. |
| Autonomie | Interventions nécessaires, cache éventuel, géométrie ou cotes corrigées à la main. |
| Fiabilité | Cas acceptés, partiels, refusés et acceptations incorrectes. |
| Produit | Choix de finition, sauvegarde, réouverture, régénération et persistance des zones. |
| Ressources | Temps, mémoire, taille du modèle et fluidité sur l'environnement visé. |

Définir et justifier les tolérances avec l'usage. Une visualisation indicative et un métré destiné à une commande n'exigent pas les mêmes garanties ; ne pas convertir implicitement l'une en l'autre.

## Références primaires

Consulter uniquement les références pertinentes pour les bibliothèques réellement utilisées et vérifier leur version avant d'adapter une API :

- PDF.js : https://mozilla.github.io/pdf.js/
- OpenCV : https://docs.opencv.org/4.x/
- Blender, API Python : https://docs.blender.org/api/current/
- Three.js, glTF : https://threejs.org/docs/pages/GLTFLoader.html
- glTF 2.0 : https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

Ces liens sont des points d'entrée documentaires, pas une preuve que ces moteurs sont installés ou retenus dans le projet.
