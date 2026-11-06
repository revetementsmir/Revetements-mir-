# Mission 2 — bons de pliage et préparation de l'envoi PDF

## Base et dépendance de revue

`main` vérifiée à `02493d0517899f5fa1bfdbde0e96129989229a33`. La PR #16 pointe vers `3016a4d667fb9a4d8e5420dc649f7744ce69950f` et n'est pas intégrée à cette main lors de la vérification. Branche mission 2 : `codex/purchase-orders-pdf`, basée sur `codex/shared-data-security-foundation`. Créer la PR avec cette dernière comme base pour montrer uniquement la mission 2; fusionner/rebaser la dépendance avant de recibler main. Aucun déploiement, changement Supabase distant ou envoi réel.

## Fonctionnel sur le site statique

- Les trois vues Créer, En attente et Historique sont conservées. Champs fournisseur/chantier/livraison préremplis, brouillon de formulaire sauvegardé et retrouvailles après rechargement. Les données restent sur l'appareil tant que Supabase n'est pas connecté.
- L'ajout direct sans modèle réutilise le parcours existant. Un bon sauvegardé peut être rouvert : le moteur de production existant gère modification, duplication et suppression des pièces. Le bouton « Modifier les lignes du bon » ouvre directement le dossier. Les modifications remontent au brouillon d'achat par événement local.
- Les modifications d'un autre onglet du registre d'achat sont détectées avant écrasement. Cette protection n'est pas un verrou distribué; la base partagée et ses transactions restent nécessaires entre appareils.
- Une version avec PDF archivé, une transmission déclarée ou un état avancé impose une nouvelle révision avant modification. Un retour manuel à Brouillon ne dégèle pas l'ancienne version. La fonction Recommander crée un nouveau bon et exige un nouveau numéro.
- Recherche par fournisseur, chantier, numéro ou date, séparation terminé/annulé et consultation des événements de chaque révision. Le suivi manuel demeure explicitement distingué des preuves d'envoi.
- Téléchargement d'un vrai PDF : coordonnées fournisseur/livraison, notes, puis les feuilles de pliage cotées du moteur existant avec cotes, angles, face, métal, couleur, longueur et quantité. Les coordonnées longues sont paginées. Les pièces incomplètes ne sont pas exportées silencieusement.
- Les octets du PDF original sont conservés en IndexedDB, avec SHA-256 et empreinte du contenu de la commande. Un nouveau téléchargement de la même révision restitue le même fichier; une modification inattendue est refusée. Un PDF n'est jamais remplacé à la même clé. IndexedDB doit être disponible; une erreur d'archivage est signalée.
- Vérifier / envoyer affiche validation, prévisualisation, téléchargement et confirmation du destinataire. **Envoyer est désactivé** : aucun simulateur n'est chargé dans le navigateur et aucun clic ne peut inventer un reçu serveur.
- Les bons anciens restent dans les mêmes clés, sans réimport ni suppression. Les anciens formats sans instantané `mir-production-instance-1` restent consultables/imprimables; leur conversion vers l'éditeur est refusée avec explication plutôt qu'une suppression des pièces. Le PDF coté historique d'impression reste disponible.

Les PDF IndexedDB restent locaux : sauvegarder les téléchargements avant tout effacement du navigateur. L'outil de sauvegarde de mission 1 couvre le registre JSON, pas les blobs IndexedDB; leur transfert vers Storage privé fait partie du raccordement suivant. Aucun nettoyage automatique n'a été ajouté.

## Composants serveur implantés et testables

Migration `202611060002_supplier_send.sql` additive au socle #16 :

- `queue_supplier_pdf` vérifie `auth.uid()` et l'adhésion Admin active. Elle exige un bon fournisseur approuvé, la révision courante, le PDF correspondant et un destinataire exactement égal au contact fournisseur vérifié et actif.
- Verrou de bon, unicité requête/révision et contrôles de concordance empêchent un double clic de créer deux tâches. L'instantané approuvé est figé dans la tâche. Aucune entrée HTML, pièce jointe arbitraire, adresse expéditrice ou rôle du navigateur n'est accepté par cette RPC.
- La tâche et l'événement de mise en file sont enregistrés ensemble. `queued` ne signifie jamais « Envoyé ».

