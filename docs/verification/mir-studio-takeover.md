# Relais du 16 novembre 2026 — reconstruction extérieure automatique

## Point de départ et périmètre

Reprise de la PR44, branche `codex/mir-studio-s1-import`, depuis le commit
`cf4df4566d7640c8ceba31244f7b4d5f706eac17` et son arbre
`ae59b62b2e2aaf9547549a48466e02e3fd0ea3b2`, vérifiés par empreinte Git.
Les derniers fichiers non poussés de l’autre session Codex n’étaient pas accessibles.
Le nouveau module extérieur est donc une implémentation reprise depuis ce point de
sauvegarde, pas une prétendue récupération des modifications non enregistrées.

Coordination : méthode MOON 1.3.11 vérifiée dans Atelier, BOSS GOD chargé,
missions Architecture, Domaine, Qualité et Vérification visuelle rattachées au
travail existant. Un intégrateur et trois agents aux fichiers distincts; revue
indépendante des géométries avant intégration. Compte GitHub utilisé : Mir2.

Le produit reste un moteur logiciel réutilisable déclenché après import. Il n’a
pas besoin d’un expert conversationnel par dossier. Ce lot n’ajoute ni service
d’inférence externe, ni traitement de production, ni publication du Studio.

## Changements

### Observations extérieures

`plan-reconstructed-exterior.js` reçoit le même inventaire, les images locales,
les références et les niveaux que le pipeline de reconstruction. Il propose :

- Le **solage visible** lorsque ses repères reconnus rejoignent la base du bon
  mur. Les surfaces restent limitées à la partie observée; la profondeur sous le
  terrain reste inconnue.
- Des **zones de maçonnerie** lorsque la vue fournit une mention de matériau et
  plusieurs cours avec joints intérieurs décalés. Une couleur, une note seule,
  une grille ou du clin horizontal ne suffit pas. Les ouvertures et légendes
  sont exclues des régions analysées.
- Des **colonnes d’entrée** seulement lorsque la face, la profondeur dans une
  vue latérale et les niveaux compatibles sont observés. La matière porteuse
  reste inconnue. Aucun profil standard n’est ajouté arbitrairement.

Les règles du projet — maçonnerie 4 po, solage 10 po avec maçonnerie observée,
sinon proposition de 8 po — sont conservées comme **règles utilisateur**, séparées
des mesures. Sans preuve de maçonnerie, la condition de la proposition de 8 po
reste non vérifiée. Une cote écrite contradictoire laisse l’épaisseur inconnue
et le conflit explicite; elle ne déclenche pas une moyenne ou une priorité
silencieuse. Ces données ne constituent pas une vérification structurale.

### Visibilité et recoupement

La revue indépendante a reproduit puis fait corriger trois défauts :

1. Les pixels d’un garage pouvaient être attribués simultanément au garage et au
   mur caché derrière. La projection du volume plus proche exclut maintenant ces
   pixels des surfaces situées derrière, y compris le solage.
2. Deux élévations identiques pouvaient créer deux objets superposés. Les pièces
   physiquement identiques sont consolidées, leurs autres observations étant
   conservées. Des étendues contradictoires restent hors géométrie, avec leurs
   candidats dans `level.reconstruction.exterior.conflicts`.
3. Une colonne pouvait être rattachée à une façade de garage située devant elle.
   La profondeur est désormais établie avant l’association; les colonnes masquées
   sont conservées comme conflits, sans volume affichable.

Le masque de légende reconnaît également une boîte coupée par le bas de la page
lorsque son titre, son bord supérieur et ses deux côtés sont encore étayés
jusqu’au bord de l’image. Un séparateur intérieur ne raccourcit plus le masque.
Un mur de bâtiment au bord de page n’est pas masqué par ce seul fait.

### Intégration Studio

- Le module se charge avec `defer` avant le pipeline automatique.
- Les scènes confirmées excluent les éléments proposés par défaut. Le Studio
  demande explicitement leur aperçu, sans confirmer les murs ni les quantités.
- La sélection 2D d’un élément active son niveau propriétaire.
- Le cadrage 3D tient compte du solage et des autres éléments extérieurs.
- Une zone observée reste classée maçonnerie jusqu’au choix d’un produit connu.
- Les propositions contrôlent leur source, transformation, bâtiment, niveau,
  région d’image, mur et polygone avant l’enregistrement atomique.
- Les conflits et les règles d’épaisseur restent conservés. Les saisies de
  géométrie de l’utilisateur sont identifiées séparément de l’observation initiale.
- Une reconversion préserve aussi un niveau qui contient seulement un ajout
  extérieur, une section de soffite ou une finition de coin manuelle.

