# Harmonisation du lot Samsung

La direction autorisée est **charbon neutre + vert MIR**. Les surfaces principales doivent perdre leur dominante vert foncé. Les accents décoratifs orange sont exclus. Le logo reste intact; les couleurs fonctionnelles d’erreur restent accompagnées d’un texte ou d’une icône.

Revue visuelle et couleurs terminée sur les empreintes répertoriées : Frederick a choisi Accueil « Liste Nette » et Punch « Cadran ». Cette expertise a reçu les décisions et leurs contraintes via la coordination; les deux images originales ne sont pas disponibles dans son propre contexte et ne sont pas présentées comme inspectées ici. Les anciennes mesures restent conservées; la nouvelle composition a maintenant sa propre passe exécutée, détaillée en fin de rapport. Le Stop rouge fonctionnel est maintenant explicitement demandé; il ne constitue pas une permission d’ajouter un accent décoratif orange.

Référence examinée : `6039306ac76584ee6b06859786c02eef7cfca685`, PR37 en brouillon, branche `codex/refonte-chantier-employe-chef`. La méthode Atelier Harmonisation 1.0.0, la mission existante `f957f4d8-80ce-4b67-931c-3f926e4c64d0` version 4 et le cadrage UX version 14 ont été relus directement sur le serveur. La mission n’a pas été recréée. Un seul intégrateur modifie les sources applicatives et les tests; cette expertise produit les rapports et les preuves.

## Ce qu’il faut faire

Uniformiser les écrans et tous les états Employé/Chef, y compris les anciens composants du magasin, les menus, les champs, les réglages et l’iframe du dessin. Mesurer les styles réellement appliqués en clair, sombre et système, puis ouvrir les captures correspondantes.

## Les étapes

1. Conserver une copie figée de la référence, comparer les composants réels et identifier les règles responsables.
2. Transmettre une palette mesurée et la correction des causes communes à l’intégrateur.
3. Contrôler les écrans, formulaires, panneaux de choix et états; mesurer texte, placeholders, valeurs, icônes, contours, sélection, focus et désactivation.
4. Recontrôler les mêmes scénarios après correction; conserver les défauts initiaux et les limites de chaque preuve.

## Comment savoir que c’est terminé

- Les grandes surfaces sombres sont neutres; les choix actifs et actions suivent le vert MIR.
- Aucun texte clair sur fond clair, ni texte sombre sur fond sombre, ne subsiste dans les écrans et états examinés.
- Les menus applicatifs réutilisent les mêmes composants et leurs états sélectionné, désactivé, erreur et focus sont lisibles.
- Les mesures correspondent aux sources exécutées; Chromium, WebView et Samsung physique sont distingués.
- Les autres rôles et le site client gardent leur périmètre et leurs composants.

## Détails pour le chat

### Palette recommandée, avant contrôle de l’intégration

| Usage | Sombre | Clair |
|---|---|---|
| Fond | `#151718` | `#f4f5f2` |
| Surface | `#1f2224` | `#ffffff` |
| Surface secondaire | `#282c2f` | `#eef1ed` |
| Texte | `#f4f5f2` | `#202623` |
| Secondaire et placeholder | `#bdc4c0`, opacité 1 | `#56645c`, opacité 1 |
| Contour de champ | `#76817a` | `#6d7c72` |
| Action | `#78c65a` avec `#151718` | `#2f6b23` avec blanc |
| Sélection | `#26372a` avec texte clair | `#e6f1df` avec `#255c1d` |
| Focus | `#9edb86` | `#31573b` |
| Stop fonctionnel proposé pour le cadran | `#c43d32` avec blanc | `#c43d32` avec blanc |
| Erreur | `#ffb4a8` sur `#3a2525` | `#9c3327` sur `#fff1ed` |
| Désactivé | `#909994` sur `#2b2f31` | À mesurer sur le composant final |

Les valeurs sont une recommandation de l’expertise, pas des hexadécimaux présentés comme déjà approuvés par Frederick. Les ratios et la mesure du rendu figurent dans [CONTRAST-SAMSUNG.md](CONTRAST-SAMSUNG.md).

