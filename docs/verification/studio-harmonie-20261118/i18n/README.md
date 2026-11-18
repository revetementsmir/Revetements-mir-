# Libellés des fenêtres du Studio

`dist/mir-studio-dialog-i18n.js` complète uniquement les fenêtres d’import PDF, Volume et fiche matériau. Il utilise la langue et l’événement `mir:client-locale-changed` existants. La page doit être `plan.html`, sans `embed`, `context=admin` ni `mode=atelier`.

Les correspondances portent sur des textes exacts et des messages connus : progression chiffrée de l’import, erreurs, dimensions manquantes, avertissements de calibration, labels et options descriptives du formulaire Volume, rubriques de la fiche et badges des documents. Aucun texte métier n’est réécrit dans les données. Les valeurs des inputs/options, les états de validation, URL et quantités ne sont pas modifiés.

Les noms de fabricant, produit et couleur, les titres officiels des documents et les noms des feuilles PDF sont exclus. Les notes de sources qui ne possèdent pas de traduction de présentation restent leur texte original. Cela ne constitue pas une certification d’un bilinguisme exhaustif des documents fabricants ou du contenu des plans.

L’observateur ne programme un rendu que pour les trois fenêtres ; il est déconnecté pendant ses propres mises à jour et n’écrit que lorsque le texte diffère. Les sources françaises sont conservées dans une WeakMap, sans stockage persistant, pour le retour vers le français.

## Recette locale

```sh
node --check dist/mir-studio-dialog-i18n.js
node tests/mir-studio-dialog-i18n.cjs
```

Variables facultatives : `MIR_CHROMIUM_BIN` et `MIR_STUDIO_I18N_OUT`.

Le harnais est autonome : serveur HTTP local, navigateur Chromium, toute destination externe bloquée avant le réseau. Il vérifie les gardes sans accès au DOM, une véritable validation de fichier invalide, des messages de progression/cautions explicitement simulés, les bascules FR→EN→FR, l’identité des valeurs et des options Volume, des noms source et liens de fiche, l’état du moteur inchangé et l’absence de boucle d’observation. Il n’applique aucune dimension et n’envoie aucune demande.

`report.json` contient les résultats ; `import-en.png`, `volume-en.png` et `material-en.png` montrent les vrais dialogues. La capture Import combine une erreur réellement provoquée avec des statuts ensuite injectés pour vérifier leur traduction : elle n’atteste pas l’analyse réussie d’un PDF. Le contrôle complet d’import et la matrice responsive sont réalisés séparément par la recette principale du lot.
