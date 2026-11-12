# Bilan préparatoire de mise en ligne MIR

État relevé le 11 novembre 2026. Ce document prépare une promotion ultérieure; aucune fusion, publication ou écriture production n’a été exécutée.

## Révisions et dépendances

Le `main` distant courant est `1ae33443e954181298034b779268b08ea5e2a069`.

| Lot | PR brouillon | Tête distante | Dépendance |
| --- | --- | --- | --- |
| 3A — sécurité clavardage | #4 | `f5c2aa04450d708a8f86da51bc3c778d0ebf75e7` | base fonctionnelle du clavardage |
| 3B — clavardage mobile | #8 | `62bb65d8d01f521ee9feec63db9a2820070fb735` | 3A |
| 3C — aide et soutien | #9 | `c0b12ffbcbb5c00f493d1459e1e2de7b5a8d039a` | 3B |
| Refonte publique | #10 | `802d9cfbd9459536c5d695299f419c959c17ef6a` | 3C et catalogue récent |

La chaîne doit être intégrée dans cet ordre. Avant chaque fusion future, remettre la branche concernée à jour avec le `main` alors courant, résoudre les conflits sans perdre le catalogue, puis rejouer les contrôles ciblés. Ne pas fusionner #10 directement sur un `main` qui ne contient pas 3A/3B/3C.

## Écart backend observé

Lecture seule Supabase :

- MIR TEST : 72 migrations enregistrées et cinq Edge Functions actives;
- MIR production : 34 migrations enregistrées et aucune Edge Function;
- les deux environnements possèdent le socle `mir_core.conversations` et le bucket privé `mir-internal`;
- TEST possède les validations de fichiers, RPC de clavardage 3A, tables/RPC de soutien 3C et passerelle privée;
- production ne possède pas encore ces objets 3A/3B/3C.

Fonctions TEST actives : `mir-estimates` v22, `mir-admin-delivery` v5, `mir-chat-files` v2, et deux fonctions de recette. Les fonctions de recette `mir-chat-tenant-b-recipe` et `mir-support-tenant-recipe` ne doivent pas être promues. En production, seuls les services réellement requis doivent être déployés individuellement; aucun déploiement global.

Migrations explicitement TEST-only à exclure de production :

- `chat_phase3a_tenant_b_recipe`, `chat_phase3a_tenant_b_recipe_acl`, `chat_phase3a_tenant_b_operational_role`;
- `phase3c_two_client_recipe`;
- `mir_estimate_recipe_enable` et `mir_estimate_recipe_result`.

La promotion de 3A/3B/3C exige une migration de production revue et ordonnée à partir des migrations métier restantes. Les migrations actuelles contiennent des préconditions strictes et ne doivent pas être lancées par un `db push` global. L’écart de 38 entrées ne correspond pas automatiquement à 38 migrations à appliquer : plusieurs objets antérieurs, renommages et jalons non liés aux PR doivent être réconciliés séparément.

La fonction `mir-estimates` de production doit garder son destinataire production et ses secrets propres. La voie `/test/submit` reste fermée hors du projet TEST par le contrôle d’environnement; les réglages diagnostics et la fonction de lecture de recette ne doivent pas être promus.

## Prérequis sauvegarde et retour arrière

Avant toute écriture production :

1. figer le SHA de `main`, les quatre têtes de PR et les empreintes des fonctions à promouvoir;
2. exporter la liste des migrations, fonctions, paramètres Auth, politiques Storage et secrets nommés sans révéler leur valeur;
3. produire un dump base séparé rôles/schéma/données et vérifier qu’il est lisible; sauvegarder également l’historique `supabase_migrations`;
4. sauvegarder les objets du bucket `mir-internal` et enregistrer son état/politiques;
5. confirmer la sauvegarde automatique ou le point de restauration disponible et documenter qui peut l’exécuter;
6. préparer des migrations compensatoires explicites pour chaque changement réversible. Ne jamais compter sur une baisse de version automatique;
7. conserver le bundle et la version précédente de chaque Edge Function afin de pouvoir les redéployer;
8. préparer le retour frontend vers le SHA public précédent sans supprimer les données créées après mise en ligne.

Un retour arrière applicatif ne doit jamais supprimer des messages, demandes, pièces jointes ou estimations créés entre-temps. Si une migration destructive devenait nécessaire, arrêter la mise en ligne et demander une autorisation distincte.

## Ordre proposé des opérations

1. **Gel et approbation** — valider ce bilan, les fenêtres d’intervention et les responsables; aucune mutation.
2. **Réconciliation Git** — intégrer #4, puis #8, puis #9, puis #10; après chaque étape, vérifier SHA, dépendances et tests. Garder la publication désactivée.
3. **Inventaire production final** — relire migrations, schéma, fonctions, buckets, Auth et secrets. Arrêter si les préconditions diffèrent de ce bilan.
4. **Sauvegarde vérifiée** — exécuter les sauvegardes ci-dessus et noter les identifiants/horodatages de restauration.
5. **Migration 3A préparatoire** — appliquer uniquement le SQL métier revu, sans recette TEST; vérifier les contrôles d’accès avant activation.
6. **Passerelle 3A** — déployer `mir-chat-files` seule avec les secrets production, puis tester Auth, CORS, refus Storage direct et lecture privée.
7. **Activation 3A** — appliquer l’activation restrictive seulement après compatibilité serveur/client; exécuter une recette production minimale autorisée.
8. **Migration 3B** — ajouter PDF et contraintes d’attestation; redéployer `mir-chat-files` seulement si son code diffère; vérifier image/PDF et refus croisés.
9. **Migration 3C** — installer aide/soutien sans les fixtures de deux clients; vérifier notes internes, isolation et pièces jointes privées.
10. **Estimation** — déployer `mir-estimates` avec configuration production existante, diagnostics désactivés et sans migration de recette; exécuter seulement une recette production séparément autorisée.
11. **Frontend privé** — tester le build final contre production avec comptes autorisés, sans indexation ni publication publique.
12. **Publication contrôlée** — publier seulement après feu vert distinct, puis vérifier Accueil, Boutique, Produit, Panier, Compte, Commandes, Aide, Pliage et Studio.
13. **Surveillance et décision** — suivre erreurs Auth/RPC/Edge, refus Storage, doublons et courriels. En cas d’anomalie, revenir au frontend et aux fonctions précédents; utiliser les migrations compensatoires sans effacer les nouvelles données.

