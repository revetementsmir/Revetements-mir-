# Connexion et invitations équipe — audit et plan MIR TEST

## État et périmètre

Base auditée : `d4a9ec05ee9a0c2ede0713efab0add860a9507cb`, `main` distant revérifié, dépôt `revetementsmir/Revetements-mir-`. Branche dédiée : `codex/test-employee-auth-invitations`. Ancien checkout et correction antérieure préservés ; aucun changement transposé. Aucun AGENTS.md trouvé. README, documentation mobile, recette Samsung et feuille de route versionnée relus.

**Publication post-fusion non vérifiée : implémentation suspendue conformément à la demande.** Ce lot contient uniquement cet audit et le plan. Aucune migration, fonction Auth, configuration, source Android ou interface modifiée. Aucun nouvel APK construit. La recette physique Samsung reste ouverte.

Les GET des deux manifestes publics suivants échouent avant réponse HTTP du site :

- `https://revetementsmir.github.io/Revetements-mir-/mir-production-release.json`
- `https://revetementsmir.github.io/Revetements-mir-/test/mir-test-environment.json`

Erreur complète : `curl: (56) CONNECT tunnel failed, response 403`, code curl 56, HTTP effectif 000. Le proxy répond `HTTP/1.1 403 Forbidden`, `server: envoy`.

La commande `gh api 'repos/revetementsmir/Revetements-mir-/actions/runs?per_page=1'` échoue avec `Get "https://api.github.com/repos/revetementsmir/Revetements-mir-/actions/runs?per_page=1": Forbidden`. L’accès Git fonctionne ; cela ne prouve ni l’accès API Actions ni la publication. Aucun accès Supabase production tenté, aucune requête Supabase TEST exécutée pendant cet audit.

Connecteur Atelier absent : feuille de route serveur non consultable, aucune synchronisation revendiquée. La référence locale est `docs/MIR-PROMPT-2-ETAT-ET-PASSATION-CODEX.md`, notamment sections 3.1, 3.2 et Phase 11. Elle signale des écarts historiques entre migrations versionnées et objets distants : ne pas supposer une égalité. Ce document constitue le bilan à transmettre à Atelier.

## Connexion : constats prouvés dans les sources

- `dist/portal-client.js` possède déjà connexion courriel, OAuth Google, récupération, choix de mot de passe, capture/nettoyage des callbacks et relecture de compte côté serveur. Réutiliser cet adaptateur.
- `dist/portal-config.js` désactive Google dans le mode TEST. Les flags production et une ancienne preuve de configuration du 8 novembre ne prouvent pas la disponibilité Google actuelle dans TEST.
- `mobile/tools/build-web.cjs` fixe TEST et désactive Google, courriel de récupération, inscriptions et invitations. `mobile/web/bootstrap.js` masque Google et le lien de récupération ; `mobile/web/sdk.js` refuse explicitement OAuth, récupération, renvoi et inscription. Les gardes JS/natives et CSP refusent les endpoints et navigations non énumérés. Activer un bouton seul ne rendrait pas ces parcours fonctionnels.
- Le bouton Google web emploie actuellement un caractère « G » stylisé. Prévoir la ressource officielle et ses règles de marque, avec libellé accessible, focus visible et contraste ; ne pas faire passer le caractère existant pour un logo officiel.
- L’APK relit `mir_account_snapshot` avant les RPC métier et refuse Admin technique et client. Aucun sélecteur de rôle ne doit être ajouté. Le portail connaît déjà les rôles opérationnels et Punch à l’accueil ; ne pas déclencher de punch à la connexion.
- Le problème personnel de Frederick n’est pas diagnostiqué côté serveur. Sans appel réel autorisé/exécutable et sans message exact, on ne peut conclure à un mauvais mot de passe, une identité non confirmée, un membre désactivé, une affectation absente ou un rôle interdit. Aucun compte ni mot de passe modifié.

### Diagnostic Frederick à effectuer après levée du préalable

