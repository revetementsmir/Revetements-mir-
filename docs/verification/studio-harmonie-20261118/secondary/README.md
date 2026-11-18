# Portes secondaires du Studio — 18 novembre 2026

Base : `e0cd92d9e6dd01b3f6697dd7de972df95839c8e1`. Branche de travail : `codex/studio-harmonie-pdf-20261118`.

## Réalisation

- `dist/studio.html` conserve la démonstration existante : trois zones, quatre matières génériques, cinq teintes, sélection sur le canvas, rotation, affichage des cotes, réinitialisation et export JSON. Aucun moteur ni valeur de matière/couleur modifié.
- `ops/studio-public/under-construction.html` conserve son état public « En construction », son illustration existante, ses deux liens vers accueil/boutique et sa gestion FR/EN. Aucun outil Studio n’est activé.
- Les deux pages chargent directement `mir-studio-doors.css`. La feuille est limitée à leur attribut `data-mir-studio-door` ; elle n’agit pas sur `plan.html`, les interfaces internes ni les outils de revue. Le build TEST copie déjà l’ensemble des fichiers de `dist` (`scripts/build-mir-test.cjs:11`). Aucun changement de build nécessaire.
- Fond anthracite, textes crème, accents sable, logo officiel et signature MIR bilingue. Les explications sur les limites de la démonstration restent présentes.
- Le moteur inline de démonstration est comparé exactement à la base ; SHA-256 : `ab2112154f8fa8e7f6262952e4bff35b553901ce8e719f4af625b39549f79228`.

## Vérification

```sh
MIR_STUDIO_SECONDARY_PHASE=before node tests/mir-studio-secondary-browser.cjs
MIR_STUDIO_SECONDARY_PHASE=after node tests/mir-studio-secondary-browser.cjs
node tests/mir-studio-public-stage.cjs
```

Le harnais lance un serveur HTTP local et Chromium. Les destinations externes sont interceptées avant le réseau ; aucune soumission, lecture serveur de prix ou autre opération distante n’est exécutée.

- Référence avant : 12/12 cas, deux routes × 1440/834/390 px × FR/EN.
- Après : 12/12 cas, mêmes dimensions et langues ; 12 captures finales plus 12 captures de référence.
- Contrôles : changement et persistance de langue, absence de débordement horizontal, logo chargé, contraste des libellés de composition/rotation, signature bilingue, liens publics réellement suivis, absence des outils sur l’écran public, interactions de la démo et contenu exact du téléchargement JSON.
- Le contrôle de staging confirme que les deux routes publiques sont remplacées par le template de construction, tandis que les deux copies TEST restent identiques. Les sources Studio et les brouillons ne sont pas modifiés par ce staging.
- Aucun défaut JavaScript relevé. Les tentatives de lecture du prix public émises par la **boutique de destination** sont bloquées avant le réseau et conservées dans `after/report.json`. Aucune requête externe émise par les deux pages Studio.

Les captures et leur manifeste sont dans `before/`, `after/` et `captures-manifest.json`. Le premier diagnostic du harnais est conservé : il supposait à tort une clé locale FR explicitement enregistrée et des liens restés relatifs, alors que le shell normalise ces URL. Les assertions corrigées vérifient la langue effective et les destinations réelles. La première passe visuelle est aussi conservée ; la vérification d’images a conduit à corriger le contraste du label de rotation lui-même, puis à recapturer.

## Limites

Ce contrôle ne recertifie pas le moteur principal PDF→3D, le panier, les services serveur ou les interfaces internes. Les outils natifs du navigateur et les couleurs du modèle de démonstration restent inchangés. La démo n’importe pas de plan client, ne calcule pas de quantité commandable et ne crée pas de demande d’estimation. La route `studio-public.html` du harnais est un alias local du vrai template ; la distinction public/TEST est vérifiée séparément par le test de staging.
