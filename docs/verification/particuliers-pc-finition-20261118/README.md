# Vérification indépendante — Particuliers PC

Recette effectuée sur `codex/particuliers-pc-finition-20261118`, depuis `7c4e1fe`. L’accueil est comparé à la référence immuable `16cf0f8`. Le harnais ne modifie aucun fichier application ; ses seules écritures sont les preuves de test.

**Résultat consolidé : 21 groupes de contrôles validés.** Les 12 captures principales AVANT et les 12 APRÈS couvrent Maison et Accueil, en FR/EN, à 1280×800, 1440×900 et 1920×1080. Les sources Maison/CSS sont identiques aux octets capturés ; leurs empreintes figurent dans [source-sha256.json](source-sha256.json).

- Maison : les quatre choix, leurs sous-textes et l’introduction correspondent exactement aux textes validés ; tous sont visibles sans défilement PC dans les six vues. Aucun débordement horizontal. Le nom accessible du groupe et la description de photo sont contrôlés en français et en anglais.
- Clavier/pointeur : Tab atteint les quatre choix ; le focus est visible. L’inspiration porte « Bientôt » / « Coming soon », reste focalisable et ne navigue ni au clavier ni au clic. Les trois liens actifs présentent un changement au survol.
- Navigation réelle : boutique, Studio TEST local et estimation directe s’ouvrent dans les deux langues. Le choix de langue persiste entre pages, au retour et après rechargement, sans réinitialisation artificielle du stockage.
- Accueil : **0 pixel différent** dans chacune des six comparaisons, sans masque ni tolérance. Tous les fichiers effectivement chargés par l’accueil et ses deux photos source ont les mêmes SHA-256 qu’en `16cf0f8`. La photo Maison reste identique à celle de `7c4e1fe`.
- Agrandissement : les quatre actions restent focalisables, accessibles au défilement et atteignables, sans débordement horizontal, dans les six vues à reflow équivalent 200 %. Cette preuve emploie un viewport CSS divisé par deux et un DPR de 2 ; elle ne prétend pas reproduire un appareil physique ni une commande native de zoom du navigateur.

## Preuves et historique

[final-results.json](final-results.json) consolide les groupes par leur dernier résultat. [before-captures.json](before-captures.json) documente les baselines. [after-captures.json](after-captures.json) conserve honnêtement les 19 validations initiales et deux échecs du sélecteur de test : l’ancien sélecteur supposait un `href` commençant par `boutique.html`, alors que la navigation partagée le normalise en `/boutique.html?lang=…`. La correction du harnais utilise le rôle et le nom accessible exacts. [after-follow-up.json](after-follow-up.json) contient les deux parcours corrigés et les six contrôles de reflow, tous validés. Aucun code application n’a changé entre ces deux passages. Les captures principales APRÈS n’ont donc pas été rejouées inutilement.

Captures : `before-{maison|accueil}-{fr-CA|en-CA}-{largeur}x{hauteur}.png` et `after-{maison|accueil}-{fr-CA|en-CA}-{largeur}x{hauteur}.png`. Les images `after-maison-focus-*` complètent la vérification du focus ; les états de survol sont mesurés dans les résultats d’interaction. Les six images `after-maison-zoom200-*` documentent le reflow.

## Reproduire

Depuis la racine du dépôt, avec Playwright et Chromium `/usr/bin/chromium` :

```sh
MIR_PC_FINITION_PHASE=before node tests/mir-particuliers-pc-finition-browser.cjs
MIR_PC_FINITION_PHASE=after node tests/mir-particuliers-pc-finition-browser.cjs
MIR_PC_FINITION_PHASE=after MIR_PC_FINITION_CHECKS=navigation node tests/mir-particuliers-pc-finition-browser.cjs
```

Le harnais ouvre ses propres serveurs éphémères `127.0.0.1`. Les baselines sont servies directement depuis `git show` avec leurs dépendances, sans checkout ni remplacement des fichiers de travail. Pour conserver Git intact lors d’un passage post-commit, définir `MIR_PC_FINITION_OUT=/tmp/mir-pc-finition-proof` ; le dossier doit contenir les preuves AVANT, ou être créé par la première commande avec cette même option. `MIR_CHROMIUM_BIN` permet de préciser un autre chemin Chromium.

Toutes les requêtes externes et toutes les méthodes autres que GET sont bloquées avant réseau. Deux tentatives POST de récupération des prix boutique ont ainsi été interrompues dans le passage de navigation. Aucun formulaire soumis, aucune donnée réelle envoyée. Les douze captures principales de chaque passage n’ont relevé aucune erreur JavaScript de page.

## Limites présentes

Le contrôle existant `tests/mir-client-i18n.cjs` passe ses 7 groupes. Le harnais transversal `tests/mir-prestige-preview-security.cjs` reste à **10/11**, avec le même échec d'attente du bouton boutique `#product-add` sur cette version et sur la source immuable `7c4e1fe`. Les deux rapports sont conservés : [candidat](preview-security-after.json) et [source](preview-security-baseline.json). Aucune requête externe n'a franchi les protections. Aucun test existant n'a été désactivé ou modifié pour ce lot.

Le premier montage du contrôle transversal de référence avait omis les protections injectées au build ; son résultat de préparation est conservé séparément sous `preview-security-baseline-setup-error.*`. Le passage corrigé est celui cité ci-dessus. L'ancien harnais `mir-home-desktop-locked.cjs`, exigeant une autre baseline externe, n'a pas été exécuté jusqu'au bout ; la comparaison stricte à `16cf0f8` est assurée ici par le nouveau harnais ciblé.

L’estimation existante accepte uniquement `.pdf,application/pdf`, même si le texte d’entrée approuvé mentionne photos et plans. Ce comportement n’est pas modifié dans cette finition visuelle. Le bouton d’envoi reste désactivé sans saisie et aucun envoi n’a été essayé.

Le Studio de la source TEST locale initialise son moteur dans les deux langues ; cette recette n’atteste ni une importation PDF ni une nouvelle capacité de conversion 3D. Les interfaces d’équipe et les moteurs métier ne font pas partie des modifications de ce lot.
