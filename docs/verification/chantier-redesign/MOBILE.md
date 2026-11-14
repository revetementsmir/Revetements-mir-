# Mobile Android — revue de la refonte chantier

## Ce qu’il faut faire

Conserver le coffre et les permissions existants, puis vérifier la nouvelle expérience Employé/Chef dans la WebView Android : cinq onglets, dossier job, formulaires, caméra/fichiers, GPS ponctuel, clavier et retour. Cette revue ne modifie aucun code applicatif, test, clé ou donnée. Le seul intégrateur applicatif est le spécialiste full-stack.

Méthode Atelier **Mobile Android, iOS et PWA 1.0.0** chargée par le responsable et relue dans `/tmp/mir-method-mobile-platforms.json`. Checkout de revue : `/workspace/Revetements-mir-chantier-ux`, branche `codex/refonte-chantier-employe-chef`, base `24d29734d68cd3da23c17be8693ddba08abff19f`. Le suivi Atelier reste à synchroniser par le responsable après collecte des résultats.

## Les étapes

1. Examiner les interfaces natives existantes et les règles d’empaquetage.
2. Transmettre les défauts et contraintes reproductibles au seul intégrateur.
3. Examiner les rendus après intégration aux formats 360/390/430, puis les états clavier/paysage/texte agrandi.
4. Faire exécuter la compilation et la recette instrumentée par le responsable sur un environnement Android accéléré.
5. Remettre un paquet personnel signé par la clé TEST existante seulement après inspection des cinq écrans. L’installation Samsung et son ancienne session restent indépendantes de la revue navigateur.

## Comment savoir que c’est terminé

| Contrôle | Attendu | État de cette revue |
|---|---|---|
| Application et données existantes | Aucun remplacement/désinstallation/effacement; app personnelle distincte et même clé pour ses mises à jour | Contraintes transmises; aucune installation effectuée |
| Navigation | Cinq onglets visibles et stables; retour interne avant réduction de l’application | À vérifier après intégration |
| Clavier | Champ et action Envoyer/Confirmer accessibles, sans superposition barre basse | À vérifier après intégration |
| Caméra/fichiers | Permission à l’usage, annulation sans envoi, reprise et contexte acteur/job inchangés | Interfaces lues; essai natif non exécuté |
| Itinéraire et GPS Punch | Lien itinéraire sans mutation; position seulement sur action explicite | Séparation confirmée dans le code de base |
| Session | Restauration, rôle serveur, purge au logout et refus de réponses anciennes conservés | Code Auth de base relu; aucune réécriture demandée |
| Verrou système | Masque privé pendant verrouillage/annulation, reprise unique | Code de base relu; recette native/physique à refaire |
| Plans/PDF | Flux privé; annulation sélecteur sans altération du PDF | Interfaces lues; essai natif non exécuté |
| Émulateur | Accélération KVM exploitable; aucun émulateur logiciel prolongé | `/dev/kvm` absent sur cet hôte; aucun émulateur lancé |
| Samsung S25 Ultra | Installation personnelle conservatrice puis parcours réel | Toujours ouvert; pas de prétention physique |

## Détails pour le chat

### Constats bloquants pour la nouvelle interface

**1. Réserve basse incompatible avec la nouvelle barre.** `mobile/web/team.css` impose actuellement `body { padding-bottom: calc(env(safe-area-inset-bottom) + 24px) !important; }`. La barre nouvelle doit réserver sa hauteur réelle et la zone système, dans le seul périmètre Employé/Chef. Les dernières actions et messages ne doivent pas être cachés. Les styles communs des autres rôles restent inchangés.

**2. En-tête/bandeau et aide liés à l’ancien menu.** `mobile/web/bootstrap.js` injecte un bandeau réseau fixe avec 30px supplémentaires en haut et ajoute l’aide métier dans `#mir-harmony-menu`. La nouvelle composition compacte doit porter un état réseau discret et un accès Aide réel sans dépendre du gros menu supprimé. Les règles natives masquant les liens publics restent en place.

