# MIR TEST Aperçu — connexion mobile 08

Version candidate **0.13.3-test**, codes **130005 → 130006** pour la recette de mise à jour. Logo MIR de 245 px (+75 % par rapport à la proposition de 140 px), titre « Connexion équipe MIR » retiré de la connexion normale, formulaire courriel/mot de passe directement visible, bouton Google et palette anthracite/champagne approuvés. Google respecte la capacité réellement configurée ; l’affichage du bouton ne prouve pas une authentification réussie. La récupération conserve son titre et explique son indisponibilité lorsque le transport TEST est désactivé.

## Installation séparée autorisée

Frederick a autorisé une application TEST installée **à côté de l’ancienne**, sans la désinstaller ni effacer ses données.

| Identité | Nouvelle lignée Aperçu |
| --- | --- |
| Nom Android | `MIR TEST Aperçu` |
| Application ID | `ca.revetementsmir.equipe.test.preview` |
| Namespace et classes Java conservés | `ca.revetementsmir.equipe.test` |
| Callback OAuth | `mirtestpreview://auth/callback` |
| Callback Google exact | `mirtestpreview://auth/callback?flow=google` |
| Callback récupération exact | `mirtestpreview://auth/callback?flow=recovery` |
| Backend exclusif | `hxtztkmbfpmzrieccwsg.supabase.co` |
| APK vérifié à remettre | `MIR-TEST-Apercu.apk` |

L’ancien paquet `ca.revetementsmir.equipe.test` conserve son stockage et son callback `mirtest`. Aperçu possède son propre stockage Android, coffre de session et FileProvider ; aucune migration de données ni reprise automatique de session n’est effectuée. Les assertions natives vérifient l’identité réellement installée et que l’ancien callback ne résout pas dans Aperçu. Cette recette sur émulateur ne constitue pas une observation du téléphone de Frederick.

Les ressources `dist/` restent embarquées. Le menu **Accueil · Commande · Punch · Messages · Plus**, les accueils, le Punch et le parcours Pliage restent ceux de la version approuvée.

## Signature durable et garde de livraison

La nouvelle lignée doit utiliser une **clé PKCS12 durable détenue par MIR**. Aucun outil de ce dépôt ne crée de clé. Gradle refuse de construire sans configuration de signature ; aucun repli sur une clé debug générée par le runner n’est permis. Le type de build reste `debug` pour les recettes natives ; ce n’est pas une livraison de production.

Configuration GitHub Actions à fournir par un accès autorisé, sans placer de valeur privée dans Git, les journaux ou les artefacts :

| Type | Nom | Usage |
| --- | --- | --- |
| Secret | `MIR_PREVIEW_KEYSTORE_BASE64` | Keystore PKCS12 durable, base64 sur une ligne |
| Secret | `MIR_PREVIEW_KEYSTORE_PASSWORD` | Mot de passe du keystore |
| Secret | `MIR_PREVIEW_KEY_ALIAS` | Alias de la clé |
| Secret | `MIR_PREVIEW_KEY_PASSWORD` | Mot de passe de la clé |
| Variable publique | `MIR_PREVIEW_CERT_SHA256` | Empreinte SHA-256 attendue du certificat, obligatoire |
| Variable publique | `MIR_PREVIEW_SIGNING_APPROVED_SHA` | SHA exact de la source revue, 40 caractères |

Le 18 novembre 2026, Frederick a explicitement autorisé l’enregistrement d’une clé durable. Une clé PKCS12 RSA 3072 / SHA256withRSA a été créée, puis le keystore et ses paramètres privés ont été enregistrés dans les quatre secrets chiffrés GitHub Actions ci-dessus, dans `revetementsmir/Revetements-mir-`. Leur présence a été confirmée dans l’interface GitHub. La clé privée et les mots de passe ne sont ni dans ce dépôt, ni dans les preuves, ni dans l’APK.

Empreinte publique SHA-256 à conserver pour cette lignée : `a9a24e149a0076935952fd683c272072232e10d7f7e8e2d8f847fec34291417e`. Aucun autre certificat ne doit être utilisé pour une future mise à jour d’Aperçu. La présence des secrets ne constitue pas à elle seule une compilation signée réussie ; la recette ci-dessous vérifie leur utilisation réelle.

