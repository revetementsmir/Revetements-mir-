# Harmonisation de l’application chantier Employé/Chef

## Ce qu’il faut faire

Donner aux cinq onglets, au dossier chantier, aux formulaires et aux états la même identité MIR verte/grise, sans imposer ces changements aux espaces Boss, Adjointe, Entrepôt ou client. La méthode Atelier « Harmonisation et cohérence visuelle » 1.0.0 a été réellement lue; le présent travail est une revue indépendante du code intégré par le full-stack.

## Les étapes

1. Inventorier les composants existants et les collisions CSS/JS.
2. Transmettre un contrat visuel commun à l’intégrateur unique.
3. Examiner les cinq onglets, le dossier et les formulaires réellement rendus à 360/390/430 px, clair/sombre et texte agrandi.
4. Faire corriger les différences critiques puis recontrôler les mêmes scénarios.

## Comment savoir que c’est terminé

- Le même en-tête compact et la même barre à cinq destinations restent visibles et utilisables dans chaque écran concerné.
- Les couleurs, la typographie, les champs, les boutons, les icônes et les états utilisent les mêmes règles.
- Aucun texte clair sur carte claire ni texte sombre sur surface sombre ne persiste en thème foncé.
- Le panier compte des lignes et son badge ne change pas de sens selon l’écran.
- Les captures montrent des états distincts et une vraie interface exécutée; les limites des données simulées et des tests physiques sont explicites.

## Détails pour le chat

Révision de référence : `24d29734d68cd3da23c17be8693ddba08abff19f`. Branche de refonte : `codex/refonte-chantier-employe-chef`; checkout `/workspace/Revetements-mir-chantier-ux`. Aucun fichier applicatif modifié par cette expertise. Aucun accès production, envoi de courriel, fusion ou publication.

### Référence et composants inventoriés

Les couleurs et préférences de thème existent déjà dans `mir-settings.css` : `--mir-page`, `--mir-surface`, `--mir-surface-soft`, `--mir-text`, `--mir-muted`, `--mir-border`, `--mir-accent`, `--mir-danger`, `--mir-warning`, `--mir-focus`. Les réglages clair/sombre, grands textes, contraste et mouvement réduit sont une source à réutiliser, pas une seconde préférence.

Les couches héritées `mir-harmony.css`, `chantier-employee.css`, `mir-settings.css` et `mobile/web/team.css` se superposent. `mir-harmony.js` déplace la navigation dans le menu, déplace les nouveaux enfants d’en-tête par MutationObserver et réécrit le libellé du panier après chaque changement du contenu. Les règles `body:has(#mir-harmony-header #portal-navigation)` et le padding bas natif de 24 px avec `!important` peuvent empêcher la barre basse ou recouvrir son contenu.

### Contrat transmis à l’intégrateur

| Composant | Règle commune retenue pour la revue |
|---|---|
| Portée | Style et hooks limités à l’expérience chantier Employé/Chef; conserver les anciens comportements des autres rôles. |
| Palette | Surfaces et textes via les tokens existants. Primaire vert sombre `#31573b` avec blanc en clair; ne pas utiliser le vert clair pour du texte courant. |
| Typographie | Corps 1 rem / 1,45; titre principal environ 1,5 rem, titres de section 1,125 rem, auxiliaire 0,875 rem. Les unités relatives doivent suivre le texte agrandi. |
| Rythme | Écarts 4/8/12/16/24 px; cartes rayon 16 px, champs 12 px. Ombre discrète réservée aux panneaux flottants. |
| En-tête | 56–64 px hors adaptation aux grands textes; logo 80–96 px, panier et avatar avec cibles d’au moins 44 px. Pas de longue ligne compte dans le flux principal. |
| Navigation | Cinq onglets de même importance, actifs identifiables par forme/fond et libellé; 64 px minimum plus zone système. Pas de double navigation principale. |
| Icônes | SVG homogènes 24 px, trait environ 2 px, libellé accessible; aucun emoji comme remplacement aléatoire d’une icône. |
| Formulaires | Même champ, libellé au-dessus, aide/erreur à proximité, action principale stable; formulaires longs progressifs. |
| États | Vide avec prochaine action utile; chargement sans fausse donnée; erreur précise avec conservation de la saisie; attente réseau distincte d’une confirmation serveur. |
| Sombre | Les surfaces historiques réutilisées doivent toutes suivre les tokens, y compris dossier, dialogues et réglages. |

