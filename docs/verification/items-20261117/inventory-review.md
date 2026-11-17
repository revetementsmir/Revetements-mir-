# Revue des références transmises — 17 novembre 2026

Revue du diff de `catalogue-fd6866b49d21.json` et de `commerce.js`, comparée au commit antérieur `1104e2eccab7202a7aab08e96dc0f68fb759c048`. Aucun fichier applicatif modifié par le relecteur. Aucun accès au stock réel ou à la tarification distante; aucune action sur un service MIR. Le contrôle des sources publiques est documenté séparément dans [mac-source-review.md](mac-source-review.md).

## Correspondances et limites

| Référence | Décision vérifiée | Limite conservée |
| --- | --- | --- |
| `prime-paper-strip-20031` | Fiche existante réutilisée : 3¼ po, diamètre 0,120 po, 34°, fini brillant, bandes papier, 2 000 clous par boîte. Données et deux photos identiques à la version antérieure. | Prix et stock MIR non renseignés. La demande employé générique `mir-request-framing-nails-3-1-4in` existe toujours : ne pas la réconcilier automatiquement sans décision explicite. |
| `hardie-colorplus-touch-up-kit` | Une seule fiche enrichie. La lecture de la boîte transmise au parent donne Midnight Black 4960831 et Blackwater 4100703 sur le même kit, code LLA0531, UPC 856296003436. Ces inscriptions sont des preuves d’emballage, sans création de SKU MIR. | Le relecteur n’a pas le fichier original de la photo. La photo locale reste le visuel de gamme Aged Pewter, sans prétendre montrer le kit noir. Prix, disponibilité et conditionnement local à confirmer; ajout à la commande désactivé. |
| `mir-request-mac-screws` | Même ID, marque publiée MAC Métal architectural, boîte de 500 vis, référence détaillant 1790291 et URL Bouchard. MIR a confirmé explicitement **1½ po**; `dimensions.lengthIn` vaut 1.5. Ajout à une demande locale autorisé en boîtes entières. Aucun SKU fabricant ou MIR créé. | Calibre et protection à confirmer. Prix et stock MIR inconnus; photo absente et signalée. La confirmation ne transforme pas le code détaillant en référence fabricant ni le prix Bouchard en prix MIR. |

La surcouche client conserve la couleur documentée `hardie-noir-minuit` et ajoute l’ancienne référence indicative Étain vieilli une seule fois. Elle ne copie pas le nuancier complet du revêtement comme offre de kits. Le modèle employé reprend la couleur documentée du kit, sans remplissage automatique par 19 couleurs fabricant, et conserve son blocage `ITEM_NOT_ORDERABLE`. Les vis MAC confirmées peuvent désormais entrer dans une demande locale, sans connexion au stock réel.

Les vis Light Trim Phillips/Torx et le candidat documentaire Kaycan 1435 Robertson ne constituent pas une correspondance prouvée avec la demande MAC. Aucun de ces identifiants ni de leurs visuels n’a été attribué à la nouvelle demande.

## Passage 2 — source détaillant MAC

Source fournie par l’utilisateur : [fiche Bouchard, UGS 1790291](https://boutique.aluminiumbbouchard.ca/produit/vis-mac-metal-1-1-2-500pcs/). La première lecture signalée par l’intégrateur donnait un titre de 1⅛ po, avec description et spécifications de 1½ po. Lors de la lecture web indépendante du 17 novembre, le titre reçu était aussi de 1½ po, comme la description et les spécifications. L’origine de cette divergence de rendu/version reste inconnue. À ce deuxième passage, les données conservaient les deux valeurs en preuve, sans affecter de longueur physique avant confirmation MIR. Le passage 3 ci-dessous intègre la réponse reçue ensuite.

Les 500 pièces et la marque sont des informations de la fiche détaillant. `retailerCode` et `sourceEvidence.retailerProductCode` portent 1790291; `manufacturerCode` et `sku` restent nuls. Le prix détaillant de 28 $ n’est pas copié comme prix MIR. L’image liée n’a pas été téléchargée; aucune photo n’a été substituée.

Le contrôle officiel, détaillé dans le rapport de sources, confirme plusieurs vis MAC distinctes mais aucun lien entre 1790291 et une référence fabricant précise. Le test du passage 2 acceptait la boîte de 500 et la marque documentées tout en maintenant le blocage pour longueur non confirmée. Les protections de la fiche PRIME et du kit Hardie restent identiques aux trois passages.

## Passage 3 — longueur confirmée par MIR

Réponse explicite reçue le 17 novembre 2026 : **« 1½ po »**. La preuve `sourceEvidence.userLengthConfirmation` conserve cette réponse et la valeur 1.5; l’ancienne divergence de source reste conservée avec le statut `MIR_confirmed_1.5in`.

La revue ciblée du changement `requestable` confirme que l’exception sans photo exige simultanément le drapeau booléen `requestableWithoutPhoto: true`, le statut `mir_reference`, une référence détaillant et une URL source. Les filtres de visibilité, le refus des références en attente et `orderable:false` continuent de s’appliquer. Le test exécute ces fonctions réelles extraites de `commerce.js` et compare le résultat antérieur et le nouveau sur tout le catalogue : **seule la référence MAC change de droit d’ajout**.

Douze variantes négatives protègent les gardes : drapeau absent, faux ou de type chaîne; statut en attente, non confirmé ou réservé à la visualisation; référence détaillant ou source manquantes; interdiction de commande ou de vente. Un contrôle séparé garantit que le masquage boutique garde priorité. Le produit PRIME photographié reste admissible sans nouveau drapeau, et le kit Hardie reste bloqué.

Les quantités MAC sont des boîtes entières de 500 vis. Une boîte fonctionne; zéro, une quantité négative, une demi-boîte et une quantité en pièces sont refusés par les règles appropriées. Le modèle employé permet la préparation locale d’une ligne MAC, maintient ses SKU et référence fabricant nuls, et rejette une demi-boîte. Aucun document ni aperçu n’a été interprété comme confirmation de prix, de stock ou de photo exacte.

## Vérification ciblée

Commande : `node tests/mir-items-intake.cjs`.

Le test vérifie les identifiants uniques, les alias d’emballage du kit, la conservation de la référence noire dans la préparation client, la provenance des données MAC, l’exception d’ajout sans photo, les règles du modèle employé, les quantités entières de boîtes PRIME/MAC et l’absence de prix/stock locaux ajoutés. Les empreintes SHA-256 de la fiche PRIME et des trois photos antérieures protègent leur conservation. Il ne démarre aucun navigateur, ne charge aucun backend et n’envoie aucune demande.

Résultat du passage 1 : **7 contrôles réussis**, le 17 novembre 2026. Aucun problème matériel supplémentaire relevé dans les deux diffs examinés.

Résultat du passage 2 : **7 contrôles réussis**, le 17 novembre 2026, après enrichissement MAC. Aucun backend appelé; seules les assertions et ce rapport ont été modifiés par le relecteur.

Résultat du passage 3 : **8 contrôles réussis**, le 17 novembre 2026. Revue de la nouvelle garde sans problème matériel relevé. Seuls le test et les rapports ont été modifiés par le relecteur; aucun fichier applicatif ni backend touché.