Le Stop proposé mesure 5,17:1 pour le texte/l’icône blanche, 3,48:1 contre le fond charcoal et 3,09:1 contre la surface principale. S’il est placé sur une surface secondaire, son contour doit aussi être vérifié. L’anneau et l’aiguille du nouveau cadran seront mesurés séparément du texte HH:MM:SS, de l’état en attente et du mode mouvement réduit.

Le contour sombre a été renforcé après comparaison avec la surface secondaire : la première proposition `#69726d` passait sur la surface principale mais descendait à 2,83:1 sur `#282c2f`. La valeur finale recommandée `#76817a` passe à 3,48:1 sur cette surface. Un séparateur purement décoratif peut rester plus discret; il ne remplace pas la limite identifiable d’un champ actif.

### Avant : causes confirmées dans le vrai rendu

Une archive locale en lecture seule de `dist` et de la fixture à la référence exacte a été conservée dans `/tmp/mir-harm-samsung-before`. Le magasin a été réellement ouvert avec ses produits et deux jobs fictifs, en clair et sombre à 390 px/grands textes. La capture sombre a réellement été ouverte, et le CSSOM a été interrogé sur les éléments concernés.

| Composant | Cause vérifiée | Conséquence sombre |
|---|---|---|
| Favoris | `.favorites-filter` dans `chantier.css` conserve `background:#fff` et hérite du texte clair du thème | Texte 1,08:1 |
| Titre Magasin et introduction | Grande surface héritée claire, titres/textes du thème sombre | Titre 1,03:1; introduction 1,56:1 |
| Raccourcis | Surfaces héritées claires; couleur héritée claire | Plusieurs textes à 1,08:1 |
| Recherche | Placeholder du navigateur sans token commun explicite | 3,20:1 en sombre; 4,41:1 en clair |
| Contours de champs | Couleur de bord historique trop proche de la surface | 2,01:1 en sombre; 1,23:1 en clair |

Les règles `mir-field.css` recolorent les cartes parentes, mais certains descendants conservent un fond fixé en dur. Les règles générales de texte hérité font alors apparaître du texte clair sur ces surfaces claires. Les alias historiques `--p-*` et `--mir-*` doivent suivre les tokens locaux du chantier; les corrections ne doivent pas être appliquées globalement aux autres rôles.

La toile blanche d’une photo fabricant est une exception fonctionnelle à traiter explicitement : l’image ne doit pas être recolorée. Ses légendes, boutons et textes doivent utiliser un fond et une couleur compatibles, au lieu d’hériter d’un texte clair sur cette toile.

Preuves avant : `artifacts/chantier-redesign/samsung-harmonisation/before/catalogue-light-390.png`, `catalogue-dark-390.png` et `final-audit.json`. Ce sont des données locales fictives, pas une recette hébergée ou Samsung.

### État de la revue

Une première exécution intégrée a révélé une boucle de MutationObserver : la synchronisation du libellé de choix réécrivait le même `textContent`, ce qui déclenchait à nouveau l’observateur. Le navigateur cessait de répondre à l’ouverture du premier écran avec un choix. L’intégrateur a ajouté une garde sur la valeur; la reprise a ensuite parcouru les écrans et panneaux sans ce blocage. Aucun succès n’est attribué à cet essai interrompu.

La passe `after1/` a exécuté 568 rendus/panneaux et huit journaux de page, sur Employé et Chef à 390 px, avec quatre variantes : clair, sombre, système avec OS clair et système avec OS sombre. Les empreintes des sources avant/après sont identiques dans cette passe. Les choix système ont effectivement produit `themeChoice=system` puis respectivement `theme=light` et `theme=dark`. Ce contrôle n’est pas déduit du seul libellé « Selon l’appareil ».

La passe couvre les cinq onglets, deux états Punch, chantier/dossier/documents, photos/extra/problème/outil et erreur fictive, messagerie privée, compte/réglages, notifications, heures/correction/banque, absence/dépense et leurs choix, commandes/livraisons, Magasin/fiche/favori sélectionné, pliage, panier non vide et première entrée du dessin. Elle contient 11 856 couples mesurés. Aucun échec du harnais ni erreur JavaScript n’a été relevé. Le seul couple signalé dans quatre variantes est le symbole × de suppression du panier clair (3,13:1) : il dépasse le seuil 3:1 d’une icône, mais reste une couleur héritée à uniformiser. Il n’est pas présenté comme un échec critique de texte métier.

