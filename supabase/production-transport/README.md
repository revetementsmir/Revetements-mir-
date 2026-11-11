# Transport Punch et dossier chantier — aucune application hébergée autorisée

Ces sept fichiers constituent le lot à examiner pour MIR production. Ils sont générés depuis les sources historiques par `tools/validation/prepare-backend-transport.cjs`. Ne pas rejouer les sources historiques en plus du lot. Ne pas utiliser `supabase db push` pour appliquer toutes les migrations du dépôt.

Ordre exact :

1. `20261110020000_punch_gps.sql`
2. `20261110120000_operational_roles_phase1.sql`
3. `20261110130000_punch_phase2_integrity.sql`
4. `20261110140000_punch_phase2_workflow.sql`
5. `20261110150000_punch_phase2_corrections.sql`
6. `20261110160000_punch_phase2_completion.sql`
7. `20261111120000_job_dossier_central.sql`

Chaque fichier est transactionnel, prend le même verrou transactionnel et impose des délais (verrou 5 s, instruction 120 s). Le premier passage refuse les collisions d'objets et les dépendances manquantes. Il ne tente pas de réparer une installation manuelle partielle. Les colonnes jobs déjà présentes doivent avoir les types et nullabilités attendus.

Le registre privé `mir_core.backend_migration_checkpoints` conserve le SHA-256 de la source, l'heure et l'empreinte du catalogue après application. Une application suivante est un retour sans réexécution des fonctions et renommages si la source et le catalogue correspondent. Une dérive provoque un arrêt explicite. Chaque nouvelle étape met les empreintes du registre à jour pour permettre aussi le rejeu de tout le lot après installation complète. Les objets préexistants sans checkpoint ne sont jamais adoptés silencieusement : comparer leurs définitions et préparer un traitement explicite avant toute reprise.

L'empreinte inclut les tables mir_core, colonnes, contraintes, index, fonctions MIR et ACL, policies concernées, triggers mir_core et configuration du bucket. Elle exclut le registre lui-même et les lignes métier. Toute modification légitime ultérieure du schéma peut donc nécessiter une nouvelle revue avant un rejeu; ne jamais modifier le registre pour contourner un échec.

Le registre n'est **pas** l'historique officiel Supabase. Après autorisation distincte seulement, chaque fichier devra être soumis séparément au mécanisme officiel `apply_migration`, avec un nom explicite, puis contrôlé et sa version officielle consignée. Aucun fichier de ce dossier n'est appliqué automatiquement par la CI.

Validation reproductible locale :

```sh
node tests/mir-backend-production-rehearsal.cjs
MIR_REHEARSAL_SCHEMA=production node tests/mir-punch-postgres.cjs
MIR_REHEARSAL_SCHEMA=production node tests/mir-job-dossier-postgres.cjs
```

Le fixture est extrait du catalogue production, sans lignes privées. Le moteur local disponible est PostgreSQL 18.6/PGlite; la production est PostgreSQL 17.11. Les extensions de plateforme et services Auth/Storage/HTTP ne sont pas reproduits comme services. Ce test valide le schéma applicatif, les droits SQL et les parcours SQL; il ne certifie ni les sauvegardes/PITR ni l'exécution sur le moteur hébergé 17.

En cas d'échec d'une transaction : arrêter, conserver l'erreur et vérifier son annulation. Après un commit, conserver tables et historique; préparer uniquement un correctif additif revu. Aucun retour arrière destructif n'est prévu.
