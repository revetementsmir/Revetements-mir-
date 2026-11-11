# MIR — Phase 3A : fondations et sécurité du clavardage

État courant au 11 novembre 2026 : **migration appliquée sur MIR TEST; recette réelle BLOQUÉE / NON CERTIFIÉE**. Production intacte. L’historique de préparation locale est conservé plus bas et ne constitue pas une certification hébergée.

## Mise à jour — application autorisée et recette MIR TEST

### Migration réellement enregistrée

Autorisation explicite de l’utilisateur reçue pour MIR TEST uniquement. Projet confirmé par Management API : `hxtztkmbfpmzrieccwsg`, nom **MIR TEST**, PostgreSQL **17.11**, état ACTIVE_HEALTHY. Aucune requête production.

- SHA distant de la PR #4 avant application : `f589382409796a8a681021cd87b20c65ea534e16`; brouillon, non fusionnée.
- Préconditions intégrales de la migration exécutées en **READ ONLY** le **2026-11-11 à 12:24:32.452027 UTC** : toutes compatibles. Aucune garde contournée.
- Une seule application, par **Supabase apply_migration officiel**, résultat success.
- Nom enregistré : **chat_phase3a_security**; version enregistrée : **20261111122840**.
- Fichier source inchangé : `supabase/migrations/20261112114958_chat_phase3a_security.sql`.
- SHA-256 du SQL local **et du SQL enregistré dans l’historique hébergé**, identiques : `d787d6d5d9f2313e17858c4d1554bf7f59fc6536a842644547d2a854ac41b512`.
- Première vérification après application : **12:29:07.114991 UTC**. Empreinte de catalogue concordante, sept entrées RPC contrôlées SECURITY DEFINER/search_path, anon sans EXECUTE, authenticated/service_role avec EXECUTE attendu, quatre tables chat RLS sans droits directs anon/authenticated, trois anciennes policies Storage et quatre nouvelles restrictives présentes, bucket toujours privé.
- Contrôle de l’historique à **12:41:14.710685 UTC** : une entrée correspondant à cette application, SQL exact conservé. La version hébergée générée par Supabase diffère du préfixe du fichier; ne pas en déduire une migration manquante et ne pas la rejouer.

Preuves détaillées : [JSON réel MIR TEST](mir-chat-phase3a-mir-test-results.json). Le [JSON local antérieur](mir-chat-phase3a-results.json) reste inchangé et décrit uniquement les simulations précédentes.

### CI inspectée avant application

