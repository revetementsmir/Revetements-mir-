# MIR — Pliage 03 « Étapes à gauche »

Branche : `codex/pliage-03-etapes-gauche-20261118`.
Base inspectée : `e58964cd8937766d2457904d2d7d625d1bc7df5e`, tête distante du lot Studio et aperçu MIR TEST READY au début de ce travail.

Aucun `AGENTS.md` trouvé dans le dépôt ou ses répertoires parents inspectés. Les autres worktrees et branches actives ont été conservés.

## Réalisation

La page `pliage.html` propose les deux entrées : banque de profils et dessin personnalisé. Le vrai configurateur `production.html?mode=client&kind=profile` conserve son moteur, ses validations et son stockage existants, avec quatre étapes : Modèle, Mesures, Finition, Vérification. Navigation verticale PC, profil SVG et interface anthracite ; les contrôles s’adaptent à la tablette et au téléphone.

Chaque angle ordinaire conserve sa saisie indépendante, les décimales et son sens. Les commandes +/− et le repère sélectionné complètent les champs existants. Les replis écrasés restent distincts : « Options des replis » permet leur ouverture explicite. Les conversions po/mm ne passent plus par l’arrondi d’affichage à quatre décimales dans le nouveau parcours.

Les deux faces utilisent exactement la même section projetée du moteur. Un seul tracé bleu continu identifie la surface choisie ; aucun retournement, aucune coloration fictive du produit. La face reste conservée avec les mesures, angles et quantité. Les nouveaux PDF client reprennent cette annotation et la convention d’angle intérieur ; l’export atelier historique reste identique sans activation explicite.

Le catalogue réel fournit les couleurs par métal et produit. Noms officiels et codes sont conservés visuellement et pour les lecteurs d’écran. La recherche ne retire aucune référence du catalogue. Changer de produit efface une couleur devenue incompatible. La quantité reste vide jusqu’à sa saisie ; le panier commun, la réédition et les autres pièces sont conservés.

## Captures réelles

| Écran PC | Français | Anglais |
| --- | --- | --- |
| Entrée | [Capture](after/landing-fr-CA-1440.png) | [Capture](after/landing-en-CA-1440.png) |
| Banque | [Capture](after/models-fr-CA-1440.png) | [Capture](after/models-en-CA-1440.png) |
| Mesures | [Capture](after/measurements-fr-CA-1440.png) | [Capture](after/measurements-en-CA-1440.png) |
| Finition et faces | [Capture](after/finish-ready-fr-CA-1440.png) | [Capture](after/finish-ready-en-CA-1440.png) |
| Vérification | [Capture](after/quantity-ready-fr-CA-1440.png) | [Capture](after/quantity-ready-en-CA-1440.png) |
| Ajout | [Capture](after/added-fr-CA-1440.png) | [Capture](after/added-en-CA-1440.png) |
| Angles personnalisés | [Capture](after/custom-measurements-fr-CA-1440.png) | [Capture](after/custom-measurements-en-CA-1440.png) |

Les autres vues, dont tablette/téléphone, se trouvent dans `after/`. Référence avant modification : `before/`. Les résultats JSON donnent les dimensions, langues et empreintes des ressources réellement chargées. Les essais intermédiaires sont conservés dans `discovery-*` ; ils ne constituent pas la validation finale.

## Vérifications

- Huit suites de contrats : surfaces, contrôleur réel, documents, dictionnaire, longueurs, profils canoniques, dossier commun et géométrie historique. Résultats et sorties : [contracts/results.json](contracts/results.json).
- Recette Chromium : six parcours FR/EN aux formats 1440×900, 834×1194 et 390×844 ; exclusion magasin, panneau et atelier. Mesures, angles décimaux, boutons +/−, po/mm, deux faces, Ivoire/Sable, changement de produit, quantité invalide, reprise après rechargement, deux pièces distinctes, réédition, compteur et panier. [Résultats](after/results.json) et [méthode](QA.md).
- Traduction : changements FR↔EN sans modifier formulaires, géométrie, nom officiel de couleur ou panier ; fragments PDF traduits, notes client protégées. Rapports `i18n-browser-results*.json`.
- PC 980 px tactile (« version ordinateur »), 1280×800, 1920×1080 ; surface CSS équivalente à un zoom 200 % : champs, navigation et couleurs restent accessibles. [Captures et limites du test](desktop-extra/README.md).
- Accueil et Particuliers : 4 comparaisons PC/téléphone, PNG identiques et zéro pixel différent. 1 653 fichiers protégés identiques à la base. [Preuves](protected/README.md).
- Export PDF natif : bouton réel, téléchargement et lecture avec PyMuPDF sur deux pièces de contrôle locales ; aucune demande réelle. Les preuves se trouvent dans `pdf/`.
- Les 24 empreintes historiques du moteur et des documents sans activation client restent identiques. [Contrats détaillés](INVENTAIRE.md).

