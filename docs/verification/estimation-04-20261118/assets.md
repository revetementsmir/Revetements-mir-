# Estimation 04 — actifs photographiques

> Historique du premier lot. Les images Maison et Rénovation ont ensuite été remplacées à la demande de Frederick sur `codex/estimation-04-photos-20261118`. Leurs nouvelles provenances et empreintes figurent dans [le manifeste de remplacement](../estimation-04-photos-20261118/assets.json). Les descriptions et poids ci-dessous documentent la version initiale.

Date : 2026-11-18. Branche de travail isolée ; aucun fichier source de l’accueil, de Particuliers ou de la galerie Inspiration n’est modifié.

Les quatre cartes utilisent des illustrations architecturales. Aucun visuel ne constitue une preuve de réalisation MIR. Les images ne viennent pas d’un découpage de capture de maquette.

| Carte | Fichier livré | Dimensions | Poids | Cadrage CSS conseillé |
|---|---|---:|---:|---|
| Maison | `dist/assets/estimation-04/maison.webp` | 1280 × 720 | 272 276 octets | `40% 50%` |
| Chalet | `dist/assets/estimation-04/chalet.webp` | 1280 × 720 | 213 922 octets | `48% 60%` |
| Multilogement | `dist/assets/estimation-04/multilogement.webp` | 1100 × 880 | 287 354 octets | `55% 50%` |
| Rénovation | `dist/assets/estimation-04/renovation.webp` | 800 × 600 | 38 510 octets | `65% 50%` |

Total livré : **812 062 octets**. Maison, Chalet et Multilogement : conversion WebP qualité 86, méthode 6, redimensionnement proportionnel Lanczos seulement. Rénovation : copie binaire de l’actif WebP déjà optimisé, sans réencodage ni perte supplémentaire. Aucun crop n’est inscrit dans les fichiers ; les proportions restent celles des sources (aux arrondis de dimensions près).

## Provenance

### Maison

- Source existante : `dist/assets/mir-particuliers-maison-approuvee.webp`, 1672 × 941.
- Introduction documentée par le commit `7c4e1fe4860b465e9c2db6caeed99b7dec442dc5`.
- SHA-256 source inchangée : `89f112fbbbd43a3cf16bf113a37b80b3af9646929d5759e86dce321bf669da5b`.
- SHA-256 copie livrée : `13cd57fb6444270b0336f772913aa7170543e47a217af905232d87e3fa59124c`.
- Illustration approuvée : maison sombre, entrée bois, pignons et maçonnerie claire. La carte carrée souligne l’entrée et les pignons ; elle ne prétend pas montrer toute la largeur de la photographie d’origine.

### Chalet

- Source existante : `dist/assets/inspirations/chalet-01-large.webp`, 1600 × 900.
- Illustration originale générée pour le lot Inspiration du 2026-11-18 ; provenance détaillée et prompt dans `docs/verification/inspiration-20261118/images/manifest.json`.
- SHA-256 source inchangée : `a41f7a24d391700e628273039447ba87974b14952395f4f8fb7c0d0c4aba4d7e`.
- SHA-256 copie livrée : `e89e66af619d1450dd16e7f75eb92b2fdf76526f32411a7f49075997516c95ec`.
- Chalet à grand pignon vitré, pierre, bois et environnement boisé estival.

### Rénovation

- Source existante : `dist/assets/mir-home-card-revetement-20261105.webp`, 800 × 600.
- Introduction documentée par le commit `7383df413eb4f2b769ce5cdaee5acd53331d0f5c`.
- SHA-256 identique source et copie : `864478f53ca3857743bde67a9bf4678347c6e5e71d2b3e35ce7ec390fb3843c9`.
- Détail de parement anthracite texturé et encadrement sombre, sans attribution de produit ni fournisseur.

### Multilogement

- Une seule génération originale avec `image_gen`, le 2026-11-18.
- PNG original conservé hors dépôt : `/workspace/generated_images/exec-c78ed077-cbd4-462a-bcef-a7cc7f36e077.png`, 1402 × 1122.
- SHA-256 original : `5af78ac1f795eed9f31beb177ffc175ab9dd6d140946f6ed99e58b3b0fd43a9b`.
- SHA-256 copie livrée : `de99f05de9a3c0f26261b36e29b8770ed9371f16efd9c7f8b01dec6888fcff0a`.
- Trois niveaux hors sol visibles, quatre balcons répartis sur les deux niveaux supérieurs, garde-corps et accès visibles, paysage estival. Revue visuelle architecturale uniquement ; aucune validation technique de construction n’est affirmée.

Prompt réellement envoyé :

> Create ONE original photorealistic architectural photograph of a credible contemporary Quebec MULTI-UNIT RESIDENTIAL APARTMENT BUILDING, exactly THREE full ABOVE-GROUND STOREYS and clearly separate residential balconies on both upper levels. Almost square image composition, landscape 5:4 or square; show the ENTIRE building including roof edges, foundations, all balconies, front access and landscaped ground, comfortably inside the central 75 percent of the image width and central 70 percent of image height, leaving enough sky, trees, lawn and driveway margin for a square website card crop. A compact six-unit building, two apartments per floor, facade about 18 metres wide. Architecture: restrained warm anthracite horizontal cladding, narrow natural tan wood accent volumes, light grey stone at ground floor, flat parapet roof, black window frames. Clearly legible arrangement of 2 balconies on level 2 and 2 balconies on level 3, stacked directly above one another with structurally plausible vertical supports and complete safe black metal guardrails, no impossible floating balcony, each with a real patio door. Two quiet entry doors at ground level with short grounded concrete steps, coherent landings and a central paved approach. Street-level three-quarter front view with straight vertical lines and realistic moderate camera lens; summer Quebec maples, birches and spruce behind building, hydrangeas, grasses, clean asphalt driveway on right, landscaped residential setting. Neutral soft sunny daylight, premium architectural photography, real material textures and believable proportions, not a sterile computer model. No people, cars, signage, addresses, logos, words, watermark or collage. This is an architectural inspiration illustration, not a real construction by MIR. Do not imitate any copyrighted landmark or identifiable development. Make the image feel consistent with a refined charcoal, cream and champagne architectural website.

## Inspection réellement effectuée

- Les quatre sources ont été vues, puis les copies finales comparées dans des cadrages carrés et 4:5.
- Les quatre WebP finaux se décodent correctement et leurs dimensions sont vérifiées.
- Les originaux de Maison, Chalet et Rénovation conservent leurs SHA-256.
- Les positions conseillées ont été transmises à l’agent responsable de l’intégration.
- Le format carré ou légèrement paysage conserve le multilogement en entier. Un recadrage portrait 4:5 coupe un bord de façade : il n’est donc pas recommandé pour cette carte.
- Ces contrôles portent sur les fichiers et cadrages ; les captures du véritable écran et la recette des interactions appartiennent à la vérification de la page intégrée.
