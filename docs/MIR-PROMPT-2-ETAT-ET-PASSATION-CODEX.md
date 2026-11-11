# MIR — État exhaustif et passation d’exécution du Prompt 2 pour Codex

## Addendum courant — Phase 3C, 11 novembre 2026

La Phase 3C est développée sur `codex/phase-3c-centre-aide-soutien`, depuis la tête 3B `62bb65d8d01f521ee9feec63db9a2820070fb735`, elle-même dépendante de 3A `f5c2aa04450d708a8f86da51bc3c778d0ebf75e7`. Les certifications 3A/3B n’ont pas été rejouées.

Sur MIR TEST uniquement, les migrations `phase3c_help_support_hardening`, `phase3c_support_create_fix` et `phase3c_support_account_category` sont installées. Le Centre d’aide Harmony s’ouvre partout sans navigation, filtre FAQ/procédures côté serveur, expose recherche/catégories et états chargement/vide/erreur/hors ligne. Le soutien fournit demandes structurées idempotentes, suivi, routage Adjointe, notifications, pièces privées existantes et notes internes exclues du snapshot client.

Preuves : recette hébergée **7/7** avec trois sessions Auth réelles; recette Chromium privée MIR TEST **9/9** à 390×844, 768×1024 et 1440×900; tests locaux ciblés **20/20**. Verdict : **PARTIELLEMENT VALIDÉ**, car l’isolation bidirectionnelle propre aux tables de soutien entre deux organisations et l’envoi navigateur complet photo/PDF restent à exécuter. Voir `docs/verification/mir-phase3c-help-support.md`. Production et publication publique intactes.

## Addendum courant — Phase 3B, 11 novembre 2026

La Phase 3A reste certifiée sur MIR TEST et n’a pas été rejouée. La branche 3B `codex/phase-3b-clavardage-mobile` dépend explicitement de sa tête `f5c2aa04450d708a8f86da51bc3c778d0ebf75e7`, car la PR #4 n’était pas fusionnée au démarrage.

Le parcours mobile Harmony liste → conversation → pièce jointe est consolidé localement : privé/équipe/chantier, recherche, pagination, non-lus, photos et PDF par `mir-chat-files`, brouillons, hors ligne, protection d’envoi, chargement/vide/erreur/refus et dispositions téléphone/tablette/ordinateur. La recette Playwright passe sur six formats; les contrats 3A, Aujourd’hui et six rôles restent verts. Voir `docs/verification/mir-chat-phase3b-mobile.md`.

Extension PDF installée uniquement sur MIR TEST : migrations `chat_phase3b_pdf_attachments`, `chat_phase3b_pdf_gateway_acl` et `chat_phase3b_pdf_attestation_constraint`, `mir-chat-files` v2 et `mir-chat-tenant-b-recipe` v3. Le bucket privé reste borné à 10 MiB; les PDF sont inspectés comme documents passifs et passent par les mêmes contrôles Auth/organisation/conversation que les images, sans accès Storage direct. Aucun objet production n’a été modifié.

Verdict courant 3B : **CERTIFIÉ sur MIR TEST en recette intégrée privée**. Au SHA fonctionnel `b6296c0fa9ac86e11fa08e9d2c94f553892adc2f`, 22/22 contrôles navigateur avec deux sessions Auth réelles réussissent : conversations, recherche, pagination, PNG/PDF par `mir-chat-files`, non-lus/reçus, brouillon hors ligne, envoi unique, refus 403 après retrait et navigation téléphone/tablette/ordinateur. Les affectations temporaires ont été restaurées. Cette preuve complète la recette backend 25/25 et l’isolation A↔B du run `43084321137`; elle ne les rejoue pas. Le frontend n’est pas publié et les autres documents restent refusés. Production intacte; aucune Phase 3C ni refonte publique commencée.

## Addendum courant — Phase 3A, 11 novembre 2026

La consigne historique de commencer la Phase 1 est remplacée par la reprise courante : seule la Phase 3A est active. Sur MIR TEST `hxtztkmbfpmzrieccwsg`, la préparation `chat_phase3a_private_file_gateway`, la fonction Edge `mir-chat-files` v1 (`verify_jwt=false` avec vérification Auth explicite) et l'activation `chat_phase3a_private_file_activate` sont réellement installées. MIR production n'a reçu aucune mutation.

Preuve hébergée courante : run GitHub `43052372399`, SHA `74d805179270a2aec86bebf7168b8444a6e4ff02`, **38/38 contrôles du nouveau circuit réussis**. En plus des refus Storage directs et contrôles binaires déjà acquis, le retrait du chantier QA refuse une nouvelle lecture réseau, la réintégration la réautorise, l’expiration naturelle du JWT après environ une heure refuse une nouvelle lecture en 401 sans modification de durée globale, la déconnexion invalide l’ancienne session, la nouvelle session est autorisée et les deux affectations QA sont restaurées. Le client refuse aussi une réponse tardive de l’ancienne session. L'ancien runner échoue comme attendu sur son upload direct après activation.

Verdict courant : **CERTIFIÉ pour la Phase 3A sur MIR TEST**. La recette ponctuelle tenant B autorisée a créé un seul Employé interne dédié, son membership, son chantier et sa conversation de recette, sans modifier le client B existant. Le run `43067261753`, au SHA `be90c35bb41def96a91cf90503b5c0b430d5369f`, réussit **10/10 contrôles** : accès positifs A et B, refus croisés A→B et B→A sur conversation et fichiers, avec authentification Supabase réelle. Le mot de passe aléatoire n’a existé qu’en mémoire du processus, aucune réponse Auth ou jeton n’a été journalisé, puis les variables sensibles ont été libérées. Cette preuve ponctuelle ne rend pas la recette B récurrente en CI sans secrets configurés.

Date de l’audit : 10 novembre 2026  
Dépôt vérifié : `revetementsmir/Revetements-mir-`  
Branche vérifiée : `main`  
SHA vérifié : `2f30fd11146a374b3670a153cd0f441364745a8f`  
Production : <https://revetementsmir.github.io/Revetements-mir-/>  
Référence lue intégralement : `MIR-PROMPT-2-CONSOLIDE.md`, version Bibliothèque du 10 novembre 2026, 417 lignes.

## 1. Règles impératives de reprise

1. Partir du `main` courant et revérifier son SHA avant tout travail.
2. Ne pas reconstruire le site et ne pas remplacer les modules existants.
3. Préserver intégralement le Punch, la Boutique, le Pliage, le Magasin employé, l’Entrepôt, les Réalisations, le Studio et l’accueil approuvé.
4. Ne pas refaire une fonction classée « déjà terminée » ci-dessous.
5. Une seule phase à la fois. Aucun développement parallèle entre phases.
6. Toute autorisation doit être appliquée côté Supabase par RPC/RLS/Storage; masquer un bouton ne suffit pas.
7. Aucun push sur `main`, aucune migration hébergée et aucune publication sans validation explicite.
8. Utiliser MIR TEST pour les mutations et la certification intercomptes. Ne jamais tester une mutation métier en production.
9. Toute donnée fabricant non confirmée demeure brouillon/non achetable.
10. Toute décision indiquée « à confirmer » reste bloquante; ne rien inventer.

