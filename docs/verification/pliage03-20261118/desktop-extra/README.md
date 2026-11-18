# Contrôle PC complémentaire et agrandissement

Contrôle réalisé dans Chromium sur les vrais fichiers locaux, en français. Aucune source applicative modifiée. Les requêtes externes sont interceptées et bloquées ; seuls les GET du serveur local passent.

**Résultat : 4 cas réussis, 12 captures, aucune erreur JavaScript et aucun débordement horizontal.** Le détail mesuré et les empreintes des captures sont dans `results.json`. La feuille CSS vérifiée est `a96c97a46ff0ca5befe5f235e49a532ac555385e9dd87a427bb95ee1b3f44268`.

| Fenêtre | Mesures et finition | Disposition observée |
| --- | --- | --- |
| 980 × 900, tactile activé | Réussite | Navigation verticale, dessin central, configuration à droite : 142 / 454 / 300 px |
| 1280 × 800 | Réussite | Trois colonnes : 168 / 624 / 360 px |
| 1920 × 1080 | Réussite | Trois colonnes : 190 / 1042 / 420 px |
| 640 × 400 | Réussite | Recomposition sur une colonne ; champs et actions accessibles par défilement |

Les six captures PC `measures-*` et `finish-*` ont été ouvertes et inspectées visuellement. Les deux faces sont distinctes, les choix couleur portent leur vrai nom, les champs et le bouton de continuation restent lisibles. En finition, une partie du formulaire se trouve sous la fenêtre aux hauteurs courtes : le défilement de page la rend accessible ; aucun masquage global n’est appliqué.

Pour chaque format, les champs A, B, angle, matériau et fabricant, ainsi que les actions de continuation, ont été focalisés et amenés dans la fenêtre. La navigation au clavier a parcouru les 13 couleurs de la référence Kaycan Urbanix ; le dernier bouton était entièrement visible dans le nuancier et dans la fenêtre. La capture `finish-colours-keyboard-fr-CA-640x400.png` montre ce dernier état au format réduit.

Limites : 980 px avec `hasTouch` reproduit le seuil CSS du mode ordinateur ; ce contrôle n’utilise pas un appareil Android réel. Le format 640 × 400 est l’équivalent de la surface CSS de 1280 × 800 à 200 %, et non une commande de zoom de l’interface du navigateur. Le profil synthétique testé est le L ; la matrice fonctionnelle principale couvre les autres profils et les invariants métier.

Aucun correctif supplémentaire nécessaire pour ces cas.
