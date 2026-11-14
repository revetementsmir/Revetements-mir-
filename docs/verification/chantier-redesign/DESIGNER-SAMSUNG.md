# Designer — correctifs Samsung chantier

État final Designer : les cinq onglets Employé/Chef, le dossier et les formulaires ont été rendus et inspectés depuis le gel courant. Les compositions Accueil8 « Liste nette » et Punch2 « Cadran » approuvées par Frederick sont intégrées; le responsable a comparé les rendus aux deux photos originales, non visibles dans le contexte de cet agent. Les preuves ci-dessous identifient exactement les ressources rendues. Elles constituent une revue visuelle Chromium et des aperçus locaux, sans certification de service hébergé, de WebView physique ou de Samsung.

## Reprise après l’échec natif 39e — preuves du correctif

Le commit `39e961090d988175d6fb6f7be894f34b48f54ddb` reste la référence historique. Son échec Android a été inspecté par le responsable; les preuves Chromium de ce commit ne deviennent pas une réussite native. Avant toute régénération, les 166 fichiers précédents ont été conservés dans `artifacts/chantier-redesign/samsung-designer/historical-39e9610/`, avec `archive-manifest.json`. Les 16 PNG et aperçus versionnés au commit 39e restent également consultables dans cet historique Git.

L’intégrateur a gelé le correctif de `chantier-app.js` et `mir-field-controls.js`/`.css` : gestes non sélectionnables, métadonnées rafraîchies dans la feuille sans perte de focus et filtre de recherche réappliqué lorsque l’adresse arrive. Aucune nouvelle composition ni variante n’a été ajoutée par Designer. Les mêmes 37 états complets, 35 états du fragment et 16 PNG durables ont été régénérés depuis ce correctif.

Empreinte canonique des 105 ressources courantes : `82af7881b028d43b3e803910da7214a048e8b618c99de7834fd9f37364608581`. Toutes ont été comparées aux fichiers courants après capture; la lecture refuse aussi un changement pendant une passe. Le checkpoint Git du rendu est 39e, complété par ces empreintes exactes des modifications correctives; le commit correctif final est fourni dans le bilan de l’intégrateur.

- Complet 37 états : `artifacts/chantier-redesign/preview.html`, 6284590 octets, SHA-256 `d94f9ead89b123eeb1185c735ffbab2789a7bbcfb92eb49783bfff42961b4bc0`.
- Fragment 35 états : `artifacts/chantier-redesign/mir-chantier-preview.html`, 799604 octets, SHA-256 `a1f7186b5c96cc1e85121cca5e6c210d959e756663f6b2d4c93ffe5385e4db0f`.
- Sélection durable de 16 PNG : `screens/samsung-approved/manifest.json`, SHA-256 `3d5855a02fa6e50494665457d009eb54f582fae20b513a8be111db0002cd7ab2`. Copies binaires sans retouche, sources et empreintes présentes dans le manifeste.

Les 120 PNG complets des trois largeurs ont été repris : 60 mesures de hauteur sans défilement de page ou débordement aux formats 732/796/884 px, 12 trajets Home A→B→A sans écriture Punch ni changement du pointage confirmé. Le menu et ses deux adresses ainsi que « En cours ailleurs » ont été réellement ouverts à 390 px; les dix rendus finaux des cinq onglets et deux rôles ont été réexaminés sur une planche issue de ces seules captures. La composition approuvée reste identique.

Les contrôles des nouveaux aperçus passent à nouveau : 47 vérifications pour le complet; 35 états et 10 onglets pour le fragment. Les deux rejouent Home A→B→A et le choix MIR Problème→Outil, sans erreur JavaScript, réseau supplémentaire, stockage ou envoi de formulaire. Ces tests portent sur les aperçus locaux; la vérification WebView/Android du correctif et la recette Samsung demeurent des niveaux distincts dans le bilan du responsable. Le statut d’échec 39e reste historique et n’est pas effacé.

## Historique — livraison du commit39e9610

Base de travail `6039306ac76584ee6b06859786c02eef7cfca685`. Empreinte canonique des105ressources rendues : `e6c98cb844f84ba4f5d7fad77c02554f53735eb7041d3567d3d4f43c64353b8a`. Les fichiers sont relus après capture et comparés à leurs SHA-256. Le garde a réellement refusé une passe lorsque `chantier-app.js` changeait encore; la livraison a ensuite été régénérée depuis le gel effectif. Aucun ancien rendu n’a reçu artificiellement une nouvelle empreinte.