## 2. État actuel vérifié

### Git et publication

- `main` est propre au clone et pointe sur `2f30fd1` — `fix(portail): présenter le rôle technique admin comme Boss`.
- Le correctif ne change pas les permissions : il adapte seulement le libellé opérationnel retourné par `mir_employee_operations_snapshot`.
- Les commits immédiatement antérieurs couvrent la certification MIR TEST et le Punch Phase 2.
- Le workflow de publication Pages existe dans `.github/workflows/pages.yml` et publie `dist/` après une large suite statique et navigateur.
- Le workflow `.github/workflows/mir-real-role-certification.yml` sépare correctement UI/SQL simulés et six sessions réelles MIR TEST.
- Le rapport versionné `docs/verification/mir-real-role-certification.md` cite une exécution réelle réussie, puis les commits plus récents renforcent la recette. L’audit présent n’a pas relancé les six comptes, car leurs secrets ne sont pas exposés localement.

### Vérifications locales effectuées pendant cette passation

- Contrat de certification des six rôles : **7/7 réussi**.
- Validation locale RLS/RPC PGlite : **4/4 réussi** après installation des dépendances verrouillées de `tools/database`.
- Navigation Phase 1 et libellés des rôles : **réussi**.
- Authentification/portail : **9/9 réussi**.
- Coordination métier : **20/20 réussi**.
- Contrat Entrepôt SQL : **réussi**.
- Régressions principales Pages/Pliage/Studio/sauvegardes : **41/41 réussi**.
- Aucun fichier de production, migration existante ou workflow n’a été modifié par l’audit.

### Fondations déjà publiées à préserver

- Organisation, memberships, modèles privés, versions, publications explicites, commandes, lignes, révisions, événements et documents dans `mir_core`.
- `jobs` et `job_memberships` avec contrôle `job_allowed`.
- Rôles Staff/équipes, messagerie interne, extras, réception/litiges de livraison, demandes RH, activité chantier, notifications et rappels.
- Dashboards Chef/Boss, tâches, présence, rapports quotidiens, demandes de matériel et problèmes terrain.
- Gestion/finance : clients, estimations, versions, extras financiers, temps, finances chantier, factures/paiements, permissions et audit.
- Punch Phase 1 et 2 : heure serveur, événements GPS ponctuels, segments, corrections, dîner, périodes, banque d’heures, journal et audits.
- Logistique/Entrepôt publiée : véhicules, tournées, chargement, transferts d’inventaire, inspections, preuves de livraison et audit.
- Boutique/Pliage : tarification au pliage, règles de livraison déjà codées, publication de modèles, catalogue et prix régionaux.
- Coordination commande complète existe en code, tests et dans les deux bases hébergées. Ses fichiers principaux sont toutefois encore classés sous `supabase/proposals/`; l’historique local doit être réconcilié avant toute évolution.

## 3. Matrice réelle du Prompt 2

Les statuts peuvent se cumuler lorsqu’une fondation existe mais qu’une migration ou une validation reste requise.

| Exigence | Preuve actuelle | Classement réel | Travail restant |
|---|---|---|---|
| Six rôles et Admin affiché Boss | migrations `20261110120000` et `20261110170000`, workflow de certification | Déjà terminée; exige comptes réels pour toute nouvelle certification | Ne pas modifier sauf régression prouvée |
| Invitations réelles, attribution/désactivation/reset par Simon/Esther | invitations de compte présentes; administration complète non démontrée pour Boss/Adjointe | Partiellement terminée; exige migration; exige comptes réels | Concevoir les actions serveur et l’audit sans donner les paramètres techniques au Boss |
| Pièce privée / modèle privé / publication explicite | tables modèles/versions/publications et tests de sauvegarde | Déjà terminée pour la fondation | Vérifier l’immutabilité historique dans les futures phases, ne pas refaire |
| Dossier chantier central par `job_id` | `jobs`, memberships, documents, activité, opérations, gestion et logistique existent mais sans snapshot central complet | Partiellement terminée; exige migration; exige validation visuelle | Unifier la lecture/écriture et les onglets autour d’un seul dossier |
| Aujourd’hui mobile | `mir_lead_today_snapshot`, équipes, présence, tâches, matériel, problèmes et rapports existent | Partiellement terminée; exige validation visuelle; météo absente | Construire le tableau mobile harmonisé sans refaire Punch |
| Avancement 10–70 % ou Terminé à la fermeture | aucune donnée canonique prouvée dans Punch | Absente; exige migration; exige comptes réels | Ajouter progression versionnée et notification Boss/Adjointe |
| Punch/GPS/dîner/corrections/hors ligne | Phase 1/2 publiée; file hors ligne UI existante à préserver | Déjà terminée pour le périmètre Phase 1/2; validation réelle continue | Ne pas réécrire; seulement intégrer aux nouvelles vues |
| Mes heures, banque, verrouillage, exports | tables/RPC Punch et gestion présentes; vues/export complets non prouvés | Partiellement terminée; exige validation visuelle | Phase ultérieure hors priorité explicite, après le socle Prompt 2 |
| Dépenses avec photo/OCR/TPS/TVQ | aucune table/RPC de dépense dédiée ni OCR | Absente; exige migration; exige validation visuelle; exige comptes réels | Nouvelle phase complète |
| Absences vacances/congé/maladie | `hr_requests`, `mir_hr_submit`, `mir_hr_decide` | Partiellement terminée; exige migration; exige validation visuelle | Ajouter cédule, historique complet, statuts/correction et notifications |
| Commandes Adjointe → Entrepôt/fournisseurs | logique/UI/tests et objets hébergés présents; SQL local dans `supabase/proposals/` | Partiellement terminée; exige réconciliation des migrations; exige comptes réels | Ne pas réappliquer les propositions; reconstituer d’abord une base locale fidèle |
| Envoi fournisseur réellement confirmé | file d’envoi, tentatives et service serveur présents | Partiellement terminée; exige comptes réels | Vérifier fournisseur réel, échec conservé et audit avant statut Envoyé |
| Notifications fines lu/non lu/lien | table/RPC de base publiée | Partiellement terminée; exige migration; exige validation visuelle | Préférences, types complets, déclencheurs et centre consolidé |
| Centre d’aide/FAQ/clavardage client | messagerie interne seulement; pas de centre client/FAQ/notes internes complet | Partiellement terminée; exige migration; exige validation visuelle; exige comptes réels | Étendre sans casser les conversations internes existantes |
| Estimation envoyée sans `mailto:` | Edge/service d’estimation et tests réels déjà présents | Déjà terminée | Ne pas refaire; conserver `estimation@revetementsmir.com` |
| Thèmes exacts et accessibilité | quelques couleurs/harmonisation existent, pas le système exact/persistant | Absente; exige migration; exige validation visuelle | Ajouter préférences profil et tokens globaux sans changer la structure |
| Réglages langue/unités/notifications/sessions | compte/adresses présents; ensemble incomplet | Partiellement terminée; exige migration | Traiter avec thèmes/notifications, 2FA bloquée par décision |
| Catalogue privé de soumissions | gestion/finance existe mais périmètre exact non confirmé | Bloquée par une décision | Ne pas coder avant confirmation |
| Livraison 60/300/40/80 | migration Boutique déjà présente | Déjà terminée techniquement; bloquée par décision pour modification Prompt 2 | Ne pas toucher tant que portée non confirmée |
| Catalogue/accessoires Prompt 2 | PRIME, joints CanExel, départ/anti-rongeur et vis fascia partiellement présents; J génériques et membrane 3 po subsistent | Partiellement terminée; exige validation fabricant; exige validation visuelle | Audit anti-doublon et ajouts ciblés seulement |
| Dix modèles de pliage | profils actuels et 11 profils testés; les dix exacts du Prompt 2 ne sont pas tous prouvés | Partiellement terminée; bloquée par décisions; exige validation visuelle | Réutiliser le moteur, remplacer seulement le jeu « Consulter nos modèles » après confirmations |
| Application Android Capacitor | aucun projet Capacitor/Android trouvé | Absente; exige comptes réels; exige validation sur appareil | Dernière phase seulement |

