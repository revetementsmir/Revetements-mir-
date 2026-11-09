# Estimations MIR — Supabase Edge, Postgres, Storage privé et Resend

## État réel de cette livraison

- GitHub Pages continue de servir le site statique. Son API de **production reste vide et l’envoi désactivé**.
- **MIR TEST** (`hxtztkmbfpmzrieccwsg`) possède les migrations `mir_estimates_*`, le bucket privé `mir-estimates` et la fonction `mir-estimates`. Les fichiers de cette fonction sont dans `supabase/functions/`.
- **MIR** (`gccltmaulvrnthrbnrpd`) n’a pas été migré ni activé : l’utilisateur conditionne la production à la recette de courriel réellement reçue.
- L’organisation existante **Les Revêtements MIR est sur Free**. Aucun projet, branche facturée, abonnement ou hôte Node payant créé.
- Les clés/permissions Resend ne sont pas disponibles. MIR a confirmé une boîte de recette dans la conversation ; elle reste à renseigner dans les secrets serveur, sans publier cette adresse personnelle dans le dépôt. Aucun domaine Resend ni enregistrement DNS inventé. **Aucun courriel externe envoyé ou reçu dans cette recette**.

Le [rapport de recette](verification/estimation-edge-20261109/README.md) distingue API/Storage/Auth réels, transport Resend simulé, navigateur émulé et scénarios bloqués.

## Réutilisation et quatre entrées

Le formulaire général, le Studio, le panier et le dossier de pliage utilisent le même formulaire, les mêmes validations et le même contrat métier : `{version:1,source,contact,address,note,selection?,studio?}`. Le module commun `supabase/functions/_shared/estimate-contract.mjs` est aussi utilisé par le service Node existant. Ses huit tests continuent de passer. L’adaptateur Node reste disponible comme solution de repli ; voir [son ancien guide](MIR_ESTIMATIONS_NODE.md).

Les PDF du Studio sont les originaux. Son JSON soumis inclut les façades, ouvertures/dimensions, moulures, soffites/fascias et les groupes À estimer/Aperçu seulement. Les quantités restent « Métré préliminaire à valider ». Panier/pliage réutilisent les PDF natifs existants. Le bardeau et les couleurs de portes/fenêtres restent exclus du chiffrage par défaut.

Aucune dépendance à un disque Edge, aucun verrou de processus et aucune clé d’envoi dans `dist`.

## Transport négocié

`GET /functions/v1/mir-estimates/config` expose les limites et `enabled`, jamais une clé privilégiée, un destinataire ou l’allowlist. `transport: supabase-storage-v1` sélectionne le transport adapté ; le multipart Node existant reste compris par le frontend.

1. `GET .../challenge` : preuve signée de courte durée et délai minimum de formulaire ; champ piège, origine exacte et quotas complètent la limitation d’abus.
2. `POST .../prepare` : `requestId`, `resumeToken`, `payload`, manifeste `files`, `challenge`, `website`. Le manifeste contient `field`, `filename`, `bytes`, `sha256`. Même demande + même clé retrouve la même fiche ; contenu différent refusé.
3. PDF ≤6 Mio : upload direct avec une autorisation Storage signée, **2 heures** (durée native Supabase documentée), chemin généré, `upsert:false`. Elle ne permet ni lecture ni écrasement. Le test réel avec `x-upsert:true` est refusé et le SHA original reste identique.
4. PDF >6 Mio : blocs de **6 Mio** envoyés à l’Edge, autorisés par la clé de reprise, puis transmis côté serveur au TUS privé avec les accès privilégiés. Le projet a refusé le TUS anonyme signé lors de la recette ; aucune politique RLS anonyme n’a été ouverte pour le contourner. URL/session et offset sont durables ; un bloc rejoué n’est pas ajouté deux fois. Aucun fichier complet de 25 Mio ne transite dans une requête Edge.
5. `POST .../mir-estimates` : `requestId` + `resumeToken`, vérification serveur des tailles, signatures et SHA des objets, réservation transactionnelle de l’envoi, appel Resend puis reçu durable.

**Limites : 5 PDF, 20 Mio par PDF, 25 Mio au total, PDF du dossier compris, 8 Mio de JSON.** Le bucket impose 20 Mio/PDF ; manifeste, taille réelle, empreinte et signature sont revérifiés avant l’envoi. Toute incohérence empêche la confirmation. La validation de signature n’est pas un antivirus.

La clé de reprise aléatoire de 256 bits reste dans le brouillon IndexedDB de l’appareil ; seul son SHA est en base, jamais dans le lien courriel. Les brouillons MIR TEST utilisent un autre espace que ceux de production. Le bouton final exige à la fois une configuration active et les champs obligatoires valides.

