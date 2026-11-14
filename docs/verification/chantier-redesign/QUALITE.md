# Qualité — refonte chantier Employé et Chef

## Ce qu’il faut faire

Vérifier les parcours complets de l’application existante, avec données fictives de deux jobs, puis les refus et les reprises. Une maquette ou un contrat statique ne prouve pas le raccordement serveur. SEO/GEO : non applicable, application interne privée; aucune ouverture d’accès ni publication.

## Les étapes

1. Base de lecture : `24d29734d68cd3da23c17be8693ddba08abff19f`, checkout `/workspace/Revetements-mir-chantier-ux`, branche `codex/refonte-chantier-employe-chef`. Méthode Qualité Atelier1.0.0 lue depuis le fichier préparé par le coordinateur. Seul l’intégrateur full-stack modifie le code et les tests. Cette expertise rédige ce rapport et exécute les vérifications.
2. Exécuter les contrôles existants avec leur environnement attendu et conserver les échecs avant correction. Préparer des données de deux jobs, trois rôles terrain/bureau et un accès étranger.
3. Vérifier la navigation, les mutations, le dossier canonique Adjointe et les refus directs. Retrouver les mêmes objets et identifiants, sans second rapport.
4. Refaire les scénarios après correction, avec captures réellement distinctes des cinq onglets, dossier, formulaires et états de réseau/clavier. Les tests ne doivent ni supprimer des assertions métier ni fabriquer une réponse serveur réussie.

## Comment savoir que c’est terminé

| Besoin | Contrat existant / point de contrôle | Scénario exigé |
|---|---|---|
| Cinq onglets et compte | Navigation `setView` / shell chantier | Accueil→Commande→Punch→Message→Plus, retour de sous-page, rôle Chef et Employé; autres rôles inchangés |
| Panier commun | `MIRUnifiedOrderCart`, `submitOrder`, `mir_order_draft_save`, `mir_order_submit` | Matériel + pliage + dessin; badge3 lignes; quantité manquante refusée; ajout et changement job pendant envoi; seuls éléments acquittés retirés |
| Réponse serveur | `transmitOrderDraft` contrôle statut/orderId/receiptId | Réponse absente/incomplète, HTTP erreur, arrêt réseau : pas de succès ni vidage; même idempotency-key au réessai; double clic sans doublon |
| Dossier job | `mir_job_dossier_snapshot`, `mir_core.job_activity` | Deux jobs distinctes; photos/extra/problème avec job/auteur/date/PJ; Adjointe retrouve chaque objet et le bon état |
| Photo | `uploadInternal` + chemins privés par scope/job | La photo d’une job ouverte reste liée à cette même job même si la sélection générale change; avant/pendant/après et attente explicites |
| Extra | `EXTRA_SUBMIT`→`mir_extra_submit` | Employé/Chef demandent; Adjointe voit le même extra; aucune approbation ni facturation automatique |
| Problème / outil | `field_issues`, `material_requests`, parcours existants | Même formulaire depuis Plus et dossier; nom libre sans série, trois urgences, état réel, liaison bureau/Entrepôt et refus hors droits |
| Chef multi-job | `mir_lead_action`, affectations du jour | Affectations A et B : les mutations choisies sur B n’atterrissent jamais sur A; suivi équivalent Adjointe |
| Punch | `mir_punch_action`, corrections/journal/périodes | GPS ponctuel séparé d’itinéraire; aucun punch par itinéraire; emploi, déplacement, chevauchement, doublon, pause, période verrouillée, attente hors ligne |
| Messages | conversations privées/job, chat API privée | Fil job ouvert depuis dossier identique au fil Message; texte/PJ/réponse/recherche/non-lu; clavier maintient Envoyer visible; conversation étrangère refusée |
| Heures / congé / dépense | RPC Punch, Absence et Expense existantes | Brouillon, envoi et retour; pièce privée et bonne job; pas de statut inventé |
| Rapport Chef | `daily_reports` via `mir_lead_action` | Terminer punch ne soumet pas le rapport; rapport/photo même job dans dossier Adjointe |
| Sécurité | contrats RPC/RLS existants | Employé/Chef/Adjointe/Entrepôt, job non affectée, organisation étrangère, session révoquée, purge/changement compte |
| Mobile et autres rôles | même source web/APK; shell borné aux deux rôles | 360/390/430, tablette/ordinateur affectés, clavier, retour, rotation, contraste et texte agrandi; Boss/Adjointe/Entrepôt/client sans régression |

