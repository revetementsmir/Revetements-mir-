# Studio — proposition automatique depuis le formulaire PDF

Ce complément de PR44 poursuit S1/S2; le bilan S1 à `36606f45507f2943a6e3f915d9e14221cc3156c7` et le point de sauvegarde `fc9f18111855d1c3b6ea5c9e0500b9503503551b` restent dans l’historique. Il ne certifie pas une conversion complète de tous les bâtiments. Aucun déploiement, fusion ou appel de production.

## Comportement

Le formulaire importe l’original et conserve ses vues S1, puis lance la lecture locale et la reconstruction proposée. Les vues sont calibrées séparément et rapprochées par leurs contours et repères. Le moteur propose les pans, ouvertures et toitures compatibles. Les élévations propres et le 360° utilisent cette même géométrie; aucun raster du PDF ne constitue le bâtiment. Les finitions peuvent être choisies puis sauvegardées et rouvertes sur ce modèle proposé. Aucune conversation avec un agent n’intervient dans ce traitement.

La validation des mesures est distincte du choix d’une finition : une finition confirmée ne confirme pas un contour, une hauteur ou une fenêtre. Les quantités excluent les propositions non confirmées. Les niveaux manquants ne sont pas créés comme plans confirmés. Le modèle peut rester incomplet; les mesures absentes ou contradictoires et les correspondances non établies restent à vérifier.

Les projets déjà corrigés sont conservés lors d’une nouvelle tentative. Le traitement vérifie le projet actif et sa révision avant une écriture atomique. Il refuse une géométrie invalide et conserve le projet antérieur. Ce comportement ne constitue pas encore une régénération avec réaffectation automatique des retouches sur une nouvelle topologie.

## Causes corrigées

- Le branchement secondaire du bouton d’import supprimait la demande de reconstruction. Le formulaire possède désormais un seul point d’entrée, couvert par le test navigateur S1.
- Les petites barres obliques d’une chaîne de cotes étaient ignorées : une cote partielle pouvait être associée à toute la largeur. Le repérage vérifie les marques intermédiaires et la ligne réelle, sans changer le comportement historique par défaut.
- Plusieurs lectures OCR d’une même inscription ne sont plus traitées comme plusieurs cotes indépendantes. Une autre inscription doit corroborer une alternative; deux inscriptions contradictoires restent un conflit. Aucune moyenne.
- Un cadre visible dans l’élévation peut proposer une fenêtre même si l’interruption correspondante du mur n’a pas été extraite du plan de niveau. La provenance reste l’élévation, la correspondance au plan reste non résolue. Masques de légende et annotations colorées sont exclus.
- Les propositions valides deviennent visibles sans promotion en mesures confirmées. Le cadrage 360° réserve la place des commandes superposées au bâtiment.

## Recettes et état des sept dossiers

Les sept imports historiques (48 pages, 46 vues) restent décrits dans [le bilan S2](mir-studio-s2.md). Les résultats ci-dessous concernent uniquement la nouvelle conversion automatique. Les codes C1–C7 suivent le manifeste privé; aucune source client ni coordonnée issue d’un original n’est publiée.

| Cas | Pages / vues de l’import historique | Nouvelle recette automatique |
|---|---:|---|
| C1 | 5 / 5 | Premier essai réservé exécuté sur le moteur figé `3faa3cd` : import conservé, mais aucune référence d’échelle associée au contour (`SCALE_UNKNOWN`); hauteur non établie, 0 mur/0 ouverture/0 toiture générés. Échec de conversion, pas réussite géométrique. |
| C2 | 5 / 5 | Non exécutée dans ce complément; la recette S2 assistée reste une preuve distincte. |
| C3 | 5 / 5 | Import original neuf, sans saisie de référence, cote ou point : 15 pans, 15 ouvertures, 2 toitures proposées. Finition et réouverture identiques. |
| C4 | 5 / 5 | Import original neuf sans saisie géométrique : 8 pans, 12 ouvertures, 1 toiture proposés; finition et réouverture identiques. Les deux fenêtres arrière omises au premier essai sont proposées depuis l’élévation; correspondance au plan non confirmée. |
| C5 | 5 / 5 | Non exécutée dans ce complément; la recette S2 assistée reste une preuve distincte. |
| C6 | 6 / 10 | Non exécutée dans ce complément; séparation maison/cabanon et rotations restent couvertes par les régressions S1. |
| C7 | 17 / 11 | Non exécutée dans ce complément; reconstruction de plusieurs niveaux avec alignement automatique non certifiée. |

Le cas réservé C1 avait déjà servi à l’import et à l’audit de sources S1/S2, notamment à l’observation d’un porche couvert. Il est réservé au moteur de reconstruction, pas présenté comme un PDF jamais vu. Le code et ses empreintes sont figés avant sa recette. Aucune règle n’a été réglée sur ses dessins après cet essai. Le correctif ultérieur `8f9dbe9`, motivé par un contre-exemple synthétique, refuse aussi deux cotes différentes sur un même segment même si leurs échelles se trouvent à moins de 5 %. Il ne fournit aucune mesure au cas réservé. Le premier résultat reste attribué au moteur figé; le replay sur la tête courante est enregistré séparément.

