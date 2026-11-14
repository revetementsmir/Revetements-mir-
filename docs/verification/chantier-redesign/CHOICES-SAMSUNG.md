# Tous les choix Employé et Chef — correctifs Samsung

Inventaire de départ : `6039306ac76584ee6b06859786c02eef7cfca685`, PR #37, branche `codex/refonte-chantier-employe-chef`. Cadrage Atelier `4b001308-b3a8-49c4-9053-17745940f200` version 14 et mission Ergonomie `67fadcb8-d581-44a0-a643-e284452a8a82` version 4 réellement relus. Méthode Ergonomie 1.0.0 rechargée depuis le serveur. Un seul intégrateur app/tests : fullstack; cette expertise écrit les rapports et ses preuves.

Le balayage statique des deux pages et de leurs scripts embarqués couvre **61 sources et 169 contrôles** : menus, dates/heures, radios, cases et fichiers, y compris les composants réservés aux autres rôles. Ce nombre brut ne signifie pas 169 menus accessibles dans l’APK. Les surfaces actives, conditionnelles, exclues et système sont distinguées ci-dessous. Le balayage recherche aussi les créations DOM de `select`/`datalist`; aucun `select` multiple, `input month/week/color` actif n’a été repéré pour Employé/Chef. Les listes composées de boutons sont également inventoriées.

Composants : **S** feuille MIR simple; **L** même feuille avec recherche pour liste longue; **M** sélection multiple en brouillon avec Appliquer/Annuler si un vrai champ multiple existe; **D** calendrier MIR; **T** heure MIR; **DT** date/heure MIR; **I** choix intégrés MIR (radios, cases, cartes ou boutons nommés); **OS** interface Android conservée. Les contrôles source restent l’unique origine de `name`, `value`, options, bornes, contraintes, permissions et événements. Les états ci-dessous définissent le contrat initial. Le tableau « Lecture des preuves après intégration » et ERGONOMIE-SAMSUNG donnent les résultats réels, avec leurs limites.

## Reprise approuvée : Accueil 8 et Punch 2

La tâche UX a été relue en direct en **version 16** après la nouvelle direction. Les images originales de cette direction ne sont pas présentes dans le contexte de cette expertise; seuls le coordinateur et leur transmission écrite servent de référence ici. Aucun examen personnel des deux originaux n’est revendiqué.

Accueil : liste nette Plans/Photo/Problème/Équipe Chef, job avec sélection intégrée, nom/adresse, Dossier/Itinéraire et ligne d’avis fine. Punch : carte de la vraie job, cadran, temps continu, Play/Stop nommés, déplacement et heures secondaires. Le contexte du pointage actif A reste prioritaire même si l’Accueil consulte B.

Le changement A → B se prépare sans RPC et s’annule sans arrêter A. « Commencer sur B » attend le contrat switch existant; refus/attente conserve A. Avant une nouvelle journée, proposer la dernière job du dernier jour confirmé avec sa vraie date, si elle reste autorisée; sinon choix explicite. Aucun démarrage, heure ou GPS recopié automatiquement.

Les 169 contrôles de départ et la matrice restent conservés. Le nouveau contrôle `[data-field-home-job]` est ajouté au contrat J01; il ouvre la feuille MIR commune et conserve l’Accueil après le choix. Mes chantiers reste une destination distincte dans Plus. Les résultats avant cette direction ne certifient pas son nouveau layout; les lignes touchées doivent être rejouées.

## Matrice des écrans métier

E/C = Employé et Chef. Les identifiants `jobId`, `shiftId`, `segmentId`, produits et contacts viennent des données autorisées; aucune liste ne crée un droit.