Accueil, Commande, Punch actif, Magasin, favori sélectionné, calendrier et réglages ont réellement été ouverts dans les captures après. La surface sombre générale est maintenant neutre. L’examen approfondi des étapes du dessin est distinct de sa première entrée et a révélé d’autres descendants hérités : zone de contrôles du tracé blanche avec texte clair, récapitulatif d’angle, statuts et contours de champ. Leurs mesures et images ont été transmises à l’intégrateur; le contrôle ne s’arrête donc pas à la bonne apparence des cinq onglets.

Le changement OS sombre → clair pendant une édition a aussi été exécuté : le document parent suivait bien le système, mais le corps de l’iframe gardait la couleur sombre injectée lors de son montage. Les tokens de montage littéraux doivent être remplacés ou réappliqués; cette réserve reste ouverte jusqu’au recontrôle.

La famille de désactivation recommandée est explicite : sombre `--field-disabled-bg:#2b2f31`, `--field-disabled-text:#909994`, `--field-disabled-border:#76817a`; clair, alias des tokens surface secondaire/secondaire/contour. Les attributs `disabled` ou `aria-disabled` et les libellés utiles restent nécessaires. Une opacité héritée de 0,5 ne doit pas diminuer silencieusement leur lisibilité dans le dessin.

Enfin le masquage du bandeau natif a été relu avec le bootstrap : l’en-tête TEST remplace le statut normal, mais `showError` écrit ses erreurs uniquement dans `#mir-native-state` avec `role=alert`. Masquer ce nœud sans relais rendrait invisibles des erreurs caméra/GPS/fichier/déverrouillage. Cette réserve a été transmise à l’intégrateur et à Mobile pour un contrôle sur le vrai bootstrap, séparément de la connexion et du masque de verrouillage.

Le contrôle après intégration reste en cours. Aucun avis « entièrement harmonisé » n’est émis à ce stade; le dessin profond, les désactivations explicites et l’alerte native doivent être repris avant cet avis.

### Reprises aux formats étroits et états désactivés

La passe `after-wide1/` exécute les mêmes 568 rendus/panneaux et huit journaux, cette fois à 360 et 430 px, sur les deux rôles en clair/sombre. Les sources sont restées identiques du début à la fin. Aucun couple faible, échec du harnais ou erreur JavaScript n’est détecté; le symbole de retrait du panier a également été uniformisé. Punch actif 360 sombre, Magasin 360 sombre et Accueil Chef 430 clair ont réellement été ouverts. Les champs, les favoris, les formulaires et les panneaux continuent de suivre la palette.

Les états désactivés ont été vérifiés explicitement dans `disabled2/` : calendrier avec bornes de dates fictives, option nommée « Choix QA indisponible » avec vrai `disabled`, puis validation sans date pour produire l’erreur du composant. Ces contraintes et cette option ont été ajoutées seulement à la représentation locale de recette, jamais au serveur. Les quatre variantes clair/sombre/système-clair/système-sombre sont exécutées sans erreur ni couple faible. Texte désactivé 5,47:1 en clair et 4,61:1 en sombre, sans opacité atténuante; erreur 6,53:1 en clair et 8,39:1 en sombre. Les jours indisponibles sont aussi barrés. Les captures des erreurs claire/sombre et de l’option indisponible sombre ont réellement été ouvertes.

La passe profonde `drawing2/` confirme le suivi du système pendant l’édition : le corps parent et celui du dessin passent tous deux à `#f4f5f2` après changement OS vers clair. Les contrôles du tracé, le bas des étapes, les identifiants A/B et les contours sont corrigés. Un libellé d’angle A–B reste à 1,03:1 en sombre dans un paragraphe qui garde son propre fond clair : cet écart a été transmis pour une dernière correction.

Les valeurs automatiques des paths SVG du choix de face sont conservées comme observations à examiner, sans les confondre avec un pictogramme simple : ces vignettes possèdent un canvas clair interne, un contour principal et une étoile avec contour sombre. Les captures Face claire/sombre ont été réellement ouvertes. Le diagnostic sur le seul fond du bouton ne suffit pas à conclure que tous les traits de cette illustration sont illisibles. Les couleurs réelles de matière/fabricant ne sont pas recolorées pour obtenir du vert.

