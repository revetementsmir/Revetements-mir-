# Ergonomie mobile et accessibilité — chantier Employé/Chef

## Ce qu’il faut faire

Rendre les actions de chantier compréhensibles sans connaître le portail existant. Les deux rôles partagent cinq destinations stables; les actions d’équipe restent des ajouts autorisés du Chef. Cette expertise lit le code et vérifie le rendu; le full-stack reste le seul intégrateur du code.

## Les étapes

1. Méthode Atelier Ergonomie 1.0.0 réellement lue. Audit du checkout `codex/refonte-chantier-employe-chef`, base `24d29734d68cd3da23c17be8693ddba08abff19f`.
2. Captures initiales exécutées sur Chromium avec deux jobs fictives et un scénario Employé/Chef, à 360/390/430/768/1024/1440 px. Les captures 390 px des deux rôles ont réellement été ouvertes. Aucun serveur hébergé ni compte personnel utilisé.
3. Transmettre les prescriptions ci-dessous à l’intégrateur, puis rejouer les scénarios après intégration, avec clavier simulé par réduction de viewport, grand texte et thèmes.

## Constats initiaux vérifiés

| Constat | Conséquence pour un débutant | Correction requise |
|---|---|---|
| Le menu supérieur masque la navigation principale; les destinations diffèrent entre Employé et Chef. Aucune barre basse stable n’apparaît sur les captures initiales. | Il faut mémoriser le menu et chercher à chaque changement d’outil. | Cinq onglets toujours dans le même ordre : Accueil, Commande, Punch, Message, Plus. Le détail d’une job conserve l’onglet d’origine et un retour explicite. |
| En-tête en deux rangées : Mon compte, Mon dossier, Menu, nom/rôle, réglages et déconnexion. | Les commandes fréquentes restent sous une importante zone de chrome et les contrôles se répètent. | Un seul en-tête court : logo, panier, avatar. La fiche compte contient nom/rôle, Réglages et Déconnexion séparée. |
| Le bouton flottant Aide masque du contenu dans les captures initiales 390 px. | Une information ou une action peut se trouver derrière le bouton. | Déplacer l’aide dans Plus; aucun flottant concurrent au contenu ou à la barre basse. |
| « Terminer ma journée » ouvre un rapport Chef, tandis que la fermeture du pointage est une autre action. | Le terme peut être compris comme la fin du Punch. | « Préparer le rapport » / « Envoyer le rapport » distincts de « Terminer le pointage ». Conserver l’explication et les règles serveur. |
| Les libellés PUNCH IN/PUNCH OUT reposent sur un vocabulaire technique. | L’état/action exige une interprétation. | « Commencer » / « Terminer », avec état courant, heure de début et chantier affichés avant l’action. |
| La correction de pointage possède déjà des champs conditionnels. | Une refonte purement décorative pourrait réafficher tous les champs et alourdir la demande. | Conserver le contrat et le caractère progressif : journée/type d’erreur, puis seulement date/heure/job/segment utiles et explication. |
| Les formulaires d’absence et de dépense demandent beaucoup d’informations au premier affichage. | La page peut être perçue comme une tâche administrative complexe. | Ouvrir par une action courte; distinguer brouillon et envoi réel. Horaires uniquement pour une portion de journée; reçu avant les détails secondaires si le contrat le permet. |

## Prescriptions de parcours

- **Accueil** : date et météo compactes, job active + adresse et Itinéraire, statut Punch conduisant au même onglet Punch, notifications ouvrant leur véritable objet, Plans/Photo/Problème, Mes chantiers. Une notification ne devient ni message ni demande métier. Sans affectation, expliquer et proposer l’aide; ne pas afficher une job inventée.
- **Commande** : trois entrées distinctes Magasin, Banque de pliages, Dessiner une moulure. Quantité obligatoire avant Ajouter. Panier commun comptant les lignes, pas des quantités hétérogènes. Confirmer doit montrer le contexte chantier et un récapitulatif; attendre le reçu serveur avant retirer seulement les lignes confirmées. En erreur, conserver contenu et saisie; le suivi reste accessible après réussite.
- **Punch** : action principale unique selon l’état. Changer de job et Déplacement sont des actions explicites, jamais induites par Itinéraire. « En attente de synchronisation » reste distinct d’« Enregistré ». « J’ai oublié de puncher » et « Mes heures sont incorrectes » ouvrent le traitement de correction existant.
- **Message** : libellé de conversation et job visibles; retour vers la liste prévisible. Zone de saisie + Envoyer à portée avec le clavier ouvert. L’erreur conserve le brouillon, la PJ et le fil courant. Ne pas afficher un simple succès local comme reçu par l’Adjointe.
- **Plus** : liste courte de tâches familières; Mes heures, Banque d’heures, Congés et absences, Dépenses et reçus, Bris d’outil, Mes chantiers et documents, Aide. Équipe/présences/tâches/rapport disponibles au Chef sans nouveau droit salarial.
- **Job** : nom/numéro/adresse, retour et quatre actions terrain visibles. La job ouverte préremplit les formulaires. Une seule référence de dossier; auteur/date/pièces jointes/état/réponses du même objet. Ne jamais demander de retaper le nom du chantier connu.
- **Bris d’outil** : même formulaire depuis Plus et la job; outil, problème, photo facultative, chantier, urgence. Aucun numéro de série obligatoire. « Peut attendre », « Remplacement demandé aujourd’hui », « Travail bloqué » expriment le besoin, sans promettre une livraison.

