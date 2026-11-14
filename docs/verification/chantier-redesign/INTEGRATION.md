# Intégration de la refonte chantier Employé / Chef

Base du lot : `24d29734d68cd3da23c17be8693ddba08abff19f`, dépendance Auth PR36. Branche `codex/refonte-chantier-employe-chef`. Le responsable de coordination renseigne le SHA distant et la CI dans le bilan final. Aucun changement de production, Pages, courriel, paiement ou signature release.

## Sources et activation

Les sources communes sont `dist/chantier-app.js`, `mir-field-views.js`, `mir-field.css`, `mir-field-cart.js` et les moteurs existants. `mobile/tools/build-web.cjs` embarque ces mêmes fichiers. `fieldExperienceEnabled=true` active la nouvelle interface uniquement pour Employé/Chef ; l’APK TEST et l’aperçu local l’activent. La configuration web ordinaire reste au comportement historique tant qu’une publication distincte n’est pas autorisée. Le drapeau ne donne aucun droit serveur. Les nouveaux RPC sont appelés seulement sur TEST avec le drapeau ; Google et courriels restent désactivés.

Aperçu navigable : `node tools/preview-chantier.cjs`, puis `http://127.0.0.1:4173/`. Deux rôles, deux chantiers et des réponses locales explicitement simulées, aucune authentification ni écriture serveur. Les captures permanentes de simulation sont produites par `node tests/mir-field-redesign-browser.cjs` dans `artifacts/chantier-redesign/functional/`. Les preuves hébergées sont distinctes.

Le dessin conserve `production.html?mode=client&source=store&kind=profile` et réutilise le vrai moteur dans un cadre personnel. Le parent vérifié active le tracé existant, masque seulement l’ancien habillage dans ce cadre et ramène le succès au panier commun. Aucun droit de modification de banque. Les brouillons dessin et lignes personnelles sont attachés au compte et au chantier ; les anciens brouillons non attribués sont conservés dans leur emplacement historique, sans attribution implicite au compte suivant.

## Matrice besoin → interface → contrat → droits → vérification

| Besoin | Écran / raccordement | Contrat / données canoniques | Droits et scénario |
|---|---|---|---|
| Navigation commune | En-tête logo/panier/avatar ; Accueil, Commande, Punch, Message, Plus | Session/role existants ; shell isolé | 2 rôles × 5 formats, thèmes, texte 200 %, autres rôles conservés |
| Journée / affectations | Accueil, Changer de chantier, dossier | `mir_portal_snapshot`, dossier + métadonnées TEST | Jobs autorisées seulement ; actif Punch puis affectation Chef, choix explicite conservé |
| Équipe Chef | Accueil, Équipe, tâches, présences | `mir_lead_job_snapshot`, `mir_lead_action` | Sélection explicite org/leader/date/job ; non confirmé ≠ absent ; rejeu sans doublon |
| Plans / fiches / contacts | Plans et documents, dossier, itinéraire | `mir_job_dossier_snapshot`, `mir_field_job_snapshot`, objets Storage privés | Même job_id, dernière version publiée, auteur/date ; refus job/organisation étrangère |
| Photo avant/pendant/après | Dossier / Photo | `mir_field_action`, `job_activity` | Job et acteur capturés ; photo privée liée au propriétaire ; erreur puis photo remplacée, reprise et double clic |
| Extra | Dossier / Noter un extra | `EXTRA_SUBMIT`, `extras` | À examiner, aucune approbation ni facturation automatique ; même job pour photo et mutation |
| Problème / outil brisé | Dossier / Problème ; Plus / Bris d’outil | `mir_field_action`, `field_issues` existant | Employé/Chef ; même objet Adjointe ; Entrepôt lié pour outils seulement ; auteur/date/photo/état/réponse |
| Matériel / pliages / dessin | Commande, magasin, banque, moteur dessin | Catalogue, moteurs de cotes/PDF/snapshots existants | Quantité obligatoire ; dessin personnel ≠ banque ; vrai tracé et ajout vérifiés localement pour 2 rôles/3 téléphones |
| Panier / confirmation | Panier commun, suivi commandes | `mir_order_draft_save` + `mir_order_submit` | Reçu serveur complet obligatoire ; échec ne vide rien ; double action unique ; ajout pendant envoi conservé, reprise isolée au compte |
| Article manquant/incorrect/endommagé | Matériel et livraisons → Problèmes | `DELIVERY_ISSUE`, `delivery_issues` | Vraies références commande/ligne/job ; photo facultative ; refus commande étrangère et ligne incompatible ; même activité Adjointe |
| Punch personnel | Punch | `mir_punch_action`, segments existants | Commencer/Terminer/Changer/Déplacement ; GPS ponctuel distinct itinéraire ; règles pauses, verrous, chevauchements inchangées |
| Heures / historique | Plus → Mes heures | `mir_punch_personal_history`, shifts/segments/corrections/périodes existants | Self-only, filtres dates/job, pagination ; aucun droit manager ; année visible et correction ancienne journée |
| Correction avec journée | Mes heures → Demander une correction | `mir_punch_correction` | Traitement/audit Adjointe/Boss existants, pas d’auto-approbation |
| Première arrivée oubliée sans shift | Punch → J’ai oublié de puncher | Fil privé réel `MESSAGE_SEND` vers Adjointe, job/date/auteur | Alternative explicitement manuelle : aucun pointage créé ni correction canonique inventée. La création initiale reste à faire vérifier par le bureau |
| Message | Liste/recherche/fil privé, texte/photo/PDF | Clavardage existant, même conversation + messages.job_id | Même fil Message/dossier ; contexte job explicite, jamais job arbitraire du répondant ; privés exclus des autres participants ; brouillon et erreur visibles |
| Congés / dépense | Plus, formulaires progressifs | Services absences/dépenses existants | Job préremplie, journée complète masque heures, reçu facultatif brouillon, statut réel ; aucune décision locale |
| Rapport Chef | Plus / dossier / Préparer le rapport | `mir_lead_action daily_report`, `daily_reports` | Photos privées + travaux ; avancement/restant dans commentaire canonique ; choix job ; double clic protégé ; n’arrête pas Punch |
| Réglages / session | Avatar, profil, réglages, déconnexion séparée | Auth et coffre Android préservés | Retour Android et clavier adaptés ; verrou facultatif en Réglages ; pas de second NIP MIR ; compte personnel jamais créé |

