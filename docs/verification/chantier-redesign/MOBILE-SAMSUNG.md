# Recette Samsung — hauteur utile, choix et chronomètre

## Ce qu’il faut faire

Corriger les écrans Employé/Chef signalés sur Samsung en conservant l’application installée, sa session, ses données et les moteurs métier. Commande, Magasin et Punch doivent présenter leurs actions principales sans défilement de page en portrait standard; les petits paysages, claviers et textes agrandis doivent conserver un parcours complet par étapes ou vues secondaires.

Cette expertise lit les sources et remet ses constats au seul intégrateur full-stack. Aucun code applicatif, test, clé ou serveur n’est modifié par cette revue.

## Les étapes

1. Relire le contexte et conserver les mesures/captures initiales.
2. Vérifier hauteur utile, zones système, clavier, choix MIR et retour Android.
3. Vérifier le chronomètre à partir des horodatages confirmés, puis les reprises et refus.
4. Recontrôler les sources intégrées, les captures natives de la nouvelle CI et les limites Samsung physiques.

## Comment savoir que c’est terminé

- Commande, Magasin et Punch tiennent dans la hauteur utile en portrait standard sans cacher des produits ou actions.
- Les choix applicatifs utilisent le même composant MIR, y compris dans le dessin; annulation, clavier, focus et retour conservent les valeurs et le contexte.
- La durée affichée se recalcule depuis un début confirmé; un pointage en attente ne devient pas un faux pointage actif.
- Le même paquet personnel et la clé TEST existante sont conservés. Aucune désinstallation ni suppression de données proposée.
- Les résultats Chromium, WebView accélérée et Samsung physique sont distincts.

## Détails pour le chat

Base relue : `6039306ac76584ee6b06859786c02eef7cfca685`, branche `codex/refonte-chantier-employe-chef`, PR 37 brouillon. Méthode Atelier Mobile Android/iOS/PWA 1.0.0 relue, puis mission `11c984db-ebe5-4227-88c0-29ab4f428b41` **version 4** et cadrage UX `4b001308-b3a8-49c4-9053-17745940f200` **version 14** consultés directement avec réponse serveur. La mission reste une revue coordonnée, pas un verrou technique des autres branches. Le responsable assure le bilan partagé final; cette consultation ne constitue pas une mise à jour de mission.

Aucun AGENTS.md trouvé dans le checkout ni les deux emplacements parents vérifiés. `/dev/kvm` absent : aucun émulateur logiciel local lancé. SEO/GEO non applicable : application métier privée, aucun changement public demandé. Skill Supabase lue pour examiner les contrats d’horodatage existants; aucune requête Supabase effectuée.

### Hauteur initiale réellement mesurée dans Chromium

Le harnais temporaire charge les vrais fichiers `dist`, la fixture QA existante, `mobile/web/team.css` et le style/bandeau exact du bootstrap. Tous les appels réseau externes sont refusés. Il reproduit donc la composition CSS native, mais pas la WebView ni les insets matériels Samsung.

Les hauteurs ci-dessous réservent **48 px par hypothèse explicite** aux barres système : ce sont des scénarios de viewport réduit, aucune mesure de Samsung. Les safe areas CSS valent 0 dans ces contrôles. Ne pas présenter cette réservation comme un relevé Android.

| Largeur × hauteur utile simulée | Commande : hauteur document | Magasin : hauteur document | Punch inactif : hauteur document |
|---|---:|---:|---:|
| 360×732 | 844 | 34515 | 1010 |
| 390×796 | 823 | 31239 | 1010 |
| 430×884 | 884 | 30925 | 1010 |

À 390 px, Punch actif et Déplacement atteignent1048 px, paysage utile 342 px avec un document 1034 px. Aucun overflow global caché n’a été ajouté au harnais. Les captures Commande, Magasin et Punch actif 390 ont réellement été ouvertes : la grande introduction et les filtres du Magasin consomment presque tout l’écran avant les produits; les actions secondaires Punch descendent derrière la barre basse et nécessitent de défiler.

Composition mesurée : en-tête 64 px, bandeau TEST 23 px, barre basse 74 px; réserve haute 68 px, réserve basse **112 px dans la CSS native** contre 88 px dans la CSS web seule. Cela explique pourquoi une simple capture `dist` sans `team.css` ne suffit pas pour vérifier le budget vertical de l’APK. La réserve basse et la hauteur du contenu doivent être cohérentes avec la barre réellement mesurée, avec les insets comptés une seule fois.

