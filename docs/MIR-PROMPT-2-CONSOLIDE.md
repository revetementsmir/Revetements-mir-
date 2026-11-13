# PROMPT 2 — MIR — Gestion interne, catalogue et modèles de pliage

## Mission

Reprendre le dépôt existant `revetementsmirweb/MIR` à partir de son état courant. Intégrer les exigences ci-dessous sans reconstruire le site, sans écraser les corrections existantes et sans mélanger ce projet avec un autre produit.

Ne pas publier en production avant validation des permissions, des parcours, du visuel et des tests intercomptes. Toute donnée privée doit être protégée côté serveur par Supabase/RLS; masquer un bouton ne constitue jamais une autorisation.

## 1. Rôles et propriété

Rôles opérationnels confirmés :

- Boss — Simon;
- Adjointe — Esther;
- Chef d'équipe;
- Employé chantier;
- Entrepôt/livraison.

Le rôle Admin apparaît dans la certification générale des six rôles et doit être conservé s'il existe déjà. Ne pas lui transférer automatiquement les tâches métier de Simon ou Esther.

Tableaux de bord et actions attendues :

- Boss : synthèse équipes/chantiers; absences, retards, problèmes, extras et matériel à approuver; approbation/refus; assignation d'un chantier; déplacement d'un employé; remplacement temporaire d'un Chef; consultation des rapports; confirmation avant action sensible; aucun accès aux paramètres techniques ou permissions réservés à Admin;
- Adjointe : suivi des heures/corrections, dépenses, absences, commandes, fournisseurs, rapports et exports nécessaires, sans accès financier ou technique non requis;
- Admin : comptes, rôles, configuration Staff/Entrepôt, inventaire, véhicules, permissions, paramètres et journal des actions sensibles;
- Entrepôt : préparation/expédition et inventaire seulement; aucun accès Boss/Admin;
- Chef et Employé : accès limité aux chantiers, équipes, tâches, documents et rapports autorisés.

Simon et Esther peuvent, selon leurs permissions : inviter un utilisateur, attribuer son rôle, désactiver son compte et lancer une réinitialisation de mot de passe. Les invitations doivent être réelles via Supabase; l'utilisateur choisit son mot de passe à la première connexion. Ne jamais transférer les comptes de test vers la production.

MIR conserve la propriété du domaine, des données, de la facturation et des accès. Simon est le propriétaire principal; prévoir un accès de secours autorisé.

## 1.1 Modèles privés, production et publication

Séparer clairement : une pièce privée de production ponctuelle, un modèle privé réutilisable par MIR et un produit explicitement publié dans le Magasin employé ou la Boutique. Tout demeure privé par défaut. Permettre des mesures persistantes, valeurs par défaut et mesures verrouillables. Une publication est explicite et journalisée. Les commandes historiques sont immuables, mais une pièce historique peut être réutilisée en production sans être redessinée. Un import/export de modèles ne doit jamais écraser les modèles existants ni importer silencieusement les commandes historiques.

## 2. Dossier chantier central

Chaque chantier repose sur un `job_id` central et regroupe : équipe, employés, adresse, plans, documents, tâches, rapports, heures, punchs, extras, demandes, commandes, fournisseurs et conversation liée au chantier.

- Conserver l'historique après fermeture.
- Limiter chaque rôle à ses chantiers et données autorisés.
- Journaliser toute action sensible avec auteur et horodatage.

## 3. Expérience terrain — « Aujourd'hui »

Interface mobile simple et harmonisée : météo courte, chantier du jour, adresse, GPS/itinéraire, appel, dossier, présence, tâches, demandes de matériel, problème/extra avec photo et urgence, puis rapport de fin de journée rapide.

Le Chef voit son équipe et ses chantiers, sans salaires ni profits globaux. L'Employé voit seulement ses affectations, tâches, documents et demandes autorisés.