Le workflow [Clavardage Phase 3A](https://github.com/revetementsmir/Revetements-mir-/actions/runs/43019443497) est réussi. Les workflows Auth, Aujourd’hui, dossier chantier, portail et certification de base des six rôles sont réussis également. La certification des six rôles du run 43019443553 précède l’application : elle ne prouve pas les nouvelles RPC.

Deux workflows sont rouges : [fournisseurs](https://github.com/revetementsmir/Revetements-mir-/actions/runs/43019443500), étape `tests/mir-supplier-send.cjs`, et [fondations partagées](https://github.com/revetementsmir/Revetements-mir-/actions/runs/43019443508), étape `tests/mir-shared-workspace-browser.cjs`. Les deux échecs ont été reproduits dans un worktree détaché de **main 39de53260a134bae48143c1bdb1aa235335d6187**, avant Phase 3A : **42704 — role service_role does not exist** dans les fixtures PostgreSQL jetables. Ils ne sont ni masqués ni corrigés dans cette mission.

### Résultats HTTP réellement exécutés

Sessions obtenues par mot de passe avec des comptes MIR TEST existants, HTTPS réel via le proxy autorisé. Les jetons restent en mémoire, jamais dans les livrables. Les rôles sont vérifiés côté serveur; les noms historiques de variables ne sont pas considérés comme une preuve du rôle.

**13 contrôles HTTP consignés : 12 réussis, 1 échoué; certification globale NON acquise.**

| Vérification réelle | Résultat |
|---|---|
| Création simultanée de la conversation officielle du chantier de recette | 8 appels HTTP 200, même identifiant; SQL confirme une seule ligne |
| Lecture chantier par Chef et Employé affectés | HTTP 200 chacun |
| Lecture par Admin technique autorisé | HTTP 200 |
| Client exclu du chat interne | HTTP 403 / 42501 |
| Chef, Employé et Admin vers une seconde organisation existante | HTTP 403 / 42501 chacun |
| Chemin de pièce jointe forgé | HTTP 403 / 42501 |
| Fichier inexistant | HTTP 400 / 22023 |
| Appel RPC de recherche autorisé | HTTP 200, historique de recette vide; ne prouve pas le filtrage d’un texte inter-tenant |
| Appel anonyme d’une nouvelle RPC | HTTP 401 / 42501 |
| Téléversement d’un PNG valide de 68 octets | **ÉCHEC** : HTTP 400 externe, statusCode 403, AccessDenied |

### Blocage Storage constaté — arrêt des mutations de recette

Erreur exacte du téléversement : **permission denied for function support_object_allowed**.

Diagnostic en lecture seule à **12:36:53.305834 UTC** :

- `mir_core.support_object_allowed(text,boolean)` a l’ACL **{postgres=X/postgres}** : authenticated ne peut pas l’exécuter.
- Les policies déjà présentes `mir_support_insert`, `mir_support_select`, `mir_support_delete` de `storage.objects` référencent cette fonction.
- Ces policies étaient présentes avant Phase 3A. La migration appliquée ne modifie ni cette fonction, ni son ACL, ni ces policies.
- Le vrai appel Storage vers `mir-internal` échoue néanmoins sur cette dépendance du système Support. Aucun objet du PNG n’est enregistré dans `storage.objects`.
- Aucune nouvelle migration, aucun GRANT de réparation, aucune suppression de policy et aucun retour arrière improvisé n’ont été exécutés. L’échec n’est pas présenté comme un succès d’isolation ou de MIME.

Un GRANT ajouté sans examen élargirait potentiellement le périmètre Support/Centre d’aide, hors du correctif autorisé. **Une décision distincte est nécessaire pour auditer puis préparer un correctif gardé de cette dépendance sur MIR TEST.** La méthode Tests a servi à séparer défaut de fixture CI et défaut réel de service; elle n’a pas autorisé de modification supplémentaire.

### MIME : protections effectives et limites exactes

La configuration du bucket borne les types déclarés à JPEG/PNG/WebP/HEIC/HEIF et la taille à 10 Mio. Le SQL installé vérifie l’existence dans Storage, l’organisation, le propriétaire, la conversation, le chemin, l’extension, `metadata.mimetype`, `metadata.size` et l’accès courant. Ce sont des **contrôles de métadonnées serveur**, pas une identification du type à partir des octets.

**Aucun reniflage binaire, décodage d’image ni antivirus n’a été ajouté.** Le blocage ACL empêche pour l’instant de vérifier réellement si un contenu non-image déclaré image serait accepté, ou si une limite MIME/taille serait la cause précise d’un refus. Un PNG légitime refusé sur une permission ne prouve aucune protection MIME du contenu.

**Aucune URL signée n’a été émise dans cette recette; expiration NON TESTÉE.** Le défaut client de 300 secondes et la fenêtre résiduelle de liens déjà émis restent des faits de code/architecture, pas une preuve HTTP d’expiration ni un plafond universel imposé par SQL.

### Vérifications non terminées

- Sessions HTTP Boss et Adjointe pour les nouvelles RPC : non exécutées après migration; leurs secrets restent dans GitHub Actions, sans demande de comptes dans le clavardage.
- Retrait/réintégration d’accès équipe et chantier : non exécutés en hébergé; aucune affectation existante n’a été retirée.
- Pagination stable avec historique réel et recherche de textes inter-tenants : non exécutées. L’appel sur historique vide n’est qu’un smoke test.
- Transfert/téléchargement de fichiers privés valides, autres conversations/tenants via HTTP Storage, MIME/tailles réels : bloqués.
- Accusés, non-lus et concurrence d’envoi de messages : non exécutés. La concurrence de création de conversation seule est vérifiée.
- Expiration des URL signées : non exécutée.

### État laissé et reprise

La migration complète reste installée sur MIR TEST; aucune erreur DDL ni transaction partielle. Nouveau chantier fictif **[QA PHASE3A] 20261111 f589382 validation**, identifiant `859143d9-4f98-47d8-8c97-588007941a40`, deux affectations ajoutées sur ce seul chantier; conversation officielle `0e2c6b49-b1af-4c27-acc5-77a9d43c81fc`. Ces données de recette sont conservées pour la reprise, sans créer d’autres doublons. Un fil d’équipe existant a été ouvert par la RPC normale; aucun message métier existant n’a été modifié.

Aucun message de recette envoyé, aucun fichier téléversé avec succès, aucun compte créé, aucun mot de passe changé. Aucun retrait d’affectation existante et aucune suppression de données. Production non consultée/non modifiée. PR #4 reste en brouillon, non fusionnée; aucun Lot B, aucune publication.

Prochaine action proposée : **autoriser un audit ciblé du contrat Storage/ACL Support puis un correctif minimal gardé sur MIR TEST**, en conservant les policies et les autorisations métier; relancer ensuite toute la recette réelle interrompue. Ne pas élargir les permissions maintenant pour faire passer le test.

## Historique — préparation locale avant autorisation MIR TEST

Les sections suivantes décrivent l’état antérieur à l’application du 11 novembre. Leurs mentions « non appliquée » et « autorisation requise » sont historiques; la mise à jour ci-dessus constitue l’état courant.

## Références et périmètre

- Dépôt : `revetementsmir/Revetements-mir-`; ancien dépôt non modifié.
- Base distante inspectée : `39de53260a134bae48143c1bdb1aa235335d6187` (`origin/main`, PR #3 déjà fusionnée).
- Branche : `codex/phase-3a-clavardage-securite`, créée directement depuis cette base.
- Implémentation testée : `9d2dd8c3d47dc250556c41a51850db1fdbe16a26`. Le commit documentaire suivant n’altère pas le code testé.
- MIR TEST : `hxtztkmbfpmzrieccwsg`. Production : `gccltmaulvrnthrbnrpd`.
- Production non consultée et non modifiée dans cette mission. Aucun compte réel créé, aucun mot de passe modifié.
- Références consolidée/passation lues entièrement. Les exigences historiques sont limitées par la présente mission Phase 3A : aucun Centre d’aide, Lot B, thème, nouvelle messagerie ou refonte visuelle.

Les guides Supabase et PostgreSQL ont servi à imposer les gardes de schéma, les ACL minimales, les policies restrictives et les index de curseur. La documentation Storage a été consultée via MCP; le journal HTTP officiel était bloqué par le proxy (403), sans contournement.

## Audit réel, en lecture seule

Les requêtes MIR TEST ont été encapsulées dans `BEGIN READ ONLY; ... COMMIT`. Elles n’ont lu que les catalogues SQL, les paramètres du bucket et un comptage agrégé d’objets, pas les messages ou comptes privés.

Dernier contrôle : **2026-11-11 12:16:47.913387 UTC**, PostgreSQL **17.11**, **0** des cinq nouvelles RPC Phase 3A présentes. Aucune installation n’a donc eu lieu. Le bucket `mir-internal` est privé, limité à 10 Mio et JPEG/PNG/WebP/HEIC/HEIF. Il ne contenait aucun objet du scope `message` au moment du comptage.

Les définitions SQL réelles et leurs MD5 sont conservées dans [la fixture de schéma](../../tests/fixtures/mir-chat-hosted-functions.json), sans données utilisateurs. Le banc local part des migrations existantes et superpose les définitions hébergées; la surcharge `job_allowed(uuid,uuid)` déjà identique n’est pas recréée. Ce n’est pas une copie intégrale de Supabase : Auth/Storage sont des fixtures, pas leurs services HTTP.

| Objet existant | État observé | Action Phase 3A |
|---|---|---|
| `conversations` | Types private/team; pas de job_id | Ajouter job_id composite organisation/chantier et kind job |
| `conversation_participants` | Copie historique active | Préserver; ne l’utiliser comme autorité que pour les privés |
| `team_members`, `teams` | Affectations et activation existantes | Vérifier à chaque accès d’équipe |
| `job_dossier_allowed`, `jobs`, affectations/logistique | Autorisation chantier déjà validée | Réutiliser sans modifier leurs définitions |
| `conversation_allowed` | Autorise uniquement la copie de participants | Adapter aux accès actuels, sans lecture inter-tenant ni requête pour un autre utilisateur |
| `mir_conversation_private` | Matrice privée existante | Conserver sa logique; seule la liste des colonnes INSERT devient explicite |
| `mir_conversation_team` | Création et copie initiale seulement | Appartenance active obligatoire; création atomique/unicité existante |
| `mir_message_send` | Chemin fourni accepté; reçus de participants périmés | Valider serveur, calculer les destinataires actuels, idempotence stricte |
| `mir_message_ack` | Reçu personnel, sans accès courant | Ajouter accès courant et cohérence de notification |
| `mir_messaging_snapshot` | Historique illimité | Projection compatible, bornée et métadonnées de pagination |
| `mir_employee_operations_snapshot` | Deuxième historique illimité | Remplacer seulement ses projections chat et filtrer ses avis chat devenus inaccessibles |
| RLS / tables chat | Activées, aucun droit direct anon/authenticated | Conserver intégralement les ACL; aucun grant de table ajouté |
| Storage `mir_internal_insert/select/delete` | Policies permissives existantes | Conserver leurs définitions; ajouter quatre policies restrictives pour le scope message uniquement |
| Triggers chat | Aucun trigger utilisateur observé | Aucun trigger ajouté |
| Index existants | PK, idempotence, équipe unique, temps messages | Conserver; ajouter unicité chantier, curseurs et recherches par pièce jointe/non-lus |

Les migrations réellement enregistrées dans TEST ont des versions différentes des noms locaux : `employee_operations_backend` = `20261109214618`, `employee_messages_storage` = `20261109215710`, `operational_roles_phase1` = `20261110134134`, libellé Admin = `20261110233343`. L’équivalence a été contrôlée sur les corps SQL, pas déduite du nom. Ces migrations ne doivent pas être rejouées.

## Migration préparée, non appliquée

`supabase/migrations/20261112114958_chat_phase3a_security.sql`.

Fichier initial généré par la CLI officielle Supabase **3.1.0**, puis daté après la migration dossier `20261111120000` afin de respecter sa dépendance réelle. Aucune commande de liaison ou db push n’a été utilisée.

Une transaction complète, verrou d’installation, contrôles préalables, puis empreinte finale des fonctions/ACL/contraintes/index/policies/bucket. La répétition sur un état identique ne recrée ni fonction ni policy. Une dérive ou installation partielle est refusée, pas réparée automatiquement.

Gardes vérifiées : corps des huit fonctions adaptées, search_path, absence d’exécution anon, ACL directes, RLS, forme des colonnes, CHECK et index équipe, FK messages, unicité de requête, Storage owner/owner_id/metadata, policies existantes et bucket privé. PostgreSQL 18 enregistre les NOT NULL séparément (`contype=n`), contrairement à PostgreSQL 17 : cette différence de catalogue est traitée explicitement.

Le seul CHECK retiré est **le CHECK kind précisément reconnu**, immédiatement remplacé dans la même transaction pour autoriser private/team/job. Aucun enregistrement n’est supprimé. Aucun DROP POLICY, DROP FUNCTION, DROP TABLE ou TRUNCATE. Les contraintes et index existants restent conservés; les nouveaux empêchent de confondre équipe et chantier. Pas de nouvelle table métier, rôle, système de notifications ou bucket.

Ordre futur : vérifier à nouveau l’état réel MIR TEST → autorisation explicite → appliquer uniquement cette migration via le mécanisme officiel → contrôler le catalogue et les autorisations → recette réelle. Ne pas rejouer les migrations historiques et ne pas déployer ce frontend avant un backend compatible.

Retour arrière : si une garde ou instruction échoue, ROLLBACK intégral; arrêter et garder l’erreur exacte. Après une application réussie, aucune suppression/down migration automatique : diagnostic puis correctif additif distinct, autorisé. Ne jamais rétablir aveuglément une fonction vulnérable.

## Contrats RPC et compatibilité

| RPC | Contrat |
|---|---|
| `mir_chat_conversations(org,page_size,page_before)` | Conversations autorisées, dernier message/activité/non-lus; curseur stable createdAt + id |
| `mir_chat_messages(org,conversation,page_size,page_before)` | Messages autorisés, curseur sentAt + id; description courante du fil |
| `mir_conversation_job(org,job)` | Obtenir/créer la conversation officielle unique du chantier |
| `mir_conversation_open(org,kind,target)` | Signature existante conservée; private/team/job |
| `mir_message_send(...)` | Signature existante; autorisation courante, références locales, validation pièce jointe et reçus actuels |
| `mir_message_attachment_validate(org,conversation,object_path)` | Vérification serveur de l’objet; le rattachement est atomique dans message_send |
| `mir_chat_search(org,query_text,page_size,page_before)` | Sous-chaîne littérale insensible à la casse dans les messages autorisés; aucun écran de recherche ajouté |
| `mir_message_ack(org,message,state)` | Reçu pour auth.uid seulement; accès courant, livré/lu et notification personnelle |
| `mir_messaging_snapshot(org)` | Champs existants conservés; ajoute conversationPage et messagePages |

Limites serveur : 20 par défaut, **1 à 50** par appel; recherche de **2 à 160 caractères**. Les curseurs sont vérifiés contre des objets autorisés du bon tenant/fil. Tri par création des conversations volontairement stable, pas par activité mutable; la dernière activité est retournée séparément.

La compatibilité charge au maximum 20 conversations × 20 messages. Aucun historique illimité n’est conservé dans l’autre snapshot opérationnel. Un membre ajouté peut consulter l’historique autorisé, mais ne reçoit pas rétroactivement de reçus/notifications anciens : `myReceipt=false` empêche un accusé invalide. Les anciens reçus sont conservés pour l’historique; les nouveaux destinataires suivent les affectations actuelles.

Chaque entrée publique privilégiée authentifie l’utilisateur et vérifie son organisation/accès avant toute donnée retournée. Les fonctions SECURITY DEFINER fixent search_path; les nouveaux grants EXECUTE sont explicites et excluent PUBLIC/anon. Les helpers internes non exposés n’accordent aucun accès direct aux tables.

Les seules adaptations d’interface sont les boutons de pagination dans l’écran existant, l’identification distincte d’un chantier, l’état archivé en lecture seule et le rejet des réponses tardives de messages/URL après déconnexion. Les chemins ne constituent jamais une autorisation : RPC et RLS valident l’accès réel. Les cartes Aujourd’hui, les styles partagés et les fonctions Punch sont inchangés; leurs empreintes sont vérifiées.

## Permissions

La [matrice complète Employé/Chef/Adjointe/Boss/Admin](mir-chat-phase3a-permissions.md) inclut les règles privées asymétriques historiques et les 25 paires réellement essayées sur PostgreSQL jetable.

Privé = participant actif; équipe = appartenance active actuelle, sans passe-droit lié au libellé Boss; chantier = autorisation du dossier existant. Retrait/refus puis réintégration sont testés sans synchronisation manuelle de conversation_participants. Un chantier archivé reste lisible avec l’accès actuel, mais envoi et téléversement y sont refusés.

Admin reste Admin technique : aucun changement des fonctions staff_role/operational_role ni des permissions métier hors chat. Son libellé opérationnel demeure Boss. Entrepôt conserve seulement les autorisations chantier logistiques déjà données par le dossier; aucun nouveau droit de gestion.

## Résultats finaux

Exécution du **2026-11-11T12:12:02.943Z au 2026-11-11T12:15:12.947Z** sur l’implémentation `9d2dd8c3d47dc250556c41a51850db1fdbe16a26`.

**38 suites exécutées, 38 réussies, 0 échouée** :
16 statiques/unitaires simulées; 6 PostgreSQL jetables; 16 navigateurs simulés. Résultats détaillés et sorties complètes : [JSON](mir-chat-phase3a-results.json).

PostgreSQL local : **18.6, PGlite 0.5.15**, Auth et schéma Storage simulés; ce n’est pas Supabase hébergé 17.11. Tests chat : **36 scénarios SQL**, **5 refus de préconditions avec transaction inchangée**, **5 contrats statiques/client**, **6 formats UI**. Le contrat des six rôles existant est un test unitaire simulé, **pas** une nouvelle certification réelle des comptes.

| Suite | Nature de la preuve | Résultat |
|---|---|---|
| `tests/mir-chat-phase3a.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-today.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-pages-regressions.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-homepage.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-boutique-audit-20261110.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-pliage-audit-commercial.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-magasin-merge.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-warehouse-core.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-warehouse-sql.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-realisations.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-studio-wall-sections.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-role-navigation.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-account-session.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-six-role-certification.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-portal-login.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-portal-optional-modules.cjs` | Statique / unité simulée | Réussi |
| `tests/mir-chat-phase3a-postgres.cjs` | PostgreSQL jetable | Réussi |
| `tests/mir-chat-phase3a-guards.cjs` | PostgreSQL jetable | Réussi |
| `tests/mir-employee-operations-postgres.cjs` | PostgreSQL jetable | Réussi |
| `tests/mir-job-dossier-postgres.cjs` | PostgreSQL jetable | Réussi |
| `tests/mir-punch-postgres.cjs` | PostgreSQL jetable | Réussi |
| `tests/mir-operational-roles-postgres.cjs` | PostgreSQL jetable | Réussi |
| `tests/mir-chat-phase3a-browser.cjs` | UI simulée | Réussi |
| `tests/mir-today-browser.cjs` | UI simulée | Réussi |
| `tests/mir-punch-browser.cjs` | UI simulée | Réussi |
| `tests/mir-employee-portal-browser.cjs` | UI simulée | Réussi |
| `tests/mir-chef-boss-browser.cjs` | UI simulée | Réussi |
| `tests/mir-homepage-browser.cjs` | UI simulée | Réussi |
| `tests/mir-boutique-audit-20261110-browser.cjs` | UI simulée | Réussi |
| `tests/mir-client-pliage-approved-browser.cjs` | UI simulée | Réussi |
| `tests/mir-warehouse-browser.cjs` | UI simulée | Réussi |
| `tests/mir-realisations-browser.cjs` | UI simulée | Réussi |
| `tests/mir-studio-wall-sections-browser.cjs` | UI simulée | Réussi |
| `tests/mir-job-dossier-browser.cjs` | UI simulée | Réussi |
| `tests/mir-production-signature-browser.cjs` | UI simulée | Réussi |
| `tests/mir-production-client-flow-browser.cjs` | UI simulée | Réussi |
| `tests/mir-unified-dossier-browser.cjs` | UI simulée | Réussi |
| `tests/mir-atelier-v4-browser.cjs` | UI simulée | Réussi |

### Scénarios SQL chat détaillés

- migration complète deux fois, définitions et ACL identiques
- ACL historiques service_role et policies Storage conservées
- privé existant, pièce jointe et historique préservés
- équipe autorisée, non-membre refusé
- retiré équipe refusé immédiatement, privé conservé, réintégration
- nouveau membre sans copie historique autorisé
- chantier selon autorisation existante, cinq rôles
- unicité chantier organisation, équipe distincte
- deux tenants isolés, y compris Admin
- même job_id dans deux tenants: conversations officielles distinctes
- retiré chantier refusé et réintégré sans toucher aux participants
- envoi idempotent, notifications et reçus sans doublons
- réutilisation request_id dans autre conversation refusée
- lecture seulement pour soi, invalide/null/refus retrait
- non-lus et notifications cohérents après lecture
- pagination messages stable aux égalités de temps, sans trou ni doublon
- limite serveur imposée et curseur étranger refusé
- recherche bornée seulement dans conversations autorisées
- objet valide vérifié côté serveur et rattaché par envoi
- attachment_path forgé / fichier inexistant refusés par RPC historique
- fichier autre tenant, conversation et propriétaire refusés
- MIME, extension, taille, metadata manquante refusés
- metadata absente, propriétaire forgé et extension incohérente refusés
- Storage RLS retrait immédiat et aucune lecture inter-tenant
- Storage ne permet ni pièce jointe invalide ni suppression rattachée
- chantier archivé lisible, envoi refusé, historique conservé
- chantier archivé: téléversement Storage refusé
- tables privées, anon refusé, grants et search_path explicites
- snapshot historique borné conserve champs et statuts UI
- recherche paginée sans doublon ni trou
- conversations paginées stables, limite serveur et dernières activités
- matrice privée Employé/Chef/Adjointe/Boss/Admin historique inchangée
- membership inactive: lecture recherche fichiers envoi refusés
- non-lus et notifications retirés masqués sans effacer historique
- répétition après données, aucun historique ni objet modifié
- dérive manuelle refusée sans modification partielle

En plus : état partiel job_id seul, fonction existante différente, bucket public, métadonnées Storage incompatibles et droit direct dangereux. Tous les cinq refusent l’installation sans modification partielle.

Les suites de non-régression couvrent Punch et banque, Aujourd’hui (structure trois cartes), navigation employé/Chef/Boss, authentification, dossier chantier, Boutique, Pliage, Magasin, Entrepôt, accueil, Réalisations, Studio et atelier. Aucun échec préexistant n’a été observé sur les 38 suites sélectionnées. Aucune autre suite n’est implicitement déclarée validée.

Adaptations de tests existants : les deux fixtures SQL intégrant toutes les migrations ont maintenant les colonnes Storage présentes sur le vrai service. Le test Aujourd’hui n’autorise que le bloc API chat délimité et ses exports; tous les autres octets du client, dont Punch/session, restent figés. Son répertoire de captures est redirigeable pour ne pas écraser les preuves Phase 2. Pendant le développement, le faux contrat d’envoi UI a été corrigé pour retourner snapshot; la garde de catalogue a été corrigée pour les NOT NULL de PostgreSQL 18. Ce ne sont pas des échecs préexistants masqués; les assertions finales passent sans relaxation des protections.

### Captures UI simulées

- [390 × 844](captures/chat-phase3a/chat-390.png)
- [1440 × 900](captures/chat-phase3a/chat-1440.png)

Les six formats testés : 360 × 800, 390 × 844, 430 × 932, 768 × 1024, 1024 × 768 et 1440 × 900. Ces captures utilisent uniquement des noms/messages fictifs; elles ne prouvent pas un test sur téléphone physique.

## Reproduction locale

Après installation des dépendances verrouillées de tools/database et de Playwright 1.58.2, exécuter :

```bash
MIR_CHROMIUM_BIN=/chemin/vers/chromium node tools/validation/mir-chat-phase3a-local.cjs
```

Certaines suites historiques imposent channel=chrome. Ici, elles ont été exécutées avec un adaptateur temporaire Playwright qui remplace seulement ce canal par /usr/bin/chromium, sans modifier assertions, délais ou code applicatif. Le runner accepte MIR_CHROMIUM_PRELOAD pour cet adaptateur. Les sorties générées vont dans /tmp/mir-chat-phase3a-validation par défaut; aucun secret n’est requis.

Le nouveau workflow de PR est limité aux tests locaux/artefacts, permissions contents:read, sans déploiement ni accès aux secrets. Les workflows existants peuvent lancer leur certification de base MIR TEST sur la PR; même réussie, elle ne certifierait pas les nouvelles RPC tant que cette migration n’est pas appliquée. Les résultats locaux ci-dessus ne sont pas des résultats CI.

## Limites et décisions avant MIR TEST

1. **Autorisation distincte requise** pour appliquer la migration uniquement à `hxtztkmbfpmzrieccwsg`, puis pour les données/affectations de recette isolées. Aucun nouveau compte ne doit être créé; utiliser les comptes de test existants et deux organisations de recette.
2. **Aucun test réel de cette version du clavardage sur MIR TEST** : les nouvelles RPC y sont absentes. Sessions réelles, HTTP Storage, émission et expiration des URL, concurrence PostgreSQL multi-connexion et comportement réseau restent à certifier. Ne jamais transformer les résultats PGlite ou UI simulés en certification hébergée.
3. L’isolation de deux tenants, y compris deux chantiers partageant le même job_id, est réellement exécutée dans le moteur SQL jetable avec identités fictives. Ce n’est pas une certification inter-tenants Supabase réelle.
4. Les URL du client sont signées pour **300 secondes**. RLS refuse immédiatement les nouvelles requêtes après retrait; **une URL déjà émise peut rester utilisable jusqu’à expiration**. La durée est une valeur du client/API Storage, pas un plafond universel SQL ni une révocation instantanée de tous les liens. Confirmer cette fenêtre ou demander une architecture de téléchargement à révocation stricte avant recette hébergée.
5. MIME, taille, propriétaire et chemin sont validés contre les **métadonnées Storage serveur**, pas user_metadata. Aucune analyse antivirus ou inspection binaire n’a été ajoutée. Vérifier les vrais objets Storage pendant la recette, notamment HEIC/HEIF et owner_id.
6. La recherche est limitée aux corps des messages et bornée en résultats. Le coût sur un gros historique réel n’est pas mesuré; index temps/organisation présents, pas d’extension ni de moteur de recherche supplémentaire.
7. Ne pas publier ce frontend avant la migration backend compatible. Ne pas fusionner automatiquement. Aucune prochaine phase commencée.

## Fichiers exacts de la Phase 3A

- `.github/workflows/mir-chat-phase3a-pr.yml`
- `dist/chantier-app.js`
- `dist/chantier.html`
- `dist/portal-client.js`
- `docs/verification/captures/chat-phase3a/chat-1440.png`
- `docs/verification/captures/chat-phase3a/chat-390.png`
- `docs/verification/mir-chat-phase3a-permissions.md`
- `docs/verification/mir-chat-phase3a-results.json`
- `docs/verification/mir-chat-phase3a-security.md`
- `supabase/migrations/20261112114958_chat_phase3a_security.sql`
- `tests/fixtures/mir-chat-baseline.json`
- `tests/fixtures/mir-chat-database.cjs`
- `tests/fixtures/mir-chat-hosted-functions.json`
- `tests/mir-chat-phase3a-browser.cjs`
- `tests/mir-chat-phase3a-guards.cjs`
- `tests/mir-chat-phase3a-postgres.cjs`
- `tests/mir-chat-phase3a.cjs`
- `tests/mir-employee-operations-postgres.cjs`
- `tests/mir-job-dossier-postgres.cjs`
- `tests/mir-today-browser.cjs`
- `tests/mir-today.cjs`
- `tools/validation/mir-chat-phase3a-local.cjs`

Empreintes des fichiers de code/test/workflow incluses dans le JSON. Les modules approuvés hors de cette liste n’ont pas été modifiés. L’arbre suivi sera propre après le commit documentaire. Le fichier utilisateur préexistant `MIR-PHASE-1-CODEX.patch`, non suivi dès le début, est conservé et exclu des commits; il empêche seulement de qualifier l’ensemble des fichiers non suivis de « vide ».

## Livraison et reprise

Quatre commits dédiés, base main conservée; dernier commit réservé aux preuves. Pousser uniquement la branche dédiée et ouvrir une PR en brouillon, sans fusion. Le SHA final du commit documentaire et les liens distants sont remis dans le message de livraison pour éviter une référence circulaire au SHA du document lui-même.

Prochaine action : examiner la PR et ces limites, puis autoriser séparément la migration MIR TEST et sa recette réelle. **Aucune migration ni écriture MIR production autorisée dans cette phase.**
