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

## Raccord serveur corrigé

Le correctif ajoute un contrat serveur dédié sans dupliquer l'architecture Phase 6 :

- `mir_order_create_submit` reçoit le panier final et retourne un reçu idempotent;
- `mir_order_draft_save` et `mir_order_submit` couvrent le brouillon serveur et sa soumission;
- `mir_order_shortcut_update` remplace l'ancien envoi `SET_FAVORITE` au répartiteur générique;
- `mir_order_link_job` conserve la référence chantier originale et journalise le rattachement par l'Adjointe;
- `orders`, `order_revisions`, `order_lines` et `order_events` restent la source de vérité.

Preuves locales ajoutées :

- `tests/mir-ux-commandes-server-postgres.cjs` : 23 scénarios de mutation PostgreSQL, migration rejouée deux fois;
- `tests/mir-ux-commandes-client-server-contract.cjs` : appels RPC exacts, refus de `SET_FAVORITE` inconnu et rejeu hors ligne unique;
- reçu serveur, état relu, instantanés de pliage, référence originale, isolation utilisateur/organisation et absence d'envoi fournisseur/courriel vérifiés.

La migration distante et la recette hébergée restent consignées séparément après validation complète de la CI. Aucun secret n'est conservé dans ces preuves.
