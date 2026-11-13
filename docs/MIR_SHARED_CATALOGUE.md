# Mission 3 — première tranche : publication centrale

Branche basée sur la mission 2, en conservant les PR #16 et #19 non fusionnées. main vérifiée à 0abe3aa. Aucun déploiement.

Migration additive model_publications : une ligne par modèle maître, trois destinations indépendantes, référence à une version géométrique immuable, prix aluminium/acier en cents, conditions, mesures standards/verrouillées et archivage. publish_model est réservé aux Admin actifs, verrouille le modèle et vérifie la révision attendue. Les clients et employés lisent uniquement leurs publications autorisées; ils ne peuvent modifier les prix. Aucun prix par défaut inventé.

Tests PostgreSQL réels via PGlite dans tests/mir-database.cjs : Admin/clients, isolation inter-organisations, écriture des prix interdite, conflit de révision et retrait par archivage. Exécution : npm ci dans tools/database puis node tests/mir-database.cjs.

Cette tranche n'est pas une Boutique synchronisée active. Les pages existantes et leurs données locales ne changent pas. Avant raccordement, il faut une préproduction Supabase autorisée, appliquer les migrations après inventaire, exposer une API sécurisée et connecter les comptes. Restent à développer : lecture des géométries publiées, interface Admin, validation serveur des mesures verrouillées, calcul et instantané des prix à la commande, affectations chantier, demandes et reprise en bon, import métier idempotent et adaptateur Shopify. La sauvegarde de mission 1 reste disponible, sans import automatique. Aucun appel Shopify ni catalogue maître secondaire ajouté.
