# MIR — Audit du backend Punch production

Audit du 11 novembre 2026, relevés de catalogue entre 01:39 et 01:44 UTC, puis validation MIR TEST entre 01:57 et 02:02 UTC. **Migration production toujours bloquée avant toute écriture.**
Ce rapport conserve l'audit initial et ses échecs historiques; la section « Validation completion » ci-dessous fait foi pour l'état MIR TEST actuel. Il ne constitue pas une certification production.

## Révision et périmètre

- Dépôt : revetementsmir/Revetements-mir-.
- Main distant inspecté : `39ca1033ae1b70ced19cc5c756d4957f84cb2d41`, fusion PR #1.
- Branche : `codex/backend-punch-production`, créée depuis ce main.
- MIR TEST : `hxtztkmbfpmzrieccwsg`, nom MIR TEST, ACTIVE_HEALTHY, PostgreSQL 17.11.0.018.
- MIR production : `gccltmaulvrnthrbnrpd`, nom MIR, ACTIVE_HEALTHY, PostgreSQL 17.11.0.011.
- Une seule écriture SQL hébergée, autorisée et ciblée sur MIR TEST : `20261111015750_punch_phase2_completion`. Aucun compte créé, aucun changement de mot de passe, aucune publication et aucune écriture production.
- Méthodes MOON 1.3.5, architecture, sécurité et tests chargées sur Atelier; elles ne sont pas des validations indépendantes exécutées par des agents.
- SEO/GEO : non applicable, audit de backend privé sans modification des pages publiques.
- Documents Prompt 2 et passation relus; aucune autre phase commencée.

## Validation completion sur MIR TEST — état faisant foi

La cible complète inclut `20261110160000_punch_phase2_completion.sql`. Le frontend appelle réellement `mir_punch_journal` et `mir_time_bank_request` depuis `dist/portal-client.js`; l'écran Punch consomme aussi `bankRequests` et l'historique de décision dans `dist/chantier-app.js`. L'extension dépend des wrappers Punch Phase 1/2, de `memberships`, `staff_capabilities`, `notifications`, `punch_audit`, `time_bank_movements` et des fonctions de rôles existantes.

Le fichier a été rendu reproductible sans changer les permissions métier : table et index gardés, renommages exécutés seulement quand les alias historiques sont absents, préconditions explicites si une fonction source manque, et RPC en `CREATE OR REPLACE`. Une double exécution intégrale sur PostgreSQL jetable est réussie sans perte ni doublon.

Migration officielle appliquée uniquement à MIR TEST :

| Heure UTC | Projet | Version enregistrée | Nom | Résultat |
|---|---|---|---|---|
| 2026-11-11 01:57:50 | MIR TEST `hxtztkmbfpmzrieccwsg` | `20261111015750` | `punch_phase2_completion` | Succès transactionnel |

Contrôles catalogue après migration :

| Objet / droit | MIR TEST | MIR production | Preuve / action |
|---|---|---|---|
| `mir_core.time_bank_requests` | Présente, RLS activée | Absente | Créée seulement dans TEST; production inchangée |
| Contraintes banque | PK, 2 FK, quantité, explication et statut : 6 présentes | Absentes | Définitions PostgreSQL vérifiées |
| Index banque | PK + `time_bank_requests_employee` | Absents | Deux index vérifiés |
| Accès direct table | `postgres` seulement; aucun grant `anon`, `authenticated` ou `service_role` | Sans objet | Accès applicatif exclusivement par RPC |
| `mir_punch_snapshot_phase2_workflow` | Présente; exécutable seulement par postgres/service_role | Absente | Alias interne protégé |
| `mir_punch_correction_phase2_apply` | Présente; exécutable seulement par postgres/service_role | Absente | Alias interne protégé |
| `mir_punch_snapshot`, `mir_punch_correction` | Présentes; authenticated + service_role | Absentes | Wrappers publics conservés |
| `mir_punch_journal` | Présente; authenticated + service_role | Absente | Autorisation métier contrôlée dans la fonction |
| `mir_time_bank_request` | Présente; authenticated + service_role | Absente | Création/décision contrôlées dans la fonction |
| Policies directes banque | Aucune | Sans objet | RLS + révocation directe; pas de policy permissive |
| Production Punch/dossier | Sans objet | Toujours absent à 02:02:11 UTC | Lecture seule : shifts, segments, banque, journal, dossier, documents et bucket tous absents |

La certification GitHub Actions du SHA `1a6239ad105c6e737e8f46ddbeac9923d72af9d2`, run `42942875970`, est entièrement verte : les jobs « UI simulated and disposable SQL » et « certify-six-real-roles » ont réussi. L'artefact réel `mir-real-role-certification` (ID `13821187266`, SHA-256 ZIP `ef3879a11f18c0b354d966d2bed5c7b132223df4932eb43476e88ebe7aef98bc`) ne contient aucun secret.

