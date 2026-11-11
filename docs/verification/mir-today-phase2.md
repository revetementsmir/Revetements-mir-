# MIR — Phase 2 : tableau Aujourd’hui mobile

Date : 11 novembre 2026. Périmètre : UI Aujourd’hui Employé/Chef uniquement.

## Correctifs de recette — état courant après le rapport initial

La demande utilisateur a été clarifiée : les deux échecs visés sont `mir-punch-postgres.cjs` et `mir-client-pliage-approved-browser.cjs`. Aucun fichier `tests/mir-today-js` n'existe. Les tests Aujourd’hui `mir-today.cjs` passent à 7/7, également sous `node --test`; ils n'ont pas nécessité de changement.

Base des correctifs : `74ed614a7039b128728a7d09286fce204c1ff592`, même branche locale `codex/phase-2-aujourdhui-mobile`. Aucun push. Aucune autre phase. Aucun appel Supabase, aucune écriture production ni modification de réglage dans cette reprise.

### Causes exactes et corrections

1. **Punch SQL : dates de fixture incohérentes.** Le test fabriquait une période limitée à la date UTC de Node (`toISOString()`), tandis que les corrections changent `punch_shifts.work_date` selon `America/Toronto`; le refus d'un nouveau Punch verrouillé utilise `current_date` PostgreSQL. Entre minuit UTC et minuit Toronto, ces deux dates diffèrent. La période du test couvre désormais les bornes `least(current_date,work_date)` et `greatest(current_date,work_date)` lues dans PostgreSQL. Les assertions de verrouillage de la journée et de refus d'un nouveau Punch sont conservées. Aucune fonction SQL métier ni migration n'est modifiée. Résultat : les 20 scénarios complets passent, aussi avec TZ=UTC et TZ=America/Toronto.

2. **Pliage mobile : contrat de mise en page et recette désynchronisés.** L'assertion « wizard fits one screen » s'appliquait aussi à la page publique d'introduction et à son pied de page : à 360×780, le document mesure 875 px, sans débordement horizontal; le simple écran de choix mesure bien 780 px. Elle s'appliquait également aux formulaires détaillés de mesures/matériaux, qui peuvent défiler. Le contrôle horizontal reste strict partout. La hauteur d'un écran reste exigée pour choix/modèles/dessin; l'introduction doit permettre d'atteindre son pied de page et les formulaires doivent permettre d'atteindre réellement le bouton Suivant, avec vérification de la position et du hit-test.

   Le déroulement complet, jusque-là bloqué par cette première assertion, a aussi exposé deux points du même parcours : le retour depuis un modèle enregistré de type custom passe volontairement par « Modifier le tracé » avant « Retour aux choix »; le test saute désormais correctement ces étapes visibles, puis utilise « Nouveau tracé » pour séparer son scénario de dessin neuf. Enfin, les commandes clavier ajoutées avaient agrandi le panneau mobile du dessin : à 360×780, son bas atteignait 864 px. Le CSS réduit uniquement ce bloc `body[data-client-entry="draw"]` à ≤600 px, regroupe ses commandes sans les masquer, laisse le clavier déplié sur une ligne complète et réserve une surface de dessin de 280 px minimum et des cibles de 44 px minimum. La hauteur de canvas est ajustée au viewport à partir de 780 px de hauteur. Aucun moteur, tracé, prix ou modèle n'est réécrit.

Le chemin de preuves du test Pliage est maintenant configurable par `MIR_CLIENT_PLIAGE_PROOF_DIR`, pour conserver les captures historiques. Les preuves de cette reprise sont dans `/tmp/mir-phase2-correction-pliage`, avec les neuf parcours complets dans `results.json`.

### Résultats de la relance complète

**29 suites locales distinctes réussies, 0 échec final** : les 25 suites du rapport initial ci-dessous, plus `mir-production-signature-browser`, `mir-production-client-flow-browser`, `mir-unified-dossier-browser` et `mir-atelier-v4-browser`.

