# MIR — Studio public et recette courriels fermée — 15 novembre 2026

**Base exacte :** main `65b3145f735ea11ee0f77d331270649ece7266ec`; PR36/37/38/39/40/41 fusionnées. Pages PR41 `43766409793`, vérification et publication vertes. Cette PR est **distincte, non fusionnée, non publiée**. Elle ne change aucun service distant.

## Studio : routes et séparation réelle

- Entrées recensées : accueil `index.html` (navigation + carte), menu commun PC/mobile `mir-public-menu.js`, liens directs `plan.html` et `studio.html`, retours de `chantier.html?return=studio` par `mir-client-return.js`. Ces liens restent en place : ils mènent à un même état public, sans route TEST activable par query string.
- `dist/plan.html` est le vrai Studio (mesures, import PDF, matériaux, dossiers et outils). `dist/studio.html` est une ancienne démonstration. **Ils restent inchangés dans les sources** pour les tests métier et pour la copie générée `/test/`.
- Mise en scène de la livraison : `build-mir-test.cjs` copie d’abord les sources du Studio vers `/test/` et injecte le garde TEST, son CSP et ses configurations isolées. Ensuite `stage-mir-studio-public.cjs` remplace **exclusivement les deux HTML de niveau public** dans le dossier temporaire `_site_mir`, jamais `dist` ni `test`. Le manifeste est recalculé après cette mise en scène, avec les octets réellement destinés au public. Les deux pages TEST sont vérifiées par SHA avant/après.
- Écran : `En construction par l’équipe MIR` / `Ouverture bientôt`, EN `Under construction by the MIR team` / `Opening soon`, logo MIR, marteau animé et planches, reprise FR/EN de la préférence client, respect `prefers-reduced-motion`, liens accueil/boutique. Aucun calendrier ou date inventée. Sans JS, le message FR reste visible et les liens fonctionnent.
- **Non concerné :** pages Boutique, sélection, paniers, estimation, pliages `production.html?mode=client` et `source=store` côté employé, tous les cinq espaces métier, routes Supabase, RLS et données. L’écran n’accorde aucun droit serveur. Les données locales et imports restent dans leurs espaces d’origine.
- **Test/public distincts :** `/test/plan.html` et `/test/studio.html` ne sont pas redirigés vers le nouvel écran. MIR TEST seulement `hxtztkmbfpmzrieccwsg`; aucune opération vers `gccltmaulvrnthrbnrpd`. La séparation par préfixe `/test/` existante reste obligatoire. Une visite publique `?recette=1` ne doit jamais ouvrir MIR TEST.

## Courriels : inventaire et destinations

Les lignes indiquent **le code existant**, pas une preuve de transport configuré ou de message livré. La destination effectivement résolue dans un service distant n’est **pas certifiée** ici ; secrets et tableau de bord fournisseur ne sont pas consultés.

| Parcours / déclencheur | Modèle actuel | Langue actuelle | TO métier prévu / résolution | CC / BCC existants connus | Transport / environnement / activation |
|---|---|---|---|---|---|
| Estimation générale (formulaire) | `estimate-presentation.notification` | FR interne | `MIR_ESTIMATE_TO` côté serveur ; valeur runtime non vérifiée | Aucune copie construite dans l’enveloppe inspectée | Edge `mir-estimates` → Resend *si* variables + service activés ; PROD désactivée selon configuration cliente |
| Estimation Studio (dossier) | même modèle | FR interne | même variable serveur | non construites | même Edge, non appelé |
| Soumission matériaux (panier) | même modèle + PDF privé | FR interne | même variable serveur | non construites | Edge / éventuel service Node dédié ; non appelé |
| Soumission pliages | même modèle + PDF privé | FR interne | même variable serveur | non construites | Edge / Node optionnel ; non appelé |
| Brouillon commande client et confirmation | aucun modèle de courriel client vérifié ; statut local | — | aucun destinataire de livraison effectif établi | — | navigateur/panier local : aucune expédition démontrée |
| Bon de commande fournisseur validé | `server/supplier-send.cjs` (PDF privé + sujet révision) | FR | `job.recipient` après validation métier ; variable par commande | pas de CC/BCC dans l'appel `provider.send` | prestataire injecté et expéditeur vérifié requis; non appelé |
| Invitation d’employé | `team-invitation-email.mjs` | FR-CA | `details.email` venant de l’invitation serveur | non construites | MIR TEST `MIR_TEAM_TRANSPORT=disabled`; seul aperçu possible, pas de mail |
| Récupération de mot de passe | modèle Supabase Auth hébergé, non contrôlé dans ce lot | non vérifiée | adresse saisie via `resetPasswordForEmail` | non vérifiées côté fournisseur | Supabase Auth si réellement déclenché; **ne pas appeler** |
| Confirmation d’inscription | modèle Supabase Auth hébergé, non vérifié | non vérifiée | adresse saisie via `auth.resend` | non vérifiées | inscription publique désactivée; **ne pas appeler** |
| Connexion par courriel OTP | modèle Supabase Auth hébergé, non vérifié | non vérifiée | adresse saisie via `signInWithOtp` | non vérifiées | `emailEnabled=false`; **ne pas appeler** |