À la fermeture du punch, demander au Chef l'avancement du chantier : 10 % à 70 %, ou « Terminé ». Afficher cette information en temps réel à Simon et Esther.

## 4. Punch, GPS, dîner et fonctionnement hors ligne

- Module activable/désactivable.
- Heure serveur obligatoire.
- Aucun suivi GPS continu.
- Capturer la position uniquement au punch, au changement de chantier ou lors d'un déplacement.
- Proposer Waze, Google Maps et Apple Plans.
- Un punch continu par journée, découpé en segments par chantier.
- Fonctionnement hors ligne avec synchronisation fiable au retour du réseau.
- Aucun bouton de punch de pause.
- À 5 h ou moins : aucune déduction.
- À plus de 5 h : déduire automatiquement 15 minutes de dîner.
- Exception « dîner non pris » soumise à approbation.

Correction de punch : demande avec ancienne valeur, nouvelle valeur, motif, auteur, approbateur, décision et horodatage. Simon ou Esther approuve, refuse ou demande une correction. Conserver toutes les versions.

## 5. Heures et banque d'heures

Créer « Mes heures » avec vues semaine, mois et année :

- historique hebdomadaire par chantier;
- totaux par employé, équipe, chantier et compagnie;
- confirmation ou demande de modification;
- banque d'heures;
- feuilles de temps;
- statut d'approbation;
- semaines verrouillées après approbation;
- réouverture autorisée seulement avec permission et journal d'audit;
- exports PDF, CSV, Excel et format paie.

## 6. Dépenses

L'employé photographie une facture. Extraire automatiquement le fournisseur, le sous-total, la TPS, la TVQ et le total; l'employé doit vérifier avant l'envoi. Conserver l'image originale.

Esther reçoit la dépense et peut l'approuver, la refuser ou demander une correction. Statuts : envoyée, à vérifier, correction demandée, approuvée, payée ou remboursée. Conserver l'historique complet.

## 7. Absences

Prévoir des parcours distincts pour vacances, congé et maladie, avec dates, motif/note, statut, approbation, effet sur la cédule et historique.

## 8. Commandes, Adjointe et Entrepôt

Routage métier : Chef/Employé → Esther/Adjointe → Entrepôt ou fournisseur/Shop. Une commande ne doit pas arriver directement au Shop sans traitement par l'Adjointe.

Esther trie chaque ligne entre « Entrepôt » et « À commander », peut créer plusieurs bons fournisseurs pour une même commande et conserve numéro de job, adresse, équipe et historique. Autoriser les ajouts tant que la commande n'est pas expédiée.

Les catégories, préréglages et champs de commande sont configurables par Simon/Esther, puis remplissables par Chef/Employé selon leurs permissions. Conserver les unités utiles par article (boîte, morceau, longueur) et la quantité demandée.

Pour les achats fournisseurs : conserver le fournisseur, le bon lié, le chantier, l'adresse de livraison, les notes, les révisions et le courriel préréglé. Un brouillon demeure explicitement « Brouillon ». Le statut « Envoyé » exige une réponse réelle du service d'envoi; un échec conserve le bon prêt à envoyer et journalise l'erreur. Ne jamais simuler un envoi réussi.

Fournisseurs de pliage récupérés : Unico Revêtement, Breton Pliage, Al Nordica et Pliage Québec. Permettre plusieurs bons/fournisseurs pour une même demande. Les documents fournisseur conservent numéro de bon, couleur, quantité, longueur, acier/aluminium, code projet, adresse de livraison, visuel/profil et historique de révision.

Entrepôt : commandes à préparer avec job/adresse/équipe, scan QR, déduction ou ajustement d'inventaire, notification d'ajustement (ex. `+3 tube mono — commande 353`) et historique.

Statuts à préserver selon le parcours :

- commande reçue → à traiter par Adjointe → assignée au Shop;
- production : à produire → en production → prêt → embarqué → livré.

