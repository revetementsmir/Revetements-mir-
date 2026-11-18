# Scénario historique — exécution sur la base intacte

**Échec préexistant confirmé par exécution réelle du test sur la base `7ae54b3`.**

Le 18 novembre 2026, `tests/mir-estimate-browser.cjs` a été exécuté sans modification sur les fichiers de `/workspace/mir-inspiration`, au commit `7ae54b3525dc792ba10aafa7079addeb3829a4fe`. Ce dépôt était propre avant et après le test. Seuls la copie du script et les chemins de sortie ont été isolés dans un répertoire temporaire ; les liens vers `dist`, les helpers et les services pointaient vers la base.

Empreinte SHA-256 identique du script original et de sa copie :

```text
14426eb789ea6c0ff64f36e4694342c849924536ead16fe775de09742d8bd7e7
```

Le test termine avec le code 1 à sa première attente, ligne 8, après 30 secondes :

```text
waiting for locator('#estimate-limits').filter({ hasText: '5 PDF' }) to be visible
locator resolved to hidden <p id="estimate-limits" data-mir-page-visible="false">
Limites du service : 5 PDF au total, 20 Mo par fichier…
```

Il échoue donc avant `fill()`, l’ajout du PDF et le bouton d’envoi. La fixture HTTP est locale et les requêtes HTTPS sont bloquées par le scénario historique. Aucun backend réel et aucun courriel réel ne sont contactés.

La source de base confirme l’explication :

- `dist/mir-client-pages.js:542–544` place `#estimate-limits` dans la section « Note et plans PDF ».
- `dist/mir-client-pages.js:547–549` ajoute la section initiale « Votre demande » pour cette page.
- `dist/mir-client-pages.js:70–78` choisit l’index 0 et masque les éléments des autres sections ; la ligne 103 ouvre cet index.

Le même premier sélecteur et le même motif de visibilité échouent sur Estimation 04. Cet échec historique ne constitue donc pas une régression introduite par ce lot.

Preuves : [résultat structuré](historical-baseline.json), [journal complet](historical-baseline.log), [exécution sur Estimation 04](historical-browser.json).
