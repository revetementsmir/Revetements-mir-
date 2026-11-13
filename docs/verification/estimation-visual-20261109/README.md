# Recette visuelle MIR — 9 novembre 2026

## Périmètre et méthode

Base de référence : `main` à `e11108a980cefe8dff7e8509b79b4b414afe580b`, avec les correctifs Pliage locaux de la séance interrompue conservés. Un instantané immuable du dossier initial a servi les captures « avant ». Les captures « après » utilisent les fichiers de travail réels. Ce sont des tailles Chromium émulées, pas des appareils physiques ni une vérification du site publié.

Largeurs : **360, 390, 760, 761, 834 et 1440 px**. Hauteur : 844 px jusqu’à 834, puis 900 px. DPR 1, mouvement réduit, fichiers et données comparables ; mêmes conditions avant/après. Les listes sont attendues avant la capture et toutes les images, y compris différées, sont chargées. `document.fonts.ready` est attendu. Les menus sont ouverts puis fermés avec Échap ; les cibles sont examinées au focus. Un second passage clavier réel est consigné séparément.

L’inventaire initial couvre accueil, boutique, produit HardiePlank réel, répertoire Light Trim, réalisations, contact, pliage, configurateur client, Studio et connexion Mon compte : **60 combinaisons**. L’après inclut les deux nouvelles pages d’estimation : **72 combinaisons**. Le panier vide et les états de dessin, mesures, finition vide et longue, bibliothèque et fiche sans documents sont contrôlés séparément.

Aucune commande, aucun paiement, aucune adresse enregistrée et aucun courriel n’ont été envoyés pendant cette recette visuelle.

## Anomalies corrigées et reproductions

| Anomalie | Page et largeurs | Reproduction / état | Avant | Après |
|---|---|---|---|---|
| Marque trop petite et commandes d’en-tête incohérentes avec l’accueil | `chantier.html?recette=1`, 360 et 390 ; différence de proportions également à 760/761/834/1440 | Ouvrir la connexion. La marque mesurait 76 px à 360/390 ; le titre dupliqué, le hamburger et « Mon dossier » occupaient l’en-tête. | [360 fermé](before/compte-360-closed.png), [390 menu](before/compte-390-menu.png), [1440 fermé](before/compte-1440-closed.png) | [360 fermé](after/compte-360-closed.png), [390 menu](after/compte-390-menu.png), [1440 fermé](after/compte-1440-closed.png) |
| Cibles de navigation moins hautes que celles de l’accueil | Pages publiques hors accueil, particulièrement boutique/configurateur à 761 et 834 | L’en-tête passe sur deux rangées après 760 px ; certains liens mesuraient 42,1875 px. Un minimum de 44 px est appliqué sans modifier l’accueil. | [Boutique 761](before/boutique-761-closed.png), [Boutique 834](before/boutique-834-closed.png) | [Boutique 761](after/boutique-761-closed.png), [Boutique 834](after/boutique-834-closed.png) |
| Dépendance de police indisponible dans le Studio | `plan.html`, six largeurs | Chargement réel de Google Fonts refusé : `net::ERR_TUNNEL_CONNECTION_FAILED`. Le navigateur affichait le fallback. Les familles officielles et leurs licences sont maintenant locales ; Manrope est réellement chargée dans la page après. | [Studio 360](before/plan-360-closed.png), [Studio 1440](before/plan-1440-closed.png) | [Studio 360](after/plan-360-closed.png), [Studio 1440](after/plan-1440-closed.png) |

| Statut de chargement persistant alors que le service est non raccordé | Nouvelle page `estimation.html`, 360 px | Ouvrir le formulaire avec `apiBase` vide ; « Préparation de votre demande… » restait affiché indéfiniment. Le statut final indique désormais que le brouillon est conservé et que l’envoi n’est pas raccordé. | [360 avant correction du statut](before/estimation-360-unconfigured-status.png) | [360 après](after/estimation-360-closed.png), [390 après](after/estimation-390-closed.png) |

Le menu du compte conserve les autorisations et les liens existants. Les styles d’harmonisation ne ciblent ni l’administration ni les employés connectés. Le changement de libellé « Mon panier » et du bouton « Menu » est réalisé dans le contrôleur existant, avec ses libellés accessibles conservés.

## Écrans Mon compte réellement vérifiés