Sur le seul projet `hxtztkmbfpmzrieccwsg`, capturer un code/message d’erreur nettoyé, version APK/WebView et mode web/APK. Vérifier identité confirmée, appartenance active, organisation, rôle opérationnel et affectations par les mécanismes existants. Comparer Auth et autorisation métier : ne pas créer un deuxième compte ni réinitialiser un mot de passe pour contourner un refus. Ne consigner aucun jeton, mot de passe, lien d’invitation réel ou données personnelles dans Git/captures. Limiter les essais de connexion pour éviter un verrouillage.

## Invitations : audit du contrat versionné

Source principale : `supabase/migrations/20261108134535_mir_account_customer_auth.sql` ; client `dist/portal-client.js`, écran `dist/chantier-app.js`.

| Exigence | Existant observé | Écart à traiter après publication vérifiée |
|---|---|---|
| Invitation nominative | Courriel et chantiers, request_id | Nom et rôle opérationnel demandés absents du contrat |
| Création Boss/Adjointe | Création, liste et révocation vérifient admin technique | Vérifier les contrats distants puis permissions Boss/Adjointe explicites, même organisation, aucun nouveau rôle Admin |
| Secret personnel | Jeton aléatoire, empreinte SHA-256 stockée | Conserver secret hors journaux et stockage public |
| Expiration / identité | 72 h, courriel confirmé, comparaison normalisée, verrou FOR UPDATE | Étendre la recette : mauvais compte, concurrence et redirection sûre |
| Usage unique | Même utilisateur reçoit alreadyAccepted ; autre utilisateur refusé | Conserver l’idempotence sans réappliquer rôles/affectations ni produire de nouvelle session |
| Compte préexistant | Upsert d’appartenance | L’acceptation actuelle peut remettre active=true et changer un rôle non-admin en employee : empêcher réactivation/élévation involontaire et écrasement d’un rôle existant |
| Renvoi | Pas de contrat explicite observé | Rotation atomique du jeton, invalidation de l’ancien lien, verrou et journal, idempotence |
| Révocation | Révocation avant acceptation, limitée à l’organisation | Distinguer invitation révoquée et employé désactivé ; gérer course acceptation/révocation |
| Envoi | manualInvitations et réponse prepared, aucun envoi auto | Aucun service mir-invitations versionné trouvé ; la branche non manuelle du client n’établit pas son déploiement |
| États | pending/accepted/expired/revoked, quelques libellés de transport | Modéliser attente/envoi/activation/expiration/révocation et état d’employé indépendamment |

Le client conserve un chemin Edge `mir-invitations`, mais cette fonction n’a pas été trouvée dans les sources. Aucun expéditeur vérifié pour ce flux dans TEST. Ne pas réutiliser aveuglément un expéditeur d’estimations ; la preuve du transport de ce nouveau flux manque.

## Sessions Android : audit

- Stockage Auth asynchrone via `MIRNativePlugin`, AES-GCM Android Keystore et fichier privé `noBackupFilesDir/mir-auth.enc`. Pas de copie de jeton dans localStorage par cet adaptateur.
- `persistSession:true`, pause/reprise du renouvellement avec le cycle de vie, contrôle getUser à la reprise. Cela reste une lecture du code, pas une preuve de persistance réelle après redémarrage physique.
- Déconnexion SDK actuellement locale, purge du coffre, localStorage/sessionStorage, IndexedDB, historique/cache/cookies WebView et fichiers privés temporaires. L’ouverture IndexedDB bloquée peut empêcher un changement : conserver ce refus sûr.
- Une purge déclenchée par événement Auth est asynchrone et ignore certaines erreurs ; vérifier les courses avec affichage des anciennes données. Revoir révocation distante, refresh token et expiration hors ligne, sans promettre une invalidation instantanée des JWT déjà émis.
- Aucun `BiometricPrompt` ni clé exigeant authentification utilisateur dans le coffre actuel. Prévoir un déverrouillage système facultatif compatible, distinct de l’authentification serveur. Aucun NIP MIR, aucune biométrie transmise à MIR. Tester annulation, absence de verrou système, changement d’empreinte, invalidation de clé et retour courriel. Ne pas fragiliser l’accès existant en cas d’indisponibilité.
- Même identifiant, clé de signature et coffre requis pour une mise à jour conservant la session. Les runners utilisent une signature debug éphémère ; pas de promesse de mise à jour entre deux APK signés différemment. Aucune signature release ni prise en charge iOS prévue par ce lot.

