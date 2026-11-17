# Galerie des captures MIR Prestige

La galerie réunit les captures réelles finales du parcours client, avec filtres PC / tablette / téléphone et agrandissement. Les liens ouvrent les pages de l’aperçu TEST; ils ne reproduisent pas les données d’une session simulée.

## Régénérer après les dernières captures

Depuis la racine du dépôt :

```sh
node scripts/export-prestige-gallery.cjs \
  --manifest docs/verification/prestige-20261117/captures-gallery-manifest.json \
  --archive
node scripts/build-prestige-preview.cjs
```

Le premier script ne publie rien. Le deuxième prépare l’aperçu local isolé existant; son hébergement relève du responsable de livraison.

Le manifeste de galerie reprend les 91 captures de `captures-final-manifest.json`, remplace les quatre vues de configurateur de profil par six captures finales FR/EN, et ajoute six captures du Studio public « en construction », six du configurateur de panneau et six de la démonstration Studio historique (PC, tablette et téléphone, français et anglais), ainsi que la confirmation simulée. Le lot couleurs ajoute les fiches produit anglaises sur tablette et téléphone. Total attendu : 114 captures, dont 48 PC, 33 tablette et 33 téléphone.

Le lot `boutique-colours-20261117` renouvelle seize captures Boutique / Catégorie / Recherche / Fiche produit après les corrections de miniatures, nuanciers et cadrage des noms. La galerie ciblée `dist/boutique-colours-galerie.html` complète ces preuves avec les changements de couleur et les retouches; ses images intermédiaires ne sont pas intégrées à la galerie finale.

Après une nouvelle capture, conserver son nom ou mettre à jour son entrée dans `captures-gallery-manifest.json`. Une entrée décrit `file` (relatif au dossier de vérification), `title`, `page`, `viewport`, `language`, `state` et `simulated`. Ne jamais classer un avant, un rendu intermédiaire ou une simulation comme résultat final réel. Les captures compte/suivi et confirmation portent explicitement la mention de simulation; les formulaires d’inscription n’ont pas été soumis.

## Livrables générés

- `dist/prestige-captures.html` : galerie navigable dans l’aperçu, démarrage sur les captures PC.
- `dist/prestige-captures/` : captures PNG, encodage optimisé sans perte.
- `docs/verification/prestige-20261117/gallery-manifest.json` : inventaire réel, taille et empreinte SHA-256 des images exportées.
- `docs/verification/prestige-20261117/prestige-captures-autonome.html` : galerie autonome, images intégrées, aucun réseau ni stockage; ce document montre les écrans sans simuler l’application.
- `docs/verification/prestige-20261117/mir-prestige-captures.tar.gz` : archive de la galerie autonome et du manifeste; copie dans `dist/prestige-captures.tar.gz` pour téléchargement depuis la galerie.

Les deux livrables volumineux autonomes (HTML et archive, dont la copie de téléchargement) sont exclus de Git par chemins exacts et régénérables. Les captures optimisées et la galerie navigable restent versionnables. Le script ne change aucun contenu d’image : il recomprime les données PNG et vérifie que les octets d’image décompressés sont identiques; les originaux restent intacts.

## Portée des preuves

Les captures prouvées sont des rendus Chromium. Elles ne prouvent ni une commande serveur, ni un envoi, ni une authentification réelle. Le Studio public reste distinct des outils de TEST : sa capture provient du vrai template public et son lien vise `studio-public.html` dans l’aperçu isolé, alors que les outils TEST ouvrent `plan.html`.

`gallery-checks.json` décrit le dernier contrôle de la galerie, distinct des contrôles métier de `browser-results-final.json`. Après changement des captures, régénérer la galerie puis vérifier l’ouverture des images, les filtres, l’agrandissement et le téléchargement. `gallery-preview.png` montre le rendu de la galerie au moment de ce contrôle; ce n’est pas une nouvelle preuve des parcours métier.
