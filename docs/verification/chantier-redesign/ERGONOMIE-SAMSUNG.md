# Ergonomie Samsung — Accueil 8 et Punch 2

## Ce qu’il faut faire

Rendre l’expérience Employé/Chef lisible et prévisible sur téléphone, avec tous les choix applicatifs dans les mêmes composants MIR. Les valeurs, permissions, objets métier, formulaires et moteurs existants restent canoniques. Les dialogues de sécurité, caméra, fichiers et biométrie restent Android.

## Les étapes

1. Base relue : `6039306ac76584ee6b06859786c02eef7cfca685`, PR #37 brouillon, branche `codex/refonte-chantier-employe-chef`. Aucun `AGENTS.md` applicable trouvé. Changements existants préservés; fullstack est seul intégrateur app/tests. Cette expertise écrit uniquement ses rapports et preuves.
2. Méthode Ergonomie Atelier 1.0.0 réellement rechargée, mission existante `67fadcb8-d581-44a0-a643-e284452a8a82` version 4 et cadrage UX version 14 puis **16** relus depuis le serveur. Les six missions ont été identifiées. Le coordinateur conserve l’écriture unique Atelier; aucune synchronisation de cette expertise revendiquée.
3. Inventaire : **61 sources, 169 contrôles bruts dans la base**, dont contrôles d’autres rôles. La matrice `CHOICES-SAMSUNG.md` distingue les surfaces actives, conditionnelles, exclues et système. Le nouveau choix intégré Home est ajouté à J01; ce total historique ne devient pas une affirmation de 169 menus actifs.
4. Contrats transmis puis vérifiés dans Chromium : valeurs et FormData exacts, contraintes natives conservées, options désactivées, annulation, focus, clavier, listes longues, dates/heures locales, précision, cibles de 44 px et erreurs lisibles.
5. Nouvelle direction : Accueil en liste nette, vraie feuille MIR de choix de chantier, Dossier séparé; Punch à cadran, vraie job active prioritaire, préparation de transfert annulable. Aux grands textes/petits paysages, durée et actions restent accessibles et le cadran complet possède son panneau.

## Résultats locaux

| Vérification | Résultat et preuve locale |
|---|---|
| Composant de choix | **16/16** : `isolated-approved-final-2/results.json` |
| Parcours métier et iframe après Accueil 8/Punch 2 | **36 contextes, 2 394 enregistrements, zéro échec** : `business-approved-matrix/results.json` |
| Choix avec place du clavier réduite | **108/108** : `keyboard-approved-final/results.json` |
| Filtres Magasin en vue dense | **20 contextes, 40 états, zéro échec** : `dense-actions-candidate-final/results.json` |
| Home/Punch avant le dernier raccordement Home | **68 contextes, 640 états, zéro échec** : `home-punch-candidate-final/results.json` et `home-punch-candidate-final-large-system/results.json` |
| Nouvelle feuille intégrée Home | **68 contextes, 708 états; quatre écarts de boîte du placeholder ensuite corrigés et rejoués** : `home-punch-home-sheet-final/results.json` et `home-punch-home-sheet-final-large-system/results.json` |
| Reprise finale du placeholder sur le gel effectif | **4 contextes, 44 états, zéro échec** : `home-punch-home-empty-430-fixed/results.json` |
| Dernier delta de libellés Home | **4/4** : `home-punch-last-context-labels/results.json`; neuf empreintes identiques aux sources actuelles |
| Temps, arbre accessible et focus avec le nouveau Home | **Réussi** : `dial-accessibility-home-sheet-final/results.json` |

Les 36 contextes métier couvrent Employé/Chef, 360/390/430 px, clair/sombre/système clair/système sombre et préférence grands textes de 19 px. Les vraies feuilles sont ouvertes depuis les formulaires; libellés, options, disabled, contraintes, valeur et FormData sont comparés avant/après annulation. Les variantes produit, formats/couleurs, corrections, absences partielles, dépenses, livraison, problème/outil et dessin réel jusqu’au panier font partie du passage. Le nouveau champ Home, ajouté ensuite, est rejoué séparément sur 68 contextes.

Les 68 contextes géométriques comprennent les trois portraits standard et à 200 %, 360×732 standard et à 200 %, 844×390, 780×360, 844×342, ainsi qu’un supplément 19 px avec préférences système réelles. La simulation à 200 % utilise `html font-size:200% !important`, corps calculé 32 px. Ce réglage est distinct du zoom texte Android.

## Ce qui est réellement vérifié

