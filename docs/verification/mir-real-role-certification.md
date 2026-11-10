# Certification réelle des rôles MIR

Le workflow GitHub Actions **MIR real role certification** sépare deux niveaux de preuve.

## 1. UI simulée et SQL jetable

Le job `UI simulated and disposable SQL` exécute les contrats SQL dans PGlite et les parcours
navigateur avec des données simulées. Ces résultats protègent les interactions et les règles
locales, mais ne constituent jamais une preuve Auth/RLS de l'environnement hébergé.

## 2. Six comptes réels MIR TEST

Le job `certify-six-real-roles` utilise six sessions Supabase distinctes :

- Admin;
- Boss;
- Chef d'équipe;
- Employé;
- Adjointe;
- Entrepôt.

Pour chaque compte, la recette vérifie en lecture seule :

1. l'authentification et le rafraîchissement de session;
2. l'appartenance à l'organisation MIR TEST;
3. le rôle de compte et le rôle opérationnel attendus;
4. la lecture du punch;
5. les RPC autorisées pour le rôle;
6. le refus des RPC sensibles interdites;
7. le refus d'une organisation étrangère aléatoire.

Le rapport `artifacts/real-role-certification.json` ne contient ni courriel, ni mot de passe,
ni jeton. Il indique uniquement les rôles et le nombre de contrôles réussis.

## Secrets GitHub existants utilisés

Configurer ces secrets uniquement dans le dépôt MIR ou dans un environnement GitHub protégé :

- `MIR_SANDBOX_PUBLISHABLE_KEY`;
- `MIR_SANDBOX_ORG_ID`;
- `MIR_SANDBOX_ADMIN_EMAIL`, `MIR_SANDBOX_ADMIN_PASSWORD`;
- `MIR_SANDBOX_BOSS_EMAIL`;
- `MIR_SANDBOX_CHEF_EQUIPE_EMAIL`;
- `MIR_SANDBOX_EMPLOYEE_EMAIL`, `MIR_SANDBOX_EMPLOYEE_PASSWORD`;
- `MIR_SANDBOX_ADJOINTE_EMAIL`;
- `MIR_SANDBOX_ENTREPOT_EMAIL`, `MIR_SANDBOX_ENTREPOT_PASSWORD`.

Le contrat déjà certifié réutilise `MIR_SANDBOX_ADMIN_PASSWORD` pour Boss, Chef d'équipe et
Adjointe. Le workflow n'exige donc pas trois nouveaux secrets de mot de passe.
Le mot de passe partagé doit être renouvelé : une ancienne version du script de certification
comparait une valeur QA directement dans le code. La nouvelle version ne contient, ne compare et
n'écrit aucune valeur de secret.

Le script conserve aussi la compatibilité avec les variables canoniques `MIR_TEST_*`, notamment
`MIR_TEST_CHEF_EMAIL` ou `MIR_TEST_CHEF_EQUIPE_EMAIL`, lorsqu'elles sont injectées directement.
Le projet MIR TEST est déterminé de façon fixe lorsque la configuration `MIR_SANDBOX_*` est utilisée;
aucun nouveau secret d'URL n'est nécessaire.

Référence vérifiée : commit `ab80816162d8c36a8b678d674b79e65292884c30`, workflow
**MIR real role certification**, exécution no 3 (`42754629373`), conclusion `success`.

La clé publishable est la seule clé Supabase autorisée. Ne jamais fournir de clé `service_role`.
Le script refuse explicitement le projet de production et n'accepte que le projet MIR TEST
`hxtztkmbfpmzrieccwsg`.
Les six adresses doivent être distinctes. En l'absence d'un secret, le job échoue explicitement;
il ne saute jamais silencieusement la certification.

## Limites explicites

- `physicalDevice` reste `false` : la certification API ne prouve pas un essai sur appareil physique.
- Les captures du job UI sont des preuves simulées, identifiées comme telles.
- La protection de branche et les contrôles obligatoires se configurent dans GitHub après validation
  du workflow; le fichier du dépôt ne peut pas imposer seul cette règle.
- Aucun test de certification ne doit viser la production ni effectuer une mutation métier.
