# Équipes et heures — audit de l’existant

Base examinée : `3952b05450c8a914204d215cb4013a22ee3d4037`. Branche distincte : `codex/equipes-heures-adjointe-boss`. Tâche Atelier `3c53fbea-550a-45f4-ab2e-124d605dc683` relue, version3. Audit de code et lecture des définitions/contraintes MIR TEST le14novembre2026 ; aucune mutation pendant l’audit. Le lot Samsung de PR37 reste gelé.

## Ce qui existe

| Couche | Contrat actuel | Réutilisation et limite |
| --- | --- | --- |
| Interface | `chantier-app.js` : `punch-admin`, `punch-journal`, `punch-reports` | Même entrée Punch depuis Plus, décisions et historique présents. Pas de poste Aujourd’hui/Semaine de toutes les équipes. |
| Lecture | `mir_punch_snapshot(org,employee)` | Quart actif, sept derniers jours, corrections, banque, périodes. Le client appelle `employee:null` : lecture de soi, même en gestion. |
| Pointage | `mir_punch_action`, enveloppe `mir_field_punch_action` TEST | Entrée/sortie/transfert/déplacement du compte connecté, heure serveur. Pas d’employé cible ni d’heure de transfert rétroactive. |
| Corrections | `mir_punch_correction` | Demande personnelle sur un quart existant ; décisions tierces, motif, clarification/refus/approbation et notifications. `wrong_job` remplace un segment, sans découper sa chronologie. |
| Gestion | `mir_punch_admin` | Correction d’un quart existant, périodes, banque et paramètres. `shift_correct` exige une fin et reste Boss/Admin dans le serveur actuel ; aucune création de journée. |
| Journal | `mir_punch_journal` | Pagination et filtres employé/action/période/JOB, avant/après lorsque disponibles ; export de la page. |
| Équipes | `teams`, `team_members`, `team_day_assignments`, `team_attendance` | Affectations et présences déclarées, distinctes des heures réellement pointées. Réaffecter l’équipe ne transfère pas son quart. |
| Absences | `hr_requests`, `hr_request_events`, RPC Phase5 | Absence approuvée à rapprocher de la journée ; non pointé ne signifie pas absent. |
| Stockage canonique | `punch_shifts`, `punch_segments`, `punch_events`, `punch_corrections`, `punch_audit`, `time_periods` | RLS activée, accès directs retirés, opérations par RPC. `time_entries` appartient au volet finance et ne doit pas devenir une seconde saisie Punch. |

## Contraintes hébergées confirmées

- `punch_shifts.started_at` est obligatoire ; `ended_at` est nullable. Un quart actif par employé et un segment ouvert par quart sont protégés par index uniques.
- `punch_corrections.shift_id` est nullable et `proposed_data` est JSONB. Une sortie connue sans entrée peut donc rester une correction `missing_in`, sans inventer un quart ni une durée.
- Les intervalles vérifient fin ≥ début. Aucune contrainte d’exclusion des segments clos n’a été trouvée dans le schéma examiné : les nouvelles mutations doivent vérifier aussi bornes, trous et chevauchements.
- Réglages TEST lus : module actif, dîner15minutes, seuil300minutes, GPS facultatif, hors zone à réviser, banque désactivée. L’ancien moteur déclenche le dîner à `>=300` ; le besoin confirmé impose `>300` sans modifier les réglages.

## Droits à préserver

`punch_manager` reconnaît aujourd’hui Adjointe/Boss et l’Admin historique. Les décisions refusent l’autoapprobation du sujet ; l’indicateur heures supplémentaires réserve l’approbation au Boss. Les paramètres, corrections directes et périodes sont plus restreints que la file de demandes. Certaines commandes sont affichées à l’Adjointe alors que le serveur les refuse : le nouveau parcours doit refléter les droits effectifs.

Les nouveaux contrats TEST viseront seulement Adjointe/Boss pour la gestion, avec session, organisation, adhésion et rôle actifs vérifiés côté serveur. Aucun droit technique Admin n’est ajouté. Les employés/Chefs conservent les mêmes heures et contrats personnels, sans accès à une autre personne.

## Écarts à réaliser

1. Lecture commune Aujourd’hui/Semaine : employés, état explicite, JOB, heures, absences approuvées et anomalies ; recherche/date visibles, détail progressif et heure de dernière actualisation.
2. Ajout guidé entrée seule, sortie seule ou journée complète. Entrée seule : quart canonique actif avec heure explicite. Sortie seule : correction `missing_in` avec fin connue, aucune heure payable tant que l’entrée manque.
3. Transfert choisi dans le quart existant : fermer et ouvrir à la même heure, plusieurs transferts et corrections rétroactives, sans sortie de quart. Prévisualiser les incidences avant confirmation.
4. Une règle canonique de durée/pauses et de ventilation JOB, réutilisée pour la journée, la semaine, les récapitulatifs et exports. Les calculs actuels sont dispersés entre UI et SQL (`round`/`floor`) ; la pause automatique n’a pas d’heure réelle enregistrée.
5. Regrouper corrections, entrées/sorties manquantes, GPS/hors zone et JOB à confirmer. Une anomalie ne supprime pas les heures ; une résolution quitte la file active et conserve son audit.
6. Compléter les exports : le formulaire actuel propose période/portée, mais exporte `state.punch.week` sans appliquer réellement tous ces choix.

Les originaux, décisions et avant/après existent déjà. Les nouvelles actions doivent conserver ces journaux, leur idempotence et les verrous de période, sans écrire dans un stockage d’heures parallèle.

## Sources et limites

Sources : `dist/chantier-app.js:128–135,231–234,630–644,852–867`, `dist/portal-client.js:230–253,611–638`, migrations Punch du10novembre (`punch_gps`, `phase2_integrity`, `workflow`, `corrections`, `completion`), équipes du9novembre et absences Phase5. Les définitions hébergées correspondantes ont été lues sur `hxtztkmbfpmzrieccwsg` uniquement.

Cet audit ne revendique aucun nouveau test métier réussi, migration appliquée ou écran livré. Les deux anciennes fixtures Samsung sont closes et ne seront pas réactivées. SEO/GEO : non applicable, poste de gestion privé sans changement de découvrabilité publique.