Preuves : `artifacts/chantier-redesign/samsung-mobile-before/measurements.json`, `390-command.png`, `390-store.png`, `390-punch-active.png`. Source applicative initiale SHA-256 `a5cc3fe67184e65259f4ba9c663245e9d7dbf913375a9323ae73326d863afe52`.

La prochaine preuve native doit consigner `innerWidth/innerHeight`, `visualViewport.height/offsetTop/scale`, `screen.height`, les rectangles en-tête/TEST/navigation, la densité et la taille système du texte. Le PNG et les rectangles de recadrage du manifeste précédent ne donnent pas seuls la hauteur CSS exacte d’un Samsung.

### Clavier, choix applicatifs et retour

`adjustResize` est déjà présent dans le manifeste Android. Le détecteur existant compare la hauteur visible à 72 % de `screen.height`; il est sensible au zoom, à la rotation et aux changements de zone utile. Conserver une référence hors clavier et tenir compte de `visualViewport.offsetTop`; un changement de hauteur seul ne doit pas cacher la barre ou les actions en paysage.

Le composant de choix commun doit préserver la vraie valeur, les options désactivées, la sélection multiple si présente, les événements `input/change`, les dépendances et la validation `required`. Il doit couvrir les choix `select`, date et heure applicatifs, y compris le document same-origin de l’iframe Dessin. Un contrôle natif encore cliquable sous le composant peut rouvrir le sélecteur Samsung au toucher, au clavier ou via son label : ces trois entrées doivent être exercées.

Retour attendu : fermer le choix MIR actif avant de changer d’écran; annulation sans modifier la valeur; focus remis au déclencheur encore connecté et autorisé. Ensuite seulement, fermer la saisie ou revenir à son parent selon les protections existantes. Le bridge et `MIRFieldBack` doivent partager cette priorité, y compris pour le choix ouvert dans Dessin. Les permissions, la biométrie, le clavier sécurisé et les sélecteurs fichier/caméra restent des interfaces Android.

Les longs choix doivent rester recherchables et accessibles avec clavier; paysage et grand texte peuvent utiliser un panneau secondaire, sans réduire les cibles ou couper la liste. Les formulaires gardent leurs données en cas d’annulation ou de retour depuis un choix.

### Chronomètre : sources et faux succès à éviter

Le rendu initial Punch affiche un début à heure fixe, sans chronomètre : son texte n’a pas changé après 1,1 seconde sur un pointage actif simulé. Les contrats existants fournissent `activeShift.started_at` et `activeShift.segment.started_at`, ainsi que `segment_type` job/travel/warehouse/break. Le début de journée et le début du segment sont donc deux horodatages différents.

Le calcul attendu utilise `Date.now()` et un horodatage confirmé, puis se recalcule à chaque affichage/reprise. Aucun compteur incrémenté, aucune requête serveur chaque seconde. Les temporisateurs peuvent être suspendus lorsque l’écran s’éteint : reprendre doit calculer la différence de dates, sans essayer de rejouer les ticks manqués. Après fermeture réelle ou redémarrage, le snapshot serveur restauré reste la source de vérité.

**Point critique transmis à l’intégrateur :** le chemin hors ligne de `portal-client.punchAction` renvoie aussi `{ok:true,pending:true,serverAt:...}`; son `serverAt` est alors produit par l’horloge locale. Il ne confirme ni un début serveur ni un pointage actif. Seul l’état `activeShift` relu dans le snapshot vérifié autorise le chronomètre actif; une attente reste explicite et ne doit pas fabriquer `started_at` à partir du toucher.

Afficher clairement «durée écoulée» plutôt que promettre des heures payables : la durée de journée, la durée du segment/job/déplacement et le net après les règles de pause sont différents. `auto_break_minutes` est appliqué par le serveur à la clôture selon les règles existantes. Aucune nouvelle déduction locale n’est introduite pour faire coïncider le chronomètre et un total de paie.

La source actuelle rafraîchit le snapshot sur `visibilitychange` lorsque l’écran est disponible et toutes les 45 secondes au repos. La reprise native appelle le SDK Auth; le nouveau calcul visuel doit s’y raccorder sans réécrire l’Auth. L’empreinte SDK reste `0bf114a6500069af54d6698625c521d9c893ed5a6e1e8f6571b2531c587b4ced` au contrôle initial.