Couples de couleurs calculés à partir des tokens, avant contrôle des styles réellement appliqués : `#31573b`/blanc 8,21:1; texte secondaire clair `#5d6c62`/blanc 5,55:1; secondaire sombre `#bac8bd`/`#18231c` 9,32:1; accent sombre `#78c65a`/`#18231c` 7,73:1. Les couples hérités `#f3f7f2`/blanc (1,08:1) et `#294734`/`#101712` (1,77:1) expliquent les pertes de lisibilité observées. Ces calculs de palette ne remplacent pas les mesures des styles calculés après intégration.

Le statut ne repose jamais sur la seule couleur : texte « En attente » pour un envoi non confirmé, « Enregistré » uniquement après réponse serveur, « À corriger » pour une validation refusée. Une urgence de remplacement ne doit pas prendre l’apparence d’une livraison planifiée. Le champ ou la ligne concernée reste visible à côté du retour. Les panneaux de confirmation utilisent le même ordre : titre clair, contexte chantier, conséquence, action; aucune disparition du contenu sur simple toucher.

### Revue avant réalisation — exécutée

Le 14 novembre 2026, une instance Chromium réelle à 390×844 a ouvert le portail avec le contrat client remplacé par une fixture locale explicitement fictive. Aucun appel au serveur métier n’est nécessaire à cette capture. Deux captures ont été réellement ouvertes :

- `artifacts/chantier-redesign/harmonisation/before-employee-light-390.png`
- `artifacts/chantier-redesign/harmonisation/before-employee-dark-390.png`

Mesures : largeur utile 390 px, document 390 px, en-tête 64 px; navigation principale cachée avec rectangle de largeur et hauteur nuls.

| Avant | Constat observé | Conséquence |
|---|---|---|
| Sombre, accueil | Cartes restées blanches, textes et titres devenus presque blancs | Lecture impossible ou très dégradée; défaut critique, pas une préférence. |
| Sombre, titre principal | Vert très sombre sur fond sombre | Hiérarchie et lisibilité perdues. |
| Sombre, en-tête | En-tête clair avec textes presque blancs | Commandes peu lisibles. |
| Navigation | Destinations cachées dans Menu | Écart à la décision des cinq onglets persistants. |
| Accueil clair | Aide flottante au milieu du contenu et accumulation de cartes | Hiérarchie encombrée; actions métier et compte dispersées. |

### Première revue après réalisation — exécutée, corrections demandées

Le premier rendu intégré a été exécuté avec la fixture `tests/helpers/mir-field-fixture.cjs` (deux jobs fictives, Employé/Chef, aucune écriture serveur). Vingt-huit états rendus sont conservés : cinq onglets + dossier + formulaire de problème pour Employé390clair, Employé390sombre, Chef360sombre/grands textes et Chef430clair/grands textes. Mesures des textes et styles dans `artifacts/chantier-redesign/harmonisation/rendered-audit.json`; aucun débordement horizontal détecté dans ces états. Le script de diagnostic de contrastes tient compte des surfaces opaques et sert au repérage; la revue des captures reste nécessaire.

Les captures des cinq onglets ont réellement été ouvertes, ainsi que dossier et signalement Chef360sombre/grands textes. La composition est plus compacte; le panier et l’avatar existent, la navigation comporte les cinq destinations demandées. Les défauts suivants ont été transmis à l’intégrateur avant validation :

