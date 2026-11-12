# UX Commandes + Pliages — preuves locales

Branche : `codex/ux-commandes-pliages`

Le lot raccorde le moteur Pliage existant au panier Commandes sans créer un second moteur. Les captures `panier-390x844.png`, `panier-768x1024.png` et `panier-1440x900.png` proviennent de la recette Playwright locale du portail Employé.

Contrôles réalisés :

- quantité vide refusée, puis quantité entière acceptée;
- brouillon distinct par chantier et reprise après navigation;
- panier de vérification, modification de quantité et envoi simulé;
- huit formats de 320 à 1440 px, sans erreur JavaScript ni débordement;
- panier commun local versionné pour matériel et instantanés de pliages;
- migration PostgreSQL additive rejouée deux fois dans PGlite;
- non-régressions Aujourd’hui/Punch, Phase 6 et coordination.

Limites : aucune migration distante, aucune écriture Supabase et aucune publication n'ont été exécutées. La recette hébergée MIR TEST reste à faire uniquement après promotion explicite de la migration sur TEST.
