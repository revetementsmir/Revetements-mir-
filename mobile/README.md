# Android privé MIR — recette uniquement

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

## Validation et limites

`tools/test-web.cjs` : Chromium avec pont simulé, sept formats, connexion équipe, réseau TEST, refus production, hors ligne et absence de débordement/erreur. Ce résultat n’est pas une preuve Android.

`MirAndroidTest` : vraie Activity/WebView, rotation/recréation, coffre chiffré/purge, permissions caméra/annulation QR et fichiers, PDF réel Phase 10 de quatre pages. `MirUpgradeTest` vérifie séparément la conservation lors d’une mise à jour. `MirRealRolesTest` reçoit les comptes de certification dans un fichier privé éphémère de l’émulateur, teste les cinq rôles métier et le refus Admin, puis supprime ce fichier. Aucune donnée métier n’est créée. Les secrets ne sont pas des entrées de compilation.

Le workflow `MIR Phase 11 — Android privé TEST` archive APK, empreinte, résultats et captures Android. Consulter le rapport de recette pour les résultats réellement exécutés. Un test planifié ou compilé n’est jamais déclaré réussi avant son exécution. Aucun téléphone physique n’a été testé; GPS réel, lecture d’un QR physique, prise de photo réelle et comportement des fournisseurs Android restent à vérifier sur appareil autorisé avant distribution opérationnelle.

Documentation officielle : [Capacitor environnement](https://capacitorjs.com/docs/getting-started/environment-setup), [Capacitor 8](https://capacitorjs.com/docs/updating/8-0), [Android sauvegardes](https://developer.android.com/identity/data/autobackup), [sécurité réseau](https://developer.android.com/privacy-and-security/security-config), [émulateur](https://developer.android.com/studio/run/emulator-commandline).