- Aujourd’hui : 7 tests unitaires/statiques; UI six formats × deux rôles réussie.
- Punch SQL : 20/20; même résultat avec les deux fuseaux UTC et Toronto. Punch navigateur : réussi.
- Pliage navigateur : 12 formats de démarrage puis 9 parcours complets réussis (360, 390, 428, 600, 601, 834, 1024, 1348 et 1440 px); clavier déplié, tous boutons/selects/summaries ≥44 px, dessin ≥280 px, modèles, mesures, retour, dessin, annulation, couleurs et données locales conservées.
- Régressions Pliage supplémentaires : présentation client/Admin, navigation, dessin, dossier, JSON/PDF réels, reprise et ancien dossier 8 pi réussis.
- Accueil, Boutique, Magasin, Entrepôt, Réalisations, Studio, dossier chantier, navigation et sessions : toutes les suites initiales relancées réussissent.
- Studio : première exécution parallèle en échec sur un délai de chargement de 30 secondes; relance isolée réussie sur bureau et mobile. Aucun timeout ni assertion n'a été augmenté ou supprimé.

Les commandes, résultats complets et empreintes SHA-256 des trois fichiers corrigés sont dans [mir-today-phase2-corrections-tests.json](mir-today-phase2-corrections-tests.json). Les deux échecs conservés dans le rapport initial ci-dessous sont désormais **résolus par cette reprise**. Ils restent décrits pour l'historique, pas comme des échecs finaux actuels. La CI GitHub n'a pas été relancée puisqu'aucun push n'est effectué.

### Fichiers de cette correction et risques

- `tests/mir-punch-postgres.cjs`
- `tests/mir-client-pliage-approved-browser.cjs`
- `dist/mir-production-signature.css`
- `docs/verification/mir-today-phase2.md`
- `docs/verification/mir-today-phase2-corrections-tests.json`

Le principal risque visuel concerne seulement le panneau de dessin Pliage mobile ≤600 px, notamment le clavier déplié et les petits écrans. Les neuf parcours, les cibles tactiles et le clavier sont vérifiés; aucun essai sur appareil physique n'est revendiqué. Les formulaires détaillés conservent le défilement autorisé; un contenu coupé ou un bouton inaccessible fait échouer la recette. Le test SQL change ses données de période, pas les permissions ou la logique de verrouillage. Les fichiers applicatifs Aujourd’hui, le client RPC, les réglages et les migrations sont identiques au SHA de base de cette correction. Les captures historiques régénérées par les tests ont été remises à leur version initiale et ne sont pas incluses dans le correctif.

---

## Référence et reprise

- Dépôt : `revetementsmir/Revetements-mir-`, clone `/workspace/Revetements-mir`.
- Main récupéré et inspecté : `39ca1033ae1b70ced19cc5c756d4957f84cb2d41`.
- Branche locale : `codex/phase-2-aujourdhui-mobile`.
- Commit de code et captures testé : `b4aa323c9b4aa3837df4c4fe4f036503a6c86f90`.
- Les deux documents Prompt 2/passation ont été lus entièrement avant développement. Le rapport backend a été lu entièrement au commit `749012b0807f18e127381fb7f2bf141fede916e1` de `codex/backend-punch-production`; il est absent de main. Il est historique : le contexte utilisateur actuel confirme l'installation des sept migrations production.
- Aucun changement dans `/workspace/MIR`, main, les RPC, les migrations, RLS ou réglages production. Aucun compte créé. Aucun push, aucune nouvelle PR, aucune fusion ni publication.

## Réutilisation et changements

Le tableau utilise trois cartes prioritaires : chantier/adresse, journée/Punch, puis tâches et avis. Les outils existants restent accessibles en dessous. Le header MIR, son menu et la navigation de rôle sont réutilisés; seuls les styles de la page Aujourd’hui sont complétés. Les cibles de la nouvelle UI mesurent au moins 44 px. Le bouton du menu Chef est aligné sur celui de l'Employé.

Réutilisation : `punchCard` et les gestionnaires Punch existants; `mir_lead_today_snapshot` via le client existant; `mir_job_dossier_snapshot` via `portalClient.jobDossier`; notifications personnelles de `mir_employee_operations_snapshot`; actions `mir_lead_action` existantes pour tâches, présence et rapport; itinéraires Google Maps/Apple Plans/Waze et dossier Phase 1 existants.

Le contrat réel production a été inspecté en lecture seule : `mir_portal_snapshot` reprend les jobs du snapshot partagé, qui renvoie seulement id/nom. Le tableau complète donc les métadonnées depuis le dossier canonique déjà autorisé. Aucun RPC n'est reconstruit. Les tests UI comprennent aussi cette réponse principale minimale, pour les deux rôles, puis l'enrichissement par le dossier. Un échec du dossier affiche un état explicite et ne crée aucune tâche fictive.

