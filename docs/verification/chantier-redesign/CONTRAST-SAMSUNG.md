# Contrastes du lot Samsung

Les calculs de palette ci-dessous servent à choisir les tokens. Ils sont distincts des mesures du CSS réellement appliqué. Le diagnostic réel prend en compte les fonds opaques et transparents, le texte, les valeurs de champs, les placeholders, les icônes de contrôle, les contours et le focus. Les couleurs avec image ou état complexe nécessitent aussi une inspection visuelle.

Seuils de diagnostic : texte normal 4,5:1; texte d’au moins 24 px, ou 18,66 px gras, 3:1; icônes, contours nécessaires et indicateur de focus 3:1. Les éléments désactivés sont mesurés séparément et ne sont pas utilisés pour affirmer une conformité globale. Le statut n’est jamais porté seulement par la couleur.

| Couple proposé | Rapport |
|---|---:|
| Sombre texte `#f4f5f2` / surface `#1f2224` | 14,62:1 |
| Sombre secondaire `#bdc4c0` / surface `#1f2224` | 9,01:1 |
| Sombre contour `#76817a` / surface `#1f2224` | 3,96:1 |
| Sombre contour `#76817a` / secondaire `#282c2f` | 3,48:1 |
| Sombre action texte `#151718` / vert `#78c65a` | 8,58:1 |
| Sombre focus `#9edb86` / surface `#1f2224` | 9,85:1 |
| Sombre erreur `#ffb4a8` / fond `#3a2525` | 8,39:1 |
| Sombre désactivé `#909994` / fond `#2b2f31` | 4,61:1 |
| Clair texte `#202623` / blanc | 15,41:1 |
| Clair secondaire `#56645c` / blanc | 6,23:1 |
| Clair contour `#6d7c72` / blanc | 4,40:1 |
| Clair action blanc / vert `#2f6b23` | 6,47:1 |
| Clair focus `#31573b` / fond `#f4f5f2` | 7,50:1 |
| Clair erreur `#9c3327` / fond `#fff1ed` | 6,53:1 |
| Stop fonctionnel proposé, blanc / `#c43d32` | 5,17:1 |
| Limite Stop `#c43d32` / fond charcoal `#151718` | 3,48:1 |
| Limite Stop `#c43d32` / surface `#1f2224` | 3,09:1 |

Le rouge fonctionnel Stop est explicitement demandé dans la reprise Cadran; ce choix ne crée pas une palette décorative orange. Les valeurs ci-dessus sont proposées avant mesure du nouveau composant réel. L’anneau, l’aiguille, les icônes, le texte, les transferts sélectionnés, l’attente et le mouvement réduit restent à recontrôler sur ce nouveau rendu.

## Mesure du rendu avant

Référence exacte `6039306ac76584ee6b06859786c02eef7cfca685`; Chromium, largeur 390 px, préférence grands textes. Données locales fictives, même fixture et même écran dans les deux thèmes.

| Élément réel | Clair | Sombre |
|---|---:|---:|
| Bouton Favoris | 13,65:1 | 1,08:1 |
| Titre Magasin | Lisible | 1,03:1 |
| Placeholder recherche | 4,41:1 | 3,20:1 |
| Limite de champ | 1,23:1 | 2,01:1 |

Le détail calculé et les règles CSS responsables sont conservés dans `artifacts/chantier-redesign/samsung-harmonisation/before/final-audit.json`. Le diagnostic AVANT relève 70 couples faibles en clair et 84 en sombre, notamment les contours et les composants répétés du catalogue. Ce nombre désigne des observations dédoublonnées par élément/rendu; il ne désigne pas autant de défauts distincts ni un pourcentage de conformité.

## Mesure après

La passe `after1/CONTRAST-SAMSUNG.json` conserve 568 rendus/panneaux et huit journaux de page : deux rôles à 390 px, clair/sombre/système-clair/système-sombre. Les empreintes de sources au début et à la fin sont identiques. Les 11 856 couples incluent 32 observations de contrôles désactivés, identifiées séparément. Aucun échec de scénario ou erreur JavaScript n’est remonté.

| Élément réellement mesuré dans cette passe | Clair, minimum | Sombre, minimum |
|---|---:|---:|
| Valeurs de champs | 15,41:1 | 12,87:1 |
| Placeholders | 6,23:1 | 7,93:1 |
| Limites de champ | 3,86:1 | 3,48:1 |
| Focus des panneaux ouverts au clavier | 6,47:1 | 7,64:1 |
| Icônes de contrôles | 3,05:1 | 3,45:1 |
| Pagination désactivée, observée séparément | 5,47:1 | 7,93:1 |

