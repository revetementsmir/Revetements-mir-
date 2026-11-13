# Phase 10 — Dix modèles de pliage

Base certifiée : `fbea7077fa24dfc5a2784166e54ec359e19bf7fc`
Branche : `codex/phase-10-ten-bend-models`

## Inventaire avant

- 11 variantes déclarées dans `mir-bending-presets.js`;
- 9 topologies sources dans `mir-calepinage-extension.js`;
- `beam_replis` et `solin_brique_goutte` comptés à tort comme variantes nominales;
- quatre décisions géométriques manquantes dans la passation;
- générateur PDF susceptible de répéter dessin, matière et quantité sur une page « Suite ».

## Inventaire canonique après décisions de Frederick

| ID stable | Nom | Source | Segments | Plis | Cotes demandées ou fixes | Contraintes | Boutique | Magasin | Production |
|---|---|---|---:|---:|---|---|---|---|---|
| `fascia` | Fascia | §14.1 + décision Frederick | 3 | 2 | face personnalisable; bas 1 1/4 et retour 3/4 po fixes | retour écrasé | oui | oui | oui |
| `ailes_fenetre` | Ailes de fenêtre | §14.2 + croquis 97904 | 3 | 2 | trois cotes obligatoires, vides | vertical, bas à droite, retour terminal | oui | oui | oui |
| `eloignement_eaux` | Écoulement des eaux | §14.3 + croquis 97906 | 3 | 2 | trois cotes obligatoires, vides | vertical, bas à gauche, retour descendant | oui | oui | oui |
| `goutte_eau_8` | Goutte d’eau — développé total 8 po | §14.4 + croquis 97902 | 3 | 2 | trois cotes obligatoires, vides | vertical, portée à gauche, retour descendant; somme exactement 8 po | oui | oui | oui |
| `sill_trim` | Sill Trim | §14.5 | 3 | 2 | 2 1/2, 1 1/2, 3/4 po | zone de clouage minimale 1 po | oui | oui | oui |
| `beam` | Habillage de poutre — Beam | §14.6 | 5 | 4 | 1 1/4, 7 1/2, 6 1/8, 7 1/2, 1 1/4 po | replis 5/8 facultatifs, non nominaux | oui | oui | oui |
| `colonne` | Habillage de colonne | §14.7 | 5 | 4 | 7/8, 7 1/8, 7 1/8, 1, 1 po | 7/8 et deux plis 1 po fixes; faces centrales personnalisables | oui | oui | oui |
| `l_transition` | L de transition verticale pour panneau | §14.8 | 3 | 2 | 2 3/8, 7/8, 3/4 po, fixes | retour écrasé | oui | oui | oui |
| `capage_climatiseur` | Capage d’air climatisé | §14.9 | 7 | 6 | 1/2, 1, 3, 4, 3, 1, 1/2 po | retours et doubles plis distincts | oui | oui | oui |
| `ventilation_mur_fenetre` | Ventilation — haut de mur et bas de fenêtre | §14.10 | 4 | 3 | 2, 1 1/2, 1 1/2, 1 1/4 po, fixes | jumelage anti-rongeur à confirmer au traitement | oui | oui | oui |

`beam_replis` reste une variante de `beam`. `solin_brique_goutte` reste une variante de `solin_brique`. Solin brique, Coins architecturaux, Coin avec J, Oméga et les formes L/J/Z restent dans le moteur générique et ne sont pas comptés dans les dix modèles Phase 10.

## Contrats livrés

- version et identifiant stables sur chaque modèle;
- cotes absentes réellement obligatoires, sans quantité implicite;
- fractions de pouce conservées;
- invariant de développé 8 po pour la Goutte d’eau;
- règle historique Coin avec J préservée : clouage = retour + 1 1/4 po, correction explicite ou exception historisée;
- segment le plus long choisi automatiquement pour le repère de face;
- étoile et halo vert du bon côté; Face 1 et Face 2 conservent la même géométrie;
- lettres et cotes issues du moteur commun;
- instantanés immuables et révisions séparées;
- un profil unique produit une page PDF complète; une continuation éventuelle ne répète ni dessin, ni matière, ni quantité, ni longueur.

## Preuves locales

- `node tests/mir-phase10-bending.cjs` : 11/11;
- `node tests/mir-pages-regressions.cjs` : 45/45;
- `node tests/mir-client-bend-tariff-browser.cjs` : 4 formats;
- `node tests/mir-phase10-bending-browser.cjs` : 7 formats, 10 modèles, thèmes sombre/Grand/contraste, aucune erreur JavaScript ni débordement;
- captures : les dix fichiers PNG du présent dossier;
- PDF réel : `MIR-phase10-4-profils.pdf`, quatre profils uniques et quatre pages.

## Persistance et serveur

Aucune migration Phase 10 n’est nécessaire : les modèles, versions, instantanés, révisions et commandes réutilisent les structures Phase 6. Aucun second configurateur, panier ou système serveur n’a été créé.

MIR TEST ne doit être utilisé qu’après réussite de toutes les non-régressions et des workflows de la PR. Supabase production `gccltmaulvrnthrbnrpd` est interdite.
