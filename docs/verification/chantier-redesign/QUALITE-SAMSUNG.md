# Qualité — correctifs Samsung de l’application chantier

## Bilan local remis —14novembre2026, avant commit/push

**GO local ciblé :18/18groupes métier/choix Accueil,24/24états standards et24/24états progressifs réussis.** Les trois suites ont utilisé les mêmes neuf fichiers, restés identiques pendant leur exécution. Deux derniers deltas Accueil ont ensuite été contrôlés séparément :7/7scénarios métier/identité/avis et4/4contextes de chevron430/200%. Les sept autres sources restent exactement celles des grandes matrices.

Les contrôles complémentaires réussis sont14groupes PGlite du nouvel adaptateur,6tests du vrai client avec SDKsimulé,7tests du checker natif et5scénarios de pixels synthétiques indépendants; le rouge/vert SQL, les100notifications, le catalogue complet et les6cas météo sont documentés ci-dessous. Ces nombres décrivent des suites différentes et ne sont pas additionnés en un nombre de parcours boutenbout.

Le portrait standard reste sans défilement; à360/200%, un court défilement réel révèle la confirmation/annulation d’un transfert préparé. Le serveurTEST a été vérifié par le coordinateur sous revendications SQL contrôlées et ROLLBACK, pas par un pointageGPSphysique. Les CI de la future tête seront relues après push et reportées dans la PR/Atelier. La recette Samsung physique reste ouverte. Aucun compte personnel, mot de passe, envoi réel, production ou fichier app/test n’a été modifié par cette expertise.


## Ce qu’il faut faire

Vérifier les corrections demandées après la recette personnelle et les directions approuvées Accueil8/Punch2 : Accueil, Commande, Magasin et Punch sans défilement de page ni contenu coupé en portrait standard, cadran/chronomètre fondés sur le pointage confirmé, transfert préparé, dernière job autorisée et choix MIR cohérents. Une capture fixe ne prouve ni l’exhaustivité du catalogue ni le traitement serveur d’une action.

Base : `6039306ac76584ee6b06859786c02eef7cfca685`, PR37 en brouillon, branche `codex/refonte-chantier-employe-chef`. Méthode Qualité Atelier1.0.0 et mission `3c427b93-a395-43a6-953a-59935acf12b4`v4 relues directement sur le serveur; cadrage UX `4b001308-b3a8-49c4-9053-17745940f200`v14 relu, avec tous les choix applicatifs et la palette charcoal neutre/vert MIR. Les autres missions actives ont été consultées. Full-stack demeure le seul intégrateur du code et des tests; cette expertise écrit ce seul rapport et ses preuves locales. SEO/GEO : non applicable, application interne privée.

## Les étapes

1. Conserver un état avant exact6039306, des données fictives comparables et des captures réellement inspectées.
2. Mesurer le document et les éléments visibles : le respect de la hauteur seul ne suffit pas si des boutons, produits ou formulaires sont masqués. Distinguer défilement de page, pagination et adaptation au clavier/grand texte.
3. Rejouer des scénarios indépendants après gel, puis les contrôles historiques touchés. Détecter pertes, doublons, mauvais contexte et succès prématurés; conserver le cas rouge avant son recontrôle vert.
4. Examiner les preuves CI de la tête finale et distinguer Chromium simulé, backend TEST, WebView accélérée et Samsung physique. Actualiser Atelier seulement après réponse serveur confirmée par le coordinateur.

## Comment savoir que c’est terminé

| Sujet | Contrôle prévu | Preuve attendue |
|---|---|---|
| Hauteur utile | Employé/Chef,360/390/430px,2jobs, panier non vide, Punch confirmé actif/inactif/déplacement | Document non déroulant pour Accueil/Hub/Magasin/Punch, rectangles des actions dans l’espace disponible, aucun masquage par panier/nav/bandeau |
| Chronomètre | Horodatage confirmé, durée journée distincte de segment/déplacement et du payé; navigation, reprise et rechargement | HH:MM:SS recalculé depuis les timestamps; aucune écriture par seconde, aucun faux départ ou arrêt |
| Punch difficile | Confirmation retardée, panne, résultat pending, reprise, double toucher, changement de job et déplacement | Un seul pointage/intention, ancien état confirmé conservé jusqu’au reçu; pas de timer confirmé issu d’un serverAt local provisoire |
| Catalogue complet | Union des pages, recherche/catégorie/Favoris, dernière référence, variantes, détail et quantité obligatoire | Toutes les références accessibles; aucun produit retiré pour tenir l’écran; pas de page vide incorrecte après changement de filtre |
| Panier | Matériel+pliage/dessin, reçu incomplet, erreur et ajout pendant envoi | Seules quantités acquittées retirées, ajout concurrent conservé, absence de double commande |
| Choix MIR | Matrice Ergonomie écran/champ/type, valeurs, dépendances, désactivés, annulation/focus et FormData | Valeurs serveur et contraintes conservées, sélection courante explicite; dates/heures sans dérive de fuseau; iframe compris |
| Contrastes | Mesures Harmonisation des vrais styles clair/sombre/système et états | Texte4.5:1 normal/3:1 grand, icônes/limites/focus3:1 selon application; pas de conclusion fondée seulement sur les dimensions |
| Notifications | Même texte avec identifiants/dates distincts, événement rejoué et cible autorisée | Pas de déduplication par texte; date Toronto et identité de l’objet respectées; bonne ouverture ou refus |
| Météo | Sans coordonnées/ville, ville unique/ambiguë, réponse récente/ancienne, réseau/CSP | Indisponibilité honnête, aucune donnée inventée/GPS permanent/adresse privée; origines autorisées précisément |
| Non-régression | Auth/session, profil, rôles/isolation, Punch/règles, moteurs pliage/PDF, autres rôles | Assertions existantes conservées et suites pertinentes rejouées, CI rattachée au SHA exact |