### Météo et couches réseau

Le responsable a identifié la CSP native qui omet les deux origines OpenMeteo utilisées par `MIRToday.weather`. La revue indépendante a trouvé deux autres filtres : le wrapper fetch du bootstrap via `Policy.allowedRequest`, puis `MainActivity.shouldInterceptRequest` via `MirPolicy.request`. Ouvrir seulement la CSP laisserait donc les appels bloqués.

Correction transmise : autoriser les hôtes et chemins météo exacts dans les trois couches, sans wildcard ni géolocalisation Employé; conserver les refus production, HTTP, userinfo, hôtes ressemblants et autres services. La météo indisponible doit rester affichée honnêtement en cas d’erreur ou d’absence d’adresse. Aucun appel météo réel exécuté par cette expertise.

### Limites et suite

Les constats ont été transmis directement à l’intégrateur, à Qualité et au responsable. Le recontrôle des nouveaux composants, des nouveaux rendus et de la CI reste ouvert à ce jalon. Aucune recette Samsung physique, aucune nouvelle installation ou clé lue/transmise, aucun APK remis par cette expertise. Les protections de session et la clé personnelle existante restent à conserver.

### Recontrôle de la source cohérente après intégration

Le même harnais de hauteur a été rejoué avec les CSS natives et le bandeau exacts, aux mêmes dimensions. Les neuf combinaisons Commande/Magasin/Punch inactif  × 360/390/430, puis Punch actif et Déplacement à 390, ont un document de la même hauteur que le viewport : **732/796/884 px**, selon le scénario. La réserve haute est maintenant 64 px et la réserve basse 74 px; le statut TEST compact est intégré à l’en-tête. Aucune règle globale `overflow:hidden` n’a été ajoutée au harnais. Les trois captures après 390 ont réellement été ouvertes : entrées Commande, produits/pagination du Magasin, chronomètre et actions Punch visibles entre les deux barres.

Preuves : `artifacts/chantier-redesign/samsung-mobile-after/measurements.json`, `390-command.png`, `390-store.png`, `390-punch-active.png`. La mesure «timer-baseline» de ce harnais géométrique ne constitue pas le test du chronomètre; celui-ci est vérifié séparément ci-dessous.

Le petit paysage 844×342 produit encore un document 586 px. Il reste accessible par défilement; une adaptation par étapes ou vues secondaires n’est pas démontrée par ce résultat. Ce cas est transmis à l’intégrateur et reste ouvert. Les dimensions simulées ne deviennent pas des dimensions Samsung certifiées.

Un second harnais indépendant a exécuté **12 scénarios réussis**, avec fixture locale et réseau externe refusé :

- Journée 2 h et segment Déplacement 25 min distingués depuis leurs deux horodatages.
- Segment Pause 5 min : durée de journée brute inchangée et libellé Pause distinct, aucune déduction de paie inventée.
- Tick sur `Date.now` réel : texte mis à jour, même nœud DOM conservé et aucune écriture Punch.
- Saut d’horloge contrôlé de 75 min avec `visibilitychange` : journée 3 h 15 et segment 1 h 40 immédiatement recalculés, sans rejouer les secondes.
- `pageshow`, aller-retour d’onglets et rechargement de l’interface depuis le même snapshot fictif confirmé.
- État sans pointage : 00:00:00 et début vide, aucun état actif créé.
- Vrai `showError` du bootstrap : alerte publique QA visible après composition native.
- Masque CSS privé visible et contenu masqué; aucune biométrie réelle simulée ou revendiquée.
- Callback exact enregistré par `App.addListener('backButton')` exécuté : choix parent fermé avant la navigation.
- Même callback avec un choix ouvert dans le child Dessin, après un vrai tracé et progression jusqu’à Matière : feuille fermée, iframe conservée, focus rendu au déclencheur et application non minimisée.

Preuves : `artifacts/chantier-redesign/samsung-mobile-runtime/runtime-review.json`, `punch-travel-confirmed.png`, `drawing-after-native-back.png`. Les deux captures ont été réellement ouvertes. Le test parent/child exécute l’adaptateur natif JavaScript exact, avec hôte minimal local; il ne prétend pas avoir délivré une touche physique Android. Le nouveau test instrumenté `pressBack` doit encore passer en CI. Les premiers arrêts du harnais provenaient d’une attente de choix sur l’accueil Dessin et d’un sélecteur d’état zéro inadapté; ils ont été corrigés dans le harnais seulement, sans modifier le code ou une assertion versionnée.

