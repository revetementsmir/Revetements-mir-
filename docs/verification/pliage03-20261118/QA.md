# Recette Pliage 03

Référence immuable : `e58964cd8937766d2457904d2d7d625d1bc7df5e`. Chromium local réel, sans appareil physique. Le serveur ne sert que des fichiers locaux en GET ; tous les autres transports sont interceptés et avortés avant réseau.

## Reproduction

```sh
MIR_PLIAGE03_PHASE=before node tests/mir-pliage03-browser.cjs
MIR_PLIAGE03_PHASE=after node tests/mir-pliage03-browser.cjs
MIR_PLIAGE03_PHASE=preview MIR_PLIAGE03_EXPECTED_REVISION=<SHA> node tests/mir-pliage03-browser.cjs
```

`MIR_PLIAGE03_OUT` permet une sortie hors dépôt ; `MIR_CHROMIUM_BIN` choisit Chromium. `MIR_PLIAGE03_CHECKS=client-1440-fr-CA` ne rejoue que ce groupe. Le serveur du harnais utilise un port éphémère et fige les ressources au premier chargement. Avant utilise uniquement `git show` ; après utilise `dist` ; preview utilise `.prestige-preview/test` et vérifie le manifeste et les octets des modules contre le commit demandé.

## Référence et découvertes

- Avant : 2 parcours PC FR/EN réussis, 18 captures. Aucune pièce ajoutée pendant ces captures.
- Première erreur du harnais conservée dans `discovery-baseline-step-order` : il supposait un ancien ordre des étapes. Le parcours réel comporte modèle, mesures, finition avec face peinte, puis quantité.
- `discovery-reload` conserve le défaut réel de reprise : `start=models` s’appliquait de nouveau après chaque rechargement. L’application consomme maintenant ce paramètre après la première entrée. Le contrôle de restauration du brouillon reste strict.
- `discovery-official-colour-aria` conserve le défaut de nom accessible : « Ivoire » était traduit dans `aria-label`. Les boutons utilisent maintenant `aria-labelledby` vers les vrais noms et codes protégés. Les références complètes sont comparées au catalogue pour les 41 teintes Kaycan.
- `discovery-css-reload` correspond à un passage volontairement interrompu pour charger le dernier contraste CSS. Les erreurs de navigateur fermé de cette interruption ne sont pas des défauts applicatifs.
- `discovery-colour-legend` conserve la passe fonctionnelle réussie avant la dernière protection des légendes. La passe finale vérifie aussi « Sable » exactement dans les trois résumés/légendes et lors des deux changements de langue. Les noms/codes fabricant ne sont pas traduits.
- `discovery-before-final-pdf` conserve le succès avant l’ultime ajustement du document client. La même suite, sans changement du harnais, a été entièrement rejouée sur le moteur `62872715…` et le dictionnaire `9de88cbb…` ; `after` contient exclusivement ce dernier passage.
- Les premiers essais ont aussi permis d’adapter les sélecteurs de l’entrée directe, la lecture du stockage sur la page panier, et l’attente des images différées au seul viewport. Les comparaisons physiques acceptent uniquement l’écart d’arrondi IEEE-754 inférieur à `1e-8 mm` lors des conversions ; les instantanés, angles, choix et autres pièces restent comparés strictement.

## Périmètre

Le parcours final vérifie trois dimensions de viewport (1440×900, 834×1194, 390×844), chacune en FR-CA et EN-CA. Il sélectionne réellement un L, saisit des dimensions, change pouces/mm, règle 45°, 90° et un angle décimal, utilise les boutons +/−, contrôle le nuancier Kaycan contre les données réelles, choisit les deux faces et compare le chemin de base et la géométrie. Les champs de finition doivent rester lisibles sur fond sombre. Les interactions de face utilisent des événements tactiles dans les contextes tablette/téléphone.

La quantité vide, zéro, négative et fractionnaire doit empêcher l’ajout. Une seconde pièce est tracée au clavier avec deux angles indépendants ; une révision de la première conserve intégralement la seconde. Retour, changement de langue, rechargement, instantanés, compteur et panier commun sont contrôlés. Les contextes magasin, panneau et atelier sont exclus de la présentation Pliage 03.

Les tarifs distants existants (`GET mir_public_bend_tariff` et RPC `POST mir_public_boutique_prices`) sont bloqués et consignés séparément, ainsi que leurs erreurs réseau attendues. Aucun tarif fictif n’est fourni. Aucune demande, aucun courriel, aucune écriture distante ni paiement n’est exécuté. Une réussite du parcours local ne certifie pas un prix ni une fabrication.

Les résultats définitifs et empreintes se trouvent dans les fichiers `results.json` de chaque phase. Les essais filtrés restent dans `selected-results.json` et ne constituent pas une matrice complète.

## Résultat source

La passe complète finale `after/results.json` réussit **7 groupes et 84 captures** : six parcours complets et le groupe des trois contextes exclus. Zéro exception JavaScript, erreur console inattendue ou réponse HTTP en erreur. Les 37 tentatives de tarifs sont toutes bloquées avant réseau et consignées séparément. Les 236 ressources effectivement chargées correspondent encore aux octets du dépôt à l’issue de cette passe ; `after/source-integrity.json` vérifie aussi l’empreinte du harnais.

Les choix Ivoire et Sable sont réellement sélectionnés, puis Sable est sauvegardé. Changer de produit efface sa couleur et bloque la suite jusqu’à un nouveau choix. Deux pièces restent présentes après une révision de quantité, leur retour au panier et le rechargement. Les captures longues téléphone/tablette montrent les contrôles accessibles par défilement ; il ne s’agit pas d’une affirmation « tout tient sur un écran ».

L’aperçu TEST et ses empreintes de commit sont contrôlés séparément, après construction par l’intégrateur. Aucune capture locale n’est présentée comme une session exécutée sur Vercel.