## Vérifications de ce relais

| Vérification | État et portée |
| --- | --- |
| 24 suites Node de la section « Syntax and existing contracts » du workflow Studio | Réussies localement, dont quatre nouvelles suites ciblées. |
| Contrat PR44 d’isolation | Réussi contre la base exacte `e9bd39bc5dd4c40663c56bfc21759c543ab4e8d9`; les objets Git de cette base ont été récupérés et vérifiés, sans modifier le test. |
| Syntaxe des fichiers modifiés et contrôles d’espaces Git | Vérifiés avant sauvegarde. |
| Solage, maçonnerie, colonnes, occlusions, vues répétées et conflits | Régressions synthétiques et probes indépendants réussis. |
| Géométrie/projection 3D et sélection | Vérifiées par les API réelles du moteur avec un récepteur Canvas sans dessin. Ce contrôle ne valide pas les pixels affichés. |
| Parcours navigateur ajouté à la suite reconstruction | Sélection inter-niveaux, couleur/annulation/réouverture et rollback atomique sont codés. Exécution navigateur encore à obtenir au moment de ce rapport. |
| Réimport des PDF originaux dans cette session | Non exécuté : le lancement Chromium s’arrête avant l’ouverture d’une page avec `socket() EPERM`. |
| Aperçu géré du Studio | Serveur démarré par `sites-preview`; l’ouverture de l’origine locale a été refusée par le contrôle d’approbation automatique du navigateur. Aucune capture du Studio actuel n’est revendiquée. |

Les nouvelles suites sont explicitement appelées dans
`.github/workflows/mir-studio-s1-pr.yml`; les ajouter au dépôt seul n’aurait pas
suffi à les exécuter en CI. Les contrôles GitHub doivent être lus sur le SHA
effectivement sauvegardé. Un résultat historique vert n’est pas un résultat de
ce nouveau code.

## Recette des originaux et critères de succès

Le nouveau harnais `tools/qa/mir-studio-automatic-originals.cjs` reprend le vrai
formulaire d’import dans un contexte navigateur neuf. Il vérifie l’empreinte du
PDF et celle du Blob réellement sauvegardé, attend le rapport persistant terminal,
tourne la vue 3D dans quatre orientations, attribue le produit exact sélectionné,
puis recharge le même projet. Aucune géométrie, cote ou calibration n’y est injectée.

Exemple d’exécution avec fichiers privés hors dépôt :

```sh
node tools/qa/mir-studio-automatic-originals.cjs \
  --manifest /chemin/prive/manifest.json \
  --out /chemin/prive/nouvelle-recette \
  --case C3 \
  --repo-root /chemin/du/checkout
```

Le dossier de sortie doit être neuf. `--repo-root` permet d’appliquer exactement
la même recette au point de départ figé puis au code corrigé. Le manifest définit
explicitement le bâtiment lorsque son choix est ambigu.

Les verdicts distinguent **import**, **conversion**, **parcours terminé** et
**fidélité géométrique**. Un modèle vide ne peut plus produire
`workflowVerified: true`. Un refus attendu peut satisfaire son contrat sans être
présenté comme une conversion réussie. Une erreur de cas rend la commande non
réussie. La fidélité reste `unverified` : ce harnais ne compare pas le bâtiment à
une référence géométrique indépendante. Les mesures mémoire sont des échantillons
de tas JavaScript, pas un pic total de consommation du navigateur.

Aucun PDF client, OCR, coordonnées de dossier ni capture privée n’est ajouté au
dépôt. Le workflow ne lance pas la recette d’originaux sans ses entrées privées.

## Limites et reprise de validation

Les résultats documentés avant ce relais dans `mir-studio-automatic.md` restent
historiques : C3 et C4 donnaient des modèles partiels; C4 avait encore un écart de
taille de fenêtre, et C1 restait sans modèle faute d’échelle résolue. C1 avait déjà
été importé et audité : il ne constitue pas un PDF jamais vu.

Les poutres, toitures d’entrée et dalles de balcon sans section ou emprise
observée restent non établies. L’épaisseur d’un trait raster n’est pas convertie
en hauteur de poutre. Ce lot ne certifie donc ni un bâtiment complet, ni la
précision de toutes les ouvertures, ni les quantités d’achat.

À reprendre dès qu’un navigateur autorisé est disponible : exécuter la recette
C3/C4 avant-après, constater séparément le refus C1, inspecter les vues 2D/3D et
les dimensions, puis établir les écarts contre une référence indépendante. Les
preuves mobiles physiques restent distinctes des tailles de fenêtre Chromium.
La PR demeure un travail de Studio à revoir; aucune fusion ni publication n’est
effectuée par ce relais.