- `artifacts/chantier-redesign/preview.html` :37états pré-rendus, deux rôles, cinq onglets, dossier et formulaires;6 281 807octets, SHA-256 `55812911aeddb669662df4d04a59b481d2b0a3a067ae224e5c3d2a80f2554759`.
- `artifacts/chantier-redesign/mir-chantier-preview.html` :fragment autonome35états,798 307octets, SHA-256 `6d48e371fbc70128e71717bba99369becd0e9f369fcd99317f9cfc521fc696ee`. Deux vues figées du moteur Dessin sont réservées au fichier complet.
- `artifacts/chantier-redesign/samsung-before-after.html` et `samsung-before-after-home-punch.png` :comparaison accessible et planche des captures390×796 Chef sombre, avant603 et après8/2. Aucun contenu des captures n’est retouché.
- `docs/verification/chantier-redesign/screens/samsung-approved/` :16PNG copiés à l’identique, sans retouche, et `manifest.json` donnant leurs SHA-256, leurs sources et les105empreintes du rendu. S’y trouvent les cinq onglets, HomeEmployé/Chef, menuHome/chantierB, Punch actif/inactif/transfert préparé, Magasin, dossier, formulaires et les deux AVANT603.

Les120PNG complets sont conservés dans `samsung-designer/approved-final-native/{360,390,430}/` :40par largeur, deux rôles/deux thèmes, panier3, Punch actif/inactif/transfert et contexteHomeA/B. Les60mesures Accueil/Commande/Magasin/Punch/transfert respectent exactement732/796/884px, sans débordement horizontal ni erreurJavaScript. Les12trajets HomeA→B→A passent : la feuille MIR présente les deux adresses, l’onglet reste Accueil, le pointage confirmé reste surA et aucun appel d’écriturePunch n’est effectué. SurHomeB, « En cours ailleurs » conserve la durée et le libellé accessible donne le nom autorisé deA. Les comptes et données sont des fixtures locales.

Les dix images finales des cinq onglets/deux rôles ont été réellement ouvertes, ainsi que HomeB, le menu, le dossierChef, le formulaireoutil et la dépense. Les contrôles des aperçus passent :47vérifications de navigation pour le complet;35états et10onglets pour le fragment; les deux rejouent le menuHomeA→B→A et le choix MIR Problème→Outil. Aucun appel réseau supplémentaire, référence de stockage, envoi de formulaire ou erreurJavaScript. Le choixUrgence a également été ouvert après défilement du formulaire; ses trois options restent atteignables au-dessus des actions fixes.

Ces aperçus affichent explicitement « données fictives, aucun envoi ». Ils utilisent le DOM et la CSS de l’application, avec les classes de ses contrôles MIR restaurées; aucun moteur serveur, session réelle, API, serviceworker ou stockage n’y est embarqué. Les étatsHomeB supplémentaires évitent de faire changer seulement le titre sans changer l’adresse. Le moteurDessin est une vue visuelle figée dans le complet. Message est vide dans cette fixture; ces images ne prouvent pas une conversation hébergée. La météo externe est volontairement bloquée par le harnais.

Les contrôles de grands textes, paysage, cas combiné très long et les mesures de contraste/aiguille restent ceux des rapports Ergonomie/Harmonisation. La CI sur le futur commit, WebView accélérée et la recetteSamsung physique sont distinctes et ne sont pas certifiées par Designer. Aucun APK n’est fabriqué ni transmis par cet agent. La proposition visuelleAtelier reste en préparation tant que le helper renvoie sa page de connexion; aucune synchronisation de fichiers n’est revendiquée.

## Reprise — compositions approuvées

Méthode Designer1.0.0 et mission existante77d10fb2-15eb-4568-8581-d83bbccaf53b v4 relues fraîchement. MOON1.3.11 frais à12:14:51 est rapporté par le responsable. Aucune nouvelle mission n’est créée, aucun changement de palette ni des règles métier.

### Accueil8 — Liste nette