## Plan d’implémentation après confirmation de publication

1. Vérifier la révision réellement publiée post-fusion et son manifeste TEST ; obtenir un journal de déploiement et le SHA correspondant. Réconcilier ensuite les contrats TEST utiles avec les migrations versionnées en lecture seule. Ne contacter aucun backend production.
2. Diagnostiquer l’accès Frederick sans mutation ; valider les capacités réelles Google et expéditeur TEST. Terminer les travaux indépendants si une configuration manque, en conservant les actions indisponibles honnêtes.
3. Réutiliser Auth Supabase et l’adaptateur portail. Concevoir l’écran privé : logo MIR, Google officiel, bouton courriel qui ouvre le formulaire, récupération ; pas de rôle, pas de parcours commercial. Utiliser une entrée TEST fixe ; ne pas activer ces changements dans la branche production des configurations partagées.
4. Concevoir OAuth Android avec navigateur système, PKCE et retour validé vers l’application. Réutiliser la session Supabase/coffre existants, état et nonce si requis par le flux choisi ; aucun jeton dans URL/journal. Préserver les gardes privées : un assouplissement global de navigation ou Auth n’est pas acceptable. Le choix exact des liens de retour et de leur association doit être documenté et testé avant activation.
5. Étendre le contrat existant d’invitations avec permissions opérationnelles Boss/Adjointe, nom/rôle/affectations validés côté serveur, isolation d’organisation, anti-élévation et désactivation respectée. Refuser les rôles et organisations injectés ou non autorisés ; séparer prévisualisation et mutation.
6. Ajouter registre d’envoi idempotent et réconciliation de résultat fournisseur. « Expédiée » seulement après confirmation du fournisseur, jamais sur création du lien. Distinguer acceptation fournisseur, remise et lecture. Résultat inconnu : vérifier avant renvoi ; rotation/révocation transactionnelles. Le contenu ne contient jamais de mot de passe temporaire.
7. Renforcer session/purge/révocation avec tests de courses ; ajouter le verrou système facultatif si compatible sans changer l’autorité serveur. Conserver Punch explicite.
8. Recette ciblée, captures réellement ouvertes et inspection téléphone/tablette, clavier, clair/sombre, grand texte. Produire un nouvel APK TEST seulement si les sources changent et documenter version, SHA source, SHA-256 et signature. Conserver la recette Samsung ouverte jusqu’aux essais physiques.

### Interventions de configuration nécessaires, non exécutées

- Google TEST : vérifier le fournisseur sur `hxtztkmbfpmzrieccwsg`, le client OAuth autorisé et l’URI de callback Supabase TEST ; configurer les retours web TEST et Android retenus, restrictions et éventuels utilisateurs de test. Secrets Google uniquement côté serveur. Une personne habilitée doit confirmer ces paramètres ; aucun changement de compte/secret automatique.
- Expéditeur : confirmer service et domaine expéditeur autorisés, identité From, réponse/aide et stockage serveur des secrets. Mode aperçu sans envoi par défaut. La destination d’un futur essai doit être vérifiée et explicitement autorisée séparément.
- Publication : accès aux manifestes Pages et journal de déploiement actuellement bloqués par le tunnel réseau. La fusion Git seule ne suffit pas à lever le préalable utilisateur.

## Brouillon éditorial du courriel — aucun envoi ni rendu certifié

Objet : Votre accès personnel à l’équipe MIR TEST

Bonjour [prénom],

[Responsable MIR] a préparé votre accès à l’organisation [organisation]. Pour activer cet accès avant [expiration avec fuseau], ouvrez [lien personnel d’activation TEST]. Connectez-vous avec Google en utilisant exactement l’adresse invitée, ou choisissez votre mot de passe dans le parcours sécurisé. Aucun mot de passe temporaire ne vous est envoyé.

