# Phase 7 — Notifications

Branche de preuve: `codex/phase-7-notifications`. Le SHA exact est celui de la tête de PR citée dans Atelier et dans le rapport de promotion. Cible distante autorisée pour la recette: MIR TEST `hxtztkmbfpmzrieccwsg` seulement.

## Architecture

- `mir_core.notification_events` conserve l’événement métier minimal et immuable. Il référence l’objet canonique; il ne copie pas son contenu complet.
- `mir_core.notifications` reste la table canonique existante des destinataires et porte désormais l’état individuel (lu, action requise, traité).
- `mir_core.notification_preferences` conserve uniquement les catégories non essentielles par utilisateur et organisation.
- `mir_core.notification_emit` calcule les destinataires depuis les memberships, rôles opérationnels et affectations serveur. Le navigateur ne fournit jamais de destinataire ou de rôle.
- Les insertions historiques sont normalisées dans la transaction par un adaptateur de compatibilité. Les événements `order_events` de Phase 6 sont raccordés explicitement dans leur transaction.
- Trois RPC publiques minimales: liste/compteurs paginés, état lu/non lu, préférences. Les tables restent privées et RLS est fail-closed.
- Aucun transport courriel, push, SMTP, webhook fournisseur ou permission navigateur n’est installé.

## Événements et destinations

| Module | Événements raccordés | Destinataires calculés | Destination |
|---|---|---|---|
| Commandes/Pliages | soumission, rattachement chantier, événements historiques Phase 6 | Adjointe, Boss, Admin ou propriétaire selon l’action | Commandes / demandes |
| Absences | soumission, décision, absence du jour | propriétaire, Chef ou gestion selon le RPC métier existant | Absences |
| Dépenses | soumission et décisions existantes | propriétaire ou gestion autorisée | Dépenses |
| Punch | correction et décision existantes | propriétaire ou gestion autorisée | Punch / heures |
| Chantiers | matériel, problème, rapport, extra | équipe/gestion déjà choisie par le serveur | écran chantier autorisé |
| Clavardage | nouveau message | participants calculés par la conversation | conversation |
| Soutien | demande ou réponse | client/Adjointe autorisés | Centre d’aide |

Une ancienne notification dont la cible est archivée ou devenue interdite reste dans l’historique. L’interface affiche alors « Cet élément n’est plus accessible » sans élargir les droits.

## Matrice des rôles

| Rôle | Portée |
|---|---|
| Employé | ses notifications et destinations déjà autorisées |
| Chef | ses événements, équipe et chantiers permis par les affectations existantes |
| Adjointe | files opérationnelles autorisées, sans permission Admin implicite |
| Entrepôt | matériel, préparation et réception; aucun événement RH/dépense global |
| Boss | événements opérationnels autorisés de l’organisation |
| Admin | portée de son organisation seulement |

## Vérifications locales

- Contrats Phase 7: 13/13.
- PostgreSQL jetable: 30/30 avec migration Phase 7 exécutée deux fois, idempotence, compteur, lu/non lu, préférences et isolation entre deux employés.
- Navigateur Chromium: 9/9 formats (360×780, 390×844, 430×932, 768×1024, 834×1112, iPad paysage 1112×834, 1366×768, 1440×900 et 1920×1080), sans débordement ni erreur JavaScript.
- Captures: `centre-390x844.png`, `centre-768x1024.png`, `centre-1440x900.png`.
- Non-régressions ciblées: Phase 6 7/7, UX Commandes/Pliages, client→serveur, Aujourd’hui 7/7, Signature 9/9, Pages 41/41, navigation, session Auth et modules optionnels.
- `git diff --check`: réussi avant commit.

## Limites avant certification distante

- La migration n’est pas appliquée à MIR TEST tant que la CI de la PR n’est pas entièrement verte, conformément au mandat.
- La recette six rôles réelle et Realtime ne sont donc pas encore revendiqués. Le centre se replie honnêtement sur actualisation/rechargement; aucun faux temps réel.
- Aucun courriel ou push envoyé. Aucune requête ou écriture Supabase production.
