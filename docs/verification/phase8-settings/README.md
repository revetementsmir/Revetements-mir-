# Phase 8 — Apparence et réglages

## Portée livrée

- Thème `Clair`, `Sombre` ou `Selon l’appareil`, appliqué avant le premier rendu sur les pages Harmony.
- Changement dynamique de `prefers-color-scheme` lorsque le choix système est actif.
- Texte `Standard` ou `Grand`, mouvement `Selon l’appareil` ou `Réduit`, contraste renforcé et format `fr-CA` fixe.
- Sauvegarde automatique uniquement, avec états `Enregistrement`, `Enregistré`, `Hors ligne` et `Erreur`.
- Remise à zéro confirmée.
- Préférences propres au couple organisation/utilisateur. Le rôle et l’organisation sont relus côté serveur.
- Réutilisation de `mir_core.notification_preferences` créée en Phase 7; aucune seconde table de préférences de notifications.
- Aucun réglage de courriel, SMS, push ou temps réel. L’interface documente l’actualisation.

## Catégories visibles par rôle

| Rôle | Catégories applicables |
| --- | --- |
| Employé | Commandes incluant indirectement les Pliages; Dépenses; Absences; Punch et heures; Chantiers et équipes; Clavardage; Centre d’aide |
| Chef | Commandes incluant indirectement les Pliages; Absences; Punch et heures; Chantiers et équipes; Clavardage |
| Adjointe | Commandes incluant indirectement les Pliages; Dépenses; Absences; Punch et heures; Chantiers et équipes; Clavardage; Centre d’aide |
| Entrepôt | Commandes incluant indirectement les Pliages; Entrepôt |
| Boss | Commandes incluant indirectement les Pliages; Dépenses; Absences; Punch et heures; Chantiers et équipes; Clavardage; Centre d’aide; Entrepôt |
| Admin | Même portée fonctionnelle que Boss dans son organisation; rôle technique distinct relu au serveur |

Les urgences et actions requises restent obligatoires. Les Pliages restent un raccord indirect du cycle Commandes; aucun événement Pliage autonome n’est revendiqué.

## Migration

`20261127120000_phase8_harmony_settings.sql` s’exécute après les migrations Phase 7. Elle est additive et rejouable :

1. création des préférences Harmony par organisation/utilisateur;
2. reçu idempotent par `request_id` et contenu exact;
3. RLS fail-closed et tables privées;
4. RPC `public.mir_harmony_settings` accordée uniquement à `authenticated`;
5. `SECURITY DEFINER` avec `search_path=pg_catalog,mir_core`;
6. écriture des catégories facultatives dans la table Phase 7 existante.

## Preuves locales

- PostgreSQL jetable : 13/13 scénarios, migration rejouée deux fois.
- Client : lecture, file hors ligne, retour en ligne idempotent et erreur serveur honnête.
- Navigateur : sept formats (`360×780`, `390×844`, `768×1024`, `834×1112`, `1366×768`, `1440×900`, `1920×1080`).
- Six rôles : catégories pertinentes, obligatoires clairement identifiés, aucun transport externe.
- Pages principales : Chantier, Commandes/Pliages, Calepinage et Entrepôt en thème sombre, sans erreur JavaScript ni débordement horizontal.
- Non-régressions ciblées : Phase 7, Phase 6, Commandes/Pliages, Dépenses, Absences, Punch, Aujourd’hui, Auth, Clavardage, Centre d’aide, Entrepôt, dossiers chantier, tarification et PDF.

Captures locales : `reglages-390x844.png`, `reglages-sombre-390x844.png`, `reglages-834x1112.png` et `reglages-1440x900.png`.

## MIR TEST

- Projet vérifié : `hxtztkmbfpmzrieccwsg` (`MIR TEST`, état sain).
- Migration `phase8_harmony_settings` appliquée seule puis rejouée sans erreur.
- Schéma relu : RLS active, `SECURITY DEFINER`, `search_path` fixe, `anon` refusé, `authenticated` seulement.
- Recette réelle : run GitHub `43344719746`, 8 contrôles réussis, six rôles authentifiés.
- Persistance prouvée après reconnexion pour les six rôles, puis réglages initiaux restaurés.
- Isolation interorganisationnelle et refus anonyme confirmés.
- Zéro commande, estimation, transmission fournisseur, courriel ou push; zéro requête production.

## Limites honnêtes

- Les notifications internes utilisent l’actualisation/rechargement; aucun temps réel n’est annoncé.
- Hors ligne, le choix visuel est temporairement appliqué à l’appareil et mis en attente. L’état `Enregistré` ne revient qu’après la confirmation serveur.
- Aucun courriel, SMS, push, SMTP, Gmail ou Resend n’est activé.
- Les PDF et impressions sont forcés en rendu clair par la feuille d’impression, indépendamment du thème utilisateur.
- La recette réelle modifie temporairement seulement les préférences des six comptes et restaure leurs valeurs initiales; aucun historique métier n’est touché.