Le catalogue de fixture contient81références mais le présentateur6039306 produit79fiches en regroupant certaines variantes. L’exhaustivité se vérifie avec les identifiants des fiches ET les `data-item-id` de leurs variantes, pas par une égalité naïve du nombre de cartes et du nombre de références. Une option de variante transmet un index; ses identifiants article/couleur associés doivent rester corrects.

La matrice Ergonomie actualisée recense169contrôles dans61sources, y compris des contrôles système ou hors rôles : ce nombre ne constitue pas169menus chantier actifs déjà vérifiés. La référence détaillée est `CHOICES-SAMSUNG.md`. Cas sensibles transmis à l’intégrateur : motif livraison sans value explicite (texte réel transmis), fractions0..15etvide dans l’iframe, journée→segments de correction, `before_tax`/`total`, contraintes et champs dépendants, valeurs date/heure locales.

## Détails pour le chat

### État avant6039306 — exécuté et inspecté

Le snapshot figé de Harmonisation (`/tmp/mir-harm-samsung-before`) est utilisé en lecture. Le harnais `/tmp/mir-qa-samsung-before.cjs` sert ses vraies sources avec une fixture locale :2jobs autorisées, panier contenant1ligne de quantité2, pointage fictif présenté comme déjà confirmé par la fixture depuis plus de2heures et segment distinct. Aucun backend, compte ou envoi réel.

Dix-huit états ont été mesurés :2rôles ×3largeurs ×Hub/Magasin/Punch actif. Le CSS et le bandeau TEST de l’adaptateur natif sont réellement composés dans Chromium; les viewports360×732,390×796 et430×884réservent48px par hypothèse explicite. Ils ne sont pas des hauteurs Samsung mesurées. Le fuseau de cette référence est Toronto. Les captures définitives attendent la disparition naturelle du toast temporaire après ajout panier.

| Largeur et hauteur de test | Hub : hauteur document | Magasin : hauteur document | Punch actif : hauteur document |
|---|---:|---:|---:|
|360×732|844|34515|1048|
|390×796|823|31239|1048|
|430×884|884|30925|1048|

Les résultats sont identiques pour Employé et Chef.16des18états nécessitent le défilement du document; seul le Hub430px tient déjà. Aucun des6états Punch actif ne contient de chronomètre HH:MM:SS. Le Magasin expose8select natifs visibles et le Punch1. La liste catalogue compte79fiches dans le DOM; leur présence hors du viewport initial n’est pas présentée comme une disparition de produits. Zéro erreur JavaScript; panier non vide vérifié dans chaque état.

Preuves : `artifacts/chantier-redesign/samsung-qualite-before/measurements.json` et `results.txt`. Les captures Chef390Commande/Magasin/Punch ont réellement été ouvertes : la barre panier superposée réduit la zone des produits, le Punch n’affiche que l’heure de début et les actions secondaires dépassent le bas visible. La première mesure avec toast transitoire est conservée dans `measurements-transient-toast.json`, mais n’est pas utilisée comme comparaison visuelle stable.

### Météo — diagnostic et limites connues avant correction

Le coordinateur a établi que la CSP de l’ancien APK130004 n’autorisait pas Open-Meteo. Sa tentative de lecture publique du géocodage Lévis depuis Work a reçu un refus du proxy CONNECT403/HTTP000. Ce refus ne prouve ni une erreur de l’API météo ni un problème d’authentification du compte. Aucune réponse météo hébergée réussie n’est revendiquée. Les cas stub/CSP, ville ambiguë, données anciennes et panne restent à rejouer après correction; aucune connexion personnelle n’est requise pour les préparer.

### État du travail

Plan et pièges de non-régression transmis à l’intégrateur. Les premiers contrôles après correction ci-dessous sont exécutés sur l’arbre de travail en cours. Le gel final, le contrôle CI et la recette Samsung de ce nouveau lot restent à réaliser. Aucune source, aucun test suivi, compte, mot de passe ou donnée métier n’a été modifié par cette expertise.