| ID | Écran / rôles | Champ et valeurs réelles | Composant | États et vérification après intégration |
|---|---|---|---|---|
| J01 | Accueil, Mes chantiers, Punch / E/C | `[data-field-home-job]` (Accueil), `[data-field-punch-job]` (Punch), `[data-field-job]` (contexte); ID, nom, numéro, adresse | I/S/L commun chantier | 0/1/plusieurs jobs; valeur courante explicite; noms/adresses longs; aucune job étrangère. Résultats par groupe ci-dessous. |
| J02 | Dossier / E/C | Boutons dossier/document/contact; référence job existante | I | Retour conserve la job; documents publiés seulement. Ce sont des destinations, pas des enums à inventer. |
| C01 | Magasin / E/C | `#order-job`; `__unassigned__` ou ID autorisé | S/L | « Chantier à confirmer » reste une vraie valeur distincte de `''`; nom/adresse complets. Résultats par groupe ci-dessous. |
| C02 | Magasin et banque / E/C | `#catalogue-category`; `all` puis clés de `categoryNames` | S | Tout, filtres, catégorie vide; conserver recherche/favoris/pagination. Résultats par groupe ci-dessous. |
| C03 | Produit / E/C | `[data-product-variant]`; indice chaîne `0`…`n-1` dans `reviewVariants`; `data-item-id`/`data-color-id` portent les IDs | S/L | Modifie les variantes dépendantes et le bon produit; aucune couleur/format de l’ancienne variante conservé à tort. Résultats par groupe ci-dessous. |
| C04 | Produit / E/C | `[data-product-format]`; ID de `item.formats` | S | Seulement si plusieurs formats; valeur/longueur/unité exactes. Résultats par groupe ci-dessous. |
| C05 | Produit / E/C | `[data-product-color]`; ID de la couleur du produit | S/L | Couleur obligatoire selon politique; option non documentée/désactivée préservée; aucune couleur simulée ajoutée. Résultats par groupe ci-dessous. |
| C06 | Pliage de catalogue / E/C | `#fold-form [name=colorId]`; couleurs fabricant autorisées | S/L | Mesures/quantité gardées pendant le choix; required selon `colorPolicy`. Résultats par groupe ci-dessous. |
| C07 | Magasin / E/C | Favoris vrai/faux; Ajouter et quantités numériques | I | Favoris n’est pas une catégorie inventée. Quantité reste obligatoire et validée; aucun menu OS pour ces boutons. |
| C08 | Panier / E/C | `[name=deliveryMode]`; `delivery`, `pickup` | S | Choix exact, annulation sans changement, aucun envoi avant Confirmer; lignes conservées si refus. Résultats par groupe ci-dessous. |
| C09 | Suivi / E/C | Filtres Commandes/Livraisons; `pending`/`history` selon boutons existants | I | Un bouton ne confirme aucune livraison ni décision; conserver objets/états serveur. |
| C10 | Problème livraison / E/C | `[name=orderLine]`; chaîne `orderId:lineId` | S/L | Seulement les lignes de la commande de la bonne job; refus si aucune ligne. Résultats par groupe ci-dessous. |
| C11 | Problème livraison / E/C | `[name=reason]`; `Article manquant`, `Article incorrect`, `Article endommagé` | S | Options sans attribut value : la valeur réelle est le texte français. Ne pas remplacer par des codes anglais. Résultats par groupe ci-dessous. |
| P01 | Punch actif / E/C | Préparation transfert/déplacement; ID autorisé; contrat `switch` existant | S/L chantier | A continue pendant la préparation de B; Annuler n’envoie rien; Commencer sur B attend le reçu du switch; refus conserve A. Rejoué après Punch 2; voir bilan. |
| P02 | Mes heures / E/C | `#field-hours-filter [name=from]`, `[name=to]`; `YYYY-MM-DD` ou `''` | D | Effacer si facultatif; dates/filtre conservés; aucun décalage de jour/fuseau. Résultats par groupe ci-dessous. |
| P03 | Mes heures / E/C | `#field-hours-filter [name=jobId]`; `''` ou ID autorisé | S/L | « Tous mes chantiers » ne devient pas une job; filtre du même historique. Résultats par groupe ci-dessous. |
| P04 | Correction / E/C | `[name=shiftId]`; journées de semaine + historique autorisé | S/L | Ancienne journée, journée active, zéro journée; ne pas inventer un pointage pour remplir une liste. Résultats par groupe ci-dessous. |
| P05 | Correction / E/C | `[name=type]`; `missing_in`, `missing_out`, `wrong_in`, `wrong_out`, `wrong_job`, `wrong_travel`, `other` | S | Champs conditionnels inchangés; Annuler n’envoie rien. Résultats par groupe ci-dessous. |
| P06 | Correction heure / E/C | `[name=proposedAt]`; chaîne locale `YYYY-MM-DDTHH:mm[:ss]` | DT | Garder précision, bornes et step natifs; aucun UTC ajouté au champ local. Résultats par groupe ci-dessous. |
| P07 | Correction chantier / E/C | `[name=jobId]`; `''` ou job autorisée | S/L | Visible pour `wrong_job`; contraintes serveur inchangées. Résultats par groupe ci-dessous. |
| P08 | Correction segment / E/C | `[name=segmentId]`; `''` ou ID du segment de la journée choisie | S | Changer shiftId reconstruit la liste; ancien segment absent; libellé job/déplacement lisible. Résultats par groupe ci-dessous. |
| P09 | Correction déplacement / E/C | `[name=startedAt]`, `[name=endedAt]`; date/heure locale | DT | Visibles seulement pour `wrong_travel`; ordre/chevauchements relèvent des règles existantes. Résultats par groupe ci-dessous. |
| P10 | Premier Punch oublié / E/C | `#field-missing-punch-form [name=proposedAt]` | DT | Date/heure + note au vrai fil bureau; aucun pointage créé automatiquement. Résultats par groupe ci-dessous. |
| P11 | Banque d’heures / E/C, conditionnel | `[name=requestedFor]`; date de demande | D | Banque désactivée dans MIR TEST : pas de nouvel accès créé. Recette fonctionnelle seulement si le service existant l’autorise. |
| P12 | Nouvelle journée / E/C | Dernière job du dernier jour réellement confirmé + date; sinon choix explicite | I + S/L | Vendredi si lundi sans travail le week-end; job retirée refusée; active A prioritaire; pas de dernier chantier simplement consulté. Nouveau, contrôles partagés Qualité/Mobile et bilan. |
| A01 | Congés/absences / E/C | `[name=type]`; `vacation`, `sickness`, `appointment`, `unpaid_leave`, `other` | S | Brouillon/envoi/erreur distincts, valeur exacte. Résultats par groupe ci-dessous. |
| A02 | Congés/absences / E/C | `[name=startDate]`, `[name=endDate]` | D | Journée complète ou intervalle; fin facultative selon contrat; erreurs ne perdent pas la note. Résultats par groupe ci-dessous. |
| A03 | Congés/absences / E/C | `[name=dayPart]`; `full_day`, `partial` | S | Portion de journée affiche De/À et masque fin; journée complète purge les heures inutiles selon logique existante. Résultats par groupe ci-dessous. |
| A04 | Congés/absences / E/C | `[name=startTime]`, `[name=endTime]`; `HH:mm[:ss]` | T | Required seulement en portion de journée; min/max/step, clavier et annulation. Résultats par groupe ci-dessous. |
| E01 | Dépense / E/C | `[name=expenseDate]`; date | D | Dans détails secondaires; valeur du brouillon conservée. Résultats par groupe ci-dessous. |
| E02 | Dépense / E/C | `[name=categoryCode]`; codes de `state.expenses.categories` | S/L | Libellés serveur; aucun nouveau code inventé. Résultats par groupe ci-dessous. |
| E03 | Dépense / E/C | `[name=jobId]`; `''` ou ID autorisé | S/L | Job connue préremplie; « Sans JOB » conserve `''`; erreur sans réattribution. Résultats par groupe ci-dessous. |
| E04 | Dépense / E/C | `[name=amountMode]`; `before_tax`, `total` | S | Conserver calcul/arrondis serveur, montant et note. Résultats par groupe ci-dessous. |
| F01 | Problème depuis job / E/C | `[data-field-kind]`; `issue`, `tool` | S | Même job, note et photo lors passage vers outil; pas de second dossier. Résultats par groupe ci-dessous. |
| F02 | Photo chantier / E/C | `[name=stage]`; `before`, `during`, `after` | S | Préserver commentaire et fichier; étape réelle dans le même objet. Résultats par groupe ci-dessous. |
| F03 | Problème/outil / E/C | `[name=urgency]`; `normal`, `urgent`, `critical` | S | Textes Peut attendre/Aujourd’hui/Travail bloqué; aucun état de livraison promis. Résultats par groupe ci-dessous. |
| F04 | Extra / E/C | Note et photo; aucun select propre à l’extra dans la base | I/OS | L’énumération n’ajoute ni statut, prix ou approbation à ce formulaire. |
| M01 | Message / E/C | Conversations par ID; privé, équipe ou chantier autorisé | I/L si liste longue | Recherche, non-lus, fil courant et job conservés; choisir un fil ne crée pas de droit. |
| M02 | Nouvelle conversation / E/C | `[data-start-private]`, `[data-start-team]`; contact/team ID | I/L | Nom complet, rôle/contexte; aucun destinataire libre ni nouveau compte. Résultats par groupe ci-dessous. |
| R01 | Réglages / E/C | Radio theme : `light`, `dark`, `system` | I | Selon appareil suit les deux thèmes; préférences conservées et contrôles lecteur d’écran. Résultats par groupe ci-dessous. |
| R02 | Réglages / E/C | Radio textSize : `standard`, `large`; reducedMotion : `auto`, `on` | I | Ces radios ne déclenchent pas un menu Samsung; conserver groupes et sélection. Résultats par groupe ci-dessous. |
| R03 | Réglages / E/C | Cases highContrast et notification-<catégorie> | I multiple intégré | Seulement catégories applicables au rôle; urgences obligatoires non désactivables. Résultats par groupe ci-dessous. |
| L01 | Équipe / Chef | Présence `present`, `absent`; non confirmé reste un état distinct | I | Actions autorisées sur équipe assignée; non punché ne signifie pas absent. |
| L02 | Tâches / Chef | Case `[data-task-complete]`; ID tâche | I | Coché et état serveur, double action protégée; pas d’affectation générale ajoutée. |
| L03 | Rapport / Chef | Cases `hadProblem`, `missingMaterial`; booléens | I | Label entier ≥44 px; rapport distinct de Terminer le Punch. Résultats par groupe ci-dessous. |

