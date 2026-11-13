# Phase 1 — Dossier chantier central

Date : 11 novembre 2026
Branche : `codex/phase-1-dossier-chantier`
Base de départ : `ab2952610560350d40a90d05039c1be96ccab51f`

## Portée livrée

Un RPC de lecture central `mir_job_dossier_snapshot(org, job, page_size, page_before)` compose les données canoniques autour du `job_id` existant. Il ne crée aucune seconde table de chantiers et ne déplace aucune donnée. Le dossier expose équipe, employés, adresse, plans/documents, tâches, rapports, heures, punchs, extras, demandes, commandes, fournisseurs et messages liés au chantier. Les résultats volumineux sont bornés à 50 éléments et l’activité possède un curseur `nextBefore`.

Les documents utilisent le bucket privé `mir-job-documents`; lecture et ajout sont contrôlés par Storage/RLS. Un chantier archivé reste lisible et est présenté en lecture seule. Aucune action métier nouvelle n’a été ajoutée : les actions sensibles continuent d’utiliser les RPC et audits existants.

## Matrice de permissions

| Rôle | Dossier | Heures/punchs | Fournisseurs | Portée |
|---|---|---|---|---|
| Admin technique | Lecture/gestion selon accès Admin existant | Oui | Oui | Organisation; libellé opérationnel « Boss » uniquement |
| Boss | Lecture/gestion | Oui | Oui | Tous les chantiers de son organisation |
| Adjointe | Lecture/coordination | Oui | Oui | Tous les chantiers de son organisation |
| Chef d’équipe | Lecture | Non dans le snapshot central | Non | Chantiers affectés uniquement |
| Employé | Lecture | Non dans le snapshot central | Non | Chantiers affectés uniquement |
| Entrepôt | Lecture | Non | Oui | Chantiers liés à une tournée/commande uniquement |

Dans tous les cas, une organisation étrangère, un chantier non affecté, un RPC direct non autorisé et un fichier hors périmètre sont refusés côté serveur.

## Résultats

| Vérification | Résultat |
|---|---|
| PostgreSQL jetable : isolation, fermeture, Storage, RPC direct, absence de duplication | 6/6 réussi |
| Contrats UI/Storage/Admin | 5/5 réussi |
| Captures responsive | 6/6 réussi |
| Backend opérations employé existant | 12/12 réussi |
| Suites statiques de non-régression ciblées | 8/10 réussies |
| Certification réelle des six rôles MIR TEST | Bloquée par secrets incomplets |
| Migration MIR TEST | Réussie le 11 novembre 2026 après autorisation |
| Production | Lecture seule; aucune modification |

Vérification hébergée après migration : RPC et table présents, bucket privé, deux policies Storage, `anon` sans droit d’exécution et `authenticated` autorisé. Le conseiller Health ne retourne aucun avertissement. Les avis Security/Performance restants sont des constats globaux déjà présents (tables privées sans policies de lecture directe, fonctions historiques et index encore inutilisés); aucun droit direct n’a été ajouté sur `mir_core.job_documents`.

Les deux échecs de non-régression sont hors fichiers modifiés :

- `mir-punch-postgres.cjs` : une période attendue `locked` reste `review`;
- `mir-commerce-templates-browser.cjs` : la carte `prime-siding-2-30644` n’apparaît pas avant le délai de 30 s.

Ils existaient dans les modules protégés et la Phase 1 ne les corrige pas.

## Captures

- `captures/job-dossier-phase1/phone-360.png`
- `captures/job-dossier-phase1/phone-390.png`
- `captures/job-dossier-phase1/phone-430.png`
- `captures/job-dossier-phase1/tablet-portrait.png`
- `captures/job-dossier-phase1/tablet-landscape.png`
- `captures/job-dossier-phase1/desktop.png`

## Limites et blocages

- L’environnement fournit seulement les identifiants MIR TEST Admin, Employé et Client. Les comptes Boss, Chef, Adjointe et Entrepôt ainsi que la clé publishable de certification ne sont pas disponibles; aucune création de compte hébergé n’a été tentée.
- La CLI Supabase officielle ne peut pas créer son dossier interne `/home/agent/.supabase`, monté en lecture seule. Le nom de migration respecte donc manuellement le format chronologique du dépôt.
- La migration est appliquée sur MIR TEST seulement. Les captures utilisent un jeu de données représentatif; la recette visuelle intercomptes reste à reprendre lorsque les quatre comptes manquants seront disponibles.
- Aucune mutation, migration ou publication n’a été faite sur MIR production.
- Le test API direct Admin/Employé ne peut pas établir la connexion depuis l’exécuteur (`fetch failed`), même via l’exécution autorisée. La présence et les privilèges des objets hébergés ont été vérifiés par le connecteur Supabase.
- L’absence d’accès GitHub en écriture n’empêche pas la livraison locale. Aucun nouveau push ne sera tenté.

## Récupération des commits

Depuis un clone autorisé du même dépôt :

```bash
git format-patch ab2952610560350d40a90d05039c1be96ccab51f..e3cf536 --stdout > phase-1-dossier-chantier.patch
git apply --check phase-1-dossier-chantier.patch
git am phase-1-dossier-chantier.patch
```

Si le dossier de travail local est accessible directement, les deux commits peuvent aussi être récupérés avec :

```bash
git cherry-pick 1c4d023 80f2ba1 e3cf536
```