Le job Android ne démarre que pour une PR provenant du même dépôt et dont le HEAD correspond exactement à `MIR_PREVIEW_SIGNING_APPROVED_SHA`. L’import relit aussi le HEAD réellement extrait. Une révision différente ou une variable absente entraîne un job ignoré, **pas une recette réussie**. Après chaque modification, la nouvelle révision doit être revue et la variable ajustée par une personne autorisée avant de relancer le workflow. Ce verrou est une garde de livraison ; il ne protège pas contre un collaborateur qui peut lui-même modifier les workflows ou leurs secrets.

`tools/preview-signing.cjs import` place uniquement le keystore dans un sous-répertoire privé du `RUNNER_TEMP`, permissions `0700/0600`. `GITHUB_ENV` reçoit seulement les chemins ; les mots de passe restent limités aux étapes d’import et de compilation. Les caches de configuration Gradle sont désactivés. Une étape `always()` supprime ce fichier avant les tests natifs et les archives.

`tools/verify-preview-signing.cjs` exécute **apksigner verify** sur les APK 130005, 130006 et l’APK d’instrumentation. Il exige une signature v2 valide, un seul signataire, l’empreinte publique attendue et les identités Android prévues. L’APK final n’est copié vers les artefacts qu’après cette vérification. `preview-signing.json` ne contient que des métadonnées publiques, empreintes et résultats. Le rapport natif final recoupe cette preuve avec le SHA du fichier effectivement remis.

La recette **130005 → 130006** vérifie le maintien du stockage de la nouvelle application Aperçu. Elle reste exécutée dans un seul runner et ne prouve pas une mise à jour de l’ancien APK **130004**, dont l’identifiant est différent. Le certificat historique est `d62841b88fd0b0194ef871c5fcc03a2b1e0bc43fc5895308fddf35e9d0a94842` ; aucune clé privée correspondante n’a été trouvée lors de l’audit. Aucun remplacement, effacement ou désinstallation de cet ancien paquet n’est prévu.

Pour compiler localement avec une clé déjà provisionnée de façon privée, fournir `MIR_PREVIEW_KEYSTORE_PATH`, `MIR_PREVIEW_KEYSTORE_PASSWORD`, `MIR_PREVIEW_KEY_ALIAS`, `MIR_PREVIEW_KEY_PASSWORD` et `MIR_PREVIEW_CERT_SHA256` dans l’environnement. Ne pas inscrire leurs valeurs dans une commande conservée, le dépôt ou un fichier de preuve. Exécuter la vérification cryptographique avant toute remise. Le pipeline CI constitue la voie de livraison contrôlée.

Installation de la nouvelle application :

```sh
adb install MIR-TEST-Apercu.apk
adb shell am start -n ca.revetementsmir.equipe.test.preview/ca.revetementsmir.equipe.test.MainActivity
```

Une future mise à jour **d’Aperçu uniquement** conserve son applicationId et sa clé durable, augmente le code de version et utilise `adb install -r`. L’application de test d’instrumentation n’est jamais remise comme application utilisateur.

## Barre système Android anthracite

Le fond natif de fenêtre et de lancement utilise `#242522`. `SystemBars` conserve les barres visibles et impose des icônes claires sur ce fond. La gestion Capacitor des marges, des encoches et du clavier reste active ; aucune fausse heure ou batterie n’est dessinée dans la page.

La recette native capture et mesure la vraie barre Android au lancement, en paysage, après recréation, clavier ouvert et après reprise. Elle exige une barre visible, des icônes claires, le contenu sous la barre et un fond anthracite majoritaire. Ces nouvelles preuves doivent être obtenues dans la CI du SHA livré ; aucun essai physique sur le téléphone de Frederick n’est revendiqué.

## Configuration Google — état du 18 novembre 2026

Les deux callbacks exacts du tableau Aperçu ont été enregistrés dans les Redirect URLs de Supabase MIR TEST. Le fournisseur Google reste désactivé : Client IDs et Client Secret sont vides. Google Cloud affiche « Site indisponible » dans le navigateur de configuration, y compris après une recharge. Aucun client OAuth créé ni login Google réussi n’est revendiqué. Le bouton reste honnête sur cette capacité et l’accès par courriel demeure disponible. La récupération par courriel conserve sa limite TEST existante.