### Recontrôle des derniers correctifs ciblés

Les passes suivantes utilisent les dernières sources corrigées et leurs propres empreintes; elles ne réattribuent pas les anciennes matrices à un nouveau code :

| Preuve ciblée | Résultat mesuré |
|---|---|
| `target-angle/` : entrée, tracé réel, mesures en clair/sombre | Six rendus, deux journaux, aucun couple faible ni erreur; sources stables. Le texte 90° mesure 13,53:1 en clair et 12,87:1 en sombre. |
| `target-team/` : équipe Chef sombre | Boutons Présent/Absent désormais sur surface charcoal; aucun couple faible ni erreur; sources stables. |
| `target-disabled/` : calendrier, erreur, option indisponible dans les quatre variantes | Douze rendus et quatre journaux; aucun couple faible ni erreur; sources stables. |

Les nouvelles captures Tracé sombre et Équipe Chef sombre ont réellement été ouvertes. La géométrie du tracé est maintenant également enregistrée : en-tête fixe 0–64 px, barre basse 770–844 px, iframe 167,59–758 px, `scrollY=0`, aucun fullscreen dans le parent ou l’iframe. Les deux barres sont visibles dans la nouvelle image. L’ancienne capture où elles n’apparaissaient pas n’est donc pas transformée en preuve d’un échec actuel; le Designer a recontrôlé indépendamment taps et souris sans reproduire ce phénomène.

Le contrôle contextuel de la vignette Face est détaillé dans `face-canvas-review.json` : contour significatif du profil 8,68:1 et contour de l’étoile 12,86:1 sur son vrai canvas `#f1f5f2`, dans les deux thèmes. Le trait secondaire et le remplissage jaune ne sont pas utilisés seuls pour porter la forme. Les calculs bruts restent conservés, sans suppression d’observation.

Le code natif a reçu un relais d’erreur visible dans le contenu, ou dans `#mir-device-lock` lorsque ce masque est présent. La preuve d’exécution du vrai bootstrap et du refus de déverrouillage appartient au bilan Mobile; cette revue visuelle ne la remplace pas. L’apparence des barres système Android ne peut pas être certifiée depuis le seul `meta theme-color` web.

Les nouveaux panneaux adaptatifs à 200 % ont aussi été contrôlés séparément dans `target-dense/` : Actions Commande, Actions du pointage, Filtres Magasin et leurs choix, deux rôles en clair/sombre, 32 rendus et quatre journaux. Aucun couple faible ni erreur; empreintes stables. Les styles calculés montrent bien des textes de 32 px, distincts de la préférence « grands textes » de 19 px. Filtres sombres, Actions Punch claires et Actions Commande Chef sombres ont réellement été ouverts.

Mobile a ensuite exécuté le vrai gestionnaire `showError` du bootstrap et ses styles : treize scénarios réussis dans `samsung-mobile-unlock-fixed/runtime-review.json`, puis contrôle sombre ciblé dans `samsung-mobile-lock-dark/runtime-review.json`. Les captures `locked-error.png` et `locked-error-dark.png` ont réellement été ouvertes ici aussi. L’alerte est visible à l’intérieur du masque; le contenu privé et l’en-tête restent masqués. Les couleurs sombres mesurées sont `#ffb4a8` sur `#3a2525`; le masque utilise `#f4f5f2` sur `#1f2224`. L’empreinte du bootstrap correspond au fichier relu : `9be0a2d888b613d45f25406f376e80113ddb05f35781d218578d1a8a3e0bbd58`.

Il s’agit d’une simulation Chromium du vrai gestionnaire et de la CSS, pas d’un essai Keyguard/biométrie physique. La réserve de message caché par la refonte est levée sur ce niveau de preuve; le Samsung et les barres Android restent des niveaux de recette distincts.

Les avis définitifs restent associés aux empreintes examinées puis au SHA final annoncé par la coordination. Aucun SHA distant nouveau ni résultat CI n’est inventé dans ce rapport.

### Reprise de la composition approuvée Accueil / Cadran

