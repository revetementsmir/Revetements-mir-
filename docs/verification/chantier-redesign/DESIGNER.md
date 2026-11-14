# Designer — expérience chantier Employé et Chef

## Résultat et périmètre

La composition retenue repose sur un en-tête court, cinq destinations stables, une job explicite et des actions lisibles au pouce. Les deux rôles partagent les mêmes écrans; les fonctions d’équipe du Chef s’ajoutent dans le contexte du chantier. Le rôle n’est pas un changement de thème ni une nouvelle application.

Revue initiale du code `24d29734d68cd3da23c17be8693ddba08abff19f`, branche d’intégration `codex/refonte-chantier-employe-chef`. Méthode Designer Atelier 1.0.0 lue depuis la réponse serveur fournie par le responsable. Code lu sans modification; seul l’intégrateur full-stack modifie l’application. Le présent rapport constitue des décisions de composition et une revue, pas une certification serveur.

## Avant réellement examiné

L’accueil Employé a été rendu en Chromium à390×844 depuis les octets Git de24d2973, avec le client simulé déjà utilisé dans les tests. Capture `/tmp/mir-designer-before-390.png` réellement ouverte; aucune erreur JavaScript dans ce rendu. Script reproductible `/tmp/mir-designer-before.cjs`. Aucun compte réel ni requête Supabase.

Constats visibles : le header contient « Mon compte », « Mon dossier ·0 » et « Menu », puis une seconde barre de compte/notifications/réglages/déconnexion; ces deux étages occupent plus de120px. La météo se trouve dans une salutation importante et un bouton Messages isolé. La carte job occupe environ430px et contient à la fois son contexte, un sélecteur permanent et un second chantier. Les outils terrain arrivent loin sous le premier écran. L’aide flottante recouvre l’en-tête de « Ma journée ». La navigation principale est masquée derrière Menu. Les tuiles utilisent beaucoup de hauteur pour des informations peu nombreuses.

Ces constats concernent une simulation représentative. Ils ne prouvent ni les données Chef hébergées ni les fonctions sur appareil physique.

## Règles visuelles communes

- En-tête d’environ64px, avec logo MIR d’environ104×28 à gauche. À droite : panier puis avatar; chaque cible reste au moins44×44, même si le disque de l’avatar mesure32px. Aucun texte de courriel ou rôle dans cette ligne.
- Fond gris très légèrement vert, surfaces neutres, texte vert presque noir et vert MIR pour l’action principale. Le vert du logo demeure un accent, pas la couleur de tous les textes. Réutiliser les variables de thème pour clair/sombre/contraste renforcé; aucune couleur claire codée en dur sur les états partagés.
- Corps16px, champs16px, texte secondaire14px, h1 d’écran environ26px et h2 environ20px. Une seule h1 par écran. Ne pas réduire les libellés pour forcer une rangée; laisser revenir à la ligne en grand texte.
- Espacements16px au bord,8px dans un groupe et24px entre sections. Rayons12–16px, traits discrets et ombre très légère uniquement pour les éléments flottants. Les cartes sont réservées aux ensembles qui ont un sens métier; une liste de liens n’a pas besoin d’une carte par ligne.
- Boutons d’action d’au moins48px, libellé verbal, icône secondaire avec texte. Le bouton principal est visuellement unique à l’étape. Éviter les boutons énormes verts répétés dans chaque bloc.
- Écrans secondaires : retour nommé et titre court au-dessus du contenu. Garder l’onglet parent actif et restaurer la position précédente. Le header, le pied et les dialogues utilisent la même grammaire sur tous les écrans.

## Navigation et compte

Barre inférieure stable, exactement `Accueil | Commande | Punch | Message | Plus`. Icônes : maison, panier/commande, horloge, bulle, trois lignes horizontales. Icône et libellé dans chaque cible. État actif par teinte de fond discrète, couleur et repère visuel; `aria-current` fournit la même information. Aucun second menu principal dans Harmony. Réserver les inset système et l’espace correspondant dans le contenu, y compris dernier champ et dernier bouton.