### Constats initiaux établis par lecture du code

- Le handler `create-order-form` vide `ui.carts[cartKeyFor()]=[]` et le panier unifié à la réception, en utilisant la sélection **courante**, sans borner les lignes/quantités envoyées. Le réessai `CREATE_ORDER` vide également le panier courant. Risque de perte d’articles ajoutés ou de vidage d’une autre job pendant l’envoi. À reproduire par test retardant l’acquittement puis à corriger.
- La branche `portal-client.command('CREATE_ORDER')` vérifie un objet `result` et un snapshot, mais pas les champs du reçu. `submitOrder` vérifie au contraire `orderId`, `status='submitted'` et `receiptId`. Préserver ces garanties de confirmation.
- Le formulaire extra passe `form.dataset.job` à la mutation, mais la photo est téléversée avec `currentJobId()`. Les deux références peuvent diverger : tester l’ouverture d’un dossier différent de la sélection générale.
- Le serveur `mir_lead_action` de `20261109180000_chef_equipe_boss_portal.sql` choisit la dernière affectation du Chef aujourd’hui et n’utilise pas de `jobId` explicite. Une refonte permettant plusieurs jobs doit borner ce contexte côté serveur, pas seulement dans le formulaire.
- `mir_job_dossier_snapshot` réutilise bien `mir_core.jobs`, documents, tâches, rapports, extras, demandes et conversations autorisées. Les problèmes `field_issues` ne sont pas une liste explicite du snapshot; ils figurent seulement dans l’activité. Le bris d’outil et sa suite ne sont donc pas certifiés par un simple affichage de chronologie.
- Le test navigateur `mir-job-dossier-browser.cjs` vérifie aussi un HTML synthétique construit dans le test. Il ne vaut pas recette de l’ouverture du dossier réel ni preuve de réception Adjointe.

### Exécutions initiales

- `tests/mir-account-session.cjs`, `tests/mir-team-session-queue.cjs`, `tests/mir-today.cjs` : réussissent au premier contrôle. Journal `artifacts/chantier-redesign/qualite/baseline-node.txt`.
- `tests/mir-chat-phase3a.cjs` lancé directement hors environnement PR : échec du hash historique BECK/main pour `tests/mir-boutique-audit-20261110-browser.cjs`. Attendu `56cff…`, fichier courant `f7e61…`. Ce contrôle dépend de l’environnement PR pour comparer le bon diff; cet échec est présent sur la base et n’est pas attribué à la refonte. Journal `baseline-chat-direct.txt`.
- PostgreSQL, navigateur de refonte, hébergé TEST et Android : non exécutés à cette étape. Ne pas transformer les constats de lecture en reproductions dynamiques.

## Détails pour le chat

Aucun compte personnel créé, aucun accès production, courriel réel, publication Pages, fusion, distribution, modification de clé ou d’ancienne application Samsung. Les journaux ne doivent jamais contenir de mot de passe ou de session. Les résultats hébergés et physiques demeurent distincts des fixtures locales. Rapport initial à compléter après le rendu et les corrections, pas une certification finale.

### Vérifications locales supplémentaires sur les contrats existants

Les dépendances ont été préparées par le coordinateur, sans édition de l’application par cette expertise.

| Suite réellement exécutée | Résultat | Journal |
|---|---|---|
| Dossier chantier PostgreSQL | 6 groupes réussis | `baseline-dossier-postgres.txt` |
| Opérations Employé/Chef/Boss PostgreSQL | 12 groupes réussis | `baseline-operations-postgres.txt` |
| Commandes, notifications et isolation PostgreSQL | 30 groupes réussis | `baseline-order-postgres.txt` |
| Punch PostgreSQL | 20 groupes réussis | `baseline-punch-postgres.txt` |
| Contrat client Commandes | Réussi | `baseline-order-client.txt` |

Ces résultats sont locaux avec `auth.uid` simulé, pas une preuve hébergée. Les suites existantes ne couvrent pas les deux défauts suivants, **reproduits dynamiquement** avec les mêmes migrations PGlite :

