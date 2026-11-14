# Reprise du lot Auth / invitations — 14 novembre 2026

## Cadrage

Référent : Frederick. Source `revetementsmir/Revetements-mir-`, checkout `/workspace/Revetements-mir-pr31`, branche `codex/test-employee-auth-invitations`. Base distante relue : `d4a9ec05ee9a0c2ede0713efab0add860a9507cb`; branche distante initiale `eedfdc9fc344fb3e659fba1b214cabad2bce60cf`. PR31 réellement relue via le connecteur GitHub : fusionnée à `d4a9ec05…`. Ne pas la rouvrir.

Objectif : connexions Google/courriel, récupération, invitations Boss/Adjointe, persistance Android et verrou système facultatif. Conserver les travaux locaux, les outils métier, le Centre d’aide et le pliage magasin. MIR TEST exclusivement `hxtztkmbfpmzrieccwsg`; aucun serveur production, courriel réel, fusion, publication, distribution ou signature release. Réussite finale : parcours réellement vérifiés sur services TEST, APK traçable, tests et recette Samsung réussis. **Ces critères ne sont pas encore tous satisfaits.**

## Complément à l’audit historique

[AUDIT-PLAN.md](AUDIT-PLAN.md) est conservé intégralement. Son blocage publication est historique : Frederick a confirmé le contrôle des rôles sur `d4a9ec05…` et Pages43529434780; aucune nouvelle publication Pages n’est requise pour Android. Cette confirmation utilisateur ne certifie pas les nouveaux services Auth/invitations.

MOON1.3.11 fraîchement vérifié via Atelier partagé le 14 novembre à00:28:08.645UTC : coordinator=moon, freshness.protocol=1 et methodVersion identique. list_applications a authentifié Frederick et retrouvé MIR; get_application a relu la tâche historique version95. Aucun ancien OAuth terminal, changement de compte ni jeton copié. Le suivi historique approche sa limite60000caractères : conserver ses décisions et utiliser une tâche dédiée pour ce lot.

## Correctifs de reprise

- Stockage PKCE corrigé pour **le vrai SDK embarqué** : vérificateur classique, index des flux et clés par flux conservés dans le slot chiffré `pkce`, distinct de `session` et `pending`. Les accès au dictionnaire PKCE sont sérialisés.
- Callback Android strict, refus des paramètres ambigus/erreurs mêlées à un code; échange unique même face à deux callbacks simultanés, attente bornée et contrôle du rôle serveur après Google **et récupération**. Aucun code/jeton injecté dans l’historique WebView.
- Observateur du verrou différé jusqu’à DOMContentLoaded; demandes de déverrouillage concurrentes partagent la même promesse. Purge navigateur déclenchée directement lors du changement d’identité, sans timer susceptible de vider le stockage du compte suivant.
- Ressource SVG Google incluse dans le build avant son premier commit. Formulaire courriel révélé par bouton accessible; Google/récupération désactivés tant que non vérifiés. Tests UI adaptés sans retirer contraste, connexion, frontières réseau ou non-régressions.
- Proposition SQL TEST conservée hors migrations automatiques : préparation, liste, renouvellement, révocation, acceptation, droits et refus de réactivation/écrasement d’un rôle incompatible. Le reçu idempotent ne conserve pas le secret du lien.
- Rendu de courriel HTML/texte pur ajouté, sans transport. Données fictives, URL example.invalid, aide fictive, expiration en heure de Toronto; aucun APK distribué. Six rendus Chromium, sans ressource distante; captures mobile clair/sombre réellement ouvertes. Ceci ne certifie pas Gmail/Outlook ni l’envoi.
- Version préparée0.12.0-test/120001; mise à jour CI prévue120001→120002, assertions et provenance adaptées. Aucun résultat110002 historique ne vaut preuve pour ce lot.

## Vérifications locales