La méthode et la mission existante ont été relues; le cadrage serveur était en version 15 lors de cette reprise. Les décisions visuelles les plus récentes sont transmises directement par la coordination. L’Accueil doit présenter une liste groupée de trois entrées Employé ou quatre Chef; Punch reprend un cadran vert fin, un compteur dominant et un bouton rond Play/Stop avec libellé. Le Stop rouge est explicitement demandé. Les X et menus du lecteur de photos de référence ne font pas partie de ces écrans.

Le premier cadran exécuté a révélé une icône Play dont le `span` héritait de la mauvaise couleur : 2,38:1 en clair et 1,91:1 en sombre. Le composant commun a été corrigé, puis les nouveaux rendus ont mesuré 6,47:1 et 8,58:1. Le Stop blanc sur rouge mesure 5,17:1. Le fond autour du cadran est maintenant transparent et le bouton central fait 76 px dans les captures nominales à cadran 280 px.

Les fonds adjacents des SVG sont mesurés au niveau de la forme et de son conteneur coloré, et non au niveau d’un bouton parent transparent. Cette correction du diagnostic conserve les seuils; elle évite un faux positif sur le carré blanc du Stop dont le vrai fond est rouge. Les observations des premières passes restent conservées.

La passe `cadran-smoke3/` a ouvert le nouveau rendu en clair/sombre : anneau 5,91:1 et 8,58:1 contre le fond réel; compteur 14,08:1 et 16,43:1. Le mode normal a une transition d’aiguille de 0,18 s; le mouvement réduit la supprime (0 s) tout en continuant à recalculer le compteur. Le changement de thème OS pendant la session conserve le temps affiché et adapte les couleurs.

La visibilité de l’aiguille est contrôlée dans les images, séparément de son attribut d’angle. Un premier bloc central opaque cachait entièrement l’aiguille à 90°. Après reprise, le balayage des pixels aux quatre quadrants donne 82 / 32 / 66 / 32 px visibles à 0 / 90 / 180 / 270°, avec deux petits morceaux de 3 px entre les lignes du compteur. Ces résultats, conservés dans `needle-pixel-review.json`, sont transmis au Designer et à l’intégrateur : la finition demandée est une portion nette de 30–45 px dans la couronne, sans passage entre les textes. Le recouvrement du Stop à 180° est aussi pris en compte. La validation de cette retouche reste ouverte.

Mobile a par ailleurs détecté un rattrapage animé incorrect à la reprise normale : après passage de 15 à 75 minutes, l’attribut indique 90° mais la matrice rendue traverse encore un autre angle pendant 0,18 s. Cette observation n’est pas présentée comme un succès de reprise; l’aiguille doit rejoindre directement la bonne position à la réouverture.

Les deux derniers écarts de messages remplis sont maintenant corrigés et réellement recontrôlés dans `target-populated2/` : seize rendus, quatre journaux, deux rôles, clair/sombre, sources stables, aucun couple faible ni erreur. « Ouvrir le job » mesure 6,47:1 en clair et 7,64:1 en sombre; le badge PDF 13,53:1 et 12,87:1. Les deux captures ont réellement été ouvertes. Plans, activité et dialogues de tâches ont aussi été peuplés de données locales clairement fictives; aucun envoi réel ni contrôle serveur n’est déduit de cette passe.

SEO/GEO : non applicable, expérience métier privée. Aucune publication, fusion, opération production, émission réelle de courriel ou distribution d’APK effectuée par cette expertise.


### Avis sur le nouveau rendu standard exécuté

La passe `cadran-final1/` contient **432 rendus et 24 journaux de page**, deux rôles, 360/390/430 px et quatre variantes clair/sombre/système-clair/système-sombre. Les 10 776 couples mesurés ne comportent aucun couple faible; aucun échec du harnais ou erreur JavaScript n’a été relevé. Les empreintes des dix sources sont restées identiques pendant cette passe. Le détail et les captures réellement ouvertes sont inventoriés dans `cadran-final1/review-summary.json`.

Les captures finales d’Accueil Employé clair et Chef sombre, des six angles, du Play/Stop au focus, du prochain chantier avec Play vert, de l’attente claire/sombre et du changement de thème système ont réellement été ouvertes. Trois entrées sont regroupées côté Employé, quatre côté Chef; le cadran n’a plus de grand rectangle de surface et aucun morceau d’aiguille ne réapparaît entre les lignes du compteur.