Résultats réels des six rôles :

| Rôle | Rôle opérationnel | Journal Punch | Snapshot/permissions générales | Banque d'heures |
|---|---|---|---|---|
| Admin | Boss (libellé opérationnel seulement) | Autorisé | Auth, refresh, organisation et RPC autorisées/refusées : PASS | Trace finale vérifiée dans le journal |
| Boss | Boss | Autorisé | PASS | Accès de décideur confirmé |
| Adjointe | assistant | Autorisé | PASS | Refus réel d'une demande : PASS |
| Chef | chef_equipe | Refusé | PASS | Snapshot personnel seulement |
| Employé | employe | Refusé | PASS | Création réelle, pending puis refused visible : PASS |
| Entrepôt | warehouse | Refusé | PASS | Snapshot personnel seulement |

Le test fonctionnel a créé dans MIR TEST une demande de `0,25 h`, puis l'Adjointe l'a refusée avec motif. L'Employé a vu les états pending puis refused; l'Admin a retrouvé l'action `bank_request_refused` dans le journal. Aucun débit de banque n'a été effectué (`balanceChanged: false`) et l'historique a été conservé.

Tests completion :

| Test | Nature | Résultat |
|---|---|---|
| `mir-punch-postgres.cjs` | PostgreSQL jetable, migration exécutée deux fois | 21 scénarios PASS |
| `mir-punch-browser.cjs` | UI simulée Chromium | PASS, 6 formats téléphone/tablette/ordinateur, décisions, journal, banque, dîner et PDF réel |
| `mir-job-dossier-postgres.cjs` | PostgreSQL jetable | 6 scénarios PASS |
| `mir-job-dossier-browser.cjs` | Chromium local | 6/6 PASS |
| Certification API réelle | Six comptes MIR TEST | PASS |
| Journal réel par six rôles | MIR TEST | Admin/Boss/Adjointe autorisés; Chef/Employé/Entrepôt refusés : PASS |
| Banque réelle | MIR TEST | création Employé, décision Adjointe, snapshot et journal Admin : PASS |

Le précédent échec `review != locked` provenait du test mélangeant la date UTC de CI et la date métier Toronto. Le test utilise maintenant la plage couvrant explicitement les dates métier/UTC concernées; le comportement SQL n'a pas été assoupli. Le scénario de verrouillage passe.

**Arrêt obligatoire atteint :** MIR TEST est validé. Aucune migration ne sera appliquée à MIR production sans autorisation explicite distincte.

## Audit initial — décisions et blocages historiques

Les points 1 et 2 ci-dessous décrivent l'état constaté avant l'autorisation d'installer completion dans TEST; ils sont résolus par la validation faisant foi ci-dessus. Les points 3 à 6 restent des limites avant production.

1. La version locale `20261110160000_punch_phase2_completion.sql` n'est pas installée dans MIR TEST, même sous un autre numéro : absence réelle de `time_bank_requests`, `mir_punch_journal`, `mir_time_bank_request`, `mir_punch_snapshot_phase2_workflow` et `mir_punch_correction_phase2_apply`. Le frontend main appelle déjà journal et banque (`dist/portal-client.js:508`). La certification antérieure des six comptes ne certifie donc pas cette extension absente. L'installer d'abord en production contredirait le transfert du backend validé.
2. `tests/mir-punch-postgres.cjs:30` échoue sur le main inchangé : `'review' !== 'locked'`, après 14 scénarios réussis. À l'heure du test, date UTC = 2026-11-11 et Toronto = 2026-11-10. Le test définit la période en UTC, alors que la correction précédente recalcule la journée en America/Toronto. Cause du décalage étayée par le code; aucun changement du test ou des fonctions n'a été fait.
3. Sauvegardes production : **non vérifiées**. Le connecteur exposé ne fournit ni liste des backups ni état PITR; aucun accès Management API authentifié n'est disponible dans l'environnement. ACTIVE_HEALTHY ne prouve pas l'existence d'une sauvegarde. Aucune restauration ni sauvegarde payante lancée.
4. Les sources Punch font des CREATE non gardés et des renommages : elles ne sont pas idempotentes. Le dossier fait deux DROP POLICY IF EXISTS, explicitement interdits par la mission. Des versions gardées, vérifiant les définitions et évitant toute suppression, doivent être préparées et validées avant exécution.
5. `service_role` n'a SELECT/INSERT directs sur aucune des huit tables Punch TEST ni job_documents. Les RPC Punch existantes ont EXECUTE service_role. Ne pas ajouter des grants directs sous prétexte de conformité; identifier le besoin exact avant toute modification de droits.
6. Le schéma jetable des tests existants est reconstruit depuis les migrations locales; ce n'est pas une copie fidèle de production. Aucun rejeu sur une copie fidèle de production ni double exécution sûre n'est donc certifié.