### Premiers recontrôles après intégration — résultats exécutés

Ces résultats concernent le premier ensemble annoncé prêt à examiner par l’intégrateur; ils ne sont pas encore rattachés à une nouvelle tête distante finale.

- **Géométrie :18états**, mêmes deux rôles, largeurs, CSS/bandeau et panier non vide que la référence. Aucun document ne défile, aucun rectangle de contrôle visible ne sort de l’espace mesuré entre header et barre basse. Les trois captures Chef390 ont réellement été ouvertes : produits paginés, panier intégré et Punch actif sont visibles. `samsung-qualite-after/measurements-first-review.json` et `.txt`; le champ de détection générique de texte HH:MM:SS n’est pas utilisé comme preuve du chrono (le texte DOM concaténé sans espaces faisait manquer les limites de mots); les cibles du test métier suivant sont vérifiées directement.
- **Pending : défaut avant/correction après.** Sous6039306, une réponse pending réactive Commencer et un second toucher émet une deuxième intention (transport simulé, aucune preuve de deux pointages serveur). Après correction, une seule intention, bouton désactivé, aucune shift confirmée inventée, chrono00:00:00 sans started_at et état d’attente explicite. Preuves `pending-double-intent.json` avant/après.
- **Catalogue : vraie régression trouvée puis corrigée.** L’union des pages matériel/pliage et l’accès à la dernière fiche réussissent, mais le premier détail de groupe avait perdu toutes les variantes : attendu Noir/Blanc/Kaycan, options réelles vides. L’intégrateur a conservé l’objet de présentation groupé jusqu’au détail. Le recontrôle retrouve les trois références; choisir Blanc dans la feuille MIR ajoute la véritable référence blanche au panier. L’absence de quantité bloque l’ajout et quantité2 l’autorise. Preuves rouges `grouped-product-detail-first-review.json` et `catalogue-independent-first-review.txt`, puis `grouped-product-detail-after-group-fix.json` et `catalogue-independent-after-group-fix.txt`. Les deux rendus du détail ont été ouverts. Favoris/filtres/panier concurrent restent à terminer dans ce nouveau parcours.
- **Chrono :10cas métier indépendants réussis.** Le timestamp confirmé produit02:02:05, puis02:03:10 après navigation et03:03:10 après une heure de reprise simulée et rechargement avec le même état serveur fictif. Le changement de contexte général versB n’affecte pas le segment confirméA; le transfert explicite versB réinitialise le segment seulement. Déplacement/arrivée conservent le début de journée, le refus de sortie ne stoppe pas le chrono et deux événements d’arrêt pendant une réponse retardée ne créent qu’une requête. Une réponse tardive d’une ancienne identité fictive ne restaure ni ancien chrono ni attente dans la suivante, qui peut émettre sa propre intention. `clock-independent-after-account-check.json` et `.txt`. Horloge Playwright fixe, événements visibility/pageshow synthétiques, backend local simulé et identités fictives : ni reprise Android réelle, ni création de compte, ni validation Auth persistante n’en sont déduites.
- **Météo :6scénarios simulés réussis.** Absence de lieu sans requête; ville unique et vraie valeur zéro degré; ville ambiguë sans requête forecast; donnée ancienne; hors ligne; échec réseau. Les requêtes ne transmettent ni adresse/nom privé ni credentials et arrondissent la zone. Raisons d’indisponibilité distinctes vérifiées. `weather-independent.json` et `.txt`. Ce test n’établit pas une réussite réseau Open-Meteo depuis Work/Samsung, ni à lui seul la CSP de l’APK.

### Plan natif complémentaire transmis au coordinateur

Le test natif6039306 parcourait les cinq onglets, mais ne démarrait aucun Punch et ne remplissait aucun panier. Il ne prouvait donc pas un chrono actif ou un panier non vide dans l’APK. Un plan a été transmis : root vérifie d’abord les deux comptes CI existants398…/ec…; aucune ancienne shift n’est modifiée en cas de collision. Si les comptes sont libres, root seul peut préparer deux shifts/segments fictifs TEST bornés aux comptes/jobs QA, clairement marqués non physiques et relus par API avant CI. Ajouter ensuite du matériel uniquement dans le panier local via l’UI, sans confirmer de commande; vérifier nav/background/reprise/recréation, timestamp et absence de nouveaux événements Punch. Toute préparation/clôture de fixture reste hors de cette expertise.

Le chrono animé exige de garder le contrôle contre les PNG dupliqués : PNG brut, hash brut recalculable, union commune de petits rectangles chrono bornés si nécessaire, hash du contenu indépendant et vérifications du chrono séparées. Un test négatif doit rejeter le même vieux frame dont seules les secondes du chrono dans le corps changent. Demande transmise à l’intégrateur; aucun contrôle ni test source n’a été modifié ici.

### Résultats supplémentaires et diagnostic des notifications