Panier : icône toujours visible; badge masqué à0. Compter les lignes distinctes, sans additionner mètres, boîtes et pièces. Le toucher ouvre le panier commun. Dans le panier, chaque ligne montre pièce/produit, variante, quantité et job. Le texte « Envoyer la commande » n’annonce aucun succès avant reçu serveur. Les lignes ajoutées pendant l’envoi restent visibles après confirmation des lignes envoyées.

Avatar : initiales du nom du compte réel, avec nom accessible complet. Un panneau court présente nom, rôle et courriel, puis `Profil`, `Réglages`, et une déconnexion séparée par un trait et libellée clairement. Le changement de compte n’est pas un sélecteur d’employé côté client. Aucun doublon Profil/Réglages dans Plus.

## Accueil

Ordre de lecture mobile :

1. Date et météo sur une ligne compacte, sans énorme salutation. Si météo indisponible, texte simple sans illustration vide.
2. Job du jour : numéro discret, nom lisible sur deux lignes, adresse. Toute la zone principale ouvre le dossier; `Itinéraire` reste un bouton distinct. `Changer` apparaît près du nom si plusieurs jobs autorisées; la liste montre nom ET adresse. Un job seulement ne nécessite pas de select permanent.
3. Pointage compact : état, début et accès au même écran Punch. L’accueil ne contient pas un deuxième formulaire Punch ni un bouton qui enregistre implicitement une arrivée.
4. Trois actions terrain : `Plans`, `Ajouter une photo`, `Signaler un problème`.
5. Notifications utiles, titre et objet lisibles, date courte. Chaque ligne mène à sa demande, commande, correction ou job; elle ne simule pas un message.
6. `Mes chantiers` ouvre la liste des affectations. État sans affectation : phrase utile et contact du bureau, aucun grand squelette de carte ni bouton de saisie impossible.

Chef : bloc compact `Mon équipe` avec personnes et présences connues, puis tâches et problèmes importants. `Présence à confirmer` reste distinct de `Absent`. `Rapport de chantier` est une action séparée de `Terminer` dans Punch. Aucun tableau comprimé, aucun total de salaire, aucun bouton de gestion générale.

## Commande

L’écran d’entrée propose trois rangées solides et explicites : `Magasin` (matériel et consommables), `Banque de pliages` (profils entreprise), `Dessiner une moulure` (pièce personnelle pour la commande). Le contexte de job est au-dessus; le suivi des commandes vient après ces trois accès.

Magasin : recherche large et claire, catégories faciles à parcourir, favoris puis liste de produits. Chaque ligne fournit image utile, nom et unité. Le détail produit contient les variantes nécessaires puis une quantité obligatoire laissée vide à l’ouverture et `Ajouter au panier`. Ne pas mettre tous les choix et quantités de tous les produits sur le même écran.

Pliages : dessin existant avec lettres/cotes, puis sections progressives `Mesures`, `Longueur et quantité`, `Matière et couleur`, résumé et ajout. Garder le dessin accessible pendant la saisie sans masquer le clavier. La pièce personnelle ne donne aucune entrée vers la modification de la banque entreprise. Les règles de calcul et PDF demeurent celles du moteur existant.

Panier : lignes lisibles verticalement, suppression explicite, quantités éditables, chantier à confirmer si nécessaire. Le résumé et l’action sont ancrés dans un pied qui reste atteignable au clavier. Pendant envoi, afficher `Envoi…` pour l’opération concernée et empêcher son double envoi. En erreur, garder contenu et correction possible. Après reçu serveur, afficher la commande et son suivi, pas une page vide sans explication.

Suivi : numéro, job, état serveur et livraison partielle explicite. `Signaler un problème de livraison` préremplit commande et job, puis choix manquant/incorrect/endommagé, note et photo; aucun bon de réception automatique.

## Punch

Au-dessus du bouton : job choisie, état (`Prêt à commencer`, `Au travail`, `En déplacement`), heure de début connue et indication de la dernière synchronisation si utile.

