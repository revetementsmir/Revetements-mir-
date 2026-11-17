# MIR — Refonte du parcours client

Branche de travail : `codex/client-prestige-20261117`, depuis `e9bd39bc5dd4c40663c56bfc21759c543ab4e8d9`. Travail isolé du checkout existant et des travaux employés/PDF→3D. Aucune publication en production.

## Écrans réalisés

| Page ou état réel | Présentation et fonctions conservées |
| --- | --- |
| Accueil | Photo d’origine inchangée, anthracite/pierre/champagne, entrées maison et chantiers, aucune barre inférieure |
| Boutique | Catalogue réel, catégories, recherche, filtres, fabricants, couleurs et favoris secondaires |
| Fiche produit | Photos uniformes, options, quantité, unités et prix disponibles |
| Panier | Matériaux et pièces sur mesure, options, dimensions, quantités, prix et compteur commun |
| Estimation | Formulaire existant, résumé mixte, documents, validation, action Envoyer la demande |
| Confirmation | Rendu existant vérifié uniquement avec état local simulé, aucun envoi |
| Pliages | Profils et dessins, cotes/lettres, finitions, quantités et ajout de plusieurs pièces |
| Configurateur | Profils et panneaux client seulement; moteurs géométriques conservés |
| Studio | État public en construction, outils actuels sur TEST et ancienne démo distingués |
| Pour ma maison / Pour mes chantiers | Deux entrées concrètes vers les outils existants |
| Connexion / inscription | Formulaires existants harmonisés; inscription et Google restent désactivés |
| Compte / commandes | Aperçu, adresses et suivi disponibles; captures connectées simulées |
| Aide | Nouvelle page publique avec recherche et questions fréquentes, sans connexion |
| Contact / réalisations / matériaux | Vrais contenus, coordonnées, galerie et documents existants |

En-tête commun : logo officiel, recherche, panier, langues, avatar à droite. Navigation de bureau avec page active; barre inférieure conservée sur téléphone et tablette hors accueil. Police locale DM Sans et accent italique. Photos et catalogue sources préservés.

## Vérifications

Les rapports et scripts de recette sont joints au dossier. La matrice principale compte 75 vérifications réussies, complétées par 11 contrôles de protection de l’aperçu et le test i18n sur 8 formats. Elle couvre 1440 × 1200, 834 × 1112 et 390 × 844; les outils sont également vérifiés à 768 et 1024 pixels. Les requêtes externes sont interceptées avant transfert pendant les tests. Les comptes utilisent uniquement une fixture SDK locale.

- Recherche, catégories, fabricants, options et ajout de produit au panier.
- Modification des quantités, rechargement, panier mixte et compteur entre pages.
- Prix existant BECK : 2 boîtes à 515,99 $ donnent 1 031,98 $, 3 donnent 1 547,97 $. Aucune conversion de prix supposée.
- Deux pliages avec mesures, faces, finitions et quantités distinctes retrouvés dans le panier.
- Ouverture et validation du formulaire d’estimation; aucune demande réelle envoyée.
- FR par défaut, langue conservée, retour FR, valeurs des unités et stockage inchangés par traduction.
- Navigation/clavier, aide publique, galerie et documents; absence de débordement aux formats testés.
- Exclusion des interfaces employés, Boss, Adjointe, Entrepôt/Livraison, Chef d’équipe et invitations.
- Tests existants des quantités, du compte, de l’i18n et de la séparation Studio public/TEST.

## Aperçu et captures

`node scripts/build-prestige-preview.cjs` produit `.prestige-preview/test/`. Le site utilise le vrai code et les vrais fichiers du projet. La protection de cet aperçu bloque les services externes et conserve les données locales dans l’espace TEST; connexion et envois y sont désactivés. La galerie `prestige-captures.html` présente des captures de navigateur, avec un lien vers chaque page. Les comptes, commandes et confirmations simulés sont explicitement étiquetés.

Voir [GALLERY.md](GALLERY.md) pour régénérer la galerie et l’archive. Le HTML autonome est une galerie d’images consultable hors ligne, pas une simulation des fonctions serveur.

## Limites honnêtes

- Aucune connexion réelle, réception serveur d’estimation, livraison de courriel ou activation de paiement/Google certifiée dans ce lot.
- Le compte existant propose les commandes; aucun historique serveur d’estimations nouveau n’a été inventé.
- Le moteur PDF→3D et sa branche de développement sont préservés. La refonte ne certifie pas de nouvelles capacités de conversion.
- Tests Chromium avec tailles de fenêtres et interactions tactiles émulées; pas de certification sur appareils physiques ni Safari.
- L’anglais couvre la présentation client et les textes de catalogue traduits. Les marques, codes, couleurs officielles, données saisies et fichiers PDF fabricant restent dans leur langue source. Les services désactivés et chaque document externe ne sont pas certifiés bilingues. Audit navigateur des textes visibles sur 20 routes, puis contrôles dédiés des panneaux et des étapes du pliage; les 128 fiches et tous leurs états n’ont pas été ouverts individuellement.
- Le transfert de proposition Atelier a été préparé, mais le helper officiel redirige vers une connexion (HTTP 303). Aucun fichier n’a été transféré ni aucune proposition annoncée comme publiée dans Atelier.

## Reproduction

```sh
node --test tests/mir-client-i18n.cjs tests/mir-commerce-quantity.cjs tests/mir-account-flow.cjs tests/mir-studio-public-stage.cjs
node tests/mir-prestige-browser.cjs
node scripts/export-prestige-gallery.cjs --manifest docs/verification/prestige-20261117/captures-gallery-manifest.json --archive
node scripts/build-prestige-preview.cjs
```

La recette navigateur exige Playwright et Chromium, puis sert les fichiers statiques localement. Elle ne doit jamais être modifiée pour envoyer une demande réelle.