**Distinctions obligatoires :** une adresse présente dans le code est une **valeur de configuration**; une adresse résolue dans un processus réellement lancé exige lecture de ce processus/config; l'existence d'une API d’envoi ne prouve pas le fournisseur activé; et seule une réception fournisseur puis une confirmation finale permettrait un statut livré. Aucun de ces faits n’est présumé.

## Simulation de recette (zéro livraison)

`tools/qa/mir-mail-recipe.cjs` n’est pas importé par `dist`, l’APK, Edge ou un serveur déployé. L’exécution refuse toute tentative sans `MIR_MAIL_RECIPE_SIMULATION=1` et un contexte `environment=test` / projet TEST exact. Le destinataire simulé est **uniquement la boîte de Frederick** (`frederickmessely@gmail.com`). Les valeurs **TO/CC/BCC finales** sont `[Frederick]/[]/[]` pour **les dix parcours**. Les adresses originales sont comptées puis écartées de l’aperçu; aucun destinataire métier permanent n’est réécrit. Les captures HTML + texte FR-CA/EN-CA utilisent une personne, une référence et un matériau fictifs, avec échappement HTML. Ces traductions sont **des aperçus de QA proposés**, et ne signifient pas que les modèles véritables Supabase/Node sont activés ou traduits.

Le module ne possède ni `fetch`, ni SMTP, ni client provider. Le test intercepte `global.fetch` et affirme exactement **0 appels**, **0 envoi**, **0 statut serveur créé**, et **0 CC/BCC**, y compris lorsqu’une enveloppe d’origine fictive comprend une Adjointe. Ne jamais déduire « envoyé » de `deliveryStatus=not-sent`.

## Tests, captures et état de livraison

CI dédiée `.github/workflows/mir-studio-mail-recipe-pr.yml` : contrats montage TEST/public, SHA intacts, garde originel, sources et menus, dix enveloppes × deux langues, modèle de mail existant, Chromium sur 360/390/430/768/834/1024/1440 avec véritable logo SVG, clavier, focus, grands textes, mouvement réduit, absence de requête réseau et captures FR/EN. La CI GitHub doit être vérifiée sur **le dernier SHA de la PR**, et les images doivent être ouvertes/inspectées avant décision.

**Avant une fusion ultérieure :** revue des preuves CI et des captures; adaptation explicite du `scripts/mir-final-release-gate.cjs` (actuellement limité aux fusions antérieures) pour autoriser **uniquement** un merge révisé de cette PR; revue du diff, approbation de fusion/publication distincte et plan de rollback par remise du précédent artéfact Pages. **Ne pas fusionner ou déclencher Pages par cette PR.**

**Avant un éventuel essai réel de courriel (autorisation séparée indispensable) :** adresse runtime TO/CC/BCC prouvée côté infrastructure pour chaque chemin, redirection contrôlée en serveur TEST, test de consentement et d’isolation, expéditeur et domaine vérifiés, configuration SMTP/Resend/Supabase Auth par une intervention expressément autorisée, interception prestataire et idempotence auditée, journaux sans secrets ni données privées, critère exact d’acceptation fournisseur et procédure de désactivation immédiate. Aucun de ces prérequis n’est activé ici.