### Échec de l’alerte pendant le verrou : reproduit et ouvert

Le cas combiné a révélé un défaut distinct des douze scénarios ci-dessus. Sous `html[data-mir-device-locked]`, le vrai `showError` du bootstrap écrit encore l’erreur de déverrouillage dans `#portal-main`. Le masque cache ce parent : l’alerte existe mais reste invisible. **L’assertion attendue de visibilité échoue.** Bootstrap examiné SHA-256 `85f33290a3b8fefad8a493c82004f77190eee0e56a80aae4f3693e039ca16784`.

Preuves conservées : `artifacts/chantier-redesign/samsung-mobile-unlock-diagnostic/runtime-review.json` et `locked-error.png`. Correction demandée au seul intégrateur : placer ou relayer l’erreur à l’intérieur du verrou tant que celui-ci est actif, sans dévoiler le contenu privé. Nouveau contrôle requis; aucune recette de déverrouillage complet revendiquée.

Les barres système ne sont pas qualifiées par le seul `meta theme-color` : la source native utilise AppCompat DayNight et un splash historique; aucun raccord explicite de cette balise vers les couleurs de fenêtre Android n’a été trouvé. Contrôle des vrais pixels natifs encore nécessaire.

### Recontrôle après corrections du verrou et du mode dense

Le défaut d’alerte sous le verrou est corrigé par l’intégrateur : `showError` place ou déplace désormais l’alerte à l’intérieur de `#mir-device-lock` lorsqu’il existe. **13/13 scénarios indépendants réussis**, y compris le cas précédemment en échec; le contenu métier reste masqué. La capture `artifacts/chantier-redesign/samsung-mobile-unlock-fixed/locked-error.png` a réellement été ouverte et montre le message public QA. Le rapport `runtime-review.json` du même dossier contient les treize résultats. Bootstrap corrigé SHA-256 `9be0a2d888b613d45f25406f376e80113ddb05f35781d218578d1a8a3e0bbd58`; SDK toujours inchangé.

Le petit paysage utilise désormais une présentation dense avec état, chronomètre, action principale et bouton Actions vers les informations et commandes secondaires. Rejeu sur 844×342 : **hauteur document 342 px**, sans défilement de page. La capture `artifacts/chantier-redesign/samsung-mobile-after-v2/390-punch-landscape.png` a réellement été ouverte; les actions principales et les cinq onglets restent visibles. Le même dossier conserve le tableau des trois portraits qui continuent de tenir dans leur hauteur utile.

Une réserve a été transmise sur l’arrivée depuis le panneau dense en déplacement. L’intégrateur l’a corrigée : «Arriver au chantier» réutilise `travel_arrive` et `next_job_id`. Le panneau a réellement été ouvert sur une fixture pointée au chantier A et en déplacement vers B; le contrôle retrouve la bonne cible B, sans exécuter de pointage. Après défilement du panneau secondaire, le bouton se trouve entre72,25 et129,25px dans342px utiles; la capture a réellement été ouverte. Preuves : `artifacts/chantier-redesign/samsung-mobile-dense-actions-v2/measurements.json` et `dense-actions-travel.png`. Les actions secondaires restent dans ce panneau accessible, aucune action serveur remplacée par un succès local.

Ces résultats ferment les deux défauts locaux documentés ci-dessus. Ils ne certifient ni une touche physique Android, ni un déverrouillage système réel, ni un redémarrage Samsung. La nouvelle CI instrumentée et la recette personnelle restent les prochaines preuves requises.

### Reprise sur les directions Accueil8 et Punch2

Nouvelle consigne coordonnée du responsable : reprendre Accueil8 «Liste nette» et Punch2 «Cadran». La mission Mobile v4 et sa méthode 1.0.0 ont été relues depuis Atelier, ainsi que le cadrage UX v15. Le texte de cette version serveur ne contenait pas encore ces deux nouveaux choix à cette lecture; ils sont traités comme les décisions courantes transmises, sans prétendre avoir inspecté des photos de référence absentes du contexte de cette expertise. Les essais précédents restent des preuves de l’état Samsung intermédiaire, pas une validation de cette nouvelle composition.

Contrôles indépendants préparés pour la nouvelle source :