1. `mir_lead_action(task_add,{jobId:job454,...})` crée la tâche sur la job353 de l’affectation courante. La référence transmise est ignorée. Une UI multi-job ne doit pas réutiliser cette action sans préciser et valider le contexte au serveur.
2. Rejouer `mir_lead_action(field_issue)` avec la même clé crée une seule ligne `field_issues`, mais **deux** lignes d’activité; le second reçu retourne `id:null`. Le reçu et les évènements doivent être idempotents, pas seulement la table cible.

Preuve : `artifacts/chantier-redesign/qualite/baseline-lead-context-repro.json`. Script éphémère de reproduction `/tmp/mir-lead-context-repro.cjs`, sans connexion réseau ou secret. Ces reproductions ont été transmises à l’intégrateur et au coordinateur pour correction et ajout de tests permanents.

### Panier — défaut reproduit dans Chromium avant correction

Scénario avec la vraie application de base `24d2973`, à390px, et un transport local **simulé** dont l’acquittement est volontairement retardé :

1. Ajouter une ligne de matériel de quantité1.
2. Envoyer la commande; conserver la promesse d’acquittement en attente.
3. Modifier la quantité du panier à2 avant la réponse.
4. Acquitter l’envoi de la quantité1.

**Constat reproduit :** le panier devient vide, alors qu’une unité ajoutée après l’envoi devrait rester. Le journal confirme `sentQuantity:1`, `quantityBeforeReceipt:2`, `remainingCartEntryCount:0`, sans erreur JavaScript. Le suivi contient la commande de quantité1, donc il ne s’agit pas d’une perte de la commande envoyée mais de la nouvelle unité du brouillon.

Les deux images `baseline-cart-before-receipt.png` et `baseline-cart-after-receipt.png` ont réellement été ouvertes. Elles montrent le passage du compteur1ligne à0 et les états du formulaire/suivi. Preuve JSON `baseline-cart-race.json`; script temporaire `/tmp/mir-qa-cart-race.cjs`. Les HTML/JS de base sont servis à partir de copies de `git show24d2973`, indépendamment des modifications en cours de l’intégrateur. Aucun serveur Supabase n’est contacté.

### Corrections de contrats — revue indépendante après intégration

Les reproductions suivantes ont été exécutées en PGlite, avec le SQL proposé corrigé, sans toucher aux migrations historiques :

- Sans rôle métier ni affectation, le helper de dossier renvoie maintenant `false`, puis l’ancien RPC dossier et le nouveau complément refusent la lecture.
- L’Employé ne peut pas injecter `response` ni `status` pour simuler une réponse du bureau.
- Une photo avec étape `NULL` ou chemin appartenant à un autre auteur est refusée.
- La même demande photo et le même contenu rendent le même identifiant, avec une seule activité; changer le contenu sous cette clé est refusé.
- Une job non affectée ou fermée refuse l’écriture.

Journal `field-guards-after.txt`, six groupes supplémentaires dans le script indépendant `/tmp/mir-qa-field-guards.cjs`. Avant correction, `field-response-spoof-before.txt` prouvait l’enregistrement d’une fausse réponse du bureau par l’Employé; `null-dossier-before.txt` prouvait le helper `NULL` et la lecture indue des deux RPC. Ces échecs avant correction sont conservés.

### Navigateur réel et backend MIR TEST — lecture vérifiée

Parcours exécuté avec les sessions QA existantes, depuis les fichiers de travail locaux servis sur `https://localhost`. Aucun transport fictif n’a remplacé les RPC; seules les requêtes autorisées de lecture ont été transmises à `hxtztkmbfpmzrieccwsg.supabase.co`. Les tokens privés restent dans les fichiers ignorés du coordinateur et en mémoire du navigateur; aucune valeur n’est consignée ici.

Pour **Chef et Employé**, à390px : cinq onglets dans le bon ordre, deux dossiers QA distincts, présence de documents/plans réellement publiés, ouverture de l’extra sur la deuxième job avec cette job préremplie. La troisième job non affectée n’apparaît pas; l’appel direct de dossier sur son identifiant retourne42501. Aucune soumission de formulaire et aucune mutation métier par ce harnais. Les lectures des deux snapshots canoniques (`mir_job_dossier_snapshot` et `mir_field_job_snapshot`) ont porté sur chacune des deux bonnes références.

