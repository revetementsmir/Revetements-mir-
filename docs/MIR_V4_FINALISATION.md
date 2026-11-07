# MIR V4 — reprise, règles de catalogue et recette réelle

État du 6 novembre 2026 (heure du client). Branche `codex/mir-v4-finalisation`, issue de `main` à `1b7a7af`.

## Reprise vérifiée

Le checkout initial était à `8341486` (PR 27). `main` a été récupérée avant toute modification : parcours guidé unique, choix visuels des plis et de la face colorée, corrections iPad et fractions incluses. L'éditeur, ses cotes et sa géométrie n'ont pas été modifiés. Seule sa référence au script de connexion a été actualisée.

La PR 29 (`codex/mission-4-real-supabase`) était encore ouverte. Ses deux commits ont été repris avec `cherry-pick` : préparation de la recette réelle, audit SQL en lecture seule et proposition de conservation des options. Ni sa branche ni les autres travaux n'ont été réécrits. Cette branche rassemble la suite de ce travail avec les corrections récentes de main.

Déjà présents : Auth Supabase, sauvegarde directe en brouillon partagé, import avec dédoublonnage, catalogue maître et trois destinations indépendantes, prix serveur, demandes clients/employés, affectations chantier, instantanés de demandes. Les bons fournisseurs, leurs PDF et les fournisseurs administrables étaient opérationnels localement. La file d'envoi existait et avait des tests, mais son service réel n'était pas raccordé.

## Modifications réalisées

- Déconnexion renforcée : les données, organisations et affectations affichées sont effacées immédiatement, même si l'appel de déconnexion échoue. La variable `readSequence` existait déjà; aucune correction de variable inexistante n'est revendiquée.
- Invalidation des réponses en cours lors d'une déconnexion ou d'un changement d'identité, y compris depuis un autre onglet. Les brouillons non confirmés restent associés à leur utilisateur et organisation.
- Migration additive `20261107005913_catalogue_permissions_and_versions.sql`, créée avec Supabase CLI 2.81.3 : matériaux et couleurs autorisés, couleur fixe, rôles autorisés à modifier couleur/mesures. Contrôles dans les RPC serveur, sans nouvelle RPC publique ni nouveau catalogue.
- Révisions géométriques : toutes les métadonnées de la spécification antérieure sont conservées, y compris `allowed`. Les trois destinations sont retirées jusqu'à revalidation. Les anciennes versions et demandes ne sont pas réécrites.
- Écran d'administration existant complété avec ces réglages. Le serveur annonce `capabilities.publicationRules`; les contrôles ne sont affichés que si la nouvelle migration est présente. Les clients/employés voient les choix et verrouillages correspondants. Un appel falsifié est également refusé au serveur.
- Préparation d’un bon fournisseur depuis le modèle partagé publié : relecture de la publication, instantané indépendant, provenance modèle/version/révision et ouverture du dossier de production existant. Le bon reste explicitement local; aucun dessin ni bibliothèque supplémentaire n’est créé.
- Recette réelle du bac à sable, sélection explicite des secrets de ce bac à sable, contrôle de production sans écriture métier et diagnostic réseau. La configuration de production publiée n'est pas remplacée par celle du bac à sable.
- CI étendue aux scénarios de sessions et de catalogue dans Chromium avec PostgreSQL/PGlite local.

## Résultats vérifiés

