# MIR — Phase 3A : fichiers privés, PNG et mise à niveau main

## État exact

**Phase 3A certifiée sur MIR TEST : 38/38 contrôles hébergés de la passerelle et 10/10 contrôles réels d’isolation bidirectionnelle tenant B réussis.** Aucune écriture ni lecture métier de MIR production, aucune fusion de PR, publication du site ou intervention Lot B.

## Reprise du 11 novembre 2026 — installation TEST réelle

- Préparation additive `chat_phase3a_private_file_gateway` appliquée avec succès sur `hxtztkmbfpmzrieccwsg`.
- Fonction `mir-chat-files` version 1 déployée ACTIVE, `verify_jwt=false` uniquement pour cette passerelle; Auth est vérifiée explicitement dans le code avant les contrôles SQL.
- Activation restrictive `chat_phase3a_private_file_activate` appliquée avec succès après contrôle anonyme 401 et prévol CORS 204 pour `https://revetementsmir.github.io`.
- Run hébergé [43045549628](https://github.com/revetementsmir/Revetements-mir-/actions/runs/43045549628), SHA `55c599774f743331b5160abbee29c05492cad427` : **27 réussites, 0 échec fonctionnel** sur le nouveau circuit; statut volontaire `BLOCKED_TENANT_B_ACCESS`.
- Reprise hébergée [43050426108](https://github.com/revetementsmir/Revetements-mir-/actions/runs/43050426108), SHA `6314817d1672a68c931de31cb1cdb822d6c42692` : **37 réussites, 0 échec fonctionnel**. Retrait du seul chantier QA puis nouvelle lecture 403; réintégration puis lecture 200; déconnexion locale acceptée, ancienne session 401, nouvelle session 200; restauration confirmée des affectations Employé et Chef. Le statut demeure volontairement `PARTIALLY_VALIDATED` et le job rouge (code 2) afin de ne pas masquer le blocage tenant B.
- Preuve d’expiration naturelle [43052372399](https://github.com/revetementsmir/Revetements-mir-/actions/runs/43052372399), SHA `74d805179270a2aec86bebf7168b8444a6e4ff02` : **38 réussites, 0 échec fonctionnel**. Le runner a attendu le `exp` réel du JWT pendant environ une heure, sans changer la configuration Auth; la nouvelle lecture a été refusée 401. La session Admin a ensuite été renouvelée et les restaurations QA ont réussi.
- Le header non standard `Cloudflare-CDN-Cache-Control` est retiré par la plateforme. Les réponses réelles conservent `Cache-Control`, `CDN-Cache-Control` et `Surrogate-Control` en `no-store`, `cf-cache-status: DYNAMIC`, `Vary: Authorization, Origin` et `nosniff`.
- L'ancien runner échoue désormais sur son upload Storage direct, attendu après activation; il ne faut pas rouvrir cet ancien accès. Le nouveau runner est exécuté avec `always()` afin de garder les deux résultats visibles.
- Recette ponctuelle tenant B [43067261753](https://github.com/revetementsmir/Revetements-mir-/actions/runs/43067261753), SHA `be90c35bb41def96a91cf90503b5c0b430d5369f` : **10 réussites, 0 échec**. Accès positifs A et B; conversations et fichiers refusés dans les deux sens croisés. Auth Supabase réelle, aucun JWT fabriqué. Le client B existant est intact.

La règle « ne publie rien » est respectée : déployer une fonction serveur TEST est une mise en service distincte du site public. Un seul compte Employé B de recette, son membership, son chantier et sa conversation ont été créés selon l’autorisation complémentaire. Le mot de passe aléatoire n’a existé qu’en mémoire, aucune réponse Auth ni jeton n’a été journalisé, puis les variables sensibles ont été libérées. La recette ponctuelle est désactivée par défaut dans le workflow et ne constitue pas une certification CI récurrente sans secrets. Les retraits d’accès A ont été restaurés.

## Git et modules protégés

- Main demandé et récupéré : `215259c957a1d939e9fbdc52524623153cc3b910`.
- Intégration sans conflit dans la branche existante `codex/phase-3a-clavardage-securite` : merge local `862123a2cda1d31e06998beb64b56ad031a5826f`. Ce n’est pas une fusion de PR ni un push sur main.
- Source de la dernière suite locale complète : `c385ad93eb20205769dc29024bf73a981bcbb98b`. Un ajustement ultérieur du seul contrat CI BECK (`f4a69a0d25d62151d69993a28358e970453e0ce0`) distingue notre delta des changements approuvés sur main; les octets de la passerelle restent ceux validés par la suite complète.
- Les sept fichiers BECK importés de main sont inchangés octet pour octet; leurs empreintes sont figées dans `tests/fixtures/mir-chat-main-215259.json` et vérifiées par test.
- Aucune modification Boutique, cartes Aujourd’hui, logique Punch/dossier chantier, CSS, Entrepôt ou QR. Le client chat et sa version de chargement seuls changent côté interface; aucune refonte visuelle.
- Les autres usages de `mir-internal` restent inchangés. Les liens signés hors chat restent à 300 secondes comme avant. Admin conserve ses droits techniques; son libellé opérationnel Boss est inchangé.
- La configuration Auth historique pointe encore vers l’ancien domaine. Elle est préservée et non corrigée hors périmètre; elle ne constitue pas une autorisation de travailler dans l’ancien dépôt. La passerelle préparée autorise l’origine du site actuel `https://revetementsmir.github.io`.

## Causes prouvées et périmètre de correction

| Sujet | Backend hébergé actuel | Correction préparée | Limite actuelle |
|---|---|---|---|
| Cache après retrait | Historique : l’ancienne URL authentifiée déjà cachée restait **200** | Chaque ouverture chat passe par POST authentifié et contrôle SQL courant; octets retournés avec no-store navigateur/CDN; plus de lien Storage chat au client | Déployé sur TEST : nouvelle lecture 403 après retrait, 200 après réintégration. Anciennes copies/liens restent à traiter; aucune promesse d’effacement à distance |
| Chemin encodé | Ancienne route Storage : **500**, non présentée comme corrigée | Canonicalisation stricte avant tout appel Storage | 400 prouvé en MIR TEST sur la passerelle; le 500 de la route native amont demeure distinct |
| Faux PNG | Historique : métadonnées seules acceptaient un texte déclaré PNG | Inspection réelle des octets avant upload et à la lecture; attestation serveur privée requise | Hébergé TEST : texte déclaré PNG et CRC invalide refusés 422; pas d’antivirus |

Source officielle consultée : [Supabase Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn). Elle précise que l’expiration/révocation d’un token ne purge pas nécessairement sa réponse CDN, que les TTL du token et du cache sont indépendants et que l’invalidation d’un objet peut prendre jusqu’à 60 secondes. **Raccourcir le TTL ou ajouter un nonce au seul navigateur n’est donc pas une garantie de révocation.**

La correction cible les nouveaux accès réseau. Elle ne peut effacer une image déjà reçue, enregistrée ou affichée par un appareil. Aucune suppression, rotation globale de clé, modification d’un bucket partagé ou migration improvisée des anciens fichiers n’est faite pour masquer cette limite.

## Architecture préparée, sans nouveau système de messagerie

Les conversations/messages, leur `organization_id`, les affectations actuelles, `conversation_allowed`, `chat_member_allowed` et `chat_attachment_writable` sont réutilisés. Le bucket reste `mir-internal`, privé. Aucun nouveau bucket, rôle métier, compte, conversation parallèle ou Centre d’aide.

La nouvelle fonction **`mir-chat-files`**, limitée au projet TEST par une garde serveur, prévoit :

1. POST JSON borné; schéma de requête strict; refus des chemins encodés avant de construire une URL Storage.
2. Auth vérifiée côté serveur par `/auth/v1/user`, puis accès courant contrôlé par RPC utilisateur, jamais par le seul navigateur.
3. Upload : identité et destination dérivées de l’utilisateur vérifié; nom de fichier généré côté serveur; contrôle des octets avant Storage; aucun `attachment_path` fourni par le navigateur n’est tenu pour fiable.
4. Lecture : autorisation actuelle, lecture privée par le serveur, inspection des octets, attestation, puis nouvelle autorisation/version avant délivrance.
5. Aucune URL signée Storage retournée. Réponses positives **et négatives** : `Cache-Control`, `CDN-Cache-Control`, `Cloudflare-CDN-Cache-Control` et `Surrogate-Control` en no-store; Vary Authorization/Origin, nosniff, Content-Disposition attachment.
6. Le navigateur utilise des blobs éphémères, révoqués à la déconnexion, au rafraîchissement et à la destruction du client. Une réponse arrivée après changement de session est refusée. Aucun repli vers un ancien lien signé chat.

`supabase/config.toml` prépare `verify_jwt=false` pour cette fonction seulement : son corps vérifie explicitement Auth et les accès SQL. Il ne s’agit pas d’un endpoint anonyme autorisant les fichiers. Aucun réglage hébergé n’a été changé. La clé service reste exclusivement dans l’environnement serveur; elle n’est ni dans le client, ni dans les rapports.

Une attestation technique est enregistrée dans `mir_core.chat_file_validations`, liée à l’objet/version, chemin, propriétaire, organisation, conversation, MIME, taille et SHA-256. RLS activée, aucun droit direct utilisateur, aucune auto-attestation. La RPC d’enregistrement est réservée à `service_role` et recalcule l’accès courant de l’acteur. Ce n’est pas une seconde table de documents métier.

Contrat d’identité à approuver avec cette architecture : les RPC **utilisateur** vérifient `auth.uid()`. La RPC technique d’attestation est réservée à la clé serveur, dont le JWT n’a normalement pas de `auth.uid()` utilisateur; elle reçoit l’acteur déjà vérifié par Auth dans la passerelle et recontrôle ses accès SQL. Elle n’est exécutable ni par anon ni par authenticated. C’est une exception explicite à la formulation antérieure « chaque RPC SECURITY DEFINER authentifie auth.uid() », et non une conformité revendiquée à cette formulation littérale. Aucune activation ne doit avoir lieu sans validation de ce contrat serveur. Aucun nouveau rôle ni JWT utilisateur/service fabriqué.

Point de compatibilité vérifié dans la [documentation Ownership](https://supabase.com/docs/guides/storage/security/ownership) : un upload avec clé serveur ne reçoit pas d’owner_id utilisateur. Pour ces objets, le propriétaire applicatif n’est reconnu que par une **attestation privée serveur** correspondant à l’objet/version et au chemin canonique. Avant cette preuve, l’objet reste refusé. Aucun UPDATE direct du schéma Storage, nouvel utilisateur, nouveau rôle ou JWT fabriqué. Les anciens objets ayant déjà un propriétaire utilisateur conservent leur validation; un test SQL reproduit les deux contrats réels de propriété.

## SQL préparé et ordre d’activation — autorisation manquante

1. `supabase/migrations/20261115134647_chat_phase3a_private_file_gateway.sql` : préparation additive de la table technique et des RPC. Ne ferme pas les anciennes policies à elle seule.
2. Déployer **sur MIR TEST seulement** le handler et ses deux modules partagés, puis vérifier le runtime, Auth, CORS et les contrôles réels.
3. Avec un client de recette compatible de cette branche, appliquer explicitement la proposition `supabase/proposals/20261116135048_chat_phase3a_private_file_activate.sql`. Elle est volontairement hors de la chaîne automatique : elle ferme INSERT/SELECT directs uniquement pour les fichiers chat et impose l’attestation au validateur de rattachement existant. Aucun DROP POLICY/FUNCTION.
4. Refaire les tests réels avant toute autre décision. Aucune publication du site ou migration production n’est incluse dans cet ordre.

**Ne pas activer le SQL restrictif seul** : l’ancien client chat utilise toujours des accès Storage directs. La bascule requiert le serveur et un client de recette compatibles, pas une modification aveugle de permissions.

Les deux scripts sont transactionnels, gardés par définitions/ACL/catalogues, refusent l’état partiel et sont exécutés chacun deux fois en PostgreSQL jetable. Après activation simulée, la préparation et la migration Phase 3A initiale restent répétables. Les policies des autres modules sont comparées et conservées strictement. L’absence ou l’incompatibilité ne déclenche aucune réparation destructive.

État MIR TEST contrôlé à **14:16:01 UTC** : les trois versions hébergées restent `20261111122840`, `20261111125722`, `20261111130350`. La table et la RPC de la nouvelle passerelle sont absentes. Un appel HTTPS à celle-ci retourne **404**; le test dédié se termine `BLOCKED_GATEWAY_NOT_READY` avant de créer des fixtures. Ces nouveaux scripts ne sont **pas** des migrations déjà appliquées.

## PNG : contrôle binaire effectivement exécuté localement

Le validateur contrôle signature PNG, IHDR, types/ordre/longueurs des chunks, CRC de chaque chunk, palette requise, IDAT contigus, IEND et absence d’octets après IEND. Il décompresse IDAT avec une limite calculée, vérifie la taille attendue et les octets de filtre, y compris les dimensions de passes Adam7.

Bornes techniques explicites : 10 Mio de fichier, 64 Mio décompressés, 16 777 216 pixels, 16 384 pixels par dimension, 4 096 chunks. APNG refusé, car les autres frames ne sont pas analysées. Ces limites évitent la décompression non bornée; elles peuvent refuser une image légitime trop grande. JPEG/WebP/HEIC/HEIF restent pris en charge avec des contrôles de **signature seulement**, pas un décodage complet.

**Pas d’antivirus, pas de preuve d’innocuité, pas de rendu/décodage intégral des pixels.** Un PNG valide peut contenir des métadonnées arbitraires. Les assertions sur la structure PNG ne doivent pas être présentées comme une détection de malware.

Correction de preuve importante : l’ancienne fixture dite « PNG valide de 68 octets » possède en réalité un **CRC invalide**, désormais détecté `PNG_CRC`. Son acceptation antérieure ne prouvait que le contrat de métadonnées/transport. La nouvelle fixture de **70 octets**, générée avec CRC corrects et contrôlée par ce validateur, est utilisée dans les nouvelles recettes. L’historique antérieur n’est pas effacé.

## Résultats, avec séparation des environnements

### Local et simulé

**43/43 suites réussies** sur `c385ad9` : 18 statiques/unitaires, 9 PostgreSQL jetables, 16 UI simulées, incluant les nouveaux tests BECK. Dans ces suites : 8 groupes de tests du service/binaire et 14 scénarios PostgreSQL spécifiques à la passerelle, y compris la propriété applicative d’un upload serveur sans owner_id. Les tests du service utilisent Request/Response avec Auth/Storage simulés; ce ne sont pas des requêtes vers la nouvelle fonction hébergée.

Formats UI simulés : **360, 390, 430, 768, 1024, 1440 px**. Accueil, Boutique/BECK, Pliage, Magasin, Entrepôt, Réalisations, Studio, Aujourd’hui, Punch et dossier chantier couverts. Aucun test sur appareil physique, aucune nouvelle capture UI réelle hébergée prétendue. Pas de changement visuel à illustrer; les captures antérieures restent des simulations.

Premier passage intermédiaire `c830097` : **42/43**. Le contrat Aujourd’hui détectait les ajouts chat hors de son ancien bloc normalisé; il n’y avait pas de changement aux cartes ou au Punch. Le correctif isole précisément le bloc chat/upload et ses trois appels de révocation, tout en conservant les empreintes des autres octets client. Ce n’est pas une suppression de contrôle. Le dernier passage complet est bien 43/43.

### Réel MIR TEST — backend actuellement installé

- [49/49 contrôles chat HTTP](https://github.com/revetementsmir/Revetements-mir-/actions/runs/43039915644), **statut `PARTIAL_TENANT_B_BLOCKED`**, pas certification intégrale de la nouvelle passerelle.
- [Six comptes réels](https://github.com/revetementsmir/Revetements-mir-/actions/runs/43039915588) : job réel réussi; job UI/SQL simulé réussi également. Employé/Chef/Adjointe/Boss/Admin vérifiés, Entrepôt refusé sur le chantier sans opération logistique, sans changer les rôles.
- Session opérateur : **50 contrôles réussis, 1 échoué**. Cet échec est l’ancienne réponse authentifiée cachée encore 200 après retrait. Les scores se recouvrent; ne pas les additionner en tests distincts.
- Nouveau PNG 70 octets accepté par le backend actuel; chemins/propriétaires/conversations interdits et fichiers inexistants refusés; le faux PNG déclaré reste accepté par métadonnées, limite hébergée non corrigée tant que la bascule est absente.
- Pagination/recherche : 57 messages de recette sans trou ni doublon; demande 99999 bornée à 50; canari de conversation non autorisée introuvable.
- Huit créations de conversation : même UUID. Huit envois idempotents : un message; SQL confirme 9 reçus/9 notifications et 58 non-lus cohérents après lecture pour soi.
- Retrait du chantier QA A **14:10:31 → restauration 14:11:04 UTC**; retrait équipe A **14:14:25 → restauration 14:14:46 UTC**. Nouvelles RPC refusées, privé et chantier indépendant préservés, réintégrations et historique confirmés. Aucun accès B modifié.
- Lien signé actuel 300 secondes réellement refusé en HTTP après **419,5 secondes**; le contrôle court 5 secondes est aussi relancé. Cela ne prouve pas un plafond universel ni l’invalidation de toutes les réponses CDN.
- Ancienne traversée `%2e%2e` : **HTTP 500 toujours reproduit**, non compté comme un succès RLS. Pas de réparation du routage amont réalisée.

Le test `tools/validation/mir-chat-files-real.py` certifie le circuit installé : fermeture des accès natifs, accès positif par passerelle, retraits/réintégrations et sessions. La recette tenant B séparée certifie les accès positifs de chaque organisation et les refus croisés. Les lancements restent explicites dans Actions, sans redéploiement automatique.

### CI et avis existants

Au SHA `f4a69a0` : **10 workflows réussis, 2 échoués**. Les rouges sont les erreurs SQL héritées `42704 — role service_role does not exist`, déjà isolées sur main : aucun correctif hors périmètre. Le QR Entrepôt est vert sur cette relance; son historique intermittent n’a pas été corrigé ni supprimé.

Pendant la recette, main a avancé indépendamment vers `ebf54f676a84fc01717543f0cec224a173f90171`, fusion de la PR #7 « Test MIR — aligner BECK sur le seul format 1½ po ». La CI teste une fusion synthétique avec ce nouveau main : notre premier garde de hash intégral de catalogue a donc échoué, alors que notre branche n’avait pas modifié BECK. Le correctif `f4a69a0` compare le delta de **notre tête de PR** à son ancêtre commun avec main pour les sept fichiers protégés, sans figer ni masquer les modifications approuvées ailleurs. Historique Git complet récupéré en CI; contrôle des SHA et absence de modifications Phase 3A vérifiés. La base demandée `215259c` reste intégrée; aucune autre PR fusionnée par cette mission, aucun catalogue réécrit. Les nouveaux formats de main restent sous l’autorité des tests Boutique de main.

Les avis Security Advisors TEST ont été relus : types INFO/WARN existants sur policies absentes, search_path, EXECUTE SECURITY DEFINER et protection des mots de passe. Ils ne sont pas présentés comme tous résolus. La passerelle et sa recette dédiée ont été contrôlées par les preuves hébergées ci-dessus; ces avis généraux demeurent distincts.

## Compte tenant B : provisionnement ponctuel certifié

Audit préalable réel : projet **MIR TEST `hxtztkmbfpmzrieccwsg`**, tenant B **`3005c762-de14-4ab0-8bc8-16c4be92d0a4`** : zéro compte de recette équivalent, un client actif et zéro interne actif. Après autorisation, un seul compte Employé de recette a été créé avec son membership minimal, un chantier et une conversation balisés. Contrôle final : un utilisateur de fixture, un interne de fixture, un chantier de fixture, une conversation de fixture et toujours un client original actif. Le client existant et ses droits n’ont pas été modifiés.

Le compte local derrière l’alias historique `MIR_SANDBOX_OTHER_CLIENT` est en réalité un Employé de **A**, pas de B; il ne doit pas être copié dans les secrets B sur la foi du nom de variable. Organisation et rôle sont toujours contrôlés côté serveur.

La fonction TEST `mir-chat-tenant-b-recipe` v2 et la RPC `mir_chat_tenant_b_recipe_provision` sont réservées à cette preuve. La RPC est révoquée de `public`, `anon` et `authenticated`, accordée uniquement à `service_role`; la fonction exige une session Admin A vérifiée avant provisionnement. Les migrations officielles installées sont `chat_phase3a_tenant_b_recipe`, `chat_phase3a_tenant_b_recipe_acl` et `chat_phase3a_tenant_b_operational_role`.

Le runner vérifie organisation/rôle par Auth et RPC, puis les accès positifs et les refus A→B/B→A. Sa voie ponctuelle est désactivée par défaut après certification. Une exécution récurrente future exigerait des secrets dédiés; la présente exception en mémoire ne les remplace pas.

## Décisions réellement nécessaires avant la suite

1. **Traitement éventuel des anciennes capacités de téléchargement** : accès fournisseur/purge CDN ou plan de retrait des anciens liens en préservant les fichiers et l’historique. Les copies déjà reçues ne sont pas révocables à distance.
2. **Route Storage native 500** : correction amont/fournisseur nécessaire pour garantir son 4xx. La passerelle refuse ses propres chemins encodés de manière contrôlée, mais ne réécrit pas le service Storage Supabase.
3. **Recette B récurrente** : si elle devient nécessaire, configurer séparément les secrets CI prévus. La certification ponctuelle actuelle ne les crée pas et ne les requiert pas.

Le détail des fichiers, hashes, scénarios et résultats est dans [le JSON](mir-chat-phase3a-private-files-results.json). Le patch Phase 1 non suivi préexistant reste intact et exclu des commits. Méthode Tests appliquée sans synchronisation Atelier : aucun partage externe autorisé ni tenté dans cette reprise.