Conserver logo/panier/avatar et cinq onglets. Date petite au-dessus de Bonjour, météo à droite. La carte job possède un petit label et un chevron de choix intégrés, un titre de job lisible, l’adresse et deux boutons horizontaux Dossier vert/Itinéraire gris. Aucun bouton Changer séparé. Un résumé Punch discret à bord gauche vert mène au même onglet Punch. Vient ensuite une seule liste groupée : Plans du chantier, Ajouter une photo, Signaler un problème et Mon équipe pour Chef uniquement. Terminer par une fine ligne d’avis, icône/compteur/un aperçu, sans grand bloc Mes chantiers.

Budget transmis directement à fullstack : introduction date/Bonjour≈48px; carte job≈168px avec en-tête combinant label/titre dans une cible d’au moins44px, adresse14–16px et actions44px; résumé48px; quatre rangées Chef≈46px chacune; avis44px et espaces6–8px. Total Chef visé≈548px dans une zone utile d’environ594px à360×732. Une adresse longue garde des lignes; on ne fabrique pas le résultat en réduisant la police.

### Punch2 — Cadran

Carte job en haut, gros cadran circulaire à anneau MIR fin et centre charcoal; la zone autour du cadran garde le fond de page transparent, sans grand rectangle gris. Chronomètre numérique dominant, aiguille verte fine visible sur30–45px dans la couronne et tournant une fois par heure depuis les mêmes horodatages confirmés : angle=(secondes écoulées/3600)×360, recalculé à la reprise. Ne pas faire repartir une animation d’une heure au chargement de la vue. Garder les chiffres lisibles devant l’aiguille.

Bouton rond Stop rouge chevauchant le bas de l’anneau, puis libellé Terminer ma journée. Avant début : Play vert et Commencer ma journée. En bas, exactement deux actions secondaires Déplacement/Mes heures. Préserver Changer de job et Arriver au chantier via la carte job ou le panneau Déplacement, avec leurs confirmations et RPC existants; un simple choix de contexte ne doit pas changer un segment.

Budget transmis : carte72–96px, cadran260–280px selon largeur, Stop72–80px avec36–40px de réserve sous le cercle, libellé et deux secondaires44–48px. Ensemble visé≈520–560px. En portrait standard, Accueil et Punch doivent tenir à360/390/430 avec bandeau/safeareas/navigation. À200% ou en paysage, adapter l’ordre et les vues secondaires, sans couper de texte ou d’action. Aucun X ou ellipsis de visionneuse, aucun libellé Aperçu QA ni donnée de maquette codée dans l’application.

### Conservation avant cette nouvelle intégration

Le code Samsung pré-pause a été figé avant les changements de fullstack :210fichiers de code/statique/fixture et styles mobiles dans `/tmp/mir-samsung-pre-approved-snapshot/`, avec un manifeste SHA-256. Les captures `samsung-designer/pre-approved-native/{360,390,430}/` lisent cette copie :24PNG par largeur,72 au total, deux rôles/deux thèmes, deux jobs, panier3 et Punch actif/inactif. Les vues Chef sombre Accueil/Punch ont été réellement ouvertes. Ce snapshot s’ajoute aux AVANT603 et aux passes intermédiaires conservées; aucune preuve historique n’a été supprimée.

### Première comparaison au choix approuvé

Les premiers rendus390 natifs simulés ont été réellement ouverts dans `approved-first-native/390/`. Le responsable a ensuite comparé ces PNG aux originaux, qu’il possède. Ses précisions font foi : date avant Bonjour et météo à droite; titre de job22–24px; icônes de liste vertes et libellés exacts Ajouter une photo/Signaler un problème; résumé Prêt à commencer avec horloge et courte indication si aucun Punch; avis avec cloche, compteur et aperçu. Punch garde seulement la carte job en haut : le déclencheur fait partie de cette carte, sans faux champ imbriqué ni répétition. Cadran transparent sur le fond de page, Stop72–80px, aiguille visible30–45px.

Défauts observés sur ce premier jet et transmis : date sous Bonjour, absence d’icône d’avis visible, aiguille active masquée par le grand centre opaque, et rectangle gris créé par le style désactivé autour du Play/texte. Aucun cadran n’a été certifié avec ces défauts. Les PNG restent conservés et les retouches sont en cours.

### Deuxième passe des compositions approuvées

