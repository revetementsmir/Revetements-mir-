# Lot de promotion MIR — préparé, non exécuté

Révision source : `8dbc0817d9ef9b3a0f69e841b564e08d86bbcfb2`.

Ce lot ne publie rien et ne contient aucune valeur de secret. Il décrit les
seules opérations autorisables plus tard, une par une. Il interdit `db push`
et tout déploiement global de fonctions.

## 1. Séparer intégration et publication

`.github/workflows/pages.yml` publie sur tout `push` vers `main` qui touche
`dist/**`, `tests/**`, `server/**`, `supabase/functions/**` ou le workflow
lui-même. Il accepte aussi `workflow_dispatch`. Une PR seule ne publie pas;
fusionner les PR 3A/3B/3C/refonte dans `main` déclencherait Pages parce que
leurs changements recoupent ces chemins.

Sans modifier les réglages maintenant, la séparation proposée est :

1. intégrer les PR dans une branche d’intégration protégée, pas dans `main`;
2. construire et tester le SHA final sur cette branche;
3. promouvoir le backend séparément après sauvegarde et autorisation;
4. fusionner vers `main` uniquement pendant la fenêtre de publication;
5. considérer cette fusion comme l’action de publication, car le workflow la
   déclenche automatiquement;
6. conserver `workflow_dispatch` pour une reprise explicitement autorisée,
   jamais pour séparer implicitement intégration et publication.

L’API GitHub disponible retourne `Forbidden` pour les réglages Pages et
l’environnement `github-pages`. Avant exécution, un propriétaire doit donc
confirmer en lecture seule la source Pages, les protections d’environnement,
les approbateurs et la protection de `main`. Aucun réglage n’a été modifié.

## 2. Écart objet par objet

Production et TEST possèdent les tables RLS
`mir_core.conversations`, `conversation_participants`, `messages`,
`message_receipts`, `notifications` et le bucket privé `mir-internal`.

Production n’a pas, contrairement à TEST :

- colonne `mir_core.conversations.job_id`, ses contraintes et index;
- RPC paginés/recherche `mir_chat_conversations`, `mir_chat_messages`,
  `mir_chat_search`, validation et helpers 3A;
- table RLS `mir_core.chat_file_validations` et RPC
  `mir_chat_file_authorize`, `mir_chat_file_upload_authorize`,
  `mir_chat_file_record`;
- politiques Storage restrictives `mir_chat_phase3a_*`;
- PDF dans la liste MIME du bucket `mir-internal`;
- tables RLS `help_faq`, `support_conversations`, `support_messages`,
  `support_attachments`;
- bucket privé `mir-support` et politiques `mir_support_*`;
- RPC FAQ/soutien, variantes avec organisation explicite et helpers privés;
- fonctions Edge `mir-chat-files` et `mir-estimates`.

TEST possède 72 entrées de migrations et cinq Edge Functions; production 34
et aucune Edge Function. Cet écart brut ne doit pas être poussé globalement.

## 3. Ordre SQL exact proposé

### Prêt après prévol production

1. `20261112114958_chat_phase3a_security.sql`
2. `20261115134647_chat_phase3a_private_file_gateway.sql`
3. déployer seulement `mir-chat-files`, puis vérifier Auth/CORS/lecture;
4. `20261116135048_chat_phase3a_private_file_activate.sql` depuis
   `supabase/proposals`, seulement après approbation distincte;
5. `20261118120000_chat_phase3b_pdf_attachments.sql`
6. `20261118123000_chat_phase3b_pdf_gateway_acl.sql`
7. `20261118124500_chat_phase3b_pdf_attestation_constraint.sql`

`chat_phase3a_storage_upload_probe` est exclue : elle corrige le téléversement
Storage direct de MIR TEST, alors que le circuit promu passe exclusivement par
`mir-chat-files`. `chat_phase3a_storage_support_acl` est absorbée dans le
socle 3C à reconstituer; sa précondition Support est absente de production.

### Bloqué avant promotion 3C

La migration hébergée `client_center_20261110`, qui a créé le socle FAQ et
soutien sur TEST, n’existe pas dans le dépôt et son SQL n’est pas disponible
dans l’historique Supabase. Les cinq migrations 3C versionnées sont des
correctifs additifs qui refusent volontairement un socle absent. Elles ne
peuvent donc pas être appliquées à production en l’état.

Avant 3C, il faut produire une migration officielle de référence à partir d’un
dump **schéma seulement** de TEST pour :

- les quatre tables RLS et leurs contraintes/index;
- `mir-support`, ses politiques et helpers;
- les RPC de base attendus par `phase3c_help_support_hardening`.

