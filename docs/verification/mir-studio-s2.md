# MIR Studio S2 — contours, choix et dossier chantier

Travail dans la branche `codex/mir-studio-s1-import` et la [PR44](https://github.com/revetementsmir/Revetements-mir-/pull/44), sans fusion ni publication. Le [bilan S1](mir-studio-s1-import.md) à `36606f45507f2943a6e3f915d9e14221cc3156c7` reste inchangé. Base relue : `e9bd39bc5dd4c40663c56bfc21759c543ab4e8d9`. Les anciennes PR2/8/9/11 ne sont pas reprises.

## Comportement et contrat

L'inventaire S1 reste la source des bâtiments, niveaux, vues, calibrations et repères. S2 lui ajoute `geometryVersion: 1`, des contours versionnés, brouillons, historique et révisions de niveau. La simple ouverture d'un ancien projet ne crée ni contour ni RDC. Le rendu historique et ses réglages restent accessibles.

Le parcours est : choisir le niveau, vérifier le contour et les mesures, confirmer, ouvrir le même modèle en 2D/360°. Le tracé permet plusieurs retraits, déplacement de points, correction de cotes, orientation et alignement explicites entre niveaux. Un étage peut garder un contour différent et exister sans RDC fourni. Les légendes colorées ne servent pas de contour. Une proposition raster est une région candidate à vérifier, jamais une reconnaissance architecturale certaine.

Les identifiants des pans dépendent du contour et des identifiants de leurs deux points, pas de leur direction ni de leurs coordonnées. Déplacer un point conserve l'identité du mur. Les mêmes identifiants servent au plan, au canevas 360°, aux insertions, ouvertures, finitions et sauvegardes. Chaque segment du périmètre existe même si un porche le cache. Une ouverture reste attachée à un seul mur; l'union des ouvertures évite la double déduction. Les affectations orphelines ou hors limites demandent correction. Un contour invalide conserve le brouillon et le dernier contour confirmé.

La sauvegarde de niveau relit le projet actif, le bâtiment et la révision attendue avant écriture atomique. Une réponse tardive d'un autre projet ou une révision périmée est refusée. Les anciens matériaux, ouvertures, retouches, confirmations et sources ne sont pas remplacés par la nouvelle géométrie.

## Cotes et incertitudes

- Cote écrite, mesure fournie, estimation calibrée et hypothèse gardent des statuts distincts. La confirmation demande source et libellé pour une cote écrite; une hypothèse ne valide pas une mesure.
- Une estimation conserve la vue, ses matrices, points pixels/PDF, références, échelle utilisée et plage issue des références. Elle doit être confirmée avant utilisation validée.
- Le recoupement utilise plusieurs références fiables de la même vue, distingue X/Y et détecte déformation et contradiction. Aucune moyenne silencieuse. Deux valeurs écrites différentes sur le même segment sont contradictoires même si l'écart est inférieur au seuil de déformation raster.
- Les autres vues du même bâtiment/niveau ou explicitement reliées sont proposées. Une largeur d'élévation avant ne devient pas une profondeur. Une hauteur totale de bâtiment n'est pas automatiquement la hauteur d'un niveau.
- Hauteur, altitude de base et alignement doivent être établis. Le zéro local ne confirme pas un RDC. Aucune dimension du jumelé n'est un repli. Toiture, niveaux absents et parties basses non établies restent hors de l'enveloppe confirmée.

## Compléments de Frederick

Les deux textes joints ont été lus intégralement et conservés dans l'historique de la tâche Atelier existante. Leur suivi distingue les fonctions exécutées des dépendances restantes.

| Exigence | État vérifié / limite |
|---|---|
| Toucher → sélection nommée → choix → aperçu → Confirmer/Annuler | Fonctionnel. Une fiche près du modèle; Échap/fermeture annulent. Les choix ne sont pas sauvegardés avant confirmation. |
| Fenêtres, colonnes, coins individuels ou groupés | Fonctionnel. Portée explicite, sélection mise en évidence, groupes avant/arrière selon le repère confirmé. Annuler restaure les différences individuelles. |
| Profils, motifs et formats réels | Adaptateur commun du catalogue et des règles MIR existants : joints de panneaux, formats physiques, clin et couvrance, lisse sans faux grain, planche/couvre-joint distinct. Largeur de couvre-joint inconnue signalée; saisie de projet indicative, pas fiche fabricant inventée. |
| Insertion entre deux fenêtres | Fonctionnelle, avec les ouvertures conservées et l'aire du parent remplacée une seule fois. Sélection réelle dans le canevas 3D testée. |
| Balcons, patios couverts, escaliers | Éléments explicites proposés ou mesurés, phases distinctes, correction persistante. Aucune toiture déduite d'une porte-patio. La reconstruction complète d'un assemblage couvert réel reste une dépendance Studio, pas une réussite revendiquée. |
| Entrée d'auto | Position, dimensions et rotation modifiables; état proposé conservé. Le bâtiment ne bouge pas. Pas d'invention de pente, limite cadastrale ou orientation géographique; pas de glisser direct recetté. |
| Cinq vues de cotation employé | Avant, droite, arrière, gauche, soffites. Murs cachés présentés à côté de l'élévation avec repère au vrai emplacement; déplacement graphique seulement. Sections de soffites superposées séparées par hauteur. |
| Calculs automatiques | Réutilisation du moteur MIR, des stocks, coupes, réglages et surplus existants, sans deuxième marge ni addition aux anciennes élévations. Ouvertures déduites une fois, J de soffite limité aux bords mur/intérieurs, fascia séparé. Détails non établis partiels. |
| PDF chantier | Exactement cinq pages, aperçu local PDF.js, nom/bâtiment/date/révision/notes/réserves. Brouillon si incomplet. Les anciens plans et coupes détaillés restent un export distinct. |
| Rattachement à une job | Réalisé sur MIR TEST seulement : document privé canonique versionné, instantané immuable, empreintes, lecture serveur après écriture, historique et version courante. Employé assigné : ouverture, pages, zoom, téléchargement; aucun coût interne. |

Les profils développés et débits complets d'habillage des colonnes/coins/poutres, le débit spécifique des couvre-joints, les soffites non rectangulaires et la reconstruction complète toiture/assemblage couvert restent à traiter dans le Studio. Ils rendent les quantités partielles. Les primitives ajoutées ne constituent pas une détection automatique complète. Les idées commerciales hors Studio du premier complément restent hors lot.

## Recettes privées sur les originaux

Tous les originaux et résultats détaillés restent hors dépôt, sous `/workspace/mir-studio-private`. Aucun OCR, dessin, coordonnée de plan, capture privée ni secret n'est publié. Les scripts privés refusent les chemins de manifeste et de sortie dans le dépôt. Aucun nouveau service d'analyse externe n'est utilisé.

### Jumelé et 351 : parcours S2 réellement exécuté

Le runner `tools/qa/mir-studio-levels-local.cjs` charge le PDF original par le formulaire, vérifie taille/empreinte, trace dans son repère réel, saisit les références et la hauteur citée, confirme explicitement, inspecte quatre angles, clique un mur dans le canevas, change matière/fini, sauvegarde et recharge. Il vérifie l'égalité de l'inventaire et la conservation du PDF. Ce sont des confirmations de recette QA, pas l'approbation du client.

| Original | Contour de recette | Résultat / réserve |
|---|---|---|
| Jumelé Sentier FINAL | RDC à huit points; références écrites recoupées, hauteur rough du RDC citée | Huit murs présents sous quatre angles, sélection/fini et réouverture réussis. Retrait mesuré depuis les pixels, aucune profondeur reprise de l'étude. Aucun étage inventé. |
| 351 | RDC à dix points, garage et retrait d'entrée inclus; référence et hauteur du RDC citées | Dix murs, quatre angles, sélection/fini et réouverture réussis. Enveloppe entre plancher RDC et sablière seulement : parties basses du garage et toiture non établies. |

Dans `s2-final-levels-v2`, les deux recettes passent aussi par le PDF cinq pages, son analyse/rendu local, l'envoi au stockage privé TEST, le commit canonique et la lecture serveur du document/instantané. Le PDF reste un brouillon avec réserves, sans quantités complètes annoncées. Une recette distincte de seconde révision conserve l'ancienne révision intacte. Les empreintes téléchargées correspondent aux octets générés. Les aperçus/PDF/rattachements sont ensuite rejoués avec les modèles réellement sauvegardés, sans les assimiler à un nouvel import, dans `s2-final-site-jumele-v3` et `s2-final-site-351-v3`.

Après remplacement du raccordement interne par `studio-job-reader-bridge.js`, la recette employé utilise le vrai frontend web local configuré TEST et les vraies API Auth/RPC/Storage TEST, avec comptes isolés sans courriel envoyé. Seule la job assignée est visible. PDF cinq pages, zoom à 125 %, page cinq et téléchargement avec empreinte identique sont vérifiés. Écriture employé, autre job, autre organisation et utilisateur non assigné sont refusés. Les tentatives Chromium du paquet natif dépourvu du pont mobile ont échoué et restent conservées; elles ne sont pas comptées comme essais d'appareils.

Les candidats antérieurs conservent leurs échecs : éditeur coupé, saisie perdue au changement de focus, choix de bâtiment erroné dans le runner et clic absorbé par l'ancien lecteur PDF natif. Les corrections ne convertissent pas ces tentatives en succès. Une dernière régression vérifie qu’une hauteur/dimension de soffite absente reste « ? / à confirmer » dans le PDF, même dans une ancienne section mal marquée confirmée; elle ne devient jamais zéro par conversion numérique. Le lecteur a été remplacé par PDF.js local; sa fermeture/régénération utilise la tâche de chargement de la version PDF.js existante.

### Matrice des sept originaux

La colonne S1 est le résultat historique à 36606f4. Le replay S2 a réellement importé, sauvegardé et rouvert les sept originaux : 48 pages conservées et 46 vues. Les empreintes, tailles et comptes à la réouverture correspondent. Aucun appel externe d’analyse. Les contours des cinq autres dossiers n'ont pas été confirmés par la seule réussite de leur import.

| Original | Pages | Vues S1 | Replay import S2 | Contour / ambiguïtés et recette restante |
|---|---:|---:|---|---|
| Jumelé Sentier FINAL | 5 | 5 | Réussi | Recette S2 huit murs réussie; pas de plan d'étage. Échelles incertaines des autres vues non validées. |
| 351 | 5 | 5 | Réussi | Recette S2 dix murs réussie; parties basses garage à confirmer. Patio futur en béton p2; aucune toiture arrière établie. |
| 313 | 5 | 5 | Réussi | Étage seul, aucun RDC confirmé. P2 insuffisante pour confirmer un patio couvert. Contour S2 non recetté sur cet original. |
| Samuel Forest | 5 | 5 | Réussi | Étage seul; pas de RDC inventé. Contour S2 non recetté sur cet original. |
| Des Tournesols | 5 | 5 | Réussi | Porche avant couvert visible p3, source inspectée. Légende masquant une partie du dessin, géométrie non inventée. Assemblage complet non recetté. |
| Champs fleuris no 5 | 6 | 10 | Réussi | Maison et cabanon distincts, page cabanon tournée avec cinq vues. Aucun mélange des mesures/niveaux/finitions. Contours complets non recettés. |
| 12 logements | 17 | 11 | Réussi | Niveaux 0–3, fondation, toiture, élévations et coupe. Galeries/balcons couverts réellement visibles p10/p12/p13, sources inspectées. Contradictions de hauteur gardées; reconstruction de cet ensemble non recettée. |

Le replay privé est conservé dans `s2-imports-v3`, avec copie immuable de 234 fichiers d’exécution et manifeste SHA-256 `s2-runtime-v3-manifest.json`. Les derniers écarts de code concernent uniquement l’affichage numérique de la couvrance, les libellés et inconnues du PDF, la fermeture/régénération PDF.js et l’extension séparée de lecture employé. Les scripts d’import, OCR, classification, inventaire, repères, stockage et modèle géométrique testés sont identiques à ceux de la livraison. La CI vérifie séparément la tête complète poussée. Les journaux gardent des avertissements OCR (83 à 248 par dossier); ce ne sont pas des cotes validées ni des erreurs bloquantes du formulaire.

### Vérifications synthétiques et existantes

Les nouvelles fixtures sont entièrement synthétiques. Elles couvrent retraits multiples, contours différents entre niveaux, étage seul, maison/cabanon, rotations/repères, contradictions et déformations, autres vues compatibles, profondeurs non représentées, invalidité sans perte, révisions périmées, sauvegarde/réouverture et isolation des projets. La proposition raster de douze coins est testée sur fixture; sa reconnaissance automatique sur les originaux n'est pas revendiquée.

Les tests CLIENT 360 couvrent choix individuels/groupés, confirmation et annulation, groupes avant/arrière après rotation, couleurs conservées à la réouverture, fenêtres/colonnes/coins stables, insertion, formats et motifs, patio couvert explicitement synthétique, escalier, déplacement de l'entrée d'auto sans changer les murs, soffites superposés à deux hauteurs, PDF cinq pages analysé et rendu. Les captures des trois formats Chromium et les cinq pages PDF synthétiques ont été réellement ouvertes pour inspection. Ce ne sont pas des appareils physiques.

Les suites S1, grands PDF, murs détachés, terrain et interactions restent actives; aucune assertion n'est affaiblie. Les adaptations de parcours ajoutent seulement la confirmation explicite désormais nécessaire. Les tests PostgreSQL jetables vérifient commit atomique, immutabilité, concurrence, historique, accès par job/organisation et absence de données internes dans l'index employé.

Commandes principales :

```sh
node tests/mir-studio-s1.cjs
node tests/mir-studio-s2.cjs
node tests/mir-studio-preview.cjs
node tests/mir-studio-cotation.cjs
node tests/mir-studio-site-postgres.cjs
MIR_CHROMIUM_BIN=/usr/bin/chromium node tests/mir-studio-s1-browser.cjs
MIR_CHROMIUM_BIN=/usr/bin/chromium node tests/mir-studio-s2-browser.cjs
MIR_CHROMIUM_BIN=/usr/bin/chromium node tests/mir-studio-client-360-browser.cjs
```

Le workflow de PR extrait explicitement le SHA de tête et n'archive que les preuves synthétiques. Les résultats de la tête complète poussée sont relevés dans la PR44 et la tâche Atelier; les résultats S1 ou ceux d’une tête précédente ne valent pas certification de cette tête. Les premiers runs ont révélé les protections de fichiers historiques du portail : les modules ont été restaurés, le lecteur isolé dans une extension TEST, puis les anciens tests ont repassé sans changer leurs empreintes. Le nouveau contrôle intégral requiert aussi le téléchargement explicite de la base certifiée dans le checkout CI superficiel.

## Backend, suivi et limites

Les modules canoniques `portal-client.js` et `chantier-app.js` restent octet pour octet identiques à la base. L’extension de lecture est un fichier séparé, inactif hors du projet TEST exact; seul un bloc de trois ressources est ajouté à la page chantier. Le contrôle PR44 épingle les deux migrations par SHA-256 et vérifie intégralement les autres modules Auth/Punch/employés/mobile et les garde-fous de publication. Les anciens contrats et leurs empreintes restent inchangés.

Deux migrations additives ont été appliquées avec confirmation serveur sur **MIR TEST `hxtztkmbfpmzrieccwsg` uniquement** : instantanés des documents Studio et index employé. Elles réutilisent `mir-job-documents`, `mir_core.job_documents`, les jobs canoniques et leur contrôle d'accès. Aucun remplacement du commit document existant, aucune opération production. Le serveur contrôle contrat cinq vues, taille, propriétaire et révision; il ne réanalyse pas le PDF pour recompter ses pages. Ce compte est vérifié par le générateur et le lecteur locaux.

Clôture contrôlée confirmée puis relue sur TEST : deux jobs archivées, trois comptes synthétiques désactivés et mots de passe invalidés, zéro adhésion active, zéro session et zéro jeton de rafraîchissement. Sept versions de documents et leurs instantanés restent dans le stockage privé pour conserver les preuves; aucune suppression SQL de métadonnées Storage ne crée de fichier orphelin. Les mots de passe de la fixture locale ont été retirés après cette confirmation. Les liens signés déjà émis gardent uniquement leur durée maximale existante de cinq minutes. Aucun courriel réel, Google/paiement, signature release ni distribution employés. Samsung reste en attente. Safari et appareils physiques non exécutés.

Le suivi et les deux compléments sont enregistrés dans la tâche Atelier existante, historique S1 conservé. Les méthodes Architecture, Métier et Tests ont été réellement chargées et appliquées dans le chat. Le helper de transfert des preuves visuelles Atelier redirige actuellement vers une connexion : les propositions nécessitant ces transferts restent en préparation, sans prétendre à un aperçu partagé réussi. Les preuves locales synthétiques et privées restent conservées.

Le Studio universel n'est pas terminé. La suite consiste à confirmer les enveloppes et hauteurs manquantes sur les autres dossiers, traiter les assemblages couverts/toitures et leurs détails de débit, puis recetter ces cas réels avant toute quantité complète ou publication.