## Blocages avant exécution

- autorisation explicite d’écriture MIR production;
- validation de la sauvegarde et du mécanisme de restauration réel;
- relecture finale du prévol production juste avant exécution; la chaîne métier
  3A/3B/3C est désormais réconciliée et testée localement, sans fixtures;
- inventaire et configuration des secrets production pour les seules fonctions promues;
- plan de recette production avec comptes et destinataires autorisés;
- décision séparée de fusion et de publication publique.

## Lot concret préparé

Le lot inerte est versionné dans `ops/mir-promotion/` et ses outils dans
`tools/promotion/`. Il contient le manifeste ordonné, les requêtes de prévol
et vérification en lecture seule, la compensation qui désactive les nouveaux
RPC sans supprimer de données, les scripts de sauvegarde/restauration et le
générateur des deux bundles Edge.

Vérification locale isolée :

- prévol catalogue production en transaction read-only : 11/11;
- manifeste et exclusions : 27/27;
- Phase 3A PGlite avec données fictives : 36/36;
- passerelle 3A + PDF 3B PGlite : 15/15;
- Storage soutien isolé : 10/10;
- régression Edge fichiers : 10/10;
- bundles : `mir-chat-files` 14 413 octets, SHA-256
  `d83428a90d3308453d62738a3b0da1b0cbbdfbfd950a4058d3fe8be522c5dc84`;
  `mir-estimates` 62 889 octets, SHA-256
  `895d61748f06ac4209d95c94aa381eaf16513e5c886d6f719ac0256302ee626a`.

## Actualisation promotion — 12 novembre 2026

Le blocage SQLSTATE `55000` ci-dessus est historique et résolu dans le lot
préparé. La migration hébergée `client_center_20261110` (version
`20261110142928`) a été relue sur MIR TEST en lecture seule et reconstruite
sans compte, membership, donnée client, secret ni fixture. Son contenu FAQ
initial est séparé et non automatique.

La chaîne réelle contient 16 migrations ordonnées. Deux dépendances ont été
identifiées après le premier blocage : le RPC métier de recherche client,
extrait d'une migration de recette, et l'alignement explicite des ACL finales.
Les droits ne sont pas assouplis : `anon` est refusé sur tous les RPC
authentifiés; seule la FAQ publique conserve son accès prévu.

Preuve locale représentative :

- 16/16 migrations appliquées dans l'ordre sur PGlite avec données fictives;
- 7/7 assertions de chaîne;
- deuxième exécution : 16 migrations reconnues par historique et empreinte,
  aucune réapplication;
- aucune perte, aucun doublon, aucun contenu initial injecté;
- catalogue final identique aux définitions MIR TEST pour le périmètre;
- vérificateur du paquet et des empreintes : 54/54.

Les empreintes sont dans
`ops/mir-promotion/migration-sha256.json` et les résultats dans
`ops/mir-promotion/verification-results.json`.

État sauvegarde : **scripts prêts**, mais **aucune sauvegarde/restauration
production réellement vérifiée**. Il manque `pg_dump`, `pg_dumpall`,
`psql`, un service libpq production autorisé et les accès nécessaires aux
objets Storage/fonctions. Ces accès, l'autorisation d'écriture production et
la décision distincte de fusion/publication restent les blocages d'exécution.
MIR TEST n'a pas été remigré; production est intacte.


## Sauvegarde production vérifiée — 12 novembre 2026

Résultats rapportés et vérifiés localement, sans révélation de secrets :

- PostgreSQL production 17.11 accessible via le Session pooler ;
- dumps complets, schéma, données, historique des migrations et rôles créés hors GitHub ;
- cinq empreintes SHA-256 calculées ; archive complète lisible (1 340 entrées) ;
- restauration complète réussie dans l’image officielle `supabase/postgres:17.11.0.018` ;
- schémas restaurés : `auth` 27 tables, `mir_core` 99, `mir_estimates` 3, `storage` 10, `supabase_migrations` 1 ;
- 34 migrations restaurées et 0 index invalide ;
- Storage : `mir-internal` présent, privé et vide ; `mir-support` absent de production avant la promotion 3C ; aucun objet à télécharger ;
- aucune écriture ou migration production exécutée.

### Blocage de sécurité maintenu

Le mot de passe PostgreSQL a été exposé pendant la manipulation. La promotion reste bloquée jusqu’à sa rotation et à la mise à jour de `MIR_PROD_DATABASE_URL`. Aucune fusion, publication, migration, écriture production ni déploiement Edge n’est autorisé par ce bilan.