Pour l'Employé, trois premières tâches non terminées du dossier sont affichées en lecture seule. Pour le Chef, les tâches du jour et la présence viennent du snapshot Chef; les actions restent celles déjà validées. Les avis affichés sont les trois premiers avis personnels non lus. Les routes sont limitées à des vues existantes ou à un chantier autorisé; aucune URL fournie par un avis n'est exécutée et aucun nouveau mécanisme de notification n'est créé.

« Terminer ma journée » est réservé au Chef avec affectation et ouvre son rapport existant. Ce bouton ne ferme ni Punch ni chantier et n'accorde aucun droit à l'Employé. Aucun nouvel avancement 10–70 %, aucune nouvelle RPC de clôture et aucun nouveau temps réel Boss/Adjointe ne sont ajoutés dans cette mission UI.

La météo utilise Open-Meteo en lecture publique, sans clé, cookie ni compte. Elle reçoit soit des coordonnées de chantier arrondies au dixième de degré, soit uniquement la ville canonique du dossier pour chercher une ville canadienne non ambiguë. Aucune adresse de rue, identité ou géolocalisation de l'employé n'est envoyée. Cache mémoire de 15 minutes, délai réseau de 5 secondes par appel, états chargement/indisponible, refus des données d'un autre jour. Sans localisation disponible ou avec une ville ambiguë, aucune météo n'est inventée. L'attribution du fournisseur est visible.

## Production — vérification réelle en lecture seule

Projet : `gccltmaulvrnthrbnrpd`. Requête exécutée dans une transaction READ ONLY à `2026-11-11 02:49:17.250101+00` :

```sql
begin read only;
select now() as checked_at, count(*) as settings_rows,
 count(*) filter(where module_enabled) as punch_enabled_rows,
 count(*) filter(where bank_enabled) as bank_enabled_rows
from mir_core.punch_settings;
commit;
```

Résultat : **2 lignes de réglages, 0 Punch activé, 0 banque activée**. Aucune ligne ni aucun réglage n'a été modifié. Les autres lectures production concernent exclusivement les définitions des snapshots; aucune session de compte production n'a été ouverte.

## Matrice de permissions inchangées

| Rôle | Aujourd’hui | Tâches / présence | Terminer | Avis / dossier |
|---|---|---|---|---|
| Employé | Chantiers autorisés par le snapshot/dossier | Lecture; aucune commande Chef | Absent | Avis personnels et dossier autorisé |
| Chef | Affectation courante du snapshot Chef | Actions Chef existantes | Rapport existant avec affectation | Avis personnels; dossier autorisé |
| Boss | Tableau gestion existant conservé | Aucun changement | Aucun nouveau droit | Contrat existant |
| Adjointe | Tableau gestion existant conservé | Aucun changement | Aucun nouveau droit | Contrat existant |
| Entrepôt | Tableau logistique existant conservé | Aucun changement | Aucun nouveau droit | Contrat existant |
| Admin | Permissions techniques conservées, libellé Boss opérationnel | Aucun changement | Aucun nouveau droit | Contrat existant |

Les contrôles UI ne remplacent pas RPC/RLS. Aucune permission serveur n'est modifiée. Les tests statiques vérifient les empreintes de quatre fichiers protégés et six fonctions de présentation/opération existantes. La certification réelle des six comptes MIR TEST n'a pas été relancée dans cette phase; elle ne doit pas être déduite des fixtures UI.

## Tests exécutés — 23 suites réussies et 2 échecs préexistants