## Règles de composants et vérifications attendues

- Champs à libellé explicite, `inputmode` adapté (quantité, argent, téléphone), saisie 16 px minimum sur téléphone, zones tactiles d’au moins 44 × 44 px. Les icônes seules ont un nom accessible.
- `aria-current` sur l’onglet actif; état jamais porté par la couleur seule. Un titre principal par écran, titres/ordre de focus cohérents, retour du focus après fermeture d’un dialogue.
- La validation native/serveur reste visible près du formulaire et ne ferme pas la saisie. Désactiver seulement l’action en cours; prévenir le double envoi et rendre Réessayer explicite.
- Dialogues à hauteur de viewport dynamique avec défilement intérieur; bouton de fermeture accessible. Ne pas cacher l’erreur ou Envoyer derrière le clavier, la barre basse ou une zone système.
- Contraste texte courant ≥ 4,5:1, grand texte ≥ 3:1, contrôles/focus visibles ≥ 3:1. Vérifier clair/sombre/contraste renforcé avec texte agrandi, pas seulement la palette de base.
- Aucun tableau comprimé à 360 px. À 200 % de texte, les libellés peuvent occuper deux lignes et les contrôles s’agrandissent sans coupe.

## Comment savoir que c’est terminé

Les cinq destinations et le dossier job doivent être réellement parcourus après intégration à 360/390/430 px dans les deux rôles, sans débordement horizontal. Les cibles, contrastes, thèmes, grands textes et viewport clavier doivent être mesurés; les défauts corrigés doivent être rejoués. Les erreurs/réessais doivent conserver la bonne job et la saisie.

## Première revue du rendu intégré — écarts transmis pour correction

Les cinq onglets, dossier job, conversation avec l’Adjointe et formulaire Bris d’outil en erreur ont été parcourus dans Chromium à 360/390/430 px, pour les deux rôles et les styles clair/sombre/texte agrandi, avec `tests/helpers/mir-field-fixture.cjs`. Le jeu donne deux jobs fictives distinctes. **144 rendus mesurés et 18 journaux de page** ont été conservés (162 enregistrements); aucun débordement horizontal ni erreur JavaScript dans ce premier passage. La simulation de refus serveur conserve « Ne démarre plus. » dans la saisie du bris.

Les captures des cinq onglets des deux rôles à 390 px, du dossier, du message avec viewport réduit et du formulaire en erreur ont réellement été ouvertes. Cela a permis de relever des écarts que les seuls contrats fonctionnels ne montrent pas :

1. **Message et clavier — P1.** À viewport 450 px de hauteur, le composeur commence vers y403 et le bas reste à y449, alors que la barre basse commence vers y379 : il est masqué par la navigation. En texte agrandi son bas atteint y487, hors du viewport. Le correctif doit viser le vrai formulaire `#message-form` et `.chat-compose`; le sélecteur initial `.message-composer` ne correspond pas au DOM. La visibilité doit être vérifiée en tenant compte des recouvrements, pas seulement de `innerHeight`.
2. **Thème sombre — P1.** Avatar avec initiales claires sur fond clair : contraste **1,01:1**. Plusieurs surfaces héritées de Message restent blanches avec texte clair (titre **1,08:1**). La croix de fermeture du dialogue et le contexte job du formulaire souffrent de la même collision. Les captures rendent les textes presque invisibles. Le jeton de fond terrain doit suivre le thème (`--mir-page`) et les classes de message réelles doivent être couvertes.
3. **Onglet actif — P1 de lisibilité.** Texte vert `rgb(52,133,17)` sur `rgb(243,245,241)` : **4,25:1**, sous le seuil de 4,5:1 pour ce petit libellé. Garder l’état actif avec un vert plus sombre en clair et une combinaison vérifiée en sombre.
4. **Pièce jointe — P2.** Le contrôle de sélection de PJ mesure 42 px de largeur dans ce premier rendu, à porter à au moins 44 px ou à entourer d’une cible de sélection équivalente mesurée.

