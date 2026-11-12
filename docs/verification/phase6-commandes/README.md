# Phase 6 — Commandes

Preuves locales du lot codex/phase-6-commandes.

- source de vérité réutilisée : mir_core.orders, révisions, lignes, événements, Coordination et Entrepôt;
- aucun courriel ni connecteur fournisseur déclenché;
- seule migration officielle ajoutée : `20261124120000_phase6_commandes.sql`, additive et rejouée deux fois dans PostgreSQL jetable;
- pièces jointes privées JPEG/PNG/PDF (10 Mo), validation du propriétaire et lien signé de 120 secondes;
- rôles, isolation, idempotence, répartition, bons fournisseurs, réception partielle, rupture, substitution et historique testés (19 scénarios PostgreSQL);
- navigateur simulé : 390×844, 768×1024, 1366×768 et 1440×900;
- captures commandes-*.png.

## MIR TEST

- cible vérifiée avant écriture : `hxtztkmbfpmzrieccwsg` (`MIR TEST`, PostgreSQL 17.11);
- migration Phase 6 appliquée uniquement à MIR TEST;
- tables, RPC, bucket privé et limites vérifiés; zéro index invalide;
- authentification directe locale bloquée par le réseau avant Auth (`fetch failed`);
- workflow `MIR Phase 6 Commandes — rôles réels TEST` ajouté pour certifier les six comptes synchronisés dans GitHub sans afficher les secrets;
- aucune requête ni écriture Supabase production.

Les captures sont des recettes navigateur simulées. La certification six rôles hébergée doit être distinguée de ces preuves locales jusqu'au résultat du workflow de PR.
