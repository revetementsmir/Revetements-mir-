# MIR — Localisation du parcours client FR-CA / EN-CA

Date : 15 novembre 2026. Base vérifiée : main 33eacb5741e801067178fdeec83a9489332333c6 (PR36/37 intégrées). Branche dédiée : codex/client-frca-enca-full-20261115.

## Statut / garde avant publication

Cette branche apporte un mécanisme de localisation client, une première traduction révisable et un PDF de sélection bilingue. Le parcours complet n’est PAS certifié. Le sélecteur est caché par défaut et n’est visible qu'en recette de branche via ?mir-locale-preview=1. Le marqueur de recette reste dans la session de navigation. Le choix FR/EN est une préférence client indépendante des objets métier. Ne pas annoncer la prise en charge EN complète ni activer EN publiquement avant la fermeture des écarts.

## Matrice de couverture réelle

| Parcours | Sources contrôlées | Présent dans cette branche | À terminer |
| --- | --- | --- | --- |
| Accueil / navigation | index.html, mir-public-menu.js, mir-client-return.js | Textes statiques principaux et menus, attribut lang, sélecteur preview | Traduction contrôlée des contextes Connexion et liens retour |
| Réalisations / contact | realisations.html, mir-realisations.js, contact.html | Textes statiques principaux | Galeries, dialogues et descriptions dynamiques |
| Catalogue / Boutique | materiaux.html, boutique.html, produit.html, catalogue.js, commerce.js | Libellés fixes, formats de montants CAD et nombres | Chaque produit/fini/fournisseur, erreurs, filtres et états de disponibilité |
| Panier / commandes | selection.html, mir-unified-client-dossier.js, mir-account-flow.js | Textes principaux, magasins existants préservés | États avancés, compte, suivi client, factures et pièces jointes |
| Pliages / configurateur | pliage.html, pliage.js, production.html?mode=client, production-app.js | Textes principaux; sources métier du moteur inchangées | Toutes les validations/dessins/configurations et PDF du pliage |
| Studio / plan 3D | plan.html, plan-app.js, studio.html | Textes principaux d’interface | Outils, import, tracés, scènes, guides, erreurs et exports |
| Estimation / dossier privé | estimation.html, estimation-dossier.html, mir-estimate.js | Pages statiques | Formulaire généré, états d’envoi, champs et pièces privées |
| PDF de sélection | mir-selection-pdf.js et mir-dossier-pdf.js | Texte, fichiers, dates et unités d’affichage en deux langues, mêmes données | Test Chrome + PDF.js de téléchargement/rendu et inspection visuelle des deux versions |
| PDF, aperçu, impression | annotated-pdf.js, mir-panel-po-pdf.js, mir-unified-client-dossier.js | Titres et légendes des PDF annotés et fiches de panneaux localisés seulement en contexte client, source métier inchangée | Documents de dossier combiné, tous les états d’export, rendu réel de chaque feuille et inspection visuelle en FR/EN |
| Courriels client | mir-estimate-presentation.js et copie Edge, supabase/functions/_shared/team-invitation-email.mjs | Vérifié : le premier modèle notifie l’équipe MIR; le second est une invitation employé TEST. Ils restent en français et inchangés, avec test de rendu fictif et parité octet. Aucun modèle client envoyable existant dans le dépôt inspecté. | **Dépendance externe réelle** : contenu des courriels client Supabase Auth (confirmation/récupération), configuration de l’expéditeur et traductions transport non présents ici; vérification sans envoi et sans écriture prod à réaliser lorsque des sources autorisées existent. Ne pas inventer un modèle client opérationnel. |
| Aide / compte / Auth client | mir-help-center.js, portal-client.js, chantier.html, mir-account-flow.js | Entrée client gardée via clientLocale=1, réversibilité en français pour les employés et Auth inchangée. Textes de connexion, inscription, récupération, adresses et commandes ajoutés; test avec SDK simulé | Terminer la certification clavier, liens d’invitation/retour, grands textes, erreurs hors ligne et contenu d’aide client partagé; ne pas modifier l’aide des employés. |

## Glossaire FR-CA / EN-CA