Le harnais bloque les transports externes avant réseau. Les tentatives préexistantes de lecture de tarifs sont consignées séparément ; aucun tarif fictif n’est injecté. Aucune demande d’estimation, aucun courriel, paiement ou accès Google n’est envoyé/activé.

## Fichiers applicatifs

| Fichier | Changement |
| --- | --- |
| `dist/pliage.html` | Entrée SVG sobre ; deux liens vers le vrai parcours ; ancien formulaire conservé pour compatibilité. |
| `dist/production.html` | Chargement des modules publics dédiés et versions de ressources. |
| `dist/production-app.js` | Branchement public, angles +/−, palettes complètes, récapitulatif, précision des unités, reprise et export client. |
| `dist/mir-pliage03.js` | Organisation des vrais contrôles, faces, textes et protections des noms source. |
| `dist/mir-pliage03.css` | Présentation anthracite isolée et responsive. |
| `dist/mir-pliage03-en-ca.js` | Extension canadienne anglaise limitée aux routes concernées. |
| `dist/mir-pliage-surfaces.js` | Géométrie pure des surfaces opposées, annotation SVG. |
| `dist/mir-pliage-documents.js` | Adaptateur d’export public explicite. |
| `dist/production-model.js` | Options de présentation facultatives ; sorties historiques inchangées sans activation. |
| `dist/mir-unified-client-dossier.js` | Adaptateur documentaire du panier commun. |
| `dist/mir-estimate.js` | Adaptateur du document joint dans le contexte pliage existant. |
| `dist/selection.html` | Chargement des adaptateurs et traduction du document client. |

Les nouveaux tests et `.github/workflows/mir-pliage03.yml` permettent de rejouer la recette ; aucun test existant n’a été désactivé. Le harnais de tests du contrôleur existant a été complété pour le nouveau prédicat de contexte et les invariants ajoutés.

## Limites explicites

- Toutes les références présentes dans les neuf palettes existantes sont réutilisées. Cela ne certifie pas le stock ni la disponibilité d’un fini sur chaque produit. Les réserves du catalogue restent affichées.
- Plusieurs références n’ont pas de photo/hex fourni, notamment les quatre gammes Royal. L’interface annonce « Échantillon non disponible » et n’invente pas de couleur.
- La ligne bleue repère une surface. Son écart graphique n’est pas une épaisseur de tôle ou un rayon de fabrication certifié ; le moteur existant conserve ses validations atelier.
- Tablette/téléphone testés dans Chromium avec dimensions et interactions tactiles émulées ; pas d’essai sur appareil physique. Le test de zoom réduit la surface CSS disponible et ne prétend pas être un geste de zoom Android réel.
- L’ancien formulaire rapide garde son contrat historique à angles droits et sa compatibilité. Les angles individuels et faces continues concernent le parcours principal versionné.
- Le nouvel aperçu doit être publié uniquement dans MIR TEST. Le SHA servi doit correspondre au marqueur `test/mir-test-environment.json`. Aucun merge dans main ni déploiement production.

## Méthodes et suivi

MOON 1.3.11 et BOSS GOD MODE ont réellement été consultés, ainsi que Designer, Ergonomie, Harmonisation, Architecture, Qualité, Métier et SEO. Leurs méthodes ont été appliquées dans ce chat avec des agents de code ; aucune revue humaine externe ni exécution autonome Atelier n’est prétendue.

Mission Atelier : `78f5aa44-6638-4503-9cda-f925cbbd9d1f`, liée au projet MIR existant et au suivi public `57af28ae-7e01-442b-aa05-80261425df87`. Les limites des palettes et les preuves doivent rester attachées à la livraison TEST.