Ces écarts sont transmis à l’intégrateur. **Cette première revue n’est pas une validation de livraison.** Preuves : `artifacts/chantier-redesign/ergonomie/after/audit.json` et les PNG `employee/chef-{light,dark}-{day,command,punch,messages,more,job,tool-error}-390.png`. Le premier booléen de visibilité clavier enregistrait le viewport seulement; les captures démontrent aussi le recouvrement de la barre. Le recontrôle corrige cette mesure pour intégrer le rectangle de navigation.

## Premier recontrôle et formulaires

Le même parcours de 144 rendus a été rejoué après correction, sans affaiblir les seuils : avatar, contexte job, croix du dialogue et surfaces Message sont devenus lisibles en sombre; le contraste des onglets actifs passe le seuil. Le composeur est visible à hauteur réduite 450 px, avec navigation masquée pendant la saisie, pour les 18 combinaisons rôle/format/style. La hauteur physique simulée a été fixée à 844 px pour distinguer le clavier d’un simple changement de taille d’appareil. Le résultat reste un contrôle Chromium, pas un clavier Android certifié.

Sur les formulaires, un passage 390 px clair/sombre/grand confirme :

- Corps et champs passent réellement de 16 à 19 px en texte agrandi; libellés de navigation 12,8 → 15,2 px.
- Le formulaire d’absence est replié par défaut et masque De/À pour une journée complète.
- Changer « Problème chantier » vers « Outil brisé » garde la note, la photo sélectionnée et la job 353.
- Une erreur simulée conserve la saisie et rend Réessayer possible, sans enregistrer de succès serveur fictif.

Écarts supplémentaires transmis : contraste de l’anneau focus clair **1,92:1** (couleur139/196/154 sur250/250/247), sous le seuil 3:1; statut de brouillon Message sombre **3,28:1**, sous 4,5:1. Le contrôle de PJ reste 42 px dans cette révision. Le lien d’évitement est désormais visible et lisible au focus en sombre.

**Arrivée oubliée sans pointage existant : cas bloquant reproduit.** Dans les trois styles, le formulaire de correction propose `missing_in`, mais le sélecteur de journée reste obligatoire avec zéro option quand aucune semaine/shift n’existe. La demande ne peut pas être envoyée. Ce constat a été transmis au full-stack et au coordinateur pour vérification du contrat serveur; retirer `required` sans traiter ce contrat ne serait pas une correction suffisante.

Preuves du recontrôle : `artifacts/chantier-redesign/ergonomie/recheck-1/`; formulaires/focus : `artifacts/chantier-redesign/ergonomie/forms/audit.json` et PNG associés. Scripts éphémères sauvegardés dans ce même répertoire de preuves. Ces écarts attendent leur recontrôle final avant toute validation ergonomique de livraison.

## Recontrôle final des écrans principaux

Le dernier passage conserve **240 états rendus et 30 journaux de page** : huit états (les cinq onglets, dossier job, conversation avec clavier simulé et formulaire Bris d’outil en erreur), deux rôles, trois largeurs 360/390/430 px et cinq styles (clair, sombre, grand texte, sombre agrandi, contraste renforcé). Le nouveau parcours est explicitement activé par `fieldExperienceEnabled: true`; les tests de compatibilité de l’ancienne interface ne servent pas de preuve de cette refonte.

Résultat sur ce périmètre : aucun débordement horizontal, aucune cible active mesurée sous 44 × 44 px, aucun texte visible détecté sous le seuil applicable, aucun composeur hors de la zone disponible ni erreur JavaScript. Une simulation de clavier conserve la hauteur physique à 844 px et réduit le viewport à 450 px; le composeur et Envoyer restent visibles, la barre basse se masque pendant la saisie. Le lien d’évitement déplacé hors écran est exclu du contraste au repos, puis vérifié séparément au focus : son état réellement visible est lisible. Ce contrôle ciblé ne remplace pas un audit WCAG complet.

Les cinq captures finales 390 px de chacun des deux rôles ont réellement été ouvertes, ainsi que le dossier sombre, le composeur sombre agrandi et le bris en erreur. Les cinq destinations ont des contenus distincts et l’état actif correspond à la page. Les captures pleine page peuvent montrer la barre fixe au milieu d’une longue image; la recette de défilement et le viewport, plutôt que cette seule image, déterminent si une action reste accessible.

