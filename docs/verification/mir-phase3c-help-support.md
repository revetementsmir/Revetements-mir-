# MIR Phase 3C — Centre d’aide et soutien client

## Verdict

**PARTIELLEMENT VALIDÉ sur MIR TEST.** Le backend et le parcours navigateur privé complet photo/PDF sont prouvés. L’isolation bidirectionnelle avec deux clients distincts reste bloquée : MIR TEST contient un seul identifiant client actif, membre à la fois des organisations A et B; aucun second accès client conforme n’est disponible. Aucun compte ni membership n’a été modifié. Les preuves 3A/3B restent réutilisées.

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
4. `phase3c_client_organization_scope` : refus sécurisé des RPC implicites lorsqu’un client appartient à plusieurs organisations.
5. `phase3c_explicit_client_scope` : nouveaux RPC exigeant l’organisation explicite et la revalidant contre le membership actif; le frontend 3C utilise exclusivement ces RPC.

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

Recette Chromium privée, branche locale servie sous l’origine approuvée et connectée à MIR TEST : **16/16**.

- vraie session Auth client;
- ouverture en surimpression sans perdre la page courante;
- recherche et état vide;
- hors ligne explicite, envoi désactivé et brouillon texte conservé;
- limite de la pièce jointe hors ligne explicitée;
- vraie demande créée depuis le formulaire par double clic, avec une seule conversation enregistrée;
- photo puis PDF téléversés et ouverts par les politiques privées;
- réponse réelle de l’Adjointe visible dans le formulaire client;
- aucun débordement à 390×844, 768×1024 et 1440×900;
- aucune erreur JavaScript.

Captures : `captures/help-phase3c/`. Le lanceur exécute maintenant un prévol minimal avant toute Auth, exige exactement le projet, l’URL et la clé publique MIR TEST, puis bloque tout autre hôte Supabase. Le test négatif **2/2** refuse en mémoire les configurations absente, production, mauvais projet, mauvaise URL et mauvaise clé avec zéro appel Auth et zéro appel réseau. Le premier lancement historique avec `recette=phase3c` avait reçu `invalid_credentials` de l’Auth production; aucune session ni mutation n’avait eu lieu.

La tentative de restaurer le singleton après découverte de l’ambiguïté a été refusée automatiquement par la plateforme comme risque d’affaiblissement de l’isolation. Ce refus n’a pas été contourné. Les nouveaux RPC explicites constituent l’alternative plus sûre.

## Preuves locales

- Phase 3C statique/sécurité : **5/5**;
- garde-fou TEST sans réseau : **2/2**;
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
| Isolation organisation B→A et A→B propre au soutien | contrat explicite par organisation | contrat explicite par organisation | contrat explicite par organisation | **non certifiée avec deux clients distincts**; un seul identifiant client appartient aux deux tenants |

## Limites restantes

- aucun deuxième client réel distinct : le client de recette connu est actif simultanément dans A et B; cette situation ne prouve pas l’isolation interclient;
- aucune validation sur appareil physique ou moteur Safari;
- la branche dépend de 3B non fusionnée et ne doit pas être fusionnée isolément.
