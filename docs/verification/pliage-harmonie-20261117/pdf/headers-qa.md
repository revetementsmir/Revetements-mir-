# Régression des en-têtes PDF longs — 17 novembre 2026

Commande : `node docs/verification/pliage-harmonie-20261117/pdf/qa-headers.cjs`.

Résultat final : **49/49 contrôles réussis**, export réel FR et EN (8 pages chacun). Les identifiants de 80 caractères, noms de 140 caractères, projet de 160 caractères, commande de 100 caractères, responsable de 120 caractères, date de 40 caractères, révision de 60 caractères et notes de 500 caractères correspondent aux limites existantes du modèle.

Les quantités 13 et 17 apparaissent une seule fois chacune. Les noms et identifiants sont conservés dans leur ordre complet sur chaque fiche et sa suite. Les notes françaises saisies et la couleur officielle restent inchangées en anglais. Le JSON d'entrée, la chaîne localStorage synthétique, les faces SVG sources et les modèles avant/après sont strictement identiques. Les titres de continuation et leur notice sont en anglais dans l'export anglais. Aucun texte vectoriel ne dépasse les marges contrôlées.

Les rasterisations `headers-after/headers-en-CA-page3.png` et `headers-after/headers-en-CA-page4.png` ont été examinées : aucun reste d'en-tête sur les colonnes de notes, nom complet lisible dans l'annexe, séparation nette entre titre et contenu. L'augmentation de 4 à 8 pages sur ce cas extrême conserve les métadonnées sans diminuer les caractères jusqu'à les rendre illisibles.

Preuve rouge : `node docs/verification/pliage-harmonie-20261117/pdf/qa-headers.cjs --baseline` donne **20 échecs sur 49**. Ce mode sert uniquement `mir-dossier-pdf.js` de HEAD depuis la route HTTP locale ; aucun fichier applicatif n'est remplacé. Les autres dépendances sont celles de la branche courante. Les rapports avant/après consignent la révision et les SHA-256 exacts ; les empreintes restent identiques pendant chaque exécution.

Sécurité du test : fixtures exclusivement synthétiques. Seuls les GET du serveur local et les URL blob sont autorisés. Les deux tentatives de consultation du service de prix Supabase sont bloquées avant leur départ. Aucun appel externe, aucune demande, commande ou notification réelle ; aucune erreur JavaScript.