Le retrait d’un Favori depuis son propre détail ouvert sous le filtre Favoris avait bien retiré la référence canonique mais conservait le cœur et `aria-pressed=true`. Ce défaut a été reproduit (`favorites-remove-modal-review.json`, `false`), corrigé par l’intégrateur et rejoué (`favorites-remove-modal-after-fix.json`, `true`). Le même parcours confirme ensuite : reçu incomplet sans vidage, deux soumissions avec réponse retenue produisant une seule requête, quantité ajoutée pendant l’attente conservée après acquittement (`catalogue-independent-favorites-cart-after-fix.json`).

Le contrôle indépendant des notifications utilise trois événements fictifs : même titre, trois identifiants d’événement/entité, deux dates du jour et une date UTC correspondant à la veille Toronto. Les trois restent distincts dans Toutes; Aujourd’hui ne conserve que les deux bons IDs; l’ancien « aujourd’hui » est contextualisé; ouvrirB n’acquitte queB et ouvre la famille métier Absences. Preuves `notifications-independent.json` et `.txt`. Ce n’est pas un acquittement ou une émission réelle.

La lecture TEST du coordinateur, distincte de cette simulation, a trouvé deux notifications Chef de même titre mais avec deux événements et deux entités RH différents : créées le13novembreUTC, donc le12novembreToronto; les deux demandes portent sur le13novembre et sont soumises. Cela établit deux objets canoniques, pas leur intention d’origine; aucun regroupement par texte n’est autorisé. Le compte Employé possède100événements/entités distincts. Les faits assainis figurent dans `proofs/samsung-notification-identities.json`; aucun contenu RH, courriel ou note privée n’est repris ici. Le nombre d’éléments d’une page ne peut pas être présenté comme le total serveur. L’intégrateur a ajouté le compteur non-lu serveur et la pagination du centre; leur recontrôle final reste à effectuer.

Une course de choix a aussi été testée : retenir les métadonnéesB, ouvrir le choixA/B avec focus surA, puis rendreB. La feuille reste ouverte avec le même choix, la même source et le même focus; la métadonnéeB est enrichie. `choice-metadata-race.json`, `true`. Il s’agit d’un résultat vert, pas d’un défaut reproduit; le contenu textuel deB dans la feuille déjà ouverte n’a pas été certifié par ce seul scénario.

### Direction approuvée Accueil8 / Punch2 — nouvelle couverture, pas réemploi des anciennes certifications

Le coordinateur a transmis les deux directions approuvées par Frederick. Le cadrage Atelier a été relu directement en version16, méthode Qualité1.0.0/missionv4, proposition Qualité historiquev3. Les photos de référence ont été examinées par le coordinateur; cette expertise n’en revendique pas l’inspection. Les preuves intermédiaires ci-dessus sont conservées et ne certifient pas le nouveau rendu.

Contrôles ajoutés au plan :

1. **Accueil8** : Employé/Chef, job longue, aucune job, avis vides/multiples, météo indisponible; accueil tenant dans le portrait standard360/390/430 avec accès aux vraies fonctions. Vérifier le contenu réellement visible, pas seulement la hauteur du document.
2. **Punch2** : cadran, HH:MM:SS central et aiguille aux durées0/15/30/45/60/75minutes depuis le timestamp confirmé; temps de journée indépendant du segment, réduction de mouvement et reprise. Playvert/Stoprouge portent des libellés explicites; attente, refus et doubles actions restent contrôlés.
3. **Transfert** : préparerB sans RPC;A continue tant que le reçu n’est pas confirmé. Annuler/refuser conserveA. Le succès utilise le RPCswitch existant, sans séquenceout/in, avec même instant de fermetureA/ouvertureB et continuité jour/aiguille. La vraie job pointéeA reste prioritaire même si le contexte Accueil estB; nom/adresse et action Terminer ne doivent pas être attribués àB.
4. **Dernière job proposée** : dernière journée réellement travaillée dont `work_date` est strictement antérieure à la date métier America/Toronto, notamment vendredi après fin de semaine; une journée terminée plus tôt aujourd’hui est exclue; job encore active et autorisée, date indiquée sans recopier d’heure/GPS. Un dernier accès retiré demande un choix au lieu de remonter à une vieille job. Une réponse historique tardive ne remplace jamais un choix manuel, un Punch commencé ou une identité suivante.
5. **Anticlip** : texte du chrono complet à200% et au-delà de100heures, rectangles Range, largeur/hauteur de contenu et ancêtres de découpe; job visible avant Commencer. Les bonnes dimensions d’un h2 contenant une chaîne coupée ne valent pas réussite. Le filtre dense ne doit conserver aucun ID/contrôle dupliqué après ses choix.
6. **Preuves natives animées** : conserver PNG brut et body hors graphiques; ajouter une bande d’en-tête de contenu fixe, identique en coordonnées sur les cinq onglets et hors chrono/aiguille, avec cinq empreintes distinctes recalculées indépendamment. Un vieux frame dont seules l’aiguille ou les secondes changent doit être rejeté. Full-stack seul écrit ces tests; Qualité les relit/exécute et Mobile recalcule les pixels puis inspecte les vraies images.

