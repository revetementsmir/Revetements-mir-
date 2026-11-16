# Installations MIR TEST uniquement

Ces migrations ne sont pas dans `supabase/migrations` : ne pas les pousser automatiquement sur un autre environnement. Cible autorisée unique : `hxtztkmbfpmzrieccwsg`. Le préalable `mir.target_project` doit être fixé explicitement dans une session dont la cible a été vérifiée.

Les deux fichiers ont été créés par `supabase migration new` (CLI2.81.3), puis appliqués sur MIR TEST via la connexion **MIR**, sous les noms `mir_team_employee_auth_test` et `mir_team_invitation_accept_scope_test`. Le second corrige la portée de l’acceptation sans effacer l’historique de la première installation. La proposition SQL consolidée sert aux tests PGlite d’installation neuve.

Le backend `mir-team-invitations` est limité à ce projet dans son code. Son fichier d’entrée active l’enrôlement TEST autorisé, laisse le transport réel désactivé et utilise uniquement les clés serveur natives de Supabase. Aucune clé privilégiée n’est copiée dans les clients. L’aide TEST reprend l’adresse du référent authentifié, sans envoyer de courriel.

Voir `docs/verification/employee-auth-invitations/BILAN-20261114.md` pour les preuves, capacités et limites. Une mise à jour Pages ou production n’est pas autorisée par cette installation TEST.

## Recette Android réutilisable par exécution (PR42)

Le script \`mobile/tools/native-qa-fixture.cjs\` utilise la RPC \`public.mir_qa_native_run\` installée **uniquement** sur MIR TEST via \`20261115235000_mir_native_qa_run_lease_test.sql\` : identifiants aléatoires, bail unique, vérification des vrais comptes QA, nettoyage de la seule fixture puis audit dédié. Le module n'est pas inclus dans \`supabase/migrations\`, la production, GitHub Pages ni l'APK. Tout déploiement de cette RPC sur production est interdit. Pas d'activation de courrier ou de Google.
