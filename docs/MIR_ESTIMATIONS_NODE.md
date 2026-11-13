# Estimations MIR — service commun et état réel

Le formulaire général, le Studio, le panier et le dossier de pliage utilisent le même endpoint. GitHub Pages sert les pages statiques ; il n’exécute pas Node et ne peut pas envoyer de courriel. Le dossier serveur est enregistré sur un volume privé, les fichiers PDF d’origine sont conservés avec leur SHA-256 et l’instantané soumis du Studio est indépendant du projet local qui peut continuer à évoluer.

## Service déjà présent et réutilisation

`server/supplier-send.cjs` possède les garanties d’une file fournisseur : PDF figé, empreinte vérifiée, clé d’idempotence stable, preuve d’acceptation avant confirmation et rapprochement des résultats incertains. Ce contrat concernait des bons approuvés et authentifiés Admin, pas les demandes publiques. Il n’avait ni prestataire courriel configuré ni adaptateur d’hébergement actif selon `docs/MIR_PURCHASE_ORDERS.md`.

Le service `server/estimate-service.cjs` reprend ces mêmes garanties et l’interface de transport `send({idempotencyKey,from,to,subject,text,attachments}) → {accepted,messageId}` sans donner l’accès Admin fournisseur à des visiteurs. Le module fournisseur existant n’est pas modifié. `server/estimate-provider.cjs` fournit le transport Resend configuré côté serveur et le vérificateur équipe utilisant l’Auth et la RPC de compte MIR existantes. Aucun compte, domaine ou abonnement courriel n’a été créé.

Vérification en lecture de cette séance : les projets Supabase **MIR** et **MIR TEST** ont chacun retourné une liste d’Edge Functions vide. Aucune nouvelle fonction ni migration distante n’a été déployée par cette implémentation serveur. La disponibilité d’un compte Supabase ne prouve pas qu’un prestataire courriel est configuré.

## Contrat HTTP

- `GET /api/estimates/config` : `enabled`, limites réelles, destinataire et **noms** des réglages manquants. Aucun secret.
- `POST /api/estimates` : `multipart/form-data`, un `requestId` UUID et un `payload` JSON. Fichiers `plans` répétés et un `dossier` PDF si la source est `cart` ou `bending`.
- `GET /api/estimates/:id` : fiche privée, avec Bearer utilisateur.
- `GET /api/estimates/:id/files/:fileId` : PDF original privé en téléchargement. Jamais un chemin de fichier fourni par le navigateur.
- `GET /api/estimates/:id/studio` : instantané privé JSON ; jamais du HTML exécutable.

Le payload est `{version:1,source:'general'|'studio'|'cart'|'bending',contact:{name,email,phone},address:{street,city,postalCode},note,selection?,studio?}`. Nom et courriel obligatoires, téléphone facultatif ; rue, ville et code postal obligatoires. La note est facultative. Les groupes « À estimer » et « Aperçu seulement », les ouvertures nécessaires au métré et les vues 2D/3D sont conservés tels que soumis dans l’instantané Studio. Les quantités Studio portent la mention « Métré préliminaire à valider ». Les données soumises ne sont jamais utilisées comme HTML de courriel.

Limites par défaut : **5 PDF**, **20 Mio par fichier**, **25 Mio pour l’ensemble des fichiers**, **8 Mio pour le JSON de projet**. L’import local du Studio peut accepter des fichiers plus gros : cette limite locale n’est pas une limite d’envoi. Le formulaire doit l’expliquer avant la tentative. Le serveur vérifie également le MIME, l’extension et les signatures `%PDF-` / `%%EOF`, puis la taille du corps lu en streaming. Cela ne constitue pas un antivirus ; les originaux sont servis uniquement en pièce jointe, `nosniff`, `no-store` et CSP sandbox. Des scans supplémentaires peuvent être ajoutés sur l’hôte privé selon sa politique.

## Enregistrement, envoi et reprises

Les fichiers et le JSON source sont écrits dans une zone temporaire privée avec synchronisation disque, puis le dossier complet est renommé atomiquement. Le JSON source n’est plus réécrit. Un second fichier atomique conserve le statut technique. Une interruption ne modifie pas rétroactivement le contenu soumis.

