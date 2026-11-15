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

## Complément : identités exactes de la CI Android

La CI1466eb1 est verte techniquement, mais l’inspection des vrais PNG a révélé des doublons (Commande/Punch et Message/Plus), ainsi qu’un Chef sans affectation. Cette CI ne certifie donc pas cinq rendus natifs distincts. Les comptes natifs historiques sont différents des comptes locaux E0/E1 et des comptes de certification F7/95 : Chef `ec421778-b39b-492e-9e4b-5e044015e98f`, Employé `3980647a-d83a-48ad-9d90-8fc2b314807f`.

Ces **deux comptes existants** ont maintenant les deux jobs A/B. Deux équipes QA20/21, affectations du jour40/41 et tâches60/61 ont été ajoutées au Chef natif. Chaque équipe a un membre QA Employé existant, déjà activé par les essais Auth (`552233d5-…` et `b0cf921b-…`), qui n’appartenait à aucune équipe active. Aucune identité créée, aucun mot de passe réinitialisé, aucun déplacement d’ancienne affiliation ; l’index d’unicité d’équipe active est conservé. Les présences restent non confirmées. La fixture versionnée est `supabase/test-only/fixtures/chantier-ux-native-existing-accounts.sql`.

Le nom métier était déjà configuré dans `staff_capabilities`, tandis que l’enveloppe historique du portail utilisait seulement Auth full_name/courriel. Le nouveau `mir_field_profile(org)` lit uniquement l’identité courante, avec rôle et membre actifs ; aucune identité cible ne peut être fournie. Le client vérifie identité, rôle et génération de session avant d’enrichir son propre nom. Les métadonnées Auth ne sont pas artificiellement modifiées pour masquer cet écart. Quatre scénarios HTTP propres/refus d’organisation sont réussis. Une lecture serveur avec claims Chef natif confirme son vrai nom, les deux jobs, un membre et une tâche distincte dans chaque équipe ; le détail est dans `proofs/native-fixture-check.json`. Les nouveaux contrôles natifs doivent encore confirmer contenu spécifique et captures distinctes avant remise de l’APK.

L’index existant `team_one_active_membership` impose une seule équipe active par personne. Les insertions de fixture avec `ON CONFLICT DO NOTHING` n’avaient donc pas ajouté l’Employé déjà membre à la nouvelle équipe B. La recette conserve cet index et les affiliations existantes : affectation du jour `000000000035` de l’équipe TEST `a3238a96-afb7-43a2-92c3-e33f23faf41f` à Garage B, Chef du jour E0 et tâche `000000000056`. Le responsable permanent de l’équipe est inchangé. Aucun parcours d’équipe n’est certifié sur une liste vide.

## Adjointe et Entrepôt

Les contrôles de ces deux rôles utilisent des **claims QA contrôlés en SQL** sur le serveur, pas une connexion navigateur revendiquée. Adjointe a relu les dossiers A/B et répondu au bris B. Entrepôt a répondu au même objet outil B ; accès A et traitement d’un problème général refusés. Le rejeu de décision conserve un seul reçu et une seule nouvelle activité.

Objet commun outil : `5757d93c-5dbd-4554-a1e9-7af93d01bb6d`. La réponse finale « Entrepôt examine le remplacement, aucune livraison promise » est relue via HTTP authentifié Employé. Le traitement ne crée ni commande ni dépense.

## Installations TEST confirmées

Les six propositions ont passé la revue et les tests PostgreSQL locaux avant installation. Les copies immuables, créées avec la CLI Supabase, sont versionnées dans `supabase/test-only/migrations/`, hors déploiement automatique. Chaque SQL refuse l’installation sans préalable explicite MIR TEST. Aucun secret privilégié livré au client.

1. `20261114045007_mir_chantier_field_test.sql` : actions terrain canoniques, droits coalescés, pièces privées, décisions et idempotence.
2. `20261114050907_mir_chantier_lead_context_test.sql` : mutations Chef liées à la job choisie.
3. `20261114051849_mir_chantier_personal_history_test.sql` : lecture personnelle paginée, aucun droit manager.
4. `20261114051932_mir_chantier_delivery_context_test.sql` : incident lié à commande/ligne/job, reçu contrôlé.
5. `20261114052651_mir_chantier_lead_selected_job_test.sql` : lecture Chef liée à la sélection explicite et métadonnées job autorisées.
6. `20261114060519_mir_chantier_field_profile_test.sql` : nom métier et rôle de l’identité courante uniquement, avec refus des organisations étrangères et rôles non autorisés.

Chaque appel d’installation a reçu `success:true` du serveur. Ces installations TEST ne constituent pas une migration production autorisée. Les contrats historiques et tables métier sont réutilisés ; aucun second dossier ou rapport indépendant.

## Limites conservées

Les scénarios GPS réel, caméra Android, clavier système, retour, rotation, verrou facultatif et persistance après redémarrage Samsung restent une recette physique distincte. Un navigateur, des claims SQL et des fixtures ne les certifient pas. La météo peut afficher « indisponible » si aucune donnée réelle n’est reçue.

Le premier Punch oublié sans journée existante ouvre une demande manuelle au bureau par conversation privée. Aucun pointage initial ni correction structurée n’est inventé. Les corrections de journées existantes réutilisent le traitement et l’audit canoniques.

## Correction des courses de session Android

Les CI4d51f9a et5c0466a ont révélé des échecs natifs distincts : connexion refusée après reprise, puis disparition du témoin de données navigateur malgré une session et un rôle restaurés après mise à jour. Le témoin n’a pas été supprimé du test ni réécrit pour contourner son échec.

Les journaux serveur TEST ciblés montrent une connexion200, une ancienne requête utilisateur403 après déconnexion/reconnexion, puis une lecture de compte401 sans identité. Les reproductions locales avec le **vrai SDK embarqué et un transport synthétique** ont confirmé deux mécanismes : `getUser(session_not_found)` peut effacer sa session avant le retour du résultat ; un ancien nettoyage natif lent peut terminer après une nouvelle connexion et effacer son coffre et son témoin navigateur. Il ne s’agit pas d’un essai physique. Les preuves assainies sont `proofs/auth-session-race-5c.json`, `proofs/auth-signout-cleanup-race.json` et `proofs/auth-independent-patch.json`.

La façade native utilise maintenant un vérificateur privé sans stockage persistant pour valider l’utilisateur, avec contrôles d’identité, d’époque et de jeton avant toute utilisation ou purge. Les mutations de connexion et les nettoyages sont ordonnés. Les refus concernant la session courante continuent de déconnecter et purger : aucune autorisation serveur n’est ignorée. Le SDK fournisseur, les API Auth web et les contrats d’invitations restent inchangés ; Google et les transports de courriel restent désactivés.

Résultats locaux sur le code figé :33 tests Auth/session (20SDK,10activation,1file de session,2compte),19 contrats APK, compatibilité et activation navigateur réussis. La revue Mobile indépendante a rejoué cinq scénarios, dont refus courants et renouvellement du jeton. La nouvelle CI et son témoin de conservation restent nécessaires avant certification native ; leurs résultats et la tête finale sont consignés dans le bilan de livraison.

SEO/GEO : non applicable à cette application métier privée. Aucun changement d’indexation, d’accès public ou de domaine.