« Marquer embarqué » retire la quantité de l'inventaire et journalise le mouvement. L'expédition ferme correctement la commande sans perdre l'historique.

## 9. Apparence, thèmes et accessibilité MIR

Dans `Compte → Réglages → Apparence`, proposer exactement :

- Automatique : suit le mode clair/sombre de l'appareil;
- MIR clair : fond blanc cassé, texte vert très foncé, boutons vert MIR, adapté au plein soleil;
- MIR sombre : fond anthracite, cartes gris foncé, texte blanc, boutons vert MIR, adapté au soir;
- Chantier haute visibilité : contraste fort, textes courts, icônes uniformes, gros boutons utilisables avec des gants, maximum trois blocs importants visibles et une seule action principale.

Accents contrôlés : vert MIR, bleu, orange, graphite. Défaut : Automatique + vert MIR. Les couleurs de statut restent fixes. Le choix change seulement l'apparence, jamais la structure ni les permissions; il est enregistré dans le profil et appliqué instantanément à toutes les pages sur téléphone, tablette et ordinateur.

Sémantique fixe des statuts, indépendante de l'accent choisi : rouge = urgence/action requise; orange = à surveiller; vert = normal ou complété. Vérifier que l'accent orange ne rende jamais un statut ambigu.

Ajouter : taille du texte, contraste renforcé, réduction des animations et cibles tactiles d'au moins 44 px.

## 10. Autres réglages du compte

Langue, unités/format des mesures, coordonnées/adresse, préférences de notifications et tableau de bord adapté au rôle.

Notifications fines : punchs/corrections, nouveaux plans, livraisons, dépenses, absences/congés, demandes et approbations. Conserver lu/non lu et lien vers l'action concernée.

Prévoir l'historique des sessions et appareils connectés. Toute option de 2FA renforcée pour Simon/Admin doit rester à confirmer avant d'être imposée.

### Catalogue de prix privé — soumissions

Conserver ce catalogue séparé des prix publics de la Boutique. Il peut regrouper coût matériau, main-d'œuvre, pertes, marge, taxes, prix conseillé et historique de révision. Les changements majeurs exigent l'approbation de Simon. **À confirmer :** cette fonction apparaît dans une recommandation acceptée de réglages, mais sa portée finale doit être validée avant développement.

### Livraison et tarification publique

Préserver les règles récupérées : frais de livraison 60 $ modifiables; gratuit à partir de 300 $ dans un rayon de 40 km; maximum 80 km, au-delà sousmission. Calcul automatique selon l'adresse du compte. **À confirmer :** valider que ces seuils appartiennent au périmètre immédiat du prompt 2 avant modification de la production.

## 11. Centre d'aide, clavardage et navigation

Centre client regroupant FAQ, demandes et clavardage. Esther reçoit les notifications et peut répondre ou transférer une conversation au Boss, à l'Entrepôt ou à un employé autorisé. Prévoir statuts, non lus, pièces jointes et notes internes invisibles au client. FAQ administrable par les rôles autorisés.

Navigation PC : Accueil, Boutique, Pliage sur mesure, Studio 3D, Réalisations, Centre d'aide. À droite : Recherche, Ma demande, Mon compte. Intégrer Matériaux à Boutique et Nous joindre au Centre d'aide.

Navigation mobile fixe : Accueil, Boutique, Pliage, Commandes, Compte.

Les demandes d'estimation doivent être envoyées directement par le site à `estimation@revetementsmir.com`, jamais avec un lien `mailto:`. Afficher la confirmation seulement après un envoi réellement réussi; conserver le brouillon en cas d'échec.

## 12. Sécurité et audit

- Vraies sessions Supabase et contrôles RLS/RPC.
- Isolation organisation/équipe/chantier.
- Refus des URL et actions interdites même en accès direct.
- Fichiers privés protégés côté serveur.
- Journal d'audit pour punchs, corrections, approbations, dépenses, absences, inventaire, commandes et périodes rouvertes.
- Déconnexion, expiration et renouvellement de session sans élévation de privilège.
- Ne jamais exposer de secret dans le navigateur, les logs ou les captures.

