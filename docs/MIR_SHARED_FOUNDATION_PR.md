# Ajouter le socle partagé PostgreSQL/RLS et les sauvegardes locales sans écrasement

Les données Admin sont actuellement locales et le portail Supabase reste fermé. Cette première étape prépare un stockage partagé protégé, sans activer de service distant ni modifier les parcours existants.

- Migration additive isolée `mir_core` : membres Admin/employé/client, modèles versionnés, catalogues, fournisseurs, commandes/révisions/pièces/historiques, documents et préparation des envois.
- RLS et autorisations SQL : isolation par organisation, droits vérifiés depuis les membres actifs côté serveur, aucun accès anonyme, aucune écriture navigateur des rôles ou preuves d'envoi, historiques append-only.
- Sauvegarde opt-in des clés locales connues : chaînes originales, validation, SHA-256, comparaison sans écrasement, staging serveur dédupliqué et annulation logique sans suppression. Aucun import métier ni bascule automatique.
- Référence modèle facultative pour préserver l'ajout direct au bon. Aucune page existante ou fonction de pliage modifiée; aucun courriel envoyé.
- Tests PostgreSQL exécutés avec PGlite, tests Node et navigateur; verrou de dépendance et CI dédiés. Documentation des limites et des étapes suivantes.

Validation : 12 scénarios PostgreSQL (plus leur test conteneur), 5 tests unitaires de sauvegarde et 24 scripts de régression existants réussis. Six scripts de recette Chromium réussis : sauvegarde, ajout direct au bon mobile/tablette/PC, parcours atelier avec ancien dossier, accueil à 9 tailles d'écran, guidage Admin en quatre étapes et miniatures avec Boutique. Aucun courriel externe envoyé.

Limites : migration non appliquée à Supabase; Auth/Storage réels non validés; schéma API non exposé; gestion des rôles/invitations et RPC du portail à intégrer; import métier avec rapprochement à réaliser; PDF serveur et travailleur courriel à développer. Aucun provisionnement payant ni déploiement. Les primitives de tables ne constituent pas encore un workflow complet d'approbation et de révision des bons.

Prochaine étape : inventorier le Supabase existant puis, après autorisation d'infrastructure, tester cette migration en préproduction et brancher le provisionnement/invitations et les RPC du portail. Conserver les options publiques désactivées jusqu'à validation réelle.