Preuves : `hosted-ui-readonly.json`, journal associé et captures `hosted-chef/employee-home-390.png`, `hosted-chef/employee-job-390.png`, `hosted-chef/employee-job-b-390.png`. Les quatre vues Accueil et dossierB des deux rôles ont été réellement ouvertes. Elles montrent les documents QA et, dans le dossier B, l’objet outil et la vraie réponse du bureau créés par le coordinateur dans sa recette HTTP indépendante. Ce harnais ne certifie pas l’ouverture native du PDF, l’envoi depuis l’UI ni la recette physique Android.

Deux défauts de présentation ont été transmis à l’intégrateur après inspection : la salutation réaffiche le courriel complet quand le nom serveur est une adresse; le premier affichage Chef prend la première job autorisée plutôt qu’un contexte de journée explicitement choisi. Les comptes de recette ont aussi des affectations historiques; la présence des deux jobs QA ne permet pas de prétendre que toutes leurs autres données sont issues de cette mission.

### États sans affectation — fixture locale

Employé et Chef ont été vérifiés sans job : les cinq onglets restent disponibles, aucune action Itinéraire ni Commencer n’est proposée sans chantier, le formulaire Bris d’outil ne peut pas s’ouvrir tant qu’une job autorisée n’est choisie, et aucun appel métier n’est déclenché automatiquement. Zéro erreur JavaScript. Preuves `empty-ui.json`, `empty-ui.txt`, deux captures `empty-*-390.png`. Simulation locale, distincte des lectures hébergées ci-dessus.

### Panier — scénario corrigé dans le navigateur

Le même scénario a été rejoué sur la nouvelle interface :1 unité soumise, quantité portée à2 avant la réponse, puis acquittement. **Une unité reste désormais dans le brouillon.** Deux soumissions programmatiques pendant l’attente ne provoquent qu’un seul appel de commande. Aucune erreur JavaScript. Preuves `cart-race-after.json`, `cart-after-fix-before-receipt.png`, `cart-after-fix-after-receipt.png`; script `/tmp/mir-qa-cart-after.cjs`. La fixture de cette vérification simule le reçu et ne certifie pas le suivi hébergé de la commande.

Les3tests purs de `tests/mir-field-cart.cjs` et les17groupes de `tests/mir-field-postgres.cjs` ont aussi réussi sous exécution indépendante. Journaux `cart-contract-after.txt` et `field-postgres-after.txt`.

### Défaut découvert par le nouveau parcours complet

La suite `tests/mir-field-redesign-browser.cjs` a été exécutée par cette expertise avec ses captures isolées dans `/tmp/mir-qa-permanent-functional` pour ne pas écraser celles de l’intégrateur. Son premier passage échoue après la reprise réussie d’un formulaire outil : le pointage simule un enregistrement, mais le bouton « Terminer » n’apparaît pas.

La lecture du code trouve une cause possible et reproductible : le formulaire fermé reste dans `#portal-dialog` avec `data-field-dirty=true`; la recherche globale de formulaire sale dans `applyConnectedStatus` empêche encore le rendu des mises à jour alors que ce dialogue n’est plus ouvert. Défaut transmis à l’intégrateur; journal `functional-after.txt`. Tant que ce scénario n’est pas rejoué avec succès, la suite complète ne doit pas être présentée comme verte.

### Reprise du parcours complet après correction

L’intégrateur a retiré l’état sale des formulaires fermés et borné la protection de saisie aux formulaires réellement affichés. Le même test permanent a été rejoué sans modifier ses assertions : **90 contrôles navigateur réussis**, deux rôles, cinq formats, cinq onglets, contexte de deuxième job, refus/reprise/double action, Punch, congés progressifs et compte. Journal `functional-after-recheck.txt`. Le premier échec est conservé séparément. Ces90contrôles utilisent un service simulé et ne valent pas90scénarios hébergés.

Les deux captures du panier corrigé et l’état Chef sans affectation ont ensuite été ouverts et inspectés. La quantité restante et le badge demeurent visibles après acquittement. La fixture du suivi ne fournit pas une commande hébergée; l’état vide de cette simulation n’est pas une preuve de persistance du suivi réel.

### Même extra et même conversation — contrôle hébergé canonique