L’analyse des pixels de 144 images de cadran donne, pour les angles 0/45/90/180/270/360°, **45/44/30/32/29/45 px** à 360 px, puis **45/45/30/33/30/45 px** à 390 et 430 px. Ces valeurs décrivent les pixels effectivement peints après recouvrement du texte et du Stop. La variation de 29–30 px à 270° est visible et contrastée; la coordination l’accepte sans rouvrir la source pour un pixel. L’aiguille ne passe plus sous les textes. L’anneau et l’aiguille mesurent 5,91:1 en clair et 8,58:1 en sombre.

Le Play vert et le transfert vers le prochain chantier mesurent 6,47:1 / 8,58:1; le Stop fonctionnel blanc sur rouge 5,17:1. Le compteur mesure 14,08:1 / 16,43:1. La petite heure « Début à… », issue de `started_at` et formatée pour Toronto, mesure 5,69:1 / 10,12:1. Le focus de trois pixels sur les actions reste visible à 5,91:1 / 8,58:1. L’attente porte un vrai `disabled` et le texte « Confirmation attendue / En attente de synchronisation »; le dernier pointage confirmé reste affiché. L’icône désactivée, observée séparément, mesure 5,47:1 / 4,61:1, sans opacité atténuante.

Le mouvement réduit supprime la transition de l’aiguille (0 s) sans figer le compteur. Le passage système clair↔sombre a été exécuté pendant la session : thème calculé et couleurs changent, `started_at` reste identique. Mobile a recontrôlé la reprise normale dans `samsung-mobile-dial-resume-fixed/dial-review.json` : à 35 ms après le retour 15→75 minutes, la matrice réellement rendue indique 90°, le même angle que les données et le compteur 01:15:00. Sa capture `resume-normal.png` a aussi réellement été ouverte ici. La réserve de rattrapage animé est donc levée sur ce niveau Chromium.

Empreintes du rendu standard : `mir-field-views.js` = `f6fd44c807d2fad1700e2fedb40b01fa3c8f7251c469ec76bfd7e73a8cc552d9`; `mir-field-runtime.js` = `89ad62bfacbecbff2dad68b96722091adaf58182f0715a00fe6f42866baea58e`; `mir-field-samsung.css` = `357daf81930f48b9396c78a14f16568f2d326d575415de2a6158ba7cc27750b0`. Les dix empreintes complètes sont dans `cadran-final1/source-fingerprints.json`.

**Limite de gel :** l’intégrateur a ensuite adapté le CSS à 200 % et aux faibles hauteurs, avec « Voir le cadran » dans un panneau séparé. Les preuves standard ci-dessus restent rattachées à leurs empreintes; elles ne sont pas réattribuées au CSS dense ultérieur. Les anciens panneaux `target-dense/` ne certifient pas non plus cette nouvelle présentation. Qualité/Ergonomie reprennent ses dimensions, doubles actions et accessibilité avant le gel global. Le SHA final, la CI, les barres Android, la WebView et la recette Samsung physique restent des preuves distinctes coordonnées par le responsable.


### Fermeture des deltas dense et choix de chantier

Après le GO de l’intégrateur, les changements de densité ont leur propre reprise, sans réexécuter ni réattribuer la matrice de 432 rendus :

| Passe ciblée | Rendus / journaux | Couples | Résultat |
|---|---:|---:|---|
| `cadran-delta-standard/`, 390 px, deux rôles clair/sombre | 48 / 4 | 1 200 | Aucun couple faible ni erreur; sources stables |
| `cadran-delta-dense/`, texte racine 32 px, 360/390/430, deux rôles clair/sombre | 156 / 12 | 3 672 | Aucun couple faible ni erreur; sources stables |
| `cadran-delta-low-height-scroll/`, 844×342, deux rôles clair/sombre | 12 / 4 | 160 | Aucun couple faible ni erreur; sources stables |
| `home-choice-final/`, vraie façade et vraie feuille, 360/390/430, deux rôles clair/sombre | 48 / 12 | 1 554 | Aucun couple faible ni erreur; sources stables |