| Commande `node tests/<nom>.cjs` | Nature | Résultat |
|---|---|---|
| `mir-today` | Unitaire/statique : météo, cache, données périmées, routes, confidentialité, intégrité Punch/client | 7/7 PASS |
| `mir-today-browser` | Chromium fictif : 360×800, 390×844, 430×932, 768×1024, 1024×768, 1440×900; Employé + Chef | PASS; 12 combinaisons, zéro débordement/erreur JS, cibles ≥44 px |
| `mir-employee-portal-browser` | Navigation, dossier, Magasin/panier et envoi simulé | PASS, 320/360/390/820/1024/1440 px |
| `mir-chef-boss-browser` | Chef et Boss simulés | PASS, Chef six formats + Boss mobile |
| `mir-punch-browser` | Punch, décisions, heures, journal, banque, dîner, PDF simulés | PASS |
| `mir-job-dossier-postgres` | PostgreSQL jetable, RPC/RLS/Storage/historique | 6 scénarios PASS |
| `mir-job-dossier-browser` | Contrats + captures fictives du dossier | 6/6 PASS |
| `mir-homepage` | Statique accueil | 13/13 PASS |
| `mir-homepage-browser` | Chromium accueil | 11/11 résolutions PASS |
| `mir-boutique-audit-20261110` | Catalogue/statique | PASS, 118 références |
| `mir-boutique-audit-20261110-browser` | Chromium Boutique | PASS, 390/834/1366/1440 px |
| `mir-pliage-audit-commercial` | Métier Pliage/Magasin | 11 contrôles PASS |
| `mir-client-pliage-approved-browser` | Chromium Pliage | ÉCHEC préexistant : `wizard fits one screen 360` |
| `mir-magasin-merge` | Métier Magasin | 16 contrôles PASS |
| `mir-warehouse-core` | Métier Entrepôt | 15 scénarios PASS |
| `mir-warehouse-sql` | Contrat statique permissions/stock | PASS |
| `mir-warehouse-browser` | Chromium Entrepôt simulé | PASS, PC/mobile et accès refusé |
| `mir-realisations` | Statique Réalisations | 9/9 PASS |
| `mir-realisations-browser` | Chromium Réalisations | PASS, 360 à 5120 px |
| `mir-studio-wall-sections` | Métier Studio | 10 contrôles PASS |
| `mir-studio-wall-sections-browser` | Chromium Studio | PASS, bureau/mobile |
| `mir-pages-regressions` | Statique/métier Pliage/Studio/sauvegardes | 41/41 PASS |
| `mir-role-navigation` | Contrat statique rôles/navigation | PASS |
| `mir-account-session` | Sessions simulées / données périmées | 2/2 PASS |
| `mir-punch-postgres` | PostgreSQL jetable | ÉCHEC préexistant après 14 PASS : `review !== locked` |

Le nouveau test UI vérifie aussi l'absence d'affectation, le refus du dossier, la météo réseau en erreur, les routes d'avis interdites, l'absence de commandes Punch sur la page désactivée, le bouton rapport réservé au Chef et les snapshots minimaux réellement utilisés en production. Toutes les données UI et réponses météo sont fictives; les requêtes externes y sont bloquées ou interceptées.

### Preuves des échecs préexistants