## Matrice iframe : même commande, moteur conservé

Route obligatoire : `production.html?mode=client&source=store&kind=profile`. La grille ci-dessous inclut les variantes rendues selon le modèle ou l’étape. La présence d’un contrôle dans le code n’autorise pas à ouvrir le mode admin ni le mode panneau.

| ID | Étape / champ | Valeurs et dépendances | Composant | États et vérification |
|---|---|---|---|---|
| D01 | Unité `#production-unit` | `in`, `mm`; éventuellement verrouillée par modèle | S | Mesures, dessin et développés cohérents; disabled/readonly respectés. Résultats par groupe ci-dessous. |
| D02 | Métal `#material-type` | Parcours personnel réellement rendu : `''`, `aluminium`, `acier`; autres enums du HTML générique exclus | S | Seuls choix réellement disponibles; aucun gage/épaisseur Employé ajouté. Résultats par groupe ci-dessous. |
| D03 | Référence couleur `#color-system` | Parcours personnel rendu : `manufacturer`, `special`; `ral` retiré par la politique client | S | Options masquées/désactivées restent telles; pas de contournement d’un verrou de modèle. Résultats par groupe ci-dessous. |
| D04 | Marque/produit `#production-material` | ID de `availableMaterials()` selon métal et canal | L | Filtre dépendant, texte complet, aucune vieille couleur réutilisée à tort. Résultats par groupe ci-dessous. |
| D05 | Teinte fabricant `[data-production-color]` | ID réel; pastilles/boutons et recherche existants | I/L | Nom/code accessibles, sélection explicite hors couleur seule, contraste selon vraie pastille. Résultats par groupe ci-dessous. |
| D06 | RAL `#production-ral` | ID du nuancier documenté; recherche code/nom | L | Non proposé dans le parcours personnel observé; ne pas l’activer pour le tester. La source générique conserve son nuancier pour les autres parcours. |
| D07 | Face colorée `[data-client-face]` | `left`, `right`; repère segment canonique | I | Même sens/étoile/dessin/PDF; pas de changement implicite à l’ouverture. Résultats par groupe ci-dessous. |
| D08 | Face textuelle `#profile-painted-side`, `#profile-painted-segment` | `''`/`left`/`right`; lettre réelle du segment | S | Exclu de la route personnelle qui utilise le wizard; les boutons de face D07 sont le vrai choix. Ne pas activer ce chemin masqué. |
| D09 | Échelle dessin `#trace-height` | Chaînes de la liste `traceHeights` | S | Le choix change l’échelle, jamais la géométrie/cotes; valeurs intégrales préservées. Résultats par groupe ci-dessous. |
| D10 | Fractions `[data-pick-fraction]` | `''` puis chaînes `0`…`15`; fractions calculées par le moteur | S | Zéro sans fraction distinct du placeholder; quantité entière/cote de base conservée; pas de glyphes substitués aux values. Résultats par groupe ci-dessous. |
| D11 | Sens d’un pli / cartes radio | `left`, `right` selon `bendChoiceMarkup` | I | Libellé+dessin, sélection visible, aucune confusion pli/retour écrasé. À rejouer si rendu. |
| D12 | Type de pli `[data-bend-mode]` | `interior`, `signed`, `hem` | S | Seulement chemins de retouche permis; angles/champs conditionnels inchangés. À rejouer si rendu. |
| D13 | Deux plis `#double-fold-form [name=segmentIndex]` | Index du segment actuel | S | Choix segment et deux sens indépendants; version personnelle, jamais écriture banque. À rejouer si chemin autorisé. |
| D14 | Retour écrasé `#end-hem-form [name=end]` | `start`, `end`; direction `left`/`right` par radios | S + I | Valeurs et aperçus 3D conservés; retour Android ferme d’abord le choix. À rejouer si rendu. |
| D15 | Grille hors wizard `#drawing-snap`, `#drawing-right-angle` | `off`, `metric`, `8`, `4`; aimant booléen | S + I | Branche hors wizard non active dans le dessin personnel observé; échelle D09 reste disponible. Ne pas activer un outil masqué. |
| D16 | Modèles/profils existants | Cartes par identifiant/version; banque ou dessin personnel | I/L | Sélection du même modèle et instantané; aucun droit de modifier la banque ajouté. Résultats par groupe ci-dessous. |