**Décision nécessaire** : confirmer si la cible inclut l'extension completion absente de TEST. Si oui, sa validation exige une copie isolée fidèle, puis une décision explicite pour toute application sur MIR TEST, actuellement interdit en écriture par la mission. Ne pas contourner ce verrou par une installation production anticipée.

## Cause de l'absence en production

Constat démontré : production n'enregistre aucune migration Punch et ne possède aucun objet Punch, tandis que TEST enregistre punch_gps et trois corrections Phase 2. La fusion du frontend et des fichiers SQL n'applique pas une migration Supabase. Le workflow Pages ne déploie pas ces migrations. L'origine humaine ou opérationnelle de cette omission n'est pas prouvée; aucune intention n'est déduite.

## Matrice des objets et dépendances

Inventaire réel issu des catalogues PostgreSQL, pas des seuls noms de migration.
Le JSON associé contient colonnes, contraintes, index, triggers, policies, grants et empreintes des fonctions.

| Objet | MIR TEST | MIR production | Migration source | Dépendances | Action |
|---|---|---|---|---|---|
| mir_core.jobs | Présent, RLS | Présent, RLS | 202611060004_connected_catalogue.sql | organizations | Réutiliser; ne pas rejouer |
| mir_core.job_memberships | Présent, RLS | Présent, RLS | 202611060004_connected_catalogue.sql | jobs, memberships | Réutiliser; ne pas rejouer |
| mir_core.teams | Présent, RLS | Présent, RLS | 20261109170000_employee_operations_backend.sql | memberships, staff_capabilities | Réutiliser; ne pas rejouer |
| mir_core.team_day_assignments | Présent, RLS | Présent, RLS | 20261109180000_chef_equipe_boss_portal.sql | jobs, teams | Réutiliser; ne pas rejouer |
| mir_core.team_tasks | Présent, RLS | Présent, RLS | 20261109180000_chef_equipe_boss_portal.sql | jobs, teams | Réutiliser; ne pas rejouer |
| mir_core.daily_reports | Présent, RLS | Présent, RLS | 20261109180000_chef_equipe_boss_portal.sql | jobs, teams | Réutiliser; ne pas rejouer |
| mir_core.time_entries | Présent, RLS | Présent, RLS | 20261110010000_management_finance.sql | jobs, memberships | Réutiliser; ne pas rejouer |
| mir_core.punch_shifts | Présent, RLS | Absent | 20261110020000_punch_gps.sql | memberships | Installation conditionnelle, bloquée |
| mir_core.punch_segments | Présent, RLS | Absent | 20261110020000_punch_gps.sql | punch_shifts, jobs, auth.users | Installation conditionnelle, bloquée |
| mir_core.extras | Présent, RLS | Présent, RLS | 20261109170000_employee_operations_backend.sql | jobs, memberships | Réutiliser; ne pas rejouer |
| mir_core.material_requests | Présent, RLS | Présent, RLS | 20261109180000_chef_equipe_boss_portal.sql | jobs, teams | Réutiliser; ne pas rejouer |
| mir_core.orders | Présent, RLS | Présent, RLS | 202611060001_shared_foundation.sql | organizations, memberships | Réutiliser; ne pas rejouer |
| mir_core.order_revisions | Présent, RLS | Présent, RLS | 202611060001_shared_foundation.sql | orders | Réutiliser; ne pas rejouer |
| mir_core.suppliers | Présent, RLS | Présent, RLS | 202611060001_shared_foundation.sql | organizations | Réutiliser; ne pas rejouer |
| mir_core.messages | Présent, RLS | Présent, RLS | 20261109170000_employee_operations_backend.sql | conversations, jobs | Réutiliser; ne pas rejouer |
| mir_core.conversations | Présent, RLS | Présent, RLS | 20261109170000_employee_operations_backend.sql | organizations | Réutiliser; ne pas rejouer |
| mir_core.job_activity | Présent, RLS | Présent, RLS | 20261109170000_employee_operations_backend.sql | jobs, memberships | Réutiliser; ne pas rejouer |
| mir_core.delivery_runs | Présent, RLS | Présent, RLS | 20261109233000_warehouse_vehicle_delivery.sql | vehicles, memberships | Réutiliser; ne pas rejouer |
| mir_core.delivery_run_orders | Présent, RLS | Présent, RLS | 20261109233000_warehouse_vehicle_delivery.sql | delivery_runs, jobs, orders | Réutiliser; ne pas rejouer |
| mir_core.job_documents | Présent, RLS | Absent | 20261111120000_job_dossier_central.sql | jobs, auth.users | Installation conditionnelle, bloquée |
| mir_core.punch_settings | Présent, RLS | Absent | 20261110020000_punch_gps.sql | organizations (configuration), auth.users | Installation conditionnelle, bloquée |
| mir_core.punch_events | Présent, RLS | Absent | 20261110020000_punch_gps.sql | punch_shifts, memberships, jobs | Installation conditionnelle, bloquée |
| mir_core.punch_corrections | Présent, RLS | Absent | 20261110020000_punch_gps.sql | punch_shifts, jobs, memberships | Installation conditionnelle, bloquée |
| mir_core.time_periods | Présent, RLS | Absent | 20261110020000_punch_gps.sql | auth.users | Installation conditionnelle, bloquée |
| mir_core.time_bank_movements | Présent, RLS | Absent | 20261110020000_punch_gps.sql | time_periods, memberships | Installation conditionnelle, bloquée |
| mir_core.time_bank_requests | Présent, RLS, aucun droit direct applicatif | Absent | 20261110160000_punch_phase2_completion.sql | memberships, auth.users | Validé TEST; attendre autorisation production |
| mir_core.punch_audit | Présent, RLS | Absent | 20261110020000_punch_gps.sql | auth.users | Installation conditionnelle, bloquée |
| mir_core.staff_capabilities | Présent, RLS | Présent, RLS | 20261109170000_employee_operations_backend.sql | memberships | Réutiliser; ne pas rejouer |
| mir_core.memberships | Présent, RLS | Présent, RLS | 202611060001_shared_foundation.sql | organizations, auth.users | Réutiliser; ne pas rejouer |
| public.mir_punch_snapshot / action / correction / admin | Présents | Absents | punch_gps + integrity + workflow + corrections | Tables Punch, staff_role, job_allowed | Transfert conditionnel |
| mir_core.punch_manager / punch_distance_m | Présents | Absents | punch_gps | staff_role; mathématiques PG | Ajouter avec Punch |
| mir_core.operational_role / public.mir_my_operational_access | Présents | Absents | 20261110120000_operational_roles_phase1.sql | memberships, staff_capabilities | Ajouter sans changer les droits |
| public.mir_punch_journal / mir_time_bank_request | Présents et certifiés six rôles | Absents | 20261110160000_punch_phase2_completion.sql | Punch + notifications | Validés TEST; attendre autorisation production |
| public.mir_job_dossier_snapshot | Présent | Absent | 20261111120000_job_dossier_central.sql | Tous les domaines du dossier + Punch | Après Punch, version sans DROP POLICY |
| mir_core.job_dossier_allowed / job_storage_read / job_storage_write | Présents | Absents | job_dossier_central | job_allowed, staff_role, memberships, livraisons, jobs, job_documents | Après contrôle de compatibilité |
| storage.objects / storage.buckets | Présents, objects RLS | Présents, objects RLS | Socle Supabase existant | helpers de policy | Réutiliser |
| mir-job-documents | Présent privé | Absent | job_dossier_central | storage.buckets | Créer privé, jamais de bucket public |
| mir_job_document_read / mir_job_document_insert | Présentes | Absentes | job_dossier_central | helpers Storage | Créer seulement si absentes, aucune suppression |
| mir_core.staff_role | Même définition | Même définition | chef_equipe_boss_portal déjà effectif | memberships, staff_capabilities | Ne pas recréer |
| mir_core.job_allowed(uuid,uuid) | Même définition | Même définition | Déjà effectif | surcharge à 3 arguments | Ne pas recréer |
| mir_core.job_allowed(uuid,uuid,uuid) | Présent | Présent | Déjà effectif | staff_role, job_memberships | Corps identique hors espaces/point-virgule; ACL différentes, préserver |
| public.mir_boss_action | Deux actions de décision | Décisions + assign_day, move_member, substitute_leader | chef_equipe_boss_portal, divergence hébergée TEST | Équipes, membres, jobs | Ne remplacer aucun côté |
| mir-internal | Privé | Privé | employee_messages_storage | internal_object_allowed | Réutiliser sans modification |
| mir-estimates | Privé | Privé | Historique estimation existant | Hors périmètre | Préserver |
| mir-support / mir-supplier-documents | Privés | Absents | Migrations TEST hors mission | Hors périmètre | Ne pas transférer |

