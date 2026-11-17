# Recette finale MAC — longueur 1½ po confirmée par MIR

Ce rapport remplace, pour MAC seulement, le constat de blocage du précédent `qa-mac-source-update.md`. Après la confirmation explicite de MIR « 1½ po », la même référence `mir-request-mac-screws` est proposée à la demande : boîte de 500, référence détaillant 1790291, prix et disponibilité MIR sur demande.

Les huit captures MAC ont été remplacées aux noms existants, en viewport réel : boutique FR/EN, revue magasin et véritable interface chantier avec fixture local, à 1440 × 1100 et 390 × 844. PRIME et Hardie ne sont ni recapturés ni recertifiés dans ce complément.

Les 12 contrôles réussissent :

- Recherche publique par « MAC » et « 1790291 ».
- Longueur 1½ po et conditionnement de 500 affichés dans les trois parcours.
- Boutique FR/EN : action Ajouter au panier disponible, ajout local de deux boîtes, valeur métier `boîtes` conservée et libellé anglais `boxes`, prix sur demande.
- Revue magasin : une ligne locale de deux boîtes ajoutée, aucun rejet.
- Chantier : ajout de deux boîtes, confirmation affichée et quantité 2 vérifiée dans le panier. Aucun clic sur Envoyer ma commande et aucun appel d’envoi dans le fixture.
- Aucun débordement horizontal ni erreur JavaScript `pageerror`.

La photo originale manque toujours et le visuel de remplacement est déclaré comme tel. Aucun prix ou stock MIR n’est déduit du détaillant. Le calibre et la protection restent à préciser avec le fournisseur ; la longueur est désormais confirmée.

Tous les contextes bloquent les accès externes et toute méthode HTTP autre que GET. Dix tentatives automatiques de prix/météo ont été interrompues avant transmission : aucun accès backend, aucune commande réelle, aucun courriel ou paiement. Les vues terrain utilisent le véritable composant d’interface, alimenté uniquement par le fixture local existant ; elles ne certifient pas la publication dans le magasin connecté.

Preuves : `qa-mac-confirmed.json` contient les textes rendus, valeurs d’unité, lignes de paniers locaux et références des huit captures. Reproduction locale : `node docs/verification/items-20261117/qa-mac-confirmed.cjs`. Aucun fichier applicatif n’a été modifié par cette recette.