## 13. Catalogue et accessoires

Les couleurs de l'interface (section 9) sont entièrement distinctes des couleurs de produits. Pour les produits, conserver les codes fabricant dans les détails techniques et ne jamais substituer une palette d'une marque à une autre.

### Vis à soffite

- « Vis à soffite 5/8 po — carré no 1 »;
- une fiche indépendante, également proposée comme accessoire compatible sur les fiches de soffite;
- aucune addition automatique;
- quantité choisie par le client;
- vraies couleurs réellement offertes par chaque fabricant, palettes jamais mélangées;
- noir et blanc en premier lorsqu'ils existent;
- inclure Kaycan et les autres marques réellement offertes, dont Royal Steel si confirmé au catalogue;
- une vraie tête de vis détourée; seul le fini peint de la tête change selon la couleur.

Harmoniser avec la règle des vis à fascia : même angle, même cadrage et même éclairage; seule la peinture de la tête varie. Ne pas créer une image complète différente pour chaque couleur.

Les vis à fascia 2 po, tête hexagonale 1/4 po Kaycan, suivent la même logique : une seule fiche et un seul visuel de base; la couleur de la tête est la variante. Vérifier les vraies couleurs Kaycan avant publication.

### J à soffite

- longueur 12 pi;
- fiches distinctes par fabricant : Kaycan, Gentek, Royal, TruVent et autres marques réellement présentes;
- palette réelle propre à chaque fabricant, jamais mélangée;
- noir et blanc en premier lorsqu'ils existent;
- produits indépendants et accessoires compatibles, jamais ajoutés automatiquement.

Les références génériques existantes « J à soffite blanc — 12 pi » et « J à soffite noir — 12 pi » doivent être migrées ou rattachées sans créer de doublons avec les fiches fabricants.

### Autres ajouts

- membrane blanche 3M : 4 po, 6 po et 12 po;
- lame de scie sauteuse pour fibrociment;
- Diablo HardieBlade D0704DHA 7 1/4 po, vendue à l'unité;
- clous PRIME de revêtement 2 po, bobine 15°, caisse de 5 400, référence MIR récupérée `PRIME 30644`; vérifier l'existant et la référence avant création pour éviter un doublon;
- joints mécaniques CanExel comme produits séparés, couleur assortie et quantité ajustable, aussi accessoires compatibles;
- moulure de départ 10 pi et moulure anti-rongeurs 10 pi, produits séparés et accessoires compatibles, jamais ajoutés automatiquement;
- la moulure de départ n'a pas de choix de couleur.
- pots de retouche : image du pot accompagnée d'un échantillon de la vraie couleur; ne pas simuler un emballage différent par teinte.

### Rouleaux et couleurs de métal

- rouleaux noir et blanc : 100 pi;
- rouleaux couleur Kaycan/Gentek : longueurs 10, 20, 50 ou 100 pi si ces formats sont réellement confirmés pour la référence;
- inclure le blanc avec sa vraie photo et la variante tan seulement si la couleur/référence est confirmée;
- intégrer Royal Aluminium et Vicwest uniquement avec leurs références et palettes vérifiées;
- conserver les codes fabricant dans les détails même lorsqu'aucun visuel n'est disponible;
- utiliser un aperçu neutre clairement identifié si le visuel manque; ne jamais fabriquer une teinte ou recolorer une photo non validée;
- toute marque, couleur, longueur ou correspondance non vérifiée demeure brouillon/non achetable.

### Soffites et visuels produits

