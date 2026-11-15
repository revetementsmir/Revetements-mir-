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
| PDF de sélection | mir-selection-pdf.js et mir-dossier-pdf.js | Texte et fichier en deux langues, dates selon la langue, chiffres sans changement | Ouvrir et inspecter les PDF complets en sortie réelle |
| PDF, aperçu, impression | annotated-pdf.js, mir-panel-po-pdf.js, mir-unified-client-dossier.js | Inventoriés, inchangés | Chacun en FR et EN et vérification géométrique |
| Courriels client | mir-estimate-presentation.js et dépendance Edge | Inventaire, aucun transport modifié | Modèles EN, rendu fictif, parité Edge, zéro envoi réel |
| Aide / compte / Auth client | mir-help-center.js, portal-client.js, chantier.html | Liens publics inventoriés, modes métier exclus | Client seul, sans modification des 5 espaces métier |

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

Les cinq espaces métier, sessions Auth, commandes, punch, géométrie, Supabase et APK restent hors lot. Le configurateur partagé est traduit exclusivement pour mode=client et jamais source=store. Ne pas traduire noms de marque, SKU, références officielles, couleurs fabricant non validées, adresses ou notes saisies. Ne pas modifier les objets du panier ou calculs. Conserver noindex,nofollow et ne pas créer hreflang sans politique de routes stable. Aucun paiement, Gmail, Google, Supabase prod, distribution APK ou recette physique Samsung.

## Vérifications de ce lot

Tests ajoutés : contrats Node du dictionnaire, nombres CAD, exclusion staff, FR/EN du PDF, invariants produits; Chromium réel à 360/390/430/768/834/1024/1440 en preview, langue persistée, panier et champ non modifiés, captures avant/après, aucun EN sur URL publique; garde CI de fichiers métier. Les résultats et éventuels échecs CI se jugent uniquement sur la tête GitHub finale.

La couverture complète de tous les parcours FR-CA / EN-CA, documents PDF inspectés dans les deux langues, exports, courriels fictifs et revue humaine des restes FR sont encore requises avant autorisation distincte de fusion et publication.