Le coordinateur a créé un extra et un message fictifs dans MIR TEST, sur la jobB QA. Le harnais de cette expertise n’a effectué que des lectures :

- L’extra `a26aa58e-e3ac-475c-82cd-2b329d0d9b89` est retrouvé dans le snapshot canonique et dans le rendu du dossierB, pour l’Employé et le Chef autorisés.
- La conversation privée `f9264c96-c4c3-4659-ba32-3766007de9c1`, contenant le message `9e9b3316-c101-44b8-bc97-05fec1d1607e`, est retrouvée dans le dossierB de son auteur Employé et dans l’onglet Message avec le même identifiant. Le texte, la date, l’état réel « Envoyé » et le lien vers la job sont rendus.
- Ce message Employé→Adjointe ne figure pas dans le dossier du Chef, qui n’est pas participant. Ce refus est un résultat attendu, pas un manque de données à contourner.

Preuve lisible sans session : `hosted-ui-readonly.json`; liaisons canoniques préparées par le coordinateur dans `../hosted/canonical-links.json`. La capture `hosted-employee-canonical-message-390.png` a réellement été ouverte et inspectée. Elle ne contient pas de pièce jointe; l’envoi de pièce jointe depuis ce compositeur n’est pas certifié par cette image. Aucun compte personnel, token ou lien signé persistant n’a été ajouté aux preuves publiques.

### Limites de ce bilan qualité

Ces contrôles portent sur l’arbre de travail en cours d’intégration depuis24d2973; le SHA final et les contrôles CI doivent être rattachés par le coordinateur une fois le commit établi. Les captures Chromium, le service local simulé, les RPC réels TEST, le natif Android et le Samsung physique constituent des niveaux de preuve différents.

Les parcours d’écriture hébergés, les réponses bureau/Entrepôt et leur isolation organisationnelle sont exécutés séparément par le coordinateur. Cette expertise a vérifié leur lecture dans les vrais dossiers mais ne revendique pas une soumission complète depuis l’UI hébergée. Les vérifications natives et signature/APK relèvent du spécialiste Mobile et du coordinateur; aucune recette physique ni conservation de session Samsung n’a été prouvée ici. La revue Ergonomie a encore signalé un défaut de navigation à200% de texte : à corriger puis rejouer avant de clore ce point. Les contrôles de compatibilité des autres rôles et le bilan de CI final ne sont pas remplacés par les90contrôles chantier simulés.

### Photo remplacée après erreur — défaut supplémentaire reproduit

Après un premier téléversement réussi puis une erreur de l’action métier, l’utilisateur remplace la photoA par une photoB et réessaie. Le navigateur ne téléverse qu’un seul fichier et le second payload contient encore le chemin de photoA, malgré le nouvel aperçu. Reproduction Chromium avec RPC simulé, sans backend : `photo-retry-before.json`, `correct:false`; script `/tmp/mir-qa-photo-retry.cjs`. Le chemin téléversé mémorisé dans le formulaire doit être invalidé lors du changement ou retrait du fichier. Défaut transmis à l’intégrateur; le garde idempotent serveur doit rester intact pour les réponses perdues après enregistrement.

Après correction par l’intégrateur, les deux réessais ont été rejoués indépendamment : remplacerA parB provoque un deuxième téléversement et le payload final contientB; retirer la photo provoque un payload sans chemin photo. Preuves `photo-retry-after.json` et `photo-remove-retry-after.json`, tous deux `correct:true`. La simulation force l’erreur avant enregistrement; le contrat d’idempotence serveur contre le rejeu d’une écriture déjà enregistrée reste couvert par les tests PostgreSQL séparés.

### Historique personnel — parcours réel MIR TEST du14novembre

Après installation du complément TEST, le coordinateur a préparé deux journées explicitement fictives (1er et2octobre2026), réservées au compte QA Employé. Le parcours réel **Plus → Mes heures → Historique complet**, filtré sur ces dates, affiche les deux journées avec la bonne succession FaçadeA → Déplacement → GarageB et la pause de30minutes. Le bouton de correction de la journée du2octobre ouvre cette journée et ses trois segments; aucune demande n’a été envoyée.

