# Phase 5 — Absences

Validation locale du 12 novembre 2026 sur `codex/phase-5-absences`.

- PostgreSQL isolé : 8 scénarios réussis (migration rejouée deux fois, rôles, deux organisations, idempotence, conflits de dates, Storage privé, URL signée 120 s, historique immuable).
- Navigateur simulé authentifié : Employé, brouillon et portion de journée; 390×844, 768×1024, 1366×768 et 1440×900, sans débordement ni erreur JavaScript.
- Non-régression : Dépenses PostgreSQL 11/11; portail Employé sur huit formats; promotion 54/54; `git diff --check`.

Les quatre PNG de ce dossier sont les captures réelles de la recette navigateur locale. La migration n'a pas été appliquée à MIR TEST : aucun accès PostgreSQL ou jeton de gestion TEST n'était disponible dans l'environnement. Aucune requête Supabase production n'a été effectuée.
