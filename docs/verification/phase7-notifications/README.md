# Phase 7 — Notifications

Branche de preuve: `codex/phase-7-notifications`. Cible distante autorisée pour la recette: MIR TEST `hxtztkmbfpmzrieccwsg` seulement.

## Architecture

- `mir_core.notification_events` conserve l’événement métier minimal et immuable. Il référence l’objet canonique; il ne copie pas son contenu complet.
- `mir_core.notifications` reste la table canonique existante des destinataires et porte désormais l’état individuel (lu, action requise, traité).
- `mir_core.notification_preferences` conserve uniquement les catégories non essentielles par utilisateur et organisation.
- `mir_core.notification_emit` calcule les destinataires depuis les memberships, rôles opérationnels et affectations serveur. Le navigateur ne fournit jamais de destinataire ou de rôle.
- Les événements du worker fournisseur acceptent uniquement l’auteur canonique membre actif déjà inscrit dans `order_events`; une session utilisateur présente doit toujours correspondre à cet auteur. Le worker n’obtient aucun droit client supplémentaire.
- Les insertions historiques sont normalisées dans la transaction par un adaptateur de compatibilité. Les événements `order_events` de Phase 6 sont raccordés explicitement dans leur transaction.
- Trois RPC publiques minimales: liste/compteurs paginés, état lu/non lu, préférences. Les tables restent privées et RLS est fail-closed.
- Aucun transport courriel, push, SMTP, webhook fournisseur ou permission navigateur n’est installé.

## Événements et destinations

| Module | Événements raccordés | Destinataires calculés | Destination |
|---|---|---|---|
| Commandes | soumission et rattachement chantier Phase 6 | Adjointe, Boss/Admin ou propriétaire selon l’action | Commandes / demandes |
| Pliages | raccord indirect seulement lorsqu’un pliage est une ligne d’une commande | mêmes destinataires que la commande | Commandes / demandes |
| Absences | soumission, décision, absence du jour | propriétaire, Chef ou gestion selon le RPC métier existant | Absences |
| Dépenses | soumission; précision demandée; approbation; refus | Adjointe et Boss/Admin à la soumission; propriétaire à la décision | Dépenses |
| Punch | correction et décision existantes | propriétaire ou gestion autorisée | Punch / heures |
| Chantiers | matériel, problème, rapport, extra | équipe/gestion déjà choisie par le serveur | écran chantier autorisé |
| Clavardage | nouveau message | participants calculés par la conversation | conversation |
| Soutien | demande ou réponse | client/Adjointe autorisés | Centre d’aide |
| Entrepôt | mouvement canonique de réception, livraison ou ajustement, si le module Entrepôt est installé | Entrepôt et Boss/Admin de l’organisation | Inventaire Entrepôt |

Les pliages sont notifiés dans le cycle de la commande; aucun événement Pliage autonome n’est livré en Phase 7. Mise en production, prêt et révision Pliage ne sont pas annoncés comme raccordés. Le module Dépenses ne possède aucun état canonique « remboursement traité »; aucun événement de ce nom n’est inventé.

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

- Contrats Phase 7: 15/15.
- PostgreSQL jetable: 30/30 historiques conservés, plus 10/10 Dépenses correctives; migrations Phase 7 et corrective rejouées deux fois, idempotence, refus, état traité, métadonnées minimales et isolation.
- Navigateur Chromium: 4/4 formats (390×844, 834×1112, 1366×768 et 1440×900) sur le parcours complet Dépenses → décision → Traitée → rechargement, filtre Actions, compteur, autre utilisateur et cible inaccessible, sans débordement ni erreur JavaScript.
- Captures correctives: `centre-390x844.png`, `centre-834x1112.png`, `centre-1440x900.png`; contrôle sans capture également réussi en 1366×768.
- Non-régressions ciblées: Phase 6 7/7, UX Commandes/Pliages, client→serveur, Aujourd’hui 7/7, Signature 9/9, Pages 41/41, navigation, session Auth et modules optionnels.
- `git diff --check`: réussi avant commit.

## Certification MIR TEST

- Projet vérifié explicitement: `hxtztkmbfpmzrieccwsg`; le ref production interdit n’a jamais été ciblé.
- Migration appliquée après CI verte, puis rejouée intégralement avec succès.
- Structure relue: trois RPC, RLS active, neuf index Phase 7/notifications, zéro droit RPC `anon`.
- Recette réelle: 11 contrôles, six rôles authentifiés, isolation des six rôles sur une organisation étrangère, destinataires de gestion calculés au serveur, lecture/non-lecture, préférences, idempotence et refus `anon` réussis.
- Une commande balisée `RECETTE-PHASE7` a été créée uniquement dans MIR TEST afin de provoquer un événement canonique. Le rejeu a retourné la même commande et aucun fournisseur n’a été contacté.
- Audit Supabase final: aucune alerte sécurité liée aux tables Phase 7; le seul avis propre au lot est l’index `notification_events_actor` encore inutilisé immédiatement après sa création.
- Le centre utilise rechargement/actualisation comme repli; aucun faux temps réel n’est revendiqué.
- Aucun courriel ou push envoyé. Zéro requête et zéro écriture Supabase production.

## Ordre correctif

1. `20261126120000_phase7_notifications.sql` — socle Phase 7 déjà appliqué.
2. `20261126130000_phase7_expense_notifications.sql` — raccord transactionnel additif des événements Dépenses et des mouvements canoniques Entrepôt; migration rejouable, sans réécriture de l’historique Phase 4 ou Phase 7.