Un verrou disque par UUID sérialise les demandes concurrentes, avec heartbeat et reprise d’un bail mort après cinq minutes. La même requête avec le même contenu retrouve la même fiche. Le même UUID avec d’autres coordonnées, choix ou octets est refusé avec `409 IDEMPOTENCY_CONFLICT` : le client doit conserver le contenu figé d’une tentative incertaine. Les PDF sont revérifiés au SHA-256 avant leur envoi et avant leur téléchargement privé.

Le courriel utilise `mir-estimate-UUID` comme clé stable. Resend conserve les clés 24 heures ; après **23 heures** sans preuve enregistrée, le service bloque la reprise automatique et exige un rapprochement par MIR. Il ne suppose jamais une déduplication éternelle et ne remet pas une transmission ambiguë en file avec une nouvelle clé. Un administrateur d’exploitation doit rapprocher la clé et la preuve fournisseur avant toute reprise manuelle ; ne pas supprimer la fiche pour réessayer.

`{ok:true,state:'received',id,requestNumber}` n’est renvoyé qu’après enregistrement durable **et** acceptation du courriel journalisée. L’acceptation fournisseur ne prouve pas une lecture humaine. Si le fournisseur a accepté mais que la réponse réseau ou la journalisation est interrompue, la reprise utilise les mêmes octets et la même clé. Échec de validation : 400/413/415 et `retryable:false`. Échec temporaire : 503 et brouillon à reprendre. Une opération déjà en cours répond 409 `BUSY` avec `retryable:true`.

Pour `general` et `studio`, le courriel contient les coordonnées et un lien vers la fiche privée, sans publier les originaux. Pour `cart` et `bending`, il contient également le PDF du dossier en pièce jointe et la sélection. Tous les fichiers reçus restent consultables dans la fiche privée. Le destinataire est imposé côté serveur : le navigateur ne peut pas le remplacer.

## Accès privé

Le service vérifie le Bearer auprès de `/auth/v1/user`, puis relit `mir_account_snapshot` avec ce même utilisateur. L’identifiant utilisateur, l’organisation et le rôle doivent correspondre. Les revendications `user_metadata` sont ignorées. Les Admins MIR vérifiés peuvent consulter les fiches ; une adjointe avec rôle Employé doit figurer explicitement dans `MIR_ESTIMATE_STAFF_USER_IDS`. Les autres employés, les clients, les comptes d’une autre organisation et les visiteurs sont refusés. Une URL connue ou un `noindex` ne donne aucun droit.

Le jeton n’apparaît jamais dans le lien courriel ni dans l’URL de la fiche. La page privée doit demander la session équipe existante et envoyer le Bearer dans l’en-tête uniquement. Les SVG reçus doivent rester des images isolées et la 3D doit être reconstruite depuis les données, jamais exécutée comme un HTML reçu.

## Configuration et mise en service

Sur un hôte Node **22 ou 24**, installer le dépôt serveur et monter un volume persistant privé. Ce processus est prévu pour une seule instance Node ou des instances partageant le même volume et les mêmes verrous POSIX. Ne pas utiliser un disque éphémère de fonction/serverless et ne pas exposer le répertoire du volume comme fichiers statiques.

Configurer les variables de `server/estimate.env.example` dans le **gestionnaire de secrets de l’hôte serveur**, pas dans GitHub Pages ni dans une variable de build publique :