### Fixtures natives réellement préparées par le coordinateur

Le coordinateur a installé deux shifts/segments fictifs marqués `QA-SAMSUNG-SYNTHETIC-NOT-PHYSICAL`, uniquement sur les deux comptes CI existants et la jobA autorisée. Le début confirmé est `2026-11-14T11:48:53.43491Z`; les lectures RPC sous revendications authenticated contrôlées ont retrouvé les mêmes lignes. Les compteurs d’événements sont restés0pour Employé et3pour Chef. Preuve `proofs/samsung-active-fixture.json`. Ce mode n’est ni une connexion HTTP revendiquée par cette préparation, ni un PunchGPS physique. Aucun SQL n’a été exécuté par cette expertise; le coordinateur clôturera seulement ces deux fixtures après la dernière CI, sans suppression.

La nouvelle tête, les nouvelles CI, la revue complète des nouveaux rendus et le bilan Atelier final restent à produire. La proposition Atelier historique ne sera actualisée qu’après ces confirmations, avec des preuves publiques; aucun lien privé APK/Drive ni emplacement de clé n’y sera ajouté.

### P1 — rejeu du transfert dans le moteur existant, reproduit localement

La suite historique `tests/mir-punch-postgres.cjs` a été rejouée sans modification :20scénarios réussis (`punch-existing-postgres.txt`). Un scénario indépendant supplémentaire a ensuite exécuté le vrai SQL du moteur dans PGlite : Punch actifA, appel unique `switch` versB, puis **rejeu de la même requête et du même request_id**.

Le premier transfert fermeA et ouvreB au même instant exact selon une comparaison SQL et garde le début de journée. Le rejeu crée toutefois un troisième segment et une deuxième trace d’audit, tandis que le nombre d’événements reste1. Le `ON CONFLICT` ne protège que l’insertion de l’événement, après que l’action de transfert a déjà été exécutée.

Preuve `samsung-qualite-after/punch-atomic-switch-before.json` : `segmentsAfterFirst:2`, `segmentsAfterReplay:3`, `eventCount:1`, `auditCount:2`, `replaySameSegment:false`; assertion rouge conservée dans `.txt`. Ce n’est ni une erreur de présentation ni un transfert GPS réel : aucun SQL ou RPC hébergé n’a été exécuté par cette expertise. Le défaut a été transmis au coordinateur et au seul intégrateur; le rejeu ne peut pas être certifié avant une correction du contrat et son recontrôle. Les20tests historiques restent conservés.

La lecture du contrat déployé réalisée par le coordinateur est documentée séparément dans `proofs/approved-transfer-server-contract.json`. Elle établit la structure de fermeture/ouverture au même instant, pas un transfert hébergé exécuté. Les deux fixtures natives actives restent intactes.


### Recontrôle indépendant du contrat de reçu Punch — local

Le même scénario SQL rouge ci-dessus a été rejoué en chargeant le nouvel adaptateur additif TEST `mir_field_punch_action`, avec l’émetteur TEST exigé. Résultat : fermetureA/ouvertureB au même instant, début de journée conservé,2segments après le premier switch et toujours2après le rejeu;1événement,1audit et même identifiant de segment. Preuves `punch-atomic-switch-after-receipt.json` et `.txt`. Le rouge antérieur reste conservé. Ce résultat ferme le rejeu pour ce nouvel adaptateur local; il ne prétend ni corriger rétroactivement l’ancien RPC ni établir l’installation ou l’appel HTTP hébergés.

### Première revue indépendante Accueil8 / Punch2 — écarts concrets

Le nouveau scénario de transfert préparé passe en simulation : choixB sans requête, annulation avant confirmation sans mutation, requête switch unique retenue pendant laquelleA reste active et le bouton Annuler est désactivé, puis reçuB avec début de journée inchangé. Refus et réponse pending conserventA; une attente ne peut pas être présentée comme annulée. Les propositions respectent vendredi après fin de semaine, l’exclusion d’une journée fermée aujourd’hui, la frontière UTC/Toronto et le retrait de l’accès à la dernière job sans repli vers une vieille job. Une réponse historique tardive n’écrase ni le choix manuelB ni un nouveau pointageA. Les six positions DOM du cadran et les six valeurs HH:MM:SS concordent depuis le même timestamp confirmé, sans intention Punch émise. Ces9groupes ont réussi sur l’état intermédiaire (`approved-flow-independent.json`).

Deux écarts sont toutefois reproduits et transmis :