Action principale : `Commencer` ou `Terminer`, selon l’état réel. Secondaires contextuelles : `Changer de job` et `Déplacement`. Les termes `PUNCH IN` et `PUNCH OUT` sont remplacés dans l’interface, sans changer les commandes métier. `Itinéraire` reste dans le contexte de job; l’éventuel GPS ponctuel de validation est expliqué au moment du pointage et n’est jamais déclenché par l’itinéraire.

Sous l’action : `J’ai oublié de puncher`, `Mes heures sont incorrectes`, puis `Voir mes heures`. Une demande de correction montre son état et le traitement existant. La liste de journées affiche durée, pauses et segments par job sous forme de lignes ou accordéons, sans colonnes tronquées. Afficher séparément `En attente de synchronisation` et `Enregistré`; ne jamais colorer une tentative hors ligne comme un succès serveur.

## Message

Sur téléphone, afficher soit la liste des conversations, soit le fil ouvert. Liste : recherche, nom/chantier, dernière ligne, heure et non-lu. Un bouton d’ouverture de conversation présente les destinataires autorisés avec leurs noms; pas une longue liste de tout le personnel sur le premier écran.

Fil : retour `Conversations`, nom et portée (`Privé`, `Chantier` ou `Équipe`), messages chronologiques, auteur et heure. Texte et pièces jointes appartiennent au même fil que depuis le dossier job. Une pièce jointe refusée n’est jamais remplacée par une URL publique.

Compositeur : joindre, champ multiligne et `Envoyer` groupés. Le champ et l’action restent au-dessus du clavier, sans cacher le dernier message. Le brouillon, l’envoi et l’erreur ont un état local lisible; aucun `Lu` ou `Distribué` inventé. La barre basse ne doit pas prendre la place du compositeur : avec clavier, elle peut être masquée visuellement, sans devenir une nouvelle destination ni décaler le bouton hors écran.

## Plus et fonctions secondaires

Liste groupée, sobre : `Mes heures`, `Banque d’heures` si permise, `Congés et absences`, `Dépenses et reçus`; puis `Bris d’outil`, `Mes chantiers et documents`, `Aide et contact du bureau`. Pour Chef seulement, groupe `Mon équipe`, `Tâches`, `Avancement`, `Rapport de chantier` selon les contrats autorisés. Les fonctions qui manquent d’un service ne doivent pas être présentées comme envoyées ou traitées.

Mes heures : semaine courante en premier, résumé net et détail des journées/jobs/déplacements/pauses. Les semaines verrouillées restent lisibles et leurs corrections suivent le contrat existant. Congés : dates, type et information utile, puis récapitulatif avant envoi. Dépense : reçu en premier, job, catégorie/montant utiles et suivi. Bris : outil libre ou inventorié, problème, photo facultative, job et urgence parmi les trois libellés demandés. Pas de numéro de série obligatoire.

## Dossier job commun

Sous-page depuis Accueil ou Mes chantiers. En-tête court : retour, numéro et nom. Bloc adresse/itinéraire/consignes, puis quatre actions visibles : `Ajouter des photos`, `Noter un extra`, `Signaler un problème`, `Écrire à l’Adjointe`.

Sections de contenu lisibles : `Plans et documents`, `Photos et avancement`, `Demandes et problèmes`, `Commandes et livraisons`, `Conversations`, `Rapports de journée`. La date de version publiée doit être visible avant ouverture d’un PDF. Les liens ne créent pas de deuxième dossier. Sur mobile, préférer titres et sections déroulantes à une ligne de dix onglets horizontaux.

Les saisies montrent la job choisie en contexte, pas un champ vide demandant son nom. Photos : étape avant/pendant/après, aperçu de sélection, commentaire facultatif et état en attente explicite. Extra : demande à examiner, aucune approbation ou facturation implicite. Problème : catégorie, note, photo, urgence utile. Outil brisé ouvre exactement le même formulaire et suivi depuis Plus et depuis la job.

La réception Adjointe doit afficher les objets existants, avec même référence job/auteur/date/pièces/état/réponse. Le lien visuel à la job n’élargit pas les droits des conversations privées.

## Formulaires, dialogues et états

