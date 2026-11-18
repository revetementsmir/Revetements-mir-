# Inspiration MIR — galerie anthracite

Branche : `codex/inspiration-anthracite-20261118`.

Base vérifiée sur GitHub : `a045c7cfa365581f4db1624897764d696fb3e92e`, tête de `codex/particuliers-pc-finition-20261118`. Le nouvel écran utilise le shell public existant et ajoute seulement sa route aux listes d’activation du shell et de la langue. L’accueil, ses images, les styles partagés, les espaces employés et les moteurs métier restent inchangés. Sur Particuliers, seule la première action devient un lien vers la galerie.

## Composition et images

La référence est la maquette 10 anthracite jointe à la demande : titre éditorial, sept onglets, quatre photographies horizontales en deux colonnes, légendes courtes et pied de page compact. « Contemporain moderne » est sélectionné à l’ouverture. Aucun identifiant de maquette ni mention de proposition n’est affiché.

Les 28 illustrations originales sont générées séparément, puis optimisées en WebP, avec une variante de galerie (960 px) et une grande image (1600 px). Les photographies verrouillées de l’accueil et de Particuliers n’ont pas été réutilisées dans la galerie : leur cadrage ne convenait pas aux cartes panoramiques. Les sources PNG de génération sont conservées hors dépôt, dans `/workspace/mir-inspiration-originals`. Le manifeste versionné contient les prompts, les légendes, les dimensions et les empreintes SHA-256 des fichiers livrés.

Le chargement initial vise les quatre illustrations contemporaines. Les autres styles sont chargés à leur sélection, les grandes images à leur ouverture. La mention « Images d’inspiration · Illustrations » évite toute présentation comme réalisation réelle de MIR.

Contrastes calculés sur le fond `#242522` : crème `#f4f1ea` 13,66:1 ; sable `#bda889` 6,70:1 ; texte secondaire `#c6c3ba` 8,74:1.

## Vérification

Résultat final : **25/25 groupes Chromium réussis**, 37 captures après modification et 8 captures de référence. Les 42 états PC (sept styles × trois tailles × deux langues) conservent les quatre images visibles ensemble. Les sept groupes de contrats de langue existants passent également.

Les résultats détaillés sont enregistrés dans `qa/after-results.json`. La recette couvre les sept styles, les 28 images et leurs grandes variantes, les commandes clavier, les erreurs et réessais, la langue, les trois formats PC demandés, le téléphone, la tablette et le reflow équivalent à 200 %. Aucune erreur JavaScript, console ou HTTP inattendue ; le seul 503 est injecté localement pour vérifier l’état d’erreur et le réessai.

Les comparaisons de l’accueil utilisent des captures réelles de la base Git. La comparaison de Particuliers autorise uniquement les pixels de la première action raccordée à Inspiration. Les anciens tests historiques qui figent l’état « Bientôt » ne sont ni modifiés ni désactivés ; le test de ce lot vérifie le nouveau comportement demandé.

Comparaison finale : zéro pixel différent pour l’accueil en FR/EN à 1440×900 et 390×844 ; zéro pixel différent sur Particuliers hors de la zone exacte de sa première action. Les dimensions de cette zone et les photos originales sont inchangées.

Les contrôles sont réalisés dans Chromium avec des tailles de viewport et des capacités tactiles simulées. Ils ne constituent pas un essai sur un téléphone Android physique ni un essai du bouton natif « Version pour ordinateur ». Le viewport 980 CSS px vérifie la composition de bureau couramment utilisée dans ce mode.

Tous les tests de parcours sont locaux et bloquent les transports externes et les écritures. L’aperçu utilise le build TEST existant et ses protections ; la vérification de sa publication est consignée séparément après le commit.

Reproduction avec Node, Playwright, pngjs et Chromium installés :

```sh
MIR_INSPIRATION_PHASE=before node tests/mir-inspiration-browser.cjs
MIR_INSPIRATION_PHASE=after node tests/mir-inspiration-browser.cjs
node tests/mir-client-i18n.cjs
node scripts/build-prestige-preview.cjs
node tests/mir-inspiration-preview.cjs
```

Le dernier contrôle examine l’artefact généré sous son véritable chemin `/test/`, le raccordement depuis Particuliers, les sept styles, l’agrandissement, la langue et les blocages de transport. Il écrit par défaut dans `/tmp/mir-inspiration-preview-proof`, hors dépôt, afin d’enregistrer le SHA exact déjà commité sans modifier le commit vérifié. Le build existant régénère aussi l’archive des anciennes captures Prestige ; cette régénération ne fait pas partie des changements à versionner dans ce lot.

## Captures PC

- [Farmhouse contemporain](qa/after-style-farmhouse-1440x900.png)
- [Contemporain moderne](qa/after-style-contemporain-1440x900.png)
- [Scandinave / Nordique](qa/after-style-nordique-1440x900.png)
- [Chalet moderne / Rustique chic](qa/after-style-chalet-1440x900.png)
- [Craftsman contemporain](qa/after-style-craftsman-1440x900.png)
- [Mid-Century Modern](qa/after-style-mid-century-1440x900.png)
- [Québécois traditionnel revisité](qa/after-style-quebecois-1440x900.png)

## Méthodes consultées

MOON 1.3.11, BOSS GOD MODE et les méthodes Designer d’interface, Ergonomie/accessibilité et Harmonisation visuelle ont été chargés réellement depuis Atelier. Une méthode SEO a également été consultée pour préserver le caractère TEST non indexé. Les identifiants et la base de travail sont consignés dans `context.json`. La tâche Atelier existante est `3bc59032-9d23-463d-8ba1-f5e91fcac3a4` ; aucun doublon n’est créé.