## Interfaces système et exclusions contrôlées

| Surface | Pourquoi elle est distincte | Ce qu’il faut vérifier |
|---|---|---|
| Fichier/photo/PDF de Message, chantier, outil, extra, dépense, correction et aide | **OS** : sélection sécurisée du fichier Android, accept/capture et limite existants | Annulation sans purge de texte/job; type/taille/reprise; aucun chemin privé réécrit. |
| Photos du rapport `multiple` | **OS** : choix de fichiers multiple; ce n’est pas un select multiple métier | Limite cinq, conserver pièces sélectionnées durant choix MIR et message d’erreur. |
| Caméra et permission photo | **OS** | Refus/reprise sans fausse photo envoyée ni nouvelle permission générale. |
| GPS ponctuel du Punch, itinéraire | **OS** et service existant | Permission ponctuelle; Itinéraire ne pointe pas; pas de suivi permanent ajouté. |
| Biométrie/code/schéma système facultatif | **OS** | Pas de second PIN MIR; refus/repli et session conservés; rien à recolorer dans Android. |
| Clavier Android/IME | **OS** | Champ et actions accessibles; type numérique/texte approprié; retour ferme le bon niveau. |
| Auth / afficher mot de passe | Auth existante, hors refonte de choix | Ne pas recréer compte, rôle ou permission; Google/courriels désactivés préservés. |
| Invitations/affectations/règles/paie/véhicules/Entrepôt | Autres rôles, présents dans le JavaScript partagé mais non accessibles Employé/Chef | Conserver API/droits et ancienne présentation hors périmètre; tests de non-régression de l’intégrateur. |
| Gestion de banque entreprise/modèle, canaux et groupes | Administration, interdite au dessin personnel | `profile-group`, `saveTarget`, canaux et droits ne deviennent pas des choix Employé. |
| Panneaux, fournisseurs et bons de commande atelier | Route `kind=profile`, `mode=client`; modules admin sortent au démarrage | `mir-po-list` datalist, fournisseur/statut/date PO, unités du mur et options panneau sont exclus du parcours privé. |
| Date souhaitée `#order-date` du dossier production | Bloc `#production-order` masqué par l’intégration personnelle; panier chantier reste la destination | Ne pas le présenter comme une date métier accessible/testée; conserver l’objet de commande existant. |
| Centre d’aide `select[name=category]` | Formulaire `customer_ready`, pas le mode métier `ready`; FAQ et listes existantes conservées | Si le contrôle devient réellement visible dans le périmètre, il doit être pris par le même adaptateur; ne pas activer le parcours client. |
| Sélection multiple HTML | Aucun `select[multiple]` actif repéré dans la base E/C | Vérifier la capacité générique avec fixture isolée sans inventer une nouvelle sélection métier. |

