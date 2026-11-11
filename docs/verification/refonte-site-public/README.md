# Refonte publique MIR — état réellement livré

## État courant

La refonte est généralisée dans la branche `codex/refonte-site-public`; elle n’est ni fusionnée ni publiée. Elle conserve les dépendances 3A/3B/3C et le catalogue récent. La proposition initiale limitée à BECK est un jalon historique, pas l’état courant.

Navigation mobile validée : **Accueil, Boutique, Pliage, Commandes et Compte**, avec **Panier** visible dans l’en-tête. Réalisations, Aide et Contact restent dans les liens utiles. Les routes Compte et Commandes sont distinctes (`view=account` et `view=orders`). En recette privée, tous les liens locaux conservent `recette=1`; un rechargement Produit ou Panier ne peut plus basculer silencieusement vers la configuration production.

## Pages et parcours terminés

- Accueil : en-tête compact et navigation commune.
- Boutique : recherche, catégories et fabricants conservés; catalogue, photos et prix existants inchangés.
- Produit : photo, prix, options, quantité et ajout; BECK reste offert uniquement en 1½ po à 515,99 $.
- Panier : sélection, format et quantité conservés; action principale « Demander une estimation ».
- Estimation : le vrai formulaire s’ouvre depuis le panier et reçoit la sélection courante. Aucun envoi n’a été effectué pendant cette recette.
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

`final-v2/estimate-partial-results.json` documente une demande fictive balisée : sélection quantité 2 conservée, vrai formulaire complété, configuration/challenge et **une seule préparation serveur MIR TEST** réussis. Le double clic n’a produit qu’un `/prepare` et qu’un appel final. Cet appel final a été bloqué avant transfert : aucune destination `MIR_TEST_APPROVED_TO` n’était disponible et la destination serveur n’est volontairement pas exposée par `/config`. Aucun courriel n’a été tenté. La plateforme a ensuite refusé un second lancement susceptible de créer un doublon; aucun contournement n’a été tenté.

## Limites et intervention backend

- Les comptes Phase 3C balisés ont été retrouvés, mais leur fonction de recette réinitialise leurs mots de passe; elle n’a pas été appelée. L’accès client TEST déjà autorisé sous l’alias historique `OUTSIDER` a été réutilisé, avec rôle `client` recalculé côté serveur. Aucun compte, membership ou mot de passe n’a été modifié.
- La réception finale de l’estimation et sa confirmation restent bloquées uniquement par l’absence d’une destination de courriel de recette explicitement disponible. La préparation serveur réelle est prouvée; elle ne vaut pas réception finale.
- Aucun appareil physique, Safari, fusion, publication ou écriture Supabase production.

Verdict : **PARTIELLEMENT VALIDÉ**. Compte/Commandes client sont validés; seule la réception finale de l’estimation demeure bloquée par la destination de courriel de recette manquante.