`server/supplier-send.cjs` fournit un handler HTTP standard Request/Response : jeton Bearer vérifié par Supabase Auth puis RPC avec le client de **cet utilisateur**. L'adaptateur de déploiement devra construire un client utilisateur avec une clé publique et le Bearer, sans remplacer l'appel par une identité service-role pour contourner les droits. Les configurations et secrets privilégiés restent exclusivement serveur.

`server/postgres-send-repository.cjs` fournit la file PostgreSQL : prise avec `FOR UPDATE SKIP LOCKED`, bail et compteur de tentative. Les résultats sont transactionnels; une ancienne tentative ne peut écraser un bail renouvelé. Utiliser une connexion réservée à la transaction (par exemple un client `pg` sorti du pool), pas un pool répartissant BEGIN et les requêtes sur différentes connexions.

Le travailleur lit le PDF depuis le stockage privé, vérifie son en-tête et son SHA-256, puis demande un courriel avec pièce jointe, expéditeur vérifié et clé d'idempotence stable. Le prestataire doit fournir une confirmation `accepted` avec un identifiant avant journalisation de l'acceptation. Les exceptions sont conservées comme état incertain, sans journaliser les messages bruts du prestataire susceptibles de contenir des secrets.

Une reprise d'état incertain exige un rapprochement prestataire : preuve d'acceptation → journalisation sans renvoi; preuve définitive de non-acceptation → remise en file; résultat ambigu → conserver l'état incertain. Un simple « introuvable » éventuellement retardé ne justifie pas une reprise. La durée de garantie d'idempotence du prestataire devra être au moins celle des reprises autorisées; ajouter une limite et une revue manuelle au-delà de cette durée avant exploitation.

## Non connecté et conditions d'activation

1. PR #16 validée, puis inventaire et application autorisée des migrations en préproduction Supabase.
2. Mapping/import transactionnel des identifiants locaux vers `mir_core` et approbation serveur complète. L'interface locale n'appelle pas encore la file distante : aucun pont faussement connecté n'est installé.
3. Auth Admin réelle et façade API autorisée. Déployer le handler, le travailleur et son exécution planifiée sur un environnement compatible avec la connexion PostgreSQL et Storage.
4. Bucket privé, import des PDF approuvés avec empreinte vérifiée et contrôle d'accès. Le travailleur transmet des octets déjà approuvés; il ne lance pas Chromium en Edge Function. Une génération PDF entièrement serveur pourra réutiliser les mêmes pages SVG sur un hôte compatible.
5. Service courriel choisi et expéditeur MIR réellement vérifié (domaine/DNS). Fournir un adaptateur avec garanties d'idempotence et rapprochement; aucun fournisseur réel, compte ou ressource payante créé ici.
6. Webhooks de livraison/rejet signés, suivi des accusés fournisseur et avis d'annulation/révision à compléter. `accepted` indique l'acceptation par le service, pas la réception humaine. La colonne `delivered` n'est jamais alimentée fictivement. Le travailleur ignore les bons devenus annulés/non approuvés avant leur prise; prévoir aussi les règles d'annulation d'un envoi déjà en cours.
7. Raccorder enfin l'interface aux états serveur. Le contrat est asynchrone : ne pas réutiliser tel quel l'adaptateur candidat qui attend immédiatement un messageId après invoke.

## Tests

```sh
cd tools/database && npm ci --ignore-scripts --no-audit --no-fund
cd ../..
node tests/mir-po-workflow.cjs
node tests/mir-supplier-send.cjs
node tests/mir-purchase-orders-browser.cjs
```

Les scénarios de courriel utilisent exclusivement un prestataire en mémoire défini dans le fichier de test, avec adresses `.invalid`. Les tests serveur exécutent les migrations et RLS dans PostgreSQL/PGlite; Auth distante et services réels ne sont pas certifiés par ces tests.

La recette Chromium couvre création sans modèle, champs auto-sauvegardés, rechargement, vrais octets PDF, archive identique au SHA-256, révision, lignes dupliquées/supprimées/modifiées, recherche et bouton d'envoi désactivé sur PC/tablette/mobile. Les suites existantes couvrent en plus géométrie, guide Admin, 3D à la demande, accueil, Boutique/Magasin, Studio et parcours client. Voir le rapport de PR pour les résultats finaux.