## 3.1 Inspection Supabase hébergée — lecture seule

Inspection directe effectuée le 10 novembre 2026, sans écriture :

| Environnement | Projet | État | Constat |
|---|---|---|---|
| MIR TEST | `hxtztkmbfpmzrieccwsg` | `ACTIVE_HEALTHY` | 51 migrations; Punch Phase 1/2, rôles opérationnels, centre client, préférences, administration, coordination, gestion et logistique présents |
| MIR production | `gccltmaulvrnthrbnrpd` | `ACTIVE_HEALTHY` | 27 migrations; coordination, opérations employés, gestion, logistique et prix présents; aucune table/RPC Punch ni rôle opérationnel Phase 1 observé |

Écarts importants :

- MIR TEST contient des migrations absentes du clone actuel, notamment toute la série administration/dossier central et `client_center_20261110`.
- La production contient la coordination/entrepôt alors que les fichiers correspondants du dépôt sont encore rangés sous `supabase/proposals/`.
- Le dépôt contient les migrations Punch Phase 1/2, mais l’inspection directe de MIR production ne retourne ni tables `punch_*` ni RPC `mir_punch_*`. La « Phase Punch publiée » est donc prouvée sur le site et MIR TEST, pas sur la base MIR production inspectée.
- MIR TEST possède `account_preferences`, `help_faq`, `support_conversations`, `support_messages`, `support_attachments` et leurs RPC; ces objets sont absents de MIR production et leur migration n’est pas dans le clone.
- MIR TEST expose deux Edge Functions actives, `mir-estimates` et `mir-admin-delivery`; MIR production n’en expose aucune.
- Les deux environnements ont RLS activé sur toutes les tables `mir_core` et `mir_estimates` retournées. Cela ne remplace pas la revue détaillée des policies et des fonctions `SECURITY DEFINER`.

Conclusion : ne jamais prendre le dossier local, MIR TEST ou MIR production comme copie exacte des deux autres. La première étape d’implémentation doit réconcilier les migrations manquantes dans le dépôt, sans appliquer quoi que ce soit à la production.

## 3.2 Matrice exhaustive — sections 1 à 19

Légende test : **Réel** = vérifié sur MIR TEST ou service réel par une preuve versionnée/inspection directe; **Simulation** = PGlite, contrat statique ou navigateur simulé; **Non testé** = aucune preuve trouvée. Un élément peut être partiel même s’il possède un test réel.

### Section 1 — Rôles et propriété

| Exigence | État | Test | Fichiers / objets associés |
|---|---|---|---|
| Boss Simon, Adjointe Esther, Chef, Employé, Entrepôt, Admin conservé | Terminée sur MIR TEST; partielle en production | Réel + simulation | `20261110120000_operational_roles_phase1.sql`; `operational_role`; `mir_my_operational_access`; `tests/mir-six-role-certification.cjs` |
| Dashboards/actions Boss avec restrictions techniques | Partielle | Réel pour permissions principales; simulation UI | `mir_boss_operations_snapshot`, `mir_boss_action`; `mir-management-*.cjs` |
| Adjointe heures, dépenses, absences, commandes, fournisseurs, rapports | Partielle | Réel pour rôle; simulation pour modules existants | `management_finance`, coordination, `mir_hr_decide`; dépenses absentes |
| Admin comptes/rôles/config/inventaire/véhicules/permissions/audit | Partielle; TEST plus avancé que dépôt | Réel partiel | RPC `mir_administration*`, `mir_admin_logistics_action`; migrations TEST non présentes localement |
| Entrepôt limité préparation/expédition/inventaire | Terminée pour socle | Réel permissions + simulation métier | tables warehouse/logistics; `mir_warehouse_*`, `mir_logistics_*`; tests warehouse |
| Chef/Employé limités aux chantiers autorisés | Partielle | Réel permissions + simulation | `job_memberships`, `job_allowed`, `mir_lead_today_snapshot` |
| Simon/Esther invitent, attribuent rôle, désactivent, reset mot de passe | Partielle | Réel invitation seulement; reste non testé | `account_invitations`, `mir_account_create_invitation`; RPC admin TEST |
| Invitations Supabase réelles, mot de passe choisi à la première connexion | Partielle | Réel invitation/acceptation; parcours complet non testé | `mir_portal_accept_invitation`; `mir-account-*.cjs` |
| Propriété MIR, Simon principal, accès secours | À confirmer / bloquée par gouvernance | Non testé | Aucun objet technique ne prouve la propriété/facturation ou le secours |

### Section 1.1 — Modèles privés, production et publication

| Exigence | État | Test | Associés |
|---|---|---|---|
| Pièce privée, modèle privé, produit publié distincts; privé par défaut | Terminée pour fondation | Simulation | `models`, `model_versions`, `model_publications`; tests sauvegarde/publication |
| Mesures persistantes, défauts et verrous | Partielle | Simulation | `model-measure-defaults.js`, `mir-bending-presets.js` |
| Publication explicite et journalisée | Terminée | Simulation SQL | `publish_model`, `mir_admin_publish_model` |
| Historique commande immuable, réutilisation sans redessiner | Partielle | Simulation | `orders`, `order_revisions`, `order_events`; sauvegarde testée |
| Import/export sans écrasement ni commandes historiques | Terminée pour sauvegarde locale; partielle serveur | Simulation | `template-library-backup.js`, `mir_import_master`; tests Pages |