- Accueil, Commande, Magasin et Punch sans défilement de page aux trois portraits standards, avec composition native/TEST et vrais états QA; vues secondaires pour paysage, clavier et textes agrandis.
- Cadran depuis le début confirmé :0/15/30/45/60/75minutes doivent placer l’aiguille à0/90/180/270/0/90degrés dans le sens horaire depuis12h. Le centre conserve HH:MM:SS de la journée entière. Calcul attendu `angle = (elapsedSeconds % 3600) / 10`, sans compteur incrémental ni appel serveur chaque seconde.
- Déplacement/changement de chantier : le début de journée ne change pas. Le segment conserve son propre horodatage. La préférence de mouvement réduit ne doit pas imposer une animation continue.
- Play vert avant début et Stop rouge après état confirmé seulement. Attente ou erreur ne fabrique ni départ ni arrêt.
- Préparer puis annuler une cible B pendant A :A continue de s’afficher et son horodatage reste la source de vérité; aucune requête de transfert avant confirmation explicite. Après refus ou attente, l’ancien état demeure jusqu’à un accusé serveur valide.
- Proposition inactive du dernier chantier réellement travaillé lors d’une journée précédente : ignorer les segments déplacement/pause/entrepôt, conserver seulement une job encore autorisée et ne jamais démarrer automatiquement. Sans historique exploitable, choix explicite sans valeur inventée.

Le contrôle Android `font_scale`1,5/2 reste distinct du CSS200% : il doit relever configuration système effective, `WebView.textZoom`, métriques DOM et captures, avec restauration finale à1,0. Une valeur système changée sans effet réel sur la WebView ne prouve pas le support des grands textes. Aucun essai physique Samsung revendiqué et aucun émulateur logiciel local lancé.

Le paquet personnel130005 reste à construire uniquement après la nouvelle tête poussée, via le worktree isolé et les scripts préparés par le responsable, avec la clé TEST existante. Aucun nouveau paquet construit ou remis à ce jalon.

### Recette indépendante du cadran et des confirmations

La nouvelle source cohérente a été contrôlée avec un transport local dont les confirmations sont suspendues, refusées ou libérées explicitement. Aucun service hébergé utilisé. **14 scénarios réussis** : les six orientations 0/15/30/45/60/75minutes réellement rendues, reprise depuis l’horodatage, préparation/annulation B sans requête, double toucher avec une seule requête en vol, refus conservant A, confirmation B conservant le début de journée, arrêt en attente conservant l’état actif, Play ne devenant Stop qu’après confirmation. Le contrôle des angles lit la matrice de transformation réellement calculée et l’origine de l’aiguille; il ne se contente pas de `data-angle`.

Preuves : `artifacts/chantier-redesign/samsung-mobile-dial/dial-review.json` et les six fichiers `dial-0min.png`, `dial-15min.png`, `dial-30min.png`, `dial-45min.png`, `dial-60min.png`, `dial-75min.png`, tous réellement ouverts. Ces six orientations ont été mesurées en mouvement réduit, transition 0 s. Les captures de transfert et de passage Play→Stop restent dans le même répertoire.

La règle métier de proposition a été précisée par le responsable : **`work_date` strictement antérieure au jour courant America/Toronto**, même si une journée a été fermée aujourd’hui. Six groupes de contrôles sur les fonctions embarquées réelles réussissent : vendredi→lundi, exclusion d’aujourd’hui, borne UTC où Toronto reste la veille, passage à l’heure avancée avec durée absolue 3600 s, année bissextile/changement d’année et absence de proposition lorsque le jour travaillé manque ou qu’il n’existe qu’un déplacement. Preuve : `samsung-mobile-dial/toronto-review.json`.

**Reprise en mouvement normal : un écart supplémentaire reste ouvert à ce jalon.** Après 15→75 minutes et `pageshow`, le texte affiche 01:15:00 et `data-angle` 90, mais l’aiguille réellement rendue vaut156,81° pendant une transition de 0,18 s qui rattrape un tour complet. L’assertion de rendu échoue; elle n’a pas été remplacée par une simple vérification d’attribut. Correction transmise : rejoindre l’angle final immédiatement sur reprise, sans ce tour animé. Preuve RED : `artifacts/chantier-redesign/samsung-mobile-dial-resume/dial-review.json`. Les quatorze scénarios précédents restent acquis dans leur périmètre; ce cas normal nécessite encore son recontrôle.