Le × de suppression panier clair mesure 3,13:1. Le diagnostic générique le classe comme un nœud textuel; son usage est une icône nommée « Retirer… », avec seuil 3:1. Sa couleur héritée a néanmoins été signalée pour uniformisation. Les chiffres de ce tableau ne couvrent pas toutes les étapes internes du moteur de dessin, contrôlées séparément ci-dessous.

### Dessin profond : défauts détectés après la première entrée

Quarante états et journaux ont été conservés dans `drawing/CONTRAST-SAMSUNG.json` : entrée, tracé réel de trois points, cotes, face, matière et menus, puis changement du thème OS pendant l’édition. Les captures du tracé et de la finition sombres ont réellement été ouvertes.

| Écart mesuré | Ratio constaté |
|---|---:|
| Texte des contrôles de tracé sur fond blanc sombre | 1,09 à 1,78:1 |
| Récapitulatif d’angle clair avec texte clair sombre | 1,03:1 |
| Identifiants A/B des segments, clair et sombre | 4,25:1 |
| Contours de champs de cotes/finition sombres | 1,74 à 1,98:1 |
| Recherche des choix dans l’iframe sombre | 2,01:1 |
| Indication du statut final sur fond blanc sombre | 1,78:1 |

Les vignettes de choix de face possèdent également des traits pâles et une étoile jaune sur fond blanc : leur signification et le contour de sélection doivent être examinés, sans traiter chaque trait de dessin comme un simple pictogramme décoratif. Le contour significatif et l’indicateur de face doivent rester lisibles.

Le choix « système » a été vérifié avec une préférence OS claire puis sombre. Le changement OS pendant l’édition révèle encore une couleur de corps d’iframe figée : après passage à clair, le parent est `#f4f5f2`, le dataset de l’iframe indique clair, mais son corps reste `#151718`. Cet écart n’est pas couvert par les quatre contextes de démarrage corrects.

### Désactivation recommandée

Sombre : texte `#909994` sur `#2b2f31` = 4,61:1; contour `#76817a` sur ce fond = 3,34:1. Clair : texte `#56645c` sur `#eef1ed` = 5,47:1; contour `#6d7c72` = 3,86:1. Les éléments doivent conserver un vrai état désactivé et une opacité de 1; le moteur de dessin hérite sinon d’un `button:disabled{opacity:.5}`. Les valeurs proposées ne remplacent pas les exemples réellement mesurés après intégration.

### Recontrôles des corrections

`after-wide1/` répète 568 rendus/panneaux et huit journaux à 360/430 px, deux rôles, clair/sombre : aucun couple faible, erreur de scénario ou JavaScript; sources stables. Le symbole de retrait du panier a été uniformisé.

`disabled2/` exécute les quatre variantes de thème avec un calendrier borné, une option indisponible et la validation sans date du vrai composant : douze rendus et quatre journaux, aucun couple faible ni erreur du harnais/JavaScript. Les contraintes et l’option sont des fixtures locales sans écriture serveur.

| État réel | Clair | Sombre |
|---|---:|---:|
| Jour indisponible et option avec `disabled`, opacité 1 | 5,47:1 | 4,61:1 |
| Message « Choisissez une date. » | 6,53:1 | 8,39:1 |

Les trois captures représentatives (erreur claire/sombre, option indisponible sombre) ont réellement été ouvertes. Les attributs désactivés sont conservés, et les jours indisponibles sont également barrés.

`drawing2/` corrige les contrôles de tracé, le footer, les identifiants et les contours. Le changement système pendant édition corrige maintenant aussi le corps de l’iframe. Le dernier texte faible est A–B sur le fond propre d’un paragraphe (1,03:1); il reste à recontrôler après correction.

Les valeurs brutes des paths SVG restent conservées. Elles ne tiennent pas compte d’un canvas interne ou d’un contour d’une autre couleur : la vignette Face a réellement été examinée dans les deux thèmes et ses contours significatifs sont distingués des traits secondaires. Aucun calcul sur le seul fond du bouton ne sert à déclarer un échec global de ces illustrations.

### Derniers contrôles ciblés

`target-angle/` mesure le correctif complet de la ligne A–B / 90° : six rendus et deux journaux, aucun couple faible ni erreur, empreintes stables. La valeur 90° a un contraste réel de 13,53:1 en clair et 12,87:1 en sombre. Les contrôles de tracé et les cotes restent lisibles.

`target-team/` confirme les boutons Présent/Absent charcoal en sombre; `target-disabled/` confirme de nouveau les douze états d’indisponibilité et erreur dans les quatre variantes. Ces passes ne comportent aucun couple faible ni erreur et conservent chacune leurs propres empreintes de sources.

