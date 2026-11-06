# Bons révisables, PDF cotés archivés et préparation sécurisée des envois

Les bons de pliage peuvent maintenant être rouverts depuis les trois vues Créer / En attente / Historique, modifiés avec l'éditeur existant et retrouvés après rechargement. Une version avec PDF ou transmission déclarée est conservée; sa modification crée une nouvelle révision. L'original binaire du PDF reste téléchargeable. L'envoi réel est volontairement désactivé, faute de services connectés.

Cette PR dépend de #16 : base `codex/shared-data-security-foundation`, tête `codex/purchase-orders-pdf`. Elle conserve le socle précédent et montre uniquement la mission 2. Après intégration de #16, rebaser au besoin et recibler main. Les deux branches de travail ont également été synchronisées sans conflit avec main `0abe3aa` (menu mobile et catalogue responsive), sans modifier main ni réécrire l’historique. Ne pas fusionner ou publier automatiquement.

## Changements

- Brouillon du formulaire auto-sauvegardé, réouverture, modification/duplication/suppression des lignes via le moteur existant, ajout sans modèle, recherche, événements, recommandation sous un nouveau numéro.
- PDF réel : coordonnées, notes paginées et vrais dessins cotés issus du moteur de pliage existant. Prévisualisation binaire, SHA-256 et conservation de l'original en IndexedDB. Révisions séparées et protection contre une modification inattendue de l'original.
- Contrôle de concurrence locale sur le registre d'achat et correction d'un traitement redondant de la quantité au changement de champ, qui pouvait interrompre le rendu du dossier.
- Migration additive : RPC Admin de préparation des envois, destinataire vérifié, contrôle de révision/document, dédoublonnage et événement transactionnel. Un contact modifié perd sa vérification et bloque la prise d'une tâche obsolète.
- Handler HTTP, file PostgreSQL avec bail, travailleur avec pièce jointe PDF vérifiée et confirmation prestataire obligatoire. Rapprochement après résultat incertain; aucun second envoi sans justification. Fournisseur simulé uniquement dans les tests.
- CI Node/PostgreSQL dédiée et documentation du raccordement restant. Versions de cache des scripts modifiés mises à jour; assertions de version correspondantes conservées avec les nouveaux identifiants.

## Validation locale

- 29 scripts Node réussis, incluant toutes les régressions précédentes, les tests PostgreSQL/RLS et de sauvegarde, 5 scénarios de workflow et 9 scénarios serveur d'envoi (plus leur test conteneur).
- Nouvelle recette Chromium PC 1440, tablette 1024 et mobile 390 : ajout direct sans modèle, sauvegarde/rechargement, duplication/suppression/quantité, vrai PDF original et révisé, empreintes différentes entre révisions et identiques au retéléchargement de l'original, prévisualisation, recherche, Historique et Recommander, envoi désactivé.
- Neuf scripts Chromium existants réussis : ajout direct, atelier, guide Admin (dont 3D à la demande), accueil (9 résolutions), miniatures/Boutique, Studio terrain et signature client (40 contrôles), menu public et en-tête client. Magasin et fournisseurs vérifiés dans le guide Admin.
- Aucun courriel externe. Aucun test ne prétend certifier un Supabase distant ou une livraison réelle. PDF fictif également généré pour contrôle visuel des feuilles cotées.

## Limites et activation ultérieure

Les bons et PDF restent locaux; l'interface n'est pas encore branchée aux identifiants partagés du serveur. Les anciens formats sans instantané sont conservés et imprimables, mais leur conversion vers l'éditeur n'est pas forcée. Les PDF IndexedDB ne font pas partie de la sauvegarde JSON de #16 : conserver les téléchargements et prévoir leur transfert privé.

À fournir après autorisation : Supabase de préproduction et migrations, Auth Admin/provisionnement, import/mapping transactionnel des bons et PDF, Storage privé, hébergement du handler et du travailleur, puis service courriel idempotent avec expéditeur MIR vérifié. Les webhooks signés de livraison/rejet et avis fournisseur d'annulation/révision restent à compléter. `accepted` est l'acceptation prestataire, pas un accusé humain. Aucun compte, service payant ou ressource distante créé.

Voir `docs/MIR_PURCHASE_ORDERS.md` pour les contrats, commandes et limites d'exploitation. L'accueil et les parcours Boutique/client restent préservés; aucune publication effectuée.
