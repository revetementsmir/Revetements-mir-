# Estimations MIR — mission du 9 novembre 2026

## Ce qu’il faut faire
Unifier les demandes depuis le formulaire général, le Studio, le panier et le dossier de pliage. Conserver les PDF originaux, les coordonnées et la version 3D soumise dans une fiche privée, avec une réception confirmée uniquement après enregistrement et acceptation de l’envoi côté serveur.

## Les étapes
1. Comparer main et le travail interrompu; inventorier le service d’envoi.
2. Implémenter formulaire, brouillon, résumé et service commun privé et idempotent.
3. Tester quatre entrées, pannes, reprise, accès et immutabilité avec destination de test.
4. Corriger et documenter les anomalies visuelles aux six largeurs demandées.
5. Publier main et vérifier le commit GitHub Pages et les pages servies dans les accès disponibles.

## Comment savoir que c’est terminé
- Les quatre entrées empruntent le même formulaire et le même service; aucun mailto d’estimation.
- Les choix à estimer restent séparés des aperçus portes/fenêtres/bardeau; ouvertures et moulures conservées au métré.
- Pas de doublon après interruption/retry, ni modification de la fiche soumise par un changement local.
- Captures avant/après comparables; accueil approuvé et Pliage préservés.
- Les tests réellement exécutés, les simulations locales et les configurations absentes sont distingués.

## Détails pour le chat
Base main e11108a980cefe8dff7e8509b79b4b414afe580b vérifiée par fetch. Branche audit-client; corrections Pliage locales conservées. MOON1.3.5 consulté en direct; méthodes API, sécurité, harmonisation, qualité et SEO consultées. Référent : utilisateur de cette demande.
Service existant : server/supplier-send.cjs et file Postgres, sans prestataire raccordé selon docs/MIR_PURCHASE_ORDERS.md. Zéro Edge Function dans MIR et MIR TEST lors de la lecture du 9 novembre. GitHub Pages héberge les pages statiques; il faut un serveur privé pour recevoir des fichiers et envoyer un courriel.
SEO/GEO : conserver l’indexation actuelle des pages existantes. Fiche privée et données transmises non indexables; noindex ne remplace jamais l’authentification. Aucun changement des autorisations de robots ni exposition de plans.