- titres simplifiés du type « Soffite en aluminium 16 po — ventilé » ou « plein »; marque conservée, codes uniquement dans les détails;
- Kaycan et TruVent doivent rester des produits distincts; noir présélectionné lorsqu'il est réellement offert, couleur modifiable selon la palette propre à la marque;
- harmoniser les photos de produits : perspective, angle, éclairage, détourage et échelle comparables, tout en conservant les profils distincts;
- si une image ou une donnée critique manque, montrer un aperçu neutre et empêcher l'achat plutôt que d'afficher une fausse couleur.

Titres clients simples : marque, type, dimension et variante utile; conserver codes/SKU dans les détails techniques.

Les couleurs spéciales non offertes dans une palette vérifiée mènent à une demande de soumission, jamais à un achat direct. Ne pas exposer RAL Classic, inox ou « autre métal » comme choix d'achat standard si ces options ne sont pas réellement vendues.

## 14. Règles communes des modèles de pliage

Dans « Consulter nos modèles », conserver uniquement les dix profils ci-dessous. Retirer les anciens profils génériques non retenus. Chaque modèle doit générer le 2D, le 3D, le développé et le prix selon ses mesures verrouillées/personnalisables.

Tarification commune : 0,014 $/po², 1 $ par pli, un double pli compte comme un pli, vente en longueur de 10 pi, majoration aluminium de 10 %. Toute modification recalcule instantanément développé, surface, aperçu et prix.

Formule : développé total en pouces × 120 po = surface facturée en po²; ajouter ensuite les plis et la majoration matériau. Une longueur commandée plus courte ne crée pas de rabais, puisque la vente reste une longueur de 10 pi.

### 14.1 Fascia

Base nominale 6 po. Face principale personnalisable; aile inférieure 1 1/4 po verrouillée. Retour/double pli verrouillé. Face couleur à gauche. Description : recouvre et protège la planche de fascia en bordure de toiture.

**À confirmer avant codage :** le retour apparaît à 5/8 po dans une source et 3/4 po dans une autre.

### 14.2 Ailes de fenêtre

Toutes les ailes, dimensions et angles permis sont personnalisables. Habille les côtés d'une fenêtre et crée la finition entre le cadrage et le revêtement extérieur.

**Données manquantes :** ordre et cotes de base complets non récupérés; ne pas les inventer.

### 14.3 Écoulement des eaux

Profil de référence récupéré : 6 po, 2 po et 1/2 po. Dimensions personnalisables selon les règles autorisées; recalcul complet.

**Données manquantes :** directions/angles et face couleur de base non récupérés; ne pas les inventer.

### 14.4 Goutte d'eau

Posée au-dessus d'une fenêtre pour étancher la jonction entre fenêtre et revêtement, empêcher l'infiltration et diriger l'eau vers l'extérieur. Toutes les dimensions et angles permis sont personnalisables. Recommander la membrane 3M compatible.

La membrane est une recommandation d'étanchéité ajoutable directement au panier, sans obligation ni ajout automatique.

Cotes récupérées : 3 1/4 po, 2 po, 1/2 po et 1 3/4 po.

**À confirmer avant codage :** ces cotes totalisent 7 1/2 po alors que la base/le nom annoncé est 8 po. Directions, angles et face couleur complète non récupérés.

### 14.5 Sill Trim

2 1/2 po vers le bas; double pli 1 1/2 po vers la droite; double pli 3/4 po vers la gauche. Développé 4 3/4 po. Face couleur à gauche de la face de 2 1/2 po. Mesures personnalisables sous réserve de la règle de clouage : zone minimale de 1 po entre la face et le retour; bloquer toute valeur inférieure et afficher un message clair.

Usage : retenir le haut d'un fascia sous un patio en fibre lorsqu'on ne peut pas clouer le haut directement; fixation solide et finition propre.

### 14.6 Habillage de poutre — Beam

1 1/4 po à droite; 7 1/2 po vers le bas; 6 1/8 po à droite; 7 1/2 po vers le haut; 1 1/4 po à droite. Doubles plis optionnels indépendants aux extrémités, toujours vers l'intérieur, longueur verrouillée à 5/8 po. Chaque pli optionnel actualise développé et prix.