### Section 2 — Dossier chantier central

| Exigence | État | Test | Associés |
|---|---|---|---|
| Un `job_id` regroupe tous les domaines | Partielle; TEST possède `mir_job_detail` mais migration absente du dépôt | Réel partiel + simulation | `jobs`, `job_memberships`, `job_activity`, `job_documents`, `mir_job_detail`, `chantier-app.js` |
| Historique après fermeture | Partielle | Simulation | `job_activity`, événements commandes/audits; état fermé canonique à confirmer |
| Accès par rôle/chantier | Partielle | Réel principal | `job_allowed`, RLS/RPC, certification six rôles |
| Audit auteur/horodatage actions sensibles | Partielle | Simulation | `management_audit`, `logistics_audit`, `punch_audit`, `admin_events` TEST |

### Section 3 — Aujourd’hui

| Exigence | État | Test | Associés |
|---|---|---|---|
| Météo courte | Absente | Non testé | Aucun service/composant météo trouvé |
| Chantier/adresse/GPS/itinéraire/appel/dossier | Partielle | Simulation UI | `mir_lead_today_snapshot`, `chantier-app.js` |
| Présence, tâches, matériel, problème/extra photo urgence, rapport | Partielle | Simulation | tables `team_attendance`, `team_tasks`, `material_requests`, `field_issues`, `daily_reports`; `mir_lead_action` |
| Chef voit équipe/chantiers sans salaires/profits | Partielle | Réel permissions + simulation | snapshot Chef; tests Chef/Boss |
| Employé voit uniquement affectations autorisées | Partielle | Réel permissions + simulation | `job_allowed`, portail employé |
| À fermeture : avancement 10–70 % ou Terminé, temps réel Simon/Esther | Absente | Non testé | Nouvelle donnée/RPC/notification requis |

### Section 4 — Punch, GPS, dîner, hors ligne

| Exigence | État | Test | Associés |
|---|---|---|---|
| Module activable, heure serveur, GPS ponctuel, aucun suivi continu | Terminée sur TEST/site; absente DB production inspectée | Réel TEST + simulation | migrations Punch; `punch_settings/events`; `mir_punch_action` |
| Waze/Google/Apple Plans | Partielle | Simulation UI | portail/chantier; couverture exacte à compléter |
| Punch continu et segments chantier | Terminée TEST | Réel + simulation | `punch_shifts`, `punch_segments` |
| Hors ligne et synchronisation | Partielle | Simulation | file locale dans UI Punch; appareil réel non testé |
| Aucun bouton pause | Terminée | Simulation UI | `mir-punch-browser.cjs` |
| Dîner 0 min ≤5 h; 15 min >5 h; exception approuvée | Terminée TEST | Réel + simulation | Phase 2 Punch; tests postgres/browser |
| Correction complète et versionnée | Terminée TEST | Réel + simulation | `punch_corrections`, `mir_punch_correction`, journal |

### Section 5 — Heures et banque

| Exigence | État | Test | Associés |
|---|---|---|---|
| Mes heures semaine/mois/année et historiques/totaux | Partielle | Simulation | `time_entries`, Punch snapshots; UI complète non prouvée |
| Confirmation/modification, banque, feuilles, statut | Partielle | Simulation | `time_bank_movements/requests`, corrections |
| Verrouillage/réouverture auditée | Partielle | Simulation | `time_periods`, `mir_punch_admin` |
| PDF/CSV/Excel/paie | Absente ou non démontrée | Non testé | Aucun export complet associé trouvé |

### Section 6 — Dépenses

| Exigence | État | Test | Associés |
|---|---|---|---|
| Photo facture, OCR fournisseur/sous-total/TPS/TVQ/total, validation employé, original conservé | Absente | Non testé | Aucun table/RPC/Edge Function de dépense |
| Traitement Esther et six statuts, historique | Absente | Non testé | Migration/UI/tests requis |

### Section 7 — Absences

| Exigence | État | Test | Associés |
|---|---|---|---|
| Vacances/congé/maladie, dates/note/statut/approbation | Partielle | Simulation | `hr_requests`, `mir_hr_submit`, `mir_hr_decide` |
| Effet cédule et historique complet | Absente/partielle | Non testé | aucune révision/cédule d’absence canonique prouvée |

### Section 8 — Commandes Adjointe/Entrepôt

| Exigence | État | Test | Associés |
|---|---|---|---|
| Routage Chef/Employé → Adjointe → Entrepôt/fournisseur | Terminée dans DB TEST/prod et logique; dépôt mal classé | Simulation métier; réel permissions partiel | tables coordination; RPC `mir_coordination_*`; proposals 006–009 |
| Tri par ligne, plusieurs bons, contexte job/adresse/équipe, ajouts avant expédition | Terminée socle | Simulation 20/20 | `mir-order-coordination.js`; tests coordination |
| Catégories/champs configurables, unités/quantité | Partielle | Simulation | catalogue/coordination; configurateur complet non prouvé |
| Bon fournisseur, brouillon, envoi réel/échec journalisé | Partielle | Réel pour estimation, non prouvé fournisseur complet | `send_jobs/attempts`, serveur fournisseur, RPC supplier TEST |
| Quatre fournisseurs de pliage et documents complets | Partielle | Simulation | fournisseurs/catalogue/PO; données exactes à vérifier |
| Entrepôt QR, mouvements, notifications ajustement | Terminée socle | Simulation + réel permissions | warehouse tables/RPC/UI/tests |
| Statuts reçue/traiter/shop et production à produire→livré | Partielle | Simulation | coordination + production; contrat transversal incomplet |
| Marquer embarqué retire stock; expédition ferme avec historique | Terminée socle | Simulation | warehouse/coordination ops et tests |

### Section 9 — Apparence et accessibilité

| Exigence | État | Test | Associés |
|---|---|---|---|
| Exactement Automatique, MIR clair, MIR sombre, Haute visibilité | Absente dans production; préférences seulement dans TEST | Non testé | `account_preferences` TEST; CSS actuels non conformes au système complet |
| Accents vert/bleu/orange/graphite, défaut Auto+vert | Absente | Non testé | migration/tokens requis |
| Statuts rouge/orange/vert fixes | Partielle visuellement | Simulation ponctuelle | CSS multiples; audit global requis |
| Texte, contraste, réduction animation, cibles 44 px | Partielle | Simulation ponctuelle | tests UI existants, pas de réglage global |
| Persistance instantanée téléphone/tablette/PC | Absente/partielle TEST | Non testé réel multiappareil | RPC préférences TEST |

### Section 10 — Autres réglages