## Règles d’ergonomie et contrat de recette

1. La feuille de choix s’ouvre depuis un bouton nommé par le libellé et la valeur courante, avec sélection explicite, texte complet, cible ≥44 px; nom de job puis adresse, sans ellipses qui empêchent de les distinguer. Liste longue : recherche et défilement interne, résultat vide utile.
2. Ouvrir, Fermer, Échap et retour Android ne changent aucune valeur. Simple : valider un choix permis émet une fois input et change. Multiple : modifications locales jusqu’à Appliquer; Annuler revient à l’ensemble initial. Disabled, optgroup, readonly et fieldset disabled restent protégés.
3. Le contrôle source garde son nom et son unique valeur FormData. required/min/max/step et logique conditionnelle continuent à valider. Un formulaire invalide doit montrer une erreur lisible et amener le focus au composant MIR, sans erreur « invalid form control is not focusable » ni retour au menu Samsung.
4. Dialogue nommé, modal, focus contenu puis rendu au déclencheur. Liste avec navigation clavier adaptée à son rôle (flèches/Home/End et Entrée/Espace), annulation possible, recherche à libellé explicite. À vérifier avec l’arbre accessible; aucun TalkBack physique prétendu.
5. Une date reste `YYYY-MM-DD`; date/heure locale reste sans décalage UTC implicite. Années, secondes et step doivent survivre au choix, à la réouverture et à l’annulation. Les jours/heures hors bornes sont refusés avec une explication. L’affichage ne doit pas normaliser une heure locale différente de la valeur transmise.
6. Format standard : Commande/Magasin/Punch utilisent la hauteur réellement disponible et la pagination, sans page cachée ou contenu supprimé. À 200 %, petit paysage ou clavier ouvert : étapes/vues secondaires/défilement interne permettent encore l’accès à tout; ne pas réduire les caractères ni couper les validations pour fabriquer une capture fixe.

