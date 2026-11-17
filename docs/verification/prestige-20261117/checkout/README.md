# Panier et estimation — refonte prestige

Base : e9bd39b, branche codex/client-prestige-20261117. Présentation du panier commun et du formulaire existant. Aucun moteur métier, appel de soumission ou fiche privée d’équipe modifié.

Les captures `before-*` et `after-*` utilisent un navigateur Chromium à 1440 × 1050. `panier-mixte-*`, `estimation-mixte-*` et `formulaire-*` couvrent 1440 × 1000, 834 × 1112 et 390 × 844. Les données sont des articles réels du catalogue et une pièce locale explicitement marquée TEST. Aucun dossier client réel utilisé.

Vérifications réalisées :

- BECK au prix existant 515,99 $/boîte; 2 boîtes = 1 031,98 $, puis 3 boîtes = 1 547,97 $. Le montant est calculé uniquement si l’unité du panier correspond à l’unité publiée, sans conversion supposée. Les autres montants restent à confirmer.
- Pièces sur mesure visibles, cotes et quantités conservées; stockage du pliage strictement identique après changement de quantité du matériau.
- Panier commun → vrai dialogue d’estimation : le résumé comprend 3 boîtes BECK et 2 profils en L. Champs, brouillon, validation et moteur PDF existants conservés.
- Bouton explicite « Envoyer la demande ». Le transport n’est pas activé et aucune soumission n’a été déclenchée. Les appels externes sont interceptés et bloqués dans le navigateur de recette.
- Aucun débordement horizontal à 1440, 834 ou 390 px; aucune erreur JavaScript sur le parcours clavier réel.
- `confirmation-simulee-1440.png` vérifie uniquement le rendu de l’état déjà reçu à partir d’un brouillon local fictif. **Ce n’est pas une preuve de réception serveur ni de courriel.**

Les chaînes nouvelles sont regroupées dans `../checkout-i18n.json` pour intégration au dictionnaire central. La recette des nouvelles traductions doit être exécutée après cette intégration. Aucun test sur appareil physique ni Safari.

Le script de recette enregistré utilise le serveur local de travail `http://127.0.0.1:8766/`, Chromium `/usr/bin/chromium` et des chemins de l’environnement Cloud. Il ne contacte aucun backend; les réponses externes sont bloquées avant transfert. Les liens et exports déjà existants restent disponibles, les documents secondaires des pièces sont regroupés dans un volet ouvrable.

## Complément FR/EN — 17 novembre

Recette ciblée du panier Hardie : les six libellés signalés sont traduits (Finish, Price on request, Colour, sq. ft., pieces et texte de couverture). Les noms officiels des couleurs, dont Sauge, restent identiques à la source. Le retour au français restitue exactement le texte initial. Les valeurs métier des options restent `pi²` et `pièces`; le texte EN n’est jamais enregistré comme unité.

Un vrai changement d’unité en anglais de `pi²` vers `pièces`, suivi d’un rechargement puis d’un retour FR, conserve la valeur métier `pièces`. Le changement de langue seul conserve intégralement les octets du panier. Aucun appel externe transmis ni erreur JavaScript. Preuve : `language-verification.json`, capture `panier-anglais-1440.png`, scénario `verify-language-browser.cjs`.
