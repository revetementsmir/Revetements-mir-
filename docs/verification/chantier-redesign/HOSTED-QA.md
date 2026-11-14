# Recette hébergée MIR TEST — 14 novembre 2026

Projet exclusivement `hxtztkmbfpmzrieccwsg`. Aucun appel production, courriel réel, paiement ou publication Pages. Aucun compte créé ni mot de passe réinitialisé. Les identités QA existantes sont relues côté serveur : la variable historique « employee » correspond au Chef, et « other client » à l’Employé. Les noms des variables ne constituent pas une preuve de rôle.

## Données fictives préparées

Organisation QA `8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9`. Les identifiants de fixtures commencent par `7da20261-1114-4000-8000-`.

- Jobs `000000000001` Façade A et `000000000002` Garage B, affectées aux comptes QA et de certification Employé/Chef. Job `000000000003` réservée au refus d’accès.
- Deux jobs avec affectations du jour et tâches distinctes, présences non confirmées. Pour Garage B, la recette Chef réutilise finalement l’équipe TEST existante et ses membres, avec une nouvelle affectation du jour ; aucun membre n’est déplacé. L’absence de Punch ne devient pas une absence.
- Deux PDF synthétiques d’une page réellement téléversés dans Storage privé et référencés dans `job_documents` : famille/version/auteur/chantier canoniques. Aucune URL publique créée.
- Deux journées historiques synthétiques Employé, 1er et 2 octobre 2026 : shifts `000000000910/911`, six segments A → déplacement → B, pause automatique de 30 minutes, état à examiner. Ces fixtures ne sont pas des pointages physiques ni une preuve du GPS.
- Deux commandes strictement fictives **en brouillon**, `000000000950/951`, lignes `000000000960/961`. Aucune commande fournisseur, confirmation de préparation, expédition ou livraison réelle.
- L’Entrepôt QA est explicitement affecté seulement à Garage B pour vérifier la frontière de droits. Aucune permission générale ajoutée.

Le Chef QA possédait déjà un pointage ancien actif du 9 novembre. Il n’a pas été terminé ou modifié pour faciliter les essais. Son total n’est pas présenté comme un résultat de cette recette.

## Essais avec les sessions QA existantes

Les preuves JSON assainies sont conservées sous `artifacts/chantier-redesign/hosted/`. Les fichiers privés de session restent ignorés, mode 600, hors Git, APK, transferts et rapports.

| Essai | Mode et résultat | Preuve |
|---|---|---|
| Photos, problème et outil | 13 scénarios HTTP authentifiés réussis : photo privée réellement téléversée, étape « avant » validée, bonne job, rejeu identique, contenu différent refusé, rôle/organisation/job étrangers et réponse forgée refusés | `field-contracts.json` |
| Extra | Extra fictif `a26aa58e-e3ac-475c-82cd-2b329d0d9b89` relu dans le dossier canonique de Garage B, sans approbation ni facturation | `canonical-links.json` |
| Conversation Adjointe | Message `9e9b3316-c101-44b8-bc97-05fec1d1607e`, conversation privée `f9264c96-c4c3-4659-ba32-3766007de9c1` : même fil dans Message et dossier B de l’Employé, absent du Chef non participant | `canonical-links.json`, captures Qualité |
| Rapport Chef et tâche | HTTP authentifié : action explicitement job B, vraie pièce jointe privée, rejeu sans duplication, job C refusée, rapport et tâche relus dans dossier B | `lead-context-report.json` |
| Historique personnel | 7 scénarios HTTP réussis : deux pages distinctes, fin de pagination, jobs/déplacement/pause, filtre job, identité imposée, rôle Chef incapable de lire les deux shifts Employé, organisation étrangère refusée | `personal-history.json` |
| Incident livraison | 7 scénarios HTTP réussis : commande/ligne/job B, rejeu même ID, contenu changé refusé, mauvaise job/ligne/organisation refusées, activité et commande relues dans dossier B | `delivery-context.json` |
| Chef A → B → A | Interface réellement raccordée aux API : tâche A051, tâche B056 avec les trois membres effectivement retournés de l’équipe TEST, puis tâche A051 ; accès job C et RPC Chef par Employé refusés 403/42501 ; zéro erreur JavaScript, aucune mutation par le harnais | `qualite/hosted-lead-ui-readonly.json` |