| Français | Canadian English | Règle |
| --- | --- | --- |
| Revêtement extérieur | Exterior siding | Aucune promesse de matériau |
| Clin | Lap siding | Modèle fabricant inchangé |
| Soffite | Soffit | Ventilation inchangée |
| Fascia | Fascia | Cotes conservées |
| Solin | Flashing | Détail exact selon profil |
| Moulure / pliage | Metal trim / bending | Ne pas confondre avec panneaux |
| Pliage sur mesure | Custom metal bending | Longueur de vente inchangée |
| Panneau architectural | Architectural panel | Distinct des panneaux fibrociment |
| Cote | Dimension / measurement | Lettres A, B, C inchangées |
| Développé de tôle | Developed sheet length | Calcul inchangé |
| Fini | Finish | Nom fabricant officiel si vérifié |
| Couleur | Colour | Orthographe en-CA |
| Gage | Gauge | Valeur/échelle inchangées |
| Pouce (po) | Inch (in.) | Aucun changement numérique |
| Pied (pi) | Foot (ft) | Aucun changement numérique |
| Pied carré (pi²) | Square foot (sq ft) | Aucun changement numérique |
| Estimation | Estimate | Selon le formulaire existant |
| Panier | Cart | Panier ne vaut pas commande |

## Architecture, risques et limites

Les cinq espaces métier, sessions Auth, commandes, punch, géométrie, Supabase et APK restent hors lot. Le service Edge actuel n’expose qu’un courriel de notification interne MIR en français, pas un modèle existant de courriel envoyé au client : il reste inchangé, et aucun expéditeur n’est activé. Le configurateur partagé est traduit exclusivement pour mode=client et jamais source=store. Ne pas traduire noms de marque, SKU, références officielles, couleurs fabricant non validées, adresses ou notes saisies. Ne pas modifier les objets du panier ou calculs. Conserver noindex,nofollow et ne pas créer hreflang sans politique de routes stable. Aucun paiement, Gmail, Google, Supabase prod, distribution APK ou recette physique Samsung.

## Vérifications de ce lot

Tests ajoutés : vérification de la non-traduction des noms, destinataires, adresses et notes clients, deux emails internes fictifs non envoyés, couverture statique de treize pages avec exceptions vérifiées (noms propres, fabricant, adresse), contrats Node du dictionnaire, nombres CAD, exclusion staff, PDF matériaux et panneaux FR/EN, invariants produits et géométrie; Chrome et PDF.js sur PDF réel avec captures comparables; Chromium réel à 360/390/430/768/834/1024/1440 en preview, langue persistée, panier et champ non modifiés, captures avant/après, aucun EN sur URL publique; garde CI de fichiers métier. Les résultats et éventuels échecs CI se jugent uniquement sur la tête GitHub finale.

La couverture complète de tous les parcours FR-CA / EN-CA, documents PDF inspectés dans les deux langues, exports, courriels fictifs et revue humaine des restes FR sont encore requises avant autorisation distincte de fusion et publication.


## Reprise et vérifications ciblées — 15 novembre 2026 (PR41)

**Base GitHub relue** : main `33eacb5`. PR41 demeure brouillon, sans fusion ni publication. Les 37 commits ajoutés depuis `83f3a39` ont été conservés : garde client sur Connexion/Compte, retour Auth sans changer les rôles, textes dynamiques, SEO noindex, PDF mixte et simulations de courriels internes, tests de navigation clavier, de compte et d'accessibilité. Ne pas refaire ces lots.

| Contrôle / état réel | Preuve vérifiée | Décision / limite |
| --- | --- | --- |
| Client accueil, navigation, 13 pages, FR/EN | `tests/mir-client-i18n-static.cjs`, `tests/mir-client-accessibility-browser.cjs`, `tests/mir-client-i18n-browser.cjs` | Exécution CI sur SHA final requise ; aucune activation EN publique avant revue |
| Connexion/compte, invitation et retour | `tests/mir-client-account-en-browser.cjs`, `tests/mir-client-account-isolation.cjs`; garde `chantier.html?clientLocale=1` | Ne pas changer Auth, invitations employé ni cinq espaces métier ; backend réel non exercé |
| PDF matériel FR/EN | `tests/mir-client-i18n-pdf-browser.cjs` et captures de rendu PDF.js | Déjà vert sur `83f3a39`, réexécuter sur HEAD finale |
| Dossier combiné matériel + pliage | `tests/mir-client-unified-bilingual-browser.cjs` | CI `e2ba08b` a détecté une phrase de couleur personnalisée divisée entre deux lignes SVG et partiellement FR ; correctif dans `mir-client-i18n.js`, test de fragments ajouté. Ne pas ignorer le contrôle |
| Courriel | `tests/mir-client-email-boundary.cjs`, `tests/mir-client-mail-simulation-browser.cjs` | Modèles existants = notification interne MIR + invitation employé, donc aucune modification ni envoi ; les modèles Supabase Auth client ne sont pas présents dans ce dépôt |
| SEO, documents fabricant | URL/robots existants préservés, documents externes non réécrits | Pas de hreflang/noindex levé, pas de traduction non officielle de couleur ou PDF fabricant |
| Android métier | Workflow `android-test` sur `e2ba08b` | **Rouge hors lot** : précondition MIR TEST « Quart/segment QA actif manquant ou incohérent: EMPLOYEE »; 2 tests Android upgrade réussis avant cette précondition. Pas de correction APK ni demande de recette Samsung |
| Clavardage / garde des fichiers | Workflow `chat-security` sur `e2ba08b` | **Rouge de garde** : empreinte de `dist/commerce.js` diffère du hash protégé de Phase 3A. Ne pas affaiblir le test ni déclarer non-régression complète ; rapprocher le changement d'affichage CAD et la protection de fichier avec le responsable de l'intégration |
| CI sur tête actuelle | `e2ba08b` : 21 verts, 3 rouges (bilingue PDF, Android TEST, garde chat) | Correctif PDF + test de reproduction poussés sur la branche ensuite. Vérifier les workflows **sur le nouveau SHA**, pas sur une tête antérieure. |