**3. Retour Android sans connaissance des vues internes.** Le gestionnaire natif ferme un dialogue puis utilise `history.back()` ou minimise l’application. La navigation `setView()` de base n’est pas un historique complet. Exposer un traitement de retour du shell : formulaire/dialogue → objet parent → onglet parent, avec confirmation d’abandon uniquement pour une saisie effectivement non sauvegardée. Ne pas minimiser l’application quand un sous-écran peut être fermé.

**4. Clavier : champ seul ≠ formulaire utilisable.** `keepInputVisible()` surveille `visualViewport` et recentre le champ actif. Il ne garantit pas que le compositeur et Envoyer restent visibles ensemble. Vérifier le pied de formulaire et le compositeur à 360px de hauteur utile, avec barre Android et gros texte. Les règles CSS `.message-thread > form` utilisent encore un décalage fixe de 74px : le relier au nouveau shell.

### Risques à vérifier pendant l’intégration

**Saisie remplacée pendant l’actualisation.** Le bootstrap décrit un rafraîchissement de snapshot toutes les 15 secondes. Son mécanisme de mémoire ne protège que `#absence-draft-form`. Les formulaires photo/extra/problème/bris/rapport ont besoin d’un état explicite lié à l’acteur et à la job. Garder une saisie sur erreur; ne la retirer qu’après confirmation serveur ou abandon explicite.

**Champ fichier devenu obsolète.** Le bridge garde une référence au champ `input[type=file]` durant l’attente de caméra/sélecteur, puis affecte `input.files` et émet `change`. Si un rendu détache le champ, le résultat peut être perdu silencieusement. Figer le contexte de formulaire/acteur/job et traiter le retour sur le formulaire courant autorisé; refuser une réattribution après changement de compte ou de job. Ceci est un risque établi par lecture du flux, pas un échec physique reproduit.

**Effacement trop tôt du brouillon absence.** La mémoire native de l’absence est remise à zéro dès l’événement `submit`. Ce n’est pas un accusé de réception serveur. Ne pas reprendre ce modèle pour les nouveaux formulaires; sur erreur, l’utilisateur doit retrouver ses champs et pièces en attente. Le comportement réel du formulaire absence sur retour réseau est à recetter.

### Protections natives à préserver

- `MainActivity` limite navigation et requêtes par `MirPolicy`, refuse le contenu mixte et les ressources distantes comme origine du bridge.
- `windowSoftInputMode="adjustResize"` est présent; orientation et recréation d’Activity doivent rester vérifiées.
- `navigator.geolocation.getCurrentPosition` passe par Capacitor avec demande de permission et mesure ponctuelle. `watchPosition` est refusé. L’itinéraire ouvre un lien HTTPS autorisé sans appel Punch.
- `capturePhoto` et `pickFile` renvoient un résultat/annulation; aucun téléversement natif automatique. Formats et taille sont bornés, les photos sont lues via un FileProvider propre à l’application.
- Le PDF privé vérifie taille/signature, propose ouvrir/enregistrer/partager et conserve les bytes hors Binder. Changement de session contrôlé avant remise du fichier.
- Le coffre chiffré possède des emplacements distincts session/PKCE/attente. Le SDK revalide les rôles côté serveur. La génération de session protège le compte suivant contre une réponse de permissions ancienne.
- Le verrou système est facultatif, avec masque DOM et `FLAG_SECURE` pendant verrouillage. Il ne reçoit ni biométrie ni NIP système.
- Google et récupération restent désactivés. Le paquet personnel ne doit pas reprendre les liens OAuth de l’ancien paquet.

### Matrice de preuves à compléter