| Exécution | Résultat et portée |
| --- | --- |
| PostgreSQL/PGlite `mir-database.cjs` | 18 tests : RLS, isolation, refus d'élévation, prix serveur, imports, révisions, matériaux/couleurs/rôles, instantanés et J à soffite 144 po. Base locale jetable. |
| `mir-shared-client.cjs` | 5 tests : changement d'identité, réponse après déconnexion, brouillon conservé, reprise et refus avant réseau si stockage indisponible. Transport de test. |
| `mir-live-validation.cjs` | 4 tests : configuration fermée, secrets séparés entre projets, audit détectant une 004 absente. Local. |
| `mir-shared-workspace-browser.cjs` | Réussi : Admin PC, client mobile, employé tablette, sauvegarde du dessin sans fichier, dédoublonnage, publication, prix historique, règles de catalogue, verrouillages et déconnexion. Auth simulée uniquement dans ce test; PostgreSQL local réel. |
| `mir-shared-startup-browser.cjs` | Réussi avec SDK embarqué réel; absence du SDK correctement signalée. |
| `mir-purchase-orders-browser.cjs` | Réussi en 1440/1024/390 px : pièces, sauvegarde, PDF réel, SHA-256, original conservé, révisions, recherche et envoi désactivé. |
| `mir-po-workflow.cjs` / `mir-supplier-send.cjs` | 5 / 10 tests réussis. File PostgreSQL locale; prestataire courriel simulé exclusivement dans les tests. |
| `mir-pages-regressions.cjs` / `mir-atelier-v4.cjs` / `mir-bending-lengths.cjs` | 41 / 13 / 19 scénarios réussis. |
| `mir-local-backup.cjs` / `mir-direct-model-save.cjs` / `mir-procurement.cjs` / `mir-shopify-projection.cjs` | Réussis : conservation, doublons, permissions, fournisseurs et absence de faux stock. |
| `mir-admin-guided-browser.cjs` | Réussi : PC, tablette paysage/portrait, mobile; fractions exactes, double pli, face colorée, modèle, magasin et bons. Aucune nouvelle validation physique demandée au propriétaire. |
| `mir-public-menu-browser.cjs` / `mir-unified-dossier-browser.cjs` | Réussis : 42 parcours de navigation et dossier commun en 1440/390 px, JSON/PDF réels et anciennes données. |
| Production `gccltmaulvrnthrbnrpd` | Trois vrais comptes Auth confirmés : Admin, employé, client. Snapshots accessibles selon rôle, informations membres masquées hors Admin, anonymes et publication non-Admin refusés. Aucune écriture métier. Sessions de ce contrôle fermées. |
| Bac à sable `hxtztkmbfpmzrieccwsg` | 11 contrôles réels réussis : Auth, permissions, création sans doublon, publication, sessions indépendantes, demandes, récupération Admin, prix historiques, reprise après perte d'une réponse réellement validée en base, règles de couleurs/matériaux/rôles, révisions après migration et ouverture d’un bon depuis le modèle partagé sur une autre session Admin sans créer de deuxième bibliothèque. |

Le runner réel retourne volontairement **2**, pas 0 : il ne consomme pas automatiquement l’audit SQL transmis séparément par le propriétaire, et la migration intégrale des données des appareils n’est pas certifiée. Il vérifie que les instantanés serveur visibles au début sont inchangés. Il ne peut pas lire les sauvegardes Safari du propriétaire; sa validation iPad antérieure n'est pas remise en cause.

Le modèle de la dernière recette réelle est archivé : `95398af9-8e23-424c-b4dc-de188b620471`. Preuve : `docs/verification/mir-sandbox-live-after-rules.json` (11 contrôles PASS; deux étapes manuelles distinctes restent BLOCKED dans le runner). Les demandes et chantiers techniques sont conservés comme traces dans l'organisation **MIR TEST**. Aucun modèle de production ni historique existant n'a été supprimé.