Les84PNG de `samsung-designer/approved-second-native/{360,390,430}/` sont générés depuis les sources courantes, avec manifestes SHA-256 : deux rôles, deux thèmes, panier3, Accueil actif/inactif, Punch actif/inactif, Commande, Magasin et compte. Les48mesures Accueil/Commande/Magasin/Punch respectent exactement les hauteurs simulées732/796/884px, sans débordement horizontal ni erreur JavaScript. Il s’agit toujours de Chromium avec CSS native injectée, pas d’une mesure WebView physique.

Ont réellement été ouverts : Accueil Chef sombre390/360, Punch Chef sombre390 et clair360, Punch inactif Employé clair390. Date avant Bonjour, nom job22px, liste groupée avec icônes vertes, ligne d’avis et cadran sur fond de page sont désormais présents. Le Stop a un diamètre extérieur76px; la partie rouge intérieure70px résulte de son contour3px et ne constitue pas un écart à la cible72–80px. Le chrono inactif affiche00:00:00 et le Play désactivé garde une forme ronde sans rectangle gris autour de son texte.

Une adresse fictive longue a également été rejouée à360×732 dans `approved-second-native-long/360/` :28PNG et16mesures, toujours sans défilement de page ni erreur. Accueil Chef et Punch Employé sombre ont été réellement ouverts; l’adresse garde trois lignes lisibles, les quatre actions Chef et les deux secondaires Punch restent visibles. Le cadran réduit sa taille dans ce cas chargé pour préserver le contenu utile.

L’Accueil inactif Employé clair390 a ensuite été réellement ouvert : Prêt à commencer/Aucun pointage en cours sont présents, mais la petite horloge demandée dans le résumé manque encore et a été signalée.

Réserves encore ouvertes à ce stade : le déclencheur du chantier Punch conserve un deuxième cadre de champ dans la carte, dû à la spécificité CSS commune; un petit fragment de l’aiguille réapparaît entre le libellé central et les chiffres à certains angles. Les deux constats ont été transmis directement à l’intégrateur et à Harmonisation. La visibilité peinte30–45px aux quatre quadrants doit être contrôlée après leur correction. Le responsable compare les nouvelles images aux deux originaux qu’il possède. Aucun aperçu autonome n’est régénéré avant le gel explicite.

### Retouches de composition contrôlées

Une troisième passe390 (`approved-third-native/390/`,28PNG) a réellement ouvert Punch Chef sombre et Accueil inactif Employé clair. Le faux champ bordé dans la carte Punch est supprimé; CHANTIER ACTUEL/JOB353 sont regroupés, le nom et l’adresse restent lisibles. La main est désormais peinte seulement près de la couronne, sans fragment vert observé entre les textes à cet angle; le contrôle des quatre quadrants relève de la passe Harmonisation. Le résumé Accueil possède maintenant l’horloge demandée et ses deux lignes. Les16mesures de page à390 respectent796px sans erreur ni débordement. Les réserves de composition de la deuxième passe sont levées pour ces rendus; aucune recette physique n’en est déduite.

### Cas combiné à reprendre avant gel

Ergonomie a ensuite signalé un cas plus chargé que l’adresse longue seule : Home Chef360 avec prénom très long, job69caractères et adresse75caractères atteint817px pour780px, et la ligne d’avis passe sous la navigation. Ce constat interdit de généraliser la réussite des données courantes à toutes les longueurs. Il est transmis au responsable et à l’intégrateur. Priorité : réduire espaces/paddings tout en gardant cibles44px et adresse/titre lisibles. Si nécessaire, une salutation courte Bonjour garde le nom entier dans Profil; ne pas perdre les actions ou couper les données utiles pour satisfaire la hauteur. Correction et contrôle Ergonomie restent attendus.

### Livraison visuelle Atelier

Le responsable a relu les instructions actuelles de la proposition Designer puis retesté le helper officiel : redirection303 vers une page HTML de connexion,2996octets; aucun fichier envoyé. Preuve versionnée : `proofs/samsung-atelier-upload-helper.json`. La proposition visuelle reste en préparation. Les lectures et mises à jour de tâches/rapports par MCP fonctionnent; cela ne constitue pas un transfert de captures ou du HTML. Les aperçus locaux et captures durables seront la livraison disponible, sans publication Pages ni contournement de cette connexion.

## Historique — composition compacte avant le choix final

