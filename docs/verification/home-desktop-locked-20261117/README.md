# Accueil PC MIR — référence verrouillée

## Décision de Frederick

Le 17 novembre 2026, Frederick demande de rétablir l’accueil PC **identique** à sa capture `98483.png`, puis le déclare verrouillé. Cette demande remplace, pour cet écran PC, la pagination et la compaction ajoutées pour imposer une hauteur de fenêtre.

La référence correspond à `dist/prestige-captures/93-accueil-1440.png` (1440 × 1200), agrandie en 1536 × 1280. Son code source est conservé dans `a2235c50466b0a21fecb7b1be8216dfd5006829c`.

À conserver : en-tête original sur une ligne; logo 166 px à la taille de référence; grande photo à gauche; titre blanc complet et « ici. » beige; parcours Maison/Chantiers à droite; trois cartes illustrées côte à côte sous le bloc principal. Aucune pagination de l’accueil PC, aucune seconde ligne de navigation, aucune réduction inventée des photographies ou espacements.

## Correction ciblée

- Sur `index.html` à partir de 1101 px, les styles de présentation paginée cessent de s’appliquer et les styles éditoriaux d’origine reprennent.
- La feuille `mir-home-desktop-locked.css`, chargée sur cet index seulement, rétablit les quatre règles d’en-tête modifiées et le contraste du titre.
- Les liens internes PC retrouvent leur comportement natif. Le passage sous le seuil réactive la présentation mobile existante.
- Les images, textes, routes, données, modèles de pliage et moteurs restent ceux du dépôt. Aucun autre écran n’est repris dans ce lot.

## Vérification

La recette `mir-home-desktop-locked` rend la vraie base historique et la nouvelle version aux mêmes dimensions, en français et en anglais. Elle compare la géométrie, les images, couleurs et contenus, conserve les captures et vérifie l’aller-retour mobile/PC. Le résultat n’est déclaré qu’après exécution sur le SHA publié et inspection des captures.

La recette générale antérieure reste distincte : CI4 `44165065357` a 76 cas réussis et quatre défauts connus sur d’autres écrans courts, laissés en pause. Elle n’avait pas détecté l’accueil dénaturé et ne constitue pas une validation de cette référence.

Publication autorisée : aperçu TEST protégé uniquement. SEO/GEO public : aucun changement d’indexation; protections, garde TEST et noindex conservés. Aucune publication de production, aucune écriture métier distante.
