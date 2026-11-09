# Administration MIR

Point d’entrée : `administration.html`, depuis Mon compte. Le paramètre `?recette=1` utilise exclusivement MIR TEST (`hxtztkmbfpmzrieccwsg`). La production utilise MIR (`gccltmaulvrnthrbnrpd`). Les liens entre les modules conservent la recette et la session Auth du projet. Aucun rôle ni secret n’est stocké dans la configuration publique.

## Autorisations et données

- Admin actif : Équipe, jobs, coordination, entrepôt, achats et estimations.
- Adjointe : capacité existante `coordination_access`. La gestion des jobs et la boîte d’estimations nécessitent les délégations distinctes `admin_permissions.jobs` et `.estimates`.
- Entrepôt : capacité existante `warehouse_access`. Aucune gestion des permissions, aucun dossier de chantier non assigné.
- Employé : chantiers assignés, plans privés et commandes personnelles. L’archivage conserve le suivi des commandes.

Les RPC vérifient `auth.uid()`, l’organisation, l’activité et les capacités en base. Les contrôles existent indépendamment des menus et des URL. Une suspension révoque les invitations ouvertes, bloque les opérations et les téléchargements ; une invitation révoquée ne réactive pas le compte. Le renouvellement produit un nouveau lien privé de 72 h et conserve l’historique.

`staff_profiles`, `jobs`, `job_memberships`, les commandes et les bons restent dans `mir_core`. Les profils préparés sont rattachés au compte dont l’adresse confirmée correspond à l’invitation. Les changements du courriel d’un compte déjà lié demandent une nouvelle procédure d’invitation ; l’interface ne modifie pas silencieusement son identité Auth.

## Documents

- Plans/PDF/photos : bucket privé `mir-job-documents`, 20 Mio par fichier, types PDF/JPG/PNG/WebP.
- Un objet immuable par version. Publication sous verrou du chantier et vérification de la version attendue. Aucune politique Storage UPDATE/DELETE pour les navigateurs.
- Téléchargement authentifié : vérification de l’accès actuel au chantier à chaque requête. Aucun lien de lecture signé durable.
- PDF fournisseur : bucket privé `mir-supplier-documents`, métadonnées et SHA-256 dans `mir_core.documents`, rattachés au bon et à sa révision.
- Estimation acceptée : `estimate_followups` conserve la liaison unique au chantier et aux PDF originaux du bucket `mir-estimates`. L’instantané soumis n’est pas modifié.

## Commandes, entrepôt et fournisseurs

Le magasin utilise les articles explicitement publiés dans `mir_core.catalogue_items`. Administration → Magasin employé reprend les références du catalogue public existant ; l’admin choisit les références à publier. Cela ne crée aucun stock. MIR production possède actuellement un catalogue serveur vide : cette publication initiale reste une étape de mise en service, à réaliser dans l’interface après l’autorisation de déploiement.

La commande valide côté serveur l’article, la quantité, l’unité, le format et la teinte, puis conserve le numéro, l’adresse et l’équipe du job au moment de l’envoi. Les clés de reprise sont persistantes et transactionnelles.

Coordination réutilise les tables et RPC déjà présentes : répartition entre entrepôt et fournisseurs, ajouts avant expédition, reconnaissance des changements, bons et réceptions partielles. Les anciens objets de production sont conservés par les migrations conditionnelles d’alignement.

Le QR n’expose que la quantité affectée à l’entrepôt. La commande de 25 avec 20 entrepôt/5 fournisseur, puis ajout de 3 entrepôt, autorise 23 sorties. Les verrouillages empêchent une répartition simultanée de contourner cette limite. Expédier ne redéduit pas le stock déjà sorti.

Une réception fournisseur peut aller directement au chantier ou en stock. En stock, elle augmente l’inventaire sans livrer le chantier. Une sortie distincte, bornée au reçu non livré, est nécessaire ensuite. La révision documentaire d’un bon ne recrée ni demande de matériel, ni réception, ni mouvement de stock.

## Envoi des bons

`mir-admin-delivery` utilise les secrets Supabase et la file existante `mir_core.send_jobs`/`send_attempts`. Aucune clé privilégiée n’est envoyée au navigateur. La fonction vérifie l’utilisateur avec Auth, les droits Coordination, la révision approuvée, le PDF privé et son SHA-256. Resend reçoit une clé stable par job d’envoi. Les réponses interrompues restent à reprendre ; après 23 h sans confirmation, une réconciliation MIR est exigée avant un nouvel essai.

Le PDF doit être prévisualisé avant approbation. Il contient les renseignements fournisseur et chantier et un tableau des articles, références, teintes, formats, quantités et unités. Les identifiants internes et les instantanés JSON restent dans le dossier privé.

En TEST, l’expéditeur et le destinataire sont imposés par `MIR_ESTIMATE_FROM`, `MIR_ESTIMATE_TO`, `MIR_ESTIMATE_MODE=test`, avec `RESEND_API_KEY`. Les envois fictifs R1 puis R2 ont été acceptés par Resend. La réception humaine R1 a été confirmée ; son rendu a été refusé par le client, corrigé dans une R2 d’une page, puis renvoyé après inspection du fichier archivé. La confirmation humaine de réception de R2 reste à distinguer de son acceptation par Resend.

En production, les bons sont désactivés tant que `MIR_SUPPLIER_SEND_ENABLED=true`, `RESEND_API_KEY` et un `MIR_ESTIMATE_FROM` vérifié ne sont pas configurés dans Supabase MIR → Edge Functions → Secrets. Le destinataire est toujours le contact fournisseur vérifié en base. Ne pas utiliser la boîte de recette en production.

L’envoi public d’estimation conserve ses propres deux verrous : `mir_estimates.settings.enabled` et `MIR_ESTIMATE_ENABLED`. La production reste désactivée et `dist/mir-estimate-config.js` conserve son URL de production vide. Le destinataire final d’estimation demeure `estimation@revetementsmir.com`. Voir aussi [le service d’estimation](MIR_ESTIMATIONS_SERVER.md).

## État de livraison et accord manquant

Les fonctions et migrations d’administration sont testées dans MIR TEST. L’application de `20261109190000_mir_administration_portal.sql` dans MIR production a été refusée par la revue automatique avant exécution : elle demande une autorisation explicite couvrant les API d’accès, permissions, invitations, jobs et commandes de production, en raison du risque de rupture d’accès ou de commandes. Ne pas contourner ce refus par un autre outil ou une exécution indirecte.

La production a seulement reçu le socle privé d’estimation, vide et désactivé, ainsi que les alignements conditionnels sans changement des données métier existantes. Aucun job ni commande fictif n’a été créé en production. Les migrations d’administration et les nouveaux déploiements Edge en production restent à faire après accord. Les comptes QA, invitations et permissions de recette sont uniquement dans MIR TEST ; le compte réel de l’adjointe est toujours à confirmer.

Après accord explicite : appliquer les migrations restantes dans l’ordre, déployer `mir-estimates` et `mir-admin-delivery` avec authentification interne, vérifier les verrous d’envoi, publier le commit sur `main`, attendre Pages puis vérifier les fichiers et les parcours publiés. La branche de travail dispose d’un workflow de recette sans déploiement. Les nouveaux tests sont également intégrés au workflow Pages pour la publication autorisée.