Conserver les cinq onglets et le même panier. La correction porte sur la hiérarchie, la densité utile, les choix et les surfaces, avec du charcoal neutre et du vert MIR. Aucun accent orange décoratif. Une couleur d’erreur fonctionnelle ne sert pas de décoration.

1. **Accueil court.** Ligne date/météo compacte, puis salutation courte. Une seule carte job rassemble le choix de chantier, son nom, son adresse et Dossier/Itinéraire. Retirer le bouton Changer de chantier séparé et les répétitions du contexte. Une ligne de pointage ouvre Punch. Garder Plans/Photo/Problème dans trois cibles d’au moins 44 px. Les notifications deviennent un résumé court ouvrant la liste complète. Pour Chef, une seule ligne Équipe/tâches/rapport remplace la grande carte à rangées; les présences non confirmées ne deviennent pas des absences. Mes chantiers reste dans le choix et Plus. Les objets et permissions restent inchangés.
2. **Commande sans défilement de page en portrait standard.** Titre court, contexte job compact, trois entrées de 64–76 px : Magasin, Banque de pliages, Dessiner une moulure. Suivi et Livraisons dans deux cibles secondaires de 44 px. Panier intégré, sans bandeau qui recouvre le contenu. Une quantité n’est pas confondue avec le nombre de lignes du badge.
3. **Magasin réellement utilisable sans défilement de page.** Rangée Retour/nom, choix de chantier, recherche, Catégorie/Favoris, résultats paginés dans la hauteur restante, pagination, panier compact. Supprimer la grosse introduction et les raccourcis répétés avant la recherche. Une ligne produit montre le nom lisible, les informations utiles et un accès au détail; quantité et variantes restent dans le formulaire guidé existant. Les produits et réglages ne disparaissent pas pour faire tenir la capture. Calculer le nombre de résultats depuis l’espace réel; une seule ligne par page est préférable à une ligne coupée quand l’espace est limité. Tous les résultats restent atteignables par pagination et recherche.
4. **Punch d’action.** Titre court, même choix de chantier sur plusieurs lignes, état puis chronomètre `HH:MM:SS` dominant et heure de début. Commencer/Terminer reste l’action principale. Changer de job/Déplacement sont deux cibles courtes; Mes heures et les corrections passent par un accès secondaire vers leurs fonctions existantes. Le temps est recalculé à partir des horodatages confirmés, y compris après reprise; il ne doit pas prétendre représenter les heures nettes payables. Aucun compteur incrémental fragile ni écriture chaque seconde. Retirer les phrases techniques répétées de la composition courante.
5. **Choix MIR commun.** Déclencheur comportant le nom puis l’adresse, chevron et libellé accessible. Panneau commun clair/sombre, recherche pour les longues listes, sélection courante visible, options désactivées conservées, Annuler/Fermer accessibles, focus et retour Android pris en charge. Nom de job à 16 px et adresse à 14–16 px, avec retour à la ligne; aucune adresse miniaturisée pour sauver une rangée. Ne pas redessiner les dialogues Android de fichier, permission ou biométrie. Les choix métier de l’iframe Dessin font partie de l’inventaire.

## Budget de hauteur et composants

Mesurer la zone utile entre le bas réel de l’en-tête et le haut de la barre basse. Déduire le bandeau TEST, les zones système et l’éventuel clavier; éviter un calcul fondé uniquement sur 844 px. Ne pas utiliser `overflow:hidden` sur toute la page pour couper les dernières actions.

En portrait standard, Punch peut tenir avec un titre d’environ 28–32 px de haut, un choix job d’environ 64–80 px, une carte état/temps/action d’environ 180–200 px, les deux actions de 48 px et un accès Mes heures de 44 px, avec des espaces de 8–12 px. Le chiffre du temps peut utiliser 40–44 px et des chiffres tabulaires; les champs conservent 16 px et les cibles au moins 44 px. Texte agrandi, petit paysage et clavier peuvent exiger une pagination, un panneau ou une vue secondaire explicitement accessible.

Pour Magasin : Retour/titre 44 px, job environ 60–80 px, recherche 44 px, catégorie/favoris 44 px, pagination 44 px et panier intégré 44 px. Les résultats prennent le solde, avec leurs noms complets disponibles dans le détail. Pas de galerie de centaines de cartes dans un conteneur simplement masqué.