Avec la session Chef, ces deux identifiants Employé ne sont pas retournés. Un filtre supplémentaire `employeeId` est refusé côté serveur (`22023`) dans les deux sessions. Aucune mutation, aucun pointage physique ni calcul de paie n’est réalisé par ce contrôle. Preuves `hosted-history-ui-readonly.json` et `.txt`; les trois captures `hosted-employee-history-oct-390.png`, `hosted-employee-history-correction-390.png` et `hosted-chef-own-history-oct-390.png` ont réellement été ouvertes. Elles sont des rendus Chromium locaux raccordés au backend TEST, pas des captures du Samsung.

Le compte Chef conserve un ancien pointage ouvert du9novembre et des données historiques antérieures à la mission. Le total courant affiché n’a pas été créé ni soldé par cette recette; il ne doit pas être attribué aux deux journées fictives ni utilisé comme résultat de validation physique.

### Suites permanentes enrichies — exécution indépendante

Sur l’arbre de travail après `f2e96712d41aee144f3d8825196a711756a56dff`, la suite navigateur passe désormais **101contrôles**. Elle ajoute photoA→erreur→photoB, rapport Chef avec photo et contexteB, problème de livraison lié à la ligne de commande, historique paginé, moteur de dessin réellement ouvert puis retour au panier, reçus incomplets/erreur et quantité ajoutée pendant acquittement. Les101contrôles restent simulés côté service. Journal `functional-final.txt`; captures de ce passage isolées dans `/tmp/mir-qa-final-functional/artifacts/chantier-redesign/functional/`.

La suite PostgreSQL permanente passe **23groupes**, dont historique self-only et paginé, isolation des acteurs/organisations, signalement de livraison sur la bonne commande/job/ligne, et lecture Chef sélectionnée surA/B. Journal `field-postgres-final.txt`. Aucune assertion ou fixture suivie n’a été modifiée par cette expertise.

Le workflow Android privé TEST appelle les suites PostgreSQL, panier et navigateur de refonte, conserve les tests précédents et collecte les captures fonctionnelles. Cela vérifie la présence des contrôles dans la CI, pas leur résultat distant. La lecture des contrôles GitHub par `gh pr view` reste refusée ici : API GraphQL `Forbidden` après ouverture réseau. Le coordinateur dispose d’un autre outil GitHub et doit rapporter séparément la tête et l’état serveur effectif.

Le formulaire de correction a aussi été vérifié lors d’un changement de journée : avant correction, passer du2au1eroctobre conservait les identifiants des segments du2octobre. L’intégrateur a raccordé la reconstruction des options à la journée choisie. Le recontrôle réel conserve maintenant les seuls segments du1eroctobre, sans aucune soumission. Preuves `hosted-history-day-segments-before.json` (`false`) puis `hosted-history-day-segments-after.json` (`true`). Le refus serveur de segment étranger reste inchangé.

### Chef — sélection réelleA → B → A, défaut trouvé avant correction

Après installation TEST du RPC de lecture explicitement lié à la job, A retourne l’affectationA et sa tâche051; B retourne l’affectationB et les tâches052/une nouvelle tâche distincte. Le contenu réel B comportait zéro membre d’équipe, contre un surA : ce vide est signalé au coordinateur et n’est ni assimilé à une absence ni masqué par la recette. L’hypothèse initiale du harnais « exactement un membre et une tâche par job » a donc été remplacée par la vérification des identifiants QA attendus et de leur séparation; aucun test permanent n’a été changé par cette expertise.

La revisiteA aprèsB révèle toutefois un vrai défaut : le contexte Chef reste sélectionné surB et l’attente deA expire après20secondes. Le cache `user:lead:job` de `hydrateFieldJob` mémoriseA comme déjà chargé et empêche de le relire après le changement versB. Défaut transmis à l’intégrateur, avec demande de scénario permanentA→B→A. Preuves d’étapes `hosted-lead-step-0.json` et `hosted-lead-step-1.json`; journal `hosted-lead-revisit-before.txt` avant recontrôle. La réussite des lecturesA/B séparées ne certifie pas encore cette revisite.

### Recontrôle final Chef après correction et fixture représentative

Le coordinateur a réutilisé une équipe TEST existante pour l’affectationB du jour, avec sa tâche056 et une présence explicitement non confirmée; aucune nouvelle appartenance permanente n’a été ajoutée par cette expertise. Après passage du cache Chef à un verrou de requête en cours, le vrai parcours **A → B → A** réussit :

