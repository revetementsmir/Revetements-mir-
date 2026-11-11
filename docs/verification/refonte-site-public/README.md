# Refonte publique MIR — aperçu à valider

## Périmètre

Aperçu privé et navigable du parcours **Boutique → Fiche produit → Panier**. Il ne remplace pas encore les pages publiques et ne contacte aucun service externe.

Révision de départ : Phase 3C `c0b12ffbcbb5c00f493d1459e1e2de7b5a8d039a`, avec `main` `482c17541066ff1d92a02aade6ed71b24f77fb5e` intégré pour préserver les ajouts récents du catalogue.

## Décision proposée pour la navigation mobile

Conserver les cinq destinations prévues par la section 11 du consolidé : **Accueil, Boutique, Pliage, Commandes, Compte**. Le **Panier** reste une action permanente et comptée dans l’en-tête compact.

Cette solution évite de cacher Accueil, Commandes et Compte sous « Plus », tout en laissant le panier visible pendant tout le parcours. Elle attend la validation de Frederick avant généralisation.

## Données affichées

L’aperçu réutilise uniquement la fiche approuvée `beck-panelfast-ags100` : format 1½ po, prix MIR de 515,99 $ CA par boîte avant taxes, boîte de 12 bobines (3 000 clous) et photo fournie par MIR.

## Vérifications exécutées

- navigation Boutique → Produit → Panier;
- recherche dans l’aperçu;
- format unique présélectionné;
- quantité et personnalisation conservées après l’ajout;
- compteur du panier et sous-total mis à jour;
- rendus Chromium à 390 × 844, 768 × 1024 et 1440 × 900;
- aperçu autonome : styles, scripts et photo intégrés, aucune API, stockage, connexion de compte ou dépendance réseau.

Les captures `avant/` documentent l’interface existante; les captures `apres/` documentent la proposition. L’émulation Chromium ne remplace pas une vérification sur appareils physiques.

## Validation de la navigation et généralisation

Frederick a validé les cinq destinations mobiles le 11 novembre 2026 : **Accueil, Boutique, Pliage, Commandes, Compte**. Le panier reste visible avec compteur dans l’en-tête. Les liens secondaires **Réalisations, Aide et Contact** sont regroupés dans « Plus » sur téléphone/tablette et restent visibles dans l’en-tête sur ordinateur.

La navigation commune est appliquée à Accueil, Boutique, Produit, Panier, Matériaux, Pliage, Studio, Réalisations, Contact et Estimation. Le configurateur de pliage client réutilise le même contrôleur sans modifier son moteur. Les modules Harmony/Admin et les fonctions 3A/3B/3C restent exclus de la transformation visuelle.

Terminologie retenue : **Panier** pour la sélection de produits et **Demander une estimation** pour l’action d’envoi. Les anciens raccourcis « Ma demande » de Boutique, Produit et Panier ont été harmonisés.

Preuve navigateur finale : `final/browser-results.json`, 33 rendus Chromium et 168 contrôles réussis sur 390×844, 768×1024 et 1440×900. Les contrôles couvrent les cinq destinations, le panier d’en-tête, Réalisations/Aide/Contact, l’absence de débordement horizontal, les cibles d’au moins 44 px, l’absence d’erreur JavaScript observée, la présélection du format BECK unique et l’ajout au panier avec compteur.

## Limites

- maquette fonctionnelle privée, pas une publication;
- une seule fiche réelle est incluse pour valider la hiérarchie et le parcours;
- les autres pages, le compte, l’aide et l’envoi d’estimation ne sont volontairement pas généralisés avant validation;
- aucun classement, indexation ou visibilité IA n’est revendiqué; l’aperçu reste `noindex`.
