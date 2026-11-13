# Courriels, fiches privées et PDF MIR — 9 novembre 2026

Base : `main` à jour, `466f3f170ed995ed9bdbd1124700b170195bc303`. Travail indépendant des migrations d’administration en attente. Aucune migration ni modification des droits ou secrets.

## Avant réellement reproduit

Les deux notifications et PDF de recette confirmés reçus ont été relus dans MIR TEST, puis conservés sans modification. Leurs empreintes ont été vérifiées à nouveau après les nouveaux envois.

| Exemple reçu | Constat | Avant exact | Après réellement envoyé |
|---|---|---|---|
| Dossier de pliage `7a5ad8cf…` | Petit dessin, repères réduits, cadre PDF supplémentaire, page raster sans texte sélectionnable | [PDF](before/bending.pdf) · [courriel texte scellé](before/bending-courriel.txt) | [PDF corrigé envoyé](after/received-bending.pdf) · [courriel HTML scellé](after/mail-bending.html) |
| Dossier complet `128ce443…` | En-têtes imbriqués, sélection JSON dans le courriel et la fiche, tableau réduit | [PDF](before/cart.pdf) · [courriel texte scellé](before/cart-courriel.txt) | [PDF corrigé envoyé](after/received-cart.pdf) · [courriel HTML scellé](after/mail-cart.html) |

Les captures de courriels ci-dessous sont des aperçus Chromium des contenus scellés. Ce ne sont pas des captures Gmail. Les anciens messages, uniquement en texte, sont présentés comme tels.

## Corrections

- Formateur métier commun au navigateur, à Edge et au repli Node. Références, fabricants, finis, formats, quantités, matériaux, longueurs et cotes lisibles ; données techniques toujours conservées dans le dossier immuable.
- Courriel HTML court, couleurs `#fafaf7`, `#18251d`, `#348511` de l’accueil, vrai logo dérivé du SVG officiel et embarqué en CID, version texte et bouton vers la fiche privée. Aucun document privé n’est rendu public.
- Un cadre par feuille : logo vectoriel officiel, titre, référence stable du dossier, date, pagination globale. Papier Lettre portrait 612 × 792 points.
- Tableau matériaux et une pièce cotée par page, avec A/B, angles, face peinte, matériau, fini, quantité et longueur. Les mentions de soumission et de validation atelier sont conservées.
- Texte sélectionnable, polices incorporées et dessins vectoriels. `pdfimages -list` ne trouve pas d’image raster dans le nouveau dossier. Le moteur des autres exports demeure inchangé.
- Le PDF du client n’est jamais réécrit. Les anciens dossiers soumis restent eux aussi intacts.

## Matrice et paires de captures

| Écran / état | 390 × 844 | 834 × 1112 | 1440 × 900 |
|---|---|---|---|
| Courriel, images visibles | [avant](before/courriel-390.png) / [après](after/courriel-390.png) | [avant](before/courriel-834.png) / [après](after/courriel-834.png) | [avant](before/courriel-1440.png) / [après](after/courriel-1440.png) |
| Fiche, même demande fictive | [avant](before/fiche-390.png) / [après](after/fiche-390.png) | [avant](before/fiche-834.png) / [après](after/fiche-834.png) | [avant](before/fiche-1440.png) / [après](after/fiche-1440.png) |
| Pliage, feuille 1 dans PDF.js | [avant](before/bending-page1-390.png) / [après](after/bending-page1-390.png) | [avant](before/bending-page1-834.png) / [après](after/bending-page1-834.png) | [avant](before/bending-page1-1440.png) / [après](after/bending-page1-1440.png) |
| Dossier complet, matériaux | [avant](before/cart-page1-390.png) / [après](after/cart-page1-390.png) | [avant](before/cart-page1-834.png) / [après](after/cart-page1-834.png) | [avant](before/cart-page1-1440.png) / [après](after/cart-page1-1440.png) |

[Images bloquées, 390 px](after/courriel-images-bloquees-390.png). Les paires ont la même taille de fenêtre ; le papier passe au portrait pour les nouveaux dossiers.