- Auth réelle du **SDK embarqué avec transport simulé** : cinq scénarios (clés PKCE multiples, échange, doublon simultané, expiration/mauvais flux, récupération avec compte client refusé).
- Contrats Android web et courses de session :21tests. Les tests de production utilisent un refus local; aucun backend production sollicité.
- PGlite :11groupes de scénarios, dont identité non confirmée, mauvais émetteur, rôle incompatible, idempotence, rotation/révocation/expiration et organisation étrangère. Fixture locale; pas une preuve du schéma hébergé.
- Chromium : sept formats360/390/768/834/1366/1440/1920, clair/sombre, texte agrandi, clavier, hors ligne, cinq états de rôle simulés, FAQ et pliage interne. Captures390clair/sombre ouvertes.
- Courriel : échappement, destinations et aide validés, versions HTML/texte générées; trois formats×clair/sombre sans réseau. Aucun envoi.
- Contrats compte public, callback/panier et neuf contrôles connexion réussis.

Les journaux et captures locaux sont dans `artifacts/employee-auth-audit/` et `artifacts/phase11/web/` (ignorés par Git). Le bilan final de compilation et les références Git/PR doivent être ajoutés après exécution.

## Limites restant à lever

1. Connexion Supabase Mir2 : get_project et lecture du schéma TEST explicitement refusés par le service (« You do not have permission to perform this action »). Aucun autre compte essayé. Compatibilité du SQL et compte Employé Frederick non diagnostiqués sur le serveur.
2. Fournisseur Google, callbacks autorisés et expéditeur non vérifiés. Trois capacités publiques désactivées par défaut; ne pas les activer pour obtenir une interface artificiellement opérationnelle.
3. **Le choix initial du mot de passe pour une personne sans compte n’est pas implémenté de bout en bout.** La proposition SQL exige une identité Auth confirmée. Elle ne crée pas de compte Auth. L’APK refuse actuellement un compte sans rôle équipe. Un service d’enrôlement TEST, limité à une invitation valide et au courriel vérifié, reste à intégrer avant activation. Aucun signup public à ouvrir pour contourner ce manque.
4. Pas de transport d’invitations certifié. États pending/sent/failed/unknown proposés, mais aucun fournisseur ni reçu réel. Renouveler invalide l’ancien lien; les actions de préparation manuelle ne sont pas un envoi.
5. Verrouillage : confirmation des identifiants système Android, pas de second NIP MIR. Les comportements biométriques et toutes les courses pause/reprise exigent une recette native; aucune prise en charge iOS revendiquée.
6. Aucun émulateur ni Samsung physique certifié pour ce lot. Conserver la recette S25 ouverte et ne pas désinstaller/effacer pour contourner une signature.

## Bilan de compilation locale finale

Commande `:app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug` : **BUILD SUCCESSFUL**, journal `artifacts/employee-auth-audit/android-final.txt`. Un test unitaire Java exécuté, zéro échec; instrumentation compilée seulement, pas exécutée. Lint :0erreur,16avertissements. Aucun résultat CI ou Samsung déduit de cette compilation.

APK local : `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
Identité vérifiée par aapt : `ca.revetementsmir.equipe.test`, version`0.12.0-test`, versionCode`120001`, minSDK24, cible/compileSDK36.
SHA-256 des octets finaux : `f324db27be9e807cd87f3c8ba946d9896623fbc512699b5e7425eb8da10cf61f`.
Certificat debug SHA-256 vérifié par apksigner : `6210b4a4d1595aef3402f7ed679cf9f3a1e9e79bd23657988cacf3978b19e0db`.
Aucune signature release, distribution ni installation sur téléphone. Cette clé locale n’est pas présumée identique à un APK CI/historique; ne pas désinstaller pour contourner un conflit.

Ressources régénérées après la dernière correction d’état d’invitation; APK recopié dans `artifacts/employee-auth-audit/` avec provenance/fichiers embarqués. Le commit source exact est inscrit dans cette provenance après sauvegarde Git. La documentation seule ne modifie pas les ressources compilées.

Les26tests Auth/session sont verts sur les dernières sources. Recette web de non-régression du site : sept formats360/390/428/820/1024/1440/2560, inscription client existante, récupération, panier, Google et acceptation simulés réussis;aucun transport réel. Ses14captures générées ont été archivées hors Git puis les images historiques suivies rétablies, sans modifier le travail initial. Il ne s’agit pas du nouvel enrôlement employé sans compte, toujours absent.

Atelier : suivi spécifique créé `71b664cb-723f-43d6-8c8f-8889515fed90`, en cours; feuille de route version95 laissée intacte. Le lot ne doit être marqué terminé qu’après levée des limites listées ci-dessus.
