# Contrats de gestion Punch — TEST

Contrats issus de l’audit sur3952b05. Installés exclusivement sur MIR TEST par les migrations serveur20261114191502 et20261114193024 ; preuves de transactions ROLLBACK liées dans le bilan. Le stockage reste celui du Punch existant.

## Frontière de sécurité

- Installation exclusivement MIR TEST : garde projet/configuration et émetteur JWT TEST ; refus de production et d’organisation étrangère.
- Identité et droits relus côté serveur : Adjointe/Boss actifs pour la gestion ; aucun rôle fourni par le navigateur, aucun droit Admin ajouté.
- Chaque mutation porte un UUID d’intention, employé et organisation ; verrou transactionnel de cet employé, reçu stable, refus de réutilisation de l’UUID avec une autre intention.
- Quart/périodes et affectations sont relus avant validation. Une période verrouillée exige le parcours de réouverture Boss et son motif, sans contournement.

## Entrées et sorties indépendantes

| Saisie | État canonique | Effet sur les heures |
| --- | --- | --- |
| Entrée seule | Quart et segment ouverts avec début explicitement choisi, selon approbation requise | Temps en cours clairement indiqué ; aucune sortie inventée. |
| Sortie seule sans entrée | `punch_corrections`, type `missing_in`, `shift_id:null`, `proposed_data` portant date/JOB/fin connue | À vérifier, durée inconnue et non payable ; aucune création de `started_at`. |
| Entrée complétant une sortie isolée | Même correction reliée au quart créé une fois les deux bornes validées | Durée calculée depuis les deux heures réelles ; l’état initial et la décision restent audités. |
| Journée complète | Un quart canonique et ses segments | Aperçu des bornes, pauses, JOB, total et incidences avant confirmation. |

Une nouvelle saisie Adjointe n’est pas une approbation automatique. Les décisions, motifs et règles Boss/heures supplémentaires restent explicites. L’approbation d’une période contenant les propres heures de l’acteur est refusée sur les anciennes et nouvelles routes. Les originaux ne sont pas effacés et aucun doublon n’est créé sur une reprise de requête.

## Transfert et correction rétroactive

L’action reçoit un quart existant, la destination choisie et l’heure de transfert. Un transfert scinde le segment concerné à cette heure et commence le suivant à la même borne, sans clore le quart. Les bornes début/fin du quart restent identiques. Refuser destination non autorisée, trou, chevauchement, intervalle inversé, période verrouillée et réponse basée sur une révision périmée. Les transferts multiples et le remplacement de destination sont prévisualisés puis audités avant/après.

## Calcul canonique

Une fonction serveur partagée produit durées du quart, pauses, segments/JOB et semaine. Dîner automatique15minutes strictement après300minutes, selon réglages existants, avec exception approuvée « dîner non pris ». Tester299/300/301 sans modifier les paramètres. Ne pas déduire une pause deux fois lorsqu’une pause explicite la couvre.

La pause automatique ne porte pas d’horaire réel. Sa ventilation comptable par JOB doit être explicite dans l’aperçu ; aucun emplacement ni moment de dîner n’est inventé. La ventilation utilise le prorata des durées JOB réelles. Un arrondi à la microseconde avec plus grands restes et ordre déterministe conserve la somme et interdit les valeurs négatives. Le reliquat sans JOB reste explicitement non attribué ; aucun JOB fictif n’est créé. Le seuil repose sur l’amplitude du quart ; les pauses explicites sont déduites une fois et le complément automatique vaut max(0, cible−pause explicite).

## Lecture et interface

Étendre l’entrée Punch existante : Aujourd’hui par défaut, Semaine accessible, puis À traiter/Heures/Historique progressifs. PC : employés × jours ; téléphone : cartes par jour, sans tableau comprimé. Le détail d’un employé ouvre seulement les actions autorisées et utiles.

Les données viennent des mêmes quarts/segments/corrections, équipes, JOB et absences approuvées. « Non pointé » reste distinct de « absence confirmée ». Une absence partielle conserve dayPart/startTime/endTime et son libellé indique les heures concernées, sans la présenter comme une journée entière. GPS à vérifier ne supprime aucune durée et ne diffuse pas de coordonnées au tableau général. Dernière actualisation et état réseau sont visibles ; aucun « temps réel » annoncé sans mécanisme vérifié.

## Vérifications ciblées

Lecture et mutation entre organisations et cinq rôles ; entrée/sortie seules et appariement ; journée sans anomalie ; transfert214→315 à10h30 et transferts successifs/rétroactifs ; doublons/reprise ; bornes299/300/301 et exception repas ; pauses sans double déduction ; période verrouillée/réouverte ; résolution GPS et conservation historique ; mêmes résultats dans les vues et exports ; PC/tablette/téléphone. Résultats effectifs et limites dans README.md ; l’HTTP/WebView réel reste à la CI native du candidat.