Développé de base sans double pli : 23 5/8 po. Ajouter 5/8 po par double pli activé.

### 14.7 Habillage de colonne

7/8 po à gauche; 7 1/8 po vers le bas; 7 1/8 po à droite; deux doubles plis superposés de 1 po, l'un vers la gauche et l'autre vers la droite. Développé 17 1/8 po. Première aile 7/8 po et deux plis 1 po verrouillés; faces centrales personnalisables. Face couleur à gauche de la première face verticale.

### 14.8 L de transition verticale pour panneau

2 3/8 po vers le bas; 7/8 po à droite; double pli 3/4 po vers le haut. Développé 4 po. Face couleur à gauche. Toutes les mesures verrouillées.

### 14.9 Capage d'air climatisé

1/2 po à gauche; double pli 1 po vers la droite et le bas; 3 po vers le bas; 4 po à droite; 3 po vers le haut; double pli 1 po et retour 1/2 po en miroir. Développé 13 po. Faces centrales 3–4–3 personnalisables; retours 1/2 po et doubles plis 1 po verrouillés. Face couleur de 4 po sous le capot.

### 14.10 Ventilation — haut de mur et bas de fenêtre

2 po à droite; 1 1/2 po vers le bas; double pli 1 1/2 po remontant vers la gauche; 1 1/4 po vers la gauche. Développé 6 1/4 po. Face couleur vers le haut. Toutes les mesures verrouillées.

Doit être jumelée à une moulure anti-rongeurs compatible avec même quantité et même longueur. Lier les deux articles et expliquer que l'anti-rongeurs protège l'ouverture sans bloquer l'air.

## 15. Tests obligatoires

Tester les rôles réels sur MIR TEST : connexion, arrivée, navigation, pages et URL directes, actions autorisées/refusées, RPC/RLS, Storage, isolation, déconnexion et expiration.

Tester notamment : punch et corrections, dîner, hors ligne, historique, banque d'heures, dépenses/TPS/TVQ, absences, approbations, avancement, commandes, bons fournisseurs, inventaire/QR, notifications, Centre d'aide, thèmes et persistance multiappareil, catalogue, accessoires, dix profils, 2D/3D, prix, PDFs/exports et non-régression.

Pour le catalogue, tester également : aucune palette mélangée, noir/blanc en tête lorsque disponible, variation d'image limitée à la tête des vis, absence de doublons J génériques/fabricants, accessoires suggérés sans ajout forcé, impossibilité d'acheter une référence non vérifiée et conservation des codes techniques.

Formats : 360/390/430 px, iPhone/Android, iPad/tablette portrait et paysage, ordinateur 1280–1920 px; tactile, clavier, erreurs, chargements et absence de réseau.

Ne jamais annoncer « terminé » sans résultats de tests, captures utiles, matrice de permissions et liste des blocages réels.

## 16. Livrables

- code et migrations nécessaires;
- tests automatisés et matrice de recette;
- captures avant/après utiles;
- rapport des permissions et régressions;
- commit(s) clairement nommés;
- aucun push/publication sans autorisation et validation finale;
- liste explicite des éléments non terminés ou bloqués.

## 17. Points à confirmer — ne pas inventer

