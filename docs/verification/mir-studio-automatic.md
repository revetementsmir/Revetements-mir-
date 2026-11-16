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
| C1 | 5 / 5 | Réservé à l’évaluation sans réglage du moteur sur ce dossier; résultat à relever. |
| C2 | 5 / 5 | Non exécutée dans ce complément; la recette S2 assistée reste une preuve distincte. |
| C3 | 5 / 5 | Import original neuf, sans saisie de référence, cote ou point : 15 pans, 15 ouvertures, 2 toitures proposées. Finition et réouverture identiques. |
| C4 | 5 / 5 | Import original neuf et sans saisie géométrique. La première comparaison a révélé deux fenêtres hautes arrière manquantes; correction générale en vérification. |
| C5 | 5 / 5 | Non exécutée dans ce complément; la recette S2 assistée reste une preuve distincte. |
| C6 | 6 / 10 | Non exécutée dans ce complément; séparation maison/cabanon et rotations restent couvertes par les régressions S1. |
| C7 | 17 / 11 | Non exécutée dans ce complément; reconstruction de plusieurs niveaux avec alignement automatique non certifiée. |

Le cas réservé C1 avait déjà servi à l’import et à l’audit de sources S1/S2, notamment à l’observation d’un porche couvert. Il est réservé au moteur de reconstruction, pas présenté comme un PDF jamais vu. Le code et ses empreintes sont figés avant sa recette. Toute adaptation ultérieure sur ce cas le fera sortir de cette catégorie.

La recette privée conserve original, empreinte, octets, actions utilisateur, journal, inventaire, quatre élévations et quatre angles 3D, sauvegarde et réouverture, durée et échantillons de mémoire JavaScript. Ces échantillons ne mesurent pas le pic mémoire du processus. Les premiers essais échoués ou incomplets restent conservés : `automatic-form-1` n’avait pas lancé la conversion; `automatic-form-2` omettait deux fenêtres sur C4. Aucun de ces résultats n’est requalifié en réussite après correction.

## Validation et limites

Les fixtures publiques sont synthétiques. Les tests ajoutent les causes ci-dessus, le refus d’un contour proposé invalide sans perte, les statuts de mesure, l’isolation des projets et la sauvegarde des finitions. Les assertions S1/S2 historiques restent actives. Les captures Chromium FR/EN de téléphone, tablette et PC sont des formats de navigateur; aucun essai sur appareil physique Samsung n’est revendiqué.

Les recettes C3/C4 ne certifient pas encore les entrées, porches, escaliers, toutes les tailles d’ouvertures ni les fondations. Les tailles estimées peuvent différer de la cote écrite insuffisamment lue; elles restent proposées. Le raccordement automatique de plusieurs plans de niveaux, l’exploitation complète des coupes, les toitures hors des profils compatibles et la segmentation complète des zones de matériaux restent à poursuivre. L’éditeur S2 reste disponible pour les confirmations/corrections nécessaires, sans demander de retracer les contours déjà proposés.

La méthode [Moteur PDF vers 3D](https://github.com/revetementsmir/Revetements-mir-/blob/e1a0e7585a9b5436575756f3ffd0d4ed64af725c/.agents/skills/moteur-pdf-3d/SKILL.md) et ses deux références ont été lues via Mir2. BOSS GOD MODE, MOON et les méthodes Architecture, Métier, Tests et harmonisation visuelle ont guidé cette revue dans le même chat, avec un seul intégrateur. Il ne s’agit pas d’une certification indépendante des résultats.