La palette finale est coordonnée avec Harmonisation, qui possède les mesures : proposition retenue pour intégration charcoal `#151718`, surfaces `#1f2224`/`#282c2f`, texte `#f4f5f2`, secondaire `#bdc4c0`, bord actif `#69726d`, action `#78c65a` avec texte `#151718`, focus `#9edb86`. Le logo fourni utilise `#57c03f`, conservé. Ce sont des choix de réalisation à mesurer, pas des hex prétendument approuvés par Frederick. La proposition Designer initiale de bord plus faible `#454B54` a été retirée après la mesure d’Harmonisation. Les grandes surfaces ne restent pas vert foncé. En clair, garder des gris neutres et du texte charcoal; adapter le vert des textes/actions pour le contraste.

## État réellement vérifié avant modification

Base figée `6039306ac76584ee6b06859786c02eef7cfca685`, PR37, branche `codex/refonte-chantier-employe-chef`. Le serveur de capture lit chaque ressource via `git show` sur cette révision : les modifications ultérieures de l’intégrateur ne changent pas les preuves AVANT.

Fixtures comparables pour les deux rôles : deux jobs autorisées, trois lignes de pliage fictives dans le panier (quantités 1/2/3, propriétaire et job corrects), une notification de plan fictive, Punch actif depuis 09 h UTC et état inactif capturé séparément. Aucun compte réel, appel hébergé ou envoi. Le remplissage initial sans ownerId/jobId ne remplissait pas le panier, conformément à ses protections; il a été corrigé dans le seul harnais, puis toutes les captures finales ont été reprises avec le badge 3 réellement vérifié.

Preuves : `artifacts/chantier-redesign/samsung-designer/before/{360,390,430}/`, 24 PNG par largeur, 72 PNG au total, et un manifeste SHA-256 par largeur. Captures 390 réellement ouvertes : Accueil/Commande/Magasin/Punch Chef sombre, Magasin/Punch Employé clair. Les autres PNG sont générés, sans prétendre avoir tous été inspectés à ce stade.

Mesures du document à 390 × 844 :

| Vue | Employé | Chef | Constat |
| --- | ---: | ---: | --- |
| Accueil | 1 005 px | 1 342 px | Contexte et sections trop étalés |
| Commande | 844 px | 844 px | Hub tient déjà à ce format; préserver ses entrées |
| Magasin | 31 216 px | 31 216 px | Catalogue intégral très long, panier superposé |
| Punch actif | 1 025 px | 1 025 px | Actions secondaires hors du premier écran |

Aucun débordement horizontal ni erreur JavaScript dans les captures finales. Cela ne prouve pas la qualité des contrastes : le Magasin sombre montre une introduction très claire avec texte très clair, Favoris quasiment illisible et des raccourcis blancs sur blanc. Le vert foncé domine les grands fonds. Le sélecteur Punch coupe l’adresse et la répète immédiatement dessous. Le constat de menu système Samsung vient des captures utilisateur rapportées par le responsable; ces PNG Chromium ne constituent pas une capture Samsung physique.

## Coordination et sources

Méthode `interface-designer` 1.0.0 relue fraîche via Atelier; mission existante `77d10fb2-15eb-4568-8581-d83bbccaf53b`, version 4, retrouvée sans recréation. Cadrage UX `4b001308-b3a8-49c4-9053-17745940f200`, version 14, lu en entier dans la réponse de la fiche. Les instructions concrètes et le GO AVANT ont été transmis directement à l’intégrateur. Seul fullstack modifie l’application et les tests. Designer écrit ce rapport et ses preuves visuelles.

SEO/GEO : non applicable à cette application métier privée; aucune surface publique ou règle d’indexation modifiée. Aucune production, Pages, fusion, émission de courriel, signature release ou distribution aux employés. L’application et les données Samsung installées restent préservées.

## Programme de vérification et niveau de preuve

À effectuer sur les vrais rendus après intégration : mêmes données/largeurs/thèmes, nom et adresse longs, plusieurs affectations et absence d’affectation, choix communs, chronomètre actif/inactif/déplacement, reprise et panier non vide. Inspecter réellement les nouvelles images, puis transmettre et faire corriger les écarts. Vérifier que Commande/Magasin/Punch ne défilent pas en portrait standard tout en conservant leurs contenus et actions. Le simple rapport des dimensions ne suffit pas; chercher le dernier résultat, ouvrir son détail et atteindre la pagination.

