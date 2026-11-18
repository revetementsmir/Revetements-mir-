# Studio — fenêtres et PDF, recette indépendante

Base `e0cd92d9e6dd01b3f6697dd7de972df95839c8e1`. **AVANT : 6/6 groupes, 72 captures. APRÈS : 7/7 groupes, 74 captures.** Les preuves complètes restent dans `/workspace/mir-studio-harmonie-20261118` et sont reproductibles par les harnais ; ce dossier contient 15 captures de fenêtres sélectionnées, 6 pages PDF rasterisées, les 4 PDF réellement téléchargés FR/EN, les rapports et les empreintes.

La matrice couvre 1440×900, 834×1194 et 390×844, en français et anglais. Neuf fenêtres : bibliothèque, fiche matériau, ouvertures, volume, import, reprise, source, estimation bloquée et téléchargement PDF. Les états import vide/erreur/succès et reprise vide/remplie sont réellement exécutés. Import d’un PDF synthétique par le vrai sélecteur, reprise par le vrai bouton ; deux élévations sont identifiées, les deux absences restent explicites. Aucun PDF privé.

Les surfaces respectent les fonds anthracite approuvés et un contraste texte/fond d’au moins 4,5. Aucun débordement horizontal, dimensions adaptées aux fenêtres, fermetures par bouton ou Échap. Les SVG, résumés, mesures et références exportés sont identiques à la base ; ouvrir et fermer les dialogues ne modifie pas le modèle. La navigation réelle démonstration → Studio → retour conserve l’anglais.

Le PDF simple contient **4 pages FR et EN** : grandes façades et court résumé. La case « Inclure les cotes et détails techniques » est décochée par défaut. Le PDF détaillé de cette étude contient **8 pages FR et 11 pages EN**, avec les **52 lignes intégralement préservées**. Les dessins annotés ne sont dupliqués que lorsque le SVG de présentation diffère du SVG d’origine ; la sérialisation/localisation anglaise explique le nombre supérieur, sans perte de données. Les annexes sont contrôlées par les options réellement envoyées et un enregistrement indépendant de chaque `canvas.fillText`. Les PDFs réels sont ouverts et toutes leurs pages PC rasterisées par PDF.js ; format A3 horizontal et fond anthracite vérifiés.

Sept cas legacy (sans opt-in, admin, atelier, embed, wide, bending-sheet et anglais sans opt-in) produisent des PDF **identiques octet pour octet** à la base, avec Date fixe et polices locales. Deux tests synthétiques d’annexes longues FR/EN produisent chacun 13 pages et préservent 33 résumés, 114 lignes peintes, y compris une ligne poursuivie sur plusieurs pages et une référence sans espaces. Ces fixtures ne sont pas des projets clients.

Zéro erreur JavaScript, console ou HTTP et zéro tentative externe/non-GET. Aucun envoi, courriel, paiement ou écriture distante. L’estimation reste désactivée. Les tests sont réalisés dans Chromium avec émulation tactile ; aucun appareil physique ni exécution sur Vercel n’est revendiqué. Les titres de documents officiels, noms de produits/couleurs et contenu des plans conservent leur langue source ; la recette ne déclare pas tout document fournisseur bilingue.

Les deux défauts initiaux du harnais sont conservés dans `reports/discovery/` : la version embarquée de PDF.js expose `loadingTask.destroy()` au lieu de `PDFDocumentProxy.destroy()` ; et les propriétés facultatives `undefined` disparaissent du JSON. Le rejeu compare symétriquement le JSON, sans retirer aucun champ réellement défini. Aucun défaut applicatif n’a été masqué.

```sh
MIR_STUDIO_HARMONY_PHASE=before MIR_STUDIO_HARMONY_OUT=/tmp/preuves node tests/mir-studio-harmonie-browser.cjs
MIR_STUDIO_HARMONY_PHASE=after MIR_STUDIO_HARMONY_OUT=/tmp/preuves node tests/mir-studio-harmonie-browser.cjs
MIR_STUDIO_HARMONY_OUT=/tmp/preuves node tests/mir-studio-harmonie-pdf.cjs
# Après construction TEST par l’intégrateur :
MIR_STUDIO_HARMONY_PHASE=preview MIR_STUDIO_HARMONY_OUT=/tmp/preuves node tests/mir-studio-harmonie-browser.cjs
```

La recette du build TEST exact et le reçu de publication sont encore à établir par la passe après commit ; ce dossier atteste la source gelée.