**Interdictions inchangées** : aucune écriture/migration Supabase production, aucun courriel réel, Google/paiement, signature ou distribution APK; Samsung EN ATTENTE. La recette sur appareils physiques et le backend Auth réel ne sont pas remplacés par des simulations. Aucun faux statut « terminé » si la CI finale n'est pas entièrement expliquée et si les PDF mixtes ne sont pas contrôlés dans les deux langues.


## Matrice finale ciblée PR41 — reprise MOON du 15 novembre

Cette section est la plus récente : la matrice historique en début de rapport ne doit pas être interprétée comme l'état final. Seuls les contrôles du SHA HEAD exact de PR41 font foi : https://github.com/revetementsmir/Revetements-mir-/pull/41/checks

| Parcours et états FR-CA / EN-CA | Contrôles de preuve et invariant | Limites / dépendances |
| --- | --- | --- |
| 13 routes publiques, accueil, réalisations, contact | mir-client-i18n-static.cjs : 837 libellés sur 853 traduits, 16 noms officiels/adresses préservés. mir-client-accessibility-browser.cjs : 13 routes aux 7 largeurs 360/390/430/768/834/1024/1440 | Émulation Chrome, pas certification physique Samsung |
| Navigation, avatar, bascule et liens profonds | mir-client-i18n-browser.cjs et mir-client-accessibility-browser.cjs : focus clavier, aria-pressed, langues, URL inchangée, menu mobile/tablette, PC, absence barre basse accueil | Aucun faux bouton EN sur site publié |
| Matériaux, catégories, recherche, fiches produits, couleur, filtre | catalogue.js, commerce.js, suite commerce, Phase 9 et dictionnaire en-CA | SKU, marques, codes et couleurs fabricant officiels non modifiés |
| Panier, sélection, états vides/erreurs, quantité et dossier | mir-unified-client-dossier.js, mir-account-flow.js, mir-client-unified-bilingual-browser.cjs | Aucun paiement, aucune commande distante ou réécriture des données |
| Pliage, profil, panneaux et dessin | production.html en mode client et production-model.js, PDF mixte réel, conservation exacte du snapshot et de la géométrie | Production-app/Admin/entrepôt restent français |
| Studio 3D, plan, import, estimation | plan.html, plan-app.js, estimation.html, mir-estimate.js, tests navigation et erreurs | Soumission distante, PDF fabricant externe et import réel non tous examinés humainement |
| Compte client, connexion, retour, récupération, commandes, adresses, aide | mir-client-account-en-browser.cjs et mir-client-account-isolation.cjs, SDK de test simulé, employés exclus | Aucun courriel/Auth externe réel, aucune modification d'invitations employé |
| PDF de sélection matériel, titres, date, unité et avertissements | mir-client-i18n-pdf-browser.cjs : PDF.js télécharge, extrait, rend et compare FR/EN | Aucun prix ou conversion de mesure ajouté |
| PDF panneau, bon de commande client | mir-client-pdf-bilingual.cjs : même géométrie, quantité et référence; titres et avertissements localisés | Fournisseur et atelier métier inchangés |
| PDF combiné matériel + pliage, notes et textes multiligne | mir-client-unified-bilingual-browser.cjs : vrais PDF de deux pages, FR et EN, snapshot inchangé; production-model.js traduit le seul avertissement commercial connu **avant** le découpage SVG, jamais les notes saisies | Attendre CI finale exacte pour attester disparition des fragments français |
| Courriels | mir-client-email-boundary.cjs, mir-client-mail-simulation-browser.cjs : notifications internes et invitation employés rendues avec données fictives, transport absent et fichiers Edge octet-identiques | Modèles courriel Supabase Auth client externes au dépôt; aucun envoi/activation ni écriture production |
| SEO, imprimés fabricant | Métadonnées clients localisées, robots noindex/nofollow et URL conservées | Aucune nouvelle route/hreflang sans stratégie; document fabricant original intact |
| Cinq espaces métier et APK | Garde CI FR/EN, vérification de modes staff et tests rôles; aucun fichier métier fonctionnel ni APK source changé | La modification du seul préflight mobile/outils TEST est vérifiée par son blob exact |
| Clavardage Phase 3A / commerce | mir-chat-phase3a.cjs prouve la parité complète commerce.js vs main 33eacb5 sauf exactement deux lignes de formatage Intl.NumberFormat. Empreinte client revue b33930663305142ec08b3753a4ed47dd5f3e4d0594a84d36bbc74c269e5bae28 | Auth, RLS, RPC, calculs, données et modules chat intacts; contrôle maintenu strict |
| Android native MIR TEST | verify-pr39-native-fixture.cjs en lecture seule; cinq fichiers sous mobile/supabase autorisés seulement par leurs SHA Git dans mir-client-qa-isolation.cjs | Aucune donnée de production, pointage réel, distribution ou recette Samsung |