Accès web de recette : [URL TEST vérifiée]. Ce lien d’activation est personnel. S’il est expiré, demandez un nouveau lien à votre responsable. Si vous n’attendiez pas cette invitation, ne l’utilisez pas et contactez [aide vérifiée].

Installation : la version Android de ce lot est un APK TEST debug réservé à la recette autorisée. Elle n’est pas une version de production à distribuer aux employés. Une procédure de distribution approuvée et une signature durable seront nécessaires avant une invitation opérationnelle contenant un lien d’installation.

Prévoir versions texte/HTML, logo MIR local, CTA d’activation, expiration explicite, aide et accès web sans exposer jeton ou données dans les captures. Vérifier ensuite réellement le rendu avec valeurs fictives et liens example.invalid, clair/sombre et mobile ; ce brouillon textuel ne constitue pas cette vérification.

## Validation réalisée pendant l’audit

Base identique à main ci-dessus. Aucune neutralisation de test.

- `node --test mobile/tools/test-contracts.cjs tests/mir-account-session.cjs` : **18 réussites / 21**, trois échecs ENOENT parce que `mobile/www` n’a pas été généré. Le test des frontières réseau, les rôles permis/refusés, la purge simulée et les deux tests de concurrence de session passent ; les trois tests de ressources générées ne sont pas certifiés. Les ressources générées restent à préparer lors de la reprise des validations.
- `node tests/mir-account-flow.cjs` : PASS, retour sûr, séparation d’environnements, panier, expiration et nettoyage des callbacks (local).
- `node tests/mir-account-public-config.cjs` : PASS, clés publiques et configurations isolées (local ; ne prouve pas Google réel).
- Aucun test navigateur de ce nouveau lot, émulateur, inspection de captures ou test physique exécuté. Aucun test réel d’envoi. Aucun contrôle Supabase production.
- `git diff --check` : PASS sur le document final.

Preuves d’exécution locales : `artifacts/employee-auth-audit/` (ignoré par Git). Elles ne sont pas des résultats CI.

### Matrice de recette prévue

SQL/RLS local puis TEST autorisé : organisations A/B, mauvais compte, identité non confirmée, expiration, rejeu, renvoi, révocation concurrente, doublons, rôle injecté, employé désactivé et réactivation refusée. Transport simulé : fournisseur accepte/refuse/timeout, reprise idempotente, aucun état expédié prématuré. Auth simulée puis Google/courriel réels selon configuration, retour web/APK et récupération sans fuite. Android émulateur : fermeture/redémarrage/recréation, mise à jour même signature, renouvellement, révocation, hors ligne, purge et déverrouillage optionnel. Inspection réelle des captures sans données privées. CI et téléphone physique restent des niveaux distincts.

### Checklist Samsung ouverte

- Vérifier modèle, Android/One UI, WebView, versionCode, SHA source et SHA-256 de l’APK TEST fourni pour recette ; aucun lien inventé.
- Installation depuis Mes fichiers avec autorisation limitée si permise ; ne pas désactiver les protections générales. Arrêter sur conflit de signature sans désinstallation ni effacement.
- Google et courriel selon disponibilité, clavier et grands caractères, thèmes, rotation et tablette séparément.
- Session après fermeture, redémarrage, mise à jour compatible ; annulation/reprise du verrou système éventuel.
- Mauvais compte/refus, déconnexion et absence des données précédentes, révocation et retour hors ligne honnête.
- Punch visible sans action automatique ; aucun formulaire métier soumis pour cette vérification.

## Bilan Atelier / PR

Lot audit-plan uniquement, implémentation bloquée par le préalable publication non vérifiable. Aucun état terminé attribué aux connexions Google, invitations Boss/Adjointe, livraison courriel, biométrie ou certification Samsung. Prochaine dépendance : preuve de publication accessible puis diagnostic TEST de Frederick. Aucun changement production, fusion, publication, distribution employés, paiement ou signature release autorisé.
