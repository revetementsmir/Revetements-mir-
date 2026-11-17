# Recherche de vrais échantillons plans — 17 novembre 2026

Mission b5c95993-abff-4e6f-844d-fade08027d2f. Recherche seulement; aucune modification application/catalogue, aucune image générée ou transformée.

## Résultat utilisable immédiatement

Cinq vrais échantillons JDP Äkta déjà locaux ont été ouverts individuellement et inspectés. Ce sont des photos planes de texture, sans sphère ni fond ajouté. Les sources sont celles du catalogue, sur le site JDP.

| Couleur | Fichier local dans dist/assets/catalogue-swatches | Dimensions | Observation |
|---|---|---:|---|
| Gris antique | jdp-gris-antique-c790727e.png | 1500×2000 | Grain vertical profond, relief antiqué net. Recommandé pour couverture rectangulaire Äkta. |
| Platine | jdp-platine-01f8446f.png | 1500×2000 | Même grain visible que Gris antique, teinte claire. |
| Érable | jdp-erable-dda419ba.jpeg | 1200×1200 | Bois doré, grain vertical, surface moins striée. |
| Birmanie | jdp-birmanie-bdf1d438.jpeg | 1200×1200 | Bois brun chaud, grain vertical. |
| Macchiato | jdp-macchiato-325b7af9.jpeg | 1200×1200 | Bois brun, détail vertical bien visible. |

Aucune de ces photos ne montre avec certitude des jonctions régulières entre plusieurs lames. Elles prouvent la matière/couleur, pas une coupe ou géométrie du profil306. Pour un cadre3:2, un cadrage CSS centré garde un vrai détail de matière; ne pas dessiner des lames inexistantes. Les URL et SHA256 sont dans le JSON associé.

## Rialux Bosco : source plane officielle découverte, binaire non récupéré

[La fiche Lightbeans Bosco Beige dune](https://lightbeans.com/en/texture/rialux/bosco-brun-dune) expose une image « surface » plane en plus de sa sphère. Chaque variante Bosco expose le même type de lien. Les cinq liens exacts sont dans le JSON associé.

Quatre images ont été résolues comme images par le connecteur web; Blanc alpin a renvoyé une erreur interne au chargement, mais son URL provient bien de son lien de fiche. Aucun de ces fichiers n'a été téléchargé ni inspecté visuellement : le téléchargement direct public retourne Tunnel403. Ne pas annoncer ces nouveaux visuels comme intégrés.

## JDP Bluhouss307 : source plane exacte encore manquante

[La fiche officielle JDP](https://jdprevetement.com/collections/bluhouss/) distingue306 cèdre rouge et307 cèdre blanc. [La fiche Lightbeans307](https://lightbeans.com/en/texture/jdp-revetement/cedre-blanc-ecobleach-antique-profil-307) est exacte mais n'expose qu'un aperçu01.png, sans lien « surface » découvert. Pas de photo plane307 fiable trouvée dans les assets locaux. Ne pas employer la texture Äkta306 comme si elle prouvait Bluhouss307.

## Limites d'accès

Deux téléchargements publics avec réseau autorisé (page JDP et plane Lightbeans) ont retourné Tunnel connection failed403. Le connecteur web fournit des liens et des placeholders textuels ImageDisplayed, pas les octets des images. Aucune tentative de contournement par proxy. Les sources planeBosco constituent une piste d'intégration authentique quand les fichiers seront accessibles.

## Complément : photo de pose Bluhouss cèdre blanc

[Projet Bâtisse, source JDP](https://jdprevetement.com/projects/batisse/) documente la collection Bluhouss, le cèdre blanc et la finition antique. La pagegamme JDP associe le cèdre blanc à307; le projet ne donne pas lui-même le numéro. Ses cinq photos exactes sont listées dans le JSON. Premier fichier : `TIFF-STROM-QC-JUSTEDUPIN-2-2000x1299.png`. Le téléchargement autorisé retourne également Tunnel403. Aucune inspection visuelle ou sélection de cadrage n'est donc revendiquée. Ce candidat ne peut pas être annoncé comme intégré.