- **Double toucher après confirmation immédiate** : toucher Play, recevoir IN immédiatement, puis retoucher les mêmes coordonnées90ms plus tard émet OUT et termine la journée. Le défaut se reproduit pour Employé et Chef. Ce cas diffère des clics simultanés pendant une requête retenue. Preuves rouges `approved-double-tap-employee.json`, `approved-double-tap-chef.json` et `approved-flow-independent.txt`.
- **Cadran coupé à200%** :24états contrôlés,2rôles×3portraits×actif125:02:05/inactif×100/200%. Les12états100% passent; les12à200% font dépasser le cadran/chrono hors viewport, parfois avec chevauchement des actions et de la navigation. Sur360px, le Range du chrono125:02:05 va de148à440px. Le nom et l’adresse du chantier restent visibles. Capture360200réellement ouverte. Preuves `anticlip-125h-review.json`, `.txt` et `anticlip-125h-active-360-200.png`. L’échelle est la taille CSSracine200%, pas un réglage Android textZoom.

Aucune certification finale du nouveau Punch n’est accordée pendant ces corrections. Les réponses de transport et les identités de ces tests sont fictives; aucune requête hébergée Punch n’a été émise par cette expertise.


### Contrôles supplémentaires8/2 exécutés

Le harnais indépendant étendu porte les groupes réussis à13, les deux échecs étant toujours les doubles touches IN→OUT Employé/Chef. Il vérifie aussi : retrait de l’autorisationB pendant une réponse historique retenue sans retour àA; changement d’identité fictive avant réponse sans restauration de l’ancienne job; contexte AccueilB suivi de PunchA avec vraie adresse et action de sortieA; navigation, événements synthétiques de reprise et rechargement avec le même timestamp fictif produisant03:10:00et60°, sans écriture Punch. Preuves `approved-flow-expanded.json` et `.txt`. Ni compte réel ni persistance Auth n’en sont déduits.

La suite permanente de l’intégrateur `tests/mir-punch-receipts-postgres.cjs` a été exécutée indépendamment :14groupes locaux PGlite réussis, dont préalable TEST, émetteur/organisation/rôle, GPS, reçus immuables, réutilisation malveillante d’UUID, identité/capacité révoquée, semaine verrouillée, récupération d’ancienne queue sans réexécution et interdiction de lire directement les reçus. Preuve `punch-receipts-independent-run.txt`. Le scénario SQL indépendant rouge/vert du switch reste distinct de cette suite.

Le nouveau contrôle de pagination des notifications passe :100événements/entités fictifs au même titre restent distincts, compteur Accueil100au lieu de la taille de page30, pages30/60/90/100, une seule lecture après double clic, erreur après60sans perte de liste puis reprise jusqu’à100. Preuves `notifications-pagination-independent.json` et `.txt`. Aucun acquittement ni émission réelle.

L’Ergonomie a confirmé séparément la fermeture du défaut d’IDs dupliqués des filtres denses sur20contextes/40états; ses preuves sont citées dans son propre rapport. Les parcours de choix, filtres, Home et contrastes de chaque spécialiste ne sont pas revendiqués comme des tests exécutés par cette expertise.


### Contrat de reçu déployé TEST et probe transactionnelle du coordinateur

La preuve versionnée `proofs/approved-punch-receipts-test.json` a été relue. Le coordinateur a installé l’adaptateur sur MIRTEST seulement, puis exécuté switch/rejeu sous rôle authenticated avec revendications SQL contrôlées dans une transaction annulée. Résultats dans la transaction : même reçu, même segment, même début de journée, frontière fermeture/ouverture identique, réutilisation de l’intention avec un autre contenu refusée,1événement/1audit/2segments. Après ROLLBACK, les deux fixtures actives restent sur leurs segmentsA originaux,0événement/0audit/0reçu de probe pour Employé. La migration versionnée et la proposition ont été comparées indépendamment : mêmeSHA-256`f72b0ba991dcca84d3a6e3d8f61c5c7cf2f87459b4e7da7765027b7c03f4171d`.

Cette vérification hébergée est une lecture de preuve du coordinateur, pas un appel SQL réalisé par cette expertise. Elle ne vaut ni connexion HTTP de recette ni pointageGPS physique. L’authentification, le serveur et l’interface doivent rester nommés selon leur niveau de preuve.


Le catalogue a aussi été rejoué après les nouveaux écrans : depuis la dernière page, choisir Clous & vis dans la feuille MIR revient à la première page avec les bons articles canoniques; une recherche sans résultat donne1/1et désactive Suivant; effacer la recherche conserve la catégorie; revenir à Toutes retrouve les61fiches matériel et18fiches pliage. Dernière référence, quantité obligatoire et groupe fascia avec ses trois références et la véritable variante blanche sont toujours accessibles. Preuve `catalogue-independent-final-filter-check.json` et `.txt` sur l’état de travail intermédiaire, sans confirmation de commande.


### Adaptation dense approuvée pour la fin de recette

Le coordinateur a confirmé l’adaptation secondaire autorisée à200% et en petit paysage : durée entière, vraie job et action principale directement visibles; panneau MIR «Voir le cadran» pour le cercle complet et les détails. Le mode standard conserve le cadran approuvé. Le contrôle final évaluera ce parcours progressif réellement ouvert, la fermeture du panneau et l’annulation d’un transfert, sans exiger la composition standard dans l’espace dense. Un texte masqué ne sera toutefois pas compté comme visible; les informations divulguées devront être réellement accessibles dans le panneau, avec les grands caractères conservés.


