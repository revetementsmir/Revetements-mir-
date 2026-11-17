# Vérification FR/EN des palettes — 17 novembre 2026

Seul fichier applicatif modifié par cette sous-mission : `dist/mir-client-en-ca.js`.

- Huit fiches réelles vérifiées dans Chromium à 1440 × 1050 : CanExel Ridgewood, St-Laurent clin/V-Groove/Board & Batten, HardiePanel, HardiePlank lisse, pot CanExel actuel et ancien.
- Sections de détails et de sources ouvertes. Captures des notes en FR et EN pour chaque fiche; captures PC complètes EN pour les cinq cas principaux.
- Notes d’illustration complètes, disponibilité, texture et groupes traduits. Les neuf libellés du fichier `palette-i18n.json` sont couverts; les 390 notes des entrées couleur sont traduisibles.
- Cycle FR → EN → FR avec restauration exacte du texte. Noms fabricant et couleurs, valeurs d’options et panier conservés.
- « Couleur : » devient « Colour: ». L’option « paquets » affiche « packs » en EN et conserve la valeur canonique `paquets`, y compris après sélection.
- Zéro erreur JavaScript. Seuls les GET du serveur local `127.0.0.1:8765` sont autorisés; tous les appels externes et méthodes non GET sont bloqués. Aucune demande envoyée.
- Tests existants `node tests/mir-client-i18n.cjs` et `node tests/mir-client-i18n-static.cjs` réussis.

`verification.json` contient les textes exacts et les contrôles par fiche. `verify-browser.cjs` reproduit la recette dans cet environnement Cloud avec Chromium `/usr/bin/chromium` et le serveur local sur le port 8765.