1. Fascia : retour verrouillé à 5/8 po ou 3/4 po.
2. Goutte d'eau : base/nom 8 po ou développé 7 1/2 po selon les cotes récupérées; directions, angles et face couleur à compléter.
3. Ailes de fenêtre : ordre, directions, cotes de départ et face couleur.
4. Écoulement des eaux : directions, angles et face couleur.
5. Royal Steel : confirmer la gamme exacte de vis à soffite et sa palette réelle avant publication.
6. Confirmer les formats réels 10/20/50/100 pi des rouleaux couleur Kaycan/Gentek, ainsi que les gammes Royal Aluminium et Vicwest.
7. Une ancienne référence mentionne une membrane 3M de 3 po, tandis que le bloc confirmé du prompt 2 demande 4/6/12 po : vérifier si 3 po doit être conservé ou remplacé.
8. Confirmer la portée finale du catalogue de prix privé de soumissions et l'option 2FA avant de les imposer.
9. Confirmer l'appartenance au prompt 2 des seuils de livraison 60 $ / 300 $ / 40 km / 80 km avant toute modification.
10. Confirmer les vraies variantes blanc/tan, vis fascia Kaycan et pots de retouche avant publication.
11. Toute référence fabricant, image, palette ou SKU non vérifiée doit demeurer brouillon/non achetable.

## 18. Matrice de couverture — deuxième passe

| Source/thème récupéré | Section incluse | Statut |
|---|---:|---|
| Rôles Simon/Esther/Chef/Employé/Entrepôt | 1 | Confirmé |
| Actions Boss, Adjointe, Admin et restrictions | 1 | Confirmé; Admin conservé selon architecture six rôles |
| Pièce privée/modèle privé/produit publié | 1.1 | Confirmé |
| Mesures persistantes, publication explicite et historique réutilisable | 1.1 | Confirmé |
| Dossier chantier central et historique | 2 | Confirmé |
| Aujourd'hui, météo, chantier et avancement | 3 | Confirmé |
| Punch/GPS ponctuel/dîner/offline/corrections | 4 | Confirmé |
| Heures/banque/exports/verrouillage | 5 | Confirmé |
| Dépenses/TPS/TVQ/remboursement | 6 | Confirmé |
| Vacances/congé/maladie | 7 | Confirmé |
| Adjointe/commandes/Entrepôt/fournisseurs | 8 | Confirmé |
| Fournisseurs multiples, unités et contenu des bons | 8 | Confirmé |
| Thèmes MIR exacts et haute visibilité | 9 | Confirmé |
| Accents vert/bleu/orange/graphite | 9 | Confirmé |
| Couleurs fixes de statut | 9 | Confirmé |
| Réglages/notifications/sessions | 10 | Confirmé; 2FA à confirmer |
| Catalogue de prix privé | 10 | À confirmer avant développement |
| Livraison 60 $ / gratuité / rayons | 10 | À confirmer dans ce périmètre |
| Centre d'aide/chat/navigation | 11 | Confirmé |
| Envoi direct des estimations | 11 | Confirmé |
| Supabase/RLS/audit/sécurité | 12 | Confirmé |
| Vis soffite 5/8, visuel tête et couleurs | 13 | Confirmé; palettes fabricant à vérifier |
| Vis fascia, pots retouche et variantes photo | 13 | Confirmé; références/couleurs à vérifier |
| J soffite 12 pi par fabricant | 13 | Confirmé; migration génériques à vérifier |
| Membranes 3M 4/6/12 | 13 | Confirmé; ancien 3 po à clarifier |
| Lames, clous PRIME, joints CanExel, départ/anti-rongeur | 13 | Confirmé; références techniques à vérifier |
| Soffites Kaycan/TruVent et harmonisation visuelle | 13 | Confirmé |
| Couleurs produits, rouleaux et marques | 13 | Confirmé avec validation fabricant requise |
| Accessoires sans ajout forcé et couleurs spéciales sur soumission | 13 | Confirmé |
| Dix modèles et prix | 14 | Couvert; données manquantes signalées |
| Formule de surface 120 po et aucun rabais longueur courte | 14 | Confirmé |
| Fascia | 14.1 | Mesure contradictoire à confirmer |
| Ailes de fenêtre | 14.2 | Cotes/directions manquantes |
| Écoulement des eaux | 14.3 | Directions/face couleur manquantes |
| Goutte d'eau | 14.4 | Total et géométrie à confirmer |
| Sill Trim, Beam, Colonne, L transition, Capage, Ventilation | 14.5–14.10 | Confirmé selon transcription récupérée |
| Recette multi-rôle et responsive | 15 | Confirmé |
| Livrables et interdiction de publication prématurée | 16 | Confirmé |
| Contradictions et données manquantes | 17 | Explicitement isolées |