Sur360/390/430, un formulaire métier long occupe une feuille plein écran sous le contexte, avec retour nommé, titre court, champs16px et pied d’action. Un petit dialogue centré reste réservé à une décision courte. Éviter une haute boîte à deux scrolls avec croix minuscule.

Libellés permanents au-dessus des champs; aide facultative sous le champ; erreur reliée au champ et récapitulatif seulement si plusieurs erreurs. Après soumission refusée, préserver les données et placer le focus à l’erreur utile. Les validations de fichier et quantité se font avant la transmission mais ne remplacent pas le serveur.

États à dessiner pour chaque parcours : vide, chargement, donnée longue, erreur corrigeable, hors ligne avec brouillon, envoi en cours, reçu confirmé, refus de droit et session expirée. La fermeture d’un brouillon non enregistré est explicite. Aucun état d’envoi coloré vert sans preuve serveur.

## Critères de revue après réalisation

Examiner réellement les cinq onglets, le dossier job, le panier, le fil clavier et les formulaires Photo/Extra/Problème/Bris/Congé/Dépense/Rapport à360/390/430; plusieurs jobs et contenus longs. Refaire au minimum en sombre et grand texte. En desktop/tablette, garder une largeur de lecture et vérifier les composants partagés Boss/Adjointe/Entrepôt/client.

À la date de rédaction, la revue après réalisation n’est pas encore effectuée. Les captures initiales ne valent pas preuve des raccordements serveur ni de l’ergonomie finale. Les résultats de cette revue seront ajoutés ci-dessous, sur les fichiers effectivement intégrés.

### Complément avant — Chef

L’accueil Chef a également été rendu et réellement ouvert à390×844 depuis24d2973 : `/tmp/mir-designer-before-chef-390.png`, script `/tmp/mir-designer-before-chef.cjs`, fixture locale avec une job, deux personnes et une tâche; zéro erreur JavaScript. Il présente la même double barre, une carte job de près de300px, puis un bloc « Ma journée » qui explique le rapport par le mot `Terminer` avant le gros bouton `Terminer ma journée`. Ce rapprochement entretient la confusion entre fin de pointage et rapport. L’aide flottante recouvre ce texte; les outils Chef se trouvent en bas d’un long défilement. Une présence `Confirmer` ne précise pas suffisamment l’état connu; la nouvelle composition doit écrire `À confirmer` et conserver la validation explicite.

## Première revue de la réalisation intégrée

Le premier rendu du checkout de refonte a été ouvert en Chromium,390×844, avec `tests/helpers/mir-field-fixture.cjs` injectée après le vrai client. Les cinq onglets ont été visités pour Employé et Chef : dix captures réelles, cinq boutons dans le bon ordre, aucun débordement horizontal et aucune erreur JavaScript. Le dossier et les formulaires Photo/Problème/Bris ont aussi été ouverts, sans soumission. Les images effectivement examinées se trouvent dans `/tmp/mir-design-after/`; reproduction `/tmp/mir-designer-after-forms.cjs`. Source de travail encore non commitée au moment de cette revue; ces captures ne constituent pas une certification finale ni une preuve hébergée.

Améliorations observées : en-tête unique avec logo/panier/initiales, cinq onglets visibles et actifs, Plus en liste lisible, trois entrées Commande, action Punch verbale et rapport Chef distinct. Les formulaires terrain occupent une feuille mobile plutôt qu’une petite boîte.

Corrections transmises à l’intégrateur avant remise d’un APK :

1. La recherche Message conserve l’ancienne composition empilée (libellé, icône, champ puis gros bouton) dans une grande surface blanche. Elle doit rejoindre la grammaire compacte des autres onglets.
2. L’accueil affiche un select de chantier permanent puis la même job dans une carte. Préférer un changement explicite compact et une liste contenant nom/adresse; permettre le toucher sur la job pour ouvrir le dossier. Raccourcir `Ouvrir le dossier` en `Voir le dossier` pour éviter son retour sur deux lignes à390px.
3. Le dossier doit afficher son numéro de job et alléger ses multiples sections vides. Les fixtures finales doivent comporter de vrais contenus QA représentatifs (plans, tâches, rapports, activités) pour apprécier la hiérarchie.
4. Les formulaires répètent deux fois le nom de la job; conserver un seul bloc contextuel nom/adresse. La photo doit être choisie et prévisualisée avant les détails facultatifs.
5. `Remplacement demandé aujourd’hui` convient au bris d’outil, pas à tous les problèmes chantier; pour les autres problèmes, employer une urgence de traitement sans promesse de livraison.