### Écarts de schéma pertinents

Les 19 tables communes listées sont compatibles au niveau colonnes communes interrogées (type, nullable, défaut).
TEST possède en plus dans jobs : job_number, delivery_address, team, foreman, required_date, revision, created_at, latitude, longitude, client_name, scheduled_start.
Production possède déjà address, city, phone. Punch ajoute seulement latitude, longitude, client_name, scheduled_start : aucune copie des champs d'administration TEST n'est nécessaire au dossier actuel.
TEST possède en plus orders.job_id et orders.order_number; le dossier local utilise order_revisions.snapshot pour le rattachement, pas ces colonnes. Aucun ajout déduit de leur seule absence.

### Contraintes, index, triggers, RLS

- TEST : 8 tables Punch, toutes RLS; 42 contraintes et 14 index sur le socle Punch observé (détail faisant foi dans le JSON).
- Index notables : punch_one_active_shift, punch_one_active_segment, punch_shifts_employee_date, punch_one_pending_lunch_request.
- Contraintes : PK composites organisation/id, FK organisation/employé/chantier/journée, dates ordonnées, types et statuts contrôlés, unicité request_id et période.
- Aucun trigger Punch dans TEST. Ne pas inventer de trigger à transférer. Les quatre triggers mir_core observés concernent fournisseurs, commandes, entrepôt et prix; ils restent inchangés.
- Aucune policy de lecture directe Punch dans TEST : RLS activée et droits directs retirés; accès par RPC SECURITY DEFINER.
- anon/authenticated sans SELECT direct Punch/job_documents; service_role également sans droits directs observés. Les détails sont conservés sans altérer les permissions.
- job_allowed en production a une ACL par défaut (PUBLIC EXECUTE implicite); TEST a une ACL explicite authenticated. Cela ne prouve pas à lui seul une fuite Data API, mais interdit une uniformisation silencieuse.