- Punch SQL : le blob du fichier testé et celui de main sont identiques : `c1a368d6547822680bbe1ea625412af3734e2775`. Ni ce test ni les migrations n'ont changé dans cette branche. L'échec `tests/mir-punch-postgres.cjs:30:765` est aussi documenté dans le rapport backend historique sur le SHA main. Le test utilise UTC pour la période et une correction recalcule la journée en Toronto. Aucun correctif n'est introduit ici dans le module protégé.
- Pliage : le même test a été exécuté sur une worktree détachée de main `39ca1033ae1b70ced19cc5c756d4957f84cb2d41`, `/tmp/mir-phase2-main-C9rTZq`. Même assertion `wizard fits one screen 360`, mêmes lignes 74/80, même résultat `false !== true`, après les 12 contrôles de démarrage réussis. La branche Phase 2 ne modifie aucun fichier Pliage.
- Ancien fixture Chef sans `assignedMemberIds` : une première intégration utilisait le filtre Employé pour le Chef. Corrigé dans le nouveau tableau pour utiliser son affectation canonique; la suite existante Chef/Boss réussit ensuite sans modification du test.
- Deux suites historiques imposent `channel:'chrome'`, absent dans cet environnement. Elles ont été relancées avec un adaptateur temporaire du seul lanceur vers `/usr/bin/chromium`, sans changer leurs assertions ni les fichiers applicatifs. Entrepôt et Studio réussissent. Le nouveau workflow utilise le navigateur Google Chrome fourni sur GitHub Actions.
- Les premières erreurs de la nouvelle suite (syntaxe du test et vérification d'une checkbox retirée immédiatement au rendu) ont été corrigées avant validation finale. Aucun échec initial n'est compté comme un succès sans relance.

## Captures avant/après

24 PNG versionnés : six formats pour chacun des deux rôles, avant et après. Captures après prises à l'état initial, avant les actions de recette, sans toast ni fenêtre superposée. Données entièrement fictives. Ce ne sont ni des captures de production ni des preuves sur appareils physiques.

Exemples : [Employé avant 390](captures/today-phase2/before-employee-390.png), [Employé après 390](captures/today-phase2/after-employee-390.png), [Chef après 390](captures/today-phase2/after-chef-390.png), [PC après 1440](captures/today-phase2/after-employee-1440.png).

## Risques et limites

- `chantier-app.js` est partagé entre rôles : risque principal de régression de rendu. Les parcours Employé/Chef/Boss/Punch et dossier ont été relancés; les fichiers client/RPC/config et fonctions protégées sont inchangés.
- La météo dépend de deux API publiques externes; seules les réponses fictives sont testées ici. L'accès réel fournisseur/CORS et ses conditions d'utilisation devront être validés avant une éventuelle publication. Une panne affiche « Météo indisponible » sans bloquer le chantier.
- Sans créneau canonique dans le snapshot Employé, le second chantier est nommé « Autre chantier autorisé », jamais présenté comme une prochaine affectation certaine. Le Chef voit son affectation du jour et son heure de début existantes.
- Les tâches Employé viennent du dossier; aucun tri d'urgence nouveau n'est inventé. Le Chef conserve les tâches du jour du snapshot Chef.
- « Terminer » prépare uniquement le rapport existant; pas de nouveau suivi d'avancement ou de fermeture automatique. Ces fonctions backend ne sont pas déclarées réalisées.
- Aucun test sur téléphone/tablette physique, aucune certification de nouvelles sessions réelles, aucun test de mutation production. Le workflow ciblé est ajouté localement et n'a pas été exécuté sur GitHub, puisqu'aucun push n'est effectué.

## Liste exacte des fichiers de la Phase 2

- `dist/chantier.html`
- `dist/chantier-app.js`
- `dist/mir-today.js`
- `dist/mir-today.css`
- `tests/mir-today.cjs`
- `tests/mir-today-browser.cjs`
- `tests/fixtures/mir-today.cjs`
- `tests/fixtures/mir-today-baseline.json`
- `.github/workflows/mir-today-pr.yml`
- `docs/verification/mir-today-phase2.md`
- `docs/verification/captures/today-phase2/before-employee-360.png`
- `docs/verification/captures/today-phase2/before-employee-390.png`
- `docs/verification/captures/today-phase2/before-employee-430.png`
- `docs/verification/captures/today-phase2/before-employee-768.png`
- `docs/verification/captures/today-phase2/before-employee-1024.png`
- `docs/verification/captures/today-phase2/before-employee-1440.png`
- `docs/verification/captures/today-phase2/before-chef-360.png`
- `docs/verification/captures/today-phase2/before-chef-390.png`
- `docs/verification/captures/today-phase2/before-chef-430.png`
- `docs/verification/captures/today-phase2/before-chef-768.png`
- `docs/verification/captures/today-phase2/before-chef-1024.png`
- `docs/verification/captures/today-phase2/before-chef-1440.png`
- `docs/verification/captures/today-phase2/after-employee-360.png`
- `docs/verification/captures/today-phase2/after-employee-390.png`
- `docs/verification/captures/today-phase2/after-employee-430.png`
- `docs/verification/captures/today-phase2/after-employee-768.png`
- `docs/verification/captures/today-phase2/after-employee-1024.png`
- `docs/verification/captures/today-phase2/after-employee-1440.png`
- `docs/verification/captures/today-phase2/after-chef-360.png`
- `docs/verification/captures/today-phase2/after-chef-390.png`
- `docs/verification/captures/today-phase2/after-chef-430.png`
- `docs/verification/captures/today-phase2/after-chef-768.png`
- `docs/verification/captures/today-phase2/after-chef-1024.png`
- `docs/verification/captures/today-phase2/after-chef-1440.png`

Le fichier utilisateur préexistant `MIR-PHASE-1-CODEX.patch` est conservé non suivi et exclu des commits. Arrêt à la Phase 2; attendre l'autorisation avant la phase suivante.