| Niveau | Formats/scénarios | Preuve requise |
|---|---|---|
| Chromium, simulation explicitement identifiée | 360×780,390×844,430×932; cinq onglets et dossier; clair/sombre/grand texte; clavier simulé et erreur réseau | Captures différentes de vrais écrans et assertions des éléments visibles |
| WebView Android, CI accélérée | API35/36; toucher, clavier système, retour, rotation, permission refusée/annulée, PDF, reprise/session | Rapport instrumenté sur le SHA final; aucun succès déduit d’une compilation |
| Samsung physique | S25 Ultra réel, OneUI/WebView relevés; accès TEST, fermer/rouvrir, redémarrer, verrou facultatif, logout | Réponses et captures de Frederick sans mot de passe/jeton; recette ouverte tant que non exécutée |

### Résultat et limites actuels

Les recommandations ci-dessus ont été transmises directement au responsable et à l’intégrateur, sans demander à Frederick de faire le relais. Aucun fichier source ou test modifié par cette expertise. Aucun build concurrent, aucune clé lue/copée et aucune opération Supabase effectuée. L’absence de KVM a été vérifiée par lecture de `/dev/kvm`; aucun émulateur logiciel n’a été lancé. Les rendus refondus n’étaient pas encore disponibles à la rédaction initiale : leur contrôle reste explicitement à compléter.

### Captures avant effectivement exécutées et inspectées

Commande : `NODE_PATH=/workspace/Revetements-mir-pr31/mobile/node_modules MIR_CHROMIUM_BIN=/usr/bin/chromium MIR_TODAY_BEFORE=1 MIR_TODAY_PROOF_DIR=artifacts/chantier-redesign/mobile-before node tests/mir-today-browser.cjs`.

Résultat : succès, douze rendus (Employé/Chef aux formats 360,390,430,768,1024,1440). Scénario QA local injecté avec réseau externe intercepté : aucun compte réel et aucune mutation serveur. Les captures `before-chef-390.png` et `before-employee-390.png` ont réellement été ouvertes. Le gros menu/dossier, la ligne compte secondaire et le bouton flottant Aide qui chevauche le contenu sont visibles. Ces captures sont des rendus Chromium du site de base, pas une preuve WebView ou Samsung. Répertoire : `artifacts/chantier-redesign/mobile-before/`; journal `/tmp/mir-mobile-before.log`.

SEO/GEO : non applicable, application métier privée; conserver les protections des parcours publics et des préversions.

## Revue intermédiaire des vrais écrans refondus

Exécution du script de revue temporaire `/tmp/mir-mobile-review.cjs`, sans modification du code ni des tests versionnés. Fixture `tests/helpers/mir-field-fixture.cjs` du seul intégrateur; tous les appels réseau externes sont refusés. Les résultats sont locaux et simulés.

- 36 états mesurés : Employé et Chef à360/390/430px, cinq onglets puis formulaire Bris d’outil en hauteur clavier360px.
- Aucun débordement horizontal ni erreur JavaScript dans ces états.
- Les cinq captures Employé390 ont réellement été ouvertes, ainsi que Bris d’outil/clavier. En-tête compact, panier, avatar, barre des cinq onglets et contenu correspondant sont rendus.
- Le formulaire à hauteur réduite révèle un défaut : textarea de329à433px de haut utile360px, bouton Envoyer à703–749px hors vue. Cela montre une visibilité insuffisante dans l’aperçu web réduit; cela ne mesure pas encore le clavier système Android.
- Défaut transmis directement au full-stack pour correction et recontrôle. L’absence d’erreur console ne suffit donc pas à valider ce parcours.

Captures et mesures : `artifacts/chantier-redesign/mobile-after/`, `measurements.json`; journal `/tmp/mir-mobile-review.log`. Les captures intermédiaires ne représentent pas encore une certification finale. Les contrôles natifs/physiques de la matrice restent ouverts.

Les dix scénarios SDK natif/Auth ont été exécutés sur la branche de travail : **10/10 réussis**, transport simulé, journal `/tmp/mir-mobile-auth-baseline.txt`. Ils incluent PKCE, refus d’un rôle non autorisé, restauration/purge et refus de purge par une réponse de permissions d’une ancienne session. Ce résultat ne certifie pas le nouveau shell Android.

### Deuxième passage : correction partielle du clavier