- Connexion, bouton Google désactivé dans MIR TEST, affichage du mot de passe, mot de passe oublié, champs et focus : six tailles.
- Inscription client et adresse de livraison avec contenu long : six tailles, formulaire jamais soumis.
- Compte client **réellement authentifié dans MIR TEST** : commandes, onglet sélectionné, adresses et formulaire d’adresse rempli avec des données fictives, six tailles avant et après. Les champs n’ont jamais été enregistrés.

Le frontend local est servi sous l’origine officielle interceptée par Playwright, car la protection normale du compte refuse localhost. Les appels Auth et `mir_account_snapshot` utilisent réellement HTTPS vers `hxtztkmbfpmzrieccwsg.supabase.co` et retournent 200. Cette méthode teste les fichiers de travail et le service de test ; elle ne démontre pas l’état de GitHub Pages. Les secrets restent dans le transport de test et ne sont pas inscrits dans les captures ou les rapports. Avant chaque capture connectée, le texte affiché dans `#account-name` est remplacé dans le DOM par `client.recette@example.invalid`, de manière identique avant et après. Aucun pixel n’est retouché ; l’identité du test ne fait pas partie des ressources livrées.

Exemples : [commandes avant 390](before/compte-390-orders.png), [commandes après 390](after/compte-390-orders.png), [adresses longues avant 360](before/compte-360-addresses-long.png), [adresses longues après 360](after/compte-360-addresses-long.png). Voir `account-authenticated.json` pour les appels et les douze comparaisons.

## Nouveaux écrans

`estimation.html` et `estimation-dossier.html` n’existaient pas dans l’instantané initial. Ils sont contrôlés aux six largeurs, sans inventer de capture « avant ». La fiche privée est examinée ici dans son état sans accès/configuration ; son dossier rempli et la 3D privée exigent la recette du service serveur et de ses autorisations. Leurs résultats fonctionnels doivent être lus dans le rapport d’intégration principal.

## Préservation de l’accueil

Les feuilles de style de l’accueil sont inchangées. Une comparaison des éléments visibles, de leurs coordonnées, dimensions, textes, polices, couleurs, espacements et bordures est **strictement identique aux six largeurs** (`home-layout-comparison.json`).

Les captures fermées finales sont strictement identiques à 360, 390, 760 et 761 px. Les différences à 834 et 1440 sont respectivement 7 et 15 pixels d’un niveau RGB, limitées à la rastérisation des bords de photos. Le premier passage à 760 avait relevé 16 pixels d’un niveau RGB ; la capture finale à 760 est identique. Les menus 360/390/760 sont identiques. Les captures de focus clavier sont identiques à 760/761/834/1440 ; à 360/390, quelques pixels de rastérisation diffèrent sans changement de géométrie ou de style. Les mesures brutes et empreintes figurent dans `home-unchanged.json` ; ne pas affirmer une identité binaire de tous les PNG.

## Limites et preuves

- Aucun appareil physique utilisé.
- Le site GitHub Pages reste à contrôler après déploiement par l’intégrateur ; cette recette locale ne le remplace pas.
- Les écrans de validation de courriel, de lien d’invitation et de définition de mot de passe exigeant un jeton réel ne sont pas validés visuellement dans cette mission, afin de ne pas consommer de lien ni changer un compte.
- Les espaces employé/admin ne sont pas assimilés à Mon compte client et ne sont pas modifiés par ce CSS.
- Les polices avant du Studio étaient réellement indisponibles. Les autres captures utilisent Arial système ; les images locales sont chargées.

Inventaires : `before-inventory.json`, `after-inventory.json`, `before-extra-states.json`, `after-extra-states.json`, `before-account-screens.json`, `after-account-screens.json`, `account-authenticated.json`, `keyboard-focus.json`, `home-layout-comparison.json`, `preview-validation.json`. Script reproductible : `tests/mir-estimation-visual-audit.cjs` avec `MIR_VISUAL_BASE` et `MIR_VISUAL_STAGE`.

## Aperçu autonome et sélection de livraison

`apercu-autonome.html` réunit deux paires authentiques et une fiche fictive de revue. 314 Ko environ, quatre images intégrées, aucun script, formulaire, appel HTTP secondaire, API ou stockage. La vérification est consignée dans `preview-validation.json`. Ce document illustre la revue et ne simule jamais un envoi réussi.

`delivery-files.json` sélectionne les paires nécessaires, les captures des nouveaux écrans et les inventaires/rapports, pour moins de 5 Mo. Les autres captures exhaustives restent disponibles localement ; elles ne sont pas toutes nécessaires à la publication du rapport.