L’aperçu autonome sera régénéré seulement après le gel de l’intégrateur. Les tests hébergés, WebView accélérée et Samsung physique restent des niveaux distincts. Cette ancienne étape de préparation ne constitue pas le bilan final; les résultats APRÈS courants sont décrits en tête du rapport. Aucun résultat CI ou Android n’est revendiqué par Designer.

## Revue intermédiaire des vrais rendus après intégration

Les premières images ont été réellement ouvertes, avec les mêmes deux jobs, trois lignes de panier et états de Punch. Le rendu est nettement plus compact et les grandes surfaces sont devenues charcoal. Les premiers défauts visuels ont été transmis directement à fullstack puis repris : recherche Magasin étirée à environ 180 px, flèche Retour orientée vers l’avant, surplus documentaire de 30 px introduit par le padding bas natif, double titre produit, grand placeholder sans image et accords du résumé Chef.

La troisième passe utilise la CSS et le bandeau bootstrap natifs actuels, injectés selon le harnais Mobile, dans un viewport simulé de 390 × 796. Le retrait de 48 px système est une hypothèse explicite de test; aucune géométrie Samsung réelle n’est déduite de cette simulation. Preuves : `artifacts/chantier-redesign/samsung-designer/after-third-native/390/`, 40 PNG et leur manifeste. Les quatre vues Accueil/Commande/Magasin/Punch mesurent désormais 796 px pour les deux rôles et deux thèmes, sans débordement horizontal ni erreur JavaScript, avec badge panier 3.

Magasin a été vérifié au-delà de sa première page : passage réel à la page 21/21, ouverture du dernier produit, puis fermeture. Le catalogue reste atteignable; il n’a pas simplement été coupé. Trois lignes lisibles apparaissent à 390 px, la recherche reste à 44 px, la pagination et le panier ne masquent plus les produits. Le détail ne répète plus son titre et conserve quantité obligatoire/Ajouter. Les panneaux de choix chantier et catégorie ont été ouverts; les deux adresses apparaissent et la sélection courante est cochée.

Réserves de cette passe : le titre du panneau Catégorie reste générique (« Choisir »), l’unité produit est trop petite, et l’unique produit de la dernière page s’étire en une grande carte vide. Ces finitions sont transmises à l’intégrateur. Les titres des choix masqués doivent rester contextuels, y compris pour le lecteur d’écran.

### Adresse longue et petit portrait

Une adresse fictive longue a été injectée dans la fixture, sans toucher au code applicatif ni au serveur. À 360 × 732 avec CSS native simulée, Magasin et Punch restent dans les 732 px, avec deux produits et toutes les actions visibles. L’adresse est lisible sur trois à quatre lignes. Ces images ont été réellement ouvertes : `after-long-native-long/360/employee-dark-magasin.png`, `employee-dark-punch.png` et `chef-dark-day.png`. L’Accueil Chef atteint 772 px avec cette adresse : 40 px de défilement, autorisés pour cet écran et nettement moins que les 1 362 px initiaux au même gabarit étroit. Ne pas supprimer l’équipe pour faire disparaître ce petit défilement.

Le chronomètre distingue maintenant visuellement la durée globale de celle du chantier ou du déplacement. La formulation « durée de la journée » a été signalée comme ambiguë avec les heures nettes; l’intégrateur la remplace par « temps écoulé depuis le début » et nomme le chantier pointé ou la destination. Le calcul et les reprises doivent être confirmés par Qualité/Mobile; cette revue de composition ne certifie pas la règle de paie.

L’aperçu autonome reste volontairement non régénéré pendant les modifications. Le bilan final attend les dernières corrections, les nouvelles images et le gel explicite des sources.

### Paires natives simulées comparables

Pour éviter de comparer des hauteurs différentes, les preuves AVANT ont aussi été reprises depuis le commit figé et ses propres fichiers `team.css`/`bootstrap.js` à 360 × 732, 390 × 796 et 430 × 884, avec les mêmes trois lignes de panier et Punch actif/inactif. Dossiers `samsung-designer/before-native/{360,390,430}/` : 24 PNG et un manifeste par format. Ces manifestes incluent également les empreintes de la fixture et des deux sources mobiles injectées. Les vues Magasin et Punch Chef sombre à 390 ont été réellement ouvertes.