Les36états ont été rejoués après modification de l’intégrateur : toujours0débordement horizontal et0erreur JavaScript. Le footer du formulaire est devenu visible à272px dans une fenêtre360px. Le champ finit257px; toutefois le bouton commence226px et recouvre31px du textarea. Ce défaut résiduel a été transmis avec ses coordonnées pour que le recentrage tienne compte du haut du footer, pas seulement du bas de la fenêtre. Capture effectivement ouverte : `artifacts/chantier-redesign/mobile-after-v2/employee-390-tool-keyboard.png`. Les coordonnées du premier passage restent dans le présent rapport; les captures/mesures du deuxième sont archivées séparément avant nouveau contrôle.

Le contrôle du code a aussi révélé que le bouton natif de verrou était caché par un sélecteur de frère adjacent alors que le bootstrap l’ajoute comme enfant de `#portal-content`. L’intégrateur a corrigé ce sélecteur en descendant. Correction relue dans le code; visibilité réellement exécutée dans la WebView encore à vérifier.

### Recontrôle après corrections

La nouvelle expérience est maintenant conditionnée au vrai indicateur **`fieldExperienceEnabled=true`** dans le harness; les anciens écrans ne sont donc pas utilisés comme preuve de la refonte. Les48états ont été rejoués : Employé/Chef,360/390/430px, cinq onglets, Bris d’outil à hauteur360px, conversation à hauteur360px et paysage844×390. Aucun débordement horizontal ni erreur JavaScript relevé.

Le clavier est simulé en conservant une hauteur d’écran fixe844px et en réduisant seulement le viewport à360px. Une simple réduction de la fenêtre Chromium réduit aussi son `screen.height` par défaut; elle ne déclenche donc pas le même état que le clavier d’un téléphone. Cette distinction a été vérifiée, pas ignorée pour obtenir du vert.

Résultats mesurés à390px :

- Bris d’outil : textarea de50à172px; Envoyer de226à272px. Le footer ne recouvre plus le champ. L’intégrateur a ajouté un recentrage tenant compte du haut du footer.
- Message : nom de la destinataire visible, textarea jusqu’à316px, Envoyer jusqu’à316px dans360px utiles; barre basse masquée pendant l’état clavier. L’ancienne position sticky du formulaire a été remplacée dans le nouveau shell.
- Les cinq onglets Employé390, l’accueil Chef390 et les deux captures clavier ont réellement été ouverts. Les rendus sont distincts et ne portent aucune certification de compte réel.
- Le retour interne Message→liste a été exercé par `MIRFieldBack()`, puis le paysage rendu sans débordement. Ce n’est pas une pression du bouton système Android.
- Le bootstrap remet désormais son marqueur de saisie à zéro sur l’événement explicite `mir:form-closed`; correction relue dans le code. Il ne faut toujours pas confondre `submit` et confirmation serveur.

Preuves conservées : `artifacts/chantier-redesign/mobile-after-v6/`, notamment `employee-390-message-keyboard.png`, `employee-390-tool-keyboard.png` et `measurements.json`; journal `/tmp/mir-mobile-review-v6.log`. Les passagesv2/v3/v4 restent disponibles. La validation porte sur l’arbre de travail courant avant commit; la CI et l’empaquetage finaux doivent rattacher leurs résultats au SHA final.

Les défauts clavier reproduits sont corrigés dans le rendu Chromium examiné. Il reste à vérifier dans la WebView accélérée : vrais clavier/retour système, refus/annulation caméra et fichiers, rotation, verrou facultatif et session. Samsung physique reste ouvert. Aucun défaut graphique critique empêchant les cinq onglets n’a été observé dans ce dernier contrôle.

## Contrôle natif CI de la tête2bed90f