## Vérifications et limites

- `tests/mir-field-postgres.cjs` : 25 groupes locaux PGlite, permissions/NULL role, isolation, jobs fermées, photos, idempotence, réponses forgées refusées, 2 jobs Chef, historique personnel et livraison canonique. Ce sont des tests locaux.
- `tests/mir-field-redesign-browser.cjs` : 102 contrôles Chromium simulés, 2 rôles / 5 formats ; revisite Chef A→B→A, double clic pendant upload photo ; vrai moteur de tracé à390px ; photo A → erreur → photo B ; rapport photo Chef ; historique paginé ; incident livraison lié ; reçu vide/échec/panier concurrent/double action.
- `tests/mir-field-profile.cjs` : 6 contrats SDK de nom opérationnel self-only, refus identité/rôle/organisation incompatibles, réponse tardive après déconnexion et absence d’appel en legacy. Le nom vient des capacités métier configurées; aucune métadonnée Auth n’est modifiée.
- `tests/mir-field-cart.cjs` : 3 cas purs d’acquittement ; seuls les quantités et articles effectivement soumis sont retirés.
- Les suites historiques Today/Chat conservent leurs assertions. `mir-chantier-ux-reviewed.json` versionne explicitement les nouvelles empreintes de client/moteur et de deux fonctions de présentation Punch. Les anciennes empreintes restent dans leurs fichiers d’origine.
- Relectures Designer, Ergonomie, Android, Harmonisation et Qualité : leurs rapports conservent défauts constatés puis corrections réellement revérifiées. Le développeur intègre seul le code ; aucune modification concurrente de source applicative.
- Les preuves réelles MIR TEST (HTTP/Storage et lectures UI) sont consignées séparément par la coordination. La réponse bureau simulée et un rôle SQL contrôlé ne sont pas présentés comme un login navigateur Adjointe/Entrepôt.
- APK standard prévu `0.13.0-test /130001`, CI mise à jour `130001 →130002`. Paquet personnel S25 séparé, provenance et signature protégée vérifiées par la coordination. Aucun APK remis avant inspection des cinq écrans.
- Chromium ne certifie pas WebView, émulateur ou Samsung. L’ancienne CI de checkpoint avait 7 tests natifs et les deux étapes de mise à jour verts ; son échec de rôle est corrigé dans les sources suivantes et attend la CI de la tête finale.
- Recette Samsung physique ouverte : mise à jour compatible sans désinstallation/effacement ; connexion TEST, fermeture/réouverture, redémarrage téléphone, verrou système facultatif, caméra/fichiers/GPS ponctuel, changement de job et déconnexion avec purge de l’affichage privé. Aucune distribution employés.