Le dernier delta textuel est rejoué sur les deux rôles : avec le segment job A, Home B affiche « En cours ailleurs » et nomme A dans le libellé accessible; en déplacement, il affiche « Déplacement en cours ». Le temps, le début et la job effective sont préservés, sans RPC.

La feuille Home conserve l’Accueil après choix de B, affiche les noms/adresses complets et rend le focus à la nouvelle façade. Annuler garde le chantier courant et n’émet aucun pointage. Mes chantiers reste accessible depuis Plus. Avec A déjà pointé, consulter B dans Home ne change ni la vraie job du Punch ni le début confirmé. Préparer B rend le focus à « Commencer sur B »; Annuler revient à la façade du chantier et conserve A, sans RPC.

Le chronomètre évolue; `role=timer` et `aria-live=off` évitent l’annonce de chaque seconde, sans ancêtre live. Aiguille et icônes sont décoratives, Play/Stop ont un nom propre. La préférence mouvement réduit coupe la transition. Les reçus, refus, reprises, doubles actions et calculs de l’aiguille sont vérifiés séparément par Qualité/Mobile.

En mode dense, un vrai défilement peut être nécessaire pour les secondaires ou Annuler; ce défilement est permis à 200 % et en petit paysage. Il n’est pas présenté comme le comportement standard. Les tests contrôlent les cibles et les vrais points de toucher, sans clic forcé. Une grande cartejob est lue par fragments avec défilement; elle n’a pas à tenir intégralement sur un écran. Le centrage du harnais tient compte de l’en-tête et de la navigation fixes.

Le panneau « Voir le cadran » est nommé, son temps `125:02:05` reste entier, sans ancêtre masquant ni sortie de viewport; les cibles font au moins 44 px et Échap rend le focus. Le panneau atteint 45/49 px de chiffres à 200 %. À 844×342, le bas décoratif du cercle exige un défilement interne; Harmonisation a confirmé sur quatre contextes `scrollTop` de 0 à 161, contenu de 471 px pour une hauteur de 310 px, avec bas récupérable et retour au résumé. Ce défilement n’est pas une preuve que tout le cercle est visible simultanément.

La préférence 19 px ne réduit plus le chrono : à 360 px, le chiffre passe de 38 à 40 px; à 390/430 px, de 40 à 43 px. Les cibles/calendrier, champs et validations ne sont pas réduits pour fabriquer une capture fixe.

## Écarts reproduits, corrections et historique

Les captures, JSON et empreintes intermédiaires sont conservés. Les défauts suivants ont été reproduits puis corrigés et rejoués : secondes/fractions perdues avec `step=any`; heure locale normalisée par DST; ouverture parasite au focus du contrôle masqué; erreur required invisible; option devenue disabled pendant la feuille encore transmissible; doublons des filtres Magasin après changement de job; collisions et Annuler masqué dans le Punch dense; focus perdu après choix/annulation du transfert; cadran secondaire conservant sa petite taille inline; salutation/avis débordants en Home extrême; chrono légèrement plus petit avec le grand texte.

Un ancien test clavier sans meta viewport est isolé sous `keyboard-invalid-viewport/` et marqué invalide. Un passage isolé sans `mir-field-samsung.css` donnait encore quatre cibles calendrier de 41,89 px; le bundle réellement chargé par l’app et l’iframe passe les 108 cas. Une ancienne assertion de largeur du core a été distinguée d’une coupe visible : les tests conservent le contrôle de composition et ajoutent Range, viewport et ancêtres masquants.

Le dernier P2 du placeholder sans affectation à 430 px/200 % est fermé. Le chevron hérité débordait sa boîte de 44 px; le texte demeurait lisible. Le CSS ajuste le chevron et sa hauteur sans réduire le texte de 32 px. Les quatre contextes Employé/Chef clair/sombre sont rejoués avec 44 états, zéro échec. Les captures avant et après (`home-punch-home-empty-430/` et `home-punch-home-empty-430-fixed/`) ont réellement été ouvertes. Aucun contrôle n’est neutralisé.

## Comment savoir que c’est terminé

Chaque ligne active de la matrice dispose d’un contrôle réel ou d’une limite explicite. Tous les menus applicatifs utilisent les composants MIR; aucune branche masquée n’est activée pour créer une couverture artificielle. Les tests métier de l’intégrateur restent inchangés. Aucun écart ergonomique local bloquant ne reste dans ces contrôles. La matrice de 708 états conserve ses quatre échecs historiques; le fichier de reprise final apporte leur preuve de correction, sans réécriture des anciens JSON. Le dernier préchargement des métadonnées et le CSS final sont exercés dans cette reprise ciblée; le delta ultérieur de libellé seul est rejoué sur ses quatre cas, les SHA-256 permettent de distinguer les passages.

