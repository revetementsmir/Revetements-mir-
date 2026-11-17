# Audit St-Laurent — 17 novembre 2026

Audit en lecture seule du catalogue `dist/catalogue-fd6866b49d21.json`, confronté aux pages officielles consultées le 17 novembre 2026. Aucun code, moteur, catalogue source, prix, stock ni donnée métier modifié. Le [rapport JSON](st-laurent-sources.json) contient les 24 noms français, noms anglais officiels, chemins locaux, dimensions des images, empreintes SHA-256 et liens fabricant.

## Résultat utilisable

Les cinq produits locaux partagent exactement les mêmes 24 identifiants de couleur. Les 24 noms français figurent aujourd’hui sur le [nuancier fibrociment officiel](https://www.fabstlaurent.com/revetements-exterieurs/fibrociment/couleurs/), y compris Lin et Eucalyptus. Les 24 fichiers locaux existent et sont des JPEG lisibles. Cela confirme un **nuancier de collection**, pas une matrice exhaustive de 120 combinaisons produit/couleur/fini.

Conserver les références de clin 6¼ et 8¼ po. La [page produit actuelle](https://www.fabstlaurent.com/produit/bardage-a-clin/) confirme leurs largeurs physiques, avec respectivement 5 et 7 po de largeur couvrante. Rien dans cette page ne les remplace par 5¼ et 7¼ po.

| Produit local | Spécification actuelle confirmée | Limite de preuve couleur/fini |
| --- | --- | --- |
| `st-laurent-lap-625` | 6¼ × 144 × 5/16 po; couvrant 5 po; 4 pièces/20 pi² par paquet | Renvoi au nuancier commun, sans matrice lisse/texturé/couleur |
| `st-laurent-lap-825` | 8¼ × 144 × 5/16 po; couvrant 7 po; 4 pièces/28 pi² par paquet | Même limite |
| `st-laurent-v-groove-825` | 8¼ × 144 × 5/8 po; couvrant 7 po; 2 pièces/14 pi²; profil lisse | Lisse explicitement confirmé; illustration Bouleau; pas de groupe opaque/deux tons par couleur |
| `st-laurent-trim-35` | 1 × 3½ × 144 po | Format présent dans les groupes opaque et deux tons; appartenance individuelle des couleurs non publiée |
| `st-laurent-board-batten-12` | Planche largeur totale/couvrante 12 po, épaisseur 5/16; 3 pièces/36 pi²; couvre-joint 2½ × ¾ × 144 po | Pas de matrice individuelle couleur/texture, ni validation générale de tous les panneaux |

Sources complémentaires : [V-Groove](https://www.fabstlaurent.com/produit/v-groove-architectural/), [moulures fibrociment](https://www.fabstlaurent.com/produit/moulures/), [Board & Batten](https://www.fabstlaurent.com/produit/board-batten/).

## Pourquoi 5¼ et 7¼ ne remplacent pas 6¼ et 8¼

Le [guide HardiePlank lié par le centre documentaire St-Laurent](https://www.fabstlaurent.com/wp-content/uploads/2026/04/Fibrociment_Guide-Installation_New.pdf), page 4/5, possède un tableau de couverture générique comprenant des largeurs 5¼ et 7¼ po, couvrant 4 et 6 po. Ce document décrit le substrat James Hardie; son contenu porte la date septembre 2019 malgré le chemin `/2026/04/`. Il ne prouve pas l’offre commerciale actuelle St-Laurent ni une disponibilité MIR. Les deux références locales 6¼/8¼ correspondent, elles, à la page commerciale actuelle.

Une largeur 7¼ po existe également parmi les **moulures opaques**, mais ce n’est pas une preuve d’un clin 7¼ St-Laurent actuellement proposé.

## Opaque, deux tons, lisse et texturé

La page [moulures FR](https://www.fabstlaurent.com/produit/moulures/) et sa [version EN](https://www.fabstlaurent.com/en/produit/trim-boards/) distinguent deux groupes de formats, tous d’épaisseur 1 po et de longueur 12 pi :

- Opaques : largeurs 3½, 4½, 5½, 7¼, 9¼, 11¼ po.
- Deux tons : largeurs 3½ et 4½ po.

Ne pas étendre les deux tons aux formats plus larges par simple héritage des 24 couleurs. Le seul format local, 3½ po, est présent dans les deux groupes; la source ne donne toutefois pas la classification des 24 couleurs une par une.

La page V-Groove décrit expressément un profil lisse et permet les orientations horizontale et verticale. Les documents génériques James Hardie citent plusieurs textures de substrat; ils n’établissent pas une compatibilité de toutes ces textures avec toutes les finitions St-Laurent. Ne pas appliquer une règle automatique « deux tons = uniquement texturé » à partir du nom ou de l’apparence d’un échantillon.

Le produit Board & Batten actuel est documenté comme un assemblage de planches et couvre-joints. Un titre de page « panneaux de fibrociment » ou un guide générique HardiePanel ne valide pas une offre St-Laurent complète de panneaux 4×8/4×9/4×10 dans chacune des 24 couleurs. Cette extension reste à documenter.

## Nuanciers et données de présentation

Noms vérifiés : Lin, Blanc, Argent, Aspen, Bouleau, Eucalyptus, Gris cendre, Saule argenté, Frêne, Bois de grève, Bois d’érable, Miel naturel, Ipé, Bois de chêne, Peuplier, Noisetier, Pruche vieillie, Écorce, Torréfié, Espresso, Kingwood, Charbon de bois, Ébène, Noir.

Le [nuancier anglais officiel](https://www.fabstlaurent.com/en/exterior-coverings/fiber-cement/colors/) permet un libellé d’affichage anglais par identifiant stable; le JSON fournit cette correspondance. Ne pas associer les deux langues par index de galerie : leurs ordres diffèrent. Les identifiants et valeurs enregistrés du catalogue peuvent rester inchangés.

Les assets locaux sont les originaux localisés déjà référencés par le catalogue. Ils ont été vérifiés localement, sans nouveau téléchargement ni certification d’identité octet par octet avec la version serveur actuelle. Les URL officielles enregistrées restent dans le manifeste pour un contrôle ultérieur. Les noms du nuancier actuel ont, eux, été revérifiés sur le site officiel.

Recommandation d’intégration : garder les 24 échantillons comme palette fabricant, avec `finishGroup: null` tant qu’une matrice fabricant ne classe pas la couleur. Indiquer une validation de collection, sans annoncer toutes les combinaisons comme vérifiées. Réutiliser les images existantes sans calcul de couleur hexadécimale ni recoloration présentée comme photo produit. Préserver les réserves existantes sur disponibilité, unité commerciale, prix et stock MIR.

## Vérifications effectuées et limites

- 5 produits comparés; 24 identifiants identiques par produit.
- 24 noms présents sur les palettes actuelles FR et EN.
- 24/24 images locales décodables; dimensions et SHA-256 consignés.
- Dimensions présentes sur les cinq fiches cohérentes avec les pages actuelles; aucun remplacement géométrique justifié.
- Aucun formulaire fabricant soumis; aucune requête Supabase; aucun courriel.
- Classification individuelle opaque/deux tons et compatibilité exhaustive texture/couleur non publiées dans les sources actuelles consultées : aucune invention de compatibilité.