## 19. Application mobile Android privée — APK MIR

Créer une seule application Android privée pour tous les rôles à partir du site mobile MIR existant. Ne pas inventer un second parcours : l'application doit afficher les mêmes pages, menus, fonctions, données et permissions que la version Web mobile. Après connexion, Supabase reconnaît le rôle et dirige automatiquement vers le portail correspondant : Employé, Chef d'équipe, Entrepôt, Adjointe, Boss, Admin ou Client si ce rôle est inclus.

Le scan QR demeure exclusivement dans les fonctions du compte Entrepôt. Il ne doit pas apparaître dans les menus des employés ou des chefs de chantier s'ils n'en ont pas besoin.

### Identité de l'application

- nom officiel : **Les Revêtements MIR**;
- libellé court sous l'icône Android : **MIR**;
- icône : uniquement le gros symbole triangulaire officiel MIR, sans mot ni autre texte;
- préparer une icône Android adaptative correctement cadrée dans les masques rond, carré et coins arrondis, sans couper le symbole.

### Technologie et comportement

- emballer le site mobile avec Capacitor afin de conserver une seule base de code, le même Supabase et les mêmes règles de permissions;
- conserver l'authentification, les sessions, les liens internes, les téléchargements, les photos, la caméra et les fonctions propres à chaque rôle;
- afficher les états chargement, hors ligne, erreur réseau, session expirée et accès refusé;
- optimiser téléphone en priorité, puis tablette Android portrait/paysage;
- ne pas exposer de secret, clé de signature ou rôle administrateur dans l'APK.

### Mise à jour interne et notification

À chaque connexion et au retour de l'application au premier plan, vérifier de façon sécurisée la version Android disponible :

1. si la version installée est à jour, ouvrir normalement le portail;
2. si une mise à jour facultative existe, afficher une notification et une bannière **« Nouvelle mise à jour MIR disponible »** avec les changements principaux et un bouton **Mettre à jour**;
3. si une mise à jour minimale obligatoire est déclarée, empêcher l'utilisation de la version incompatible et expliquer clairement pourquoi;
4. télécharger uniquement l'APK officielle signée depuis une source privée autorisée, vérifier son intégrité et lancer l'installation Android;
5. prévoir les états téléchargement, échec, reprise et version déjà installée.

Android exige normalement une confirmation de l'utilisateur pour installer une APK mise à jour. Une installation entièrement silencieuse ne doit être proposée que si les appareils MIR sont réellement gérés par Android Enterprise ou un MDM autorisé.

Les changements de contenu Web compatibles peuvent être disponibles automatiquement sans nouvelle APK. Une nouvelle APK est réservée aux changements natifs, permissions, plugins, signature ou version minimale.

### Livraison et vérifications

- projet Capacitor Android reproductible;
- APK de test signée avec une identité de test, puis procédure séparée et sécurisée pour la signature de production;
- manifeste/version de mise à jour, contrôle d'intégrité et source privée;
- tests avec au minimum les comptes Employé, Chef, Entrepôt, Adjointe, Boss et Admin;
- vérifier redirection par rôle, URL directes interdites, connexion/déconnexion, notification à la connexion, mise à jour facultative, mise à jour obligatoire, téléchargement interrompu, reprise et installation;
- vérifier 360 × 800, 390 × 844, 430 × 932 et tablette portrait/paysage;
- tester sur émulateur et sur au moins un vrai appareil Android avant de déclarer l'APK terminée;
- ne jamais annoncer l'APK publiée ou installable sans fichier réel, empreinte, version, résultat des tests et lien de téléchargement vérifié.

