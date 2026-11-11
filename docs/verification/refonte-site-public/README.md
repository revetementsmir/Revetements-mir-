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
- Compte et Commandes : deux destinations distinctes. Déconnecté, Compte ouvre l’authentification en conservant le panier. Connecté, le portail protégé correspondant au rôle serveur est conservé.
- Centre d’aide : ouverture réelle dans le dialogue 3C, vérifiée déconnectée et connectée; il ne s’agit pas d’un simple lien présent.
- Pliage et Studio : navigation commune appliquée côté client sans modification de leurs moteurs.
- Matériaux, Réalisations et Contact : présentation et navigation communes.

Les modules internes Harmony/Admin et les fonctions privées 3A/3B/3C ne sont pas refondus par ce lot.

## Preuves

### Réel — navigateur privé connecté à MIR TEST

`final-v2/integrated-results.json` : **11/11 contrôles réussis** avec Chromium émulé, frontend de la branche servi en privé et données sur MIR TEST seulement.

- cinq destinations mobiles et panier permanent;
- Boutique, Produit et Panier sur téléphone;
- article BECK, format et quantité 2 conservés jusqu’au panier;
- vrai dialogue d’estimation ouvert avec « Quantité 2 »; aucune soumission;
- Compte déconnecté et session Auth réelle connectée;
- Centre d’aide réellement ouvert dans les deux états;
- Boutique, Pliage et Studio sans erreur JavaScript ni débordement horizontal sur tablette et ordinateur;
- **zéro requête vers `gccltmaulvrnthrbnrpd.supabase.co`** : l’hôte production était bloqué avant transfert.

### Local / simulation navigateur

- `tests/mir-public-menu.cjs` : **7/7** contrats, y compris la conservation de `recette=1`.
- preuve précédente `final/browser-results.json` : 168 contrôles et 33 rendus à 390×844, 768×1024 et 1440×900; réutilisée pour les pages non modifiées depuis cette preuve.
- les formats sont des émulations Chromium, pas des appareils physiques ni Safari.

## Limites et intervention backend

- Aucun identifiant configuré dans l’environnement n’a été confirmé par `mir_account_snapshot` comme rôle `client`. La session réellement disponible est interne; les nouveaux onglets client connectés **Aperçu/Commandes** ne sont donc pas rejoués ici. Le frontend est présent, mais une recette client exige un secret TEST client autorisé; aucun compte ni membership n’a été modifié.
- « Demander une estimation » prépare correctement la sélection et le brouillon. L’envoi, la réception serveur et le courriel n’ont pas été déclenchés : ce sont des preuves backend séparées et une écriture métier, hors de cette recette de finalisation.
- Aucun appareil physique, Safari, fusion, publication ou écriture Supabase production.

Verdict : **PARTIELLEMENT VALIDÉ**. Le frontend public et les parcours déconnectés demandés sont fonctionnels; la preuve d’un vrai client connecté sur Compte/Commandes reste à fournir.
