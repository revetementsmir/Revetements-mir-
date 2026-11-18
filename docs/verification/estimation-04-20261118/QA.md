# Recette navigateur indépendante — Estimation 04

**Source finale : 23 groupes validés, 30 captures AVANT et 88 APRÈS.** [Résultats](after/results.json), [empreintes application et harnais final](qa-source-sha256.json).

Les cinq étapes sont vérifiées en FR/EN à 1280×800, 1440×900, 1920×1080, 834×1194 et 390×844 : 50 états de formulaire. Les quatre choix sont réels ; le payload capturé conserve `projectDetails.type="renovation"`. Sont vérifiés : erreurs inline et focus, retour/édition, reprise après rechargement, PDF original sauvegardé et téléchargé à l’identique, valeurs stables lors du changement de langue, échéancier indéterminé et dimensions/matériaux/PDF facultatifs, blocage d’un service ancien, conservation exacte d’une soumission legacy figée, erreur 503 puis réessai avec le même identifiant et le même snapshot.

Les contrôles clavier comprennent les radios natives, le focus visible, Entrée dans Municipalité sans envoi et Retour. Le mode ordinateur à 980 px conserve les quatre cartes sur une rangée et l’en-tête de bureau. Le reflow équivalent 200 % à 640/720 px avec DPR 2 conserve l’accès à tous les champs des cinq étapes. Les captures téléphone/tablette comprennent les pages entières aux étapes 1 et 5.

**Accueil et Maison : 20 comparaisons strictes à 0 pixel différent, sans masque**, dans les cinq formats et les deux langues. Les fichiers HTML, CSS Maison et photos protégées conservent leurs empreintes de 7ae54b3.

Aucune erreur JavaScript, console ou HTTP inattendue, aucun trafic externe. Les six POST des scénarios de soumission ont été entièrement interceptés et simulés en mémoire par Playwright : aucune requête n’a quitté le harnais, aucun courriel ni aucune base de données réelle n’a été utilisé. Les deux 503 volontaires sont conservés dans le rapport avec leur message console attendu. Les matrices visuelles utilisent une configuration locale désactivée ; les captures `fixture-*` représentent exclusivement une simulation de transport.

L’historique `after/discovery-*` conserve la première passe 20/23 : deux assertions FIELDSET corrigées après preuve isolée (la propriété native et les descendants `:disabled` sont désormais vérifiés), et le défaut réel d’Entrée Municipalité corrigé dans le wizard. Le passage complet final valide les 23 groupes sur les mêmes octets application que les captures.

## Reproduire

```sh
MIR_ESTIMATION04_PHASE=before node tests/mir-estimation-04-browser.cjs
MIR_ESTIMATION04_PHASE=after node tests/mir-estimation-04-browser.cjs
node scripts/build-prestige-preview.cjs
MIR_ESTIMATION04_PHASE=preview node tests/mir-estimation-04-browser.cjs
```

`MIR_ESTIMATION04_OUT` déplace les preuves hors du dépôt ; utiliser le même dossier pour avant/après ou y copier `before/`. Le commit 7ae54b3 doit être disponible dans Git. `MIR_CHROMIUM_BIN` permet de choisir Chromium. `MIR_ESTIMATION04_CHECKS` sélectionne un groupe pour diagnostic ; la preuve source finale provient d’un passage complet.

La phase preview est séparée : elle utilise le vrai build protégé et sa configuration locale `enabled:false`, sans transport simulé. Elle vérifie le SHA du manifeste et les octets des trois modules principaux contre le commit attendu (`MIR_ESTIMATION04_EXPECTED_REVISION`, sinon HEAD), l’entrée directe Maison→Estimation en FR/EN sans détour par le panier, les cinq étapes, le PDF après rechargement, le bouton d’envoi désactivé et la garde réseau. Elle capture l’étape initiale aux formats 1440/834/390, dont la page entière sur téléphone, ainsi que l’étape finale. `MIR_ESTIMATION04_PREVIEW_DIR` désigne la racine du build (par défaut `.prestige-preview`). Son reçu post-commit est produit séparément hors du worktree pour garder le SHA stable.

Limites : navigateur et tailles émulés, pas de certification sur téléphone physique ; le 200 % est un contrôle de reflow équivalent et non une commande native de zoom. Sur téléphone, le bandeau des cinq étapes reste défilable horizontalement ; le titre de l’étape courante reste affiché. Les derniers ajouts au harnais concernent uniquement la phase preview ; les scénarios source et les fichiers application restent inchangés. Aucun ancien test n’a été modifié.