## Historique et ordre proposé — NON EXÉCUTABLE en l'état

Les versions hébergées diffèrent des timestamps locaux. Exemples : punch_gps = 20261110002731 sur TEST; integrity = 20261110134141; workflow = 20261110134146; corrections = 20261110141037; dossier = 20261111005324.
Les empreintes SQL officielles et nombres d'instructions sont dans le JSON. Les objets réels ont été contrôlés pour détecter les applications manuelles; aucune table/RPC Punch cachée sous un autre numéro n'a été trouvée en production.

Les fondations, opérations employés, messagerie, chef/équipes, logistique et finance sont déjà effectives en production, même lorsque leur nom de migration source est absent. **Ne pas rejouer** chef_equipe_boss_portal : il contient DROP FUNCTION et changement de contrainte alors que les fonctions et tables nécessaires existent déjà. Ne pas rejouer operational_admin_role_label : les deux environnements ont la même définition du snapshot opérationnel.

| Ordre conditionnel | Fichier source | Objets / dépendances | Idempotent actuel | Risque / avant | Après | Retour arrière |
|---|---|---|---|---|---|---|
| 0 | Fondations/opérations/chef/logistique/finance déjà effectives | tables canoniques et helpers | Non pour plusieurs | Vérifier signatures, colonnes, ACL; aucune réapplication | Empreintes inchangées | Sans objet |
| 1 | 20261110020000_punch_gps.sql | 4 colonnes jobs, 8 tables, 13 index initiaux, RPC et helpers; dépend memberships/jobs/staff_role/job_allowed/auth | Non | État entièrement absent exigé; préparer gardes exactes, verrou et limites de temps | Tables, contraintes, RLS, ACL/RPC; configuration module désactivé par défaut | Transaction annulée si échec; après commit, arrêt fonctionnel et correctif additif, aucune suppression |
| 2 | 20261110120000_operational_roles_phase1.sql | operational_role, mir_my_operational_access; memberships/staff_capabilities | CREATE OR REPLACE répétable mais recrée à l'identique | Ne créer que si absent, sinon comparer; ne changer ni membership ni staff_role | Six contrats de rôle, Admin libellé Boss seulement | Même principe; aucun retrait de droits improvisé |
| 3 | 20261110130000_punch_phase2_integrity.sql | index dîner, wrappers action/correction/admin, anciens noms phase1 | Non, RENAME | Préconditions exactes sur signatures et absence des alias; dépend ordre 1 | Dîner, périodes fermées, banque, wrapper interne interdit authenticated | Transaction; pas de renommage inverse improvisé |
| 4 | 20261110140000_punch_phase2_workflow.sql | wrappers snapshot/admin, alias phase1/phase2 | Non | Dépend 3; les noms historiques doivent être ceux attendus | Historique banque, approbation/verrouillage et correction auditée | Transaction puis correctif additif si nécessaire |
| 5 | 20261110150000_punch_phase2_corrections.sql | correction + alias phase2 | Non | Dépend 3/4, FK et colonnes Punch présentes | Avant/après, arrivée/départ/job/trajet, interdits | Idem |
| 6, validé TEST | 20261110160000_punch_phase2_completion.sql | time_bank_requests, wrappers, journal, banque, notifications | Oui après correctif gardé; double exécution testée | Dépend 5 + notifications/staff_capabilities; installée TEST sous 20261111015750 | 21 SQL, UI et six rôles réels verts | Transaction; après commit, correctif additif seulement |
| 7 | 20261111120000_job_dossier_central.sql | job_documents, bucket/policies/helpers et snapshot | Partiel seulement | Dépend 1 à 5, tables du dossier; remplacer DROP POLICY par création conditionnelle vérifiée; comparer tout objet préexistant | Privé, isolation, historique, pagination, aucun droit direct | Transaction; objets conservés après commit, éventuel correctif additif |

