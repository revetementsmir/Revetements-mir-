# MIR — premier lot de produits transmis le 17 novembre 2026

## Portée réalisée sur TEST

Source de départ : `1104e2e`, branche `codex/client-prestige-20261117`. Cinq images reçues dans la conversation, puis identification explicite par MIR de la première : « vis pour mac ».

| Article | Traitement | Ce qui reste à préciser |
| --- | --- | --- |
| Vis pour revêtement MAC | Nouvelle fiche `mir-request-mac-screws` dans le catalogue partagé. Utilisation MAC indiquée par l’utilisateur; empreinte carrée visible. Fiche consultable mais ajout bloqué. | Fabricant, référence, longueur, calibre, protection, conditionnement, prix et photo originale téléchargeable. Aucun rattachement aux vis Light Trim ou au candidat Kaycan 1435. |
| Trousse James Hardie ColorPlus | Fiche existante `hardie-colorplus-touch-up-kit` enrichie. Une référence de teinte documentée : Midnight Black `4960831` / Blackwater `4100703`, les deux noms figurant sur la même boîte `LLA0531`, UPC `856296003436`. La référence client Étain vieilli existante reste disponible comme référence de gamme. | Prix, disponibilité et conditionnement de vente MIR; photo originale de cette boîte. Ajout toujours bloqué. Les inscriptions partiellement masquées de la photo des contenants ne servent pas à créer une autre variante. |
| Clous PRIME 20031 | Fiche existante `prime-paper-strip-20031` conservée sans duplication : 3¼ po, diamètre 0,120 po, 34°, lisses brillants, bandes papier, 2 000/boîte. Les deux photos locales déjà présentes sont conservées. | Prix et stock MIR; les nouvelles images haute définition ne sont pas encore intégrées. |

Le catalogue compte maintenant 129 fiches. Aucun prix, stock, SKU MIR ou dimension n’a été inventé. Les références historiques et les paniers existants ne sont pas réécrits. La demande générique employé `mir-request-framing-nails-3-1-4in` n’est pas fusionnée avec un produit confirmé sans correspondance métier explicite.

## Limite d’accès aux images

Les cinq images sont visibles dans la conversation et ont été lues. Aucun fichier correspondant, chemin local ou identifiant de téléchargement exploitable n’est fourni à l’outil pour cette livraison. Les dossiers de pièces jointes ont été examinés. Aucune reconstitution, image générée ou photo de vis différente n’est substituée aux originaux.

La photo MAC est donc encore à intégrer. La trousse conserve son ancien visuel officiel de gamme, explicitement identifié comme tel. PRIME conserve ses photos précédentes de boîte et bandes. Il faut les fichiers originaux téléchargeables, éventuellement regroupés en ZIP, pour terminer cette partie.

## Magasin employés

Les données sont partagées avec le modèle et la revue locale du magasin. Le magasin terrain connecté utilise un instantané serveur, distinct de ce catalogue statique. Aucun instantané serveur ni catalogue de production n’a été modifié. Les preuves du rendu terrain utilisent des fixtures locales explicitement simulées; elles ne démontrent pas une publication dans les comptes employés.

## Vérification

Les tests de catalogue Phase 9, de quantités client, de traduction et les 16 contrats de réconciliation magasin ont été exécutés avec succès. Le test ciblé du lot et les résultats navigateur sont consignés séparément dans ce dossier. Les requêtes externes sont bloquées dans les essais navigateur; aucun envoi, courriel, paiement ou écriture Supabase.

- `inventory-review.md` : 7 contrôles ciblés réussis, dont données et photos PRIME inchangées, absence de doublons et blocage des références incomplètes.
- `qa-browser-audit.json` : 30 contrôles et 24 captures après, PC 1440 et téléphone 390; boutique FR/EN, revue magasin et véritable écran terrain alimenté par une fixture locale.
- `qa-final-captures.json` : 8 vues client renouvelées après les dernières corrections de légende et de traduction; aucune erreur JavaScript ni débordement. Le libellé `boxes` conserve la valeur métier `boîtes`; l’ancien panier garde ses 3 boîtes et ajoute 2 boîtes sans perte.
- `qa-read-only-audit.md` : méthodes et distinction entre catalogue local, fixture et instantané serveur connecté.
- Galerie ciblée : `dist/items-20261117.html`, 12 captures PC/téléphone, exportées par `scripts/export-items-preview.cjs`. Galerie vérifiée à 1440, 834 et 390 px; résultats dans `gallery-results.json`.
- Construction locale `scripts/build-prestige-preview.cjs` réussie; garde TEST et interdiction des requêtes externes conservées.
