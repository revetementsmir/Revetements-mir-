# Refonte publique MIR — état réellement livré

## État courant

La refonte est généralisée dans la branche `codex/refonte-site-public`; elle n’est ni fusionnée ni publiée. Elle conserve les dépendances 3A/3B/3C et le catalogue récent. La proposition initiale limitée à BECK est un jalon historique, pas l’état courant.

Navigation mobile validée : **Accueil, Boutique, Pliage, Commandes et Compte**, avec **Panier** visible dans l’en-tête. Réalisations, Aide et Contact restent dans les liens utiles. Les routes Compte et Commandes sont distinctes (`view=account` et `view=orders`). En recette privée, tous les liens locaux conservent `recette=1`; un rechargement Produit ou Panier ne peut plus basculer silencieusement vers la configuration production.

## Pages et parcours terminés

- Accueil : en-tête compact et navigation commune.
- Boutique : recherche, catégories et fabricants conservés; catalogue, photos et prix existants inchangés.
- Produit : photo, prix, options, quantité et ajout; BECK reste offert uniquement en 1½ po à 515,99 $.
- Panier : sélection, format et quantité conservés; action principale « Demander une estimation ».
- Estimation : le vrai formulaire s’ouvre depuis le panier, reçoit la sélection courante et a confirmé une demande fictive balisée sur MIR TEST vers la seule boîte de recette autorisée.
- Compte et Commandes : deux destinations distinctes. Déconnecté, Compte ouvre l’authentification en conservant le panier. Une vraie session client TEST ouvre l’aperçu et l’état Commandes propres au client; le panier survit à la connexion et à la déconnexion.
- Centre d’aide : ouverture réelle dans le dialogue 3C, vérifiée déconnectée et connectée; il ne s’agit pas d’un simple lien présent.
- Pliage et Studio : navigation commune appliquée côté client sans modification de leurs moteurs.
- Matériaux, Réalisations et Contact : présentation et navigation communes.

Les modules internes Harmony/Admin et les fonctions privées 3A/3B/3C ne sont pas refondus par ce lot.

## Preuves

### Réel — navigateur privé connecté à MIR TEST

`final-v2/integrated-results.json` : **13/13 contrôles réussis** avec Chromium émulé, frontend de la branche servi en privé et données sur MIR TEST seulement.

- cinq destinations mobiles et panier permanent;
- Boutique, Produit et Panier sur téléphone;
- article BECK, format et quantité 2 conservés jusqu’au panier;
- vrai dialogue d’estimation ouvert avec « Quantité 2 »; aucune soumission;
- Compte déconnecté puis vraie session Auth client : aperçu, état Commandes, panier conservé et déconnexion;
- Centre d’aide réellement ouvert dans les deux états;
- Boutique, Pliage et Studio sans erreur JavaScript ni débordement horizontal sur tablette et ordinateur;
- **zéro requête vers `gccltmaulvrnthrbnrpd.supabase.co`** : l’hôte production était bloqué avant transfert.

### Local / simulation navigateur

- `tests/mir-public-menu.cjs` : **7/7** contrats, y compris la conservation de `recette=1`.
- preuve précédente `final/browser-results.json` : 168 contrôles et 33 rendus à 390×844, 768×1024 et 1440×900; réutilisée pour les pages non modifiées depuis cette preuve.
- les formats sont des émulations Chromium, pas des appareils physiques ni Safari.

### Estimation réelle bornée

`final-v2/estimate-partial-results.json` conserve l’étape historique où l’appel final était volontairement bloqué faute de destination autorisée. Elle n’est plus l’état courant.

`final-v2/estimate-approved-results.json` documente l’unique reprise autorisée : sélection quantité 2 conservée dans le formulaire, un `/prepare`, un seul appel final malgré le double clic, confirmation « Demande reçue » affichée, puis un seul dossier serveur retrouvé à l’état `received`. Le fournisseur courriel a accepté l’envoi et l’horodatage d’acceptation est enregistré. Frederick Messely a ensuite confirmé la réception dans Gmail, l’ouverture du PDF joint et la présence des deux boîtes BECK. Cette dernière preuve est une confirmation du destinataire, distincte des observations automatisées. Une assertion locale fondée sur l’ancien chemin `selection.items` a échoué après la confirmation; elle est corrigée pour accepter le schéma courant `selection.materials`. Le jeton éphémère n’ayant pas été conservé, le rejeu exact post-réception n’a pas été relancé; l’absence de doublon est prouvée par l’unique appel final et l’unique dossier balisé.

## Limites et intervention backend

- Les comptes Phase 3C balisés ont été retrouvés, mais leur fonction de recette réinitialise leurs mots de passe; elle n’a pas été appelée. L’accès client TEST déjà autorisé sous l’alias historique `OUTSIDER` a été réutilisé, avec rôle `client` recalculé côté serveur. Aucun compte, membership ou mot de passe n’a été modifié.
- La réception serveur, la confirmation client, l’acceptation fournisseur et la réception Gmail avec PDF conforme sont validées sur MIR TEST. La réception Gmail/PDF repose sur la confirmation explicite du destinataire.
- Aucun appareil physique, Safari, fusion, publication ou écriture Supabase production.

Verdict : **RECETTE D’ESTIMATION CLÔTURÉE SUR MIR TEST**. Compte/Commandes, conservation du panier, réception serveur, confirmation client, livraison Gmail et contenu du PDF sont validés. Les appareils physiques et Safari restent hors preuve.