Le résumé et le panneau dense, y compris une durée fictive de 125 h pour vérifier la place du texte, ont réellement été ouverts. À faible hauteur, le cadran complet exige un défilement interne : le dialogue mesure 310 px de hauteur utile pour 471 px de contenu, et son `scrollTop` passe réellement de 0 à 161. Le bas du cercle et l’heure de début sont récupérables; Échap revient au résumé. Les captures avant/après ont été ouvertes. Il n’est pas affirmé que le cercle entier apparaît simultanément dans 342 px de hauteur.

La première passe longue `cadran-delta-low-height/` est conservée comme diagnostic : un fichier applicatif a changé pendant son exécution, donc elle n’est pas utilisée comme preuve de gel. Le contrôle de défilement stable lui succède et mesure les composants concernés sur le bundle plus récent.

Le dernier choix d’Accueil a été actionné par sa vraie façade MIRChoices, puis la seconde job a été choisie. Les captures claires/sombres et la carte mise à jour ont réellement été ouvertes : titre 15,41:1 / 14,62:1, caption 6,23:1 / 9,01:1, option sélectionnée 12,82:1 / 11,54:1, focus 6,47:1 / 7,64:1. L’adresse n’est pas dupliquée dans la carte. La fixture `thinJobs` ne connaît initialement que le nom et l’ID de la seconde job : ses numéro/adresse affichent donc des indications de remplacement avant hydratation du dossier, puis les valeurs correctes après sélection. Cette limite de données fictives, transmise à l’intégrateur, ne sert pas à certifier les métadonnées hébergées.

Dernières sources examinées : `chantier-app.js` = `c125cef0fad017b0ccdfec5ee4da3ad002f43507f92d7bbe6b81f97dded5d38b`; vues = `0e8da55be5ea20476bdc43092b3e4cf5b0d9e7ac0ff6d1780489d8cc0b1046e8`; runtime = `d8bf3f68868f0f2b5e0d47af0ad3260e8f4ef4573918a8b2b10a0337b6386f71`; CSS Samsung = `33ff66adb812b5675ea6df74178254338b30192dc22436e4f4df7c0faec4876b`. Le fichier `final-delta-review.json` distingue les dates et empreintes de chaque passe. Il n’existe pas de prétention à une matrice exhaustive unique rejouée intégralement sur le dernier bundle.

**Avis de l’expertise :** les couleurs, composants et états exécutés sont cohérents; aucune réserve de contraste bloquante ne demeure dans ce périmètre. Les preuves de raccordement serveur, de CI, de WebView et de Samsung physique restent distinctes. Le SHA Git final et le bilan Atelier confirmé sont fournis par la coordination, sans nouvelle mission créée par cette expertise.


### Dernier gel : métadonnées du choix d’Accueil

L’intégrateur a ensuite ajouté le préchargement des métadonnées des jobs autorisées, en réutilisant le RPC et le cache existants. La limite de fixture signalée ci-dessus est corrigée dans le rendu final : dès la première ouverture de la feuille, « JOB 454 · Pavillon du Parc · 20, rue Exemple, Lévis » est présent avant de choisir cette job. Les nouvelles captures claire Chef 360 px et sombre Employé 390 px ont réellement été ouvertes.

`home-choice-frozen/` reprend uniquement ce dernier delta : 48 rendus, 12 journaux, 1 554 couples, deux rôles, trois largeurs, clair/sombre. Aucun couple faible, erreur JavaScript ou échec du harnais; les dix empreintes sont stables. La couleur et le focus restent aux valeurs du tableau précédent. Le dernier `chantier-app.js` examiné mesure `097431fa730e8ded701020cb72f1e90bab9738f2b8edc9e7254ec2b1018e437a`; vues, runtime et CSS restent respectivement `0e8da55be5ea20476bdc43092b3e4cf5b0d9e7ac0ff6d1780489d8cc0b1046e8`, `d8bf3f68868f0f2b5e0d47af0ad3260e8f4ef4573918a8b2b10a0337b6386f71` et `33ff66adb812b5675ea6df74178254338b30192dc22436e4f4df7c0faec4876b`.

La preuve reste locale avec données fictives. Elle lève la réserve de présentation des métadonnées dans cette fixture et ne prétend pas remplacer la vérification des droits serveur. Aucune réserve couleur bloquante restante dans les composants et états examinés.
