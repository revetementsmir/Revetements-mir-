# Inspiration — recette indépendante finale

**25/25 groupes validés sur les fichiers finaux**, avec 8 captures AVANT et 37 APRÈS. Référence protégée : `a045c7c`. [Résultats détaillés](after-results.json), [synthèse](final-summary.json), [empreintes](source-sha256.json).

- Les sept styles possèdent chacun quatre illustrations distinctes. Les 56 fichiers réels — miniatures et grands formats — existent, se décodent et ont des empreintes distinctes dans chaque série. Le style initial est Contemporain moderne.
- **42 états PC** : sept styles × trois tailles (1280×800, 1440×900, 1920×1080) × FR/EN. Les quatre cartes complètes, leurs textes et les sept catégories sont visibles ensemble, sans débordement horizontal ni texte tronqué. Les légendes et textes alternatifs affichés concordent avec les données FR/EN.
- Sept captures de styles à 1440 px et sept à 1280 px permettent la revue des cadrages. Les sept vues 1280 ont été inspectées : maisons entières, toitures, marches d’entrée et légendes préservées. La mention « Images d’inspiration · Illustrations » et sa version anglaise sont présentes.
- À 390 et 768 px, en FR/EN, les événements tactiles natifs émulés ouvrent et referment **les 28 images dans chaque contexte, soit 112 ouvertures**. Toutes les catégories restent accessibles ; aucun débordement horizontal du document.
- À 980×1768, le mode de mise en page ordinateur garde deux colonnes et quatre images visibles, masque le menu mobile et la barre inférieure, et permet de changer réellement FR/EN.
- La visionneuse fonctionne avec ses boutons, Échap, les flèches et Home/End ; elle rend le focus à la carte d’origine. Le focus du fond reste inerte. Tab peut temporairement quitter le document pour l’interface native de Chromium, puis revenir au dialogue : aucune cible de la page de fond ne reçoit le focus.
- Le style sélectionné est conservé pendant les changements de langue. La langue persiste après rechargement. La catégorie est uniquement conservée en mémoire ; un rechargement retrouve volontairement Contemporain moderne.
- L’échec local volontaire d’une grande image produit un message visible et un bouton de réessai. Le réessai charge la vraie image, garde le focus utile et permet immédiatement la navigation au clavier.
- Reflow équivalent 200 % en FR/EN : les sept catégories et les quatre cartes restent accessibles.

**Pages protégées :** Accueil présente **0 pixel différent** dans les quatre vues FR/EN à 1440 et 390 px. Maison présente **0 pixel différent hors du rectangle exact du premier choix**, dont les dimensions sont inchangées ; seul son contenu et son activation sont autorisés. Le lien ouvre réellement Inspiration dans la langue choisie. Les feuilles de style existantes et les photos source protégées sont inchangées par SHA-256.

Aucune erreur JavaScript, aucune erreur console ou réponse HTTP ≥400 inattendue, aucune tentative externe ou non-GET. Le seul HTTP 503 et le message console correspondant sont injectés volontairement, reconnus par leur URL et leur statut exacts, puis conservés dans le rapport. Aucun formulaire ni service réel n’a été utilisé.

## Reproduction

```sh
MIR_INSPIRATION_PHASE=before node tests/mir-inspiration-browser.cjs
MIR_INSPIRATION_PHASE=after node tests/mir-inspiration-browser.cjs
```

Le harnais ouvre ses propres serveurs locaux éphémères, sert la référence directement depuis Git et bloque toute requête externe ou méthode autre que GET. `MIR_INSPIRATION_OUT=/tmp/mir-inspiration-proof` permet un passage sans écriture dans Git ; exécuter les deux phases avec le même dossier, ou y copier les huit baselines et `before-results.json`. `MIR_INSPIRATION_CHECKS=nom-du-groupe` permet une investigation ciblée ; la preuve finale ci-dessus provient d’un passage complet unique.

Les fichiers `pre-final-crop-*` conservent la découverte antérieure aux quatre ajustements de cadrage, ainsi que les corrections du harnais : attente de l’état image prêt et de sa peinture, reconnaissance de la sortie Tab native vers le navigateur, isolation des scénarios. `pre-footer-*` conserve le passage précédent déjà réussi, avant l’augmentation du pied de page mobile/tablette. Le rapport principal et toutes les captures APRÈS ont été remplacés par le dernier passage complet après ces ajustements. Aucun ancien test Particuliers n’a été modifié.

Limites de méthode : tailles et gestes tactiles émulés dans Chromium, sans certification sur appareil Android physique. Le contrôle 200 % utilise un viewport CSS 720×450 et un DPR de 2, équivalents au reflow d’un écran 1440×900 agrandi ; il ne revendique pas un test de zoom matériel. Aucun fichier application modifié par cette recette indépendante.
