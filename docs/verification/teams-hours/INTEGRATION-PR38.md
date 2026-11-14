# Vérifications avant intégration PR38 → PR37

## Contention hébergée — 14 novembre 2026

MIR TEST exclusivement. Deux connexions PostgreSQL distinctes, droits `authenticated` et identité QA Boss contrôlée, sur le quart synthétique fermé `7da20261-1114-4000-8550-000000000001`. Les deux propositions avaient la révision initiale `0f9bcf18afc8c85a978e4cc92c03e942`.

- A (PID 932177) : 21:14:34.472311Z–21:14:54.513154Z, approbation acceptée.
- B (PID 932179) : 21:14:45.733565Z–21:14:54.529978Z, refus `40001`, « Le quart a changé ; rechargez son détail ».
- A a observé B bloqué par son propre PID avant validation. Il s’agit d’une contention réelle, contrairement au premier essai sérialisé explicitement exclu de cette preuve.
- Relecture : un seul audit d’approbation, un seul reçu de décision, deux segments jointifs à 10 h 30, aucun écrasement. Les deux événements originaux synthétiques restent présents. Rejeu du même identifiant A : même résultat, aucune modification du résultat canonique, des segments, événements, reçus ou audits.
- Les empreintes de tous les autres quarts et segments restent identiques à l’état préalable. Les propositions périmées des deux essais sont explicitement refusées par le contrat Boss pour les clôturer; les deux quarts étaient fermés dès leur création. Aucun historique supprimé.

Preuve détaillée : [hosted-contention-20261114.json](proofs/hosted-contention-20261114.json). Cette preuve SQL ne représente pas une connexion HTTP ni une recette Samsung physique. Aucune migration rejouée, aucun compte créé, aucun courriel envoyé.

## Capture Android sans clavier

Le test Android conserve toutes ses assertions HTTP, rôles, recherche et exclusion. Il ferme désormais réellement le clavier via Android, vérifie les insets IME, cadre la carte et exige sa visibilité complète avant la capture. Ressources web générées et compilation du test Android réussies localement. La preuve d’exécution et l’inspection de la capture doivent être confirmées sur la nouvelle tête CI avant toute fusion.

Deux nouvelles fixtures actives dédiées `8700…001/002`, segments `8800…001/002`, portent le marqueur `QA-TEAMS-HOURS-SYNTHETIC-NOT-PHYSICAL`. Les anciens quarts fermés ne sont pas réactivés. Les nouvelles fixtures seront clôturées précisément après les contrôles Android de PR38 et de PR37 intégrée.

## Intégration autorisée

Destination exclusive : `codex/refonte-chantier-employe-chef`, PR37 maintenue en brouillon. Fusion PR38 avec commit de fusion uniquement après réussite des deux vérifications et relecture immédiate des têtes. Aucune fusion de PR36/37 ou vers main, aucune publication Pages. L’APK personnel 130005 reste historique et ne contient pas Équipes et heures.