L’expertise Qualité a ensuite ouvert réellement l’interface locale raccordée aux API hébergées, sans mutations cachées : PDF et jobs A/B, extra, fil privé, historique et ouverture de correction. Ce niveau est distinct du navigateur utilisant le transport simulé.

Le contrôle A → B → A a d’abord reproduit un cache erroné qui empêchait de recharger A ; le cache a été remplacé par une protection des requêtes en cours et le parcours a été rejoué. Le changement d’une ancienne journée dans le formulaire de correction conservait aussi les segments précédents : Oct2 → Oct1 remplace maintenant 923/924/925 par 920/921/922, sans écrire de correction pendant la recette de lecture.

L’index existant `team_one_active_membership` impose une seule équipe active par personne. Les insertions de fixture avec `ON CONFLICT DO NOTHING` n’avaient donc pas ajouté l’Employé déjà membre à la nouvelle équipe B. La recette conserve cet index et les affiliations existantes : affectation du jour `000000000035` de l’équipe TEST `a3238a96-afb7-43a2-92c3-e33f23faf41f` à Garage B, Chef du jour E0 et tâche `000000000056`. Le responsable permanent de l’équipe est inchangé. Aucun parcours d’équipe n’est certifié sur une liste vide.

## Adjointe et Entrepôt

Les contrôles de ces deux rôles utilisent des **claims QA contrôlés en SQL** sur le serveur, pas une connexion navigateur revendiquée. Adjointe a relu les dossiers A/B et répondu au bris B. Entrepôt a répondu au même objet outil B ; accès A et traitement d’un problème général refusés. Le rejeu de décision conserve un seul reçu et une seule nouvelle activité.

Objet commun outil : `5757d93c-5dbd-4554-a1e9-7af93d01bb6d`. La réponse finale « Entrepôt examine le remplacement, aucune livraison promise » est relue via HTTP authentifié Employé. Le traitement ne crée ni commande ni dépense.

## Installations TEST confirmées

Les cinq propositions ont passé la revue et les tests PostgreSQL locaux avant installation. Les copies immuables, créées avec la CLI Supabase, sont versionnées dans `supabase/test-only/migrations/`, hors déploiement automatique. Chaque SQL refuse l’installation sans préalable explicite MIR TEST. Aucun secret privilégié livré au client.

1. `20261114045007_mir_chantier_field_test.sql` : actions terrain canoniques, droits coalescés, pièces privées, décisions et idempotence.
2. `20261114050907_mir_chantier_lead_context_test.sql` : mutations Chef liées à la job choisie.
3. `20261114051849_mir_chantier_personal_history_test.sql` : lecture personnelle paginée, aucun droit manager.
4. `20261114051932_mir_chantier_delivery_context_test.sql` : incident lié à commande/ligne/job, reçu contrôlé.
5. `20261114052651_mir_chantier_lead_selected_job_test.sql` : lecture Chef liée à la sélection explicite et métadonnées job autorisées.

Chaque appel d’installation a reçu `success:true` du serveur. Ces installations TEST ne constituent pas une migration production autorisée. Les contrats historiques et tables métier sont réutilisés ; aucun second dossier ou rapport indépendant.

## Limites conservées

Les scénarios GPS réel, caméra Android, clavier système, retour, rotation, verrou facultatif et persistance après redémarrage Samsung restent une recette physique distincte. Un navigateur, des claims SQL et des fixtures ne les certifient pas. La météo peut afficher « indisponible » si aucune donnée réelle n’est reçue.

Le premier Punch oublié sans journée existante ouvre une demande manuelle au bureau par conversation privée. Aucun pointage initial ni correction structurée n’est inventé. Les corrections de journées existantes réutilisent le traitement et l’audit canoniques.

SEO/GEO : non applicable à cette application métier privée. Aucun changement d’indexation, d’accès public ou de domaine.