| Exigence | État | Test | Associés |
|---|---|---|---|
| Langue, unités, coordonnées/adresse, notifications, dashboard rôle | Partielle | Réel adresse; reste non testé | account settings/address, dashboard preferences, account_preferences TEST |
| Notifications fines, lu/non lu et lien action | Partielle | Simulation | `notifications`, `mir_notification_read` |
| Sessions/appareils connectés | Absente | Non testé | aucun écran/table métier trouvé |
| 2FA Simon/Admin | À confirmer / bloquée | Non testé | décision requise |
| Catalogue privé soumissions | À confirmer / bloqué | Non testé | gestion finance existante, portée non décidée |
| Livraison 60/300/40/80 | Terminée techniquement en production; portée Prompt 2 à confirmer | Simulation | `boutique_bend_tariff.sql`, RPC distance/livraison |

### Section 11 — Centre d’aide, clavardage et navigation

| Exigence | État | Test | Associés |
|---|---|---|---|
| FAQ/demandes/chat client, transfert, statuts, non lus, pièces, notes internes | Partiellement validée sur MIR TEST | Réel API 7/7 + navigateur privé 9/9; isolation bidirectionnelle soutien et envoi navigateur PDF à compléter | `help_faq`, `support_*`, `mir_client_center_snapshot`, `mir_support_*`; migrations Phase 3C versionnées; rapport `mir-phase3c-help-support.md` |
| Clavardage interne mobile : photo/PDF privés, recherche, pagination, non-lus, brouillon, envoi unique, hors ligne | Partiel | Réel MIR TEST 25/25 + isolation A↔B; UI testée en simulation sur six formats | `mir-chat-files` v2; run `43084321137`; migrations `chat_phase3b_pdf_attachments`, `chat_phase3b_pdf_gateway_acl`, `chat_phase3b_pdf_attestation_constraint`; aucun repli Storage; frontend non publié |
| Navigation PC exacte et intégrations Matériaux/Nous joindre | Partielle | Simulation | `mir-public-menu.*`; tests menu |
| Navigation mobile fixe exacte | Partielle | Simulation | menu public/mobile; audit requis |
| Estimation envoyée directement à estimation@, jamais mailto, succès réel | Terminée | Réel | Edge `mir-estimates` TEST, service/recettes estimation |

### Section 12 — Sécurité et audit

| Exigence | État | Test | Associés |
|---|---|---|---|
| Sessions Supabase, RLS/RPC, isolation org/équipe/job | Partielle solide | Réel + simulation | toutes migrations, certification |
| Refus URL/actions directes | Partielle | Réel RPC + simulation UI | tests rôles/navigation |
| Fichiers privés serveur | Partielle | Simulation; réel incomplet | bucket `mir-internal`, `internal_object_allowed` |
| Audit domaines sensibles | Partielle | Simulation | audits punch/gestion/logistique; dépenses absentes |
| Déconnexion/expiration/renouvellement sans élévation | Partielle | Réel API + simulation; expiration UI réelle incomplète | tests session/certification |
| Aucun secret navigateur/log/capture | Partielle, garde-fous présents | Simulation/statique | scripts de certification et workflows |

### Section 13 — Catalogue et accessoires

| Exigence | État | Test | Associés |
|---|---|---|---|
| Couleurs produit distinctes de l’interface, codes fabricant | Partielle | Simulation catalogue | JSON catalogue, `commerce.js` |
| Vis soffite 5/8 carré no 1, fiche/accessoire, tête unique/couleurs réelles | Absente/partielle non confirmée | Non testé | modèle magasin contient vis diverses, fiche exacte non prouvée |
| Vis fascia 2 po Kaycan, une fiche/visuel tête | Partielle | Simulation | `commerce.js`, SVG/JSON Kaycan |
| J soffite 12 pi par fabricant, migration génériques sans doublon | Absente/partielle | Non testé | deux J génériques encore présents; fabricants non migrés |
| Membrane 3M 4/6/12 | Bloquée par contradiction avec 3 po existant | Non testé | produit 3 po brouillon présent |
| HardieBlade, lame sauteuse, PRIME 30644 | PRIME terminé; lames à vérifier | Simulation partielle | catalogue JSON/manifests |
| Joints CanExel, départ, anti-rongeur | Partielle/terminée socle | Simulation | `employee-store-model.js`, catalogue |
| Pots retouche image pot + vraie couleur | Partielle | Non testé visuel exhaustif | catalogue/images |
| Rouleaux noir/blanc et couleurs/longueurs/marques | Partielle; confirmations requises | Simulation | magasin/catalogue |
| Soffites Kaycan/TruVent distincts, titres/visuels harmonisés | Partielle | Simulation visuelle | catalogue/commerce |
| Spécial→soumission; pas RAL/inox/autre standard | Partielle | Simulation | catalogue/pliage; `ral-classic.json` existe encore comme ressource |

### Section 14 — Dix modèles de pliage

| Exigence | État | Test | Associés |
|---|---|---|---|
| Exactement dix profils, anciens génériques retirés | Absente/partielle : tests actuels annoncent 11 profils | Simulation | `mir-bending-presets.js`, `production-app.js`, tests Pages |
| 2D/3D/développé/prix/verrous | Moteur terminé; jeu exact incomplet | Simulation | moteur production, pricing, miniatures |
| Tarif 0,014/po², 1$/pli, double=1, 10 pi, alu +10 %, aucun rabais | Terminée pour moteur tarif | Simulation | bend tariff/pricing/tests |
| Fascia | Bloqué 5/8 vs 3/4 | Non testé final | profil existant partiel |
| Ailes de fenêtre | Bloqué données manquantes | Non testé final | aucun modèle canonique confirmé |
| Écoulement des eaux | Bloqué directions/angles/face | Non testé final | profil partiel |
| Goutte d’eau | Bloqué 8 vs 7 1/2 + géométrie | Non testé final | profil partiel |
| Sill Trim | Partielle | Simulation moteur, modèle exact à certifier | preset à ajouter/confirmer |
| Beam | Partielle/terminée géométrie existante | Simulation | preset beam + tests |
| Colonne | Partielle | Simulation | preset colonne |
| L transition verticale | Partielle | Simulation | presets existants à comparer |
| Capage climatiseur | Absente/non prouvée | Non testé | nouveau preset |
| Ventilation haut/bas + anti-rongeur lié | Partielle | Simulation moteur; liaison non prouvée | profils ventilation/anti-rongeur |

### Section 15 — Tests obligatoires

| Exigence | État | Test | Associés |
|---|---|---|---|
| Six rôles réels MIR TEST | Terminée pour base actuelle | Réel | workflow certification et rapport |
| Punch, corrections, dîner, historique, banque | Partielle à terminée TEST | Réel + simulation | tests Punch |
| Dépenses, absences complètes, aide, thèmes, catalogue exact, dix profils | Majoritairement absente/partielle | Non testé ou simulation partielle | suites futures requises |
| Formats 360/390/430, Android/iPhone/iPad/PC, tactile/clavier/offline | Partielle | Simulation Chromium; appareils réels non testés | nombreux tests browser/captures |
| Captures, matrice permissions, blocages avant “terminé” | Partielle | Simulation/réel selon module | docs/verification |