### Fixture QA temporaire — preuve et fermeture ciblée

Cible unique du connecteur : projet MIR TEST hxtztkmbfpmzrieccwsg, organisation QA 8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9, job QA 7da20261-1114-4000-8000-000000000001. Au contrôle de lecture précédent : quarts 8900/8910 et 9000/9010 déjà clos, aucun quart actif pour ces deux comptes, aucun objet frais. Jamais réactivés.

Après exécution exclusive de la préparation SQL TEST avec verrou et garde de projet : 2 quarts synthétiques actifs 9100, 2 segments actifs 9110, 1 affectation Chef 9120 et 1 tâche 9130, sur les deux identités QA approuvées. Marqueur : QA-TEAMS-HOURS-SYNTHETIC-NOT-PHYSICAL. Aucune écriture de GPS ou punch_action, aucun autre pointage modifié.

Tant que les derniers jobs Android liés à PR41 ne sont pas terminés, conserver ces six objets. Puis utiliser exclusivement les deux scripts pr41-android-native-active-close-20261115.sql et pr41-android-native-chef-today-close-20261115.sql : fermer les segments/quarts exacts sans les effacer, supprimer seulement l'affectation et la tâche fictives si aucun lien réel; vérifier l'absence d'actif après et enregistrer la preuve Atelier. Si une vérification de collision échoue, refuser le nettoyage plutôt que toucher un autre objet.

### Garde de certification / verdict

Le workflow principal conserve un refus de diff pour mobile, Supabase, Auth, espaces métier, courriel et APK. Exception limitée aux **cinq** fichiers synthétiques TEST dont les blobs sont épinglés dans mir-client-qa-isolation.cjs; tout autre fichier reste interdit. La garde de clavardage épingle désormais l'intégralité du fichier client après revue des deux seules lignes de formatage.

Ne pas annoncer EN public ni une certification globale sur la base d'un ancien SHA : les suites documentées, notamment le PDF mixte, chat-security et Android, doivent être vertes sur la tête finale exacte. PR41 demeure brouillon; aucune fusion ni publication; Samsung EN ATTENTE.


## Décision de publication et retrait du mode d'essai — PR41 (15 novembre 2026)

Autorisation de Frederick : fusion historique PR41 sur main, puis publication via le GitHub Pages MIR existant **après** certification de la tête exacte. Le seul mode client fait apparaître FR/EN sans paramètre de prévisualisation; le cloisonnement `isClient` / `staffReady` reste intact. Les 14 fichiers HTML clients référencent la nouvelle version du même script afin d'écarter le cache ancien. Pas de changement des données, rôles ou modules métier.

Le workflow GitHub Pages vérifie après déploiement, au SHA effectif, l'identité octet-à-octet des HTML principaux, scripts de langue et générateurs PDF publiés. Il ouvre aussi les pages effectivement servies dans Chromium aux largeurs 390 et 1440, sans paramètre de prévisualisation, pour vérifier la présence FR/EN, `lang`, les contenus traduits, la persistance d'un panier fictif, le retour FR et les directives `noindex,nofollow`. La PR ne vaut pas publication tant que ces contrôles Pages ne sont pas verts sur le commit fusionné.

**Limites conservées :** aucune validation ni activation des modèles Supabase Auth externes; aucun courriel réel, Google, paiement, écriture Supabase production ou distribution d'APK. Recette Samsung physique EN ATTENTE. PDF fabricant externes laissés dans leur langue officielle. Les courriels internes et invitations restent simulés sans transport; les tests panier sont locaux et fictifs.