## Historique — identités et preuves antérieures

Les versions et preuves des paragraphes suivants sont historiques. Le paquet personnel Samsung S25 (`ca.revetementsmir.equipe.recette.s25`) possède sa propre identité et sa propre signature; cette compilation standard ne prétend pas le remplacer.

Refonte chantier TEST : **0.13.0-test /130001**, CI de mise à jour130001→130002. Nouvelle interface Employé/Chef activée dans APK TEST, mêmes sources dist ; [intégration et limites](../docs/verification/chantier-redesign/INTEGRATION.md). Recette physique Samsung ouverte. Google/courriels désactivés.

# Android privé MIR — recette uniquement

État actuel Auth : **0.12.2-test /120005**, backend MIR TEST installé, invitations/mot de passe actifs dans le paquet; Google et récupération restent désactivés faute de recette de fournisseur/envoi. [Bilan courant](../docs/verification/employee-auth-invitations/BILAN-20261114.md) et [Samsung Auth](../docs/verification/employee-auth-invitations/SAMSUNG-AUTH.md). Les paragraphes suivants conservent les étapes historiques.

Lot Auth/invitations en cours : branche `codex/test-employee-auth-invitations`, base `d4a9ec05ee9a0c2ede0713efab0add860a9507cb`. Version préparée `0.12.0-test` / `120001`; CI de ce lot prévue `120001 → 120002`. Capacités Google, récupération et invitations désactivées par défaut. [Reprise et limites actuelles](../docs/verification/employee-auth-invitations/REPRISE.md). Le texte Phase 11 ci-dessous conserve son contexte historique.

Base : `a7d2d6fd10d6909d25f262aa06e921342c03d889`. Branche : `codex/phase-11-android-private`.

Application TEST `ca.revetementsmir.equipe.test`, version `0.11.0-test`, code initial `110001`. Aucun projet Android ni identité de signature préexistants n’ont été trouvés dans le dépôt. Aucun déploiement du site n’est nécessaire : le portail et ses moteurs sont embarqués dans l’APK. Aucun deuxième backend, configurateur, panier, schéma ou RPC n’a été ajouté.

## Compiler

Prérequis : Node 24, JDK 21 complet, SDK Android 36 et build tools 36.0.0, licences Android acceptées. Capacitor 8.6.2, App 8.1.2, Geolocation 8.2.4, esbuild 0.28.2, core-js 3.51.0, Playwright 1.62.1 et leurs dépendances npm sont verrouillés. Gradle 8.14.3 et son SHA-256 sont fixés. AGP 8.13.0, ZXing embarqué 4.3.0; aucun modèle QR téléchargé, Firebase ou service payant.

```sh
cd mobile
npm ci
npm run sync
node tools/prepare-android-tests.cjs
node tools/test-contracts.cjs
cd android
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug
```

`npm run sync` renouvelle uniquement les ressources et métadonnées générées; ne pas relancer `cap add android` sur le projet existant. `dist/` reste inchangé. Le build refuse tout `MIR_ANDROID_ENV` différent de `test`.

