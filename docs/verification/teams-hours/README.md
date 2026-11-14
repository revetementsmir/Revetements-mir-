# Équipes et heures — lot TEST Adjointe/Boss

Base3952b054, branche `codex/equipes-heures-adjointe-boss`. La PR37 et la livraison Samsung restent inchangées. [Audit](AUDIT.md) et [contrats](CONTRACTS.md) décrivent les raccordements au Punch existant.

L’entrée Punch ouvre Aujourd’hui, Semaine, À traiter et Historique. Ajout guidé, entrée/sortie seules, correction de bornes/pauses/JOB et transfert rétroactif utilisent les quarts, segments et corrections canoniques. L’Adjointe propose ; le Boss décide explicitement après aperçu serveur. Une sortie sans début reste une correction `missing_in`, sans durée inventée. Le journal paginé montre auteur/date/motif et valeurs avant/après. Banques, paramètres Boss et rapports PDF/CSV restent accessibles par Autres actions.

Les mêmes totaux serveur alimentent gestion, heures personnelles et exports : dîner strictement au-delà de5h, pauses explicites une fois, reliquat automatique et ventilation JOB comptable distincte des durées réelles. Périodes verrouillées, réouvertures motivées, droits du salarié cible et refus d’autoapprobation restent contrôlés au serveur. Les absences partielles gardent leurs horaires. Aucune coordonnée GPS n’apparaît dans le tableau de gestion.

## SQL installé exclusivement sur MIR TEST

| Migration locale immuable | Version serveur | SHA256 |
| --- | --- | --- |
| `20261114191433_mir_punch_management_test.sql` |20261114191502|03a2e6e6ddedd0c44b7e29bf474245ccbf762b158692bdd5125ebe38fa548165|
| `20261114193002_mir_punch_management_hardening_test.sql` |20261114193024|76a85c925262d71559af9a715d35789926417881d66f21a60b1b4e5c32f435bf|
| `20261114200031_mir_punch_management_legacy_approval_test.sql` |20261114200805|e8d15ddbf769f7da0ff54aac23c08c4c63d2f79ac6dab2eb87c8306937ed51d9|

[Contrat hébergé](proofs/hosted-contract.json) et [complément](proofs/hosted-hardening.json) : véritables RPC sous rôle authenticated et claims TEST, dans des transactions ROLLBACK. Adjointe→pending, décision Boss, transferts atomiques/reçus, refus de rôles/organisation, totaux identiques, autoapprobation refusée, absence partielle et auteur du journal vérifiés. Les sondes SQL exactes sont conservées à côté. Aucun quart/demande/audit/reçu de ces sondes ne reste après rollback. Aucun déploiement production.

## Validation du candidat

- 20 groupes PostgreSQL ciblés : calculs299/300/301, pauses/prorata/microsecondes, entrées/sorties isolées, transferts, reprises, droits, verrouillages/réouverture et trois régressions reproduites puis corrigées.
- 10 tests client : anciennes API Congés conservées, gestion limitée à Adjointe/Boss TEST, ACK explicite, UUID durable, ajout concurrent pendant flush et réponses tardives d’une autre identité.
- 14 groupes Chromium sur l’application complète et les choix MIR, avec DTO issus des vrais RPC PGlite : heures/approbation, sortie seule,200%, Historique paginé, aliases existants et banques/settings/PDF. Une confirmation incertaine verrouille les champs et réessaie la même intention.
- 19 contrats Android, suites sessions/reçus et contrôle des empreintes historiques exécutés. Le SDK Auth reste868cb696 inchangé. Les nouveaux tests sont inclus dans le workflow Android/Chromium existant.

La nouvelle recette native conserve8smoke,2upgrades et les cinq rôles plus refus Admin. Elle ajoute seulement une lecture HTTP du nouveau snapshot par Adjointe/Boss via Menu→Plus→Punch, avec les deux salariés QA et une capture par rôle. Son résultat réel sera inscrit après CI. Les anciennes fixtures Samsung fermées ne sont pas rouvertes.

Les preuves navigateur utilisent des comptes QA fictifs et un client simulé. Elles ne certifient ni appareil physique ni GPS, et ne remplacent pas l’HTTP/WebView. Le protocole de verrouillage a été relu ; aucune contention multitransaction hébergée n’est revendiquée.

Le premier candidat8480355 a révélé une ancienne décision envoyée au clic Vérifier. La régression permanente utilise le vrai DTO PostgreSQL historique : Vérifier est en lecture seule, Confirmer prend une décision explicite liée à la révision de l’aperçu. Le [troisième complément hébergé](proofs/hosted-legacy.json) refuse une révision absente/périmée ou des heures futures et rejoue un reçu déjà confirmé avant la garde de révision. Les déplacements historiques sont projetés et validés par le calculateur canonique ; trous/chevauchements sont refusés. Le writer historique est conservé.

Le run natif848 a passé8smoke et2upgrades, puis son contrôle après recréation a trouvé le dialogue Déplacement encore ouvert. Le PNG montre le symbole × sélectionné avec le menu Android de copie. Le correctif interdit uniquement la sélection des boutons de fermeture ; les notes et documents restent copiables et le test conserve son vrai UiDevice.click et ses délais. Les trois attentes Punch sont désormais nommées séparément. La nouvelle CI reste nécessaire pour qualifier cette fermeture native.