Le SDK et les endpoints Auth/PostgREST/RPC sont réels. Chromium refuse le certificat du proxy de cette machine (`ERR_CERT_AUTHORITY_INVALID`). Le mode explicite `MIR_TEST_HTTPS_RELAY=yes` transmet les vraies requêtes/réponses via Python, avec validation TLS et proxy conservés; aucun succès Auth/RPC n'est fabriqué. Le transport TLS direct de Chromium n'est donc pas certifié. Les erreurs initiales du runner (validation HTML d'une valeur secrète substituée par proxy, attente de rendu manquante) ont été corrigées avant la recette réussie.

Rapports générés, ignorés par Git : `artifacts/mission-4-real.json`, `artifacts/mir-auth-read-only.json`. Ils ne contiennent ni mots de passe ni jetons. Aucune trace navigateur des formulaires d'identifiants n'est enregistrée.

## Reproduire

```sh
npm ci --prefix tools/database --ignore-scripts --no-audit --no-fund
node tests/mir-database.cjs
node tests/mir-shared-client.cjs
node tests/mir-live-validation.cjs
node tests/mir-shared-workspace-browser.cjs
node tests/mir-purchase-orders-browser.cjs
node tools/run-chromium-test.cjs tests/mir-admin-guided-browser.cjs
node tools/validation/real-supabase.cjs --read-only
```

Pour la recette avec écritures techniques, utiliser uniquement une organisation nommée **MIR TEST** et les comptes déjà provisionnés. Le runner refuse une organisation de production. Avec les variables `MIR_SANDBOX_*` et sa clé publique déjà configurées :

```sh
MIR_TEST_TARGET=sandbox MIR_TEST_ALLOW_FIXTURES=yes MIR_TEST_HTTPS_RELAY=yes node tools/validation/real-supabase.cjs
```

La clé publique du bac à sable doit être dans `MIR_SANDBOX_PUBLISHABLE_KEY`. Les identifiants de production ne sont jamais repris comme solution de repli pour cette cible. Les mots de passe doivent rester dans les secrets d'environnement.

## Migrations, publication et blocages précis

**Migration appliquée par le propriétaire dans les deux projets, après contrôle des deux audits. Le bac à sable a passé les 11 contrôles réels. Les trois comptes de production ont passé les vérifications sans écriture métier et annoncent publicationRules=true. Aucun nouveau site ou dépôt. La publication de cette tranche utilise le workflow GitHub Pages existant après fusion.**

Le propriétaire a transmis l’audit SQL du bac à sable à 01:10 UTC le 7 novembre (6 novembre, heure du client). Les 19 tables sont présentes sous RLS; les sept RPC ont un search_path fixe, refusent anon et autorisent authenticated. Les sept empreintes de définition correspondent exactement à la migration 004 locale. La colonne configuration_rules est absente. Preuve : docs/verification/mir-sandbox-audit-before-rules.json. La nouvelle migration refuse les fonctions modifiées depuis cet audit; elle conserve la fonction privée de publication existante sans la remplacer. Le propriétaire l’a ensuite appliquée au bac à sable : la capacité publicationRules et les tests réels de ses permissions/révisions sont confirmés.

1. Les quatre connexions Supabase MCP accessibles ne listent pas le projet MIR historique ni son bac à sable. Les comptes Auth fonctionnent, mais ne donnent aucun accès DDL ou aux catalogues PostgreSQL. Les audits fournis lèvent ce point pour les deux projets. Celui de production, transmis à 01:23 UTC, confirme également les 19 tables RLS et les sept empreintes identiques à la 004; voir docs/verification/mir-production-audit-before-rules.json. Le compte propriétaire reste nécessaire pour administrer le schéma directement depuis les outils. Les RPC réussies ne prouvent pas à elles seules l'ensemble des politiques RLS hébergées.
2. Vérifier l'état hébergé 001–004 avant application de la seule nouvelle migration. Ne jamais rejouer 001–004 sur une base existante. La proposition 005 issue de la PR 29 est déjà incluse et étendue dans la nouvelle migration; ne pas appliquer les deux comme deux changements nécessaires. Tester d'abord cette nouvelle migration dans le bac à sable, puis la recette de ses nouvelles règles sur de vrais comptes.
3. Le partage des bons fournisseurs, leur import historique complet et les octets PDF dans Storage privé restent à raccorder. Actuellement, la demande client/employé partagée peut être copiée dans le parcours de bon, qui reste local. Une modification de modèle n'altère pas son instantané.
4. Le service courriel, l'expéditeur vérifié et l'hébergement du travailleur d'envoi sont absents. Le bouton d'envoi reste désactivé et aucun statut envoyé n'est inventé. Zoho Books n'est pas connecté.
5. La validation du schéma et de la migration en production est terminée. Fusionner uniquement après réussite des trois workflows GitHub Actions sur le dernier commit; la publication utilise le workflow Pages, qui compare également les deux scripts de partage servis aux fichiers testés. Le site existant reste `https://revetementsmirweb.github.io/MIR/production.html`; le résultat réel du déploiement est à vérifier dans le workflow Pages après fusion.

MOON : méthode serveur 1.3.5 chargée et contrôlée après invocation explicite. Coordination dans le chat; aucune mission créée, aucun autre expert prétendu exécuté ni accès supplémentaire supposé.