### Section 16 — Livrables

| Exigence | État | Test | Associés |
|---|---|---|---|
| Code/migrations/tests/matrice/captures/permissions/commits | Partielle par modules | Variable | dépôt/workflows/docs |
| Aucun push/publication sans validation | Règle à maintenir | Non applicable | cette passation ne pousse rien |
| Liste explicite des blocages | Terminée dans ce document | Inspection réelle | sections 3.2, 5 |

### Section 17 — Points à confirmer

| # | Décision | État test |
|---:|---|---|
| 1 | Fascia 5/8 ou 3/4 | Bloquée; non testée |
| 2 | Goutte 8 ou 7 1/2, géométrie/face | Bloquée; non testée |
| 3 | Ailes fenêtre géométrie/face | Bloquée; non testée |
| 4 | Écoulement géométrie/face | Bloquée; non testée |
| 5 | Royal Steel gamme/palette | À confirmer; non testée |
| 6 | Rouleaux et Royal/Vicwest | À confirmer; non testée réellement |
| 7 | Membrane 3 po ou 4/6/12 | Contradiction; non testée |
| 8 | Catalogue privé et 2FA | À confirmer |
| 9 | Livraison dans Prompt 2 | À confirmer malgré code existant |
| 10 | Blanc/tan, vis fascia, pots | À confirmer visuellement |
| 11 | Toute donnée fabricant non vérifiée reste brouillon | Règle confirmée; tests partiels |

### Section 18 — Matrice de couverture deuxième passe

La section 18 est une table récapitulative du document source, pas une nouvelle fonction. Toutes ses lignes sont reprises dans les sections 1 à 17 ci-dessus. Son statut global est **couvert dans cette matrice**, mais les états d’implémentation restent ceux des lignes détaillées; « Confirmé » dans le Prompt signifie exigence confirmée, pas développement terminé.

### Section 19 — Application Android privée

| Exigence | État | Test | Associés |
|---|---|---|---|
| Une app pour tous rôles, mêmes pages/permissions/redirection | Absente | Non testé | aucun Capacitor/Android trouvé |
| QR Entrepôt seulement | Règle backend existante; app absente | Simulation Web | warehouse permissions |
| Nom MIR, icône triangulaire adaptative | Absente | Non testé | logo SVG existe, assets Android absents |
| Capacitor, sessions, liens, téléchargements, caméra, hors ligne | Absente | Non testé | aucun projet natif |
| Mise à jour facultative/obligatoire, intégrité, source privée | Absente; distribution à décider | Non testé | aucun manifeste/version natif |
| APK test signée, procédure prod, tests six comptes/appareil réel | Absente | Non testé | décision signature/MDM requise |

## 3.3 Contradictions et divergences à résoudre avant développement

1. Le Prompt décrit le dépôt historique `revetementsmirweb/MIR`, mais la mission courante vise `revetementsmir/Revetements-mir-`; ce document suit le dépôt courant demandé.
2. Punch est publié et certifié dans MIR TEST/site, mais absent de la base MIR production inspectée. Ne pas appliquer automatiquement les migrations : confirmer d’abord si la production doit réellement héberger le portail interne.
3. Les migrations hébergées ne correspondent pas aux fichiers locaux : TEST contient des migrations non versionnées localement; production contient des migrations encore classées « proposals ».
4. Centre d’aide et préférences existent dans MIR TEST mais pas dans le clone ni la production.
5. Le Prompt demande exactement dix modèles; la suite actuelle vérifie onze profils.
6. La membrane 3 po existe en brouillon alors que Prompt 2 demande 4/6/12 po.
7. Fascia 5/8 vs 3/4; goutte 8 vs 7 1/2; ailes et écoulement incomplets.
8. Le rôle technique Admin est présenté comme Boss dans l’opérationnel, mais il ne doit pas absorber automatiquement les responsabilités métier de Simon.

## 4. Ordre d’exécution recommandé — une phase à la fois

### Phase 1 — Dossier chantier central

**But** : fournir un seul dossier opérationnel fondé sur `job_id`, sans déplacer ni dupliquer les modules existants.

**Fichiers probables**

- nouvelle migration `supabase/migrations/<timestamp>_job_dossier_central.sql`;
- `dist/chantier.html`, `dist/chantier-app.js`, `dist/chantier.css`;
- possiblement `dist/portal-client.js` pour le lien d’entrée seulement;
- nouveaux tests `tests/mir-job-dossier-postgres.cjs` et `tests/mir-job-dossier-browser.cjs`;
- workflow ciblé nouveau ou extension minimale de `mir-real-role-certification.yml` après validation.

**Migration / RPC / RLS**

- Éviter une nouvelle table `jobs`; enrichir l’existante seulement si une donnée canonique manque.
- Créer un RPC de snapshot central, par exemple `public.mir_job_dossier_snapshot(org, job)` qui compose les sources existantes.
- Créer des RPC d’action étroits uniquement pour les lacunes; ne jamais permettre des écritures directes générales.
- Réutiliser `mir_core.job_allowed`; vérifier Chef/Employé par affectation, Entrepôt par commande/livraison liée, Adjointe/Boss selon permission, Admin selon accès technique existant.
- Ajouter audit pour toute action sensible manquante; les historiques existants demeurent immuables.
- Storage privé : réutiliser `mir-internal` et étendre `internal_object_allowed` seulement si un nouveau type de document l’exige.

**Tests à créer**

- isolation organisation et chantier;
- accès autorisé/refusé pour les six comptes;
- URL directe interdite;
- dossier fermé lisible mais non modifiable selon rôle;
- agrégation équipe/adresse/plans/documents/tâches/rapports/heures/punchs/extras/demandes/commandes/fournisseurs/conversation;
- aucun doublon de donnée et aucune écriture dans les snapshots;
- Storage privé;
- responsive 360/390/430, tablette et PC;
- non-régression Punch, Boutique, Pliage, Magasin, Entrepôt, Réalisations, Studio et accueil.

**Rôles** : Boss, Adjointe, Chef, Employé, Entrepôt, Admin.

**Risques**

- contourner les règles existantes en agrégeant trop largement;
- confondre rôle technique Admin et rôle métier Boss;
- dupliquer commandes/documents au lieu de référencer leurs identifiants;
- ralentir le mobile avec un snapshot sans pagination;
- casser `chantier-app.js`, déjà utilisé par les portails et le Punch.

**Critères d’acceptation**