La recette privée conserve original, empreinte, octets, actions utilisateur, journal, inventaire, quatre élévations et quatre angles 3D, sauvegarde et réouverture, durée et échantillons de mémoire JavaScript. Ces échantillons ne mesurent pas le pic mémoire du processus. Les premiers essais échoués ou incomplets restent conservés : `automatic-form-1` n’avait pas lancé la conversion; `automatic-form-2` omettait deux fenêtres sur C4. Aucun de ces résultats n’est requalifié en réussite après correction.

La dernière reprise des trois originaux utilise le code `8f9dbe945ec5bb51988d4396780ce372859956d2`, avec empreintes des fichiers exécutés. C3 et C4 conservent respectivement 15/15/2 et 8/12/1 pans/ouvertures/toitures après réouverture. C1 reste à zéro, avec le même blocage de calibration. Aucune erreur JavaScript ni requête externe n’est relevée dans ces trois parcours locaux. L’absence de référence reconnue sur C1 désigne une limite d’extraction ou de rapprochement du moteur, pas une absence de cote dans le PDF.

## Mesures et ressources observées

| Cas | Import local | Reconstruction | Parcours total | Plus grand échantillon de mémoire JS |
|---|---:|---:|---:|---:|
| C3 | 64,17 s | 12,86 s | 82,65 s | 79,4 Mo |
| C4 | 54,15 s | 8,43 s | 67,96 s | 78,2 Mo |
| C1, conversion échouée | 50,08 s | 5,63 s | 56,06 s | 70,6 Mo |

Ces durées décrivent une exécution Chromium dans cet environnement, pas des performances garanties sur téléphone.

Sur C3, les trois contraintes de contour vérifiées (largeur, profondeur, retrait) correspondent aux cotes écrites à moins de 1 mm; la hauteur estimée diffère d’environ 2 cm. Sur C4, une portée reste estimée avec environ 1,3 cm d’écart, et la hauteur diffère d’environ 3,1 cm. Ces constats ne valident pas toutes les ouvertures ou tous les volumes. Les cotes écrites restent distinctes des positions estimées. Les actions de recette sont uniquement sélection du PDF, ouverture du dossier, choix/confirmation d’une finition et rechargement; aucune saisie de cote ou modification de point.

L’export de géométrie fourni par l’utilisateur a aussi été passé dans l’adaptateur pur et la protection de régénération : inventaire inchangé, 15 murs, 4 ouvertures confirmées et une finition conservés, aucune proposition de remplacement. Cet essai de conservation n’est pas présenté comme une réimportation du PDF.

## Validation et limites

Les fixtures publiques sont synthétiques. Les tests ajoutent les causes ci-dessus, le refus d’un contour proposé invalide sans perte, les statuts de mesure, l’isolation des projets et la sauvegarde des finitions. Les assertions S1/S2 historiques restent actives. Les captures Chromium FR/EN de téléphone, tablette et PC sont des formats de navigateur; aucun essai sur appareil physique Samsung n’est revendiqué.

Les 20 suites de contrats de la [CI Studio](../../.github/workflows/mir-studio-s1-pr.yml) passent localement, ainsi que les parcours navigateur S1, S2, reconstruction, CLIENT 360, PDF volumineux, murs/terrain, interactions et textures. Le test d’isolation, d’abord interrompu par `spawnSync git EPERM` dans le bac à sable, passe sans changement d’assertion après réexécution avec l’accès nécessaire. La régression de prévisualisation du PDF synthétique de 108 Mo, trouvée pendant ce travail, est corrigée : un traitement sans géométrie exploitable conserve la prévisualisation historique. Les journaux des échecs restent conservés. La CI de la tête poussée est consignée dans PR44; les vérifications PostgreSQL utilisent uniquement une instance jetable.

Les recettes C3/C4 ne certifient pas encore les entrées, porches, escaliers, toutes les tailles d’ouvertures ni les fondations. Les tailles estimées peuvent différer de la cote écrite insuffisamment lue; elles restent proposées. La comparaison de C4 relève notamment environ 14 cm d’écart de largeur et 15 cm de hauteur sur une fenêtre avant : elle échoue au seuil de précision défini, même si le parcours logiciel fonctionne. Ce dossier n’est donc pas déclaré entièrement converti. Le raccordement automatique de plusieurs plans de niveaux, l’exploitation complète des coupes, les toitures hors des profils compatibles et la segmentation complète des zones de matériaux restent à poursuivre. L’éditeur S2 reste disponible pour les confirmations/corrections nécessaires, sans demander de retracer les contours déjà proposés.

La confirmation détaillée de toutes les composantes proposées, notamment des toitures et volumes secondaires, doit encore être raccordée au parcours automatique. La recette valide le choix d’une finition et sa persistance, pas la validation complète des mesures ni un métré définitif. Prochaine priorité : rapprocher les inscriptions de dimensions de leurs segments et ouvertures, puis compléter les volumes manquants avec leurs sources avant de revendiquer une conversion complète.

La méthode [Moteur PDF vers 3D](https://github.com/revetementsmir/Revetements-mir-/blob/e1a0e7585a9b5436575756f3ffd0d4ed64af725c/.agents/skills/moteur-pdf-3d/SKILL.md) et ses deux références ont été lues via Mir2. BOSS GOD MODE, MOON et les méthodes Architecture, Métier, Tests et harmonisation visuelle ont guidé cette revue dans le même chat, avec un seul intégrateur. Il ne s’agit pas d’une certification indépendante des résultats.