| Sélection réelle | Affectation retournée | Équipe retournée | Tâche attendue et affichée |
|---|---|---:|---|
| A | jobA | 1 membre | QA051 |
| B | jobB | 3 membres | QA056 |
| RetourA | jobA | 1 membre | QA051 |

Le nombre3 pourB est la valeur effectivement retournée par le serveur de l’équipe existante, pas un ajout de membres par le harnais. Il ne représente pas trois présences confirmées. La job003 non affectée et l’appel du RPC Chef par l’Employé sont tous deux refusés (`HTTP403`, `42501`). Zéro erreur JavaScript, aucune mutation. Preuves finales `hosted-lead-ui-readonly.json` et `.txt`; les captures `hosted-chef-selected-a0-tasks-390.png`, `hosted-chef-selected-b-tasks-390.png` et `hosted-chef-selected-a2-tasks-390.png` ont réellement été ouvertes. A et retourA sont volontairement le même état retrouvé, B affiche une tâche différente.

Deux incidents du harnais ne sont pas attribués à l’application : un sélecteur de fermeture inexistant a été remplacé par le libellé accessible réel; le test négatif lit maintenant l’organisation des requêtes métier autorisées, car `status.account` est nul pour une session terrain. Les sessions QA ont ensuite été rafraîchies par le coordinateur lorsque le SDK a demandé un renouvellement; le harnais n’a pas élargi son autorisation aux écritures Auth.

Le test navigateur permanent a enfin été rejoué indépendamment avec le scénario de revisite Chef et le double envoi pendant téléversement : **102contrôles réussis** (`functional-102.txt`, captures isolées dans `/tmp/mir-qa-final-102/artifacts/chantier-redesign/functional/`). Ce résultat local ne remplace pas la CI sur la prochaine tête distante. Le coordinateur a indiqué que la CI du commit intermédiaire `2bed90f` comportait encore des échecs Today/Android realroles liés au libellé de confirmation de présence, en correction par l’intégrateur. Cette expertise n’a pas consulté ce résultat directement sur GitHub et n’annonce donc pas une CI finale verte.

### Profil métier personnel — lecture réelle après le complément TEST

Sur les sources de travail suivant `1466eb1`, le compte QA Chef existant a été ouvert avec `fieldExperienceEnabled:true`. Le RPC réel `mir_field_profile` retourne l’identitéE0 vérifiée, le rôle `chef_equipe` et le nom métier **Chef MIR TEST**. Ce même nom apparaît uniquement sur le membre courant du snapshot, puis dans le panneau Compte; l’avatar rend les initiales **CM** et le panneau indique **Chef d’équipe**. Un GET Auth a confirmé que les métadonnées de la session privée restaient identiques pendant ce contrôle. Aucune écriture de profil ni de métadonnées Auth, aucun compte créé, aucun courriel envoyé.

Preuve publique `hosted-business-profile-ui-readonly.json` et journal associé; les deux captures `hosted-chef-business-profile-avatar-390.png` et `hosted-chef-business-profile-title-390.png` ont été réellement ouvertes. Ce sont des cadrages directs du header et du titre/rôle rendus, qui excluent le courriel et les métadonnées Auth. Zéro erreur JavaScript. Le résultat établit le raccordement au profil métier serveur, pas un changement de l’identité Auth.

La suite PostgreSQL a été rejouée : **25groupes réussis**, dont le nom canonique self-only et les refus d’organisation étrangère/rôle différent/capacité inactive (`field-postgres-profile.txt`). Les **6tests client profil** réussissent aussi (`field-profile-client.txt`) : seul le membre courant est enrichi, acteur/rôle incompatibles et refus serveur bloquent l’accès, la réponse tardive après déconnexion ne restaure aucune identité et le mode historique n’appelle pas ce RPC TEST. Aucun test ou source modifié par cette expertise.

Le coordinateur a signalé un checkpoint CI1466 techniquement vert pour les contrôles Android, mais a constaté des PNG natifs dupliqués. Ce checkpoint ne certifie donc pas cinq écrans natifs distincts. Une nouvelle CI et l’inspection de ses captures doivent être rapportées séparément; les cadrages Chromium du profil ci-dessus ne remplacent ni cette inspection native ni la recette Samsung.