Les images réellement ouvertes comprennent Home long nom/adresse, nouvelle sélection intégrée, préparation de transfert en grand texte, cadran standard et panneau grand texte; les captures d’échec ont aussi été inspectées. Les deux photos originales de référence ne sont pas présentes dans le contexte de cette expertise : leur comparaison revient au coordinateur, sans revendication d’examen personnel des originaux.

## Limites et preuves

Toutes les preuves ci-dessus sont sous `artifacts/chantier-redesign/samsung/ergonomie/`. Chaque passage fige ses CSS/JS/HTML/JSON en mémoire et conserve leurs SHA-256. `final-evidence-index.json` relie les preuves, empreintes et limites. Les parcours utilisent le vrai client/interface avec un transport fictif local, deux jobs QA, rôles et données fictifs; les requêtes distantes sont bloquées. La météo de la matrice est explicitement simulée, y compris chargement et indisponibilité.

Ce rapport ne certifie ni serveur hébergé, ni CI, ni clavier/permissions Android, ni WebView, ni TalkBack, ni Samsung physique. Mobile couvre séparément le vrai callback de retour Android simulé et la provenance native; Qualité couvre les contrats/réceptions. La recette physique reste ouverte.

Aucune modification applicative ou test suivi par cette expertise, aucune opération production, émission de courriel, publication Pages, fusion, compte personnel ou distribution employés. Aucun secret transmis. SEO/GEO : non applicable à cette interface chantier privée.

## Reprise ciblée après la CI de 39e9610

Base exacte : `39e961090d988175d6fb6f7be894f34b48f54ddb`. Le symptôme natif rapporté est une sélection de texte Android sur une option, avec feuille encore ouverte. Fullstack reste seul auteur app/tests; cette expertise a relu le correctif et ses effets, sans nouvelle conception ni reprise de la matrice complète.

La règle `user-select:none` vise les boutons et descendants des feuilles/façades MIR, dans les espaces chantier et dessin. Elle ne vise ni la page entière, ni les champs, ni les documents. La note reste sélectionnable intégralement au clavier, et le texte documentaire DOM au double-clic. Cette vérification ne remplace pas une recette du lecteur PDF Android.

La mise à jour des numéros/adresses s’applique dans la feuille déjà ouverte. Lorsque les résultats du filtre ne changent pas, le bouton focalisé conserve son identité DOM. Lorsqu’une adresse nouvellement reçue correspond à la recherche courante, les résultats sont recalculés sans retaper; requête, focus logique et brouillon multiple restent conservés. Un défaut réel a été reproduit sur ce dernier cas, transmis puis corrigé avant clôture.

Résultats sur le correctif :

- **16/16 contrats** : `isolated-ci39e-final-contracts/results.json`.
- **6/6 compléments indépendants** : `isolated-ci39e-final-six-source-events/results.json`. Numéro/adresse tardifs, valeur et FormData immuables avant validation, annulation, focus, disabled/optgroup, recherche, multiple avec recalcul des résultats et un seul événement input/change du contrôle source, copie des champs et texte documentaire.
- **10 contrôles du permanent navigateur**, rejoués indépendamment pour Employé/Chef : `ci39e-permanent-browser.log`. Métadonnées réellement retardées dans le client local, annulation, façade et carte actualisées, maintien du focus, long toucher Chromium sans sélection de texte et choix restant sur Accueil sans pointage implicite.

Deux attentes incorrectes de mon harnais ont été corrigées séparément : une longueur de texte fixée à25 au lieu de22 caractères, et un comptage mélangeant l’événement de recherche avec celui du contrôle source. La sélection intégrale et l’unicité des événements du contrôle source restent exigées. Aucun test suivi du dépôt n’a été modifié par cette expertise.

Les empreintes du composant sont identiques entre les 16 contrats et les six compléments. `ci39e-source-fingerprints.json` conserve les neuf sources actuelles; les preuves précédentes gardent leurs empreintes historiques. Aucun écart ergonomique local restant dans ce delta et `git diff --check` réussi. Le long toucher Chromium, le WebView natif de CI et le Samsung physique restent trois niveaux distincts; aucun nouveau succès natif ou physique n’est revendiqué ici.
