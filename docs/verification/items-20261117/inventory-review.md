# Revue des références transmises — 17 novembre 2026

Revue du diff de `catalogue-fd6866b49d21.json` et de `commerce.js`, comparée au commit antérieur `1104e2eccab7202a7aab08e96dc0f68fb759c048`. Aucun fichier applicatif modifié par le relecteur. Aucun accès au stock réel ou à la tarification distante; aucune action sur un service MIR. Le contrôle des sources publiques est documenté séparément dans [mac-source-review.md](mac-source-review.md).

## Correspondances et limites

| Référence | Décision vérifiée | Limite conservée |
| --- | --- | --- |
| `prime-paper-strip-20031` | Fiche existante réutilisée : 3¼ po, diamètre 0,120 po, 34°, fini brillant, bandes papier, 2 000 clous par boîte. Données et deux photos identiques à la version antérieure. | Prix et stock MIR non renseignés. La demande employé générique `mir-request-framing-nails-3-1-4in` existe toujours : ne pas la réconcilier automatiquement sans décision explicite. |
| `hardie-colorplus-touch-up-kit` | Une seule fiche enrichie. La lecture de la boîte transmise au parent donne Midnight Black 4960831 et Blackwater 4100703 sur le même kit, code LLA0531, UPC 856296003436. Ces inscriptions sont des preuves d’emballage, sans création de SKU MIR. | Le relecteur n’a pas le fichier original de la photo. La photo locale reste le visuel de gamme Aged Pewter, sans prétendre montrer le kit noir. Prix, disponibilité et conditionnement local à confirmer; ajout à la commande désactivé. |
| `mir-request-mac-screws` | Même ID enrichi à partir du lien fourni ensuite par l’utilisateur : marque publiée MAC Métal architectural, boîte de 500 vis, référence détaillant 1790291 et URL Bouchard. Aucun SKU fabricant ou MIR créé. | Longueur contradictoire entre lectures, calibre et protection à confirmer. `dimensions` reste vide. Prix et stock MIR inconnus; photo absente. Produit non commandable. |

La surcouche client conserve la couleur documentée `hardie-noir-minuit` et ajoute l’ancienne référence indicative Étain vieilli une seule fois. Elle ne copie pas le nuancier complet du revêtement comme offre de kits. Le modèle employé reprend désormais la couleur documentée du kit, sans remplissage automatique par 19 couleurs fabricant, et conserve les blocages `ITEM_NOT_ORDERABLE` du kit et des vis MAC.

Les vis Light Trim Phillips/Torx et le candidat documentaire Kaycan 1435 Robertson ne constituent pas une correspondance prouvée avec la demande MAC. Aucun de ces identifiants ni de leurs visuels n’a été attribué à la nouvelle demande.

## Passage 2 — source détaillant MAC

Source fournie par l’utilisateur : [fiche Bouchard, UGS 1790291](https://boutique.aluminiumbbouchard.ca/produit/vis-mac-metal-1-1-2-500pcs/). La première lecture signalée par l’intégrateur donnait un titre de 1⅛ po, avec description et spécifications de 1½ po. Lors de la lecture web indépendante du 17 novembre, le titre reçu était aussi de 1½ po, comme la description et les spécifications. L’origine de cette divergence de rendu/version reste inconnue. Les données conservent les deux valeurs en preuve et n’affectent aucune longueur physique au produit avant confirmation MIR.

Les 500 pièces et la marque sont des informations de la fiche détaillant. `retailerCode` et `sourceEvidence.retailerProductCode` portent 1790291; `manufacturerCode` et `sku` restent nuls. Le prix détaillant de 28 $ n’est pas copié comme prix MIR. L’image liée n’a pas été téléchargée; aucune photo n’a été substituée.

Le contrôle officiel, détaillé dans le rapport de sources, confirme plusieurs vis MAC distinctes mais aucun lien entre 1790291 et une référence fabricant précise. Le test mis à jour accepte donc la boîte de 500 et la marque documentées, protège le conflit de longueur, l’absence de photo et le blocage de commande, puis vérifie que le modèle employé reprend ces mêmes limites. Les protections de la fiche PRIME et du kit Hardie restent identiques.

## Vérification ciblée

Commande : `node tests/mir-items-intake.cjs`.

Le test vérifie les identifiants uniques, les alias d’emballage du kit, la conservation de la référence noire dans la préparation client, l’absence de données commerciales inventées pour les vis MAC, les blocages du modèle employé, les quantités entières de boîtes PRIME et l’absence de prix/stock locaux ajoutés. Les empreintes SHA-256 de la fiche PRIME et des trois photos antérieures protègent leur conservation. Il ne démarre aucun navigateur, ne charge aucun backend et n’envoie aucune demande.

Résultat du passage 1 : **7 contrôles réussis**, le 17 novembre 2026. Aucun problème matériel supplémentaire relevé dans les deux diffs examinés.

Résultat du passage 2 : **7 contrôles réussis**, le 17 novembre 2026, après enrichissement MAC. Aucun backend appelé; seules les assertions et ce rapport ont été modifiés par le relecteur.
