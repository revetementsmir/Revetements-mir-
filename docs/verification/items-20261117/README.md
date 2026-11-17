# MIR — premier lot de produits transmis le 17 novembre 2026

## Aperçu final livré

- [Vis MAC 1½ po, boîte de 500 — fiche interactive TEST](https://mir-studio-test-pxsntgep8-desk17.vercel.app/test/produit.html?id=mir-request-mac-screws)
- [Les trois articles et 12 captures PC/téléphone](https://mir-studio-test-pxsntgep8-desk17.vercel.app/test/items-20261117.html)
- [Revue locale du magasin employés](https://mir-studio-test-pxsntgep8-desk17.vercel.app/test/magasin-revue.html)

Déploiement Vercel Preview `dpl_CdvwbMExFhCyLHRTzYBtpEW8Cdym`, READY, source exacte `e72328c371f86c5f388fb25f08476d35dbbb8cc0`. Cinq lectures HTTP 200; manifeste TEST, révision, garde, CSP locale et noindex vérifiés. L’exception d’ajout sans photo pour la référence MIR confirmée est présente dans le script hébergé. Preuves : `hosted-preview.json`. Protection Vercel conservée; connexion autorisée potentiellement nécessaire. Aucun déploiement de production ni publication dans le catalogue serveur employé.

## Portée réalisée sur TEST

Source de départ : `1104e2e`, branche `codex/client-prestige-20261117`. Cinq images reçues dans la conversation, puis identification explicite par MIR de la première : « vis pour mac ».

| Article | Traitement | Ce qui reste à préciser |
| --- | --- | --- |
| Vis pour revêtement MAC | Même fiche `mir-request-mac-screws` : marque MAC Métal architectural, **1½ po confirmé par MIR**, boîte de 500, référence détaillant `1790291`. Ajout au panier local permis sur cette référence confirmée, même si sa photo reste à intégrer. | Calibre/protection fournisseur, prix et stock MIR, photo originale téléchargeable. Aucun code fabricant déduit du code détaillant. |
| Trousse James Hardie ColorPlus | Fiche existante `hardie-colorplus-touch-up-kit` enrichie. Une référence de teinte documentée : Midnight Black `4960831` / Blackwater `4100703`, les deux noms figurant sur la même boîte `LLA0531`, UPC `856296003436`. La référence client Étain vieilli existante reste disponible comme référence de gamme. | Prix, disponibilité et conditionnement de vente MIR; photo originale de cette boîte. Ajout toujours bloqué. Les inscriptions partiellement masquées de la photo des contenants ne servent pas à créer une autre variante. |
| Clous PRIME 20031 | Fiche existante `prime-paper-strip-20031` conservée sans duplication : 3¼ po, diamètre 0,120 po, 34°, lisses brillants, bandes papier, 2 000/boîte. Les deux photos locales déjà présentes sont conservées. | Prix et stock MIR; les nouvelles images haute définition ne sont pas encore intégrées. |

Le catalogue compte maintenant 129 fiches. Aucun prix, stock, SKU MIR ou dimension n’a été inventé. Les références historiques et les paniers existants ne sont pas réécrits. La demande générique employé `mir-request-framing-nails-3-1-4in` n’est pas fusionnée avec un produit confirmé sans correspondance métier explicite.

## Limite d’accès aux images

Les cinq images sont visibles dans la conversation et ont été lues. Aucun fichier correspondant, chemin local ou identifiant de téléchargement exploitable n’est fourni à l’outil pour cette livraison. Les dossiers de pièces jointes ont été examinés. Aucune reconstitution, image générée ou photo de vis différente n’est substituée aux originaux.

Le lien fournisseur MAC fourni ensuite a été lu avec le service web. Sa photo liée n’a pas pu être téléchargée dans le workspace (HTTP 403). La photo MAC est donc encore à intégrer. La trousse conserve son ancien visuel officiel de gamme, explicitement identifié comme tel. PRIME conserve ses photos précédentes de boîte et bandes. Il faut les fichiers originaux téléchargeables, éventuellement regroupés en ZIP, pour terminer cette partie.

## Magasin employés

Les données sont partagées avec le modèle et la revue locale du magasin. Le magasin terrain connecté utilise un instantané serveur, distinct de ce catalogue statique. Aucun instantané serveur ni catalogue de production n’a été modifié. Les preuves du rendu terrain utilisent des fixtures locales explicitement simulées; elles ne démontrent pas une publication dans les comptes employés.

## Vérification

Les tests de catalogue Phase 9, de quantités client, de traduction et les 16 contrats de réconciliation magasin ont été exécutés avec succès. Le test ciblé du lot et les résultats navigateur sont consignés séparément dans ce dossier. Les requêtes externes sont bloquées dans les essais navigateur; aucun envoi, courriel, paiement ou écriture Supabase.

- `inventory-review.md` : 8 contrôles ciblés finaux réussis, dont données et photos PRIME inchangées, absence de doublons, ajout de la référence MAC confirmée et blocage des autres références incomplètes.
- `qa-browser-audit.json` : 30 contrôles et 24 captures après, PC 1440 et téléphone 390; boutique FR/EN, revue magasin et véritable écran terrain alimenté par une fixture locale.
- `qa-final-captures.json` : 8 vues client renouvelées après les dernières corrections de légende et de traduction; aucune erreur JavaScript ni débordement. Le libellé `boxes` conserve la valeur métier `boîtes`; l’ancien panier garde ses 3 boîtes et ajoute 2 boîtes sans perte.
- `qa-read-only-audit.md` : méthodes et distinction entre catalogue local, fixture et instantané serveur connecté.
- Galerie ciblée : `dist/items-20261117.html`, 12 captures PC/téléphone, exportées par `scripts/export-items-preview.cjs`. Galerie vérifiée à 1440, 834 et 390 px; résultats dans `gallery-results.json`.
- Construction locale `scripts/build-prestige-preview.cjs` réussie; garde TEST et interdiction des requêtes externes conservées.

## Complément — lien fournisseur des vis MAC

[Même fiche transmise par MIR chez Aluminium B. Bouchard](https://boutique.aluminiumbbouchard.ca/produit/vis-mac-metal-1-1-2-500pcs/). Le conditionnement de 500 est documenté. Le code `1790291` reste un code détaillant et n’est pas placé dans le champ fabricant ou SKU MIR. Le prix détaillant n’est pas repris dans la tarification MIR. La longueur a d’abord été demandée à MIR en raison de la divergence de titre; sa réponse explicite « 1½ po » confirme maintenant la dimension retenue. Le rapport `mac-source-review.md` compare également les références officielles MAC sans les assimiler à cet article.

Après ce complément, `qa-mac-source-update.json` et `.md` consignent 12 contrôles supplémentaires et 8 vues MAC renouvelées. Ils remplacent les anciens relevés MAC des rapports précédents. Recherche par nom/code, boîte de 500, unités FR/EN, blocages d’ajout et absence de débordement/erreur sont vérifiés. Les captures PRIME et Hardie restent inchangées.

## État final après confirmation MIR

MIR a confirmé « 1½ po » dans la conversation. La fiche MAC garde son identifiant et documente cette confirmation. Le conditionnement reste 500 par boîte. Le drapeau explicite `requestableWithoutPhoto` autorise cette demande locale quand la référence détaillant, sa source et le statut MIR confirmé sont présents; les autres fiches sans photo ou à identité incomplète conservent leurs blocages. Le kit Hardie reste bloqué comme auparavant. Aucun envoi de commande réel n’est ajouté.

Les rapports `qa-mac-source-update.*` restent la preuve de l’étape intermédiaire avant cette réponse; `qa-mac-confirmed.*` constitue le résultat final et les huit captures MAC correspondantes sont remplacées. PRIME et Hardie ne sont pas recapturés inutilement.