[Matrice PDF complète](pdf-matrix.json) : 36 vues, toutes les pages avant/après des deux dossiers et les six feuilles du [cas 14 articles + 4 pièces distinctes](after/multiple.pdf). Contrôle PDF.js des zones imprimables et extraction du texte par `pdftotext`. Contrôle visuel du logo, des cotes et des ruptures de pages sur chaque feuille rendue. Pas d’impression sur une imprimante physique.

Les paires de fiches utilisent une session simulée pour comparer exactement la même demande avant/après. Les [six ouvertures suivantes](private-real-ui.json) utilisent les nouveaux dossiers, Auth/API/Storage MIR TEST réels et un jeton QA restauré dans le navigateur. Le formulaire de connexion n’est pas rejoué. Les fichiers de la nouvelle interface sont servis localement sous l’origine officielle ; ce n’est pas un test du site publié.

## Recette réelle et essais simulés

[Résultats des deux envois réels](real-send.json) vers la boîte autorisée `frederickmessely@gmail.com` :

- Pliage : objet `[RECETTE MIR TEST] Demande d’estimation MIR — MIR-20261109-CBB9D4A4AC9246829A6545AE5600ACF4`.
- Dossier complet : objet `[RECETTE MIR TEST] Demande d’estimation MIR — MIR-20261109-32073033810E43A9BA34C993163F7308`.
- Deux acceptations Resend et deux fiches reçues. Destinataire confirmé dans les notifications scellées. PDF téléchargés identiques aux pièces soumises, vérification SHA-256.
- Nouvelle tentative avec chaque même clé : même reçu, aucun deuxième envoi. Les accès admin et adjointe QA fonctionnent ; visiteur, employé non autorisé et autre organisme sont refusés pour la fiche et le PDF.
- Le service MIR TEST était déjà activé avant ce travail ; ses réglages sont restés identiques. La production a été lue : `mir_estimates.settings.enabled=false`, et l’URL publique de production du navigateur reste vide. Aucun courriel de production.
- Réception humaine des deux nouveaux courriels et contrôle Gmail sur téléphone : **en attente de confirmation**. Les confirmations antérieures concernent les messages avant correction.

Vérifications locales réussies : 22 tests serveur/présentation (Resend simulé), cinq contrats matériaux PDF, neuf contrats dossier commun ; les quatre entrées et la reprise après erreur à 390/834/1440 dans le vrai code Edge avec transport simulé ; parcours Pliage dessin → dossier → JSON → PDF → reprise à 390/1440 ; panier commun à 390/1440 ; tarif public à 390/834/1440. Accueil : 11 résolutions Chromium, images et logo chargés. Son HTML, sa feuille approuvée et son logo officiel sont identiques à `main` de départ.

Tous les navigateurs et tailles mentionnés sont **émulés**, sans appareil physique de recette. Gmail et la consultation directe GitHub Pages sont refusés ici par le proxy (HTTP 403) ; aucune ouverture réelle dans Gmail n’est revendiquée. Le compte MIR réel de l’adjointe n’a pas été confirmé ni modifié.

## Rejouer sans envoyer

```sh
node --test --test-concurrency=1 tests/mir-estimate-presentation.cjs tests/mir-estimate-edge.cjs tests/mir-estimate-service.cjs
node tests/mir-estimate-render-browser.cjs
node tests/mir-estimate-pdf-viewer-browser.cjs
node tests/mir-estimate-private-render-browser.cjs
node tests/mir-estimate-email-capture-browser.cjs
```

Workflow dédié : `.github/workflows/estimation-rendu.yml`. Aucun secret Supabase ni envoi externe en CI. Les scripts `tools/validation/mir-estimate-render-real.cjs` et `mir-estimate-render-private-real.cjs` servent uniquement à la recette réelle MIR TEST, hors CI. Le premier exige une option d’envoi explicite, la boîte autorisée et conserve les clés de reprise dans `/tmp`, jamais dans le dépôt.
