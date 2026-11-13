# Contrat serveur UX Commandes + Pliages

## Appels réels

| Action UI | RPC canonique | Mutation vérifiée |
| --- | --- | --- |
| Envoyer la commande | `mir_order_create_submit` | commande, révision, lignes, événements et reçu |
| Enregistrer/reprendre un brouillon | `mir_order_draft_save` | révision immuable et lignes du brouillon |
| Soumettre un brouillon | `mir_order_submit` | statut, horodatage et événement de soumission |
| Ajouter/retirer un favori | `mir_order_shortcut_update` | favori personnel par type et reçu idempotent |
| Rattacher le chantier | `mir_order_link_job` | chantier lié et événement conservant la référence originale |

`CREATE_ORDER` est intercepté explicitement par le client connecté et ne passe plus par `mir_portal_command`. `SET_FAVORITE` n'est plus une commande client acceptée. Aucun succès n'est fabriqué côté navigateur : les résultats proviennent des reçus RPC et le portail relit ensuite son instantané serveur.

## Sécurité vérifiée localement

- organisation et utilisateur recalculés côté serveur;
- rôle Employé actif exigé pour les brouillons, soumissions et favoris;
- Adjointe, Boss ou Admin exigé pour voir/rattacher les chantiers à confirmer;
- tables métier sans écriture directe du rôle `authenticated`;
- fonctions privilégiées avec `search_path` fixe, fonctions internes non exécutables par le navigateur;
- ancienne RPC de favori sans clé idempotente révoquée;
- référence chantier originale jamais remplacée après rattachement;
- aucun dossier chantier, bon fournisseur ou courriel créé par ces RPC.

## Résultats PostgreSQL jetable

La migration `20261125130000_phase6_commandes_ux_server_contract.sql` est appliquée deux fois dans la même base. Les 23 contrôles couvrent : brouillon, deux articles, pliage de banque, pliage sur mesure, instantanés, quantité invalide, soumission, reçu, rejeu, chantier assigné/à confirmer, rattachement, favoris article/pliage, limite de six, isolation utilisateur/organisation, rôle refusé, historique et absence de doublon.

SEO/GEO : non applicable; ce correctif concerne un portail authentifié et des RPC privées, sans changement de contenu public ou d'indexation.
