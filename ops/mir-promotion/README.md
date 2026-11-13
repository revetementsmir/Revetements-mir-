# Lot de promotion MIR — préparé, non exécuté

Ce lot est inerte : aucune fusion, publication, modification GitHub ni écriture
Supabase production n'est effectuée. `db push` global est interdit. Les
empreintes exactes sont dans `migration-sha256.json`.

## Intégration et publication

`.github/workflows/pages.yml` publie à chaque `push` sur `main` touchant
les chemins surveillés, et accepte aussi `workflow_dispatch`. Une PR ou une
branche dédiée ne publie pas. Les PR doivent être intégrées et vérifiées sur
une branche d'intégration; la fusion finale vers `main` est l'acte de
publication et demande une autorisation séparée.

Les réglages Pages et l'environnement `github-pages` restent illisibles avec
l'accès API courant (`Forbidden`). Aucun réglage n'a été modifié.

## Réconciliation SQL

Le socle hébergé `client_center_20261110`, version Supabase
`20261110142928`, a été relu sur MIR TEST et reconstruit dans
`supabase/migrations/20261110142928_client_center_20261110.sql`. Il contient
seulement tables, contraintes, index, fonctions, triggers, RLS,
buckets/politiques et droits métier. Il ne contient ni compte, membership,
donnée client, secret ou fixture.

Les FAQ initiales sont séparées dans
`supabase/seed/client_center_initial_content.sql`. Ce contenu facultatif
n'est jamais exécuté automatiquement par le manifeste.

Deux dépendances supplémentaires ont été trouvées après le premier SQLSTATE
`55000` :

- `20261112115900_phase3c_client_search.sql` extrait uniquement le RPC métier
  de recherche auparavant mêlé à une migration de recette;
- `20261112120000_phase3c_acl_alignment.sql` vérifie les empreintes des corps
  de fonctions et fixe explicitement les droits. Les RPC authentifiés refusent
  `anon`; seule la FAQ publique conserve l'accès anonyme.

## Ordre exact

Le tableau `orderedSql` de `manifest.json` fait autorité :

1. socle `client_center`;
2. sécurité 3A;
3. ACL Storage soutien 3A;
4. correctif d'upload Storage requis par l'état historique;
5. passerelle privée 3A;
6. activation restrictive 3A, après serveur/client compatibles;
7. PDF 3B;
8. ACL passerelle PDF;
9. contrainte d'attestation PDF;
10. durcissement aide/soutien 3C;
11. correctif création soutien;
12. catégorie Compte;
13. portée organisation client;
14. portée client explicite;
15. recherche client extraite;
16. alignement final des ACL.

Chaque fichier doit être appliqué seul, dans cet ordre, avec arrêt au premier
échec. L'historique et l'empreinte doivent être vérifiés avant de marquer une
étape déjà appliquée. Aucune garde `IF NOT EXISTS` ne doit masquer un objet
incompatible. Les migrations tenant B, deux clients et estimation de recette
restent exclues.

`sql/010-preflight.sql` vérifie le point de départ en lecture seule.
`sql/090-verify.sql` contrôle le catalogue et les ACL après promotion sans
lire de donnée métier. `sql/080-catalog-snapshot.sql` produit le même type
d'empreinte que la référence TEST dans `mir-test-catalog-reference.json`.

## Fonctions et secrets

Seules `mir-chat-files` et `mir-estimates` sont empaquetées. Les fonctions
de recette sont exclues. Les noms de secrets nécessaires, jamais leurs valeurs,
sont listés dans `manifest.json`. Le destinataire et le mode production de
`mir-estimates` doivent être vérifiés séparément; aucune configuration de
recette n'est promue.

## Sauvegarde et restauration

État exact : **scripts de sauvegarde prêts; sauvegarde/restauration réelle non
vérifiée**.

- `backup-database.sh` / `restore-database.sh` préparent rôles, schéma,
  données et historique avec service libpq et `PGPASSFILE`;
- `backup-storage.mjs` / `restore-storage.mjs` couvrent seulement
  `mir-internal` et `mir-support`, avec manifeste SHA-256;
- les bundles de fonctions conservent fichiers et empreintes.

La documentation Supabase actuelle recommande des exports séparés
roles/schema/data et précise que les objets Storage et Edge Functions ne sont
pas inclus dans le dump de base. Il manque ici `pg_dump`/`pg_dumpall`/
`psql`, un service de connexion production autorisé et les accès nécessaires
pour exécuter puis restaurer une vraie sauvegarde. Aucune restauration n'est
donc revendiquée.

## Retour arrière

- frontend : redéployer le SHA public précédent, sans supprimer de données;
- fonctions : conserver puis redéployer les bundles/versions précédents;
- SQL : `sql/rollback/900-disable-new-entrypoints.sql` ferme les nouveaux
  points d'entrée sans supprimer les tables; toute compensation structurelle
  exige une migration revue ou une restauration préalablement vérifiée;
- Storage : restaurer configuration/politiques, puis seulement les objets
  manquants dont l'empreinte correspond.

## Validation locale

`tests/mir-promotion-chain-postgres.cjs` applique les 16 migrations à une
base PGlite représentative avec données fictives, compare le catalogue final à
MIR TEST, puis relance la chaîne via un historique à empreintes. Résultat :
7/7 contrôles; 16 migrations; aucune perte ni duplication; aucun contenu
initial injecté; ACL finales strictes.

Cette preuve valide la chaîne SQL préparée, pas une sauvegarde/restauration de
production ni une promotion réelle. Production et MIR TEST n'ont pas été
modifiés.
