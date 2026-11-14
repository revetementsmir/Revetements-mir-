# Refonte chantier Employé et Chef

Branche `codex/refonte-chantier-employe-chef`, [PR37 en brouillon](https://github.com/revetementsmir/Revetements-mir-/pull/37). Base exacte Auth `24d29734d68cd3da23c17be8693ddba08abff19f`, [PR36](https://github.com/revetementsmir/Revetements-mir-/pull/36) préservée et en brouillon. Main relu `d4a9ec05ee9a0c2ede0713efab0add860a9507cb`. Aucun développement dans l’ancien dépôt MIR. Les changements préexistants du paquet S25 sont conservés dans leur checkout séparé.

La nouvelle interface partage les mêmes sources `dist` entre aperçu et APK. Elle remplace la navigation chantier par **Accueil · Commande · Punch · Message · Plus**, avec panier commun et avatar. Le drapeau TEST `fieldExperienceEnabled` n’ajoute aucun droit serveur et ne publie pas le site web ordinaire.

## Résultats des six expertises

| Expertise réellement mobilisée | Résultat et preuve |
|---|---|
| Designer | Nouvelle composition, dossier et formulaires ; vrai parcours Dessin jusqu’au panier sur deux rôles et trois téléphones. Défauts de double en-tête, cadres et recouvrement corrigés. [Rapport](DESIGNER.md) |
| Ergonomie et accessibilité | 240 rendus principaux, 96 à200%, 40 secondaires et25 contrôles formulaires/focus ; contrastes, cibles, libellés, erreurs et grands textes corrigés puis recontrôlés. [Rapport](ERGONOMIE.md) |
| Mobile Android | 48 états Chromium, clavier simulé avec écran physique fixe, paysage et retour interne ; coffre/session/caméra/GPS/fichiers relus, contraintes natives reprises dans la recette CI. [Rapport](MOBILE.md) |
| Harmonisation | Composants, clair/sombre, cinq onglets, formats larges et dessin dans son cadre commun inspectés ; captures distinctes et empreintes conservées. [Rapport](HARMONISATION.md) |
| Qualité | Défauts reproduits puis corrigés : panier concurrent, rôle NULL, réponse forgée, photo remplacée après erreur, journée/segments et retour Chef A→B→A. Lectures UI réellement raccordées à TEST. [Rapport](QUALITE.md) |
| Full-stack | Un seul intégrateur des sources, mêmes moteurs et objets métier, six contrats TEST versionnés, tests permanents supplémentaires et aperçus. [Matrice complète](INTEGRATION.md) |

Les méthodes MOON et Atelier ont été réellement consultées. Les six sous-agents de cette mission ont exécuté leurs mandats ; les fiches Atelier servent à conserver les méthodes et bilans, pas à prétendre qu’Atelier exécute un travailleur distant autonome.

## Besoins réalisés, vérifications et réserves

| Besoin | Réalisation et vérification | Réserve |
|---|---|---|
| Journée, jobs, navigation et profil | Cinq onglets, itinéraire distinct Punch, sélection explicite, nom/numéro/adresse, contacts autorisés et documents canoniques ; deux jobs TEST ouvertes | Météo honnêtement indisponible sans réponse ; consignes seulement si fournies par le dossier existant |
| Chef et équipe | Lecture et mutations liées à la job sélectionnée ; A→B→A hébergé, tâches et membres réels, refus hors affectation | Présence non confirmée reste non confirmée ; aucun droit salaire ajouté |
| Photos, extra, problème, outil | Même dossier job, auteur/date/pièces/état/réponse ; HTTP TEST, Storage privé, lecture Employé, décisions bureau contrôlées | Connexions UI Adjointe/Entrepôt non revendiquées pour leurs décisions SQL |
| Magasin, banque et dessin | Moteurs existants, dessin personnel, lettres/cotes/matière/couleur/quantité, panier et suivi communs | Aucune modification de banque entreprise autorisée par un dessin personnel |
| Confirmation panier et livraison | Reçu réel requis, contenu conservé en erreur, ajouts pendant envoi conservés, doubles actions protégées ; incident lié commande/ligne/job testé | Essais livraison sur commandes fictives en brouillon, aucune expédition réelle |
| Punch et heures | Services/règles existants, GPS ponctuel, déplacement, pauses, verrous/audit ; historique personnel paginé et correction d’ancienne journée | Premier Punch oublié sans shift : demande privée au bureau, traitement initial manuel |
| Message | Clavardage existant, recherche, fil, pièces jointes et états d’envoi ; même conversation dans Message et dossier, privés protégés | Clavier Android et reprise réseau physique restent à recetter |
| Congés, dépenses et rapport | Formulaires progressifs, bonne job, statuts serveur ; rapport Chef avec photo, avancement et restant dans l’objet canonique | Aucune approbation, facture ou dépense automatique |
| Session et Android | Auth préservée, données privées isolées, verrou système facultatif ; tests SDK et recette KVM CI séparés | Samsung physique toujours ouvert |

[Preuves hébergées et limites détaillées](HOSTED-QA.md) · [protocole Samsung et signature](SAMSUNG.md).

## Aperçus et captures

`node tools/preview-chantier.cjs` lance un aperçu **local simulé** sur127.0.0.1:4173 avec les mêmes sources que l’APK. Ce lien local n’est pas présenté comme un aperçu partagé. Le HTML autonome et son fragment de conversation contiennent des états réellement rendus, des données fictives et une navigation visuelle, sans API, compte, stockage ou envoi ; ils ne constituent pas un raccordement serveur.

Les captures dans [screens](screens) montrent les cinq onglets des deux rôles, les comparaisons390px et les lectures TEST Chef/historique. Les captures `hosted-*` sont distinguées des simulations. Les empreintes sont dans [proofs/screens.json](proofs/screens.json). Les autres formats/thèmes et formulaires conservent leurs manifestes d’expertise et les artefacts CI.

L’API Atelier a confirmé les mises à jour du bilan. Le helper officiel de transfert visuel renvoie toutefois HTML « Atelier — Connexion » au lieu de JavaScript : aucune synchronisation de fichiers visuels ni finalisation de proposition visuelle n’est annoncée sans réception serveur.

## Contrôles

La suite permanente de la refonte couvre deux rôles, cinq formats, cinq onglets, erreurs/reprise, multiclics, dessin réel, panier concurrent, photo remplacée, rapport, livraison, historique et changements de contexte. PostgreSQL local couvre25 groupes : permissions, organisations, jobs, objets privés, idempotence, profil personnel et contrats canoniques. Trois tests de panier isolent l’acquittement des quantités. Les suites Auth/session, autres rôles, pliages/PDF et métier historiques sont conservées. Les adaptations d’empreintes sont explicites et versionnées, avec assertions métier maintenues.

Les résultats CI de la tête distante finale se lisent dans [les contrôles PR37](https://github.com/revetementsmir/Revetements-mir-/pull/37/checks) et le bilan Atelier ; ne pas réutiliser un checkpoint comme preuve finale. L’APK personnel fournit sa propre provenance et son SHA-256 dans le bilan de livraison. Aucun APK de CI à clé éphémère n’est proposé en remplacement de l’application Samsung.

L’inspection indépendante de l’artefact natif1466eb1 a refusé des captures identiques malgré la CI verte. Le [rapport Mobile](MOBILE.md) conserve ce constat. Le nouveau contrôle exige le contenu propre à chaque onglet, des images réellement différentes et deux jobs avec équipes/tâches pour les identités exactes de la CI. Le vrai nom métier est lu par un RPC self-only TEST, sans modifier les métadonnées Auth. Les résultats de la nouvelle tête doivent être vérifiés avec ses captures avant remise de l’APK.

Google et transports de courriel restent désactivés. Aucune fusion, publication Pages, opération production, signature release, distribution employés ou activation paiement. SEO/GEO non applicable à cette application privée.