| Réglage | Emplacement / action |
|---|---|
| `MIR_ESTIMATE_DATA_DIR` | Monter le volume privé persistant, hors `dist`, sauvegardé et chiffré par l’hébergeur. |
| `RESEND_API_KEY` | Créer/réutiliser une clé d’envoi limitée dans Resend, la placer uniquement sur cet hôte. |
| `MIR_ESTIMATE_FROM` | Expéditeur dont le domaine est vérifié dans **Resend → Domains** ; terminer ses vérifications DNS. |
| `MIR_ESTIMATE_TO` | D’abord une boîte de recette réellement contrôlée par MIR. Après recette reçue et vérifiée : `estimation@revetementsmir.com`. |
| `MIR_ESTIMATE_PRIVATE_URL` | `https://revetementsmirweb.github.io/MIR/estimation-dossier.html`, dont l’accès API reste authentifié. |
| `MIR_ESTIMATE_SUPABASE_URL`, `MIR_ESTIMATE_SUPABASE_PUBLIC_KEY` | Projet MIR existant `gccltmaulvrnthrbnrpd`, valeurs publiques existantes. **Aucune service-role nécessaire.** |
| `MIR_ESTIMATE_ORGANIZATION_ID` | UUID de l’organisation MIR existante, relu dans le compte réel autorisé. |
| `MIR_ESTIMATE_STAFF_USER_IDS` | UUID Auth de l’adjointe autorisée, compte actif dans cette organisation. |
| `MIR_ESTIMATE_ALLOWED_ORIGINS` | Origines HTTPS exactes séparées par virgules, dont `https://revetementsmirweb.github.io`. Aucun joker. |
| `MIR_ESTIMATE_RATE_SECRET` | Secret serveur aléatoire pour hacher la clé réseau du limiteur. |
| `MIR_ESTIMATE_RATE_MAX` | 8 tentatives/minute par connexion réseau par défaut. Un proxy partagé devra adapter sa limite réseau en amont ; le service n’accepte pas aveuglément un `X-Forwarded-For` client. |
| `MIR_ESTIMATE_ENABLED` | `true` seulement lorsque volume, expéditeur, destinataire et droits privés sont prêts. |

Démarrage : `node server/estimate-server.cjs`. Mettre un reverse proxy **HTTPS** devant le port privé (127.0.0.1:8787 par défaut), limiter aussi les uploads et les abus sur ce proxy et donner à l’utilisateur système les droits sur son seul volume. Conserver l’API sous `/api/estimates` ; aucun chemin interne du volume n’est routé publiquement.

Renseigner ensuite l’URL HTTPS de cette API dans `window.MIREstimateConfig.apiBase` du site. Cette URL seule est publique ; les autres clés restent serveur. Tant qu’elle est vide ou que `/config` retourne `enabled:false`, l’interface doit annoncer l’envoi indisponible et conserver le brouillon, sans afficher « Demande reçue ».

À configurer / non vérifié à distance à la livraison de ce module : hôte HTTPS persistant, clé et domaine expéditeur Resend, boîte destinataire de test réelle, UUID d’organisation et d’adjointe effectivement autorisés, puis URL publique de l’API. Le présent module ne certifie ni une livraison à une boîte externe ni un service de production actif.

## Tests réellement exécutés

`node --test tests/mir-estimate-service.cjs` : **8 tests réussis** avec vraies requêtes HTTP locales, un vrai volume temporaire privé, vrais octets PDF et un prestataire **capturé sur localhost**. Aucune adresse externe ni aucun compte client réel ne reçoit de message.

Les contrôles couvrent les quatre sources, les pièces jointes exactes, la fiche et la 3D privées, refus visiteur/client/organisation étrangère, snapshot inchangé après modification de l’objet client, double clic, redémarrage du service, réponse perdue après acceptation, échec 503 puis reprise, fenêtre d’idempotence, erreurs de fichiers, absence de configuration et CORS. L’Auth distante est simulée pour les tests unitaires ; un test distinct vérifie que l’adaptateur consulte réellement les deux endpoints attendus et refuse `user_metadata` comme autorisation.

`tests/helpers/mir-estimate-http-fixture.cjs` fournit `createFixture({origin,privateBaseUrl})` pour une recette navigateur locale. Elle utilise une boîte HTTP locale, un destinataire `.invalid` et le Bearer factice `staff-test`. Elle n’est jamais importée dans `dist` ou dans l’entrée de production. Son option HTTP de test exige un transport et une authentification injectés et un destinataire `.invalid` ; elle ne désactive pas HTTPS en production.

Avant activation : refaire les quatre parcours avec la véritable destination de test, vérifier les PDF reçus et la fiche avec le compte d’adjointe, simuler une interruption de réponse sans changer d’UUID, modifier le Studio après l’envoi puis relire la version reçue. Ces essais externes sont **bloqués tant que les configurations ci-dessus ne sont pas fournies** ; les tests localhost ne les remplacent pas.
