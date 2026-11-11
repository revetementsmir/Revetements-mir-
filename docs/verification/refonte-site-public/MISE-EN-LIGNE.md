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
- réconciliation détaillée des 38 migrations d’écart, sans assimiler les noms différents à des objets différents;
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

Le test de la chaîne 3C sur un socle représentatif de production s’arrête
volontairement avec SQLSTATE `55000`, « Phase 3C audited backend is absent or
incomplete ». Cela confirme que la migration hébergée non versionnée
`client_center_20261110` est le seul préalable SQL 3C à reconstruire; aucune
garde n’a masqué l’écart. Résultats :
`ops/mir-promotion/verification-results.json`.