Le calcul contextuel des vignettes Face, conservé dans `face-canvas-review.json`, donne 8,68:1 pour le trait significatif du profil et 12,86:1 pour le contour de l’étoile sur leur vrai canvas `#f1f5f2`. Les faibles valeurs du trait secondaire et du remplissage jaune sont conservées; elles ne portent pas seules l’information, et ne sont pas substituées au contraste des contours significatifs.

Les 32 rendus des panneaux adaptatifs à 200 % (`target-dense/`) ne relèvent aucun couple faible ni erreur. Les textes calculés de 32 px sont enregistrés dans les observations; les trois familles de panneaux ont été réellement inspectées dans leurs captures.

Le vrai gestionnaire natif `showError`, exécuté en simulation Chromium par Mobile, a produit une alerte de verrouillage visible. Les captures claire et sombre ont réellement été ouvertes. Les couples du composant sombre sont effectivement `#ffb4a8` sur `#3a2525` (8,39:1), et `#f4f5f2` sur `#1f2224` pour le masque (14,62:1). Preuves `samsung-mobile-unlock-fixed/` et `samsung-mobile-lock-dark/`; aucun succès de biométrie physique n’en est déduit.

Ces contrôles ne certifient pas la WebView ni le Samsung physique et ne constituent pas un audit global de conformité WCAG.

## Nouveaux écrans approuvés : Accueil Liste Nette / Punch Cadran

Les deux références originales ne sont pas disponibles dans le contexte de cette expertise; leur comparaison est faite par la coordination. Les valeurs suivantes proviennent du nouveau rendu exécuté, pas d’une lecture supposée des photos originales.

| Élément du cadran réellement mesuré | Clair | Sombre |
|---|---:|---:|
| Icône Play après correction | 6,47:1 | 8,58:1 |
| Icône Stop sur rouge fonctionnel `#c43d32` | 5,17:1 | 5,17:1 |
| Anneau/aiguille verts contre le fond réel du cadran | 5,91:1 | 8,58:1 |
| Texte HH:MM:SS | 14,08:1 | 16,43:1 |

Le premier défaut Play à 2,38:1 / 1,91:1 et sa correction restent tracés dans `cadran-smoke2/` puis `cadran-smoke3/`. Le diagnostic SVG utilise le fond adjacent réel de la forme, y compris le conteneur rond coloré; les seuils restent identiques.

Le contraste nominal de l’aiguille ne suffit pas à prouver sa visibilité. Une analyse des pixels aux quatre quadrants a détecté des morceaux sous les textes et des longueurs variables : 82 / 32 / 66 / 32 px sur un cadran de 280 px. `cadran-smoke3/needle-pixel-review.json` conserve les observations. La retouche visant 30–45 px nets dans la couronne est encore à recontrôler.

Mouvement réduit : transition calculée à 0 s, compteur encore mis à jour; mode normal : 0,18 s. Le rattrapage de rotation observé par Mobile après réouverture reste une réserve distincte, même si l’attribut d’angle est correct.

Messagerie remplie après correction : `target-populated2/` ne relève aucun couple faible ou erreur sur seize rendus et quatre journaux. Lien job 6,47 / 7,64:1; badge PDF 13,53 / 12,87:1. Les captures des deux thèmes ont réellement été ouvertes.


## Recontrôle final du cadran standard

`cadran-final1/CONTRAST-SAMSUNG.json` : 432 rendus, 24 journaux, 10 776 couples, deux rôles × trois largeurs × quatre variantes; aucun couple faible, échec du harnais ou erreur JavaScript. Empreintes avant/après identiques. Les captures des nouveaux Accueils, des six angles, du focus, du transfert vert, de l’attente et du thème système ont réellement été ouvertes.

| Couple réel | Clair | Sombre |
|---|---:|---:|
| Anneau et aiguille / fond du cadran | 5,91:1 | 8,58:1 |
| Play et transfert vert | 6,47:1 | 8,58:1 |
| Stop blanc / rouge fonctionnel | 5,17:1 | 5,17:1 |
| HH:MM:SS / fond | 14,08:1 | 16,43:1 |
| « Début à… » / fond | 5,69:1 | 10,12:1 |
| Focus 3 px / fond adjacent | 5,91:1 | 8,58:1 |
| Icône désactivée, observée séparément | 5,47:1 | 4,61:1 |

La retouche d’aiguille est désormais réellement vérifiée dans les pixels : 45/44/30/32/29/45 px à 360 px pour 0/45/90/180/270/360°, puis 45/45/30/33/30/45 px à 390/430 px. Aucun fragment central ne subsiste. La variation 29–30 px à 270° est acceptée par la coordination car la portion est visible et contrastée. Les données de 144 captures sont conservées dans `cadran-final1/needle-pixel-review.json`, avec la méthode et la réserve de superposition des marqueurs d’anneau aux axes.