| Priorité | Écart observé | Preuve ou mesure | Correction demandée |
|---|---|---|---|
| Critique | Message sombre conserve une grande surface blanche avec titres presque blancs | Capture `after-employee-messages-dark-standard-390.png`; titre1,08:1 | Couvrir les vraies classes de messagerie réutilisées, notamment chat-workspace/chat-list-pane/chat-list-head/chat-start/message-thread et compose. |
| Haute | Avatar sombre sans initiales lisibles; contexte job très clair dans le formulaire sombre | Initiales1,01:1; captures Punch et signalement | `--field-bg` doit réutiliser `--mir-page`, pas `--mir-bg` inexistant. Même correction pour fond actif, contexte et fermeture des dialogues. |
| Haute | Onglet actif vert sur fond très clair insuffisant |4,25:1; libellés11,52px en texte standard | Accent fort/primaire contrasté; taille de libellé voisine de0,8rem et contrôle des retours à360px/grands textes. |
| Haute | Texte courant fixé à16px | Seuls les titres/rem et onglets suivent le réglage agrandi | Corps en1rem pour suivre la préférence existante; vérifier les champs et lignes. |

Les références initiales ne sont pas remplacées par les captures de correction. La validation finale reste en attente du recontrôle. Les contrôles navigateur ne certifient ni la WebView native ni le Samsung physique.

### Recontrôle après corrections — passe3

La passe3, conservée séparément dans `artifacts/chantier-redesign/harmonisation/pass3/`, a rejoué les28états. Le diagnostic n’a relevé ni contraste textuel insuffisant dans ces états, ni débordement horizontal de texte, ni erreur JavaScript. Les cinq onglets à390clair ont été réellement ouverts dans l’outil d’inspection, ainsi que Message390sombre, Accueil Chef360sombre/grands textes et formulaire de problème Chef360sombre/grands textes. Les surfaces sombres, les initiales d’avatar et les actifs de navigation sont désormais lisibles. La palette est cohérente entre les cinq destinations et le dossier.

Les captures de formulaires `fullPage` incluent parfois le document sous-jacent au-delà du viewport : cette partie n’est pas un écran de téléphone supplémentaire. La revue porte sur le viewport réel de844px. Le rapport JSON précise les largeurs et réglages; `source-fingerprints.json` conserve les empreintes des fichiers examinés dans l’arbre de travail.

Les secondaires Dépenses, Absences, Mes heures, Équipe, Profil et Réglages ont aussi été exécutés et réellement ouverts à360sombre/grands textes dans `secondary1/`. Cette fixture ne contient initialement ni dossier de dépense persisté, ni demande de congé, ni historique d’heures; ces captures ne prouvent donc pas leurs traitements serveur. La création de congé n’est pas certifiée par un écran vide.

Réserves transmises avant validation finale :

- Message conserve un libellé `.sr-only` affiché dans le cadre de recherche; demander un utilitaire visuellement masqué qui garde le nom accessible et un seul cadre de champ.
- L’expert Ergonomie a mesuré un contour de focus clair à1,92:1 et un statut de brouillon de messagerie sombre à3,28:1, états non couverts par les28contrastes de cette passe. Ils doivent être corrigés et remesurés avant une validation plus large.
- Les envois, les pièces jointes persistées, la réception Adjointe et le comportement natif sont contrôlés par Qualité/Mobile et la coordination; ce rapport visuel ne les remplace pas.

### Recontrôle des dernières finitions — passe4 et secondary2

Les28états ont encore été exécutés dans `pass4/` après correction du libellé visuellement masqué et des surfaces. Les12états secondaires (six écrans, clair390 et sombre/grands textes360) sont dans `secondary2/`. Aucun contraste textuel insuffisant ni débordement n’a été détecté dans ces40états; aucun défaut JavaScript n’est remonté par le harnais des28états. Les captures Message clair/sombre et problème Chef360sombre/grands textes, puis Dépenses et Profil Chef360sombre/grands textes, ont réellement été ouvertes. Les initiales, la fermeture des dialogues et les champs sont lisibles. Le libellé accessible de recherche reste dans le DOM et n’encombre plus visuellement le champ.

