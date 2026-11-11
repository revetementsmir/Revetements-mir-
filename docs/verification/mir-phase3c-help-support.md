# MIR Phase 3C — Centre d’aide et soutien client

## Verdict

**PARTIELLEMENT VALIDÉ sur MIR TEST.** Le backend et le parcours navigateur privé ciblé sont prouvés, mais l’isolation bidirectionnelle entre deux organisations du nouveau module de soutien et l’envoi navigateur complet d’une pièce jointe PDF n’ont pas été rejoués avec deux clients réels. Les preuves 3A/3B restent réutilisées; leur certification complète n’a pas été recommencée.

## Base et dépendances

- branche : `codex/phase-3c-centre-aide-soutien`, créée depuis la tête 3B `62bb65d8d01f521ee9feec63db9a2820070fb735`;
- dépendance 3A : `f5c2aa04450d708a8f86da51bc3c778d0ebf75e7`;
- `main` observé au départ : `bd06da8ddc323853a6fd0bb283f533e3e6b871a6`;
- production non modifiée, frontend non publié.

## Installation réelle sur MIR TEST

Projet exclusif : `hxtztkmbfpmzrieccwsg`.

1. `phase3c_help_support_hardening` : audiences et types FAQ, idempotence des demandes/messages, snapshots client/gestion, notes internes filtrées et routage Adjointe.
2. `phase3c_support_create_fix` : correction additive du cas où `SELECT INTO` vidait l’identifiant d’une nouvelle conversation.
3. `phase3c_support_account_category` : alignement explicite de la contrainte de catégorie avec « Mon compte ».

Aucune fonction Edge n’a été redéployée. Le bucket privé existant `mir-support` et ses politiques RLS ont été réutilisés.

## Preuves réelles

Recette API hébergée avec trois sessions Auth réelles : **7/7**.

- FAQ réservée au client filtrée côté serveur et absente en anonyme;
- création structurée et répétition idempotente;
- rôle non client refusé en HTTP 403;
- pièce privée lisible par son propriétaire et refusée à l’autre session;
- note interne absente du snapshot client;
- réponse de l’Adjointe visible;
- production déclarée et vérifiée comme non ciblée par le runner.

Recette Chromium privée, branche locale servie sous l’origine approuvée et connectée à MIR TEST : **9/9**.

- vraie session Auth client;
- ouverture en surimpression sans perdre la page courante;
- recherche et état vide;
- hors ligne explicite, envoi désactivé et brouillon texte conservé;
- limite de la pièce jointe hors ligne explicitée;
- aucun débordement à 390×844, 768×1024 et 1440×900;
- aucune erreur JavaScript.

Captures : `captures/help-phase3c/`. Le premier lancement du runner utilisait par erreur `recette=phase3c` au lieu de la valeur stricte `recette=1`; l’Auth production a répondu `invalid_credentials`. Aucune session n’a été ouverte et aucune donnée production n’a été lue ou modifiée. Le lanceur corrigé cible explicitement MIR TEST.

## Preuves locales

- Phase 3C statique/sécurité : **5/5**;
- contrats 3A ciblés : **8/8**;
- non-régression Aujourd’hui/Punch : **7/7**;
- syntaxe JavaScript : réussie.

## Matrice de permissions ciblée

| Capacité | Client propriétaire | Autre rôle/session | Adjointe/Boss/Admin | Preuve |
|---|---:|---:|---:|---|
| FAQ selon audience | autorisée | filtrée côté serveur | gestion autorisée | réelle |
| Créer/suivre sa demande | autorisée | refus 403 si non-client | lecture/routage autorisés | réelle |
| Pièce privée | autorisée | refusée | selon politique existante | réelle propriétaire/refus |
| Note interne | invisible | invisible | autorisée | réelle |
| Réponse client | visible | isolée par requête métier | autorisée | réelle |
| Isolation organisation B→A et A→B propre au soutien | attendue | attendue | attendue | **non testée directement en 3C**; socle 3A réutilisé |

## Limites restantes

- pas de deuxième client réel d’une autre organisation utilisé pour une preuve bidirectionnelle du module `support_*`;
- le navigateur réel a validé l’interface, la session, la recherche, les états, le brouillon et les formats; l’envoi complet photo/PDF depuis ce formulaire reste à exécuter en navigateur;
- aucune validation sur appareil physique ou moteur Safari;
- la branche dépend de 3B non fusionnée et ne doit pas être fusionnée isolément.