Source examinée : `2bed90f64f0353c1540efa661b34dba92b22a909`. [Run Android43562227718](https://github.com/revetementsmir/Revetements-mir-/actions/runs/43562227718), job Android132348222102; logs relus par l’expertise Mobile. Il s’agit de l’émulateur API35 accéléré du workflow CI, distinct de l’hôte local sans KVM. Aucun émulateur logiciel local n’a été lancé.

| Vérification CI exécutée | Résultat constaté |
|---|---|
| Compilation APK et APK de tests | Réussie |
| Tests Java et Lint | Réussis dans l’étape de compilation |
| `MirAndroidTest` | **7 tests réussis** (`OK (7 tests)` à05:39:49UTC) |
| Préparation de mise à jour | **1 test réussi** à05:39:59UTC |
| Vérification après mise à jour | **1 test réussi** à05:40:08UTC |
| `MirRealRolesTest` | Échec dans `inspectMenu`, ancienne ligne71, attente du formulaire d’absence |
| Travail de chaque rôle natif | Cinq onglets Employé parcourus avant l’échec; le scénario s’arrête au premier rôle, donc Chef et rôles suivants ne sont pas certifiés par cette tentative |

Le diagnostic de l’échec est `phase=ready`, `online=true`, projet `hxtztkmbfpmzrieccwsg`. Les logs ne montrent pas un refus Auth. Le workflow complet reste en échec sur cette tête malgré les contrôles partiels réussis; aucune CI verte globale n’est déduite des7tests.

### Cause du scénario reproduite indépendamment

Le batch natif envoyait trois clics dans une seule évaluation JavaScript : More → Absences → résumé. Or `handleClick` attend maintenant `handleFieldClick(button)` avant de traiter la navigation générique. Même un retourfalse de cette fonction asynchrone cède à la microtâche. Dans le même batch, le bouton Absences est cherché avant que More soit rendu.

Reproduction avec une fixture locale autorisant bien les absences : depuis Réglages, l’ancien batch exact lève **TypeError: Cannot read properties of null (reading 'click')**. Pendant ce batch, More n’est pas encore actif et Absences est absent. Après restitution de la main au navigateur, More devient actif et le bouton apparaît. La navigation en étapes avec attentes DOM ouvre ensuite le formulaire et rend le textarea visible. Preuve conservée : `artifacts/chantier-redesign/mobile-native-diagnostic/navigation-microtask.json`.

La reproduction établit un défaut de synchronisation du test; elle ne justifie aucun affaiblissement du contrôle serveur. L’intégrateur a séparé les actions et ajouté des attentes sur l’onglet actif, le bouton, le formulaire, le résumé ouvert et la visibilité du champ. Les assertions de conservation de note et de confirmation du bouton Retour restent présentes. Le helper Java remonte désormais une erreur JavaScript immédiatement plutôt que d’attendre30secondes sur un résultat absent; il n’imprime pas l’expression contenant les identifiants.

Correctif relu en lecture seule par l’expertise Mobile. Le nouveau passage CI sur sa tête corrigée reste nécessaire pour certifier la suite des rôles. L’expertise n’a modifié aucun fichier source/test. Le responsable conserve la clé personnelle S25 et a rapporté avoir revérifié son certificat public; aucune clé n’a été lue ou copiée ici.

### Limites physiques conservées

Les7tests natifs et les2contrôles de mise à jour apportent une preuve WebView/émulateur réelle, pas une preuve Samsung. Le S25 Ultra installé, sa session et ses données restent intacts. La recette physique, le déverrouillage du Samsung, sa caméra/GPS et le parcours Chef avec ses affectations doivent encore être exécutés sur l’appareil. Aucun iOS, envoi de courriel, publication Pages ou accès production revendiqué.

## Inspection bloquante des captures natives1466eb1

Après réussite technique de la CI de `1466eb1`, le responsable a téléchargé l’artefact14100984878 et contrôlé son empreinte. L’expertise Mobile a relu les fichiers réellement présents sous `artifacts/chantier-redesign/native-ci/artifacts/phase11/phase11-proof/` et ouvert les images Chef day, punch et more.

**La réussite technique ne certifie pas cinq écrans natifs distincts.** Deux paires sont identiques octet par octet :

- `v130002-chef_equipe-command.png` et `v130002-chef_equipe-punch.png` : SHA-256 `025a8d1f2dbdc0e832eb1565425c1223afdb10cca8dfed40e042713436ed7f61`. Les deux montrent Commande.
- `v130002-chef_equipe-messages.png` et `v130002-chef_equipe-more.png` : SHA-256 `92e3373e3fecca161d947b9d6a1f325dc654a81f37455788e87013fb13d1da80`. Les deux montrent Message.

Les noms de fichiers et le seul test d’onglet actif ne suffisent pas. Le helper actuel utilise déjà `UiAutomation.takeScreenshot()` après `postVisualStateCallback` et trois callbacks d’animation; il ne s’agit donc pas, dans cette source, d’un simple `WebView.draw()` à remplacer. L’écart DOM/frame système reste à corriger et reproduire : attendre un contenu spécifique de chaque onglet, conserver la capture de l’écran réellement présenté et ajouter un refus CI des empreintes identiques entre les cinq onglets d’un rôle. L’inspection des images produites demeure nécessaire. Recommandation transmise au seul intégrateur; aucun code ou test modifié par cette expertise.

**Les fixtures du compte natif Chef sont également insuffisantes.** L’accueil ouvert montre «Votre prochaine affectation», JOB— et aucune équipe représentative. Cela ne permet pas de certifier le parcours chantier Chef demandé. Le responsable doit identifier le compte réellement injecté dans le runner, puis préparer ses affectations QA autorisées; aucun compte personnel ne doit être créé implicitement.

Le texte «Bonjour» sans nom ne prouve pas un actorId perdu : `checkedSnapshot` refuse un actorId différent de l’utilisateur vérifié et exige son membership actif. La vue produit explicitement «Bonjour» quand `actor.name` contient `@`, pour ne pas exposer un courriel comme prénom. L’hypothèse est donc un nom QA historique égal au courriel et un compte Chef encore sans affectation; elle doit être confirmée sur son snapshot TEST. Une fois les fixtures préparées, vérifier nom, rôle, job, équipe et tâches réellement affichés dans les nouvelles captures.

État à ce jalon : **validation native visuelle des cinq onglets suspendue**, malgré la CI technique verte; Samsung physique toujours ouvert. Les preuves Chromium précédentes restent distinctes et ne remplacent pas ces captures.

## Diagnostic indépendant des courses Auth après4d51/5c

Les logs des deux nouvelles tentatives Android ont été réellement relus :

| Tête | Run et résultat observé |
|---|---|
| `4d51f9ad9734873241abba5326c641fdc0c15cb3` | Run43566365748/job132360992027 : compilation réussie,7tests natifs puis2tests de mise à jour réussis; échec de `MirRealRolesTest` à la connexion (`AUTH_FAILED`, `phase=signed_out`, réseau actif, cible TEST). |
| `5c0466aafd087c10c5dbfa7d6f05a826ff050339` | Run43566712045/job132362040352 : compilation et7tests natifs réussis, préparation de mise à jour réussie; `verifyUpdate` échoue ligne28 car `mir_update_probe` vautnull au lieu du témoin attendu. Les attentes précédentes de phase ready et de rôle Employé ont passé. |

Ce résultat n’autorise ni une déclaration de persistance réussie ni l’affaiblissement de l’assertion. Aucun APK de ces tentatives n’est certifié pour remise au Samsung.

### Deux courses reproduites sur la source figée5c

L’expertise a exécuté des scénarios indépendants avec le vrai SDK embarqué et des réponses entièrement synthétiques, en forçant la lecture de `mobile/web/sdk.js` depuis le commit5c. Aucun service hébergé, mot de passe réel ou jeton n’a été utilisé ou affiché.

1. **AnciengetUser après nouvelle connexion.** Une ancienne lecture `/user` est suspendue; la connexion suivante du même compte réussit et un témoin navigateur est posé. La réponse ancienne `session_not_found` est ensuite libérée. Le SDK retourne `AuthSessionMissingError` avec statut400, puis le nouveau coffre **et** le témoin ont disparu. Le SDK appelle `_removeSession()` depuis `_getUser()` avant le `.then` de l’adaptateur : une garde uniquement placée dans ce `.then` est trop tardive. La variante `getUser(jwt)` sur le même client actif possède aussi ce chemin de suppression.
2. **Ancien nettoyage natif après nouvelle connexion.** Une déconnexion est suspendue dans son `Native.clearAuth`; une connexion suivante peut alors réussir dans l’ancienne source. Lorsque l’ancien effacement est libéré, le coffre et le témoin du compte suivant sont effacés. Une vérification d’époque avant l’appel natif ne peut pas annuler une suppression déjà partie.

Preuves sans secrets : `artifacts/chantier-redesign/mobile-native-diagnostic/auth-get-user-race.json` et `auth-signout-cleanup-race.json`.

La lecture du code confirme également : `purgeBrowser()` efface localStorage/sessionStorage, puis attend les suppressions IndexedDB; son lancement sans attente depuis `SIGNED_OUT` n’est pas une barrière de fin de nettoyage. Les anciennes clausesfinally de déconnexion pouvaient donc dépasser une nouvelle connexion. Le défaut existe hors installation et peut effacer un témoin; cela ne démontre pas à lui seul la cause unique de chaque incident natif.

### Relecture et recontrôle du correctif de l’intégrateur

Le correctif examiné possède l’empreinte SDK `0bf114a6500069af54d6698625c521d9c893ed5a6e1e8f6571b2531c587b4ced`. Il fait vérifier l’utilisateur par un autre client SDK privé non persistant, plutôt que par le client attaché au coffre actif. Les résultats sont bornés à l’époque, l’identité **et le jeton** effectivement conservé; une rotation du jeton du même compte invalide aussi la lecture ancienne. Le nettoyage courant reconnaît `AuthSessionMissingError` même si son statut est400.

Les mutations Auth et leur nettoyage sont sérialisés; le callback Auth n’attend que des opérations locales, pas un nouvel appel Auth sous verrou SDK. Le responsable et l’intégrateur conservent la responsabilité de l’implémentation; cette expertise ne modifie aucun code ou test.

Rejeu indépendant du correctif, avec SDK figé pendant le contrôle : **5/5 scénarios réussis**.

- Ancienne réponse `/user` après reconnexion : retourSESSION_CHANGED, nouveau coffre et témoin conservés.
- Ancienclear natif : la nouvelle connexion attend sa fin; son coffre et son témoin sont ensuite conservés.
- Ancienne réponse de reprise après renouvellement du jeton du même compte : coffre tourné et témoin conservés.
- Refus courant `bad_jwt` : coffre et données navigateur purgés.
- Refus courant `session_not_found` : coffre et données navigateur purgés.

Preuve : `artifacts/chantier-redesign/mobile-native-diagnostic/auth-independent-patch.json`. Ces résultats utilisent le vrai SDK avec transport simulé; ils ne remplacent pas une nouvelle réussite native de `verifyUpdate`, dont l’assertion doit rester intacte.

### Durabilité du témoin et limites d’attribution

Un `localStorage.setItem` puis `getItem` dans la même WebView confirme une valeur disponible dans le renderer, pas indépendamment son écriture durable sur disque. Les deux courses ci-dessus peuvent la supprimer avant ou pendant un changement d’Activity. Si la nouvelle tentative échoue encore, un contrôle avec vrai arrêt/reprise de processus **avant** l’installation permettrait de distinguer perte préexistante et perte après mise à jour; une simple recréation de WebView dans le même processus ne suffit pas. Aucun témoin manquant ne doit être recréé par `verifyUpdate` pour obtenir du vert.

La priorité immédiate reste la CI native du correctif avec l’assertion de conservation inchangée. Aucun émulateur logiciel local n’a été lancé, aucune clé n’a été lue, aucun jeton n’a été transmis et aucun paquet supplémentaire n’a été remis à Frederick pendant ce diagnostic.