## Fiche et données privées

Tables dans le schéma non exposé `mir_estimates`, RLS active, aucun droit pour `anon` ou `authenticated`. Seul `service_role` peut exécuter la RPC invoker publique et accéder aux tables privées ; pas de nouvelle fonction SECURITY DEFINER publique.

Les PDF sont dans un bucket **public=false**, sans politique de lecture/écriture anonyme. La copie JSON et le manifeste soumis ont un déclencheur d’immutabilité. Les PDF sont créés sans écrasement et le SHA est revérifié au téléchargement.

- `GET .../:id` : fiche.
- `GET .../:id/studio` : instantané 3D/façades.
- `GET .../:id/files/:fileId` : original en pièce jointe, no-store, nosniff, CSP sandbox.

Chaque route relit l’identité auprès d’Auth puis `mir_account_snapshot`. Organisation active correspondante et rôle admin, ou employé explicitement présent dans `staff_user_ids`. Les `user_metadata` ne donnent aucun droit. Visiteur, client, employé non autorisé et organisme étranger sont refusés même avec l’UUID exact. Le frontend réutilise la session Mon compte ; un lien ne contient aucun Bearer.

## Transactions et reprise

Les admissions et transitions se font par transactions Postgres et bail fencé de 130 secondes. La base sérialise les quotas et empêche les doubles créations. Aucun verrou mémoire local ne constitue la garantie.

La clé Resend est stable : `mir-estimate-PROJECTREF-UUID`. Notification, expéditeur et destinataire sont figés à la première tentative ; les reprises ne recalculent pas un autre courriel. Un reçu Resend identifié est obligatoire avant la transition `received`. Une réponse perdue retrouve le même dossier/reçu ; un échec garde le brouillon. Après **23 heures** sans reçu, rapprochement manuel obligatoire, car l’idempotence Resend n’est pas supposée illimitée.

`Demande reçue` signifie enregistrement durable + acceptation Resend, pas lecture humaine. La recette de mise en service doit aussi vérifier la boîte réelle et les PDF reçus.

## Quotas et objectif 0 $/mois

État mesuré au 9 novembre 2026 : organisation Free ; MIR environ **14,8 Mo de base / 0 Storage**, MIR TEST environ **13,5 Mo de base / 47,2 Mo de PDF de recette**. Valeurs détaillées dans le rapport. Les deux projets étaient existants ; aucune création facturée.

Garde-fous applicatifs conservateurs, sans achat de dépassement :

- Budget Storage : **300 Mio MIR TEST**, défaut **400 Mio MIR** ; 700 Mio cumulés laissent une marge dans 1 Gio, à comparer à l’usage réel de l’organisation au raccordement.
- Une demande en cours réserve le pire cas autorisé par ses jetons, puis seulement les octets réels une fois tous les originaux vérifiés. Les autres données Storage du projet sont prises en compte à l’admission.
- Refus de nouvelles demandes au-delà de 400 Mio de base ; 30 nouvelles demandes/jour ; 60 courriels/jour et 1 000/mois maximum dans cette application ; 12 tentatives/minute par catégorie globale.
- Budget de lectures 1 Gio/projet/mois, compté avant les lectures de PDF et de JSON. Ces plafonds ne remplacent pas les compteurs de facturation globaux Supabase/Resend.