Cette migration doit être revue pour retirer données, comptes, memberships,
FAQ de recette et toute fonction `*_recipe*`, puis testée localement. Ensuite
seulement, appliquer dans l’ordre :

8. migration officielle de référence `client_center` (manquante);
9. `20261119120000_phase3c_help_support_hardening.sql`;
10. `20261119123000_phase3c_support_create_fix.sql`;
11. `20261119124500_phase3c_support_account_category.sql`;
12. `20261119133000_phase3c_client_organization_scope.sql`;
13. `20261119140000_phase3c_explicit_client_scope.sql`.

Les migrations tenant B, deux clients, diagnostics estimation et lecture de
recette sont exclues. Aucun compte, fixture ou membership n’est promu.

## 4. Préconditions et vérifications

`sql/010-preflight.sql` est en lecture seule et doit retourner une seule
ligne entièrement conforme avant l’étape 1. `sql/090-verify.sql` vérifie le
catalogue attendu après promotion sans lire de donnée métier.

Chaque migration est exécutée seule avec arrêt à la première erreur, dans une
transaction lorsque le fichier le prévoit. Après chaque étape : relire
l’historique, exécuter les assertions propres au fichier et comparer les
objets attendus. Une garde `IF NOT EXISTS` ne doit jamais masquer un objet
incompatible.

## 5. Fonctions et secrets

Le générateur `tools/promotion/build-function-bundles.cjs` prépare deux
répertoires déterministes et leur manifeste d’empreintes dans
`artifacts/mir-promotion/functions` :

- `mir-chat-files` avec ses deux modules partagés;
- `mir-estimates` avec contrat, présentation et service Edge.

Fonctions de recette explicitement exclues :
`mir-chat-tenant-b-recipe`, `mir-support-tenant-recipe`.

Noms requis, sans valeurs :

- automatiques Supabase : `SUPABASE_URL`, `SUPABASE_ANON_KEY` ou
  `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SERVICE_ROLE_KEY` ou
  `SUPABASE_SECRET_KEYS`;
- estimation : `RESEND_API_KEY`, `MIR_ESTIMATE_FROM`,
  `MIR_ESTIMATE_TO`, `MIR_ESTIMATE_ENABLED`, `MIR_ESTIMATE_MODE`.

En production, diagnostics et routes de recette restent fermés. Les secrets
doivent être inventoriés par leur nom seulement, jamais exportés dans le lot.

## 6. Sauvegarde manuelle gratuite et restauration

`tools/promotion/backup-database.sh` et `restore-database.sh` utilisent
`pg_dumpall`/`pg_dump`/`psql` avec un service libpq et un `PGPASSFILE` protégé; aucun
mot de passe n’apparaît dans les arguments ou journaux. Ils sauvegardent
rôles, schéma, données et historique `supabase_migrations`.

`backup-storage.mjs` et `restore-storage.mjs` sauvegardent seulement les
buckets `mir-internal` et `mir-support`, avec manifeste SHA-256. Ils lisent
URL et clé serveur depuis l’environnement et ne les journalisent pas.

Accès présents : lecture des catalogues TEST/production, code Git, Docker,
connexion GitHub pour PR. Accès manquants dans cette session :
`pg_dump`/`psql`, mot de passe/service de connexion base production,
lecture des réglages Pages/environnement, export direct des secrets et dump
schéma du socle TEST non versionné. Les scripts sont prêts mais une restauration
réelle n’est pas revendiquée tant que ces accès ne sont pas fournis dans un
canal sécurisé.

## 7. Retour arrière

- frontend : redéployer le SHA public précédent enregistré juste avant la
  publication; ne pas réécrire les données;
- fonctions : conserver archive, version et empreinte de chaque fonction
  précédente; production n’en possède actuellement aucune, donc le retour
  initial consiste à désactiver la route cliente puis retirer la fonction;
- SQL : `sql/rollback/900-disable-new-entrypoints.sql` révoque les nouveaux
  RPC sans supprimer tables, messages ou fichiers. La restauration structurelle
  utilise ensuite le dump vérifié ou une migration compensatoire revue;
- Storage : ne jamais supprimer des objets créés après la promotion. Restaurer
  politiques/configuration, puis réimporter seulement les objets manquants dont
  l’empreinte correspond au manifeste.

## 8. Validation locale isolée

`tools/promotion/verify-package.cjs` contrôle les chemins, exclusions,
workflows, secrets nommés et bundles. Les suites PGlite existantes
`mir-chat-phase3a-postgres`, `mir-chat-file-gateway-postgres` et
`mir-chat-support-postgres` fournissent la copie locale isolée avec UUID et
données fictifs. Elles réutilisent les certifications hébergées sans les
rejouer.