### Recontrôle ciblé après correction du double toucher

L’intégrateur a annoncé le nouveau comportement prêt à examiner. Les16groupes du harnais indépendant passent, dont les deux reproductions IN→OUT aux mêmes coordonnées90ms après reçu immédiat, le cas inverse OUT→IN, puis la possibilité d’une nouvelle action normale après réarmement. Les refus, attentes, transferts, limites de date et courses d’identité/autorisation restent vérifiés. Les neuf fichiers source suivis par ce harnais sont restés identiques entre début et fin; leurs SHA-256 figurent dans `approved-flow-final.json`, avec le journal `.txt`. Il s’agit encore d’un GO ciblé avant la tête globale finale, car l’adaptation dense et les gardes natifs continuent d’évoluer.

La suite client de l’intégrateur a aussi été exécutée :6/6réussis après ajout du DTO messagerie explicite à sa fixture. Elle utilise le vrai module portal-client avec un SDK fictif et vérifie le nouvel RPC TEST pour Employé/Chef, le rejeu de la queue avec le même UUID, les parcours legacy/Entrepôt et le refus de réattribuer une intention à une autre identité. Preuve `punch-receipts-client-independent-fixed.txt`. Aucun appel hébergé n’est déduit de ce transport simulé.

### Adaptation dense : état intermédiaire à reprendre

Le nouveau parcours progressif rend le nom réel de la job,125:02:05et l’action simple visibles à360/200%; la feuille MIR donne bien l’adresse complète. Le panneau agrandi permet maintenant de lire la durée entière dans un cercle complet avec les grands caractères conservés. Un premier passage sur24états a traversé une modification des sources et n’est donc pas utilisé comme certification globale (`sourceUnchangedAtEnd:false`).

Une reprise ciblée avec sources stables a toutefois confirmé un écart dans la préparation du transfertB à360×732/200% : le rappelAet son adresse sur plusieurs lignes repoussent le libellé principal et Annuler sous la barre basse. Le rectangle Annuler mesuré630→679px se situe sous la navigation commençant605px. Capture `approved-dense-prepared-360-200.png` réellement ouverte et preuve `anticlip-progressive-current-debug.json`. Le fait qu’un clic automatisé ait pu finir par atteindre une action ne suffit pas à certifier sa visibilité. Défaut transmis à l’intégrateur, au coordinateur et à Ergonomie; recontrôle du parcours progressif en attente du prochain gel.


### Gardes contre les anciennes captures animées

Les nouveaux gardes ont été relus dans le checkerNode et le test Android : bande d’en-tête de contenu commune aux cinq vues, située hors cadran, hash des pixels recalculé, cinq en-têtes différents, PNGbrut et contenu hors masques conservés. Les limites de masque restent sixrectangles au maximum, chacun sous10% et total sous20%; elles n’ont pas été élargies pour obtenir du vert.

La suite permanente du checker passe7/7 (`native-guards-independent.txt`). Cinq scénarios supplémentaires ont été générés dans un script temporaire indépendant, avec PNGsynthétiques et calcul ARGB propre : cas valide deuxrôles/cinqvues; même ancien écran avec secondes ET aiguille différentes, bodyhash différent mais headerhash identique donc rejet; rectangle d’en-tête divergent; empreinte d’en-tête falsifiée; masque trop grand. Tous passent (`native-header-independent-negative.json` et `.txt`). Ces pixels synthétiques servent uniquement à tester le vérificateur : ils ne sont jamais présentés comme des captures de l’application ou une recette native. Mobile reste responsable de l’archive réelle, du recalcul des crops et de l’inspection visuelle après CI.


### Recontrôles ciblés après hauteur automatique et choix daté

Le transfert dense est maintenant accessible selon le parcours progressif approuvé :24/24états passent, deuxrôles×troisportraits×actif125:02:05/inactif×100/200%. Le nom, la durée et l’action simple sont lisibles; la feuille MIR donne l’adresse; le panneau montre le cadran entier avec le chrono dans sa propre zone et les grands caractères conservés. À360/200%, une préparationB demande un vrai geste vertical d’environ86px pour exposer le libellé complet et Annuler au-dessus de la navigation;390/430n’en demandent pas pour cette annulation. Ce défilement dense est explicite, sans clic forcé, et ne vaut pas un défaut du portrait standard. Images après geste et panneau390réellement ouvertes. Preuves `anticlip-progressive-after-autoheight.json` et `.txt`.