APK : `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. **Debug/TEST seulement, jamais une livraison de production.** Ne pas envoyer cet APK aux employés sans autorisation distincte.

Procédure simple pour Frederick : [Samsung S25 Ultra et recette physique locale](../docs/verification/phase11-android/SAMSUNG-S25-ULTRA.md). Le raccourci debug « Tester ce téléphone » ouvre des contrôles locaux explicites sans formulaire métier ou transport.

## Installation et mise à jour de recette

```sh
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n ca.revetementsmir.equipe.test/.MainActivity
```

Pour une mise à jour, conserver l’identifiant **et la même clé de signature locale**, augmenter `MIR_ANDROID_VERSION_CODE`, puis utiliser `adb install -r`. Ne pas désinstaller pour résoudre un conflit de signature : cela effacerait les données. Le workflow teste `110001 → 110002` avec la même clé éphémère dans le même runner et vérifie la conservation du stockage local. Une nouvelle exécution CI génère une autre clé debug : son APK ne remplace pas un précédent APK signé autrement. Une identité de livraison, une clé durable détenue par MIR et sa sauvegarde sécurisée restent à définir. Aucune clé privée n’est dans Git ou dans les artefacts.

## Frontières de sécurité

- Origine embarquée `https://localhost`, aucun `server.url`. Navigation restreinte à une liste de pages; les liens HTTPS externes explicitement suivis sortent vers le navigateur système, jamais vers le pont natif.
- Réseau métier limité à `hxtztkmbfpmzrieccwsg.supabase.co`, HTTPS, chemins Auth token/user/logout, REST et Storage existants. Aucune Edge Function de transport, inscription, récupération par courriel ou OAuth. La garde native, la CSP et les gardes JS refusent tout repli production.
- Clé publique publishable TEST seulement. Aucun mot de passe, service_role ou jeton de gestion embarqué. Le serveur conserve l’autorité sur les rôles et organisations; l’adaptateur relit `mir_account_snapshot` avant les RPC et refuse compte client/Admin technique.
- Sessions Auth chiffrées AES-GCM avec clé Android Keystore et fichier privé `noBackupFilesDir`. Sauvegarde cloud/transfert désactivés. Aucune copie des jetons dans localStorage ou les journaux.
- Déconnexion/changement de compte purgent stockage web, IndexedDB, historique/cache WebView et fichiers privés temporaires; un IndexedDB bloqué interdit le changement. Hors ligne : aucun succès serveur simulé; les mécanismes de brouillons/queues existants restent ceux du portail.
- GPS ponctuel à la demande, watch désactivé. Caméra et QR à l’utilisation, refus/annulation explicites. Fichiers PDF/JPEG/PNG/WebP ≤20 Mo, puis validations métier et bucket privé existants. Aucune photo téléversée par le plugin lui-même.
- PDF : octets `%PDF-` vérifiés, ouverture dans le lecteur PDF.js embarqué enregistrement par le sélecteur Android ou partage par choix explicite. FileProvider limité aux deux sous-dossiers temporaires, purge à la déconnexion, expiration après 24 h au retour dans l’application. Les PDF restent clairs indépendamment du thème.
- INTERNET, état réseau, GPS et caméra uniquement; aucune permission notification, suivi GPS en arrière-plan ou stockage partagé. Aucun push/courriel/fournisseur ajouté.

Le Studio client et son import OCR restent sur le site web; leur page `plan.html` est exclue de l’APK équipe et son accès direct est refusé. Les plans de chantier et PDF du portail utilisent leurs parcours métier existants.

## Validation et limites

`tools/test-web.cjs` : Chromium avec pont simulé, sept formats, connexion équipe, réseau TEST, refus production, hors ligne et absence de débordement/erreur. Ce résultat n’est pas une preuve Android.

`MirAndroidTest` : vraie Activity/WebView, rotation/recréation, coffre chiffré/purge, permissions caméra/annulation QR et fichiers, PDF réel Phase 10 de quatre pages. `MirUpgradeTest` vérifie séparément la conservation lors d’une mise à jour. `MirRealRolesTest` reçoit les comptes de certification dans un fichier privé éphémère de l’émulateur, teste les cinq rôles métier et le refus Admin, puis supprime ce fichier. Aucune donnée métier n’est créée. Les secrets ne sont pas des entrées de compilation.

Le workflow `MIR Phase 11 — Android privé TEST` archive APK, empreinte, résultats et captures Android. Consulter le rapport de recette pour les résultats réellement exécutés. Un test planifié ou compilé n’est jamais déclaré réussi avant son exécution. Aucun téléphone physique n’a été testé; GPS réel, lecture d’un QR physique, prise de photo réelle et comportement des fournisseurs Android restent à vérifier sur appareil autorisé avant distribution opérationnelle.

Documentation officielle : [Capacitor environnement](https://capacitorjs.com/docs/getting-started/environment-setup), [Capacitor 8](https://capacitorjs.com/docs/updating/8-0), [Android sauvegardes](https://developer.android.com/identity/data/autobackup), [sécurité réseau](https://developer.android.com/privacy-and-security/security-config), [émulateur](https://developer.android.com/studio/run/emulator-commandline).