Ces constats concernent la composition réelle du premier rendu. La vérification finale attend les corrections; aucun écran ou service manquant n’est déclaré terminé.

### Revue des parcours secondaires

Les écrans Magasin, compte, Dépenses et Absences ont aussi été ouverts et capturés à390×844 sans soumission et sans erreur JavaScript, avec la même fixture. Les captures de viewport lisibles sont `employee-magasin.png`, `employee-profile.png`, `employee-expense.png`, `employee-absence.png` dans `/tmp/mir-design-after/`.

Le compte est lisible : nom, rôle et courriel regroupés, Réglages puis Déconnexion séparée. En revanche, le Magasin demeure un obstacle important dans ce premier rendu : ancien grand titre et étapes, puis six raccourcis en trois colonnes si étroites que les noms se cassent au milieu des mots; recherche et catégories ne sont pas atteintes dans le premier écran. Une capture pleine page mesure plusieurs dizaines de milliers de pixels, avec des grands espaces photo vides. La correction demandée est de remonter recherche/catégories, rendre les raccourcis compacts sur deux colonnes ou en liste, séparer matériel et pliages, et réduire les lignes produit à une composition adaptée au téléphone.

Le formulaire Dépenses reste long et l’état Absences de cette fixture ne présente pas d’action de demande. Ce dernier constat peut provenir d’une fixture incomplète; il ne prouve pas un refus serveur. Ces deux parcours doivent être évalués avec le véritable état métier attendu avant toute certification de la refonte complète.

### Deuxième passage visuel

Après corrections de l’intégrateur, les mêmes dix écrans et formulaires ont été rerendus et ouverts à390×844, toujours sans erreur JavaScript ni débordement horizontal. Confirmé : le changement de chantier est un bouton court, le nom de job est désormais touchable, le dossier affiche `Job353`, la recherche/catégorie sont remontées dans le Magasin, et les raccourcis passent sur deux colonnes sans casser les mots.

Restent signalés sur cette itération : le texte du `span.sr-only` de la recherche Message est visible et forme encore une étiquette encadrée sur deux lignes; le bouton `Ouvrir le dossier` prend deux lignes; le contexte job et l’ordre des champs Photo n’ont pas encore été repris. Les états vides du dossier restent trop volumineux pour le peu d’information qu’ils apportent. Ces réserves sont transmises à l’intégrateur; ce passage n’est pas la revue finale.

### Parcours Dessiner une moulure — écart confirmé

L’action Commande → Dessiner une moulure a réellement été suivie à390×844. Elle ouvre `production.html?mode=client&source=store&kind=profile`, sans erreur JavaScript. Capture `/tmp/mir-design-after/employee-personal-drawing.png` effectivement ouverte. Sur ce rendu web local, le moteur réutilisé conserve l’ancien header `Mon dossier ·0` et Menu, aucun en-tête ni barre cinq onglets du chantier; il affiche un grand discours client « Votre pièce. À vos mesures. », deux h1 et l’onglet Panneaux métalliques. Le cadre Android peut masquer certains liens publics; cette observation web ne certifie donc pas une fuite native. Elle confirme néanmoins une rupture de composition et de retour au panier dans le parcours visé.

Correction demandée : adapter le cadre du contexte `source=store&kind=profile` à l’application chantier, préserver le moteur de calcul et PDF, proposer un retour explicite Commande/panier et une navigation cohérente. Ne pas copier le moteur ni ouvrir le droit de modification de la banque. Tant que ce cadre n’est pas revu, le parcours Dessiner ne peut pas être déclaré entièrement refondu.

### Troisième passage — cinq onglets à 360, 390 et 430 px