Limites Supabase documentées : [Edge](https://supabase.com/docs/guides/functions/limits) (256 Mo, CPU 2 s, durée Free 150 s), [fichiers](https://supabase.com/docs/guides/storage/uploads/file-limits) (Free 50 MB maximum de plateforme), [egress](https://supabase.com/docs/guides/storage/serving/bandwidth). La recette réelle confirme nos seuils 20/25 Mio. Les quotas et l’usage **du compte Resend** restent à vérifier dans [Resend](https://resend.com/settings/billing) faute d’accès ; ne pas supposer qu’une autre application ne consomme pas déjà son quota.

Quand un plafond est atteint, le service refuse proprement et conserve le brouillon. Aucun plan payant automatique n’est demandé. « 0 $ visé » ne signifie pas conservation illimitée : surveiller les compteurs et archiver avec décision MIR.

`POST .../maintenance`, réservé à un admin vérifié, nettoie une demande de staging expirée sans première tentative d’envoi. Il attend l’expiration des droits d’upload (125 min), ne supprime ni reçu ni envoi incertain, et garde l’identité du brouillon. Les PDF d’une demande reçue ne sont jamais purgés automatiquement par ce module.

## Configuration — exclusivement côté serveur

[Supabase MIR TEST → Edge Functions → Secrets](https://supabase.com/dashboard/project/hxtztkmbfpmzrieccwsg/functions/secrets) :

| Secret | Valeur / action |
|---|---|
| `RESEND_API_KEY` | Clé Resend d’envoi ; gestionnaire de secrets uniquement, jamais chat/GitHub. |
| `MIR_ESTIMATE_FROM` | Exemple de forme : `Les Revêtements MIR <estimation@envoi.revetementsmir.com>`, après vérification réelle du sous-domaine. |
| `MIR_ESTIMATE_TO` | Boîte de test fournie et autorisée par MIR dans la conversation, à enregistrer ici uniquement. |
| `MIR_ESTIMATE_MODE` | `test` sur MIR TEST. |
| `MIR_ESTIMATE_ENABLED` | `true` après les réglages ci-dessus. |

`SUPABASE_URL`, les clés publiques/privées automatiques et les variantes modernes sont lus dans le runtime Supabase. Aucun service-role dans le navigateur. L’organisation vient du compte MIR existant, pas d’une revendication client.

Dans le SQL Editor **MIR TEST**, après identification des vrais comptes : vérifier `mir_estimates.settings.organization_id`, ajouter uniquement le ou les UUID d’adjointe autorisés à `staff_user_ids` **sans remplacer les accès existants**, puis `enabled=true`. Le mode de diagnostic admin TEST a été refermé après les essais. Il ne sert qu’à vérifier le stockage sans fournisseur ; les scripts `mir-estimate-edge-real.cjs` et `mir-estimate-edge-boundaries.cjs` exigent son activation temporaire par un admin pour créer leurs données fictives, puis sa fermeture. Ils ne sont pas une recette de courriel réel.

Pour générer une migration : CLI Supabase. Pour déployer : entrée `supabase/functions/mir-estimates/index.ts` et ses deux dépendances `_shared/`, `verify_jwt=false` car l’entrée est publique ; les routes privées authentifient elles-mêmes chaque Bearer. Le déploiement ne rend pas le bucket public.

## Resend et DNS : reste à faire

1. Ouvrir **Resend → Domains**, vérifier si un expéditeur MIR existe déjà. Sinon ajouter **envoi.revetementsmir.com** sur le forfait gratuit.
2. Copier **les entrées exactes générées par Resend** (type, nom, valeur, priorité, TTL) dans le gestionnaire DNS hébergeant la zone `revetementsmir.com`. Le fournisseur DNS n’est pas connu dans cette session.
3. Ne remplacer aucun MX, SPF ou DKIM de la boîte existante à la racine. Seules les entrées du sous-domaine d’envoi et ses sous-noms générées par Resend sont concernées.
4. Vérifier le domaine dans Resend, créer une clé d’envoi et l’enregistrer dans les secrets Supabase ci-dessus.

Le script `tools/validation/mir-resend-domain.mjs` peut lire/créer ce seul domaine et exporter ses vraies entrées publiques (`--create`, `--out=/tmp/mir-resend-dns.json`) si une clé de gestion des domaines est déjà disponible dans le processus sécurisé. Il ne touche ni DNS ni abonnement, n’envoie aucun courriel et n’imprime jamais la clé. **Il n’a pas été exécuté, faute d’accès Resend**. Il n’existe donc pas encore de valeurs DKIM/SPF/MX générées à livrer ; ne pas copier des exemples comme s’ils étaient réels.

## Recette réelle puis production

La boîte de test est confirmée. Restent obligatoires : configuration de cette boîte dans les secrets, expéditeur vérifié, quatre courriels effectivement reçus, PDF joints panier/pliage, accès du compte d’adjointe et refus des autres comptes, reprise après interruption/échec, version Studio immuable, trois tailles navigateur. Les simulations de courriel ne valident pas cette étape.

Après réussite seulement : appliquer les migrations dans **MIR**, déployer la même fonction, configurer [les secrets MIR](https://supabase.com/dashboard/project/gccltmaulvrnthrbnrpd/functions/secrets) avec `MIR_ESTIMATE_MODE=production`, `MIR_ESTIMATE_TO=estimation@revetementsmir.com`, les vrais UUID d’adjointe et le budget 400 Mio ; activer les deux garde-fous (`settings.enabled` + secret ENABLED). Enfin renseigner uniquement l’URL publique `https://gccltmaulvrnthrbnrpd.supabase.co/functions/v1/mir-estimates` pour la production dans `dist/mir-estimate-config.js`, sans clé/expéditeur/destinataire.

Les liens explicites `estimation.html?recette=1` et `estimation-dossier.html?id=UUID&recette=1` visent MIR TEST. Le parcours public sans ce paramètre reste désactivé jusqu’à la recette réelle.