| Vérification | Résultat final local |
|---|---|
| Surfaces sombres, avatar et onglet actif | Lisibles après correction; défauts initiaux rejoués |
| Focus clavier sur surface claire | Anneau `#31573b` sur `#fafaf7` : **7,85:1** |
| Focus clavier sur surface sombre | Anneau `#9bd48c` sur `#1e2b22` : **8,56:1** |
| Préférence grand texte de l’application | Corps/champs 16 → 19 px; navigation 12,8 → 15,2 px |
| Pièce jointe Message | Cible portée à au moins 44 × 44 px |
| Formulaire d’absence | Replié au premier affichage; horaires masqués pour une journée complète |
| Passage Problème → Outil brisé | Note, photo et contexte job 353 conservés |
| Bris refusé par le serveur simulé | Note conservée, erreur visible, nouvel essai possible; aucun succès inventé |
| Météo après réponse retardée de 250 ms | Service et DOM affichent `8 °C · Ciel variable`; plus d’attente permanente |
| Arrivée oubliée sans journée existante | Le formulaire impossible est remplacé par une demande au vrai fil privé de l’Adjointe avec job/date; aucun pointage créé automatiquement |

Preuves finales : `artifacts/chantier-redesign/ergonomie/final-snapshot/audit.json` et PNG associés; formulaires et focus : `forms-snapshot/audit.json`, `forms-snapshot/contrast-summary.json`; météo : `forms-snapshot/weather.json`. Les fichiers `final-verified/` et `forms-final/` conservent les passages précédents. Les réponses serveur de ces preuves sont des **fixtures locales** : elles ne certifient pas les données hébergées, la réception par un compte Adjointe réel ou les permissions SQL.

## Revue secondaire et corrections finales

Un deuxième snapshot figé à **05:26:30 UTC** a servi à vérifier **40 rendus et 5 journaux de page**, pour le Chef à 390 px et les cinq styles. Les écrans secondaires communs à Employé sont couverts par leur même implémentation. Le harness enrichit temporairement la fixture avec deux journées anciennes (2025 et 2024), deux jobs, segments et un article de commande autorisé; aucun fichier de fixture suivi n’a été modifié par cette expertise.

Parcours exécutés : première page d’historique, deuxième page, correction d’une ancienne journée, absence progressive, dépense progressive, rapport Chef, Matériel/Problèmes et signalement d’un article lié à la commande. Le bouton de pagination transmet son curseur; la demande de correction présélectionne `old-shift-1`; la dépense présélectionne la job 353 et replie les détails secondaires. Le label associé à la case du rapport est réellement cliqué et active la case : la cible mesurée est le label, pas seulement son petit carré. Un signalement de livraison sans article lié est refusé; l’article simulé a été ajouté pour examiner ensuite le vrai formulaire.

La première revue a trouvé des onglets Matériel presque invisibles en sombre (**1,11:1**) et deux summaries Dépense de **24/28,5 px** de hauteur. L’intégrateur a corrigé le thème des onglets, porté les summaries Dépense/Absence/Détails à au moins 44 px avec chevrons et ajouté l’année aux anciennes dates. Le recontrôle ne trouve plus de faible contraste, petite cible active, débordement horizontal, collision de navigation ou erreur JavaScript. Les captures finales Matériel, dépense, rapport Chef et historique montrant 2024/2025 ont réellement été ouvertes.

Preuves avant : `secondary-final/audit.json`; après : `secondary-recheck/audit.json` et PNG. Ce passage vérifie la présentation et les interactions locales. Il ne prouve pas un envoi de rapport hébergé ni la réception réelle d’un signalement par un autre rôle.

## Provenance et reproductibilité

Les sources et la fixture sont copiées en snapshots immuables avant les dernières recettes. Les empreintes de tous les fichiers sont comparées avant/après copie; aucune modification pendant la copie n’a été acceptée. Manifeste principal : `artifacts/chantier-redesign/ergonomie/source-snapshot.json` (05:14:15 UTC, HEAD observée `f2e96712d41aee144f3d8825196a711756a56dff`); manifeste secondaire : `secondary-recheck-source-snapshot.json` (05:26:30 UTC). Ces empreintes décrivent le code local consommé, pas une tête distante finale déjà certifiée.

