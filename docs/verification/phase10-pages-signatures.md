# Hotfix CI — signatures Pages Phase 10

Base : `448f67d0c349bc9f20e40deeabc1e6ac8987e2bd`.
Branche : `codex/hotfix-phase10-pages-signatures`.
Aucun fichier applicatif modifié. Aucune fusion ou publication dans ce travail.

## Protection historique et remplacement

Dans `a38c6e6^:dist/production-model.js`, `profile-marker-overflow` était
le groupe SVG de repli pour les labels que le placement principal ne pouvait
pas loger. Il conservait les repères et leurs rappels, dans une zone déportée.
Le grep prouvait la présence de ce mécanisme, sans démontrer sa lisibilité.

Le moteur actuel emploie des cotes parallèles aux segments, des rappels courts
au milieu des petits segments et une recherche bornée des placements. Il
refuse un cadre insoluble plutôt que cacher un label. L’ancienne classe a
disparu avec ce remplacement; la réintroduire ne prouverait aucune protection.

Le bloc `Verify published MIR pages` télécharge désormais `production-model.js`
avec le SHA de vérification et compare ses octets à `_site_mir/production-model.js`.
Les tests géométriques et les références indépendantes Beam/Ventilation/Fascia
s’exécutent sur **ce même artefact**, et non sur un autre moteur local :

- un label et une cote par segment, index unique, lettre et mesure exactes;
- cotes classiques parallèles, attaches aux deux extrémités;
- rappels courts ciblant le milieu du bon segment;
- intersections labels/profil/rappels/cotes/étoile, limites des cadres;
- face physique attendue, rotations et miroirs;
- refus explicite d’un cadre impossible, sans label caché;
- 368 configurations transformées, sept formats, vingt rendus et vingt pages PDF.

Les assertions préexistantes restent présentes. Les options de racine
d’artefact et de dossier de preuves des tests ne désactivent aucune assertion.
Le navigateur de cette recette bloque les hôtes Supabase.

## Audit et exécution du bloc complet

Commande reproductible :

```sh
python3 tools/validation/verify-pages-local.py --output /tmp/mir-pages-signatures
```

Le script extrait les fichiers `dist` suivis par Git, refuse un `dist` modifié,
exécute la préparation d’artefact du workflow, puis **le bloc complet extrait
de ce même workflow** avec `bash -ex` et `pipefail`. Un serveur HTTP lié
uniquement à `127.0.0.1` sert l’artefact. Pas de copie indépendante des attentes.

Résultat local : code 0, 997 fichiers d’artefact, 131 requêtes GET,
84 comparaisons `cmp`, 147 assertions `grep`, 7 assertions shell `test`.
Les tests géométriques et les références indépendantes passent également.
Arbre `dist` testé : `41055673d1422465f617941f21cd4bc09653bef6`.
Toutes les autres assertions du bloc sont passées sans modification.

Contrôles négatifs locaux :

- ajout d’octets à la réponse HTTP du moteur : refus par `cmp`, code 1;
- labels remplacés par une mauvaise lettre : refus par les assertions géométriques;
- labels forcés au même point : refus pour chevauchements.

Les deux mutations géométriques ne touchent que des copies temporaires
d’artefact. Le code applicatif suivi par Git demeure inchangé.
Régressions complémentaires : MIR 45/45, Phase 10 14/14; `git diff --check` vert.

Un workflow PR dédié exécute la même vérification locale avant fusion et
archive le journal, le script extrait, le manifeste SHA-256 et les rendus.
**Ceci vérifie la cohérence locale du contrat; ceci ne certifie pas GitHub Pages.**

## Courriels/PDF — preuve séparée

- Workflow : `.github/workflows/estimation-rendu.yml`.
- Non déclenché sur `448f67d0` : son filtre `push.paths` n’inclut pas
  `.github/workflows/pages.yml`, seul fichier du hotfix précédent.
- Lancement manuel tenté lors de la promotion précédente : refus `Forbidden`.
  Aucun nouveau run créé, aucun secret modifié pour contourner ce refus.
- Dernier run vert : **43451721408**, tête
  `f5d07d0aaf4951df662cbff24481398d76100d3d`.
- Comparaison `f5d07d0..448f67d0` : aucun changement dans `dist`, `server`,
  `supabase/functions`, `tests`, `tools` ou ce workflow.
- Sur ce hotfix, les fichiers applicatifs, le workflow Courriels/PDF et ses
  treize scripts directement référencés demeurent identiques au dernier run vert.
  Les changements de tests géométriques et le nouveau harnais CI ne sont pas
  des dépendances de ces scripts. Aucun changement de manifeste de dépendances.

Le dernier run vert est une preuve sur le même contenu applicatif, pas une
nouvelle exécution sur ce hotfix. Les changements sous `tests/**` de ce hotfix
entrent dans le filtre existant et permettront son déclenchement automatique
sur main après une éventuelle fusion autorisée; son succès reste à vérifier.

Aucun accès Supabase manuel, aucun envoi externe et aucune Phase 11.