Les recettes après intégration, leurs captures et les limites seront inscrites dans `ERGONOMIE-SAMSUNG.md`. Le présent inventaire ne certifie pas une installation Samsung. SEO/GEO : non applicable, application privée de chantier; aucune URL publique, indexation, permission ou publication modifiée.


## Lecture des preuves après intégration

Les lignes ci-dessus constituent le contrat et les branches à couvrir. Le résultat de recette ne se déduit pas du balayage statique :

| Groupe | Preuve effectuée par cette expertise | Limite explicite |
|---|---|---|
| Sources S/L/D/T/DT actives | Ouverture réelle depuis la façade, libellé, options exactes, disabled, recherche selon longueur, cibles44 px, annulation, contraintes/valeur/FormData identiques et focus rendu | La vérification d’annulation ne vaut pas envoi métier ni réception hébergée |
| Produit C03–C05 | Variante indice `1` réellement choisie, formats/couleurs HardiePanel réellement rendus depuis le catalogue existant | Aucun produit ou droit serveur nouveau créé |
| Photo/problème/outil F01–F03 | Passage problème → outil conserve note et fichier, choix étape/urgence réellement ouverts | Fichier local fictif; pas de permission caméra Android ou envoi réel certifié |
| Temps P02–P10 | Filtres de l’historique, journée/segment/type, correction heure/job/déplacement et premier oubli réellement ouverts | Correction et premier oubli gardent leur destination distincte; aucune heure créée dans ces tests de composant |
| Absence/dépense A01–A04/E01–E04 | Journée complète/portion, dates/heures et catégories/chantiers/calcul réellement rendus | Valeurs testées localement; décision du bureau et pièces serveur relèvent de Qualité/hébergé |
| Dessin D01–D05/D07/D09–D10/D13–D14 | Tracé réel, mesures/fractions, face, matière/marque/couleur, extrémité et segment des deux plis, ajout de pièce au panier canonique | Pas de mode admin, panneau, RAL masqué ou banque entreprise ouverte pour créer une couverture artificielle |
| Sélection multiple générique | Brouillon/Annuler/Appliquer, required et options désactivées testés avec fixture isolée | Aucun champ multiple métier inventé |
| Radios/cases/boutons I | Contrôles intégrés réellement rendus; face de dessin choisie, préférences clair/sombre/système et texte appliquées | Toutes les combinaisons de radios/cases ne sont pas un sélecteur natif; les états métier d’équipe, rapports, messagerie et notifications sont aussi suivis par Qualité |
| Nouvelle direction J01/P01/P12 | Parcours intégré rejoué : Home B/Punch A, préparation/annulation sans RPC, nouvelle feuille chantier, libellés job/déplacement et proposition historique (contrôle partagé) | Les reçus/transferts/refus/reprises sont vérifiés séparément par Qualité/Mobile; le retour physique et le Samsung restent ouverts |
| P11 et branches exclues | Absence d’activation hors droits vérifiée dans le parcours; exclusions documentées | Aucun service désactivé n’est annoncé fonctionnel |

Le passage historique précédent la direction8/2 compte36 contextes/2 394 enregistrements. Le nouveau passage utilise la même matrice métier avec les points d’entrée Punch et Accueil actualisés; son résultat final et ses empreintes sont dans `ERGONOMIE-SAMSUNG.md`. Les échecs intermédiaires et les reprises restent conservés, sans assertion neutralisée.