Scripts conservés : `audit-after.cjs`, `audit-200.cjs`, `audit-forms.cjs`, `audit-weather.cjs`, `audit-secondary.cjs`. Ils acceptent `MIR_UX_DIST` et `MIR_UX_FIXTURE` pour désigner le snapshot et `MIR_UX_OUT` pour le répertoire de résultats. Les requêtes externes sont bloquées; la météo est explicitement simulée. Chromium utilisé : `/usr/bin/chromium` 155.0.8059.79, Playwright de l’environnement local.

Après le dernier snapshot, la lecture du diff relève des changements du propriétaire de pliage et de l’acquittement du panier partagé dans `chantier-app.js`/`production-app.js`. Ils doivent être vérifiés par la recette fonctionnelle panier sur la tête finale; ils ne modifient pas les formulaires secondaires mesurés. Aucun fichier app ou test suivi n’a été édité par cette expertise.

## Limites et contrôles supplémentaires

- La préférence « grand texte » de 19 px ne constitue pas un test à 200 %. Un passage séparé à 200 % réel (32 px pour le corps) démontre un défaut : les libellés de la barre basse se chevauchent dans 42 des 48 rendus, malgré zéro débordement `scrollWidth`. Le contrôle utilise les rectangles du texte (`Range`), en plus du défilement. Les six autres rendus masquent la barre pendant le clavier. Le P1 est corrigé par retour à la ligne des libellés, hauteur automatique et réserve de contenu. Le recontrôle des mêmes 48 rendus ne relève plus de collision; la nouvelle capture a réellement été ouverte. Preuves avant : `text-200-before/audit.json` et `text-200/employee-zoom200-day-390.png`; après : `text-200-recheck/audit.json` et PNG associés. Le contrôle a ensuite été élargi aux deux rôles sur sources figées : **96 rendus et 12 journaux**, sans collision, débordement, petite cible active, faible contraste ou composeur caché. Preuves finales : `text-200-snapshot/audit.json`; la capture Chef sombre Commande a réellement été ouverte. Ce passage simule 200 % de texte dans Chromium et ne certifie pas le réglage Android natif.
- Le document principal et les formulaires cités sont couverts. Les contenus internes de l’iframe Dessiner une moulure sont exclus de ces mesures. Leur revue et leurs corrections sont suivies séparément dans `HARMONISATION.md`; le présent rapport ne les certifie pas.
- Le traitement du premier Punch oublié est une demande manuelle au bureau dans le fil existant. Il ne faut pas annoncer que le workflow canonique de correction sans aucune journée est terminé.
- Mes heures conserve la semaine et la banque existantes et ajoute désormais un historique paginé. Deux anciennes journées, leurs segments, un déplacement, une semaine verrouillée, une correction et la sélection de la bonne journée dans la demande de correction sont vérifiés localement ci-dessous. Le stockage hébergé et les règles métier de correction nécessitent leurs propres preuves backend.
- Le texte Punch annonçant une confirmation serveur avant tout pointage a été signalé puis reformulé. Le sélecteur natif coupant nom/adresse reste une réserve de présentation transmise à l’intégrateur. Le statut réel reste « Prêt à commencer » et aucune opération serveur n’est déclenchée par l’itinéraire dans ces essais.
- Le clavier Android réel, la WebView, le retour système, la rotation et la recette Samsung physique restent des niveaux distincts. Chromium ne les certifie pas. La mesure de contraste automatisée est ciblée sur les textes et les fonds rencontrés, sans revendiquer une conformité globale ou une validation de tous les composants partagés.

## Détails pour le chat

Preuves initiales : `artifacts/chantier-redesign/ergonomie/before/before-{employee,chef}-{width}.png`. Commande exécutée : `MIR_TODAY_BEFORE=1 MIR_TODAY_PROOF_DIR=artifacts/chantier-redesign/ergonomie/before NODE_PATH=/workspace/Revetements-mir-pr31/mobile/node_modules MIR_CHROMIUM_BIN=/usr/bin/chromium node tests/mir-today-browser.cjs` — réussie.

Mission Atelier préparée et confirmée par le coordinateur : `67fadcb8-d581-44a0-a643-e284452a8a82`, version 1. Le coordinateur actualise son résultat après les recontrôles, sans écritures concurrentes de cette expertise.

Les contrôles après intégration ci-dessus sont exécutés. Les réserves explicites doivent rester visibles dans la livraison; aucune conformité globale ni recette Android physique n’est revendiquée. Le parent coordonne la sauvegarde Atelier et les missions; ce rapport local ne prouve pas une synchronisation de résultats finaux. SEO/GEO : non applicable, application privée de chantier; protections publiques et permissions conservées.
