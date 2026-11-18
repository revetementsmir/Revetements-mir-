# Contrat de la galerie Inspiration

Périmètre de ce module : `dist/mir-inspiration-data.js` et `dist/mir-inspiration.js`, sur la page `body.mir-inspiration-page`. Aucun catalogue, compte, panier, favori ou service distant. Aucun nouvel espace de stockage.

## Données

`window.MIRInspirationData` est une structure figée :

```js
{
  version: '20261118.1',
  initialStyle: 'contemporain',
  styles: [{
    id: 'contemporain',
    name: { fr: 'Contemporain moderne', en: 'Modern contemporary' },
    photos: [{
      id: 'contemporain-01',
      src: 'assets/inspirations/contemporain-01.webp',
      largeSrc: 'assets/inspirations/contemporain-01-large.webp',
      caption: { fr: '…', en: '…' },
      alt: { fr: '…', en: '…' },
      position: '50% 50%',
      reviewStatus: 'visually-reviewed'
    }]
  }]
}
```

Sept styles, dans cet ordre : `farmhouse`, `contemporain`, `nordique`, `chalet`, `craftsman`, `mid-century`, `quebecois`. Quatre scènes par style. Les noms complets FR/EN viennent de la validation utilisateur. Les descriptions ne revendiquent ni fournisseur, ni certification, ni chantier MIR réalisé.

Les 28 légendes et descriptions FR/EN ont été comparées aux images générées finales ; toutes les entrées sont marquées `visually-reviewed`. Les anciennes images d’accueil/maison ne sont pas modifiées et ne sont pas reprises dans cette galerie finale. Les chemins de galerie restent propres à cette page. `final-data-check.json` confirme les 28 entrées et les 56 fichiers locaux présents.

## DOM et interactions

- `#mir-inspiration-tabs` et ses boutons `[data-inspiration-tab]` : tablist/tab, sélection visible, un seul tabstop. Gauche/Droite bouclent; Début/Fin vont au premier/dernier style. L’activation est immédiate et le focus suit le nouvel onglet.
- `#mir-inspiration-panel` : tabpanel étiqueté par l’onglet actif. Quatre figures `[data-inspiration-card]`, avec boutons `[data-inspiration-index="0..3"]`, images `[data-inspiration-image]` et légendes `[data-inspiration-card-caption]`. Les mêmes nœuds sont conservés lors d’un changement de style ou de langue.
- `#mir-inspiration-dialog` : dialogue modal natif, image `#mir-inspiration-large`, titre/caption/position correspondants. Boutons `[data-inspiration-close/prev/next]`. Gauche/Droite bouclent dans les quatre photos du style; Début/Fin sélectionnent la première/dernière. Échap ferme naturellement. La modalité native rend le reste de la page inerte; le retour à la carte est conservé sans voler un focus déjà déplacé après fermeture.

## Images et erreurs

Les quatre miniatures initiales sont chargées immédiatement. Les autres styles ne reçoivent un `src` que lors de leur sélection. Aucune grande image n’est demandée avant l’ouverture du dialogue; les autres grandes images sont demandées à la navigation, sans préchargement de la totalité.

Chaque image expose `data-inspiration-source` (chemin canonique) et `data-inspiration-state` (`loading`, `ready`, `error`). Les sources d’image et le cadrage sont distincts des textes localisés. Les rappels d’une ancienne demande sont nettoyés lors d’un changement d’image.

Les rappels de succès et d’échec vérifient le jeton courant ainsi que `currentSrc`. Une ancienne réponse 503 retardée ne remplace donc pas une miniature ou un grand format nouvellement sélectionné. `image-races.json` reproduit ces deux courses et vérifie également l’erreur courante et son réessai.

Erreur de miniature : bloc `[data-inspiration-error]` et bouton `[data-inspiration-retry="0..3"]`. Erreur d’agrandissement : bloc `[data-inspiration-dialog-error]` dans le dialogue et bouton `[data-inspiration-retry="dialog"]`. Le message est bilingue et annoncé par `role=status`. Aucun faux visuel ne remplace une image indisponible. Le réessai demande le même fichier local avec un paramètre `mirRetry` pour éviter le cache d’échec. Le focus du bouton de réessai retourne à la carte ou au bouton Fermer lorsqu’il est masqué, afin que le clavier reste utilisable.

## Langue

L’unique préférence est celle de `MIRClientLocale.getLocale()`. Le module écoute `mir:client-locale-changed` et les changements de `html.lang`. Il met à jour ses textes/attributs FR/EN et les métadonnées de page, sans changer le style, l’index de la visionneuse, les URL d’image ni les données métier. Les spans FR/EN statiques du titre et du pied de page sont affichés par le CSS selon la langue existante.

## Premier contrôle fonctionnel

Chromium local, 1440 × 1000, toutes requêtes externes et non GET bloquées. `js-smoke.json` confirme quatre miniatures initiales seules, zéro grand format avant ouverture, une réponse 503 locale volontaire puis un réessai réussi, navigation clavier, fermeture/retour de focus, quatre nœuds stables et aller-retour FR/EN avec style conservé.

Cette passe porte sur les quatre images contemporaines disponibles au moment du contrôle. Elle ne certifie pas les 28 images finales ni la matrice responsive complète : cette recette indépendante est consignée dans `../qa/` après stabilisation des images et des légendes.

`hidden-states.json` vérifie réellement le style calculé en chargement et en erreur : les miniatures et l’image du dialogue sont masquées (`display:none`), tandis que la hauteur du bouton de carte est conservée. La règle globale `[hidden]` existante suffit ; aucun correctif CSS supplémentaire n’a été ajouté. `contemporain-crop-1280x800.png` documente le cadrage de la quatrième scène à `50% 70%`, qui conserve le toit et les marches dans la grille.

Après la revue finale de la planche au ratio 2,8:1, `nordique-01`, `chalet-01`, `chalet-04` et `quebecois-01` sont cadrées à `50% 65%` pour conserver leurs marches. Les autres scènes restent centrées. La recette indépendante remplace les captures réalisées avant cet ultime ajustement de présentation.

Les scripts et les données sont gelés après la revue des 28 scènes. La recette responsive indépendante a reçu le feu vert sur ce jeu final ; ses résultats sont distincts des contrôles ciblés du module décrits ici.

## Focus natif : vérification complémentaire

`native-dialog-focus.json` reproduit dix pressions Tab et six Maj+Tab. Dans Chromium, après le dernier bouton, le focus séquentiel peut sortir du document vers l’interface du navigateur : `document.activeElement === document.body` et `document.hasFocus() === false`. Le dialogue reste ouvert et correspond à `:modal` ; Tab revient ensuite à son premier bouton. Ce cas ne constitue pas un focus sur l’arrière-plan.

Pendant ce contrôle, aucun événement `focusin` n’a ciblé le fond. Dix-neuf tentatives de `focus()` sur les liens et boutons visibles derrière le dialogue ont toutes été refusées par la modalité native. Échap a ensuite restauré la carte d’origine. L’assertion doit donc accepter un focus dans le dialogue **ou** ce cas précis de sortie du document, et refuser tout focus reçu par les contrôles d’arrière-plan. Aucun correctif applicatif n’a été apporté pour ce comportement natif.