La matrice standard actuelle a été étendue à24états : Accueil/Commande/Magasin/Punch actif×deuxrôles×troisportraits, panier contenant uneligne de quantité2et deuxjobs autorisées. Aucun document déroulant, aucun contrôle visible hors zone utile, aucune erreurJavaScript. Les quatre captures Chef390ont été réellement ouvertes. Preuves `measurements-approved-standard-final.json` et `.txt`, captures préfixées `approved-standard-`. Les viewports réduits de48px restent des hypothèses de test, pas une mesure Samsung.

Le harnais métier passe désormais17/17groupes. Le nouveau cas conserve un choixB manuel sans Punch lors d’un rechargement le vendredi, puis l’ignore après rechargement le lundi pour proposer la jobA confirmée du vendredi, avec le même acteur fictif et la date métier Toronto. Aucune heure, position ou mutation serveur n’est reprise du choix manuel. Preuves `approved-flow-final.json` et `.txt`; capture de préparationB390régénérée.

Les neuf fichiers sont demeurés stables dans chacun de ces trois passages, mais app/views/CSSont encore évolué ensuite pendant l’intégration. Ces réussites sont des recontrôles ciblés; la future tête finale exige un dernier rattachement aux sources gelées. Aucun résultat courant n’est présenté comme CI ou recette physique.


### Gel remis à l’intégration et derniers deltas bornés

Le dernier scénario métier ajoute le choix Accueil : métadonnéesB retenues puis rendues pendant la feuille ouverte sans perte de focus/sélection; une seule lectureB, choixB conservé sur Accueil après fermeture/annulation, aucun RPCPunch; le pointage actifA reste prioritaire sur Punch. Les18groupes passent. Les24états standards et24états progressifs ont été rejoués sur les mêmes neuf empreintes, stables dans chaque suite. Les captures finales Accueil390, préparation390, état dense après geste et panneau125hont été réellement rouvertes.

Après ces matrices, les deux fichiers Accueil ont reçu deux derniers deltas contrôlés :

- CSS : glyphe du chevron dans sa boîte44px. Le retrait de cette unique dernière règle restitue exactement le SHA-256CSSdes matrices. Smoke indépendant4/4 : Employé/Chef×avec/sans job,430px/200%, glyphe entier, cible44px, ouverture/fermeture MIR sans Punch. Capture Chef sans job réellement ouverte; `home-chevron-smoke-final.json` et `.txt`.
- Vues :7/7scénarios indépendants sur la version finale. ContexteBavec vrai pointageA affiche «En cours ailleurs», ou «Déplacement en cours» si segmenttravel; l’aria-label nomme la jobA autorisée, et ouvrir Punch conserveA, pour les deuxrôles. Un prénom long donne Bonjour sans perdre le nom complet du compte dans le profil. Un avis déjà lu reste accessible même avec0nonlu. `home-final-deltas.json` et `.txt`.

Les sept autres sources sont identiques aux suites18/24/24; les manifestes des deux contrôles ciblés sont identiques entre eux et aux sources à la remise. Preuve `final-source-delta.json`. Aucun contrôle n’a été affaibli et aucune assertion métier n’a été retirée.

| Source locale remise | SHA-256 |
|---|---|
|`dist/chantier-app.js`|`097431fa730e8ded701020cb72f1e90bab9738f2b8edc9e7254ec2b1018e437a`|
|`dist/mir-field-views.js`|`defeb111dda9b71bca6a3cca62053943ef6373dd6085cbd505ef948f6cf834a6`|
|`dist/mir-field-runtime.js`|`d8bf3f68868f0f2b5e0d47af0ad3260e8f4ef4573918a8b2b10a0337b6386f71`|
|`dist/mir-field-samsung.css`|`3cbe963aafb7d33e02be92d0af4229ae6b90b1f80511822eaaabd478f1404190`|
|`dist/mir-field-controls.js`|`a5bdba73dc731b7603e303e4e4979fc9c2710a6f6381bf0d84c758b860d7c895`|
|`dist/mir-field-controls.css`|`d4d7b0411ed301630b54b3239f03dbbd768213525c44796b0fc3aad4bda0a814`|
|`dist/portal-client.js`|`6764212bf8872b638d8afce3494ac1a3bb6b9a5b00b3fea3cc51fa22935e5a21`|
|`tests/helpers/mir-field-fixture.cjs`|`84465e8fa88e8249db7b7575a20ba4765eb94519321752ea64d3813672ad9ea8`|
|`mobile/web/team.css`|`f7e8c3306ec0e4554b9d2fc09148daefa97447efde48e5b682ef08f618a2d904`|

Les preuves Chromium sont des simulations de transport explicitement identifiées. Les7tests de vérificateur et5cas de pixels synthétiques ne sont ni un émulateur ni un appareil physique. Le coordinateur assure push/PR, puis Qualité surveillera les CI de la tête exacte sans réécrire les fichiers suivis. Aucun nettoyage des fixtures n’est exécuté par Qualité. Le bilan Atelier final attendra confirmation de la tête, des CI, des preuves et du nettoyage par le coordinateur; aucun lienAPKprivé ni emplacement de clé n’y sera transmis.
