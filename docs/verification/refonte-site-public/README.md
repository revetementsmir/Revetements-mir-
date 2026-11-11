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

## Limites

- maquette fonctionnelle privée, pas une publication;
- une seule fiche réelle est incluse pour valider la hiérarchie et le parcours;
- les autres pages, le compte, l’aide et l’envoi d’estimation ne sont volontairement pas généralisés avant validation;
- aucun classement, indexation ou visibilité IA n’est revendiqué; l’aperçu reste `noindex`.