### Reprise normale corrigée et recontrôlée

L’intégrateur a neutralisé la transition pendant la mise à jour immédiate sur `pageshow` et `visibilitychange`. Le même contrôle précédemment rouge réussit : après 15→75 minutes, l’orientation réellement rendue vaut **90° après 35 ms**, le texte 01:15:00 et l’attribut 90 concordent. La transition normale peut ensuite reprendre pour les petits ticks; aucun tour de rattrapage n’a lieu à la reprise. La capture `artifacts/chantier-redesign/samsung-mobile-dial-resume-fixed/resume-normal.png` a réellement été ouverte. Rapport : `dial-review.json` au même endroit. Runtime contrôlé SHA-256 `89ad62bfacbecbff2dad68b96722091adaf58182f0715a00fe6f42866baea58e`; SDK toujours `0bf114a6500069af54d6698625c521d9c893ed5a6e1e8f6571b2531c587b4ced`.

Un contrôle sombre ciblé avait également vérifié la vraie erreur publique de déverrouillage dans le masque : texte rgb(255,180,168) sur rgb(58,37,37), contenu privé masqué, capture réellement ouverte. Preuves : `artifacts/chantier-redesign/samsung-mobile-lock-dark/runtime-review.json` et `locked-error-dark.png`. Ce contrôle reste Chromium avec vrai handler/CSS, sans Keyguard physique.

Les derniers résultats locaux du cadran sont donc14 scénarios fonctionnels,1 reprise normale et6 groupes calendrier Toronto réussis. Les finitions visuelles finales, le contrôle `font_scale` Android réellement effectif, la CI et le paquet personnel de la tête finale doivent encore être identifiés séparément. Aucun APK remis par cette expertise.

### Retour du panneau secondaire «Voir le cadran»

La nouvelle adaptation dense ouvre le cadran dans un panneau MIR secondaire. Un premier vrai clic à844×342 était bloqué par une couche `.field-clock-core`; l’échec a été transmis sans forcer le clic. Après correction CSS, le panneau a réellement été ouvert puis fermé avec le callback exact `App.backButton` extrait du bootstrap. Résultat : retour à la vue Punch, même job A et même début confirmé, zéro requête de pointage et aucune minimisation. Ce contrôle ne remplace pas une touche Android délivrée par KVM ou Samsung.

Preuves : `artifacts/chantier-redesign/samsung-mobile-dial-panel-back-fixed/panel-back-review.json`, `dial-panel-open.png`, `dial-panel-back.png`; les deux images ont réellement été ouvertes. Le PASS qualifie le retour. La première image du panneau révélait encore un petit cadran placé en bas à844×342; la lisibilité et le nom de job dans cette vue ont été remis à l’Ergonomie et à l’intégrateur pour leur contrôle final distinct. Ne pas déduire leur validation du seul succès de fermeture.

### Candidate UI finale : invariants rejoués

Sur le runtime `d8bf3f68868f0f2b5e0d47af0ad3260e8f4ef4573918a8b2b10a0337b6386f71`, les14scénarios Cadran/ACK, les6groupes Toronto et la reprise normale précédemment rouge ont été rejoués : tous réussissent. Preuves finales séparées : `artifacts/chantier-redesign/samsung-mobile-dial-final/` et `samsung-mobile-dial-final-resume/`. Les six nouvelles images des orientations ont réellement été ouvertes; textes, sens horaire et heure entière sont cohérents. Aucun appel serveur réel exécuté par ces harnais.

Le panneau dense a également été ouvert puis fermé à nouveau sur la candidate : même pointage/job et zéro requête, retour natif JavaScript avant navigation. Les images finales `samsung-mobile-dial-panel-final/dial-panel-open.png` et `dial-panel-back.png` ont réellement été ouvertes. Le cadran cloné possède désormais une grande taille et son contenu peut défiler dans le panneau; la fin de la recette d’accessibilité de ce panneau relève du rapport Ergonomie. Le SDK conserve l’empreinte0bf114… indiquée plus haut.

La compilation, Java et Lint de la source standard ont été rapportés réussis par l’intégrateur; ils ne sont pas renommés ici en résultats exécutés par cette expertise. Les niveaux Android accéléré/`font_scale` effectif et Samsung physique restent à distinguer dans le bilan CI final. Le paquet personnel n’a toujours pas été construit à ce jalon, en attente de la tête poussée.