La revue complémentaire tablette768clair et ordinateur1440sombre/grands textes a exécuté14états dans `wide1/` sans contraste insuffisant ni débordement. Commande tablette, Accueil Chef ordinateur et Message ordinateur ont réellement été ouverts. Cette passe était antérieure à la correction du placeholder de conversation à droite sur ordinateur; sa présence finale doit être recontrôlée par les scénarios de livraison.

Décision intermédiaire : cohérence du langage visuel des cinq onglets et du dossier obtenue sur les scénarios examinés. Microfinition du double cadre de recherche demandée à l’intégrateur. La cohérence du parcours « Dessiner une moulure » restait un écart séparé : son ouverture réelle par le Designer puis son image ouverte ici montre l’ancien grand en-tête et le retour à une navigation différente. Une adaptation du cadre chantier est demandée sans recopier ni remplacer le moteur. Cette réserve empêche d’annoncer à ce stade que **tous les écrans** sont harmonisés.

### Reprise finale avec capacité explicitement activée

Le nom effectif du drapeau est `fieldExperienceEnabled=true` dans MIRPortalConfig ou MIRTeamTestConfig; la fixture courante l’active explicitement. Les anciennes captures ne sont pas utilisées pour certifier ce drapeau ni le serveur. Les dernières reprises utilisent le nom réel.

Les quatre captures hébergées produites par Qualité (Employé/Chef, accueil et dossier jobB) ont réellement été ouvertes ici. Elles permettent de voir les données QA autorisées et une réponse de prise en charge dans le dossier concerné. Elles ne sont pas une preuve créée par une mutation de ce sous-agent. Les libellés serveur bruts `field_issue`, `in_progress`, `open`, `critical` y ont été repérés et signalés; l’intégrateur a ajouté leurs libellés français dans le rendu. Le statut brut des extras a également été signalé pour correction.

Focus corrigé et remesuré par Ergonomie :7,85:1 en clair/grand/contraste,8,56:1 en sombre/sombre-grand; détail `ergonomie/forms-final/contrast-summary.json`. Le propre diagnostic Harmonisation confirme l’outline réel `rgb(49,87,59)` sur `rgb(250,250,247)` en clair et `rgb(155,212,140)` en sombre, avec champs19px en texte agrandi. Le statut de brouillon de Message est lisible; le message rédigé pour le contrôle reste local et n’a pas été envoyé.

Le premier cadre intégré de dessin conserve bien l’en-tête chantier et les cinq onglets. Toutefois le test qui attendait le masquage de l’ancien en-tête dans l’iframe a échoué par délai : `display:grid` restait appliqué. Une capture diagnostique distincte a été réalisée, sans présenter cet échec comme réussi :

- `final-diagnostic/chef-drawing-light-390.png`
- `final-diagnostic/chef-drawing-dark-390.png`

Ces deux images ont réellement été ouvertes. La règle de masquage injectée perd face à la spécificité CSS existante. Le bandeau marketing et le choix Panneaux restent visibles. Le moteur de profil sombre conserve des cartes claires avec texte clair : cet écart de lisibilité est critique. Les audits de contraste précédents portent sur le document chantier principal; ils **n’incluent pas l’intérieur de cette iframe**. L’intégrateur a reçu les sélecteurs précis et une demande d’adaptation scoped du cadre et des surfaces, en conservant le moteur.

État de revue à cette reprise : cinq écrans principaux, dossier et formulaires inspectés, focus/statut Message corrigés; validation finale retenue tant que le dessin réutilisé sombre n’est pas lisible et que son ancien en-tête n’est pas masqué.

### Synchronisation Atelier

La coordination et la mise à jour des missions sont centralisées par l’agent responsable. Ce rapport n’affirme aucune écriture Atelier effectuée par le sous-agent.
