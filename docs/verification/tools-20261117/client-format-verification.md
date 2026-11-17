# Formats des outils — vérification client

Le seul fichier applicatif modifié par cette sous-mission est `dist/commerce.js`. Les données produit, langues, moteur de quantités et interfaces employé sont intégrés par les autres membres de l’équipe.

## Résultat

- Le choix de diamètre utilise `formatAxis: "diameter"` et les valeurs publiées `diameterIn` / `diameterMm`. Aucune valeur n’est convertie en `lengthIn`; les deux unités publiées restent indépendantes.
- La carte montre une plage courte; le sélecteur contient les variantes exactes. Les faits techniques et le code fabricant suivent la variante sélectionnée.
- Le prix affiché est recalculé par l’API de présentation existante lors du changement de format. Aucun prix n’est ajouté au catalogue par cette modification.
- Le panier conserve l’identifiant et l’objet de format, son code fabricant, sa quantité et son unité. Le diamètre reste modifiable et persiste après rechargement.
- La lame affiche sa largeur de 44 mm, sans longueur ni conversion en pouces inventée.
- L’autorisation sans photo est limitée aux deux identifiants convenus et à leurs preuves explicites. Les autres références conservent leurs règles d’accès antérieures.

## Contrôles exécutés

`node tests/mir-client-tool-formats.cjs` : réussi. Séparation diamètre/longueur, valeurs métriques publiées, référence choisie, carte compacte avec 28 variantes de test, largeur 44 mm, absence de mutation du catalogue, garde des deux références et cas négatifs. Les 129 anciennes références et leurs 164 états de format sont comparés au commit `b6e88df` : dimensions, faits techniques, libellés, options et autorisations d’ajout identiques. Le test lit ce commit Git en local.

`node tests/mir-items-intake.cjs` : huit contrôles antérieurs réussis. Son extraction de la garde inclut désormais la fonction des deux outils; les assertions PRIME, kit Hardie et vis MAC restent présentes et inchangées.

`node tests/mir-client-tool-formats-browser.cjs` : réussi dans Chromium, largeurs 1440 et 390 px. Sélection obligatoire, deux variantes, référence et prix rafraîchis, ajout au panier, changement de diamètre dans le panier, rechargement, retour à la fiche et ajout d’une lame test. Aucun débordement horizontal ni erreur JavaScript. Résultats dans `client-format-browser.json`.

Cette recette navigateur utilise **des fixtures isolées**, avec deux prix fictifs pour vérifier leur actualisation. Ces valeurs ne sont ni des offres MIR ni des modifications du catalogue. Les captures des données produit réelles sont réalisées séparément par la recette générale du lot.

Seuls les GET du serveur local sont autorisés pendant le test navigateur; tous les appels externes et autres méthodes HTTP sont bloqués. Aucune demande, commande, écriture Supabase ou courriel n’est envoyé.
