# Revue des références transmises — 17 novembre 2026

Revue du diff de `catalogue-fd6866b49d21.json` et de `commerce.js`, comparée au commit antérieur `1104e2eccab7202a7aab08e96dc0f68fb759c048`. Aucun fichier applicatif modifié par le relecteur. Aucun accès à un service externe, au stock réel ou à la tarification distante.

## Correspondances et limites

| Référence | Décision vérifiée | Limite conservée |
| --- | --- | --- |
| `prime-paper-strip-20031` | Fiche existante réutilisée : 3¼ po, diamètre 0,120 po, 34°, fini brillant, bandes papier, 2 000 clous par boîte. Données et deux photos identiques à la version antérieure. | Prix et stock MIR non renseignés. La demande employé générique `mir-request-framing-nails-3-1-4in` existe toujours : ne pas la réconcilier automatiquement sans décision explicite. |
| `hardie-colorplus-touch-up-kit` | Une seule fiche enrichie. La lecture de la boîte transmise au parent donne Midnight Black 4960831 et Blackwater 4100703 sur le même kit, code LLA0531, UPC 856296003436. Ces inscriptions sont des preuves d’emballage, sans création de SKU MIR. | Le relecteur n’a pas le fichier original de la photo. La photo locale reste le visuel de gamme Aged Pewter, sans prétendre montrer le kit noir. Prix, disponibilité et conditionnement local à confirmer; ajout à la commande désactivé. |
| `mir-request-mac-screws` | Nouvelle demande correspondant à la précision utilisateur « vis pour mac ». Usage MAC et empreinte carrée décrite, sans attribution du fabricant de la vis. | Marque, SKU, dimensions, protection, conditionnement, prix et stock inconnus. Aucun visuel de remplacement fabriqué. Produit non commandable tant que l’identité reste incomplète. |

La surcouche client conserve la couleur documentée `hardie-noir-minuit` et ajoute l’ancienne référence indicative Étain vieilli une seule fois. Elle ne copie pas le nuancier complet du revêtement comme offre de kits. Le modèle employé reprend désormais la couleur documentée du kit, sans remplissage automatique par 19 couleurs fabricant, et conserve les blocages `ITEM_NOT_ORDERABLE` du kit et des vis MAC.

Les vis Light Trim Phillips/Torx et le candidat documentaire Kaycan 1435 Robertson ne constituent pas une correspondance prouvée avec la demande MAC. Aucun de ces identifiants ni de leurs visuels n’a été attribué à la nouvelle demande.

## Vérification ciblée

Commande : `node tests/mir-items-intake.cjs`.

Le test vérifie les identifiants uniques, les alias d’emballage du kit, la conservation de la référence noire dans la préparation client, l’absence de données commerciales inventées pour les vis MAC, les blocages du modèle employé, les quantités entières de boîtes PRIME et l’absence de prix/stock locaux ajoutés. Les empreintes SHA-256 de la fiche PRIME et des trois photos antérieures protègent leur conservation. Il ne démarre aucun navigateur, ne charge aucun backend et n’envoie aucune demande.

Résultat : **7 contrôles réussis**, le 17 novembre 2026. Aucun problème matériel supplémentaire relevé dans les deux diffs examinés.
