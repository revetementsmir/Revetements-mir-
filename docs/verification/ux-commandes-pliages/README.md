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

## MIR TEST

- cible vérifiée : projet `hxtztkmbfpmzrieccwsg` (`MIR TEST`, PostgreSQL 17.11);
- migrations `phase6_commandes_ux_pliages` et `phase6_commandes_ux_server_contract` appliquées, puis rejouées sans erreur;
- fixture strictement TEST : deux articles publiés balisés `RECETTE-UX-P23` ajoutés à l'organisation de recette, car elle contenait 1 matériel et 0 pliage mesurable;
- fixture strictement TEST : le seul profil Employé de recette sans chantier a été rattaché à un chantier TEST existant pour couvrir le scénario assigné; aucun chantier n'a été créé;
- aucune création de compte, aucun changement de rôle, mot de passe ou secret;
- aucune commande fournisseur ni aucun courriel déclenché;
- Supabase production `gccltmaulvrnthrbnrpd` n'a reçu aucune requête.

Recette réelle à six rôles : **12/12 contrôles UX réussis** dans le workflow `MIR Phase 6 Commandes — rôles réels TEST`, run `43307037201`.

- Employé : brouillon de 4 lignes (2 matériels + pliage de banque + pliage sur mesure), rejeu idempotent, soumission et reçu serveur;
- favoris matériel et pliage : ajout, retrait, restauration de l'état initial et isolation face au compte Chef;
- chantier assigné et référence `Je ne connais pas le numéro` persistée, puis rattachement Adjointe historisé sans création de chantier;
- Chef, Adjointe, Boss, Admin et Entrepôt : matrice existante vérifiée et mutations Employé refusées hors périmètre;
- isolation d'une organisation arbitraire refusée pour les six rôles;
- deux commandes `RECETTE-UX-P23` conservées comme preuve d'audit TEST; aucun fournisseur et aucun courriel contactés;
- artefact `phase6-real-roles`, identifiant `13983768688`, empreinte `sha256:64c3c7bd2b2209eea5d2fd53f609666e43d124cdbcafb7bbdecc5e686dc668e2`.