L'ordre 2 est indépendant des tables Punch mais dépend des rôles déjà présents. Completion n'est pas une dépendance SQL du dossier; c'est une dépendance des fonctions Punch déjà appelées par le frontend.
Chaque étape future doit passer par apply_migration officiel, séparément, avec nom enregistré et vérification après chacune. Aucun db push global.
Pour une seconde exécution sûre : garde sur l'état complet attendu, comparaison de définition/ACL et refus explicite d'un état partiel; pas de IF NOT EXISTS qui masquerait une incompatibilité. Ces correctifs **ne sont pas encore écrits**, le plan reste bloqué.

Configuration : la migration socle ajoute une ligne par organisation, module_enabled=false. Ne copier ni identifiants, ni données, ni réglages actifs TEST; activation et configuration métier production restent à décider après validation.
Backups : obtenir liste/statut/date de sauvegarde et PITR du projet MIR avant tout apply_migration. Aucun rollback destructif conforme à cette mission; la reprise normale est l'arrêt puis un correctif additif revu.

## Tests exécutés sur le main inspecté

| Test | Nature / résultat |
|---|---|
| mir-punch-postgres.cjs | Échec historique du main après 14 PASS; corrigé sur la branche puis **21 scénarios PASS**, double migration incluse |
| mir-job-dossier-postgres.cjs | PostgreSQL jetable issu du dépôt : 6 scénarios PASS; socle local, pas copie production |
| mir-job-dossier-real.cjs | Contrat statique : 1 PASS; ce fichier **n'ouvre aucune session réelle** |
| mir-six-role-certification.cjs | Contrats et API simulée : 7 PASS; pas six comptes réels |
| mir-operational-roles-postgres.cjs | PostgreSQL jetable : PASS, contrat 5 rôles opérationnels, Admin présenté Boss |
| mir-account-session.cjs | Simulé : 2 PASS |
| mir-role-navigation.cjs | Statique : PASS |
| mir-warehouse-sql.cjs | Statique : PASS |
| mir-order-coordination.cjs | Métier simulé : 20 PASS |
| mir-management-postgres.cjs | PostgreSQL jetable : 7 PASS |
| mir-warehouse-vehicles-postgres.cjs | PostgreSQL jetable : 15 PASS |
| mir-employee-operations-postgres.cjs | PostgreSQL jetable : 12 PASS |
| mir-pages-regressions.cjs | Statique/métier : 41/41 PASS (inclut accueil, Pliage, Studio, sauvegardes) |
| mir-realisations.cjs | Statique : 9/9 PASS |
| mir-studio-wall-sections.cjs | Métier : 10 PASS |
| mir-pliage-audit-commercial.cjs | Métier : 11 PASS (inclut Magasin et prix) |
| mir-boutique-audit-20261110.cjs | Statique : PASS, contrôle de 118 références |
| mir-job-dossier-browser.cjs | 6/6 PASS après relance Chromium autorisée; rendu fictif isolé, 360/390/430/768/1024/1440 px, pas de RPC réelle; captures versionnées préservées |
| Certification six sessions MIR TEST | **PASS**, run 42942875970, SHA 1a6239a; journal réel six rôles et banque réelle également PASS; aucun identifiant demandé au clavardage |
| Répétition sur copie fidèle production | Non exécutée |
| Double application gardée sur copie fidèle | Non exécutée |
| Permissions métier / RPC / Storage en production | Non exécutées : backend absent et étape migration non atteinte |
| Punch en navigateur complet | PASS sur six formats; gestion/portail/Entrepôt couverts par le job CI simulé vert |
| Appareils physiques, expiration UI réelle | Non exécutés |

Échec environnemental initial du navigateur : Chromium setsockopt Operation not permitted, SIGTRAP. Relance hors sandbox autorisée : réussie. Ce n'est pas une régression applicative.
Erreur d'invocation : tentative de tests/mir-pages.cjs (fichier inexistant), remplacée par le fichier réel mir-pages-regressions.cjs; aucune réussite comptée pour cette invocation.
Les tests et sources exécutés sont inchangés au SHA main indiqué; `git diff` ne contient que les livrables de cet audit.

## Certification réelle et échec CI isolé

