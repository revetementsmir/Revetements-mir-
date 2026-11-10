# Audit des prix régionaux — Boutique MIR

Date du relevé : 9 novembre 2026 (heure de Québec)  
Région : Québec et Charlesbourg  
Règle approuvée : moyenne de prix publics comparables, avant taxes, puis majoration de 15 %.

## Résultat

- 118 références du catalogue examinées.
- 40 références déjà exclues de la boutique publique par la liste de visibilité courante.
- 78 références visibles examinées.
- 15 références ou familles disposent d'un prix MIR calculé et traçable.
- 57 références demeurent « Prix sur demande » : unité MIR non confirmée, produit professionnel sans prix public comparable, produit sur mesure ou moins de deux repères crédibles.
- 6 références de bardeaux sont des visualisations seulement et ne sont pas vendables.

Le fichier `dist/mir-regional-pricing-20261110.json` contient les moyennes, les prix MIR, les unités, la date et les sources de chaque prix publié. Les montants ont été arrondis au cent après application de la formule `moyenne × 1,15`.

## Prix publiables

| Référence | Unité | Moyenne régionale | Prix MIR (+15 %) |
|---|---:|---:|---:|
| HardiePlank Select Cedarmill 6,25 po | pièce 12 pi | 15,72 $ | 18,07 $ |
| HardiePlank Select Cedarmill 8,25 po | pièce 12 pi | 15,76 $ | 18,12 $ |
| HardiePanel Lisse 4 × 8 | panneau | 105,51 $ | 121,34 $ |
| HardiePanel Lisse 4 × 10 | panneau | 118,40 $ | 136,16 $ |
| HardiePanel Cedarmill 4 × 8 | panneau | 90,58 $ | 104,16 $ |
| HardiePanel Cedarmill 4 × 10 | panneau | 115,60 $ | 132,94 $ |
| HardieShingle rives droites | pièce | 25,54 $ | 29,37 $ |
| HardieShingle rives décalées | pièce | 21,96 $ | 25,25 $ |
| CanExel Ridgewood D-5 | paquet de 4 | 141,48 $ | 162,70 $ |
| CanExel VStyle | paquet de 4 | 153,98 $ | 177,07 $ |
| Rialux Bosco | pi² | 4,40 $ | 5,06 $ |
| Rialux Timberland | pi² | 7,20 $ | 8,28 $ |
| Rialux Tiago | pi² | 7,22 $ | 8,30 $ |
| JDP Äkta | pi² | 7,21 $ | 8,29 $ |
| JDP Bluhouss | pi² | 7,74 $ | 8,90 $ |
| ADSEAL 4580 | cartouche 304 ml | 9,73 $ | 11,19 $ |
| Retouche CanExel | contenant 284 ml | 32,42 $ | 37,28 $ |

Une « référence » peut comporter plusieurs prix de format; c'est pourquoi le tableau compte 17 lignes de prix pour 15 références.

## Protections commerciales

- Aucun prix installé n'est mélangé à un prix de matériau.
- Les taxes et la livraison ne sont pas incluses.
- Les liquidations, produits de grade B et formats incompatibles sont exclus de la moyenne.
- Une couleur spéciale ou RAL reste sur soumission.
- Un produit sur mesure ne reçoit aucun prix fixe sans dimensions.
- Les prix à repère public unique sont identifiés dans les données et doivent être revérifiés avant une commande importante.
- Les prix restent affichés comme indicatifs jusqu'à confirmation du stock et de l'unité livrable MIR.

## Sources principales

Les sources détaillées par référence sont conservées dans le fichier de données. Les principaux vendeurs et comparateurs consultés sont Home Depot Canada, RONA, Patrick Morin, Matériaux Audet, Matério, Gagnon, BMR, Aluminium B. Bouchard, DeckMart, Revêtement Canada et Bâtir à Rabais.

## Vérifications

- JSON valide.
- 15 références tarifées présentes dans le catalogue courant.
- Toutes les formules `moyenne × 1,15` correspondent au montant publié, à un cent près.
- Syntaxe JavaScript de `dist/commerce.js` valide.
- Audit statique boutique existant : réussi, 118 références et exclusions contrôlées.
- Vérification navigateur locale non exécutée : Chromium est bloqué dans le conteneur courant par une interdiction de création de socket. Aucun succès navigateur n'est revendiqué pour cette révision.