- un `job_id` ouvre toujours le même dossier;
- chaque section provient des tables canoniques existantes;
- aucun rôle ne voit une donnée interdite par URL directe ou RPC;
- fermeture conserve tout l’historique;
- actions sensibles auditées;
- navigation mobile simple, sans modifier les modules protégés;
- SQL jetable, UI simulée et six comptes MIR TEST verts;
- aucune publication avant captures et validation de Fred.

### Phase 2 — Tableau « Aujourd’hui » mobile

**Fichiers** : `dist/chantier.html`, `dist/chantier-app.js`, `dist/chantier-employee.css` ou nouveau module CSS/JS isolé; migration `today_progress`; tests SQL/UI.

**Migration/RPC/RLS** : réutiliser `mir_lead_today_snapshot`; ajouter progression chantier historisée, préférence météo/localisation minimale et RPC de fermeture; aucune collecte GPS continue.

**Tests** : rôle Chef/Employé, météo erreur/chargement, itinéraires Waze/Google/Apple, présence/tâches/matériel/problème-photo/urgence/rapport, progression 10–70/Terminé, temps réel Boss/Adjointe, hors ligne, 360–430 px.

**Rôles** : Chef, Employé; lecture Boss/Adjointe.

**Risques** : recréer le Punch, exposer salaires/profits, suivi GPS continu, page trop chargée.

**Acceptation** : maximum trois blocs prioritaires, une action principale, cibles 44 px, aucune donnée financière au terrain, synchronisation fiable.

### Phase 3 — Clavardage et Centre d’aide

**Fichiers** : nouveaux `dist/aide.html`, `dist/mir-help-center.js/css`; adaptation minimale des menus publics; migration `help_center`; tests SQL/UI.

**Migration/RPC/RLS** : étendre conversations/messages au type client/job; FAQ versionnée; tickets, statuts, transferts, non-lus, notes internes; RPC séparés client/staff; Storage privé.

**Tests** : client ne voit jamais notes internes; Esther reçoit/transfère; pièces jointes privées; non-lus; conversation liée au chantier; URL/RPC refusées; estimation existante intacte.

**Rôles** : Client, Adjointe, Boss, Entrepôt, employé autorisé.

**Risques** : mélanger chat interne et client, fuite de notes, casser navigation publique approuvée.

**Acceptation** : confirmation seulement après mutation réussie, brouillon conservé après échec, FAQ administrable selon permission.

### Phase 4 — Dépenses

**Fichiers** : migration `expenses`; module mobile dépenses; fonctions Edge OCR si fournisseur confirmé; tests SQL/UI/OCR.

**Migration/RPC/RLS** : dépenses, versions, pièces jointes, décisions et remboursements; RPC soumission/correction/décision/paiement; audit immuable; Storage original privé.

**Tests** : photo originale, OCR fournisseur/sous-total/TPS/TVQ/total, vérification obligatoire, tous statuts, correction, refus inter-rôles, arrondis Québec.

**Rôles** : Employé/Chef soumettent; Adjointe traite; Boss selon permission; Admin technique.

**Risques** : OCR présenté comme certain, perte image originale, accès financier excessif.

**Acceptation** : aucune soumission automatique sans confirmation humaine; historique complet; calculs reproductibles.

### Phase 5 — Absences

**Fichiers** : migration d’évolution `hr_requests`; écrans terrain/Adjointe; tests.

**Migration/RPC/RLS** : faire évoluer sans recréer la table; statuts et historique de corrections; impact cédule; notifications/audit.

**Tests** : maladie du jour, congé, vacances, chevauchements, approbation/refus/correction, visibilité limitée.

**Rôles** : Employé/Chef, Adjointe, Boss.

**Risques** : perdre les demandes existantes, exposer le motif médical.

**Acceptation** : parcours distincts et historique immuable, données sensibles minimisées.

### Phase 6 — Commandes Adjointe/Entrepôt

**Fichiers** : réconcilier les propositions `202611070006` à `009` avec l’historique réellement appliqué, sans les réexécuter; `dist/coordination*`, `dist/entrepot*`; tests existants plus tests réels.

**Migration/RPC/RLS** : produire d’abord une migration de référence fidèle aux objets hébergés ou documenter leur équivalence; seulement ensuite créer une migration additive pour les écarts réels. Préserver idempotence, routage ligne Entrepôt/À commander, plusieurs bons, vrais statuts d’envoi et mouvements atomiques.

**Tests** : reprendre les 20 contrats coordination, PGlite, six comptes, envoi réel/échec, QR, ajout avant expédition, historique et non-régression logistique publiée.

**Rôles** : Chef/Employé, Adjointe, Entrepôt, Boss; Admin configuration.

**Risques** : considérer une proposition comme appliquée, doubler les tables, collision avec logistique publiée, faux succès d’envoi.

**Acceptation** : aucune commande directe au Shop; statut Envoyé uniquement sur réponse réelle; inventaire jamais négatif.

### Phase 7 — Notifications

**Fichiers** : migration `notification_preferences`; composant partagé; tests.

**Migration/RPC/RLS** : préférences par type/canal, liens d’action validés, lu/non lu, déclencheurs idempotents; historique sessions/appareils séparé.

**Tests** : chaque catégorie, liens autorisés, isolation, lecture multiappareil, pas de doublons.

**Rôles** : tous selon événement.

**Risques** : fuite par payload/route, spam, dépendance circulaire avec commandes.

**Acceptation** : filtre fin, compteur cohérent, action refusée si le rôle perd son accès.

### Phase 8 — Thèmes et réglages

**Fichiers** : tokens CSS partagés, `mir-account.*`, JS de thème; migration préférences profil; tests visuels.

**Migration/RPC/RLS** : préférence utilisateur serveur, sessions/appareils; aucune préférence ne modifie les permissions.

**Tests** : Automatique/MIR clair/MIR sombre/Haute visibilité, accents, statuts fixes, 44 px, texte/contraste/animations, persistance multiappareil, toutes tailles.

**Rôles** : tous.

**Risques** : régression accueil et pages publiques, orange ambigu, thème appliqué tardivement.

**Acceptation** : changement instantané global, structure identique, statuts rouge/orange/vert constants.

### Phase 9 — Catalogue et accessoires

**Fichiers** : sources catalogue canoniques et générateur existant, `employee-store-model.js`, manifests/images; tests catalogue.

**Migration/RPC/RLS** : seulement si catalogue serveur/publication; préserver séparation prix privé/public.

**Tests** : anti-doublon, palettes par fabricant, noir/blanc en tête, visuel de tête seulement, accessoires non forcés, brouillon non achetable, codes techniques.

**Rôles** : Client, Employé magasin, Adjointe/Admin publication.

**Risques** : modifier les JSON générés sans source, inventer références/couleurs, fusionner J génériques avec mauvais fabricant.

**Acceptation** : chaque ajout sourcé; toute donnée non vérifiée bloquée à l’achat; visuel validé.