La PR en brouillon est https://github.com/revetementsmir/Revetements-mir-/pull/2 .
Le run https://github.com/revetementsmir/Revetements-mir-/actions/runs/42941500212 a exécuté le SHA `f5c50ae2b82f08fdffdfbabf3cbfc4b4cb40cbcd`.
- Job `certify-six-real-roles` : completed/success, six authentifications et contrôles RPC réalisés avec les secrets GitHub Actions; rapport artefact `mir-real-role-certification`, ID 13820777607, empreinte ZIP sha256:93144109163b7c90ca5fd2279897130f9ba8703431bef9b6a780eb68c731426d.
- Job `UI simulated and disposable SQL` : completed/failure. Le log reproduit exactement `'review' !== 'locked'`, tests/mir-punch-postgres.cjs:30:765, à 2026-11-11T01:47:57Z. L'étape navigateur de ce job est skipped; ne pas la compter comme réussie.
- Les seuls changements du SHA testé sont les trois livrables d'audit; le test et les migrations correspondent au main inspecté. C'est une preuve supplémentaire du caractère préexistant de l'échec SQL.
- La certification réelle couvre sessions/rafraîchissement, rôles, snapshots autorisés/refusés et organisation étrangère. Elle ne teste ni les RPC completion absentes, ni le dossier, ni les fichiers privés, ni un chantier fermé. Son succès ne lève pas ces blocages.
- Ce complément de rapport est un changement documentaire ultérieur; il ne modifie aucun code testé.

## Matrice des permissions attendues — à vérifier avant production

| Rôle | Punch | Dossier chantier | Heures/punchs dans le dossier | Documents | Limite de preuve |
|---|---|---|---|---|---|
| Admin | Configuration et opérations selon RPC existantes | Technique autorisé, libellé opérationnel Boss | Oui | Privés, gestion selon helper | Session réelle et RPC du script certifiées; dossier/Storage non certifiés en réel |
| Boss | Gestion, décisions et périodes selon contrat | Chantiers de son organisation | Oui | Privés | Idem |
| Adjointe | Lecture/validation selon Punch, banque; pas décisions Boss réservées | Organisation selon helper | Oui | Privés | Idem |
| Chef | Personnel et équipe autorisée selon snapshot Punch existant | Affectations autorisées | Non dans dossier | Lecture autorisée | Idem |
| Employé | Personnel seulement | Affectations autorisées | Non dans dossier | Lecture autorisée | Idem |
| Entrepôt | Personnel selon RPC existantes | Chantiers liés à livraison | Non dans dossier | Lecture autorisée | Liaison positive Entrepôt non prouvée par les tests locaux actuels |

Le test dossier SQL refuse un Entrepôt non lié mais ne crée pas une livraison positive : ne pas annoncer la matrice entière certifiée.
Chantier fermé : le snapshot local reste lisible/readOnly et Storage refuse l'écriture; ne pas extrapoler à toutes les RPC métier existantes.
L'isolation organisation/chantier réelle, les URL directes, l'expiration et les fichiers signés doivent encore être testés avec sessions autorisées.

## État production et reprise

Migration appliquée pendant cette mission : **uniquement MIR TEST**, `20261111015750_punch_phase2_completion`, à 01:57:50 UTC. Migration production : **aucune**.
Production reste sans Punch, sans job_documents, sans mir_job_dossier_snapshot et sans bucket mir-job-documents.
Aucun grant, policy, fonction, bucket, compte ni donnée modifié en production. MIR TEST contient une demande de banque de certification refusée, conservée comme trace; aucun solde n'a changé.

Reprise :
1. Attendre l'autorisation explicite de migration production demandée à la fin de cette étape.
2. Avant toute écriture future, vérifier backups/PITR et obtenir une copie de schéma production fidèle, sans données privées inutiles.
3. Finaliser les gardes idempotentes des migrations Punch antérieures et le dossier sans suppression de policy, sans changer les droits existants.
4. Exécuter le plan complet deux fois sur cette copie fidèle; l'extension completion est déjà verte en double exécution jetable et en réel TEST.
5. Reconfirmer le projet MIR `gccltmaulvrnthrbnrpd`, puis appliquer une migration officielle à la fois seulement après autorisation, vérifier et consigner chaque version/heure, arrêter au premier échec.
6. PR à relire, aucune fusion ni publication automatique.

## Pièces de preuve

- `mir-backend-punch-production-audit.json` : métadonnées des deux projets, historique officiel avec empreintes SQL; aucun compte ni donnée métier exporté.
- `mir-backend-punch-production-audit.sql` : requêtes de catalogue en transactions READ ONLY.
- Captures antérieures conservées dans `captures/job-dossier-phase1/`; la relance a vérifié les six formats avec données fictives. Elles ne sont pas des captures production.
- Branche : https://github.com/revetementsmir/Revetements-mir-/tree/codex/backend-punch-production ; PR #2 en brouillon, non fusionnée. CI réelle réussie et SQL échoué séparément au SHA ci-dessus.

### TEST — historique officiel

