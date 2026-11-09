# Recette administration — 9 novembre 2026

**Source de départ : `main` au commit `466f3f170ed995ed9bdbd1124700b170195bc303`.**

Les parcours réels ont utilisé les fichiers du dépôt servis au navigateur sous l’origine officielle, avec Auth, Postgres, Storage privé et Resend de **MIR TEST**. Aucun panier de recette n’a été prérempli en base. Les données sont fictives. Les envois ont utilisé exclusivement la boîte de test autorisée par MIR. Le frontal publié n’a pas encore été remplacé : la revue automatique bloque les migrations d’administration en production, et `main`/Pages restent à la version précédente.

## Constats reproduits

| Parcours | Avant | Résultat corrigé |
|---|---|---|
| Mon compte → Créer un chantier | API `0A000`, action non raccordée | Job 353 créé par le formulaire, avant affectation |
| Suspendre / réactiver | API `0A000` | États enregistrés et relus ; opérations et invitation révoquée refusées sous suspension |
| Affectation | API `{ok:true}` sans résultat ni instantané ; confirmation incertaine | Résultat et instantané serveur cohérents, fiche rafraîchie |
| Magasin employé | Catalogue serveur vide, envoi `42501` | Référence ADSEAL exacte publiée par l’admin, commande de 25 envoyée depuis le panier |
| Répartition après création du SKU | La commande existante ne retrouvait pas la variante | Raccord exact à la même identité de variante, sans changement du QR |
| QR | Le détail conservait la quantité globale | Détail et validation serveur limités aux 20 affectés, puis 3 ajoutés |
| Bon PDF R1 | Instantané JSON brut, 2 pages, rendu refusé par le client | R2 lisible, 1 page, prévisualisée avant approbation et renvoi |

[Rapport avant](before/results.json) · [Captures avant](before/) · [Captures après](after/).

## Parcours métier réel

1. L’admin crée le job **353** et prépare une fiche nom/courriel/équipe.
2. Invitation privée 72 h, connexion avec le courriel invité, rattachement à la fiche et affectation au job.
3. L’employé choisit **25 cartouches ADSEAL 4580, Ivoire 4584, tube 304 ml**, puis envoie sa demande depuis le magasin.
4. Répartition **20 entrepôt + 5 fournisseur**. L’adjointe ajoute **3** avant expédition ; la ligne initiale est conservée.
5. L’entrepôt retrouve l’avis, reconnaît les changements et prépare **20 + 3**. Les reprises serveur retrouvent les mêmes mouvements. Stock fictif **100 → 77**.
6. L’expédition entrepôt ne déduit rien de plus et n’efface pas les 5 attendus du fournisseur.
7. Bon privé, approbation/PDF et envoi de recette. Réception directe au chantier de **3**, puis **2**. La commande est complète.
8. R2 documentaire : présentation corrigée, R1 conservée, aucune quantité ni réception supplémentaire.
9. Plan publié sur la session admin puis révisé ; l’adjointe sur une autre session retrouve les versions et télécharge la courante.
10. Une estimation reçue et acceptée crée le chantier **353-EST**, lié au dossier et à ses PDF originaux. L’adjointe autorisée ouvre aussi la version Studio soumise et protégée.

[Contrôle final réel par rôle et largeur](after/final-real-ui-results.json).

## Rôles et tailles

| Rôle QA réel | 390 × 844 | 834 × 1112 | 1440 × 900 | Résultats |
|---|---|---|---|---|
| Admin | Réussi | Réussi | Réussi | Administration, chantier, plans et bon R2 |
| Adjointe autorisée | Réussi | Réussi | Réussi | Dossier partagé, plans, bons ; boîte d’estimations et Studio vérifiés aussi dans la recette dédiée |
| Entrepôt | Réussi | Réussi | Réussi | Stock 77, retour Administration, accès limité à son parcours |
| Employé assigné | Réussi | Réussi | Réussi | Plans du job et suivi complet de la commande, aucun accès Administration |

**Chromium, tailles émulées.** Aucun téléphone, tablette ou PC physique n’a servi aux parcours du site par l’agent. Le client a confirmé le courriel R1 et l’ouverture de son PDF sur son téléphone ; ce constat ne vaut pas recette du site sur appareil physique. R2 a été inspectée à partir du PDF réellement archivé, puis acceptée par Resend ; sa réception humaine reste non confirmée.

