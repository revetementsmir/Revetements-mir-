# MIR — audit de l’espace employé mobile

Audit réalisé depuis `origin/main` à `466f3f1`, avant modification. Le site public est hors périmètre.

## Fonctions reprises et destination

| Fonction existante | Source actuelle | Nouveau parcours |
|---|---|---|
| Auth, invitations et rôles employé/admin | `chantier.html`, `portal-client.js`, RPC `mir_account_*` et `mir_portal_*` | Même authentification; aucun rôle client/public ajouté |
| Chantiers assignés | `mir_portal_snapshot`, `jobs`, `assignedMemberIds` | Ma journée → Changer de job; seuls les jobs déjà filtrés par le serveur sont proposés |
| Plan publié et révision | `planVersions`, téléchargement privé existant | Ma journée → Plan à jour; fiche chantier conserve notes et documents |
| Catalogue interne | `employee-store-model.js`, `chantier-app.js` | Ma journée → Commander → magasin existant |
| Favoris, variantes et couleurs | catalogue et `SET_FAVORITE` existants | Inchangés dans le magasin |
| Pliages sur mesure | configurateur `fold-form` et dimensions existantes | Inchangé dans le magasin |
| Panier et reprise réseau | stockage UI + commande idempotente dans `portal-client.js` | Panier désormais séparé par employé **et par job**; job visible au panier et à la confirmation |
| Commandes et livraisons | `orders`, `deliveries`, `RECORD_DELIVERY` | Magasin et Matériel; reliquats calculés par article |
| Inventaire et QR | `entrepot.html`, `mir-warehouse-*`, proposition `202611070006` | Entrepôt existant; clé de requête empêche une seconde déduction |
| Tri Entrepôt / fournisseur | `coordination.html`, propositions `202611070007` et `008` | Parcours adjointe existant; une ligne conserve commande, job et route |
| Bons fournisseurs | `mir-po-workflow.js`, `supplier-send.cjs`, proposition `202611070009` | Bons existants; brouillon et envoi réel restent des états distincts |
| Ajout sur commande en attente | RPC/proposition `mir_coordination_add` | Avis `quantity_added` existant dans la coordination |
| Réception partielle | `mir_coordination_supplier_receive`, livraisons du portail | Matériel sépare quantité reçue et reliquat à recevoir |
| Messages | Aucun service partagé branché | Écran réservé; aucune fausse conversation ni faux accusé n’est affiché |
| Extras | Aucun service partagé branché | Formulaire mobile réservé; en connecté, blocage explicite sans envoi |
| Absences et vacances | Aucun stockage RH partagé branché | Mon compte; formulaires réservés, isolés du chantier et des messages |
| Fil d’activité et rappels | Événements de coordination seulement | À compléter côté serveur avant activation partagée |

## Permissions constatées

- Les RPC du portail vérifient l’identité Supabase et renvoient seulement les chantiers affectés.
- Les commandes employé sont isolées des commandes client et d’un autre employé.
- La coordination est limitée à l’admin/adjointe autorisée; l’employé est refusé.
- L’entrepôt exige un accès explicite et les mouvements QR sont idempotents.
- Les documents de plan privés passent par le mécanisme de téléchargement existant.
- Les propositions coordination/fournisseurs sont conservées comme propositions: elles ne prouvent pas leur déploiement dans MIR TEST.
- Aucun schéma serveur n’existe encore pour les conversations, participants, reçus de lecture, dossiers RH, extras, photos de réception et rappels. Ces fonctions ne doivent pas être simulées en production.

## Validation effectuée

- Émulation Chromium: 320, 360, 390, 820, 1024 et 1440 px.
- Parcours vérifié: Ma journée, exactement quatre raccourcis, fiche chantier, magasin, recherche, ajout, séparation du brouillon entre deux jobs, retour au premier brouillon, panier, confirmation et suivi.
- Contrôle sans débordement horizontal sur les six largeurs.
- Tests métier existants réussis: coordination (20), entrepôt (15), client entrepôt/idempotence, bons fournisseurs à 390/1024/1440.
- Le test navigateur coordination autonome exige le canal Playwright `chrome`, absent de l’environnement; ses tests métier ont néanmoins réussi.
- Aucun essai sur appareil physique n’a été effectué dans cette livraison; Safari iPhone et Chrome Android réels restent à faire.
- MIR TEST réel a été vérifié en lecture seule avec l’identité employé configurée: Auth réelle, RPC réelle, au moins un chantier assigné, filtrage de l’affectation, quatre actions et absence de débordement à 390 px. Aucune donnée métier ni aucun schéma n’a été modifié.
- Les changements de branche ne sont pas encore publiés sur l’URL hébergée MIR TEST: les services Messages/RH/Extras manquants doivent être raccordés avant activation partagée.

## Captures

- `artifacts/MIR-ma-journee-390.png`
- `artifacts/MIR-panier-job-390.png`
- `artifacts/MIR-TEST-ma-journee-390.png` (Auth et RPC réelles, données MIR TEST)

