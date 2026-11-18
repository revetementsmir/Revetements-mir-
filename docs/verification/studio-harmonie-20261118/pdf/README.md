# PDF client du Studio — preuves locales

Les PDF ci-dessous proviennent de vrais téléchargements par le bouton du Studio et le lien « Télécharger » du panneau de résultat. Chromium sert uniquement les fichiers locaux en GET ; aucun envoi, compte, courriel ou backend n’est utilisé.

## Comparaison

- [Avant — PDF français, 5 pages](before/studio-before-fr.pdf) et [première page](before/page-01.png). `before/export-faces.json` conserve les quatre dessins et leurs 52 lignes de résumé d’origine.
- [Après — version simple française, 4 pages](after/studio-simple-fr.pdf) : [avant](after/page-simple-01.png), [gauche](after/page-simple-04.png).
- [Après — version simple anglaise, 4 pages](after/studio-simple-en.pdf) et [première page](after/page-simple-en-01.png).
- [Après — version détaillée française, 8 pages pour cette étude](after/studio-detailed-fr.pdf) et [annexe technique](after/page-detailed-fr-06.png).

La version simple est celle proposée par défaut. « Inclure les cotes et détails techniques » ajoute les dessins annotés distincts et toutes les lignes techniques en annexes. Le nombre de pages détaillées dépend du projet et de la longueur des données. Un dessin original déjà identique à la présentation n’est pas dupliqué.

## Vérifications effectuées

Les fichiers `after/result-*.json` indiquent le nombre de pages, les erreurs JavaScript et les empreintes de l’état et des dessins avant/après export. Ces états sont identiques. La version détaillée française conserve les 52 lignes techniques, dans l’ordre, sans calcul ni nouvel arrondi de quantité.

Les fichiers `after/layout-*.json` consignent les résumés reçus, les textes réellement peints, leurs positions et la répartition des lignes entre les pages. Les noms officiels de produits et de couleurs restent ceux des données, y compris dans le PDF anglais. Le nombre de choix renvoyés vers la version détaillée est un nombre de combinaisons matière/couleur distinctes, jamais une quantité à commander.

`node tests/mir-studio-pdf-contract.cjs` vérifie 14 cas de routage : thème explicite, contexte client, exclusions intégré/admin/atelier, chemin historique sans thème ou pour les autres formats, et erreur explicite si le nouveau module manque. La recette indépendante complète des téléchargements, de la pagination longue, des traductions et des PDF historiques se trouve dans `tests/mir-studio-harmonie-pdf.cjs`.

## Portée et limites

- Les géométries et les captures d’estimation ne sont pas modifiées. Le nouveau thème s’applique uniquement à l’export PDF client du Studio explicitement demandé.
- Le PDF simple est un aperçu visuel ; il renvoie clairement à la version détaillée pour les données techniques et les choix supplémentaires.
- Les pages restent des images JPEG intégrées au PDF, comme dans le renderer partagé existant. Ce changement ne crée pas un PDF vectoriel, un calque CAO ou une impression à échelle garantie.
- Les surfaces, dimensions et avertissements conservent la précision et les limites des données sources. Aucune quantité inconnue n’est remplacée par zéro ; aucun arrondi supplémentaire n’est introduit.
- Les nuances numériques et textures restent celles du Studio. Cette refonte ne certifie ni les échantillons physiques, ni les métrés, ni le moteur de lecture PDF vers 3D.

`files.json` contient la taille et l’empreinte SHA-256 des livrables de cette comparaison.