### Phase 10 — Dix modèles de pliage

**Fichiers** : `mir-bending-presets.js`, modèles/miniatures, moteur existant uniquement si nécessaire, tests 2D/3D/prix/PDF.

**Migration/RPC/RLS** : modèles privés et publication déjà présents; migration de données versionnée, jamais remplacement silencieux.

**Tests** : exactement dix cartes, géométries, faces couleur, verrous, personnalisations, développé, tarif 120 po, aluminium +10 %, double pli = un pli, aucun rabais court, PDF.

**Rôles** : Client, production/admin autorisés.

**Risques** : casser le moteur libre, supprimer un modèle historique, coder les quatre profils incomplets.

**Acceptation** : décisions 1–4 résolues avant codage; historiques conservés; validation visuelle téléphone/tablette/PC.

### Phase 11 — Application Android privée

**Fichiers** : nouveau projet Capacitor/Android reproductible, sans duplication du Web; manifeste de mise à jour; documentation signature.

**Migration/RPC/RLS** : version minimale et manifeste sécurisé; aucune permission supplémentaire fondée sur l’APK.

**Tests** : six comptes, caméra/photo/QR Entrepôt seulement, téléchargements, hors ligne, session, mises à jour facultative/obligatoire, intégrité, émulateur et appareil réel.

**Rôles** : tous; Client seulement si décidé.

**Risques** : clé de signature dans Git, WebView incompatible, installation silencieuse non permise, source APK non privée.

**Acceptation** : APK réelle signée de test, empreinte/version/lien vérifié, puis procédure de signature production séparée.

## 5. Décisions non confirmées — ne pas inventer

1. Fascia : retour verrouillé à **5/8 po ou 3/4 po**.
2. Goutte d’eau : nom/base **8 po ou développé 7 1/2 po**; directions, angles et face couleur.
3. Ailes de fenêtre : ordre, directions, cotes initiales et face couleur.
4. Écoulement des eaux : directions, angles et face couleur.
5. Royal Steel : gamme et palette réelles de vis à soffite.
6. Formats réellement offerts 10/20/50/100 pi pour Kaycan/Gentek; gammes Royal Aluminium/Vicwest.
7. Membrane blanche 3M : conserver 3 po ou remplacer par 4/6/12 po.
8. Catalogue privé de prix de soumissions : portée exacte et approbations.
9. 2FA renforcée Simon/Admin : facultative ou obligatoire et méthode choisie.
10. Livraison 60 $ / gratuit ≥ 300 $ / 40 km / max 80 km : fait-elle partie du Prompt 2 ou doit-elle rester inchangée?
11. Variantes réelles blanc/tan, palette vis fascia Kaycan et pots de retouche.
12. Application Android : rôle Client inclus ou application strictement interne?
13. Distribution APK privée : portail MIR, MDM/Android Enterprise ou autre source autorisée?
14. OCR des dépenses : fournisseur/service autorisé, budget et politique de conservation.

Ces décisions ne bloquent pas la Phase 1. Elles bloquent leurs phases respectives.

## 6. Première phase recommandée

Confier uniquement **Phase 1 — Dossier chantier central** à Codex.

Raison : presque toutes les phases suivantes doivent rattacher leurs données à un chantier. Le dépôt possède déjà les briques et MIR TEST possède même `mir_job_detail`, mais cette migration n’est pas versionnée dans le clone et le contrat n’est pas aligné avec MIR production. La Phase 1 doit d’abord réconcilier ce qui existe, puis compléter uniquement les écarts. Elle réduit les duplications futures et permet de tester l’isolation avant d’ajouter dépenses, absences, aide et notifications.

## 7. Texte exact à transmettre à Codex

```text
Reprends le dépôt existant revetementsmir/Revetements-mir- sur la branche main.

Lis d’abord entièrement docs/MIR-PROMPT-2-CODEX.md et respecte ses règles impératives. Revérifie le SHA de main et compare-le au SHA audité 2f30fd11146a374b3670a153cd0f441364745a8f. Si main a avancé, réévalue les écarts touchant la Phase 1 avant de modifier quoi que ce soit.

Exécute uniquement la Phase 1 — Dossier chantier central. Ne commence aucune autre phase du Prompt 2.

Objectif : créer un dossier chantier central fondé sur le job_id existant, en composant les données canoniques déjà publiées : équipe, employés, adresse, plans, documents, tâches, rapports, heures, punchs, extras, demandes, commandes, fournisseurs et conversation liée. Ne recrée aucune de ces fonctions et ne duplique aucune table existante.

Contraintes absolues :
- préserver intégralement le Punch, la Boutique, le Pliage, le Magasin employé, l’Entrepôt, les Réalisations, le Studio et l’accueil approuvé;
- conserver le rôle technique Admin et l’afficher comme Boss seulement dans l’interface opérationnelle, sans changer ses permissions;
- autorisations réelles par Supabase RPC/RLS/Storage, jamais seulement par masquage UI;
- réutiliser jobs, job_memberships, job_allowed, les audits et le stockage privé existants;
- conserver l’historique après fermeture;
- prévoir pagination/chargement progressif pour le mobile;
- aucune publication, aucun push sur main et aucune migration hébergée sans validation finale;
- ne pas utiliser les comptes de production pour les tests.

Avant de coder, fournis un court inventaire des objets existants que tu vas réutiliser et la liste exacte des fichiers prévus. Ensuite implémente la plus petite migration additive et le plus petit écran permettant le dossier central.

Crée au minimum :
- une migration additive versionnée pour le snapshot central et seulement les lacunes de données prouvées;
- un RPC de lecture central protégé et des RPC d’action étroits si nécessaires;
- les tests SQL/RLS des six rôles, de l’isolation organisation/chantier, des URL directes et du Storage privé;
- les tests UI responsive 360/390/430 px, tablette portrait/paysage et ordinateur;
- les tests de non-régression des modules protégés.

Critères de sortie :
- un même job_id ouvre toujours le même dossier;
- chaque section référence les données existantes sans duplication;
- les six rôles voient exactement leurs données autorisées;
- les URL/RPC interdites sont refusées côté serveur;
- un chantier fermé conserve son historique;
- les actions sensibles sont auditées;
- les tests locaux sont verts et les limites de preuve sont documentées;
- aucune affirmation « terminé » sans matrice des permissions, résultats de tests et captures utiles.

Arrête-toi à la fin de la Phase 1 et demande la validation avant toute autre phase ou publication.
```

## 8. Éléments expressément hors de la première phase

- aucune refonte générale du portail;
- aucune modification de tarification ou livraison;
- aucun ajout catalogue;
- aucun des dix modèles de pliage;
- aucune dépense/OCR;
- aucune refonte des absences;
- aucune réapplication ni évolution des migrations de coordination;
- aucun thème global;
- aucune application Android;
- aucune publication.