À 390 × 796, l’ancien Hub mesure 823 px, Magasin 31 239 px et Punch actif 1 048 px; la troisième passe actuelle mesure 796 px pour chacune de ces vues. Ces comparaisons restent des simulations Chromium avec CSS native exacte, distinctes de mesures WebView et Samsung réelles. Les premières captures 844 px sont conservées dans leur dossier séparé, sans les faire passer pour des paires de la même hauteur.

## Passe de composition complète aux trois formats

Après stabilisation des finitions, le harnais a ouvert les cinq onglets, Magasin, les choix de catégorie/job, la dernière page, son détail produit, le profil et les trois états Punch (inactif, actif, déplacement) pour Employé et Chef, en clair et sombre. Dossiers `samsung-designer/after-review-native/{360,390,430}/` : 52 PNG par format, 156 générés, avec manifestes. Aucun aperçu autonome n’a encore été remplacé.

| Vue à vérifier sans défilement | 360 × 732 | 390 × 796 | 430 × 884 |
| --- | ---: | ---: | ---: |
| Hub Commande | 732 px | 796 px | 884 px |
| Magasin | 732 px | 796 px | 884 px |
| Punch actif | 732 px | 796 px | 884 px |
| Punch déplacement | 732 px | 796 px | 884 px |

Les 36 combinaisons Hub/Magasin/Punch actif (trois formats, deux rôles, deux thèmes) respectent la hauteur documentaire, sans débordement horizontal ni erreur JavaScript. Le badge reste 3. Les états déplacement respectent également ces hauteurs et nomment la destination. Les états inactifs sont capturés séparément avec `00:00:00`, sans prétendre qu’une mutation serveur a été exécutée.

Les images finales suivantes ont été réellement ouvertes : dernière page, produit et panneau Catégorie Chef sombre 390; Punch déplacement Chef sombre et Punch inactif Employé clair 360; Plus Chef sombre 360; Message Employé clair/Chef sombre et Accueil Chef clair 390. Les dernières réserves sont levées : le titre indique Catégorie, l’unité produit utilise une taille lisible, la ligne isolée ne remplit plus artificiellement toute la zone. Le détail garde quantité/Ajouter sans doublon de titre. Les accords 1 membre/1 tâche sont corrigés.

L’état Message vide reste explicitement vide et lisible; il ne prouve pas l’envoi d’un message hébergé. Plus Chef défile encore de 57 px au petit format 360 × 732 : c’est permis pour cet écran, et le contenu reste atteignable. Le nouveau Punch nomme le chantier pointé ou la destination et distingue son temps du temps écoulé global. Les contrôles de calcul, reprise, validations et droits restent ceux de Qualité/Mobile; aucun succès Samsung physique n’est annoncé par ces captures.

Le rendu ne présente plus de défaut de composition bloquant observé sur ce périmètre. Le calendrier/heure, les états de validation et les contrastes mesurés sont revus par Ergonomie/Harmonisation; leurs résultats ne sont pas remplacés par ce rapport. La prochaine étape Designer est le gel des sources puis la livraison des deux aperçus autonomes avec les mêmes ressources et leurs empreintes.

### Cadre du tracé personnel

Un contrôle ciblé supplémentaire a réellement tracé trois points par événements tactiles, puis ouvert l’étape Mesures, pour Employé et Chef à 390 × 844 sombre. Dans ce contexte Chromium : en-tête y=0–64, navigation y=770–844, iframe terminant à 758, défilement parent nul, aucun élément en plein écran dans le parent ni l’iframe et aucune erreur JavaScript. Les captures `/tmp/mir-samsung-touch-chef-trace.png` et `-dimensions.png` ont été réellement ouvertes et montrent les deux barres. Les versions Employé sont également conservées sous `/tmp`. Cela confirme le cadre observé dans ce scénario; les autres contraintes natives restent à vérifier par Mobile et la CI.

Limite météo : les harnais Designer bloquent volontairement les requêtes HTTPS externes. Le libellé « Météo indisponible » sur ces captures n’est donc pas un diagnostic du service sur le Samsung. Aucun temps fictif n’est présenté comme météo réelle; le diagnostic réseau/données demandé relève d’un contrôle séparé.