Les **19 états supplémentaires** d’interface, avec Auth/API simulées, vérifient les mêmes largeurs, droits affichés, libellés longs, dialogue clavier et aperçu PDF avant approbation. La matrice est produite dans `artifacts/administration/matrix.json` et dans l’artefact GitHub de recette. Ces essais ne sont pas présentés comme des accès Supabase réels.

## Accès refusés vérifiés

- Employé hors chantier : aucun résultat par recherche du job, API du dossier `403`, téléchargement de l’objet exact refusé par Storage (`NoSuchKey`, sans contenu).
- Invitation révoquée : ne réactive pas l’employé suspendu. Réactivation explicite ensuite par l’admin, compte QA restauré.
- Rôles non autorisés : absence des sections privées et refus serveur, y compris accès direct.
- Les refus client et autre organisme, ainsi que l’immuabilité du Studio soumis, sont aussi couverts par la recette réelle d’estimation précédente et par les nouveaux tests PostgreSQL.

## Preuves PDF

[Avant R1](pdf/before-r1.png) · [Après R2](pdf/after-r2.png) · [PDF R2 fictif](pdf/MIR-353-corrige-R2.pdf).

Le courriel R1 a été réellement reçu et son PDF ouvert, mais sa présentation était incorrecte. Le code de génération brute a été remplacé. Le PDF R2 réellement archivé comporte une page Lettre, les champs utiles, le logo MIR, la date souhaitée du 12 novembre et une mention de correction sans nouvelle quantité. Les données internes restent dans le dossier privé.

Objets des courriels :

- `[RECETTE MIR TEST] Bon fournisseur MIR — MIR-20261109-00EC54 — R1`
- `[RECETTE MIR TEST] Bon fournisseur MIR — MIR-20261109-00EC54 — R2 (PDF corrigé)`

## Vérifications automatisées

- PostgreSQL jetable : **6 scénarios d’administration**, droits, invitations, doublons, commande immuable, documents privés et historique archivé.
- PostgreSQL jetable : **17 scénarios de coordination**, dont réceptions en stock distinctes de la livraison chantier, reprise sans double stock, PDF approuvé et révision documentaire.
- Envoi fournisseur simulé : **5 tests**, refus d’accès, destinataire de test imposé, clé stable, réponse interrompue, refus fournisseur et production désactivée.
- PDF fournisseur : **2 tests**, contenu utile sans JSON/identifiants internes, pagination et échappement.
- Régressions : **9 tests Edge d’estimation**, service Node d’estimation, **41 contrôles publics/Pliage**, sauvegarde directe, connexion et anciens navigateurs de recette Équipe/Coordination/Espace partagé.

Les réceptions réelles de courriel sont distinguées des captures et des simulations. Les workflows ne possèdent aucune clé d’envoi et n’envoient aucun message.

Les échecs intermédiaires de recette sont conservés dans [attempts/](attempts/) ; les scénarios ont ensuite été corrigés et rejoués. Le rapport final réel et la matrice finale distinguent ces essais des vérifications réussies.

## Production et blocage

La revue automatique a rejeté l’application de `20261109190000_mir_administration_portal.sql` dans MIR : elle exige l’accord explicite pour remplacer les API d’accès/commandes et modifier permissions, invitations, jobs et commandes de production. Aucun contournement n’a été tenté.

Constat en lecture après refus : aucune table `staff_profiles`, aucune colonne `jobs.job_number`, **0 job, 0 commande**, **0 estimation**, et `mir_estimates.settings.enabled=false` en production. Le seul socle privé d’estimation a été installé vide et désactivé ; les alignements des modules existants n’ont pas modifié les données métier. Les fonctions Edge d’administration restent déployées uniquement dans TEST.

`main` et GitHub Pages ne sont pas mis à jour par cette livraison tant que le déploiement serveur n’est pas autorisé. Le réseau de l’environnement refuse aussi l’accès direct à Pages : `curl: (56) CONNECT tunnel failed, response 403`. Les tests publiés restent donc à effectuer après autorisation et déploiement ; le workflow Pages prévoit la vérification du commit et des octets publiés.

Le compte réel de l’adjointe, les réglages d’envoi de production et, si nécessaire, la validation d’un expéditeur MIR restent à confirmer dans leurs services. Aucun forfait payant n’a été souscrit. Voir [les opérations serveur et les actions restantes](../../MIR_ADMINISTRATION_SERVER.md).