Le script local `/tmp/mir-designer-final.cjs` a ouvert les cinq onglets pour Employé et Chef aux trois largeurs, soit 30 rendus avec `fieldExperienceEnabled: true`. Les contrôles ont trouvé cinq boutons de navigation, aucun débordement horizontal du document et aucune erreur JavaScript. Les cinq onglets à 360 px ont tous été ouverts visuellement, ainsi que les vues Magasin, Message, dossier et Dessin aux autres largeurs. Captures de viewport : `/tmp/mir-design-final-360/`, `-390/`, `-430/`. Ce sont des vues de l’application réelle alimentées par des données fictives locales, pas des preuves de mutations hébergées.

Les corrections sont visibles : en-tête court, navigation stable à cinq destinations, changement explicite de job, itinéraire distinct du pointage, Commande à trois entrées, Punch à action principale unique et Plus en liste lisible. Le Chef conserve ses accès Équipe/présences et Rapport de journée. Message a maintenant une recherche compacte sans libellé technique visible. Le Magasin remonte chantier, recherche et catégorie; les raccourcis sur deux colonnes ne coupent plus les mots arbitrairement. Le contexte Chef ne confond pas le pointage personnel et le rapport. À 360 px le bouton « Voir le dossier » prend encore deux lignes; c’est une finition souhaitable, sans perte de fonction.

Réserve Magasin : l’icône loupe chevauche le début du placeholder. Réserve Dessin bloquante avant un nouvel APK : le nouveau cadre conserve bien l’en-tête et les cinq onglets, mais l’iframe affiche encore un second logo/en-tête, « Mon dossier · 0 », Menu, un bandeau client et l’entrée Panneaux métalliques. Le diagnostic DOM confirme que le style injecté existe, mais `#mir-harmony-header` reste à `display: grid`; une règle ou un style prioritaire de Harmony l’emporte. Le constat et les classes réelles ont été transmis à l’intégrateur; aucun code applicatif n’a été modifié par Designer.

### Formulaires réellement ouverts après simplification

Les captures `/tmp/mir-design-final-forms/` ont été ouvertes : Photo, Problème, Outil brisé, Profil, Dépense dépliée et Absence dépliée à 390 px, sans soumission. Photo présente désormais la pièce jointe avant Étape et Commentaire; le contexte job n’est répété qu’une fois. Problème et outil partagent le même formulaire et les mêmes états. Le compte regroupe nom/rôle/courriel puis Réglages, avec Déconnexion séparée. Absence masque les heures pour une journée complète. Dépense place le reçu au début et replie les détails secondaires. Les contrôles de fichier et de date en anglais proviennent du navigateur de ce harnais; aucune traduction d’un texte métier anglais n’est supposée.

La Dépense conserve toutefois « Sans JOB » malgré le chantier courant. La lecture a identifié un préremplissage par `select.value` sur un template qui est ensuite sérialisé en HTML : cette propriété n’inscrit pas forcément l’attribut `selected` attendu dans le rendu. L’écart est transmis à l’intégrateur. Aucun formulaire n’est certifié côté serveur par cette seule revue visuelle.

### Confrontation aux données MIR TEST

Les captures hébergées produites par Qualité ont été ouvertes visuellement : `hosted-employee-job-390.png`, `hosted-chef-job-390.png` et `hosted-employee-job-b-390.png` dans `artifacts/chantier-redesign/qualite/`. Elles montrent deux jobs QA distinctes, des plans publiés distincts, des tâches, une photo et un problème sur Façade A, puis un outil brisé et une réponse du bureau sur Garage B. La réponse précise qu’aucune livraison n’est promise. Cela confirme visuellement la bonne séparation des objets présentés; la preuve des écritures et des permissions reste celle de Qualité et du responsable backend.

Écarts transmis : les codes bruts `field_issue`, `open`, `in_progress`, `critical` doivent être traduits dans la présentation; ne pas inventer de numéro de job quand le serveur n’en fournit pas. Deux lignes de tâche de même titre sont visibles sur la capture QA; il faut distinguer un doublon de fixture d’un doublon de rendu. Ce passage ne prétend pas certifier l’émulateur, le WebView ou le Samsung physique.