Samsung **en attente**, aucun appel au propriétaire. Paiement/Google en standby. Aucun courriel réel, écriture/migration Supabase production, signature APK, distribution employé.

## Additif PR42 — fiabilisation des recettes Android par exécution

Le blocage confirmé sur le SHA \`8a3b7c9\` était le préflight historique \`mobile/tools/verify-pr39-native-fixture.cjs\`, qui attendait les quarts \`9200/9210\` actifs et les données Chef \`9220/9230\` datées du 15 novembre. Ces fiches avaient été clôturées ou retirées correctement après PR41. Ne pas rouvrir les anciens punchs pour réparer une suite CI.

Le mécanisme réutilisable proposé dans cette branche remplace les constantes obsolètes par un manifeste **par run GitHub**. \`mobile/tools/native-qa-fixture.cjs\` génère un UUID v4 et un jeton unique gardé en fichier privé du runner, contacte exclusivement MIR TEST avec le compte Boss de recette, utilise une RPC installée uniquement dans MIR TEST (\`supabase/test-only/migrations/20261115235000_mir_native_qa_run_lease_test.sql\`) et crée les deux quarts/segments synthétiques et la fiche/tâche Chef du jour nécessaires. Préflight et instrumentation natifs vérifient les **identifiants exacts du nouveau run**, les deux vrais comptes de recette, le bon JOB, l'heure de début > 15 min et les vraies RPC en lecture serveur. Aucune dépendance aux quarts PR41.

**Isolation stricte :** un seul bail actif pour les deux identités QA partagées (index unique partiel + verrou PostgreSQL + groupe GitHub Actions commun); un second run concurrent refuse de prendre la place du premier. Après la dernière suite dépendante, un \`trap EXIT\` et un contrôle \`if: always()\` tentent la clôture limitée aux deux quarts marqués du run et la suppression uniquement de sa tâche/affectation. Aucun \`DELETE\` de punch/segment/audit ni déplacement d'un pointage historique, et aucun nettoyage d'une identité non reconnue. L'historique des quarts clos et le journal dédié des opérations de recette sont conservés. Une interruption de machine non interceptable laisse le bail jusqu'à expiration; seul le Boss TEST peut récupérer des lignes exactement correspondantes *après* l'échéance. Une incohérence bloque le nettoyage plutôt que de toucher à d'autres données.

Les secrets ne sont stockés ni dans le dépôt, ni dans l'artefact, ni dans l'APK. Les preuves contiennent seulement UUIDs synthétiques, SHA et résultats. Une migration test-only est un changement serveur **MIR TEST**, jamais Supabase PRODUCTION. Les vérifications réelles doivent inclure le cycle **préparation → lecture native → suites → clôture après échec/succès → SQL de contrôle sans actifs**. La CI sur la tête finale doit être relue; aucune affirmation de réussite avant sa conclusion.

Le Studio public, la langue FR-CA/EN-CA, les copies Studio TEST, les modèles de courriel réels, les paniers et les cinq espaces métiers ne sont pas modifiés par cette réparation. Les anciennes captures de PR42 sont issues du vrai Chromium et l'artefact du SHA final sera inspecté à nouveau; **aucune image externe** ne sert de preuve. Le moteur Studio universel est un autre lot, exclu.

### Horloge UTC et maintien du fail-closed (complément de recette)
Le serveur MIR TEST refuse toute nouvelle fixture durant les 10 dernières minutes d'une journée UTC pour éviter qu'un test Chef utilisant `current_date` change de jour. Le lanceur CI attend de façon bornée le début de la journée suivante lorsqu'il approche de ce seuil (marge de 12 minutes), **avant la création du bail**. Le serveur garde toutes ses validations strictes. Une panne ou interruption avant l'allocation ne réactive jamais un ancien quart. Ce comportement est testé avec une horloge simulée et sera confirmé dans la CI réelle.