Les copies sous `supabase/test-only/migrations/` sont les installations TEST confirmées par le serveur, gardées immuables. Les propositions correspondent aux changements versionnés ; tout correctif ultérieur exige un nouveau fichier.


## Reprise des preuves Android après inspection de la CI1466

La CI1466 était verte mais plusieurs captures Employé/Chef étaient identiques. Elles ne prouvaient pas les cinq vues. Le contrôleur indépendant `mobile/tools/native-screen-proofs.cjs` rejette réellement cet ancien artefact (4 PNG distincts sur5 Employé; corps Commande/Punch identiques Chef).

Le test natif utilise maintenant des gestes `UiDevice` sur les bornes des vrais contrôles. Il attend le contenu propre à chaque écran, le nom opérationnel vérifié, deux jobs QA autorisées et une équipe/tâches Chef non vides. Chaque capture vient de `UiAutomation.takeScreenshot`; le corps doit devenir distinct des vues précédentes puis rester stable. Le rectangle fixe exclut horloge, bandeau et barre de navigation. Aucun marqueur artificiel n’est ajouté à l’interface. Les captures rejetées sont conservées.

Les manifestes décrivent les PNG et pixels réellement capturés. Le bilan CI décode indépendamment les PNG, recalcule les empreintes des corps et exige cinq vues distinctes pour chacun des deux rôles ainsi qu’un panneau compte distinct de l’accueil. Quatre tests complémentaires du contrôleur refusent notamment une horloge différente sur un même ancien corps. Ces tests synthétiques ne sont pas des captures de livraison.

Ces changements attendent leur nouvelle exécution Android et l’inspection réelle des captures. Aucune nouvelle recette native ni Samsung réussie n’est déduite de la compilation locale ou des anciennes captures CI.

## Reprise Auth native : réponses anciennes et effacement tardif

Les traces MIR TEST de la CI4d51 montrent un refus GET `/auth/v1/user` d’une ancienne session après un nouveau POST `/auth/v1/token` réussi. Un appel de compte suivant était alors sans identité. La CI5c avait également perdu la sonde locale de mise à jour malgré le rôle Employé rétabli. Ces résultats ne certifiaient pas la persistance Android.

La reproduction locale utilise le vrai SDK embarqué et le coffre asynchrone : avant le correctif, quatre réponses403 anciennes (reconnexion et rafraîchissement du même compte, codes `bad_jwt` et `session_not_found`) effaçaient le nouveau coffre et sa sonde; une ancienne déconnexion suspendue dans `Native.clearAuth` pouvait aussi effacer une connexion postérieure. Les refus403 réellement courants doivent continuer à purger.

Le SDK fourni transforme `session_not_found` en `AuthSessionMissingError` et peut appeler `_removeSession()` avant de retourner, même avec un JWT explicite. Le contrôleur utilise donc une instance privée du même SDK, sans persistance ni rafraîchissement, avec une clé mémoire distincte, pour vérifier l’utilisateur. Toutes les lectures publiques `getUser` de la façade native, y compris la reprise et les lectures du portail, comparent l’époque, l’identité et le jeton courant ainsi que le contenu effectif du coffre avant retour ou purge. Le jeton reste en mémoire et n’est jamais journalisé. `TOKEN_REFRESHED` invalide aussi les anciennes lectures du même compte.

Les mutations natives de connexion, déconnexion, session et retour PKCE sont ordonnées. Les nettoyages internes utilisent le chemin privé pour éviter une attente circulaire; le rappel d’état attend seulement la purge locale, sans appeler une méthode Auth. Aucun nouvel essai automatique, contournement de refus, compte ou transport n’est ajouté. Le SDK fournisseur, les API web, les invitations SQL et les assertions de `MirUpgradeTest` sont préservés.

`mobile/tools/test-auth-flow.cjs` compte20 scénarios avec le SDK réel, dont restauration dans une nouvelle instance, réponse provenant de l’ancien contexte, sonde locale conservée et refus courant toujours purgé. La revue indépendante Mobile a rejoué cinq cas sur le SDK corrigé et confirmé les preuves RED→GREEN. Les captures et la mise à jour Android de la nouvelle CI, puis la recette Samsung, restent nécessaires; une réussite locale ne les remplace pas.
