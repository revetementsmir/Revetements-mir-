# Maison — mode ordinateur à partir de 960 px

**27 groupes de contrôles validés**, sur la CSS finale `ae941d5f6f50ea71ca15fadec8311c3ececdd780af2ebeeb8618b24c9f5eb837`. Référence AVANT : `8760134`. Aucun fichier application modifié par cette recette.

Les deux captures AVANT à 980×1768 reproduisent la photo au-dessus des choix. Les huit captures APRÈS, en FR/EN à 960, 980, 1024 et 1100 px, montrent la photo à gauche et les quatre choix à droite, sur la même rangée. Les textes restent entièrement contenus, les quatre choix visibles, sans débordement horizontal. L’en-tête présente recherche, panier, FR/EN et avatar dans cet ordre visuel ; le menu mobile est masqué.

Les huit parcours vérifient le focus Tab visible des cinq contrôles d’en-tête, les deux boutons de langue, l’accès direct à l’estimation et la conservation de langue au retour. Le scénario 960 → 959 → 980 ouvre réellement le menu à 959, change de langue, puis revient à 980 en conservant l’état ouvert du JS partagé : la présentation ordinateur et les langues restent utilisables. Aucun changement de moteur ou d’envoi.

Les **10 comparaisons hors palier sont strictement identiques à la référence : 0 pixel modifié**, en FR/EN à 390×844, 768×1024, 1280×800, 1440×900 et 1920×1080. La photo et les fichiers HTML/JS contrôlés restent identiques par SHA-256.

L’ordre de Tab observé conserve celui du DOM partagé : FR → EN → recherche → panier → avatar, différent de l’ordre visuel CSS. Tous ces contrôles restent atteignables et leur contour de focus est visible (3 px). Aucun `tabindex` positif n’a été ajouté.

## Preuves

[final-results.json](final-results.json) consolide les 27 résultats et les empreintes. Les 31 captures comprennent deux baselines 980, huit vues corrigées, vingt images de comparaison hors palier et une transition. Exemple : [Maison FR à 980 px](after-maison-fr-CA-980x1768.png).

Les journaux historiques restent conservés. Le premier passage supposait des noms accessibles abrégés, alors que les boutons portent des noms canadiens complets. Le passage matriciel suivant valide 26 groupes ; sa seule assertion erronée attendait `nav.hidden=true` après avoir laissé le menu ouvert à 959. Le suivi ciblé vérifie explicitement l’état ouvert conservé, `nav.hidden=false`, et passe. Aucun correctif application n’a été nécessaire entre ces passages.

## Reproduction et portée

```sh
node tests/mir-particuliers-desktop-mode-browser.cjs
MIR_DESKTOP_MODE_CHECKS=transition node tests/mir-particuliers-desktop-mode-browser.cjs
```

Le harnais sert la référence Git et les fichiers courants sur des ports locaux éphémères. `MIR_DESKTOP_MODE_OUT=/tmp/mir-desktop-proof` permet une recette sans écriture dans Git. Chromium utilise un viewport de mise en page ordinateur, avec capacité tactile ; il reproduit le seuil usuel 980 px du mode ordinateur de Chrome Android, sans prétendre constituer une validation sur appareil Android physique.

Toutes les requêtes externes et toutes les méthodes autres que GET sont bloquées avant réseau. Ces passages n’en ont tenté aucune ; aucune erreur JavaScript de page relevée. L’estimation est uniquement ouverte, sans saisie ni soumission.