Mouvement réduit : 0 s de transition, compteur actif; système clair↔sombre effectif sans changement de `started_at`. La réserve de reprise normale est corrigée et vérifiée séparément par Mobile : angle rendu 90° à 35 ms, compteur 01:15:00, preuve `samsung-mobile-dial-resume-fixed/dial-review.json`. L’image correspondante a réellement été ouverte ici.

Cette conclusion porte sur le CSS `357daf81930f48b9396c78a14f16568f2d326d575415de2a6158ba7cc27750b0`, les vues `f6fd44c807d2fad1700e2fedb40b01fa3c8f7251c469ec76bfd7e73a8cc552d9` et le runtime `89ad62bfacbecbff2dad68b96722091adaf58182f0715a00fe6f42866baea58e`. L’adaptation dense 200 %/faible hauteur évolue ensuite et conserve sa propre recette; aucune conformité physique Samsung ou WCAG globale n’est déduite de ces ratios.


## Deltas finaux exécutés

Les reprises ciblées stables sont détaillées dans `final-delta-review.json` : standard 48 rendus / 1 200 couples; dense 200 % 156 / 3 672; défilement à faible hauteur 12 / 160; façade et vraie feuille du choix d’Accueil 48 / 1 554. Aucun couple faible, erreur JavaScript ou échec du harnais n’est relevé. Les quatre passes conservent leurs empreintes propres. Une passe antérieure faible hauteur ayant subi une modification applicative pendant son exécution reste diagnostique et n’est pas utilisée comme preuve de gel.

| Dernier choix d’Accueil | Clair | Sombre |
|---|---:|---:|
| Titre de la job | 15,41:1 | 14,62:1 |
| Caption JOB | 6,23:1 | 9,01:1 |
| Option sélectionnée | 12,82:1 | 11,54:1 |
| Focus | 6,47:1 | 7,64:1 |

Les images ont réellement été ouvertes. Le panneau de cadran dense conserve les couples de fond/texte du tableau précédent; une durée fictive de 125 h reste lisible. À 844×342, le dialogue est défilable : hauteur utile de 310 px, contenu de 471 px, défilement de 0 à 161 px réellement effectué, bas du cercle et heure de début récupérés. Le cercle complet n’est pas annoncé comme visible simultanément à cette hauteur.

Dernière CSS examinée `33ff66adb812b5675ea6df74178254338b30192dc22436e4f4df7c0faec4876b`; vues `0e8da55be5ea20476bdc43092b3e4cf5b0d9e7ac0ff6d1780489d8cc0b1046e8`. Les anciennes matrices et chaque delta restent rattachés à leur propre empreinte. Aucune réserve couleur bloquante détectée dans les scénarios exécutés; aucune certification Android physique ou conformité WCAG globale déduite.


### Dernier gel : métadonnées du choix d’Accueil

L’intégrateur a ensuite ajouté le préchargement des métadonnées des jobs autorisées, en réutilisant le RPC et le cache existants. La limite de fixture signalée ci-dessus est corrigée dans le rendu final : dès la première ouverture de la feuille, « JOB 454 · Pavillon du Parc · 20, rue Exemple, Lévis » est présent avant de choisir cette job. Les nouvelles captures claire Chef 360 px et sombre Employé 390 px ont réellement été ouvertes.

`home-choice-frozen/` reprend uniquement ce dernier delta : 48 rendus, 12 journaux, 1 554 couples, deux rôles, trois largeurs, clair/sombre. Aucun couple faible, erreur JavaScript ou échec du harnais; les dix empreintes sont stables. La couleur et le focus restent aux valeurs du tableau précédent. Le dernier `chantier-app.js` examiné mesure `097431fa730e8ded701020cb72f1e90bab9738f2b8edc9e7254ec2b1018e437a`; vues, runtime et CSS restent respectivement `0e8da55be5ea20476bdc43092b3e4cf5b0d9e7ac0ff6d1780489d8cc0b1046e8`, `d8bf3f68868f0f2b5e0d47af0ad3260e8f4ef4573918a8b2b10a0337b6386f71` et `33ff66adb812b5675ea6df74178254338b30192dc22436e4f4df7c0faec4876b`.

La preuve reste locale avec données fictives. Elle lève la réserve de présentation des métadonnées dans cette fixture et ne prétend pas remplacer la vérification des droits serveur. Aucune réserve couleur bloquante restante dans les composants et états examinés.