| Version hébergée | Nom | Instructions SQL |
|---|---|---:|
| 20261108135311 | mir_account_customer_auth | 1 |
| 20261108150827 | mir_account_portal_adapter | 1 |
| 20261109143705 | mir_estimates_edge | 1 |
| 20261109150009 | mir_estimates_chunk_upload | 1 |
| 20261109151518 | mir_estimates_free_budget | 1 |
| 20261109154008 | mir_estimates_verified_uploads | 1 |
| 20261109183527 | mir_admin_shared_alignment | 1 |
| 20261109183534 | mir_admin_coordination_base | 1 |
| 20261109184010 | mir_admin_supplier_base | 1 |
| 20261109184030 | mir_admin_coordination_ops | 1 |
| 20261109184615 | mir_administration_portal | 1 |
| 20261109184736 | mir_admin_dossiers | 1 |
| 20261109185029 | mir_admin_invitation_search | 1 |
| 20261109185321 | mir_estimate_administration | 1 |
| 20261109185407 | mir_portal_order_followup | 1 |
| 20261109185710 | mir_coordination_job_context | 1 |
| 20261109190138 | mir_admin_operations_validation | 1 |
| 20261109190305 | mir_supplier_receipt_destinations | 1 |
| 20261109190441 | mir_warehouse_exact_backlink | 1 |
| 20261109190627 | mir_admin_identity_and_history | 1 |
| 20261109190919 | mir_supplier_pdf_delivery | 1 |
| 20261109191357 | mir_coordination_followup_access | 1 |
| 20261109191641 | mir_warehouse_allocated_remainder | 1 |
| 20261109191919 | mir_supplier_stock_followup | 1 |
| 20261109192734 | mir_supplier_document_revision | 1 |
| 20261109192937 | mir_supplier_expected_date | 1 |
| 20261109193235 | mir_administration_access_states | 1 |
| 20261109193843 | mir_stock_dispatch_quantity | 1 |
| 20261109194408 | mir_today_filtered_work | 1 |
| 20261109194622 | mir_job_central_order_links | 1 |
| 20261109195328 | mir_archived_order_history | 1 |
| 20261109195741 | mir_employee_central_documents | 1 |
| 20261109200202 | mir_administration_reference_indexes | 1 |
| 20261109214618 | employee_operations_backend | 1 |
| 20261109214645 | employee_operations_backfill | 1 |
| 20261109215710 | employee_messages_storage | 1 |
| 20261109215819 | employee_boss_capability | 1 |
| 20261109221944 | chef_equipe_boss_portal | 1 |
| 20261109223241 | chef_equipe_job_access_hotfix | 1 |
| 20261109232215 | warehouse_vehicle_delivery | 1 |
| 20261109232520 | warehouse_delivery_defaults | 1 |
| 20261109235526 | management_finance | 1 |
| 20261110002731 | punch_gps | 1 |
| 20261110033043 | boutique_pricing | 1 |
| 20261110034329 | boutique_pricing_acl_fix | 1 |
| 20261110134134 | operational_roles_phase1 | 1 |
| 20261110134141 | punch_phase2_integrity | 1 |
| 20261110134146 | punch_phase2_workflow | 1 |
| 20261110141037 | punch_phase2_corrections | 1 |
| 20261110142928 | client_center_20261110 | 1 |
| 20261110233343 | operational_admin_role_label | 1 |
| 20261111005324 | job_dossier_central | 1 |
| 20261111015750 | punch_phase2_completion | 1 |

### PROD — historique officiel

| Version hébergée | Nom | Instructions SQL |
|---|---|---:|
| 20261107182746 | mir_restrict_rls_auto_enable_execution_20261107 | 1 |
| 20261107182814 | mir_warehouse_stock_qr_20261107 | 1 |
| 20261107182844 | mir_order_coordination_20261107 | 1 |
| 20261107182905 | mir_order_coordination_operations_20261107 | 1 |
| 20261107182918 | mir_order_supplier_purchases_20261107 | 1 |
| 20261108145136 | mir_account_customer_auth | 1 |
| 20261108152047 | mir_account_portal_adapter | 1 |
| 20261108231219 | boutique_bend_tariff | 1 |
| 20261109021744 | public_bend_tariff | 1 |
| 20261109201108 | mir_estimates_edge_schema | 1 |
| 20261109201606 | mir_estimates_edge_rpc | 1 |
| 20261109201636 | mir_estimates_chunk_upload | 1 |
| 20261109202048 | mir_estimates_free_budget | 1 |
| 20261109202053 | mir_estimates_verified_uploads | 1 |
| 20261109202208 | mir_admin_shared_alignment | 1 |
| 20261109202216 | mir_admin_coordination_base | 1 |
| 20261109202236 | mir_admin_coordination_ops | 1 |
| 20261109202240 | mir_admin_supplier_base | 1 |
| 20261109214810 | employee_operations_backend | 1 |
| 20261109214814 | employee_operations_backfill | 1 |
| 20261109215832 | employee_messages_storage | 1 |
| 20261109215837 | employee_boss_capability | 1 |
| 20261109232730 | warehouse_vehicle_delivery | 1 |
| 20261109232739 | warehouse_delivery_defaults | 1 |
| 20261109235831 | management_finance | 1 |
| 20261110070343 | boutique_pricing | 1 |
| 20261110233716 | operational_admin_role_label | 1 |

