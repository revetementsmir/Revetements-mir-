# Recette boutique et couleurs — résultat validé

**70 scénarios validés, aucun échec applicatif restant.** Résultat consolidé: [results-validated.json](results-validated.json). Les reprises ciblées et les résultats bruts restent disponibles pour distinguer les corrections du harness des corrections de l’application.

Le navigateur Chromium a réellement parcouru les pages à 1440×1000,834×1112 et 390×844. Une vérification additionnelle des noms de couleur et du débordement passe à 350×780. Les profils tablette/téléphone simulent le tactile; aucun appareil physique ni Safari/iOS n’a été testé.

| Vérification | Résultat |
| --- | --- |
| Six miniatures de catégories | Images chargées, cadres uniformes, proportions préservées; la catégorie vinyle utilise bien `gentek-vinyl-9.jpg`. |
| Palettes de cartes et fiches | IDs compatibles comparés au dataset gelé; toutes les options sont présentes sans +N ni groupe fermé; groupes opaque/deux tons et noms accessibles. |
| Échantillons des 16 profils publics | Même nœud SVG, mêmes sources, masque, chemins, cadrage et dimensions entre deux couleurs. Changement réel de 29,21 % à 99,82 % des pixels de la zone capturée. |
| Deux tons | Sierra conserve une variation réelle de luminance; preuve par image et distribution de pixels. |
| Persistance | Carte→URL, rechargement, FR→EN→FR, ajout au panier et rechargement du panier passent pour CanExel, Hardie et St-Laurent aux 3 largeurs. Les valeurs métier des unités restent intactes. |
| Produits retirés | Hardie 7¼ absent des collections et inaccessible à l’ajout direct. Les URL 5¼ hypothétiques sont indisponibles; aucun tel article n’existait dans le catalogue brut. |
| Ancien panier | Articles retirés clairement signalés, estimation désactivée; l’API locale de préparation rejette également le panier. Export JSON vide pour ces articles. Aucune soumission effectuée. |
| Retouches | 20 couleurs CanExel conservées, pixels du pot blanc/noir différents, canevas 600×600; les 4 anciennes couleurs utilisent la vraie photo du contenant avec indication «teinte non représentée». Le kit Hardie conserve sa référence existante et sa photo. |
| Responsive et anglais | Aucun débordement, aucune exception JavaScript; échantillon visible pendant le choix de couleur, noms non tronqués à 350px. «Colour» et «packs» apparaissent en anglais avec les valeurs métier conservées. |

## Captures à utiliser pour juger les écrans

Les captures de **viewport réel** évitent les positions trompeuses des éléments sticky dans une longue capture intégrale:

- [Ridgewood — PC, haut de page](final-verification/canexel-ridgewood-d5-1440-fr-viewport-top.png)
- [Ridgewood — tablette, couleur choisie](final-verification/canexel-ridgewood-d5-834-fr-viewport-colour.png)
- [Ridgewood — téléphone, haut de page](final-verification/canexel-ridgewood-d5-390-fr-viewport-top.png)
- [Ridgewood — téléphone, choix de couleur](final-verification/canexel-ridgewood-d5-390-fr-viewport-colour.png)
- [Hardie — téléphone, couleur choisie](final-verification/hardieplank-select-625-390-fr-viewport-colour.png)
- [St-Laurent — téléphone, couleur choisie](final-verification/st-laurent-lap-625-390-fr-viewport-colour.png)
- [Miniatures finales — PC](final-categories/categories-1440.png)
- [Miniatures finales — téléphone](final-categories/categories-390.png)

Chaque représentant existe dans `final-verification/` en FR et EN, aux 3 largeurs, avec vue de début de page et vue pendant la sélection. Les images de comparaison couleur A/B et de Sierra deux tons se trouvent dans `final/`. Les cartes et pots recertifiés après l’ajustement de hauteur des noms se trouvent dans `final-recheck/`.

## Reprises et confinement

Le premier passage final a réussi 64 scénarios. Les 3 échecs étaient la même attente de texte du harness («indisponible» remplacé par «retiré»). La reprise a confirmé que Playwright refuse aussi correctement de cliquer un lien `aria-disabled=true`; le test vérifie désormais l’état désactivé puis appelle l’API locale de préparation pour vérifier le second verrou. Les 3 cas de panier passent dans `final-verification/results.json`.

Après un ajustement CSS de hauteur des noms longs, les cartes et pots ont été recertifiés aux 3 largeurs. Après la correction factuelle de la photo vinyle, les 6 contrôles de catégories/erreurs JS ont été recertifiés dans `final-categories/results.json`. Les sources sont restées stables pendant chaque reprise; les empreintes finales sont dans le résultat consolidé.

Le serveur local n’accepte que GET et HEAD. Toutes les origines externes sont interceptées et bloquées. L’application a tenté 142 appels POST vers sa fonction RPC publique de tarification; ils ont tous été annulés avant tout appel externe. 17 317 lectures locales, zéro autre méthode locale autorisée, zéro envoi de demande, courriel, paiement ou écriture Supabase.

Les rendus écran restent indicatifs: ces tests ne certifient ni la colorimétrie d’un écran physique, ni le stock MIR, ni chaque fini disponible à la commande. La vérification des sources de palettes est documentée séparément par l’inventaire. Hardie Board & Batten était déjà masqué et le reste.
