# Raccorder les demandes Boutique/Magasin au catalogue partagé

Les PR 16, 19 et 20 sont fusionnées. Cette PR, basée sur main 42406fe, ajoute une tranche fonctionnelle de demandes partagées sans activer ni déployer les services distants.

- Espace du même site : connexion Supabase par compte, organisations autorisées, publication Admin, prix par métal, cotes standards/verrouillées, archivage, demandes et historique propriétaire.
- Import explicite des sauvegardes locales : source et versions conservées, dédoublonnage, refus des conflits. Nouvelle version géométrique sans altérer les demandes précédentes et retrait de publication pour revalidation.
- Prix et longueur revérifiés au serveur, cotes verrouillées imposées et prix navigateur refusés. J à soffite de 12 pi traité en soumission sans extrapoler le tarif 10 pi. Les prix sont des montants de référence à valider, aucun paiement automatique.
- Chantiers affectés aux employés avec contrôle serveur; demandes récupérables par l'Admin dans une copie du bon local existant. Vue 2D et 3D sur demande, y compris mobile.
- Reprise réseau conservant le même requestId, transactions et historique immuable. Déconnexion et réponses tardives protégées.
- Projection Shopify sans réseau, sans stock inventé et sans deuxième catalogue maître.

Validation locale : 31 scripts Node réussis; tests PostgreSQL des permissions, import, nouvelles versions, tarifs, historique, exception de longueur et reprise. Recette navigateur à sessions indépendantes : Admin PC, client mobile, employé tablette, prix actualisé sans rétroactivité et copie vers l'atelier. Régressions PDF, guide 2D/3D, Studio et accueil réussies. Auth simulée seulement dans le test d'intégration navigateur; vrais RPC exécutés dans PostgreSQL local. Script SQL complémentaire exact testé après les trois migrations précédentes.

La clé publishable publique fournie est renseignée dans shared-config.js; enabled reste false. Aucun mot de passe ou secret privilégié committé. La migration 004 n'a pas été appliquée au Supabase du propriétaire par l'agent. L'appel de vérification Auth distant a été refusé par le proxy de l'environnement (HTTP 403 tunnel), sans établir de panne Supabase. Il reste une recette hébergée des vrais comptes puis une autorisation d'activation et de déploiement.

Limites explicites : cette page est un parcours de demandes à valider, pas un paiement ni une fabrication automatique. Les accessoires/inventaire complets, notifications, travailleur d'envoi réel et webhooks restent à intégrer. Les premiers modèles sont créés avec l'éditeur MIR existant, exportés puis importés; les données locales ne sont pas effacées. Ne pas annoncer les trois missions entièrement terminées ou activer les courriels avec cette PR.

Documentation : docs/MIR_CONNECTED_WORKSPACE.md. Aucun nouveau dépôt/site, fusion, publication, ressource payante ou courriel réel.
