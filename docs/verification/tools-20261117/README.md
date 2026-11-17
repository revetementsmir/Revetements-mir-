# MIR — Lame oscillante et scie-cloche

Lot du 17 novembre 2026, sur la branche `codex/client-prestige-20261117`. La base conservée est `b6e88df`. Le lot ajoute des articles au parcours client et au magasin TEST; il ne refait pas les interfaces internes.

## Réalisation

- `leiluo-oscillating-hcs-44mm` : lame oscillante LEILUO HCS pour bois/plastique, largeur 44 mm relevée sur la photo MIR. Aucune profondeur, fixation universelle, référence de coffret, quantité par emballage ou prix inventés.
- `dewalt-bimetal-hole-saws` : scie-cloche DEWALT ELITE bimétal, 15 diamètres documentés entre 2 et 5 po, fractions comprises. Chaque choix conserve le code fabricant et les mesures publiées en pouces et mm. Les anciennes références DAH1800 ne sont pas mélangées à cette gamme.
- Sélecteur « Diamètre » dans la fiche client, le panier, la revue magasin et l’écran terrain existant. Les outils sont classés dans les lames et consommables du magasin.
- Quantités entières en pièces. Un diamètre ne devient jamais une longueur ni une surface. Deux diamètres constituent deux références distinctes dans le panier.
- Traductions client FR/EN de ces fiches et sélecteurs. Changer de langue ne réécrit pas les unités, les identifiants ou les quantités enregistrées.

Les deux références permettent une demande d’estimation malgré l’absence du fichier photo original, grâce à une autorisation explicite limitée à ces deux identités vérifiées. Les références bloquées antérieures restent bloquées. La garde MAC est conservée.

## Sources et limites

Voir [le rapport fabricant](dewalt-sources.md) et [les données de recherche](dewalt-proposal.json). Les fiches DEWALT US ont été lues dans les résultats officiels indexés; l’ouverture directe de plusieurs pages échoue avec HTTP 403. Le relevé établit 15 références, pas l’exhaustivité mondiale ni la disponibilité de chaque format au Canada.

Prix, stock MIR et approvisionnement ne sont pas renseignés. Porte-scie compatible requis; contenu de l’emballage à confirmer, particulièrement pour 2¼ et 2½ po. Le prix d’un détaillant n’est pas un tarif MIR.

Les deux images sont visibles dans la conversation, mais leurs fichiers originaux ne sont pas accessibles dans le workspace. La seule photo DEWALT téléchargeable identifiée dans les sources appartient à l’ancienne gamme et n’a pas été substituée. Les fiches affichent explicitement l’absence de photo. Aucune image produit générée ou reconstituée n’a été utilisée.

## Vérifications

- 13 contrôles purs du modèle de diamètres et du catalogue : sélection obligatoire, valeurs invalides, pièces entières, clés distinctes, snapshots et références conservés, 129 anciennes références strictement inchangées.
- Tests de présentation commerce : non-régression des 129 références / 164 états de formats; droits d’ajout, dimensions, détails et options conservés. Cas négatifs des deux nouvelles gardes.
- 8 contrôles du lot antérieur : PRIME, trousse Hardie et vis MAC préservés.
- Audit quantités : 131 articles et 181 variantes; ancien rapport préservé, copie propre à ce lot dans `catalogue-quantity-audit.json`.
- Tests i18n statiques et unitaires; syntaxe JavaScript et `git diff --check`.
- Navigateur sur catalogue réel : 21 contrôles réussis aux largeurs 1440, 834 et 390 px; 27 captures viewport publiées dans la galerie. Aucun débordement ni erreur JavaScript. Galerie, filtres et décodage de toutes les images vérifiés aux trois largeurs (`qa-gallery.json`).
- Traduction du fallback sans couleur vérifiée, noms de couleurs réelles et panier préservés (`client-no-colour-language.json`).
- Détails navigateur : voir `qa-browser.json` pour les résultats réels sur le catalogue canonique et `client-format-browser.json` pour les essais isolés de changement de tarif (prix fictifs de recette uniquement, jamais dans le catalogue).

La revue magasin est un panier local d’essai. L’écran terrain est testé avec un snapshot local injecté par le test, sans authentification réelle. Son catalogue serveur en production n’a pas été modifié. Toutes les requêtes externes et méthodes autres que GET sont interceptées avant transmission. Aucun courriel, paiement, ordre, demande d’estimation ou commande réel n’est envoyé.

L’aperçu Vercel utilise `build-prestige-preview.cjs`, conserve la protection d’accès et désactive les requêtes externes/envois. La preuve de livraison précise la révision déployée et l’URL TEST. Aucun déploiement en production.
